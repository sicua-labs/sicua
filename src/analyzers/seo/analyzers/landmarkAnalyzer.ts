import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { LandmarkUsage } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { JsxUtils } from "../utils/jsxUtils";
import { PageComponentMap } from "../types/internalTypes";

/**
 * Analyzer for semantic landmark elements
 */
export class LandmarkAnalyzer {
  private pageComponents: PageComponentMap;

  constructor(pageComponents: PageComponentMap) {
    this.pageComponents = pageComponents;
  }

  /**
   * Analyze landmark elements usage across pages
   */
  public analyzeLandmarkUsage(): LandmarkUsage {
    // Initialize result structure
    const landmarksByPage = new Map<
      string,
      {
        header: boolean;
        main: boolean;
        footer: boolean;
        nav: boolean;
        aside: boolean;
        article: boolean;
        section: boolean;
      }
    >();

    // Initialize counters
    const elements = {
      header: 0,
      main: 0,
      footer: 0,
      nav: 0,
      aside: 0,
      article: 0,
      section: 0,
    };

    // Analyze each page component
    this.pageComponents.forEach((component, pagePath) => {
      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      const pageElements = {
        header: false,
        main: false,
        footer: false,
        nav: false,
        aside: false,
        article: false,
        section: false,
      };

      const findLandmarks = (node: ts.Node): void => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = JsxUtils.getTagName(node).toLowerCase();

          // Check for semantic elements
          switch (tagName) {
            case "header":
              pageElements.header = true;
              elements.header++;
              break;
            case "main":
              pageElements.main = true;
              elements.main++;
              break;
            case "footer":
              pageElements.footer = true;
              elements.footer++;
              break;
            case "nav":
              pageElements.nav = true;
              elements.nav++;
              break;
            case "aside":
              pageElements.aside = true;
              elements.aside++;
              break;
            case "article":
              pageElements.article = true;
              elements.article++;
              break;
            case "section":
              pageElements.section = true;
              elements.section++;
              break;
          }
        }

        ts.forEachChild(node, findLandmarks);
      };

      findLandmarks(sourceFile);
      landmarksByPage.set(pagePath, pageElements);
    });

    // Calculate coverage statistics
    const pagesWithHeader = Array.from(landmarksByPage.values()).filter(
      (page) => page.header
    ).length;
    const pagesWithMain = Array.from(landmarksByPage.values()).filter(
      (page) => page.main
    ).length;
    const pagesWithFooter = Array.from(landmarksByPage.values()).filter(
      (page) => page.footer
    ).length;
    const pagesWithAllLandmarks = Array.from(landmarksByPage.values()).filter(
      (page) => page.header && page.main && page.footer
    ).length;

    return {
      elements,
      coverage: {
        pagesWithAllLandmarks,
        pagesWithHeader,
        pagesWithMain,
        pagesWithFooter,
      },
    };
  }

  /**
   * Get landmark improvement suggestions
   */
  public getLandmarkImprovementSuggestions(): string[] {
    const analysis = this.analyzeLandmarkUsage();
    const suggestions: string[] = [];
    const totalPages = this.pageComponents.size;

    // Check for missing core landmarks
    if (analysis.coverage.pagesWithHeader < totalPages) {
      const missingCount = totalPages - analysis.coverage.pagesWithHeader;
      suggestions.push(
        `Add <header> elements to ${missingCount} pages that are missing them`
      );
    }

    if (analysis.coverage.pagesWithMain < totalPages) {
      const missingCount = totalPages - analysis.coverage.pagesWithMain;
      suggestions.push(
        `Add <main> elements to ${missingCount} pages that are missing them`
      );
    }

    if (analysis.coverage.pagesWithFooter < totalPages) {
      const missingCount = totalPages - analysis.coverage.pagesWithFooter;
      suggestions.push(
        `Add <footer> elements to ${missingCount} pages that are missing them`
      );
    }

    // Check for pages missing all core landmarks
    if (analysis.coverage.pagesWithAllLandmarks < totalPages * 0.8) {
      suggestions.push(
        "Improve semantic structure by ensuring all pages have header, main, and footer elements"
      );
    }

    // Check for missing nav elements
    if (analysis.elements.nav === 0) {
      suggestions.push("Add <nav> elements to improve site navigation and SEO");
    }

    // Encourage use of article/section
    if (analysis.elements.article === 0 && analysis.elements.section === 0) {
      suggestions.push(
        "Use <article> and <section> elements to better structure your content"
      );
    }

    return suggestions;
  }

  /**
   * Check if a page has proper semantic structure
   */
  public hasProperSemanticStructure(component: ComponentRelation): {
    hasProperStructure: boolean;
    missingElements: string[];
  } {
    if (!component.content) {
      return {
        hasProperStructure: false,
        missingElements: ["header", "main", "footer"],
      };
    }

    const sourceFile = ComponentUtils.getSourceFile(component);
    if (!sourceFile) {
      return {
        hasProperStructure: false,
        missingElements: ["header", "main", "footer"],
      };
    }

    const foundElements = {
      header: false,
      main: false,
      footer: false,
    };

    const findLandmarks = (node: ts.Node): void => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = JsxUtils.getTagName(node).toLowerCase();

        if (tagName === "header") foundElements.header = true;
        if (tagName === "main") foundElements.main = true;
        if (tagName === "footer") foundElements.footer = true;
      }

      ts.forEachChild(node, findLandmarks);
    };

    findLandmarks(sourceFile);

    const missingElements = Object.entries(foundElements)
      .filter(([_, found]) => !found)
      .map(([element]) => element);

    return {
      hasProperStructure: missingElements.length === 0,
      missingElements,
    };
  }
}
