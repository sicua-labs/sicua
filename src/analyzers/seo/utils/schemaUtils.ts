import ts from "typescript";
import { Thing, WithContext, Graph } from "schema-dts";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";
import { JsxUtils } from "./jsxUtils";

/**
 * Utility functions for structured data (Schema.org) analysis
 */
export class SchemaUtils {
  /**
   * Finds structured data in a source file
   */
  public static findStructuredData(
    sourceFile: ts.SourceFile
  ): WithContext<Thing> | Graph | undefined {
    let result: WithContext<Thing> | Graph | undefined;

    const visitNode = (node: ts.Node) => {
      if (ts.isJsxElement(node)) {
        // Look for script tags with JSON-LD
        if (
          SeoRelated.getJsxTagName(node) === "script" &&
          JsxUtils.getAttribute(node, "type") === "application/ld+json"
        ) {
          const content = node.children
            .filter(ts.isJsxText)
            .map((child) => child.text)
            .join("");

          try {
            const parsed = JSON.parse(content);
            if (parsed["@graph"]) {
              result = parsed as Graph;
            } else {
              result = parsed as WithContext<Thing>;
            }
          } catch (e) {
            console.warn("Invalid JSON-LD structure:", e);
          }
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return result;
  }

  /**
   * Gets the schema type from a structured data object
   */
  public static getSchemaType(schema: WithContext<Thing> | Graph): string {
    if (SeoRelated.isGraph(schema)) {
      return Array.from(
        new Set(
          schema["@graph"].map((item) =>
            SeoRelated.isThingWithType(item)
              ? SeoRelated.getTypeFromThing(item)
              : "Unknown"
          )
        )
      ).join(", ");
    }
    return SeoRelated.getTypeFromThing(schema);
  }

  /**
   * Calculates the coverage/completeness of a schema
   */
  public static calculateSchemaCoverage(
    schema: WithContext<Thing> | Graph
  ): number {
    const requiredProperties = new Set(["@context", "@type"]);

    const recommendedProperties = new Set([
      "name",
      "description",
      "url",
      "image",
    ]);

    if (SeoRelated.isGraph(schema)) {
      const coverages = schema["@graph"]
        .filter(SeoRelated.isThingWithType)
        .map((item) =>
          this.calculateItemCoverage(
            item,
            requiredProperties,
            recommendedProperties
          )
        );
      return coverages.length > 0
        ? coverages.reduce((a, b) => a + b, 0) / coverages.length
        : 0;
    }

    return this.calculateItemCoverage(
      schema,
      requiredProperties,
      recommendedProperties
    );
  }

  /**
   * Calculates coverage score for a single schema item
   */
  private static calculateItemCoverage(
    item: Thing | WithContext<Thing>,
    required: Set<string>,
    recommended: Set<string>
  ): number {
    // Convert to unknown first, then to Record to satisfy TypeScript
    const itemProperties = new Set(
      Object.keys(item as unknown as Record<string, unknown>)
    );

    const requiredCount = Array.from(required).filter((prop) =>
      itemProperties.has(prop)
    ).length;

    const recommendedCount = Array.from(recommended).filter((prop) =>
      itemProperties.has(prop)
    ).length;

    const totalRequired = required.size;
    const totalRecommended = recommended.size;

    const score =
      (requiredCount / totalRequired) * 0.7 +
      (recommendedCount / totalRecommended) * 0.3;

    return Math.round(score * 100);
  }

  /**
   * Gets required and recommended properties for specific schema types
   */
  public static getSchemaProperties(schemaType: string): {
    required: string[];
    recommended: string[];
  } {
    // Default properties
    const defaultProperties = {
      required: ["@context", "@type"],
      recommended: ["name", "description", "url", "image"],
    };

    // Type-specific properties
    const typeProperties: Record<string, typeof defaultProperties> = {
      Product: {
        required: [...defaultProperties.required, "name"],
        recommended: [
          ...defaultProperties.recommended,
          "brand",
          "offers",
          "review",
          "aggregateRating",
        ],
      },
      Article: {
        required: [...defaultProperties.required, "headline", "author"],
        recommended: [
          ...defaultProperties.recommended,
          "datePublished",
          "dateModified",
          "publisher",
        ],
      },
      LocalBusiness: {
        required: [...defaultProperties.required, "name", "address"],
        recommended: [
          ...defaultProperties.recommended,
          "telephone",
          "openingHours",
          "priceRange",
        ],
      },
      WebPage: {
        required: [...defaultProperties.required, "name"],
        recommended: [
          ...defaultProperties.recommended,
          "breadcrumb",
          "mainEntity",
        ],
      },
      FAQPage: {
        required: [...defaultProperties.required, "mainEntity"],
        recommended: [...defaultProperties.recommended],
      },
    };

    return typeProperties[schemaType] || defaultProperties;
  }
}
