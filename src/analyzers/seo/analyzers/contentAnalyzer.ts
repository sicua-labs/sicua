import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { TextContentAnalysis } from "../../../types/seoCoverageTypes";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";
import { ComponentUtils } from "../utils/componentUtils";
import { JsxUtils } from "../utils/jsxUtils";
import { PageComponentMap } from "../types/internalTypes";

/**
 * Analyzer for text content in pages
 */
export class ContentAnalyzer {
  private pageComponents: PageComponentMap;

  constructor(pageComponents: PageComponentMap) {
    this.pageComponents = pageComponents;
  }

  /**
   * Analyze text content across all pages
   */
  public analyzeTextContent(): TextContentAnalysis {
    const analysis: TextContentAnalysis = {
      byPage: {},
      statistics: {
        averageTextLength: 0,
        averageTextToMarkupRatio: 0,
      },
    };

    // Analyze each page component
    this.pageComponents.forEach((component, pagePath) => {
      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      const textInfo = {
        textLength: 0,
        textToMarkupRatio: 0,
        paragraphCount: 0,
        listCount: 0,
      };

      const visitNode = (node: ts.Node): void => {
        if (ts.isJsxText(node)) {
          const text = node.text.trim();
          if (text) {
            textInfo.textLength += text.length;
          }
        }

        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = JsxUtils.getTagName(node).toLowerCase();
          if (tagName === "p") textInfo.paragraphCount++;
          if (tagName === "ul" || tagName === "ol") textInfo.listCount++;
        }

        ts.forEachChild(node, visitNode);
      };

      visitNode(sourceFile);

      // Calculate text to markup ratio
      const totalLength = component.content.length;
      textInfo.textToMarkupRatio =
        totalLength > 0 ? textInfo.textLength / totalLength : 0;

      analysis.byPage[pagePath] = textInfo;
    });

    // Calculate averages
    const pages = Object.values(analysis.byPage);
    if (pages.length > 0) {
      analysis.statistics.averageTextLength =
        pages.reduce((sum, page) => sum + page.textLength, 0) / pages.length;

      analysis.statistics.averageTextToMarkupRatio =
        pages.reduce((sum, page) => sum + page.textToMarkupRatio, 0) /
        pages.length;
    }

    return analysis;
  }

  /**
   * Get content improvement suggestions
   */
  public getContentImprovementSuggestions(): string[] {
    const analysis = this.analyzeTextContent();
    const suggestions: string[] = [];

    // Get pages with low text content
    const lowTextPages = Object.entries(analysis.byPage)
      .filter(([_, info]) => info.textLength < 300)
      .map(([path]) => path);

    if (lowTextPages.length > 0) {
      suggestions.push(
        `Add more text content to pages with less than 300 characters: ${lowTextPages.join(
          ", "
        )}`
      );
    }

    // Check for pages with low paragraph count
    const lowParagraphPages = Object.entries(analysis.byPage)
      .filter(([_, info]) => info.paragraphCount < 2 && info.textLength > 200)
      .map(([path]) => path);

    if (lowParagraphPages.length > 0) {
      suggestions.push(
        `Break up content into more paragraphs on: ${lowParagraphPages.join(
          ", "
        )}`
      );
    }

    // Check for pages with no lists (potential for better structure)
    const noListPages = Object.entries(analysis.byPage)
      .filter(([_, info]) => info.listCount === 0 && info.textLength > 500)
      .map(([path]) => path);

    if (noListPages.length > 3) {
      suggestions.push(
        "Consider using lists to better structure content on pages with longer text"
      );
    }

    // Check overall text to markup ratio
    if (analysis.statistics.averageTextToMarkupRatio < 0.15) {
      suggestions.push(
        "Overall text-to-HTML ratio is low. Consider adding more content relative to markup."
      );
    }

    return suggestions;
  }

  /**
   * Extract keywords from page content
   */
  public extractKeywords(component: ComponentRelation): string[] {
    if (!component.content) return [];

    const sourceFile = ComponentUtils.getSourceFile(component);
    if (!sourceFile) return [];

    // Extract all text content
    let allText = "";
    const visitNode = (node: ts.Node): void => {
      if (ts.isJsxText(node)) {
        const text = node.text.trim();
        if (text) {
          allText += " " + text;
        }
      }
      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    // Simple keyword extraction (would be improved in a real implementation)
    const words = allText
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Count word frequency
    const wordCounts = new Map<string, number>();
    words.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    // Get top keywords
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((entry) => entry[0]);
  }
}
