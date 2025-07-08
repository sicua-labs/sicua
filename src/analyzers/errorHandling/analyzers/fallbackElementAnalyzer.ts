import ts from "typescript";
import { FallbackElement } from "../../../types/errorHandling.types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { ErrorPatternUtils } from "../../../utils/error_specific/errorPatternUtils";
import { traverseAST } from "../../../utils/ast/traversal";
import { NodeTypeGuards } from "../../../utils/ast/nodeTypeGuards";
import { ErrorStatesMap } from "../types/internalTypes";

/**
 * Enhanced analyzer for fallback UI elements in error handling
 */
export class FallbackElementAnalyzer {
  private sourceFile: ts.SourceFile;
  private imports: Set<string> = new Set();

  constructor(sourceFile: ts.SourceFile) {
    this.sourceFile = sourceFile;
    this.analyzeImports();
  }

  /**
   * Analyze import statements to understand available UI libraries
   */
  private analyzeImports(): void {
    traverseAST(this.sourceFile, (node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        this.imports.add(node.moduleSpecifier.text);
      }
    });
  }

  /**
   * Find all fallback elements in a component node
   */
  public analyzeFallbackElements(
    node: ts.Node,
    errorStates: ErrorStatesMap
  ): FallbackElement[] {
    const fallbacks: FallbackElement[] = [];

    traverseAST(node, (currentNode) => {
      // Standard error fallback elements
      if (
        ts.isJsxElement(currentNode) ||
        ts.isJsxSelfClosingElement(currentNode)
      ) {
        if (this.isErrorFallbackElement(currentNode)) {
          const fallback = this.analyzeFallbackElement(
            currentNode,
            errorStates,
            "error"
          );
          if (fallback) fallbacks.push(fallback);
        }

        // Loading state fallbacks
        if (this.isLoadingFallbackElement(currentNode)) {
          const fallback = this.analyzeFallbackElement(
            currentNode,
            errorStates,
            "loading"
          );
          if (fallback) fallbacks.push(fallback);
        }

        // Empty state fallbacks
        if (this.isEmptyStateFallbackElement(currentNode)) {
          const fallback = this.analyzeFallbackElement(
            currentNode,
            errorStates,
            "empty"
          );
          if (fallback) fallbacks.push(fallback);
        }

        // Retry mechanism elements
        if (this.isRetryElement(currentNode)) {
          const fallback = this.analyzeFallbackElement(
            currentNode,
            errorStates,
            "retry"
          );
          if (fallback) fallbacks.push(fallback);
        }

        // Suspense fallback elements
        if (this.isSuspenseFallback(currentNode)) {
          const fallback = this.analyzeFallbackElement(
            currentNode,
            errorStates,
            "suspense"
          );
          if (fallback) fallbacks.push(fallback);
        }

        // Skeleton/placeholder elements
        if (this.isSkeletonElement(currentNode)) {
          const fallback = this.analyzeFallbackElement(
            currentNode,
            errorStates,
            "skeleton"
          );
          if (fallback) fallbacks.push(fallback);
        }
      }

      // Conditional rendering patterns
      if (ts.isConditionalExpression(currentNode)) {
        const fallback = this.analyzeConditionalFallback(
          currentNode,
          errorStates
        );
        if (fallback) fallbacks.push(fallback);
      }

      // Logical AND/OR patterns in JSX
      if (
        ts.isBinaryExpression(currentNode) &&
        this.isJSXLogicalExpression(currentNode)
      ) {
        const fallback = this.analyzeLogicalFallback(currentNode, errorStates);
        if (fallback) fallbacks.push(fallback);
      }
    });

    return fallbacks;
  }

  /**
   * Analyze a specific fallback element
   */
  private analyzeFallbackElement(
    element: ts.JsxElement | ts.JsxSelfClosingElement,
    errorStates: ErrorStatesMap,
    fallbackType: string
  ): FallbackElement | undefined {
    const location = ASTUtils.getNodeLocation(element, this.sourceFile);
    if (!location) return undefined;

    const condition = this.findAdvancedRenderCondition(element);
    const relatedStates = this.findRelatedErrorStates(condition, errorStates);

    return {
      element,
      condition,
      relatedErrorStates: relatedStates,
      location,
    };
  }

  /**
   * Check if element is an error fallback element
   */
  private isErrorFallbackElement(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // Use existing pattern detection
    if (ErrorPatternUtils.isFallbackElement(element)) {
      return true;
    }

    const tagName = this.getTagName(element).toLowerCase();
    const props = this.extractElementProps(element);

    // Enhanced error fallback patterns
    const errorFallbackPatterns = [
      // Component names
      /^(error|fallback|errorstate|errorpage|errorview|errormessage|errorcomponent)$/i,

      // UI library patterns
      /^(alert|notification|banner|toast|snackbar)$/i,

      // Status patterns
      /^(status|state|condition)$/i,
    ];

    if (errorFallbackPatterns.some((pattern) => pattern.test(tagName))) {
      return true;
    }

    // Check props for error-related patterns
    const errorPropPatterns = [
      "error",
      "isError",
      "hasError",
      "errorMessage",
      "errorText",
      'variant="error"',
      'type="error"',
      'severity="error"',
      'status="error"',
      'state="error"',
    ];

    return errorPropPatterns.some((pattern) =>
      Object.keys(props).some(
        (prop) =>
          prop.includes("error") || props[prop]?.toString().includes("error")
      )
    );
  }

  /**
   * Check if element is a loading fallback element
   */
  private isLoadingFallbackElement(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    const tagName = this.getTagName(element).toLowerCase();
    const props = this.extractElementProps(element);

    const loadingPatterns = [
      /^(loading|loader|spinner|skeleton|placeholder|shimmer)$/i,
      /^(circular|linear)progress$/i,
      /^(pulse|wave|bars)$/i,
    ];

    if (loadingPatterns.some((pattern) => pattern.test(tagName))) {
      return true;
    }

    // Check for loading-related props
    const loadingPropPatterns = [
      "loading",
      "isLoading",
      "pending",
      "fetching",
      "isFetching",
      'variant="loading"',
      'type="loading"',
      'state="loading"',
    ];

    return loadingPropPatterns.some((pattern) =>
      Object.keys(props).some(
        (prop) =>
          prop.includes("loading") ||
          props[prop]?.toString().includes("loading")
      )
    );
  }

  /**
   * Check if element is an empty state fallback
   */
  private isEmptyStateFallbackElement(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    const tagName = this.getTagName(element).toLowerCase();
    const props = this.extractElementProps(element);

    const emptyStatePatterns = [
      /^(empty|emptystate|nodata|notfound|placeholder)$/i,
      /^(zero|null|void)state$/i,
    ];

    if (emptyStatePatterns.some((pattern) => pattern.test(tagName))) {
      return true;
    }

    // Check for empty state props
    const emptyPropPatterns = [
      "empty",
      "isEmpty",
      "noData",
      "notFound",
      "zero",
      'variant="empty"',
      'type="empty"',
      'state="empty"',
    ];

    return emptyPropPatterns.some((pattern) =>
      Object.keys(props).some(
        (prop) =>
          prop.includes("empty") || props[prop]?.toString().includes("empty")
      )
    );
  }

  /**
   * Check if element is a retry mechanism
   */
  private isRetryElement(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    const tagName = this.getTagName(element).toLowerCase();
    const props = this.extractElementProps(element);

    const retryPatterns = [
      /^(retry|refresh|reload|tryagain)$/i,
      /^(button|link)$/i, // Generic elements that might be retry buttons
    ];

    // Check for retry-related props or text content
    const retryPropPatterns = [
      "retry",
      "refresh",
      "reload",
      "tryAgain",
      "onRetry",
      "onRefresh",
      "onClick",
      "onPress", // Generic handlers that might be retry
    ];

    const hasRetryProps = retryPropPatterns.some((pattern) =>
      Object.keys(props).some(
        (prop) => prop.includes("retry") || prop.includes("refresh")
      )
    );

    // Check text content for retry patterns
    const hasRetryText = this.hasRetryTextContent(element);

    return (
      retryPatterns.some((pattern) => pattern.test(tagName)) &&
      (hasRetryProps || hasRetryText)
    );
  }

  /**
   * Check if element is a Suspense fallback
   */
  private isSuspenseFallback(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // Check if this element is used as Suspense fallback prop
    const parent = element.parent;
    if (ts.isJsxExpression(parent) && parent.parent) {
      const grandParent = parent.parent;
      if (
        ts.isJsxAttribute(grandParent) &&
        ts.isIdentifier(grandParent.name) &&
        grandParent.name.text === "fallback"
      ) {
        // Check if the JSX attribute belongs to a Suspense component
        const suspenseElement = grandParent.parent?.parent;
        if (
          suspenseElement &&
          (ts.isJsxElement(suspenseElement) ||
            ts.isJsxSelfClosingElement(suspenseElement))
        ) {
          const suspenseTagName = this.getTagName(suspenseElement);
          return suspenseTagName === "Suspense";
        }
      }
    }

    return false;
  }

  /**
   * Check if element is a skeleton/placeholder
   */
  private isSkeletonElement(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    const tagName = this.getTagName(element).toLowerCase();

    const skeletonPatterns = [
      /^(skeleton|placeholder|shimmer|ghost)$/i,
      /^(card|text|image|avatar|button)skeleton$/i,
      /^(loading|placeholder)(card|text|image|avatar|button)$/i,
    ];

    return skeletonPatterns.some((pattern) => pattern.test(tagName));
  }

  /**
   * Analyze conditional expression for fallback patterns
   */
  private analyzeConditionalFallback(
    node: ts.ConditionalExpression,
    errorStates: ErrorStatesMap
  ): FallbackElement | undefined {
    const condition = node.condition;
    const relatedStates = this.findRelatedErrorStates(condition, errorStates);

    // Check if either branch contains fallback UI
    const whenTrue = node.whenTrue;
    const whenFalse = node.whenFalse;

    let fallbackExpression: ts.Expression | undefined;

    if (this.isFallbackExpression(whenTrue)) {
      fallbackExpression = whenTrue;
    } else if (this.isFallbackExpression(whenFalse)) {
      fallbackExpression = whenFalse;
    }

    if (fallbackExpression && relatedStates.length > 0) {
      const location = ASTUtils.getNodeLocation(node, this.sourceFile);
      if (location) {
        return {
          element: node as any, // Type assertion for compatibility
          condition,
          relatedErrorStates: relatedStates,
          location,
        };
      }
    }

    return undefined;
  }

  /**
   * Analyze logical expression for fallback patterns
   */
  private analyzeLogicalFallback(
    node: ts.BinaryExpression,
    errorStates: ErrorStatesMap
  ): FallbackElement | undefined {
    const relatedStates = this.findRelatedErrorStates(node.left, errorStates);

    if (relatedStates.length > 0 && this.isFallbackExpression(node.right)) {
      const location = ASTUtils.getNodeLocation(node, this.sourceFile);
      if (location) {
        return {
          element: node as any, // Type assertion for compatibility
          condition: node.left,
          relatedErrorStates: relatedStates,
          location,
        };
      }
    }

    return undefined;
  }

  /**
   * Enhanced condition finding with more patterns
   */
  private findAdvancedRenderCondition(
    node: ts.Node
  ): ts.Expression | undefined {
    let current: ts.Node | undefined = node;

    while (current) {
      // Conditional expressions
      if (ts.isConditionalExpression(current)) {
        return current.condition;
      }

      // If statements
      if (ts.isIfStatement(current)) {
        return current.expression;
      }

      // Logical expressions
      if (
        ts.isBinaryExpression(current) &&
        (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          current.operatorToken.kind === ts.SyntaxKind.BarBarToken)
      ) {
        return current;
      }

      // JSX expressions
      if (ts.isJsxExpression(current) && current.expression) {
        if (
          ts.isBinaryExpression(current.expression) ||
          ts.isConditionalExpression(current.expression)
        ) {
          return current.expression;
        }
      }

      // Try-catch blocks
      if (ts.isTryStatement(current)) {
        return current as any; // Implicit error condition
      }

      current = current.parent;
    }

    return undefined;
  }

  /**
   * Find error states referenced in a condition with enhanced patterns
   */
  private findRelatedErrorStates(
    condition: ts.Expression | undefined,
    errorStates: ErrorStatesMap
  ): string[] {
    if (!condition) return [];

    const relatedStates: string[] = [];

    traverseAST(condition, (node) => {
      if (ts.isIdentifier(node)) {
        const name = node.getText();
        if (errorStates.has(name)) {
          relatedStates.push(name);
        }
      }

      // Property access patterns (e.g., state.error, query.error)
      if (ts.isPropertyAccessExpression(node)) {
        const fullPath = node.getText();
        const propertyName = node.name.text;

        if (
          ErrorPatternUtils.isErrorRelatedName(propertyName) ||
          ErrorPatternUtils.isErrorRelatedName(fullPath)
        ) {
          relatedStates.push(fullPath);
        }
      }
    });

    return [...new Set(relatedStates)];
  }

  /**
   * Check if expression represents fallback UI
   */
  private isFallbackExpression(expr: ts.Expression): boolean {
    if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) {
      return (
        this.isErrorFallbackElement(expr) ||
        this.isLoadingFallbackElement(expr) ||
        this.isEmptyStateFallbackElement(expr) ||
        this.isSkeletonElement(expr)
      );
    }

    if (ts.isStringLiteral(expr)) {
      const text = expr.text.toLowerCase();
      return (
        text.includes("error") ||
        text.includes("loading") ||
        text.includes("failed") ||
        text.includes("try again")
      );
    }

    return false;
  }

  /**
   * Check if binary expression is used in JSX context
   */
  private isJSXLogicalExpression(node: ts.BinaryExpression): boolean {
    let current: ts.Node | undefined = node;
    while (current) {
      if (
        ts.isJsxExpression(current) ||
        ts.isJsxElement(current) ||
        ts.isJsxSelfClosingElement(current)
      ) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Get tag name from JSX element
   */
  private getTagName(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): string {
    if (ts.isJsxElement(element)) {
      return element.openingElement.tagName.getText();
    } else {
      return element.tagName.getText();
    }
  }

  /**
   * Extract props from JSX element
   */
  private extractElementProps(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    const attributes = ts.isJsxElement(element)
      ? element.openingElement.attributes.properties
      : element.attributes.properties;

    attributes.forEach((attr) => {
      if (ts.isJsxAttribute(attr)) {
        const name = ts.isIdentifier(attr.name)
          ? attr.name.text
          : attr.name.getText();

        if (attr.initializer) {
          if (ts.isStringLiteral(attr.initializer)) {
            props[name] = attr.initializer.text;
          } else if (
            ts.isJsxExpression(attr.initializer) &&
            attr.initializer.expression
          ) {
            props[name] = attr.initializer.expression.getText();
          }
        } else {
          props[name] = true;
        }
      }
    });

    return props;
  }

  /**
   * Check if element has retry-related text content
   */
  private hasRetryTextContent(
    element: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    let hasRetryText = false;

    traverseAST(element, (node) => {
      if (ts.isJsxText(node)) {
        const text = node.text.toLowerCase();
        if (
          text.includes("retry") ||
          text.includes("try again") ||
          text.includes("refresh") ||
          text.includes("reload")
        ) {
          hasRetryText = true;
        }
      }

      if (ts.isStringLiteral(node)) {
        const text = node.text.toLowerCase();
        if (
          text.includes("retry") ||
          text.includes("try again") ||
          text.includes("refresh") ||
          text.includes("reload")
        ) {
          hasRetryText = true;
        }
      }
    });

    return hasRetryText;
  }
}
