import ts from "typescript";
import { TypeRegistry } from "../types/internalTypes";
import { TypeFilterUtils } from "../utils/typeFilterUtils";
import { NodeTypeGuards } from "../../../utils/ast/nodeTypeGuards";
import { ScanResult } from "../../../types";

/**
 * Analyzer for type usage across the codebase
 */
export class TypeUsageAnalyzer {
  private scanResult: ScanResult;
  private typeRegistry: TypeRegistry;
  private anyUsageCount: number = 0;
  private suggestedImprovements: string[] = [];

  // Cache for any usage counts by file
  private anyUsageCache: Map<string, number> = new Map();

  constructor(scanResult: ScanResult, typeRegistry: TypeRegistry) {
    this.scanResult = scanResult;
    this.typeRegistry = typeRegistry;
  }

  /**
   * Analyze type usages across the codebase
   */
  public async analyzeTypeUsages(relevantFiles: string[]): Promise<{
    anyUsageCount: number;
    suggestedImprovements: string[];
  }> {
    // Get a list of all type names for quick lookups
    const allTypeNames = new Set(
      Array.from(this.typeRegistry.values()).map((t) => t.name)
    );

    // Update type usage information
    await this.updateTypeUsageInfo(relevantFiles, allTypeNames);

    // Check for any usage
    await this.scanForAnyUsage(relevantFiles);

    return {
      anyUsageCount: this.anyUsageCount,
      suggestedImprovements: this.suggestedImprovements,
    };
  }

  /**
   * Update type usage information for all types
   */
  private async updateTypeUsageInfo(
    relevantFiles: string[],
    allTypeNames: Set<string>
  ): Promise<void> {
    // Process in batches to avoid excessive memory usage
    const BATCH_SIZE = 50;
    const batches = TypeFilterUtils.chunkArray(relevantFiles, BATCH_SIZE);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (filePath) => {
          const sourceFile = this.scanResult.sourceFiles.get(filePath);
          if (!sourceFile) return;

          // For each file, find references to types
          for (const [typeId, typeDef] of this.typeRegistry.entries()) {
            // Skip analyzing the file where the type is defined
            if (filePath === typeDef.filePath) continue;

            // Look for any references to this type by name
            const references = this.findTypeReferences(
              sourceFile,
              typeDef.name
            );
            if (references.length > 0) {
              typeDef.usages.add(filePath);
            }
          }
        })
      );
    }
  }

  /**
   * Find references to a type by name in a source file
   */
  private findTypeReferences(
    sourceFile: ts.SourceFile,
    typeName: string
  ): ts.Node[] {
    // Fast path: check if the text contains the type name at all
    const sourceText = sourceFile.getText();
    if (!sourceText.includes(typeName)) {
      return [];
    }

    const references: ts.Node[] = [];

    const visit = (node: ts.Node) => {
      // Check for type references
      if (
        NodeTypeGuards.isTypeReference(node) &&
        node.typeName.getText() === typeName
      ) {
        references.push(node);
      }
      // Also check for extends clauses
      else if (ts.isHeritageClause(node)) {
        for (const type of node.types) {
          if (type.expression.getText() === typeName) {
            references.push(type);
          }
        }
      }

      // Only traverse certain node types to save time
      if (
        ts.isTypeNode(node) ||
        ts.isHeritageClause(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isSourceFile(node)
      ) {
        ts.forEachChild(node, visit);
      }
    };

    // Only scan the file if it's not too large
    if (sourceText.length < 100000) {
      // Skip extremely large files
      ts.forEachChild(sourceFile, visit);
    }

    return references;
  }

  /**
   * Scan for 'any' usage in source files
   */
  private async scanForAnyUsage(relevantFiles: string[]): Promise<void> {
    // Process in batches to avoid excessive memory usage
    const BATCH_SIZE = 50;
    const batches = TypeFilterUtils.chunkArray(relevantFiles, BATCH_SIZE);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (filePath) => {
          const sourceFile = this.scanResult.sourceFiles.get(filePath);
          if (!sourceFile) return;

          const fileName = sourceFile.fileName;

          // If we've already scanned this file for 'any' usage, skip it
          if (this.anyUsageCache.has(filePath)) {
            this.anyUsageCount += this.anyUsageCache.get(filePath)!;
            return;
          }

          // Scan the file for 'any' usage
          const anyCount = this.scanSingleFileForAnyUsage(sourceFile, fileName);
          this.anyUsageCount += anyCount;
          this.anyUsageCache.set(filePath, anyCount);
        })
      );
    }
  }

  /**
   * Scan a single file for 'any' usage
   */
  private scanSingleFileForAnyUsage(
    sourceFile: ts.SourceFile,
    fileName: string
  ): number {
    let anyCount = 0;

    const checkForAny = (node: ts.Node) => {
      if (
        NodeTypeGuards.isTypeReference(node) &&
        node.typeName.getText() === "any"
      ) {
        anyCount++;

        // Only add detailed suggestions for the first 20 occurrences to avoid bloating the report
        if (this.suggestedImprovements.length < 20) {
          // Get line and column for better error reporting
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart()
          );

          this.suggestedImprovements.push(
            `Consider replacing 'any' with a more specific type in ${fileName}:${
              line + 1
            }:${character + 1}`
          );
        }
      }

      // Only check specific node types to save time
      if (
        ts.isTypeNode(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isPropertySignature(node) ||
        ts.isMethodSignature(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isSourceFile(node)
      ) {
        ts.forEachChild(node, checkForAny);
      }
    };

    ts.forEachChild(sourceFile, checkForAny);
    return anyCount;
  }

  /**
   * Find unused types in the codebase
   */
  public findUnusedTypes(): string[] {
    const unusedTypes: string[] = [];

    for (const typeDef of this.typeRegistry.values()) {
      // If the type has no usages outside its own file, it's unused
      if (typeDef.usages.size === 0) {
        unusedTypes.push(`${typeDef.name} in ${typeDef.filePath}`);
      }
    }

    return unusedTypes;
  }

  /**
   * Find types without proper namespace/prefixing
   */
  public identifyTypesWithoutNamespace(): string[] {
    const result: string[] = [];
    const commonTypeNames = TypeFilterUtils.getCommonTypeNames();

    // Limit the analysis to avoid excessive results
    const typesToCheck = Array.from(this.typeRegistry.values()).slice(0, 200);

    for (const typeDef of typesToCheck) {
      // Check for overly generic names
      if (
        commonTypeNames.has(typeDef.name) ||
        (typeDef.name.endsWith("Props") && typeDef.name.length < 10) ||
        (typeDef.name.endsWith("State") && typeDef.name.length < 10)
      ) {
        result.push(`${typeDef.name} in ${typeDef.filePath}`);

        // Limit the number of results
        if (result.length >= 50) break;
      }
    }

    return result;
  }
}
