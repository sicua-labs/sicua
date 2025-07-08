import ts from "typescript";
import path from "path-browserify";
import { ComponentTypeInfo } from "../types/internalTypes";
import { TypeFilterUtils } from "../utils/typeFilterUtils";
import { ImprovementSuggestionGenerator } from "../generators/improvementSuggestionGenerator";
import { isReactComponent } from "../../../utils/ast/reactSpecific";
import { ScanResult } from "../../../types";

/**
 * Analyzer for component types (props, return types)
 */
export class ComponentTypeAnalyzer {
  private scanResult: ScanResult;
  private componentsWithPropTypes: string[] = [];
  private componentsWithoutPropTypes: string[] = [];
  private regularFunctionsWithoutReturnType: number = 0;
  private suggestedImprovements: string[] = [];

  // Cache for processed components
  private processedComponentCache: Set<string> = new Set();

  constructor(scanResult: ScanResult) {
    this.scanResult = scanResult;
  }

  /**
   * Analyze component types across all source files
   */
  public async analyzeComponentTypes(): Promise<{
    componentsWithPropTypes: string[];
    componentsWithoutPropTypes: string[];
    regularFunctionsWithoutReturnType: number;
    suggestedImprovements: string[];
  }> {
    // Batch process files for component analysis to improve performance
    const BATCH_SIZE = 50;
    const sourceFiles = Array.from(this.scanResult.sourceFiles.entries());
    const batches = TypeFilterUtils.chunkArray(sourceFiles, BATCH_SIZE);

    for (const batch of batches) {
      for (const [filePath, sourceFile] of batch) {
        const fileName = path.basename(filePath);
        const metadata = this.scanResult.fileMetadata.get(filePath);

        // Skip files that are unlikely to have components or TypeScript elements
        if (
          !metadata?.hasJSX &&
          !metadata?.hasReactImport &&
          !filePath.endsWith(".ts") &&
          !filePath.endsWith(".tsx")
        ) {
          continue;
        }

        // Analyze component types (props, return types)
        this.analyzeComponentTypesInFile(sourceFile, filePath, fileName);
      }
    }

    return {
      componentsWithPropTypes: this.componentsWithPropTypes,
      componentsWithoutPropTypes: this.componentsWithoutPropTypes,
      regularFunctionsWithoutReturnType: this.regularFunctionsWithoutReturnType,
      suggestedImprovements: this.suggestedImprovements,
    };
  }

  /**
   * Analyze component types in a single file
   */
  private analyzeComponentTypesInFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    fileName: string
  ): void {
    // If we've already processed this component, skip it
    if (this.processedComponentCache.has(filePath)) {
      return;
    }

    const componentName = path.basename(filePath, path.extname(filePath));
    const metadata = this.scanResult.fileMetadata.get(filePath);

    // Skip files that are unlikely to have components
    if (!metadata?.hasJSX && !metadata?.hasReactImport) {
      return;
    }

    let hasPropsType = false;
    const functionsWithoutReturnType: string[] = [];

    // Visit each node to find component definitions and check props
    const visit = (node: ts.Node) => {
      // Check for function declarations or arrow functions that could be components
      if (
        (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) &&
        isReactComponent(node)
      ) {
        const functionName =
          ts.isFunctionDeclaration(node) && node.name
            ? node.name.text
            : componentName;

        if (TypeFilterUtils.hasPropsTypeDefinition(node)) {
          hasPropsType = true;

          if (!this.componentsWithPropTypes.includes(functionName)) {
            this.componentsWithPropTypes.push(functionName);
          }
        } else if (node.parameters.length > 0) {
          if (!this.componentsWithoutPropTypes.includes(functionName)) {
            this.componentsWithoutPropTypes.push(functionName);
            this.suggestedImprovements.push(
              `React component "${functionName}" in ${fileName} is missing prop type definitions.`
            );
          }
        }
      }
      // Check for variable declarations that might be function components
      else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const variableName = node.name.text;

        if (node.initializer) {
          if (
            (ts.isArrowFunction(node.initializer) ||
              ts.isFunctionExpression(node.initializer)) &&
            isReactComponent(node.initializer)
          ) {
            if (TypeFilterUtils.hasPropsTypeDefinition(node.initializer)) {
              hasPropsType = true;
              if (!this.componentsWithPropTypes.includes(variableName)) {
                this.componentsWithPropTypes.push(variableName);
              }
            } else if (node.initializer.parameters.length > 0) {
              if (!this.componentsWithoutPropTypes.includes(variableName)) {
                this.componentsWithoutPropTypes.push(variableName);
                this.suggestedImprovements.push(
                  `React component "${variableName}" in ${fileName} is missing prop type definitions.`
                );
              }
            }
          }
        }
      }
      // Check for regular functions without return types
      else if (ts.isFunctionDeclaration(node) && !isReactComponent(node)) {
        if (!node.type) {
          this.regularFunctionsWithoutReturnType++;
          if (node.name) {
            functionsWithoutReturnType.push(node.name.text);
          }
        }
      }

      // Only traverse certain parts of the AST to save time
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isVariableStatement(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isModuleDeclaration(node) ||
        ts.isSourceFile(node)
      ) {
        ts.forEachChild(node, visit);
      }
    };

    visit(sourceFile);

    // Add component to appropriate list if not already added
    if (
      !hasPropsType &&
      !this.componentsWithoutPropTypes.includes(componentName) &&
      (metadata?.hasJSX || metadata?.hasReactImport)
    ) {
      this.componentsWithoutPropTypes.push(componentName);
    }

    // Add function return type suggestions
    if (functionsWithoutReturnType.length > 0) {
      const suggestions =
        ImprovementSuggestionGenerator.generateFunctionReturnTypeSuggestions(
          functionsWithoutReturnType,
          fileName
        );
      this.suggestedImprovements.push(...suggestions);
    }

    // Mark this component as processed
    this.processedComponentCache.add(filePath);
  }

  /**
   * Get information about all components and their prop types
   */
  public getAllComponentTypeInfo(): ComponentTypeInfo[] {
    const componentInfo: ComponentTypeInfo[] = [];

    // Create records for components with prop types
    for (const name of this.componentsWithPropTypes) {
      // Find the component's file
      const file = this.findComponentFile(name);
      if (!file) continue;

      componentInfo.push({
        name,
        hasPropsType: true,
        filePath: file,
      });
    }

    // Create records for components without prop types
    for (const name of this.componentsWithoutPropTypes) {
      // Skip if already added
      if (componentInfo.some((c) => c.name === name)) continue;

      const file = this.findComponentFile(name);
      if (!file) continue;

      componentInfo.push({
        name,
        hasPropsType: false,
        filePath: file,
      });
    }

    return componentInfo;
  }

  /**
   * Find a component file by component name
   */
  private findComponentFile(componentName: string): string | undefined {
    for (const [filePath, _] of this.scanResult.sourceFiles) {
      const baseName = path.basename(filePath, path.extname(filePath));
      if (baseName === componentName) {
        return filePath;
      }
    }
    return undefined;
  }
}
