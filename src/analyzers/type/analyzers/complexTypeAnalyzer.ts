import ts from "typescript";
import { ComplexTypeInfo, TypeSimplificationSuggestion } from "../../../types";
import { TypeFilterUtils } from "../utils/typeFilterUtils";
import { ImprovementSuggestionGenerator } from "../generators/improvementSuggestionGenerator";

/**
 * Analyzer for complex types (unions, intersections, etc.)
 */
export class ComplexTypeAnalyzer {
  private complexTypes: ComplexTypeInfo[] = [];
  private typeSimplificationSuggestions: TypeSimplificationSuggestion[] = [];
  private broadUnionTypesCount: number = 0;
  private maxResults: number;

  constructor(maxResults: number = 100) {
    this.maxResults = maxResults;
  }

  /**
   * Analyze a potentially complex type
   */
  public analyzeComplexType(
    node: ts.Node,
    fileName: string,
    context: string = ""
  ): void {
    if (TypeFilterUtils.isComplexType(node as ts.TypeNode)) {
      // Limit the number of complex types we track to avoid memory issues
      if (this.complexTypes.length < this.maxResults) {
        const complexTypeInfo =
          ImprovementSuggestionGenerator.generateComplexTypeSuggestions(
            node,
            fileName,
            context
          );

        if (complexTypeInfo) {
          this.complexTypes.push(complexTypeInfo);
        }
      }

      if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        // Limit the number of suggestions
        if (this.typeSimplificationSuggestions.length < this.maxResults / 2) {
          const suggestion =
            ImprovementSuggestionGenerator.suggestTypeSimplification(
              node,
              fileName,
              context
            );

          if (suggestion) {
            this.typeSimplificationSuggestions.push(suggestion);
          }
        }

        // Check for broad union types
        if (ts.isUnionTypeNode(node) && node.types.length > 5) {
          this.broadUnionTypesCount++;
        }
      }
    }
  }

  /**
   * Check for nesting in complex type
   */
  public checkNestingLevel(node: ts.Node): number {
    if (!node) return 0;

    let nestingLevel = 0;

    if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
      // Check each type in the union/intersection for further nesting
      for (const type of node.types) {
        if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
          const childLevel = this.checkNestingLevel(type) + 1;
          nestingLevel = Math.max(nestingLevel, childLevel);
        }
      }
    } else if (ts.isTypeLiteralNode(node)) {
      // Check for nesting in object type members
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.type) {
          const childLevel = this.checkNestingLevel(member.type) + 1;
          nestingLevel = Math.max(nestingLevel, childLevel);
        }
      }
    }

    return nestingLevel;
  }

  /**
   * Get the analyzer results
   */
  public getResults(): {
    complexTypes: ComplexTypeInfo[];
    typeSimplificationSuggestions: TypeSimplificationSuggestion[];
    broadUnionTypesCount: number;
  } {
    return {
      complexTypes: this.complexTypes,
      typeSimplificationSuggestions: this.typeSimplificationSuggestions,
      broadUnionTypesCount: this.broadUnionTypesCount,
    };
  }

  /**
   * Check if a complex type has excessive member types
   */
  public hasExcessiveMembers(node: ts.Node): boolean {
    if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
      return node.types.length > this.getRecommendedMaxMembers(node);
    }
    return false;
  }

  /**
   * Get recommended maximum members for a complex type
   */
  private getRecommendedMaxMembers(node: ts.Node): number {
    if (ts.isUnionTypeNode(node)) {
      // Check if it's an enum-like type (string literals)
      const isAllStringLiterals = (node as ts.UnionTypeNode).types.every(
        (t) => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)
      );

      return isAllStringLiterals ? 10 : 4;
    } else if (ts.isIntersectionTypeNode(node)) {
      return 3; // Intersections should typically be smaller
    }

    return 5;
  }

  /**
   * Check if a complex type can be simplified
   */
  public canBeSimplified(node: ts.Node): boolean {
    if (!TypeFilterUtils.isComplexType(node as ts.TypeNode)) {
      return false;
    }

    if (ts.isUnionTypeNode(node)) {
      // Check for nullable type that could use optional
      const hasNull = node.types.some(
        (t) => t.kind === ts.SyntaxKind.NullKeyword
      );

      const hasUndefined = node.types.some(
        (t) => t.kind === ts.SyntaxKind.UndefinedKeyword
      );

      if (hasNull || hasUndefined) {
        return true;
      }

      // Check for string literals that could be enum
      const isAllStringLiterals = node.types.every(
        (t) => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)
      );

      if (isAllStringLiterals && node.types.length > 3) {
        return true;
      }
    }

    // Check for very nested types
    if (this.checkNestingLevel(node) > 2) {
      return true;
    }

    return false;
  }
}
