import ts from "typescript";
import { Thing, WithContext, Graph } from "schema-dts";
import { ComponentRelation } from "../../../types";
import { StructuredDataAnalysis } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { SchemaUtils } from "../utils/schemaUtils";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";
import { StructuredDataMap } from "../types/internalTypes";

/**
 * Analyzer for structured data (JSON-LD schema.org)
 */
export class StructuredDataAnalyzer {
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
   * Analyze structured data in the component
   */
  public analyzeStructuredData(): WithContext<Thing> | Graph | undefined {
    return SchemaUtils.findStructuredData(this.sourceFile);
  }

  /**
   * Generate structured data analysis from a collection of components
   */
  public static generateStructuredDataAnalysis(
    structuredDataMap: StructuredDataMap
  ): StructuredDataAnalysis {
    const schemas: StructuredDataAnalysis["schemas"] = Array.from(
      structuredDataMap.entries()
    ).map(([location, schema]) => ({
      type: SchemaUtils.getSchemaType(schema),
      coverage: SchemaUtils.calculateSchemaCoverage(schema),
      location,
    }));

    const schemaTypes = schemas.map((s) => s.type);
    const commonTypes = SeoRelated.getCommonElements(schemaTypes).map(
      (type) => ({
        type,
        count: schemaTypes.filter((t) => t === type).length,
      })
    );

    return {
      schemas,
      statistics: {
        totalSchemas: schemas.length,
        schemasPerPage: schemas.length / structuredDataMap.size || 0,
        commonTypes,
      },
    };
  }

  /**
   * Get missing required and recommended properties for a structured data item
   */
  public static getMissingProperties(schema: WithContext<Thing> | Graph): {
    type: string;
    missing: { required: string[]; recommended: string[] };
  } {
    const type = SchemaUtils.getSchemaType(schema);
    const { required, recommended } = SchemaUtils.getSchemaProperties(type);

    let missingRequired: string[] = [];
    let missingRecommended: string[] = [];

    // Convert schema to record for property access
    const schemaRecord = schema as unknown as Record<string, unknown>;

    // Check for missing required properties
    missingRequired = required.filter(
      (prop) => !Object.keys(schemaRecord).includes(prop)
    );

    // Check for missing recommended properties
    missingRecommended = recommended.filter(
      (prop) => !Object.keys(schemaRecord).includes(prop)
    );

    return {
      type,
      missing: {
        required: missingRequired,
        recommended: missingRecommended,
      },
    };
  }

  /**
   * Get structured data improvement suggestions
   */
  public static getImprovementSuggestions(
    structuredDataMap: StructuredDataMap
  ): string[] {
    const suggestions: string[] = [];

    // Check if structured data is missing entirely
    if (structuredDataMap.size === 0) {
      suggestions.push(
        "Add structured data (JSON-LD) to improve search engine understanding of your content."
      );
    }

    // Analyze existing structured data
    structuredDataMap.forEach((schema, location) => {
      const { type, missing } = this.getMissingProperties(schema);

      // Suggest adding missing required properties
      if (missing.required.length > 0) {
        suggestions.push(
          `Add missing required properties (${missing.required.join(
            ", "
          )}) to ${type} schema in ${location}.`
        );
      }

      // Suggest adding missing recommended properties
      if (missing.recommended.length > 0 && missing.recommended.length <= 3) {
        suggestions.push(
          `Consider adding recommended properties (${missing.recommended.join(
            ", "
          )}) to ${type} schema in ${location}.`
        );
      }
    });

    // Check for schema types that could be added
    const existingTypes = new Set(
      Array.from(structuredDataMap.values()).map((schema) =>
        SchemaUtils.getSchemaType(schema)
      )
    );

    // Commonly used schema types that improve SEO
    const commonSchemaTypes = [
      "WebPage",
      "BreadcrumbList",
      "Article",
      "Product",
      "LocalBusiness",
      "FAQPage",
    ];
    const missingCommonTypes = commonSchemaTypes.filter(
      (type) => !existingTypes.has(type)
    );

    if (missingCommonTypes.length > 0) {
      suggestions.push(
        `Consider adding these useful schema types for SEO: ${missingCommonTypes.join(
          ", "
        )}.`
      );
    }

    return suggestions;
  }
}
