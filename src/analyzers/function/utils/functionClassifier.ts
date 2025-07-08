import ts from "typescript";
import { FunctionClassification } from "../types/function.types";
import {
  hasReactSpecificOperations,
  hasReducerPattern,
  hasStateSpreadPattern,
  usesFrontendAPIs,
  usesReactHooks,
  usesThisKeyword,
} from "../../../utils/common/analysisUtils";
import { ErrorHandler, ErrorCategory, ErrorSeverity } from "./errorHandler";
import { isReactComponent } from "../../../utils/ast/reactSpecific";

/**
 * Enhanced classifies functions based on their characteristics and usage patterns
 */
export class FunctionClassifier {
  private errorHandler: ErrorHandler;
  private typeChecker?: ts.TypeChecker;

  constructor(errorHandler: ErrorHandler, typeChecker?: ts.TypeChecker) {
    this.errorHandler = errorHandler;
    this.typeChecker = typeChecker;
  }

  /**
   * Classifies a function node with enhanced error handling
   * @param node The function node to classify
   * @param filePath Optional file path for error context
   * @param functionName Optional function name for error context
   * @returns Function classification result
   */
  classifyFunction(
    node: ts.Node,
    filePath?: string,
    functionName?: string
  ): FunctionClassification {
    const defaultClassification: FunctionClassification = {
      isReactComponent: false,
      usesReactHooks: false,
      hasReactSpecificOperations: false,
      usesFrontendAPIs: false,
      usesThisKeyword: false,
      isReducerOrStateManagement: false,
    };

    return {
      isReactComponent: this.errorHandler.safeClassification(
        node,
        (n) => this.classifyReactComponent(n),
        false,
        filePath,
        functionName
      ),
      usesReactHooks: this.errorHandler.safeClassification(
        node,
        (n) => usesReactHooks(n),
        false,
        filePath,
        functionName
      ),
      hasReactSpecificOperations: this.errorHandler.safeClassification(
        node,
        (n) => hasReactSpecificOperations(n),
        false,
        filePath,
        functionName
      ),
      usesFrontendAPIs: this.errorHandler.safeClassification(
        node,
        (n) => usesFrontendAPIs(n),
        false,
        filePath,
        functionName
      ),
      usesThisKeyword: this.errorHandler.safeClassification(
        node,
        (n) => usesThisKeyword(n),
        false,
        filePath,
        functionName
      ),
      isReducerOrStateManagement: this.errorHandler.safeClassification(
        node,
        (n) => this.classifyReducerOrStateManagement(n),
        false,
        filePath,
        functionName
      ),
    };
  }

  /**
   * Enhanced React component classification with better type checking
   */
  private classifyReactComponent(node: ts.Node): boolean {
    // Use enhanced type-aware classification if type checker available
    if (this.typeChecker && this.isFunctionLikeNode(node)) {
      return this.classifyReactComponentWithTypes(node);
    }

    // Fallback to existing implementation
    return isReactComponent(node);
  }

  /**
   * Type-aware React component classification
   */
  private classifyReactComponentWithTypes(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    try {
      // Check return type
      const signature = this.typeChecker!.getSignatureFromDeclaration(node);
      if (signature) {
        const returnType =
          this.typeChecker!.getReturnTypeOfSignature(signature);
        const returnTypeString = this.typeChecker!.typeToString(returnType);

        if (this.isReactReturnType(returnTypeString)) {
          return true;
        }
      }

      // Check function name patterns
      if (this.hasReactComponentNamePattern(node)) {
        return true;
      }

      // Check function body for JSX
      if (this.hasJSXInBody(node)) {
        return true;
      }

      return false;
    } catch (error) {
      // Fallback to basic implementation on error
      return isReactComponent(node);
    }
  }

  /**
   * Enhanced reducer/state management classification
   */
  private classifyReducerOrStateManagement(node: ts.Node): boolean {
    if (!this.isFunctionLikeNode(node)) {
      return false;
    }

    try {
      // Check existing patterns
      const hasReducer = hasReducerPattern(node);
      const hasStateSpread = hasStateSpreadPattern(node);

      if (hasReducer || hasStateSpread) {
        return true;
      }

      // Additional state management patterns
      return this.hasAdditionalStatePatterns(node);
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks for additional state management patterns
   */
  private hasAdditionalStatePatterns(node: ts.Node): boolean {
    if (!node) return false;

    let hasStatePatterns = false;

    const visit = (node: ts.Node): void => {
      // Redux-style action creators
      if (this.isActionCreatorPattern(node)) {
        hasStatePatterns = true;
        return;
      }

      // Zustand store patterns
      if (this.isZustandStorePattern(node)) {
        hasStatePatterns = true;
        return;
      }

      // Context provider patterns
      if (this.isContextProviderPattern(node)) {
        hasStatePatterns = true;
        return;
      }

      // State update function patterns
      if (this.isStateUpdatePattern(node)) {
        hasStatePatterns = true;
        return;
      }

      if (!hasStatePatterns) {
        ts.forEachChild(node, visit);
      }
    };

    visit(node);
    return hasStatePatterns;
  }

  /**
   * Checks if node represents an action creator pattern
   */
  private isActionCreatorPattern(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText().toLowerCase();
      return (
        callText.includes("createaction") ||
        callText.includes("actioncreator") ||
        callText.includes("dispatch")
      );
    }

    if (ts.isReturnStatement(node) && node.expression) {
      if (ts.isObjectLiteralExpression(node.expression)) {
        const hasTypeProperty = node.expression.properties.some(
          (prop) =>
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name) &&
            prop.name.text === "type"
        );
        return hasTypeProperty;
      }
    }

    return false;
  }

  /**
   * Checks if node represents a Zustand store pattern
   */
  private isZustandStorePattern(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText().toLowerCase();
      return (
        callText.includes("create") &&
        (callText.includes("store") || callText.includes("zustand"))
      );
    }
    return false;
  }

  /**
   * Checks if node represents a Context provider pattern
   */
  private isContextProviderPattern(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText().toLowerCase();
      return (
        callText.includes("createcontext") ||
        callText.includes("provider") ||
        callText.includes("usecontext")
      );
    }
    return false;
  }

  /**
   * Checks if node represents a state update pattern
   */
  private isStateUpdatePattern(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText().toLowerCase();
      return (
        callText.includes("setstate") ||
        callText.includes("updatestate") ||
        callText.includes("mergestate")
      );
    }

    // Check for useState setter patterns
    if (ts.isIdentifier(node)) {
      const name = node.text.toLowerCase();
      return name.startsWith("set") && name.length > 3;
    }

    return false;
  }

  /**
   * Checks if return type is React-related
   */
  private isReactReturnType(returnTypeString: string): boolean {
    const reactTypes = [
      "jsx.element",
      "reactelement",
      "react.reactelement",
      "react.functioncomponent",
      "react.fc",
      "react.component",
      "jsxelement",
    ];

    const lowerType = returnTypeString.toLowerCase();
    return reactTypes.some((type) => lowerType.includes(type));
  }

  /**
   * Checks if function has React component naming pattern
   */
  private hasReactComponentNamePattern(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    try {
      let functionName: string | undefined;

      if (ts.isFunctionDeclaration(node) && node.name) {
        functionName = node.name.text;
      } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        functionName = node.name.text;
      } else if (ts.isArrowFunction(node)) {
        const parent = node.parent;
        if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
          functionName = parent.name.text;
        }
      }

      if (functionName) {
        // React components typically start with capital letter
        return (
          /^[A-Z][a-zA-Z0-9]*$/.test(functionName) &&
          !functionName.includes("_") &&
          functionName.length > 1
        );
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if function body contains JSX
   */
  private hasJSXInBody(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    if (!node.body) return false;

    let hasJSX = false;

    const visit = (node: ts.Node): void => {
      if (
        ts.isJsxElement(node) ||
        ts.isJsxSelfClosingElement(node) ||
        ts.isJsxFragment(node)
      ) {
        hasJSX = true;
        return;
      }

      if (!hasJSX) {
        ts.forEachChild(node, visit);
      }
    };

    visit(node.body);
    return hasJSX;
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
   * Determines if a function should be included in the analysis
   * based on its classification (enhanced version)
   */
  shouldIncludeBasedOnClassification(
    classification: FunctionClassification,
    filePath?: string,
    functionName?: string
  ): boolean {
    return this.errorHandler.safeExecute(
      () =>
        !(
          classification.isReactComponent ||
          classification.usesReactHooks ||
          classification.hasReactSpecificOperations ||
          classification.usesFrontendAPIs ||
          classification.usesThisKeyword ||
          classification.isReducerOrStateManagement
        ),
      false, // Conservative fallback - exclude on error
      "classification-based inclusion check",
      ErrorCategory.CLASSIFICATION,
      ErrorSeverity.MEDIUM,
      filePath,
      functionName
    );
  }

  /**
   * Gets classification confidence score
   */
  getClassificationConfidence(
    node: ts.Node,
    classification: FunctionClassification
  ): number {
    let confidence = 1.0;

    // Reduce confidence if type checker unavailable for React components
    if (classification.isReactComponent && !this.typeChecker) {
      confidence *= 0.8;
    }

    // Reduce confidence if function has ambiguous patterns
    if (this.hasAmbiguousPatterns(node)) {
      confidence *= 0.7;
    }

    // Increase confidence if multiple patterns agree
    const positiveClassifications =
      Object.values(classification).filter(Boolean).length;
    if (positiveClassifications > 2) {
      confidence *= 1.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Checks for patterns that might be ambiguous
   */
  private hasAmbiguousPatterns(node: ts.Node): boolean {
    // Functions that use 'this' but might not be class methods
    // Functions with generic names that could be anything
    // Functions with mixed patterns (e.g., React hooks in non-React functions)

    if (!node) return false;

    // Simple heuristic - functions with very generic names
    if (this.isFunctionLikeNode(node)) {
      const name = this.getFunctionName(node);
      const genericNames = [
        "handler",
        "callback",
        "fn",
        "func",
        "method",
        "action",
      ];
      return genericNames.some((generic) =>
        name.toLowerCase().includes(generic)
      );
    }

    return false;
  }

  /**
   * Helper to get function name from any function-like node
   */
  private getFunctionName(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    if (ts.isArrowFunction(node) && node.parent) {
      if (
        ts.isVariableDeclaration(node.parent) &&
        ts.isIdentifier(node.parent.name)
      ) {
        return node.parent.name.text;
      }
    }
    return "anonymous";
  }
}

/**
 * Backward compatibility function - creates a classifier and uses it
 */
export function classifyFunction(node: ts.Node): FunctionClassification {
  const errorHandler = new ErrorHandler({ logErrors: false });
  const classifier = new FunctionClassifier(errorHandler);
  return classifier.classifyFunction(node);
}

/**
 * Backward compatibility function for inclusion checking
 */
export function shouldIncludeBasedOnClassification(
  classification: FunctionClassification
): boolean {
  const errorHandler = new ErrorHandler({ logErrors: false });
  const classifier = new FunctionClassifier(errorHandler);
  return classifier.shouldIncludeBasedOnClassification(classification);
}
