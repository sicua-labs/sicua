import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { HeadingAnalysis } from "../../../types/seoCoverageTypes";
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

    // Analyze headings in each page component, with improved filtering
    this.pageComponents.forEach((component, pagePath) => {
      // Skip analysis for UI components with improved detection
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

    // Aggregate results (rest of the method remains the same)
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

  /**
   *  method to determine if component is a UI component vs a page component
   */
  private isUIComponent(component: ComponentRelation): boolean {
    const normalizedPath = path.normalize(component.fullPath);
    const fileName = path.basename(
      normalizedPath,
      path.extname(normalizedPath)
    );

    // Rule 1: Check if it's in a components directory
    const isInComponentsDir =
      normalizedPath.includes("/components/") ||
      normalizedPath.includes("\\components\\") ||
      normalizedPath.includes("/ui/") ||
      normalizedPath.includes("\\ui\\");

    // Rule 2: Common UI component naming patterns
    const uiComponentPatterns = [
      /^Button$/i,
      /^Input$/i,
      /^Modal$/i,
      /^Dialog$/i,
      /^Card$/i,
      /^Header$/i,
      /^Footer$/i,
      /^Sidebar$/i,
      /^Navigation$/i,
      /^Nav$/i,
      /^Menu$/i,
      /^Dropdown$/i,
      /^Tooltip$/i,
      /^Badge$/i,
      /^Avatar$/i,
      /^Icon$/i,
      /^Loading$/i,
      /^Spinner$/i,
      /^Skeleton$/i,
      /^Alert$/i,
      /^Toast$/i,
      /^Notification$/i,
      /^Accordion$/i,
      /^Tabs$/i,
      /^Tab$/i,
      /^Form$/i,
      /^Table$/i,
      /^List$/i,
      /^Item$/i,
      /.*Button$/i,
      /.*Input$/i,
      /.*Modal$/i,
      /.*Card$/i,
      /.*Icon$/i,
      /.*Component$/i,
    ];

    const matchesUIPattern = uiComponentPatterns.some((pattern) =>
      pattern.test(fileName)
    );

    // Rule 3: Check for page-specific indicators that override UI classification
    const pageIndicators = [
      // Next.js App Router special files
      normalizedPath.endsWith("page.tsx") ||
        normalizedPath.endsWith("page.jsx") ||
        normalizedPath.endsWith("layout.tsx") ||
        normalizedPath.endsWith("layout.jsx") ||
        normalizedPath.endsWith("template.tsx") ||
        normalizedPath.endsWith("template.jsx") ||
        normalizedPath.endsWith("error.tsx") ||
        normalizedPath.endsWith("error.jsx") ||
        normalizedPath.endsWith("loading.tsx") ||
        normalizedPath.endsWith("loading.jsx") ||
        normalizedPath.endsWith("not-found.tsx") ||
        normalizedPath.endsWith("not-found.jsx"),

      // Metadata exports (strong page indicator)
      component.exports.includes("metadata") ||
        component.exports.includes("generateMetadata"),

      // Content suggests it's a page
      component.content?.includes("generateMetadata") ||
        component.content?.includes("export const metadata") ||
        component.content?.includes("export default function Page") ||
        component.content?.includes("export default function Layout"),

      // Route-like directory structure (pages router or app router)
      normalizedPath.includes("/pages/") ||
        normalizedPath.includes("\\pages\\") ||
        (normalizedPath.includes("/app/") &&
          !normalizedPath.includes("/components/")),
    ];

    const hasPageIndicators = pageIndicators.some((indicator) => indicator);

    // Rule 4: If it's in components dir AND has page indicators, it's likely a page
    if (isInComponentsDir && hasPageIndicators) {
      return false; // Not a UI component
    }

    // Rule 5: If it's in components dir AND matches UI patterns, it's a UI component
    if (isInComponentsDir && matchesUIPattern) {
      return true; // Is a UI component
    }

    // Rule 6: If it's in components dir but doesn't match UI patterns and has no page indicators,
    // check if it has substantial content (likely a page component in components dir)
    if (isInComponentsDir && !matchesUIPattern && !hasPageIndicators) {
      // Check for substantial page-like content
      const hasSubstantialContent =
        component.content &&
        (component.content.length > 1000 || // Large component
          component.content.includes("<h1") || // Has main heading
          component.content.includes("<main") || // Has main tag
          component.content.includes("<article") || // Has article tag
          (component.content.match(/<h[1-6]/g) || []).length > 2); // Multiple headings

      return !hasSubstantialContent; // If substantial content, treat as page component
    }

    // Rule 7: If not in components dir but matches UI patterns, still might be UI component
    if (!isInComponentsDir && matchesUIPattern && !hasPageIndicators) {
      return true;
    }

    // Default: if it has page indicators or is outside components dir, treat as page component
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
