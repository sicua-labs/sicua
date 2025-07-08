import ts from "typescript";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import {
  FunctionExtractionContext,
  ExtractedFunction,
} from "../types/function.types";
import { FunctionClassifier } from "./functionClassifier";
import {
  extractCalledFunctions,
  extractDependencies,
} from "../../../utils/common/analysisUtils";
import { FunctionFilter } from "../filters/functionFilter";
import { ErrorHandler } from "./errorHandler";
import { TypeResolver } from "./typeResolver";
import { ParameterParser } from "./parameterParser";
import { FunctionBodyParser } from "./functionBodyParser";
import { AsyncDetector } from "./asyncDetector";
import { isReactComponent } from "../../../utils/ast/reactSpecific";

/**
 * Enhanced extractor that analyzes functions from a TypeScript source file
 */
export class FunctionExtractor {
  private functionFilter: FunctionFilter;
  private errorHandler: ErrorHandler;
  private typeResolver: TypeResolver;
  private parameterParser: ParameterParser;
  private bodyParser: FunctionBodyParser;
  private asyncDetector: AsyncDetector;
  private classifier: FunctionClassifier;

  constructor(typeChecker?: ts.TypeChecker) {
    this.functionFilter = new FunctionFilter();
    this.errorHandler = new ErrorHandler({
      logErrors: true,
      throwOnCritical: false,
      maxErrorsPerFile: 50,
      includeStackTrace: false,
      enableRecovery: true,
    });

    // Initialize utility classes
    this.typeResolver = new TypeResolver(typeChecker!);
    this.parameterParser = new ParameterParser();
    this.bodyParser = new FunctionBodyParser();
    this.asyncDetector = new AsyncDetector(typeChecker);
    this.classifier = new FunctionClassifier(this.errorHandler, typeChecker);
  }

  /**
   * Extracts relevant functions from a specific component within a source file
   * @param context The extraction context with source file and component name
   * @returns Array of extracted function data
   */
  extractFunctions(context: FunctionExtractionContext): {
    componentName: string;
    functionName: string;
    params: string[];
    returnType: string;
    body: string;
    dependencies: string[];
    calledFunctions: string[];
    isAsync: boolean;
  }[] {
    const functions: {
      componentName: string;
      functionName: string;
      params: string[];
      returnType: string;
      body: string;
      dependencies: string[];
      calledFunctions: string[];
      isAsync: boolean;
    }[] = [];

    const filePath = context.sourceFile.fileName;

    // Find the specific component node in the source file
    const componentNode = this.findComponentNode(
      context.sourceFile,
      context.componentName
    );

    if (!componentNode) {
      return functions;
    }

    // Safe AST traversal with error handling, limited to the component node
    const traversalResult = this.errorHandler.safeASTTraversal(
      componentNode,
      (node) =>
        this.traverseAndExtract(node, context, functions, componentNode),
      functions,
      filePath
    );

    // Log extraction summary
    if (this.errorHandler.getErrorsForFile(filePath).length > 0) {
      console.warn(
        `Function extraction completed with ${
          this.errorHandler.getErrorsForFile(filePath).length
        } errors for component ${context.componentName} in ${filePath}`
      );
    }

    return functions;
  }

  /**
   * Find the specific component node in the source file
   */
  private findComponentNode(
    sourceFile: ts.SourceFile,
    componentName: string
  ): ts.Node | null {
    let componentNode: ts.Node | null = null;

    const visit = (node: ts.Node): void => {
      if (componentNode) return; // Already found

      // Check for function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const functionName = node.name.text;
        if (functionName === componentName && isReactComponent(node)) {
          componentNode = node;
          return;
        }
      }

      // Check for variable declarations (const ComponentName = ...)
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const varName = node.name.text;
        if (varName === componentName && node.initializer) {
          if (
            (ts.isArrowFunction(node.initializer) ||
              ts.isFunctionExpression(node.initializer)) &&
            isReactComponent(node.initializer)
          ) {
            componentNode = node.initializer;
            return;
          }
        }
      }

      // Check for exported function declarations
      if (
        ts.isExportAssignment(node) &&
        ts.isFunctionDeclaration(node.expression)
      ) {
        const func = node.expression;
        if (
          func.name &&
          func.name.text === componentName &&
          isReactComponent(func)
        ) {
          componentNode = func;
          return;
        }
      }

      // Check for export declarations
      if (
        ts.isExportDeclaration(node) &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause)
      ) {
        node.exportClause.elements.forEach((element) => {
          if (ts.isExportSpecifier(element) && ts.isIdentifier(element.name)) {
            if (element.name.text === componentName) {
              // Need to find the actual declaration
              const declaration = this.findDeclarationInSourceFile(
                sourceFile,
                componentName
              );
              if (declaration) {
                componentNode = declaration;
              }
            }
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return componentNode;
  }

  /**
   * Find a declaration by name in the source file
   */
  private findDeclarationInSourceFile(
    sourceFile: ts.SourceFile,
    name: string
  ): ts.Node | null {
    let declaration: ts.Node | null = null;

    const visit = (node: ts.Node): void => {
      if (declaration) return;

      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.name.text === name
      ) {
        if (isReactComponent(node)) {
          declaration = node;
        }
      } else if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === name
      ) {
        if (
          node.initializer &&
          (ts.isArrowFunction(node.initializer) ||
            ts.isFunctionExpression(node.initializer)) &&
          isReactComponent(node.initializer)
        ) {
          declaration = node.initializer;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return declaration;
  }

  /**
   * Traverses AST and extracts functions, limited to the component scope
   */
  private traverseAndExtract(
    node: ts.Node,
    context: FunctionExtractionContext,
    functions: {
      componentName: string;
      functionName: string;
      params: string[];
      returnType: string;
      body: string;
      dependencies: string[];
      calledFunctions: string[];
      isAsync: boolean;
    }[],
    componentNode: ts.Node
  ): {
    componentName: string;
    functionName: string;
    params: string[];
    returnType: string;
    body: string;
    dependencies: string[];
    calledFunctions: string[];
    isAsync: boolean;
  }[] {
    const visit = (node: ts.Node): void => {
      if (this.isFunctionLikeNode(node)) {
        // Only extract if this function is within the component scope
        if (this.isFunctionWithinComponent(node, componentNode)) {
          const extractedFunction = this.extractSingleFunction(node, context);
          if (extractedFunction) {
            functions.push(extractedFunction);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(node);
    return functions;
  }

  /**
   * Check if a function node is within the component scope (not a separate component)
   */
  private isFunctionWithinComponent(
    functionNode: ts.Node,
    componentNode: ts.Node
  ): boolean {
    // If it's the component function itself, include it
    if (functionNode === componentNode) {
      return true;
    }

    // Check if it's a nested function within the component
    let parent = functionNode.parent;
    while (parent) {
      if (parent === componentNode) {
        return true;
      }

      // If we encounter another React component, this function belongs to that component
      if (
        this.isFunctionLikeNode(parent) &&
        parent !== componentNode &&
        isReactComponent(parent)
      ) {
        return false;
      }

      parent = parent.parent;
    }

    return false;
  }

  /**
   * Extracts a single function with comprehensive error handling
   */
  private extractSingleFunction(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    context: FunctionExtractionContext
  ): {
    componentName: string;
    functionName: string;
    params: string[];
    returnType: string;
    body: string;
    dependencies: string[];
    calledFunctions: string[];
    isAsync: boolean;
  } | null {
    const filePath = context.sourceFile.fileName;

    try {
      // Extract function name with error handling
      const functionName = this.errorHandler.safeFunctionName(
        node,
        (n) => ASTUtils.getFunctionName(n),
        filePath
      );

      // Check if function should be included
      const shouldInclude = this.errorHandler.safeExecute(
        () => this.functionFilter.shouldIncludeFunction(node, functionName),
        false,
        "function filter check",
        undefined,
        undefined,
        filePath,
        functionName
      );

      if (!shouldInclude) {
        return null;
      }

      // Perform classification
      const classification = this.classifier.classifyFunction(
        node,
        filePath,
        functionName
      );

      // Check if should include based on classification
      const shouldIncludeByClassification =
        this.classifier.shouldIncludeBasedOnClassification(
          classification,
          filePath,
          functionName
        );

      if (!shouldIncludeByClassification) {
        return null;
      }

      // Extract all function properties with error handling
      const params = this.errorHandler.safeParameters(
        node,
        (n) => this.parameterParser.parseParameters(n),
        filePath,
        functionName
      );

      const returnType = this.errorHandler.safeReturnType(
        node,
        (n) => this.typeResolver.resolveFunctionReturnType(n),
        filePath,
        functionName
      );

      const body = this.errorHandler.safeFunctionBody(
        node,
        (n) => this.bodyParser.extractBody(n),
        filePath,
        functionName
      );

      const dependencies = this.errorHandler.safeDependencies(
        node,
        (n) => extractDependencies(n),
        filePath,
        functionName
      );

      const calledFunctions = this.errorHandler.safeCalledFunctions(
        node,
        (n) => extractCalledFunctions(n),
        filePath,
        functionName
      );

      const isAsync = this.errorHandler.safeAsyncDetection(
        node,
        (n) => this.asyncDetector.isAsync(n),
        filePath,
        functionName
      );

      return {
        componentName: context.componentName,
        functionName,
        params,
        returnType,
        body,
        dependencies,
        calledFunctions,
        isAsync,
      };
    } catch (error) {
      // Handle unexpected errors during extraction
      this.errorHandler.handleFileError(
        filePath,
        `function extraction for ${ASTUtils.safeGetNodeText(node).substring(
          0,
          50
        )}`,
        error
      );
      return null;
    }
  }

  /**
   * Type guard for function-like nodes
   */
  private isFunctionLikeNode(
    node: ts.Node
  ): node is ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isArrowFunction(node)
    );
  }

  /**
   * Extracts detailed function information (for advanced analysis)
   */
  extractFunctionsDetailed(
    context: FunctionExtractionContext
  ): ExtractedFunction[] {
    const functions: ExtractedFunction[] = [];
    const filePath = context.sourceFile.fileName;

    // Find the specific component node
    const componentNode = this.findComponentNode(
      context.sourceFile,
      context.componentName
    );

    if (!componentNode) {
      return functions;
    }

    const visit = (node: ts.Node): void => {
      if (
        this.isFunctionLikeNode(node) &&
        this.isFunctionWithinComponent(node, componentNode)
      ) {
        const extractedFunction = this.extractDetailedFunction(node, context);
        if (extractedFunction) {
          functions.push(extractedFunction);
        }
      }

      ts.forEachChild(node, visit);
    };

    this.errorHandler.safeASTTraversal(
      componentNode,
      (node) => {
        visit(node);
        return functions;
      },
      functions,
      filePath
    );

    return functions;
  }

  /**
   * Extracts detailed function information
   */
  private extractDetailedFunction(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    context: FunctionExtractionContext
  ): ExtractedFunction | null {
    const filePath = context.sourceFile.fileName;

    try {
      const functionName = this.errorHandler.safeFunctionName(
        node,
        (n) => ASTUtils.getFunctionName(n),
        filePath
      );

      // Check inclusion filters
      const shouldInclude = this.errorHandler.safeExecute(
        () => this.functionFilter.shouldIncludeFunction(node, functionName),
        false,
        "detailed function filter check",
        undefined,
        undefined,
        filePath,
        functionName
      );

      if (!shouldInclude) {
        return null;
      }

      const classification = this.classifier.classifyFunction(
        node,
        filePath,
        functionName
      );

      if (
        !this.classifier.shouldIncludeBasedOnClassification(
          classification,
          filePath,
          functionName
        )
      ) {
        return null;
      }

      return {
        name: functionName,
        node,
        params: this.errorHandler.safeParameters(
          node,
          (n) => this.parameterParser.parseParameters(n),
          filePath,
          functionName
        ),
        returnType: this.errorHandler.safeReturnType(
          node,
          (n) => this.typeResolver.resolveFunctionReturnType(n),
          filePath,
          functionName
        ),
        body: this.errorHandler.safeFunctionBody(
          node,
          (n) => this.bodyParser.extractBody(n),
          filePath,
          functionName
        ),
        isAsync: this.errorHandler.safeAsyncDetection(
          node,
          (n) => this.asyncDetector.isAsync(n),
          filePath,
          functionName
        ),
      };
    } catch (error) {
      this.errorHandler.handleFileError(
        filePath,
        `detailed function extraction`,
        error
      );
      return null;
    }
  }

  /**
   * Gets extraction statistics
   */
  getExtractionStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    canContinue: boolean;
    summary: string;
  } {
    const errorSummary = this.errorHandler.getErrorSummary();

    return {
      totalErrors: errorSummary.total,
      errorsByCategory: errorSummary.byCategory,
      canContinue: this.errorHandler.canContinueAnalysis(),
      summary: `Extracted functions with ${errorSummary.total} errors across ${errorSummary.filesWithErrors} files`,
    };
  }

  /**
   * Clears all accumulated errors
   */
  clearErrors(): void {
    this.errorHandler.clearErrors();
  }

  /**
   * Gets all errors for debugging
   */
  getErrors(): any[] {
    return this.errorHandler.getErrors();
  }

  /**
   * Validates extraction results
   */
  validateExtractionResults(
    results: {
      componentName: string;
      functionName: string;
      params: string[];
      returnType: string;
      body: string;
      dependencies: string[];
      calledFunctions: string[];
      isAsync: boolean;
    }[]
  ): {
    isValid: boolean;
    issues: string[];
    validCount: number;
    invalidCount: number;
  } {
    const issues: string[] = [];
    let validCount = 0;
    let invalidCount = 0;

    results.forEach((result, index) => {
      let isValidResult = true;

      // Validate required fields
      if (!result.componentName || result.componentName.trim() === "") {
        issues.push(`Result ${index}: Missing or empty componentName`);
        isValidResult = false;
      }

      if (!result.functionName || result.functionName === "Unknown Function") {
        issues.push(`Result ${index}: Invalid functionName`);
        isValidResult = false;
      }

      if (!Array.isArray(result.params)) {
        issues.push(`Result ${index}: params should be an array`);
        isValidResult = false;
      }

      if (!result.returnType || result.returnType.trim() === "") {
        issues.push(`Result ${index}: Missing returnType`);
        isValidResult = false;
      }

      if (typeof result.body !== "string") {
        issues.push(`Result ${index}: body should be a string`);
        isValidResult = false;
      }

      if (!Array.isArray(result.dependencies)) {
        issues.push(`Result ${index}: dependencies should be an array`);
        isValidResult = false;
      }

      if (!Array.isArray(result.calledFunctions)) {
        issues.push(`Result ${index}: calledFunctions should be an array`);
        isValidResult = false;
      }

      if (typeof result.isAsync !== "boolean") {
        issues.push(`Result ${index}: isAsync should be a boolean`);
        isValidResult = false;
      }

      if (isValidResult) {
        validCount++;
      } else {
        invalidCount++;
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
      validCount,
      invalidCount,
    };
  }
}
