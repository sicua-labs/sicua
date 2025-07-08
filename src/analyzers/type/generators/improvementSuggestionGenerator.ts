import ts from "typescript";
import path from "path-browserify";
import { TypeDefinition } from "../types/internalTypes";
import {
  TypeDuplication,
  TypeSimplificationSuggestion,
  ComplexTypeInfo,
} from "../../../types";

/**
 * Generator for type improvement suggestions
 */
export class ImprovementSuggestionGenerator {
  /**
   * Generate suggestions for duplicate types
   */
  public static generateDuplicationSuggestions(
    duplicateGroups: TypeDefinition[][],
    maxSuggestions: number = 20
  ): TypeDuplication[] {
    const suggestions: TypeDuplication[] = [];

    // Process most significant groups first
    const significantGroups = duplicateGroups
      .filter((group) => group.length > 1)
      .sort((a, b) => b.length - a.length)
      .slice(0, maxSuggestions);

    for (const group of significantGroups) {
      // Select the primary type (most used or with more intuitive name)
      const primaryType = this.selectPrimaryType(group);

      const duplicates = group
        .filter((typeDef) => typeDef.name !== primaryType.name)
        .map((typeDef) => ({
          name: typeDef.name,
          filePath: typeDef.filePath,
          location: typeDef.location,
          matchScore: 1.0, // Exact match for duplicates
        }));

      // Generate suggestion based on the duplicates
      let suggestion = `Replace duplicate types (${duplicates
        .map((d) => d.name)
        .join(", ")}) with ${primaryType.name}`;

      // Consider directory structure for import suggestions
      if (
        duplicates.some(
          (d) => path.dirname(d.filePath) !== path.dirname(primaryType.filePath)
        )
      ) {
        suggestion += `. Consider moving ${primaryType.name} to a shared types folder.`;
      }

      suggestions.push({
        primaryType: {
          name: primaryType.name,
          filePath: primaryType.filePath,
          location: primaryType.location,
        },
        duplicates,
        suggestion,
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions for complex types
   */
  public static generateComplexTypeSuggestions(
    node: ts.Node,
    fileName: string,
    context: string = ""
  ): ComplexTypeInfo | null {
    if (!node) return null;

    return {
      fileName,
      context: context || "Type definition",
      typeKind: ts.SyntaxKind[node.kind],
      typeText: node.getText(),
    };
  }

  /**
   * Generate simplification suggestions for complex types
   */
  public static suggestTypeSimplification(
    node: ts.UnionTypeNode | ts.IntersectionTypeNode,
    fileName: string,
    context: string
  ): TypeSimplificationSuggestion | null {
    const typeKind = ts.isUnionTypeNode(node) ? "Union" : "Intersection";
    const typeCount = node.types.length;

    if (typeCount > 3) {
      return {
        fileName,
        context: context || "Type definition",
        typeKind,
        typeCount,
        suggestion: `Consider simplifying this ${typeKind.toLowerCase()} type with ${typeCount} members. You might use a type alias or split it into smaller types.`,
      };
    }

    // Check for common patterns that can be simplified
    if (ts.isUnionTypeNode(node)) {
      const nullableCheck = this.checkForNullableType(node, fileName, context);
      if (nullableCheck) return nullableCheck;

      const stringLiteralCheck = this.checkForStringLiteralUnion(
        node,
        fileName,
        context
      );
      if (stringLiteralCheck) return stringLiteralCheck;
    }

    return null;
  }

  /**
   * Check for nullable types that could use optional syntax
   */
  private static checkForNullableType(
    node: ts.UnionTypeNode,
    fileName: string,
    context: string
  ): TypeSimplificationSuggestion | null {
    const hasNull = node.types.some(
      (t) => t.kind === ts.SyntaxKind.NullKeyword
    );
    const hasUndefined = node.types.some(
      (t) => t.kind === ts.SyntaxKind.UndefinedKeyword
    );

    if (hasNull || hasUndefined) {
      return {
        fileName,
        context: context || "Type definition",
        typeKind: "Union",
        typeCount: node.types.length,
        suggestion: `This union type includes ${
          hasNull ? "null" : "undefined"
        }. Consider using the '?' optional modifier or '| undefined' instead of an explicit union.`,
      };
    }

    return null;
  }

  /**
   * Check for string literal unions that could be enums
   */
  private static checkForStringLiteralUnion(
    node: ts.UnionTypeNode,
    fileName: string,
    context: string
  ): TypeSimplificationSuggestion | null {
    const isAllStringLiterals = node.types.every(
      (t) => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)
    );

    if (isAllStringLiterals && node.types.length > 3) {
      return {
        fileName,
        context: context || "Type definition",
        typeKind: "Union",
        typeCount: node.types.length,
        suggestion: `This union type consists of ${node.types.length} string literals. Consider using an enum or a const assertion with 'as const'.`,
      };
    }

    return null;
  }

  /**
   * Generate component prop type suggestions
   */
  public static generateComponentPropSuggestions(
    componentsWithoutProps: string[],
    fileName: string
  ): string[] {
    return componentsWithoutProps.map(
      (componentName) =>
        `React component "${componentName}" in ${fileName} is missing prop type definitions.`
    );
  }

  /**
   * Generate function return type suggestions
   */
  public static generateFunctionReturnTypeSuggestions(
    functionNames: string[],
    fileName: string
  ): string[] {
    return functionNames.map(
      (name) =>
        `Function "${name}" in ${fileName} is missing a return type annotation.`
    );
  }

  /**
   * Generate suggestions for "any" type usage
   */
  public static generateAnyTypeSuggestions(
    position: { line: number; character: number },
    fileName: string
  ): string {
    return `Consider replacing 'any' with a more specific type in ${fileName}:${
      position.line + 1
    }:${position.character + 1}`;
  }

  /**
   * Select the primary type from a list of duplicates based on usage and naming
   */
  private static selectPrimaryType(
    typeDefinitions: TypeDefinition[]
  ): TypeDefinition {
    // Sort by usages count (descending), then by name quality
    return typeDefinitions.sort((a, b) => {
      // Prefer types in types/ folders
      const aInTypesFolder =
        a.filePath.includes("/types/") || a.filePath.includes("\\types\\");
      const bInTypesFolder =
        b.filePath.includes("/types/") || b.filePath.includes("\\types\\");

      if (aInTypesFolder && !bInTypesFolder) return -1;
      if (!aInTypesFolder && bInTypesFolder) return 1;

      // Then prefer by usage count
      const aUsages = a.usages.size;
      const bUsages = b.usages.size;
      if (aUsages !== bUsages) return bUsages - aUsages;

      // Then prefer shorter names (usually more general)
      return a.name.length - b.name.length;
    })[0];
  }
}
