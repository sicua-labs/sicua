import ts from "typescript";
import { ASTUtils } from "../ast/ASTUtils";

export class ErrorPatternUtils {
  static isErrorRelatedName(name: string): boolean {
    const patterns = ["error", "err", "exception", "fail", "invalid", "fault"];
    return patterns.some((p) => name.toLowerCase().includes(p));
  }

  static isErrorLoggingCall(text: string): boolean {
    const loggingPatterns = [
      "console.error",
      "logger.error",
      "logError",
      "reportError",
      "captureException",
      "trackError",
      "monitor",
    ];
    return loggingPatterns.some((pattern) => text.includes(pattern));
  }

  static isLikelyErrorBoundary(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    const tagName = ts.isJsxElement(node)
      ? node.openingElement.tagName.getText()
      : node.tagName.getText();

    // Check component name patterns
    const errorBoundaryPatterns = [
      "ErrorBoundary",
      "ErrorHandler",
      "ErrorWrapper",
      "ErrorContainer",
      "ErrorFallback",
      "ErrorBorder",
    ];

    if (errorBoundaryPatterns.some((pattern) => tagName.includes(pattern))) {
      return true;
    }

    // Check for error boundary related props
    const props = this.extractJsxProps(node);
    const errorBoundaryProps = [
      "fallback",
      "FallbackComponent",
      "onError",
      "handleError",
      "errorComponent",
      "renderError",
      "catchError",
    ];

    if (errorBoundaryProps.some((prop) => prop in props)) {
      return true;
    }

    return false;
  }

  static extractJsxProps(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): Record<string, any> {
    try {
      const props: Record<string, any> = {};
      const attributes = ts.isJsxElement(node)
        ? node.openingElement.attributes
        : node.attributes;

      attributes.properties.forEach((prop) => {
        try {
          if (ts.isJsxAttribute(prop) && prop.name) {
            const name = ASTUtils.safeGetNodeText(prop.name);
            const initializer = prop.initializer;
            if (initializer) {
              props[name] = ts.isJsxExpression(initializer)
                ? ASTUtils.safeGetNodeText(initializer.expression)
                : ASTUtils.safeGetNodeText(initializer);
            } else {
              props[name] = true;
            }
          }
        } catch (error) {
          console.warn("Error processing JSX prop:", error);
        }
      });

      return props;
    } catch {
      return {};
    }
  }

  static isErrorStateSetter(name: string): boolean {
    return name.startsWith("set") && this.isErrorRelatedName(name.slice(3));
  }

  static getStateNameFromSetter(setter: string): string {
    return setter.slice(3).replace(/^[A-Z]/, (c) => c.toLowerCase());
  }

  static isFallbackElement(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    const tagName = ts.isJsxElement(node)
      ? node.openingElement.tagName.getText()
      : node.tagName.getText();

    // Check element name patterns
    const fallbackPatterns = [
      "Error",
      "Fallback",
      "ErrorMessage",
      "ErrorState",
      "ErrorDisplay",
    ];

    if (fallbackPatterns.some((pattern) => tagName.includes(pattern))) {
      return true;
    }

    // Check props that suggest error UI
    const props = this.extractJsxProps(node);
    const errorRelatedProps = [
      "error",
      "isError",
      "hasError",
      "onRetry",
      "errorMessage",
    ];

    if (errorRelatedProps.some((prop) => prop in props)) {
      return true;
    }

    return false;
  }
}
