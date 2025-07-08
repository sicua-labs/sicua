import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { MetaTagAnalysis } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";

/**
 * Analyzer for meta tags and page metadata
 */
export class MetaTagAnalyzer {
  private component: ComponentRelation;
  private sourceFile: ts.SourceFile;

  constructor(component: ComponentRelation) {
    this.component = component;
    const sourceFile = ComponentUtils.getSourceFile(component);
    if (!sourceFile) {
      throw new Error("Component content is empty");
    }
    this.sourceFile = sourceFile;
  }

  /**
   * Analyze meta tags in the component
   */
  public analyzeMetaTags(): MetaTagAnalysis {
    const analysis: MetaTagAnalysis = {
      title: { present: false, length: 0, isDynamic: false },
      description: { present: false, length: 0, isDynamic: false },
      robots: { present: false, directives: [] },
      canonical: { present: false, value: "", isDynamic: false },
      openGraph: {
        present: false,
        properties: {
          title: false,
          description: false,
          image: false,
          url: false,
        },
      },
      twitter: {
        present: false,
        properties: {
          card: false,
          title: false,
          description: false,
          image: false,
        },
      },
      viewport: { present: false, isResponsive: false },
    };

    // Check for static metadata export
    const metadataObject = ComponentUtils.extractMetadataObject(
      this.sourceFile
    );
    if (metadataObject) {
      this.extractMetadataFromObject(metadataObject, analysis);
    }

    // Check for generateMetadata function
    const visitNode = (node: ts.Node) => {
      if (ComponentUtils.isGenerateMetadataFunction(node)) {
        analysis.title.isDynamic = true;
        analysis.description.isDynamic = true;
        analysis.title.present = true;
        analysis.description.present = true;
      }
      ts.forEachChild(node, visitNode);
    };

    visitNode(this.sourceFile);
    return analysis;
  }

  /**
   * Extract metadata from an object literal expression
   */
  private extractMetadataFromObject(
    obj: ts.ObjectLiteralExpression,
    analysis: MetaTagAnalysis
  ): void {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;

      const propertyName = prop.name.getText();
      const value = prop.initializer;

      switch (propertyName) {
        case "title":
          analysis.title.present = true;
          if (ts.isStringLiteral(value)) {
            analysis.title.length = value.text.length;
          } else {
            analysis.title.isDynamic = true;
          }
          break;

        case "description":
          analysis.description.present = true;
          if (ts.isStringLiteral(value)) {
            analysis.description.length = value.text.length;
          } else {
            analysis.description.isDynamic = true;
          }
          break;

        case "robots":
          analysis.robots.present = true;
          if (ts.isObjectLiteralExpression(value)) {
            this.extractRobotsDirectives(value, analysis);
          }
          break;

        case "openGraph":
          if (ts.isObjectLiteralExpression(value)) {
            this.extractOpenGraphProperties(value, analysis);
          }
          break;

        case "twitter":
          if (ts.isObjectLiteralExpression(value)) {
            this.extractTwitterProperties(value, analysis);
          }
          break;

        case "alternates":
          if (ts.isObjectLiteralExpression(value)) {
            const canonical = value.properties.find(
              (p) =>
                ts.isPropertyAssignment(p) && p.name.getText() === "canonical"
            );
            if (canonical && ts.isPropertyAssignment(canonical)) {
              analysis.canonical.present = true;
              if (ts.isStringLiteral(canonical.initializer)) {
                analysis.canonical.value = canonical.initializer.text;
              } else {
                analysis.canonical.isDynamic = true;
              }
            }
          }
          break;

        case "viewport":
          analysis.viewport.present = true;
          if (ts.isStringLiteral(value)) {
            analysis.viewport.isResponsive =
              value.text.includes("width=device-width");
          }
          break;
      }
    }
  }

  /**
   * Extract robots directives
   */
  private extractRobotsDirectives(
    obj: ts.ObjectLiteralExpression,
    analysis: MetaTagAnalysis
  ): void {
    const directives: string[] = [];

    obj.properties.forEach((prop) => {
      if (!ts.isPropertyAssignment(prop)) return;

      const name = prop.name.getText();
      const value = prop.initializer;

      if (ts.isToken(value) && value.kind === ts.SyntaxKind.TrueKeyword) {
        directives.push(name);
      }
    });

    analysis.robots.directives = directives;
  }

  /**
   * Extract Open Graph properties
   */
  private extractOpenGraphProperties(
    obj: ts.ObjectLiteralExpression,
    analysis: MetaTagAnalysis
  ): void {
    analysis.openGraph.present = true;

    obj.properties.forEach((prop) => {
      if (!ts.isPropertyAssignment(prop)) return;

      const name = prop.name.getText();
      switch (name) {
        case "title":
          analysis.openGraph.properties.title = true;
          break;
        case "description":
          analysis.openGraph.properties.description = true;
          break;
        case "images":
          analysis.openGraph.properties.image = true;
          break;
        case "url":
          analysis.openGraph.properties.url = true;
          break;
      }
    });
  }

  /**
   * Extract Twitter card properties
   */
  private extractTwitterProperties(
    obj: ts.ObjectLiteralExpression,
    analysis: MetaTagAnalysis
  ): void {
    analysis.twitter.present = true;

    obj.properties.forEach((prop) => {
      if (!ts.isPropertyAssignment(prop)) return;

      const name = prop.name.getText();
      switch (name) {
        case "card":
          analysis.twitter.properties.card = true;
          break;
        case "title":
          analysis.twitter.properties.title = true;
          break;
        case "description":
          analysis.twitter.properties.description = true;
          break;
        case "images":
          analysis.twitter.properties.image = true;
          break;
      }
    });
  }

  /**
   * Calculate meta tag statistics across multiple pages
   */
  public static calculateMetaTagStatistics(
    metaTagsMap: Map<string, MetaTagAnalysis>
  ) {
    const pages = Array.from(metaTagsMap.values());
    return {
      pagesWithTitle: pages.filter((p) => p.title.present).length,
      pagesWithDescription: pages.filter((p) => p.description.present).length,
      pagesWithCanonical: pages.filter((p) => p.canonical.present).length,
      averageTitleLength: SeoRelated.calculateAverage(
        pages.map((p) => p.title.length)
      ),
      averageDescriptionLength: SeoRelated.calculateAverage(
        pages.map((p) => p.description.length)
      ),
      pagesWithSocialMeta: pages.filter(
        (p) => p.openGraph.present || p.twitter.present
      ).length,
      duplicateTitles: this.findDuplicateTitles(metaTagsMap),
    };
  }

  /**
   * Find duplicate titles across pages
   */
  private static findDuplicateTitles(
    metaTagsMap: Map<string, MetaTagAnalysis>
  ): Array<{ title: string; pages: string[] }> {
    const titleMap = new Map<string, string[]>();

    metaTagsMap.forEach((analysis, pagePath) => {
      if (analysis.title.present) {
        const title = analysis.title.length.toString();
        const pages = titleMap.get(title) || [];
        pages.push(pagePath);
        titleMap.set(title, pages);
      }
    });

    return Array.from(titleMap.entries())
      .filter(([_, pages]) => pages.length > 1)
      .map(([title, pages]) => ({ title, pages }));
  }
}
