import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { HeadingAnalysis } from "../../../types/seoCoverageTypes";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";
import { ComponentUtils } from "../utils/componentUtils";
import { JsxUtils } from "../utils/jsxUtils";
import { PageComponentMap } from "../types/internalTypes";
import path from "path";

/**
 * Analyzer for heading hierarchy
 */
export class HeadingAnalyzer {
  private pageComponents: PageComponentMap;

  constructor(pageComponents: PageComponentMap) {
    this.pageComponents = pageComponents;
  }

  /**
   * Analyze heading hierarchy across all pages
   */
  public analyzeHeadingHierarchy(): HeadingAnalysis {
    const headingsByPage = new Map<
      string,
      {
        h1: number;
        h2: number;
        h3: number;
        h4: number;
        h5: number;
        h6: number;
        issues: Array<{
          path: string;
          issue: "missing-h1" | "multiple-h1" | "skipped-level";
        }>;
      }
    >();

    // Analyze headings in each page, filtering out UI components
    this.pageComponents.forEach((component, pagePath) => {
      // Skip analysis for UI components
      if (this.isUIComponent(component)) {
        return;
      }

      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      const headingCounts = {
        h1: 0,
        h2: 0,
        h3: 0,
        h4: 0,
        h5: 0,
        h6: 0,
      };

      const issues: Array<{
        path: string;
        issue: "missing-h1" | "multiple-h1" | "skipped-level";
      }> = [];

      const findHeadings = (node: ts.Node): void => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = JsxUtils.getTagName(node).toLowerCase();

          if (tagName.match(/^h[1-6]$/)) {
            const level = parseInt(tagName.substring(1));
            headingCounts[tagName as keyof typeof headingCounts]++;
          }
        }

        ts.forEachChild(node, findHeadings);
      };

      findHeadings(sourceFile);

      // Check for heading hierarchy issues
      if (headingCounts.h1 === 0) {
        issues.push({ path: pagePath, issue: "missing-h1" });
      } else if (headingCounts.h1 > 1) {
        issues.push({ path: pagePath, issue: "multiple-h1" });
      }

      // Check for skipped heading levels
      let highestSeen = 1;
      for (let i = 2; i <= 6; i++) {
        const key = `h${i}` as keyof typeof headingCounts;
        const count = headingCounts[key];

        if (count > 0 && i - highestSeen > 1) {
          issues.push({ path: pagePath, issue: "skipped-level" });
          break;
        }

        if (count > 0) {
          highestSeen = i;
        }
      }

      headingsByPage.set(pagePath, {
        ...headingCounts,
        issues,
      });
    });

    // Aggregate results
    const allIssues: HeadingAnalysis["hierarchyIssues"] = [];
    const headingLevelDistribution = {
      h1: 0,
      h2: 0,
      h3: 0,
      h4: 0,
      h5: 0,
      h6: 0,
    };

    headingsByPage.forEach((data, path) => {
      // Add issues
      data.issues.forEach((issue) => {
        allIssues.push({
          page: ComponentUtils.extractPageName(path),
          path,
          issue: issue.issue,
        });
      });

      // Aggregate heading counts
      headingLevelDistribution.h1 += data.h1;
      headingLevelDistribution.h2 += data.h2;
      headingLevelDistribution.h3 += data.h3;
      headingLevelDistribution.h4 += data.h4;
      headingLevelDistribution.h5 += data.h5;
      headingLevelDistribution.h6 += data.h6;
    });

    const totalHeadings = Object.values(headingLevelDistribution).reduce(
      (sum, count) => sum + count,
      0
    );
    const pagesWithH1 = Array.from(headingsByPage.values()).filter(
      (data) => data.h1 > 0
    ).length;

    return {
      hierarchyIssues: allIssues,
      statistics: {
        pagesWithH1,
        averageHeadingsPerPage:
          totalHeadings / Math.max(headingsByPage.size, 1),
        headingLevelDistribution,
      },
    };
  }

  // Helper method to determine if component is a UI component
  private isUIComponent(component: ComponentRelation): boolean {
    // Use ComponentUtils to check if this is a UI component
    const normalizedPath = path.normalize(component.fullPath);
    const isInComponentsDir =
      normalizedPath.includes("/components/") ||
      normalizedPath.includes("\\components\\");

    // If it's in a components directory but ComponentUtils still classified it as a page,
    // it might be a page-level component in a components directory
    if (isInComponentsDir) {
      // Check if this component has metadata or other page indicators
      const hasPageAttributes =
        component.exports.includes("metadata") ||
        component.exports.includes("generateMetadata");

      // Consider it a UI component if it's in components dir and lacks page attributes
      return !hasPageAttributes;
    }

    return false;
  }

  /**
   * Get heading improvement suggestions
   */
  public getHeadingImprovementSuggestions(): string[] {
    const analysis = this.analyzeHeadingHierarchy();
    const suggestions: string[] = [];

    // Check for pages missing H1
    const missingH1Pages = analysis.hierarchyIssues
      .filter((issue) => issue.issue === "missing-h1")
      .map((issue) => issue.page);

    if (missingH1Pages.length > 0) {
      suggestions.push(
        `Add H1 headings to pages: ${missingH1Pages.join(", ")}`
      );
    }

    // Check for pages with multiple H1s
    const multipleH1Pages = analysis.hierarchyIssues
      .filter((issue) => issue.issue === "multiple-h1")
      .map((issue) => issue.page);

    if (multipleH1Pages.length > 0) {
      suggestions.push(
        `Fix multiple H1 headings on pages: ${multipleH1Pages.join(", ")}`
      );
    }

    // Check for skipped heading levels
    const skippedLevelPages = analysis.hierarchyIssues
      .filter((issue) => issue.issue === "skipped-level")
      .map((issue) => issue.page);

    if (skippedLevelPages.length > 0) {
      suggestions.push(
        `Fix skipped heading levels on pages: ${skippedLevelPages.join(", ")}`
      );
    }

    // Check overall heading structure
    const { headingLevelDistribution } = analysis.statistics;
    if (headingLevelDistribution.h2 < headingLevelDistribution.h3) {
      suggestions.push(
        "Review heading structure: more H3s than H2s suggests potential structure issues"
      );
    }

    return suggestions;
  }

  /**
   * Get heading outliner for a page
   */
  public getPageHeadingOutline(component: ComponentRelation): Array<{
    level: number;
    text: string;
    depth: number;
  }> {
    if (!component.content) return [];

    const sourceFile = ComponentUtils.getSourceFile(component);
    if (!sourceFile) return [];

    const headings: Array<{
      level: number;
      text: string;
      depth: number;
    }> = [];

    const findHeadings = (node: ts.Node, depth: number = 0): void => {
      if (ts.isJsxElement(node)) {
        const tagName = JsxUtils.getTagName(node).toLowerCase();

        if (tagName.match(/^h[1-6]$/)) {
          const level = parseInt(tagName.substring(1));
          const text = JsxUtils.extractTextContent(node);

          headings.push({
            level,
            text,
            depth,
          });
        }
      }

      if (ts.isJsxElement(node)) {
        node.children.forEach((child) => findHeadings(child, depth + 1));
      } else {
        ts.forEachChild(node, (child) => findHeadings(child, depth));
      }
    };

    findHeadings(sourceFile);

    return headings.sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.depth - b.depth;
    });
  }
}
