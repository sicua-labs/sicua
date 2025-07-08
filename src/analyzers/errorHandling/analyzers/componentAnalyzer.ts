import ts from "typescript";
import { ErrorHandlingAnalysisResult } from "../../../types/errorHandling.types";
import { ComponentRelation } from "../../../types";
import { traverseAST } from "../../../utils/ast/traversal";
import { NodeTypeGuards } from "../../../utils/ast/nodeTypeGuards";
import { isReactComponent } from "../../../utils/ast/reactSpecific";
import { ErrorBoundaryAnalyzer } from "./errorBoundaryAnalyzer";
import { ErrorStateAnalyzer } from "./errorStateAnalyzer";
import { TryBlockAnalyzer } from "./tryBlockAnalyzer";
import { FallbackElementAnalyzer } from "./fallbackElementAnalyzer";
import { ErrorPatternAnalyzer } from "./errorPatternAnalyzer";
import { FunctionAnalyzer } from "./functionAnalyzer";

/**
 * Enhanced analyzer for error handling in React components
 */
export class ComponentAnalyzer {
  private component: ComponentRelation;
  private sourceFile: ts.SourceFile;
  private typeChecker: ts.TypeChecker;
  private errorBoundaryAnalyzer: ErrorBoundaryAnalyzer;
  private errorStateAnalyzer: ErrorStateAnalyzer;
  private tryBlockAnalyzer: TryBlockAnalyzer;
  private fallbackElementAnalyzer: FallbackElementAnalyzer;
  private errorPatternAnalyzer: ErrorPatternAnalyzer;
  private functionAnalyzer: FunctionAnalyzer;

  constructor(
    component: ComponentRelation,
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker
  ) {
    this.component = component;
    this.sourceFile = sourceFile;
    this.typeChecker = typeChecker;
    this.errorBoundaryAnalyzer = new ErrorBoundaryAnalyzer(
      sourceFile,
      typeChecker
    );
    this.errorStateAnalyzer = new ErrorStateAnalyzer(sourceFile);
    this.tryBlockAnalyzer = new TryBlockAnalyzer(sourceFile);
    this.fallbackElementAnalyzer = new FallbackElementAnalyzer(sourceFile);
    this.errorPatternAnalyzer = new ErrorPatternAnalyzer(sourceFile);
    this.functionAnalyzer = new FunctionAnalyzer(sourceFile, typeChecker);
  }

  /**
   * Enhanced component analysis with comprehensive error handling detection
   */
  public analyzeComponent(): ErrorHandlingAnalysisResult {
    const componentNodes = this.findAllComponentNodes();

    if (componentNodes.length === 0) {
      return {
        errorBoundaries: [],
        tryCatchBlocks: [],
        errorStates: [],
        fallbackElements: [],
        errorPatterns: [],
        functionErrorHandling: [],
      };
    }

    // Combine analysis from all component nodes
    const combinedResults = this.combineComponentAnalysis(componentNodes);

    return combinedResults;
  }

  /**
   * Find all component-related nodes in the source file
   */
  private findAllComponentNodes(): ts.Node[] {
    const componentNodes: ts.Node[] = [];

    traverseAST(this.sourceFile, (node) => {
      // Function component declarations
      if (ts.isFunctionDeclaration(node)) {
        if (
          this.isTargetComponent(node, node.name?.text) &&
          isReactComponent(node, this.typeChecker)
        ) {
          componentNodes.push(node);
        }
      }

      // Variable declarations (arrow functions, function expressions)
      if (ts.isVariableDeclaration(node)) {
        if (
          ts.isIdentifier(node.name) &&
          this.isTargetComponent(node, node.name.text)
        ) {
          if (node.initializer) {
            if (
              ts.isArrowFunction(node.initializer) ||
              ts.isFunctionExpression(node.initializer)
            ) {
              if (isReactComponent(node.initializer, this.typeChecker)) {
                componentNodes.push(node.initializer);
              }
            }
          }
        }
      }

      // Class component declarations
      if (ts.isClassDeclaration(node)) {
        if (
          this.isTargetComponent(node, node.name?.text) &&
          NodeTypeGuards.isComponentDeclaration(node)
        ) {
          componentNodes.push(node);
        }
      }

      // Export assignments (default exports)
      if (ts.isExportAssignment(node)) {
        if (ts.isIdentifier(node.expression)) {
          if (this.isTargetComponent(node, node.expression.text)) {
            // Find the actual component definition
            const componentDef = this.findComponentDefinition(
              node.expression.text
            );
            if (componentDef) {
              componentNodes.push(componentDef);
            }
          }
        } else if (
          ts.isArrowFunction(node.expression) ||
          ts.isFunctionExpression(node.expression)
        ) {
          if (isReactComponent(node.expression, this.typeChecker)) {
            componentNodes.push(node.expression);
          }
        }
      }

      // Named exports
      if (
        ts.isExportDeclaration(node) &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause)
      ) {
        node.exportClause.elements.forEach((element) => {
          const exportName = element.name.text;
          if (this.isTargetComponent(node, exportName)) {
            const componentDef = this.findComponentDefinition(exportName);
            if (componentDef) {
              componentNodes.push(componentDef);
            }
          }
        });
      }

      // Higher-order components (HOCs)
      if (ts.isCallExpression(node)) {
        const hocResult = this.analyzeHOCPattern(node);
        if (hocResult && this.isTargetComponent(node, this.component.name)) {
          componentNodes.push(hocResult);
        }
      }

      // Forward ref components
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "forwardRef"
      ) {
        if (node.arguments.length > 0) {
          const forwardedComponent = node.arguments[0];
          if (
            ts.isArrowFunction(forwardedComponent) ||
            ts.isFunctionExpression(forwardedComponent)
          ) {
            if (isReactComponent(forwardedComponent, this.typeChecker)) {
              componentNodes.push(forwardedComponent);
            }
          }
        }
      }

      // Memo components
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "memo"
      ) {
        if (node.arguments.length > 0) {
          const memoizedComponent = node.arguments[0];
          if (
            ts.isArrowFunction(memoizedComponent) ||
            ts.isFunctionExpression(memoizedComponent) ||
            ts.isIdentifier(memoizedComponent)
          ) {
            let actualComponent: ts.Node = memoizedComponent;
            if (ts.isIdentifier(memoizedComponent)) {
              const componentDef = this.findComponentDefinition(
                memoizedComponent.text
              );
              if (
                componentDef &&
                (ts.isArrowFunction(componentDef) ||
                  ts.isFunctionExpression(componentDef) ||
                  ts.isFunctionDeclaration(componentDef))
              ) {
                actualComponent = componentDef;
              }
            }

            if (isReactComponent(actualComponent, this.typeChecker)) {
              componentNodes.push(actualComponent);
            }
          }
        }
      }
    });

    return componentNodes;
  }

  /**
   * Check if a node represents the target component
   */
  private isTargetComponent(
    node: ts.Node,
    nodeName: string | undefined
  ): boolean {
    if (!nodeName) return false;

    // Direct name match
    if (nodeName === this.component.name) {
      return true;
    }

    // Check for component name variations
    const variations = [
      this.component.name,
      this.component.name.replace(/Component$/, ""),
      this.component.name + "Component",
    ];

    return variations.includes(nodeName);
  }

  /**
   * Find component definition by name
   */
  private findComponentDefinition(name: string): ts.Node | undefined {
    let componentDef: ts.Node | undefined;

    traverseAST(this.sourceFile, (node) => {
      if (componentDef) return; // Already found

      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
        componentDef = node;
      }

      // Variable declarations
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === name
      ) {
        componentDef = node.initializer || node;
      }

      // Class declarations
      if (ts.isClassDeclaration(node) && node.name?.text === name) {
        componentDef = node;
      }
    });

    return componentDef;
  }

  /**
   * Analyze Higher-Order Component patterns
   */
  private analyzeHOCPattern(node: ts.CallExpression): ts.Node | undefined {
    const callText = node.expression.getText();

    // Common HOC patterns
    const hocPatterns = [
      /^with[A-Z]/, // withAuth, withRouter, etc.
      /^connect$/, // Redux connect
      /^styled/, // styled-components
      /^observer$/, // MobX observer
    ];

    if (hocPatterns.some((pattern) => pattern.test(callText))) {
      // Find the wrapped component
      const lastArg = node.arguments[node.arguments.length - 1];
      if (lastArg) {
        if (
          ts.isArrowFunction(lastArg) ||
          ts.isFunctionExpression(lastArg) ||
          ts.isIdentifier(lastArg)
        ) {
          return lastArg;
        }
      }
    }

    return undefined;
  }

  /**
   * Combine analysis results from multiple component nodes
   */
  private combineComponentAnalysis(
    componentNodes: ts.Node[]
  ): ErrorHandlingAnalysisResult {
    const combinedResult: ErrorHandlingAnalysisResult = {
      errorBoundaries: [],
      tryCatchBlocks: [],
      errorStates: [],
      fallbackElements: [],
      errorPatterns: [],
      functionErrorHandling: [],
    };

    // Collect error states first as they're needed by other analyzers
    const allErrorStates = new Map<string, any>();

    componentNodes.forEach((componentNode) => {
      const errorStatesMap =
        this.errorStateAnalyzer.findErrorStates(componentNode);
      errorStatesMap.forEach((value, key) => {
        allErrorStates.set(key, value);
      });
    });

    // Analyze each component node
    componentNodes.forEach((componentNode) => {
      // Error boundaries
      const errorBoundaries =
        this.errorBoundaryAnalyzer.findErrorBoundaries(componentNode);
      combinedResult.errorBoundaries.push(...errorBoundaries);

      // Try-catch blocks
      const tryCatchBlocks =
        this.tryBlockAnalyzer.findTryCatchBlocks(componentNode);
      combinedResult.tryCatchBlocks.push(...tryCatchBlocks);

      // Fallback elements
      const fallbackElements =
        this.fallbackElementAnalyzer.analyzeFallbackElements(
          componentNode,
          allErrorStates
        );
      combinedResult.fallbackElements.push(...fallbackElements);

      // Error patterns
      const errorPatterns = this.errorPatternAnalyzer.analyzeErrorPatterns(
        componentNode,
        allErrorStates
      );
      combinedResult.errorPatterns.push(...errorPatterns);

      // Function error handling
      const functionErrorHandling =
        this.functionAnalyzer.analyzeComponentFunctions(componentNode);
      combinedResult.functionErrorHandling.push(...functionErrorHandling);
    });

    // Process error states into final format
    const processedErrorStates =
      this.errorStateAnalyzer.processErrorStates(allErrorStates);
    combinedResult.errorStates = processedErrorStates;

    // Remove duplicates and filter results
    return this.deduplicateAndFilterResults(combinedResult);
  }

  /**
   * Remove duplicates and filter results
   */
  private deduplicateAndFilterResults(
    result: ErrorHandlingAnalysisResult
  ): ErrorHandlingAnalysisResult {
    // Deduplicate error boundaries by location
    const uniqueErrorBoundaries = result.errorBoundaries.filter(
      (boundary, index, arr) =>
        arr.findIndex(
          (b) =>
            b.location.line === boundary.location.line &&
            b.location.column === boundary.location.column
        ) === index
    );

    // Deduplicate try-catch blocks by location
    const uniqueTryCatchBlocks = result.tryCatchBlocks.filter(
      (block, index, arr) =>
        arr.findIndex(
          (b) =>
            b.location.line === block.location.line &&
            b.location.column === block.location.column
        ) === index
    );

    // Deduplicate error states by name
    const uniqueErrorStates = result.errorStates.filter(
      (state, index, arr) =>
        arr.findIndex((s) => s.name === state.name) === index
    );

    // Deduplicate fallback elements by location
    const uniqueFallbackElements = result.fallbackElements.filter(
      (element, index, arr) =>
        arr.findIndex(
          (e) =>
            e.location.line === element.location.line &&
            e.location.column === element.location.column
        ) === index
    );

    // Deduplicate error patterns by location and type
    const uniqueErrorPatterns = result.errorPatterns.filter(
      (pattern, index, arr) =>
        arr.findIndex(
          (p) =>
            p.location.line === pattern.location.line &&
            p.location.column === pattern.location.column &&
            p.type === pattern.type
        ) === index
    );

    // Deduplicate function error handling by function name and location
    const uniqueFunctionErrorHandling = result.functionErrorHandling.filter(
      (func, index, arr) =>
        arr.findIndex(
          (f) =>
            f.functionName === func.functionName &&
            f.location.line === func.location.line &&
            f.location.column === func.location.column
        ) === index
    );

    return {
      errorBoundaries: uniqueErrorBoundaries,
      tryCatchBlocks: uniqueTryCatchBlocks,
      errorStates: uniqueErrorStates,
      fallbackElements: uniqueFallbackElements,
      errorPatterns: uniqueErrorPatterns,
      functionErrorHandling: uniqueFunctionErrorHandling,
    };
  }

  /**
   * Enhanced filtering for significant error handling with better heuristics
   */
  public getSignificantAnalysis(
    result: ErrorHandlingAnalysisResult
  ): ErrorHandlingAnalysisResult | null {
    if (!this.isEnhancedSignificantErrorHandling(result)) {
      return null;
    }

    // Enhanced function filtering with better criteria
    const significantFunctions = result.functionErrorHandling.filter((func) => {
      return this.isEnhancedSignificantFunction(func);
    });

    // Filter error patterns to remove noise
    const significantErrorPatterns = result.errorPatterns.filter((pattern) => {
      return this.isSignificantErrorPattern(pattern);
    });

    // Filter fallback elements to focus on meaningful ones
    const significantFallbackElements = result.fallbackElements.filter(
      (element) => {
        return this.isSignificantFallbackElement(element);
      }
    );

    return {
      ...result,
      functionErrorHandling: significantFunctions,
      errorPatterns: significantErrorPatterns,
      fallbackElements: significantFallbackElements,
    };
  }

  /**
   * Enhanced significance check for error handling results
   */
  private isEnhancedSignificantErrorHandling(
    result: ErrorHandlingAnalysisResult
  ): boolean {
    const hasErrorBoundaries = result.errorBoundaries.length > 0;
    const hasTryCatchBlocks = result.tryCatchBlocks.length > 0;
    const hasErrorStates = result.errorStates.length > 0;
    const hasSignificantFallbacks = result.fallbackElements.some((e) =>
      this.isSignificantFallbackElement(e)
    );
    const hasSignificantPatterns = result.errorPatterns.some((p) =>
      this.isSignificantErrorPattern(p)
    );
    const hasSignificantFunctions = result.functionErrorHandling.some((f) =>
      this.isEnhancedSignificantFunction(f)
    );

    // Require at least 2 types of error handling or high-quality single type
    const significantTypes = [
      hasErrorBoundaries,
      hasTryCatchBlocks,
      hasErrorStates,
      hasSignificantFallbacks,
      hasSignificantPatterns,
      hasSignificantFunctions,
    ].filter(Boolean).length;

    return (
      significantTypes >= 2 ||
      hasErrorBoundaries ||
      hasTryCatchBlocks ||
      (hasErrorStates && (hasSignificantFallbacks || hasSignificantPatterns))
    );
  }

  /**
   * Enhanced function significance check
   */
  private isEnhancedSignificantFunction(func: any): boolean {
    const hasErrorHandling = func.hasErrorHandling;
    const shouldHaveErrorHandling = func.riskAnalysis.shouldHaveErrorHandling;
    const riskScore = func.riskAnalysis.riskScore;

    // Always include if it has actual error handling
    if (hasErrorHandling) {
      return true;
    }

    // Include high-risk functions without error handling
    if (shouldHaveErrorHandling && riskScore >= 4) {
      return true;
    }

    // Include functions with multiple risk indicators
    const riskIndicatorCount = Object.values(
      func.riskAnalysis.riskIndicators
    ).filter(Boolean).length;

    return riskIndicatorCount >= 3;
  }

  /**
   * Check if error pattern is significant
   */
  private isSignificantErrorPattern(pattern: any): boolean {
    // Always include error logging and state updates
    if (pattern.type === "error-logging" || pattern.type === "state-update") {
      return true;
    }

    // Include conditional rendering with related states
    if (
      pattern.type === "conditional-render" &&
      pattern.relatedStates.length > 0
    ) {
      return true;
    }

    // Include error creation and throwing
    if (pattern.type === "throw" || pattern.type === "error-creation") {
      return true;
    }

    // Include async handling patterns
    if (
      pattern.type === "async-handling" ||
      pattern.type === "promise-rejection"
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if fallback element is significant
   */
  private isSignificantFallbackElement(element: any): boolean {
    // Always include if related to error states
    if (element.relatedErrorStates.length > 0) {
      return true;
    }

    // Include if has meaningful condition
    if (element.condition) {
      const conditionText = element.condition.getText();
      if (/error|loading|empty|fail/i.test(conditionText)) {
        return true;
      }
    }

    return false;
  }
}
