import ts from "typescript";
import path from "path-browserify";
import { ScanResult } from "../../../types";
import { TypeFileFilter } from "../types/internalTypes";
import { NodeTypeGuards } from "../../../utils/ast/nodeTypeGuards";
import { isReactComponent } from "../../../utils/ast/reactSpecific";

/**
 * Utilities for filtering and identifying types
 */
export class TypeFilterUtils {
  /**
   * Identify files relevant for type analysis
   */
  public static identifyRelevantFiles(
    scanResult: ScanResult,
    filter: TypeFileFilter = {}
  ): string[] {
    const relevantFiles: string[] = [];
    const typesKeywords = [
      "interface ",
      "type ",
      "enum ",
      "class ",
      "extends ",
      "implements ",
    ];

    for (const [filePath, metadata] of scanResult.fileMetadata.entries()) {
      // Skip test files unless explicitly included
      if (
        !filter.includeTests &&
        (filePath.includes(".test.") ||
          filePath.includes(".spec.") ||
          filePath.includes("__tests__"))
      ) {
        continue;
      }

      // Skip node_modules unless explicitly included
      if (!filter.includeNodeModules && filePath.includes("node_modules")) {
        continue;
      }

      // Always include .d.ts files and any file with "type" in its name if includeDts is true
      if (
        (filter.includeDts && filePath.endsWith(".d.ts")) ||
        filePath.includes("type") ||
        filePath.includes("interface") ||
        metadata.hasTypeDefinitions
      ) {
        relevantFiles.push(filePath);
        continue;
      }

      // Include files with TypeScript/React
      if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) {
        const content = scanResult.fileContents.get(filePath) || "";
        // Quick check before full parsing
        if (typesKeywords.some((keyword) => content.includes(keyword))) {
          relevantFiles.push(filePath);
        }
      }

      // Apply custom file name pattern filter if provided
      if (filter.fileNamePattern && filePath.match(filter.fileNamePattern)) {
        relevantFiles.push(filePath);
      }
    }

    return relevantFiles;
  }

  /**
   * Check if a node has prop type definitions
   */
  public static hasPropsTypeDefinition(
    node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
  ): boolean {
    if (node.parameters.length === 0) {
      return false;
    }

    const firstParam = node.parameters[0];
    return (
      firstParam.type !== undefined &&
      !(
        NodeTypeGuards.isTypeReference(firstParam.type) &&
        firstParam.type.typeName.getText() === "any"
      )
    );
  }

  /**
   * Check if a node is a complex type
   */
  public static isComplexType(node: ts.Node): boolean {
    return (
      node &&
      (ts.isUnionTypeNode(node) ||
        ts.isIntersectionTypeNode(node) ||
        ts.isTypeLiteralNode(node) ||
        (ts.isTypeReferenceNode(node) &&
          (node.typeName.getText() === "Partial" ||
            node.typeName.getText() === "Pick" ||
            node.typeName.getText() === "Omit" ||
            node.typeName.getText() === "Record")))
    );
  }

  /**
   * Check if a name is potentially a component name
   */
  public static isLikelyComponentName(name: string): boolean {
    // Component names typically start with an uppercase letter
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * Check if a name is potentially a prop type name
   */
  public static isLikelyPropTypeName(name: string): boolean {
    return (
      name.endsWith("Props") ||
      name.endsWith("Properties") ||
      (name.includes("Props") &&
        this.isLikelyComponentName(name.replace("Props", "")))
    );
  }

  /**
   * Check if a component node should be analyzed for props
   */
  public static shouldAnalyzeComponentProps(
    node: ts.Node,
    componentName: string,
    fileName: string
  ): boolean {
    // Skip if not a React component
    if (!isReactComponent(node)) {
      return false;
    }

    // Skip components in test files
    if (
      fileName.includes(".test.") ||
      fileName.includes(".spec.") ||
      fileName.includes("__tests__")
    ) {
      return false;
    }

    // Skip components in story files
    if (fileName.includes(".stories.") || fileName.includes(".story.")) {
      return false;
    }

    return true;
  }

  /**
   * Get common type names that should have proper namespacing
   */
  public static getCommonTypeNames(): Set<string> {
    return new Set([
      "Props",
      "State",
      "Config",
      "Options",
      "Result",
      "Response",
      "Request",
      "Data",
      "Params",
      "Info",
      "Item",
      "List",
      "Map",
      "Context",
    ]);
  }

  /**
   * Check if a file is a type definition file
   */
  public static isTypeDefinitionFile(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);

    return (
      normalizedPath.endsWith(".d.ts") ||
      normalizedPath.includes("/types/") ||
      normalizedPath.includes("\\types\\") ||
      normalizedPath.includes("/interfaces/") ||
      normalizedPath.includes("\\interfaces\\") ||
      path.basename(normalizedPath).startsWith("type") ||
      path.basename(normalizedPath).startsWith("interface")
    );
  }

  /**
   * Split files into batches for processing
   */
  public static chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size)
    );
  }
}
