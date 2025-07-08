import { Thing, WithContext, Graph } from "schema-dts";
import ts from "typescript";

export class SeoRelated {
  static extractRouteParams(route: string): string[] {
    const params: string[] = [];
    const paramRegex = /:([^/]+)/g;
    let match;

    while ((match = paramRegex.exec(route)) !== null) {
      params.push(match[1]);
    }

    return params;
  }

  static isInternalLink(href: string): boolean {
    // Check if the href is internal
    return (
      href.startsWith("/") ||
      href.startsWith("./") ||
      href.startsWith("../") ||
      !href.includes("://")
    );
  }

  static getJsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
    if (ts.isJsxElement(node)) {
      const identifier = node.openingElement.tagName;
      return ts.isIdentifier(identifier) ? identifier.text.toLowerCase() : "";
    } else {
      const identifier = node.tagName;
      return ts.isIdentifier(identifier) ? identifier.text.toLowerCase() : "";
    }
  }

  static extractStaticValue(node: ts.Expression): string | null {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }

    if (ts.isTemplateExpression(node)) {
      // Handle template literals with only static parts
      if (node.templateSpans.length === 0) {
        return node.head.text;
      }
    }

    if (ts.isPropertyAccessExpression(node)) {
      // Try to handle common router constant patterns
      const text = node.getText();
      if (text.includes("routes.") || text.includes("ROUTES.")) {
        return this.extractRouteConstant(text);
      }
    }

    return null;
  }

  static extractRouteConstant(text: string): string | null {
    // Remove common prefixes and get the route path
    const routePath = text.replace(/^(routes|ROUTES)\./, "");

    // Convert camelCase or CONSTANT_CASE to path format
    return routePath
      ? "/" +
          routePath
            .replace(/([A-Z])/g, "-$1")
            .toLowerCase()
            .replace(/^-/, "")
            .replace(/_/g, "-")
      : null;
  }

  static getCommonElements<T>(arr: T[]): T[] {
    const counts = new Map<T, number>();
    arr.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
    return Array.from(counts.entries())
      .filter(([_, count]) => count > 1)
      .map(([item]) => item);
  }

  static calculateAverage(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : 0;
  }

  static getTypeFromThing(thing: Thing | WithContext<Thing>): string {
    // Use type assertion to access @type since we know it exists on Thing
    return (thing as { "@type": string })["@type"] || "Unknown";
  }

  // Type guards
  static isGraph(schema: WithContext<Thing> | Graph): schema is Graph {
    return "graph" in schema && Array.isArray(schema.graph);
  }

  static isThingWithType(item: unknown): item is Thing {
    return (
      typeof item === "object" &&
      item !== null &&
      "@type" in item &&
      typeof (item as { "@type": unknown })["@type"] === "string"
    );
  }
}
