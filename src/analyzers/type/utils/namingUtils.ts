import path from "path-browserify";
import { TypeDefinition } from "../types/internalTypes";

/**
 * Utilities for generating and working with type names
 */
export class NamingUtils {
  /**
   * Find the longest common prefix in an array of strings
   */
  public static findLongestCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return "";
    if (strings.length === 1) return strings[0];

    let prefix = "";
    const firstStr = strings[0];

    for (let i = 0; i < firstStr.length; i++) {
      const char = firstStr[i];
      if (strings.every((str) => str[i] === char)) {
        prefix += char;
      } else {
        break;
      }
    }

    return prefix;
  }

  /**
   * Find a suggested name for a unified type based on component names
   */
  public static findSuggestedName(typeNames: string[]): string {
    // Look for common patterns in the names
    const words = new Set<string>();

    for (const name of typeNames) {
      // Split the name on camel case and gather words
      const parts = name.split(/(?=[A-Z])/).filter((p) => p.length > 0);
      parts.forEach((part) => {
        if (part.length >= 3) {
          // Only consider significant words
          words.add(part.toLowerCase());
        }
      });
    }

    // Count word frequencies
    const wordCounts: Record<string, number> = {};
    words.forEach((word) => {
      wordCounts[word] = 0;
      typeNames.forEach((name) => {
        if (name.toLowerCase().includes(word)) {
          wordCounts[word]++;
        }
      });
    });

    // Find the most common significant words
    const commonWords = Object.entries(wordCounts)
      .filter(([_, count]) => count > typeNames.length / 2)
      .sort(([_, countA], [__, countB]) => countB - countA)
      .map(([word]) => word);

    if (commonWords.length > 0) {
      // Capitalize first letter of each word
      const nameParts = commonWords
        .slice(0, 2) // Take at most 2 words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

      return nameParts.join("") + "Base";
    }

    // If no common words, use the first name + Base
    return typeNames[0] + "Base";
  }

  /**
   * Find the common directory ancestor for a list of file paths
   */
  public static findCommonDirectory(filePaths: string[]): string {
    if (filePaths.length === 0) return "";
    if (filePaths.length === 1) return path.dirname(filePaths[0]);

    const dirs = filePaths.map((filePath) =>
      path.dirname(filePath).split(path.sep)
    );
    let commonDir: string[] = [];

    // Find common prefix of all directory paths
    const firstDir = dirs[0];
    for (let i = 0; i < firstDir.length; i++) {
      const segment = firstDir[i];
      if (dirs.every((dir) => dir[i] === segment)) {
        commonDir.push(segment);
      } else {
        break;
      }
    }

    return commonDir.join(path.sep);
  }

  /**
   * Suggest a better name for a type based on its content and usage
   */
  public static suggestBetterTypeName(
    typeDef: TypeDefinition,
    componentContext?: string
  ): string {
    const currentName = typeDef.name;

    // Don't rename already good names
    if (currentName.length > 10 && !this.isGenericName(currentName)) {
      return currentName;
    }

    // If it's a props type for a component, suggest ComponentNameProps
    if (currentName.endsWith("Props") && componentContext) {
      const componentName = componentContext.replace(/\.(tsx|jsx|ts|js)$/, "");
      return `${componentName}Props`;
    }

    // For interfaces, suggest ITypeName if not already using this convention
    if (
      !currentName.startsWith("I") &&
      /^[A-Z]/.test(currentName) &&
      typeDef.node.kind === 230 // InterfaceDeclaration kind
    ) {
      return `I${currentName}`;
    }

    // For type aliases with Props suffix but not tied to components
    if (currentName === "Props" || currentName === "Properties") {
      // Try to infer from file path
      const fileName = path.basename(
        typeDef.filePath,
        path.extname(typeDef.filePath)
      );
      if (fileName && fileName !== "index" && fileName !== "types") {
        const baseName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
        return `${baseName}Props`;
      }
    }

    // Suggest more specific names for generic types
    if (this.isGenericName(currentName)) {
      const props = Array.from(typeDef.signature.properties.keys());
      if (props.length > 0) {
        // Try to derive name from properties
        const significantProps = props.filter(
          (p) => p.length > 3 && !["id", "name", "type", "value"].includes(p)
        );

        if (significantProps.length > 0) {
          const domain = this.inferDomainFromProps(significantProps);
          if (domain) {
            return `${domain}${this.getTypeSuffix(currentName)}`;
          }
        }
      }
    }

    return currentName;
  }

  /**
   * Check if a type name is too generic
   */
  private static isGenericName(name: string): boolean {
    const genericNames = [
      "Options",
      "Config",
      "Props",
      "State",
      "Data",
      "Type",
      "Request",
      "Response",
      "Result",
      "Item",
      "Info",
      "Details",
    ];

    return (
      genericNames.includes(name) ||
      (name.length < 10 && genericNames.some((g) => name.endsWith(g)))
    );
  }

  /**
   * Get type suffix (Props, Options, etc.) from type name
   */
  private static getTypeSuffix(name: string): string {
    const suffixes = [
      "Props",
      "Options",
      "Config",
      "State",
      "Data",
      "Type",
      "Result",
    ];

    for (const suffix of suffixes) {
      if (name.endsWith(suffix)) {
        return suffix;
      }
    }

    return name;
  }

  /**
   * Infer domain name from properties
   */
  private static inferDomainFromProps(props: string[]): string | null {
    // Try to guess domain from property names
    const domains = new Map<string, number>();

    // Look for domain-specific patterns in props
    const userProps = props.filter(
      (p) =>
        p.includes("user") ||
        p.includes("name") ||
        p.includes("email") ||
        p.includes("password") ||
        p.includes("avatar")
    );

    const productProps = props.filter(
      (p) =>
        p.includes("product") ||
        p.includes("price") ||
        p.includes("sku") ||
        p.includes("inventory") ||
        p.includes("stock")
    );

    const authProps = props.filter(
      (p) =>
        p.includes("token") ||
        p.includes("auth") ||
        p.includes("permission") ||
        p.includes("role") ||
        p.includes("access")
    );

    if (userProps.length >= 2) domains.set("User", userProps.length);
    if (productProps.length >= 2) domains.set("Product", productProps.length);
    if (authProps.length >= 2) domains.set("Auth", authProps.length);

    // Return the domain with most matches
    let bestDomain: string | null = null;
    let bestCount = 0;

    domains.forEach((count, domain) => {
      if (count > bestCount) {
        bestDomain = domain;
        bestCount = count;
      }
    });

    return bestDomain;
  }

  /**
   * Determine if a name is better than another
   */
  public static isBetterName(name1: string, name2: string): boolean {
    // Prefer longer, more specific names
    if (name1.length > name2.length && name1.length > 6) {
      return true;
    }

    // Prefer names with camelCase or PascalCase
    const hasCamelCase1 = /[a-z][A-Z]/.test(name1);
    const hasCamelCase2 = /[a-z][A-Z]/.test(name2);

    if (hasCamelCase1 && !hasCamelCase2) {
      return true;
    }

    // Prefer names without generic suffixes
    const genericSuffixes = ["Data", "Info", "Type", "Object"];
    const hasGenericSuffix1 = genericSuffixes.some((s) => name1.endsWith(s));
    const hasGenericSuffix2 = genericSuffixes.some((s) => name2.endsWith(s));

    if (!hasGenericSuffix1 && hasGenericSuffix2) {
      return true;
    }

    return false;
  }
}
