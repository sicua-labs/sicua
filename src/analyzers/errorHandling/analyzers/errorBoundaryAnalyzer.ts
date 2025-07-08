import ts from "typescript";
import {
  ErrorBoundary,
  ErrorBoundaryLibraryInfo,
} from "../../../types/errorHandling.types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { ErrorPatternUtils } from "../../../utils/error_specific/errorPatternUtils";
import { NodeTypeGuards } from "../../../utils/ast/nodeTypeGuards";
import { traverseAST } from "../../../utils/ast/traversal";

/**
 * Enhanced analyzer for error boundaries in React components
 */
export class ErrorBoundaryAnalyzer {
  private sourceFile: ts.SourceFile;
  private imports: Map<string, string> = new Map();

  constructor(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    this.sourceFile = sourceFile;
    this.analyzeImports();
  }

  /**
   * Analyze import statements to understand available error boundary libraries
   */
  private analyzeImports(): void {
    traverseAST(this.sourceFile, (node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const moduleName = node.moduleSpecifier.text;

        if (
          node.importClause?.namedBindings &&
          ts.isNamedImports(node.importClause.namedBindings)
        ) {
          node.importClause.namedBindings.elements.forEach((element) => {
            this.imports.set(element.name.text, moduleName);
          });
        }

        if (node.importClause?.name) {
          this.imports.set(node.importClause.name.text, moduleName);
        }
      }
    });
  }

  /**
   * Analyze a JSX element to detect if it's an error boundary
   */
  public analyzeErrorBoundary(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): ErrorBoundary | undefined {
    const location = ASTUtils.getNodeLocation(node, this.sourceFile);
    if (!location) return undefined;

    const library = this.detectErrorBoundaryLibrary(node);
    if (!library) return undefined;

    return {
      library,
      props: this.extractEnhancedProps(node),
      location,
    };
  }

  /**
   * Analyze a class declaration to detect if it's an error boundary
   */
  public analyzeClassErrorBoundary(
    node: ts.ClassDeclaration
  ): ErrorBoundary | undefined {
    const location = ASTUtils.getNodeLocation(node, this.sourceFile);
    if (!location) return undefined;

    const hasErrorBoundaryMethods = this.hasErrorBoundaryLifecycleMethods(node);
    if (!hasErrorBoundaryMethods) return undefined;

    const library: ErrorBoundaryLibraryInfo = {
      name: "custom-class",
      source: "local",
      type: "custom",
      features: this.extractClassErrorBoundaryFeatures(node),
      importPath: "",
    };

    return {
      library,
      props: this.extractClassProps(node),
      location,
    };
  }

  /**
   * Check if a class has error boundary lifecycle methods
   */
  private hasErrorBoundaryLifecycleMethods(node: ts.ClassDeclaration): boolean {
    let hasComponentDidCatch = false;
    let hasGetDerivedStateFromError = false;

    node.members.forEach((member) => {
      if (
        ts.isMethodDeclaration(member) &&
        member.name &&
        ts.isIdentifier(member.name)
      ) {
        const methodName = member.name.text;
        if (methodName === "componentDidCatch") {
          hasComponentDidCatch = true;
        } else if (methodName === "getDerivedStateFromError") {
          hasGetDerivedStateFromError = true;
        }
      }
    });

    return hasComponentDidCatch || hasGetDerivedStateFromError;
  }

  /**
   * Extract features from class-based error boundary
   */
  private extractClassErrorBoundaryFeatures(
    node: ts.ClassDeclaration
  ): Set<string> {
    const features = new Set<string>();

    node.members.forEach((member) => {
      if (
        ts.isMethodDeclaration(member) &&
        member.name &&
        ts.isIdentifier(member.name)
      ) {
        const methodName = member.name.text;

        if (methodName === "componentDidCatch") {
          features.add("error-logging");

          // Check if it logs to external service
          traverseAST(member, (node) => {
            if (ts.isCallExpression(node)) {
              const callText = node.expression.getText();
              if (
                callText.includes("Sentry") ||
                callText.includes("captureException")
              ) {
                features.add("external-logging");
              }
              if (callText.includes("console.error")) {
                features.add("console-logging");
              }
            }
          });
        }

        if (methodName === "getDerivedStateFromError") {
          features.add("state-update");
        }

        if (methodName === "render") {
          // Check for fallback UI patterns
          traverseAST(member, (node) => {
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
              features.add("fallback-ui");
            }
            if (ts.isConditionalExpression(node)) {
              features.add("conditional-render");
            }
          });
        }
      }
    });

    return features;
  }

  /**
   * Extract props from class-based error boundary
   */
  private extractClassProps(
    node: ts.ClassDeclaration
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    // Look for defaultProps static property
    node.members.forEach((member) => {
      if (
        ts.isPropertyDeclaration(member) &&
        member.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.StaticKeyword
        ) &&
        member.name &&
        ts.isIdentifier(member.name) &&
        member.name.text === "defaultProps"
      ) {
        if (
          member.initializer &&
          ts.isObjectLiteralExpression(member.initializer)
        ) {
          member.initializer.properties.forEach((prop) => {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              props[prop.name.text] = prop.initializer.getText();
            }
          });
        }
      }
    });

    return props;
  }

  /**
   * Enhanced library detection with more patterns
   */
  private detectErrorBoundaryLibrary(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): ErrorBoundaryLibraryInfo | undefined {
    const tagName = ts.isJsxElement(node)
      ? node.openingElement.tagName.getText()
      : node.tagName.getText();

    // Enhanced library patterns
    const libraries: Record<string, ErrorBoundaryLibraryInfo> = {
      "react-error-boundary": {
        name: "react-error-boundary",
        source: "react-error-boundary",
        type: "community",
        features: new Set(["fallback", "reset", "error-handler", "isolation"]),
        importPath: "react-error-boundary",
      },
      "@sentry/react": {
        name: "Sentry",
        source: "@sentry/react",
        type: "community",
        features: new Set([
          "monitoring",
          "capture",
          "breadcrumbs",
          "user-feedback",
        ]),
        importPath: "@sentry/react",
      },
      "react-query": {
        name: "React Query",
        source: "@tanstack/react-query",
        type: "community",
        features: new Set(["query-reset", "error-boundary", "retry"]),
        importPath: "@tanstack/react-query",
      },
      remix: {
        name: "Remix",
        source: "@remix-run/react",
        type: "official",
        features: new Set(["route-error", "nested-boundaries", "error-data"]),
        importPath: "@remix-run/react",
      },
      next: {
        name: "Next.js",
        source: "next",
        type: "official",
        features: new Set(["app-router", "pages-router", "api-errors"]),
        importPath: "next",
      },
    };

    // Check component names and their import sources
    const componentSource = this.imports.get(tagName);

    // Direct library matches
    for (const [key, lib] of Object.entries(libraries)) {
      if (componentSource === lib.importPath) {
        return { ...lib, features: new Set(lib.features) };
      }
    }

    // Pattern-based detection
    if (this.isReactErrorBoundaryComponent(node, tagName)) {
      return {
        ...libraries["react-error-boundary"],
        features: new Set(libraries["react-error-boundary"].features),
      };
    }

    if (this.isSentryErrorBoundary(node, tagName)) {
      return {
        ...libraries["@sentry/react"],
        features: new Set(libraries["@sentry/react"].features),
      };
    }

    if (this.isQueryErrorResetBoundary(tagName)) {
      return {
        ...libraries["react-query"],
        features: new Set(libraries["react-query"].features),
      };
    }

    // Custom error boundary detection
    if (
      ErrorPatternUtils.isLikelyErrorBoundary(node) ||
      this.hasErrorBoundaryProps(node)
    ) {
      return {
        name: "custom",
        source: "local",
        type: "custom",
        features: this.extractCustomFeatures(node),
        importPath: "",
      };
    }

    return undefined;
  }

  /**
   * Detect react-error-boundary patterns
   */
  private isReactErrorBoundaryComponent(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    tagName: string
  ): boolean {
    if (tagName === "ErrorBoundary" && this.imports.has("ErrorBoundary")) {
      return this.imports.get("ErrorBoundary") === "react-error-boundary";
    }

    // Check for react-error-boundary specific props
    const props = this.extractEnhancedProps(node);
    return !!(
      props.fallback ||
      props.FallbackComponent ||
      props.onError ||
      props.onReset
    );
  }

  /**
   * Detect Sentry error boundary patterns
   */
  private isSentryErrorBoundary(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    tagName: string
  ): boolean {
    const sentryComponents = ["ErrorBoundary", "withErrorBoundary"];
    if (sentryComponents.includes(tagName) && this.imports.has(tagName)) {
      return this.imports.get(tagName)?.includes("@sentry/react") || false;
    }

    // Check for Sentry-specific props
    const props = this.extractEnhancedProps(node);
    return !!(props.showDialog || props.beforeCapture || props.fallback);
  }

  /**
   * Detect React Query error reset boundary
   */
  private isQueryErrorResetBoundary(tagName: string): boolean | undefined {
    return (
      tagName === "QueryErrorResetBoundary" &&
      this.imports.get(tagName)?.includes("@tanstack/react-query")
    );
  }

  /**
   * Check if JSX element has error boundary-like props
   */
  private hasErrorBoundaryProps(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    const errorBoundaryPropPatterns = [
      /^(on|handle)Error$/i,
      /^fallback/i,
      /^errorComponent$/i,
      /^renderError$/i,
      /^onReset$/i,
      /^resetOnPropsChange$/i,
      /^isolateErrorBoundary$/i,
    ];

    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes.properties
      : node.attributes.properties;

    return attributes.some((attr) => {
      if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
        const propName = attr.name.text;
        return errorBoundaryPropPatterns.some((pattern) =>
          pattern.test(propName)
        );
      }
      return false;
    });
  }

  /**
   * Extract features from custom error boundary
   */
  private extractCustomFeatures(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): Set<string> {
    const features = new Set<string>();
    const props = this.extractEnhancedProps(node);

    if (props.fallback || props.FallbackComponent) features.add("fallback");
    if (props.onError || props.handleError) features.add("error-handler");
    if (props.onReset || props.resetOnPropsChange) features.add("reset");
    if (props.isolateErrorBoundary) features.add("isolation");

    return features;
  }

  /**
   * Enhanced prop extraction with better type handling
   */
  private extractEnhancedProps(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes.properties
      : node.attributes.properties;

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
            // Try to evaluate simple expressions
            if (ts.isLiteralExpression(attr.initializer.expression)) {
              props[name] = attr.initializer.expression.getText();
            } else if (ts.isIdentifier(attr.initializer.expression)) {
              props[name] = attr.initializer.expression.text;
            } else {
              props[name] = attr.initializer.expression.getText();
            }
          }
        } else {
          // Boolean prop
          props[name] = true;
        }
      } else if (ts.isJsxSpreadAttribute(attr)) {
        // Handle spread attributes
        props["...spread"] = attr.expression.getText();
      }
    });

    return props;
  }

  /**
   * Find all error boundaries in a component node
   */
  public findErrorBoundaries(componentNode: ts.Node): ErrorBoundary[] {
    const errorBoundaries: ErrorBoundary[] = [];

    traverseAST(componentNode, (node) => {
      // JSX error boundaries
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const errorBoundary = this.analyzeErrorBoundary(node);
        if (errorBoundary) {
          errorBoundaries.push(errorBoundary);
        }
      }

      // Class-based error boundaries
      if (
        ts.isClassDeclaration(node) &&
        NodeTypeGuards.isComponentDeclaration(node)
      ) {
        const classErrorBoundary = this.analyzeClassErrorBoundary(node);
        if (classErrorBoundary) {
          errorBoundaries.push(classErrorBoundary);
        }
      }
    });

    return errorBoundaries;
  }
}
