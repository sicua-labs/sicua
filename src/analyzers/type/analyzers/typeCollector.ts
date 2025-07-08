import ts from "typescript";
import path from "path-browserify";
import {
  TypeRegistry,
  TypeSignature,
  SignatureToTypesMap,
  TypesByDirectoryMap,
} from "../types/internalTypes";
import { TypeSignatureUtils } from "../utils/typeSignatureUtils";
import { TypeFilterUtils } from "../utils/typeFilterUtils";
import { ScanResult } from "../../../types";

/**
 * Collector for type information from source files
 */
export class TypeCollector {
  private scanResult: ScanResult;
  private typeRegistry: TypeRegistry = new Map();
  private signatureToTypes: SignatureToTypesMap = new Map();
  private typesByDirectory: TypesByDirectoryMap = {};

  // Performance optimization - caches
  private typeSignatureCache: Map<string, TypeSignature> = new Map();

  constructor(scanResult: ScanResult) {
    this.scanResult = scanResult;
  }

  /**
   * Collect all types from relevant files
   */
  public async collectAllTypes(): Promise<{
    typeRegistry: TypeRegistry;
    signatureToTypes: SignatureToTypesMap;
    typesByDirectory: TypesByDirectoryMap;
  }> {
    // First pass: quick scan to filter relevant files
    const typesFiles = TypeFilterUtils.identifyRelevantFiles(this.scanResult);

    // Process in batches to avoid excessive memory usage
    const BATCH_SIZE = 50;
    const batches = TypeFilterUtils.chunkArray(typesFiles, BATCH_SIZE);

    for (const batch of batches) {
      await Promise.all(
        batch.map((filePath) => {
          const sourceFile = this.scanResult.sourceFiles.get(filePath);
          if (sourceFile) {
            return this.collectTypesFromFile(sourceFile, filePath);
          }
          return Promise.resolve();
        })
      );
    }

    return {
      typeRegistry: this.typeRegistry,
      signatureToTypes: this.signatureToTypes,
      typesByDirectory: this.typesByDirectory,
    };
  }

  /**
   * Collect types from a single file
   */
  private async collectTypesFromFile(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Promise<void> {
    const visit = (node: ts.Node) => {
      // Check for type declarations
      if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isClassDeclaration(node)
      ) {
        if (node.name) {
          const typeName = node.name.text;
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart()
          );

          // Use cached signature if we've seen this exact node before
          const nodeText = node.getText();
          const cacheKey = `${filePath}:${typeName}:${nodeText.length}`;

          let signature: TypeSignature;

          if (this.typeSignatureCache.has(cacheKey)) {
            signature = this.typeSignatureCache.get(cacheKey)!;
          } else {
            // Generate a structural signature for this type
            signature = TypeSignatureUtils.generateTypeSignature(node);
            this.typeSignatureCache.set(cacheKey, signature);
          }

          // Store the type in our registry
          const typeId = `${filePath}:${typeName}`;
          this.typeRegistry.set(typeId, {
            name: typeName,
            filePath,
            node,
            signature,
            usages: new Set<string>(),
            location: {
              line: line + 1,
              column: character + 1,
            },
          });

          // Index by signature for finding duplicates
          const sigKey = signature.signature;
          if (!this.signatureToTypes.has(sigKey)) {
            this.signatureToTypes.set(sigKey, []);
          }
          this.signatureToTypes.get(sigKey)!.push(typeId);

          // Add to directory index
          const directory = path.dirname(filePath);
          if (!this.typesByDirectory[directory]) {
            this.typesByDirectory[directory] = {
              interfaces: [],
              types: [],
              enums: [],
              classes: [],
            };
          }

          if (ts.isInterfaceDeclaration(node)) {
            this.typesByDirectory[directory].interfaces.push(typeName);
          } else if (ts.isTypeAliasDeclaration(node)) {
            this.typesByDirectory[directory].types.push(typeName);
          } else if (ts.isEnumDeclaration(node)) {
            this.typesByDirectory[directory].enums.push(typeName);
          } else if (ts.isClassDeclaration(node)) {
            this.typesByDirectory[directory].classes.push(typeName);
          }
        }
      }

      // Continue traversing the tree
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }
}
