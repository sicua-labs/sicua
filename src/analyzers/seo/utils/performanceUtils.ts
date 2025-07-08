import ts from "typescript";
import path from "path-browserify";
import { ComponentRelation } from "../../../types";
import { JsxUtils } from "./jsxUtils";

/**
 * Utility functions for performance-related SEO analysis
 */
export class PerformanceUtils {
  /**
   * Detects dynamic imports in a component
   */
  public static findDynamicImports(sourceFile: ts.SourceFile): Array<{
    importPath: string;
    isNextDynamic: boolean;
    hasSSR: boolean;
    hasLoading: boolean;
  }> {
    const dynamicImports: Array<{
      importPath: string;
      isNextDynamic: boolean;
      hasSSR: boolean;
      hasLoading: boolean;
    }> = [];

    const visitNode = (node: ts.Node) => {
      // Check for React.lazy()
      if (ts.isCallExpression(node)) {
        const expression = node.expression;

        // React.lazy(() => import('...'))
        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.expression) &&
          expression.expression.text === "React" &&
          expression.name.text === "lazy"
        ) {
          const lazyArg = node.arguments[0];
          if (ts.isArrowFunction(lazyArg)) {
            const importCall = this.findImportInExpression(lazyArg.body);
            if (importCall) {
              dynamicImports.push({
                importPath: importCall,
                isNextDynamic: false,
                hasSSR: true, // React.lazy defaults to SSR
                hasLoading: false,
              });
            }
          }
        }

        // dynamic() from next/dynamic
        if (ts.isIdentifier(expression) && expression.text === "dynamic") {
          const dynamicArg = node.arguments[0];
          const optionsArg = node.arguments[1];

          let importPath = "";
          let hasSSR = true; // default
          let hasLoading = false;

          // Extract import path
          if (ts.isArrowFunction(dynamicArg)) {
            const importCall = this.findImportInExpression(dynamicArg.body);
            if (importCall) {
              importPath = importCall;
            }
          }

          // Check options
          if (optionsArg && ts.isObjectLiteralExpression(optionsArg)) {
            optionsArg.properties.forEach((prop) => {
              if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                if (prop.name.text === "ssr") {
                  hasSSR = prop.initializer.kind === ts.SyntaxKind.TrueKeyword;
                }
                if (prop.name.text === "loading") {
                  hasLoading = true;
                }
              }
            });
          }

          if (importPath) {
            dynamicImports.push({
              importPath,
              isNextDynamic: true,
              hasSSR,
              hasLoading,
            });
          }
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return dynamicImports;
  }

  /**
   * Helper to find import() calls in expressions
   */
  private static findImportInExpression(
    expression: ts.Expression | ts.ConciseBody
  ): string | null {
    if (
      ts.isCallExpression(expression) &&
      expression.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const importArg = expression.arguments[0];
      if (ts.isStringLiteral(importArg)) {
        return importArg.text;
      }
    }

    if (ts.isBlock(expression)) {
      for (const statement of expression.statements) {
        if (ts.isReturnStatement(statement) && statement.expression) {
          return this.findImportInExpression(statement.expression);
        }
      }
    }

    return null;
  }

  /**
   * Analyzes static imports that might impact performance
   */
  public static analyzeStaticImports(sourceFile: ts.SourceFile): Array<{
    importPath: string;
    isLibrary: boolean;
    isLargeLibrary: boolean;
    isImageImport: boolean;
    importType: "default" | "named" | "namespace" | "side-effect";
  }> {
    const imports: Array<{
      importPath: string;
      isLibrary: boolean;
      isLargeLibrary: boolean;
      isImageImport: boolean;
      importType: "default" | "named" | "namespace" | "side-effect";
    }> = [];

    // Known large libraries that should be dynamically imported
    const largeLibraries = [
      "lodash",
      "moment",
      "chart.js",
      "three",
      "@tensorflow/tfjs",
      "monaco-editor",
      "codemirror",
      "highlight.js",
      "prismjs",
      "pdf-lib",
      "fabric",
    ];

    const visitNode = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const importPath = node.moduleSpecifier.text;
        const isLibrary =
          !importPath.startsWith(".") && !importPath.startsWith("/");
        const isLargeLibrary = largeLibraries.some(
          (lib) => importPath === lib || importPath.startsWith(`${lib}/`)
        );
        const isImageImport = /\.(jpg|jpeg|png|gif|svg|webp)$/.test(importPath);

        let importType: "default" | "named" | "namespace" | "side-effect" =
          "side-effect";

        if (node.importClause) {
          if (node.importClause.name) {
            importType = "default";
          } else if (node.importClause.namedBindings) {
            if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              importType = "namespace";
            } else {
              importType = "named";
            }
          }
        }

        imports.push({
          importPath,
          isLibrary,
          isLargeLibrary,
          isImageImport,
          importType,
        });
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return imports;
  }

  /**
   * Detects potential Core Web Vitals issues in JSX
   */
  public static detectCWVIssues(sourceFile: ts.SourceFile): Array<{
    type: "LCP" | "CLS" | "FID" | "INP";
    severity: "low" | "medium" | "high";
    description: string;
    location: string;
    element?: string;
  }> {
    const issues: Array<{
      type: "LCP" | "CLS" | "FID" | "INP";
      severity: "low" | "medium" | "high";
      description: string;
      location: string;
      element?: string;
    }> = [];

    const visitNode = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = JsxUtils.getTagName(node).toLowerCase();
        const issues_found = this.analyzeElementForCWV(node, tagName);
        issues.push(...issues_found);
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return issues;
  }

  /**
   * Analyze a JSX element for potential CWV issues
   */
  private static analyzeElementForCWV(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    tagName: string
  ): Array<{
    type: "LCP" | "CLS" | "FID" | "INP";
    severity: "low" | "medium" | "high";
    description: string;
    location: string;
    element?: string;
  }> {
    const issues: Array<{
      type: "LCP" | "CLS" | "FID" | "INP";
      severity: "low" | "medium" | "high";
      description: string;
      location: string;
      element?: string;
    }> = [];

    const location = `Line ${
      node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line +
      1
    }`;

    // LCP (Largest Contentful Paint) issues
    if (tagName === "img") {
      const src = JsxUtils.getAttribute(node, "src");
      const width = JsxUtils.getAttribute(node, "width");
      const height = JsxUtils.getAttribute(node, "height");
      const priority = JsxUtils.getAttribute(node, "priority");

      // Missing dimensions can cause CLS
      if (!width || !height) {
        issues.push({
          type: "CLS",
          severity: "medium",
          description:
            "Image missing width or height attributes can cause layout shift",
          location,
          element: "img",
        });
      }

      // Large images without priority
      if (src && !priority && this.isLikelyAboveFold(node)) {
        issues.push({
          type: "LCP",
          severity: "high",
          description:
            "Above-the-fold image should have priority attribute for better LCP",
          location,
          element: "img",
        });
      }
    }

    // Next.js Image component analysis
    if (tagName === "Image") {
      const priority = JsxUtils.getAttribute(node, "priority");
      const placeholder = JsxUtils.getAttribute(node, "placeholder");
      const sizes = JsxUtils.getAttribute(node, "sizes");

      if (!priority && this.isLikelyAboveFold(node)) {
        issues.push({
          type: "LCP",
          severity: "high",
          description: "Above-the-fold Next.js Image should have priority prop",
          location,
          element: "Image",
        });
      }

      if (!sizes) {
        issues.push({
          type: "LCP",
          severity: "medium",
          description:
            "Next.js Image missing sizes prop may cause suboptimal loading",
          location,
          element: "Image",
        });
      }
    }

    // FID/INP issues - large click handlers
    const onClick = JsxUtils.getAttribute(node, "onClick");
    if (onClick && this.isComplexEventHandler(node)) {
      issues.push({
        type: "INP",
        severity: "medium",
        description:
          "Complex event handler may impact interaction responsiveness",
        location,
        element: tagName,
      });
    }

    // CLS issues - elements without dimensions
    if (["iframe", "embed", "object"].includes(tagName)) {
      const width = JsxUtils.getAttribute(node, "width");
      const height = JsxUtils.getAttribute(node, "height");

      if (!width || !height) {
        issues.push({
          type: "CLS",
          severity: "high",
          description: `${tagName} without dimensions can cause significant layout shift`,
          location,
          element: tagName,
        });
      }
    }

    // Font loading issues
    if (tagName === "link") {
      const rel = JsxUtils.getAttribute(node, "rel");
      const href = JsxUtils.getAttribute(node, "href");

      if (
        rel === "stylesheet" &&
        href &&
        href.includes("fonts.googleapis.com")
      ) {
        const preconnect = this.hasPreconnectForGoogleFonts(node);
        if (!preconnect) {
          issues.push({
            type: "LCP",
            severity: "medium",
            description:
              "Google Fonts loading without preconnect may impact LCP",
            location,
            element: "link",
          });
        }
      }
    }

    return issues;
  }

  /**
   * Determines if an element is likely above the fold
   */
  private static isLikelyAboveFold(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // Simple heuristic: check if it's in the first few elements of the component
    // In a real implementation, this could be more sophisticated
    const sourceFile = node.getSourceFile();
    const componentStart = this.findComponentStart(sourceFile);
    const elementPosition = node.getStart();

    // If element appears within first 20% of component, consider it above fold
    if (componentStart) {
      const componentLength = sourceFile.getEnd() - componentStart;
      const elementOffset = elementPosition - componentStart;
      return elementOffset / componentLength < 0.2;
    }

    return false;
  }

  /**
   * Find the start of the main component in the source file
   */
  private static findComponentStart(sourceFile: ts.SourceFile): number | null {
    let componentStart: number | null = null;

    const visitNode = (node: ts.Node) => {
      // Look for function components or class components
      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isArrowFunction(node) ||
          ts.isFunctionExpression(node)) &&
        !componentStart
      ) {
        // Check if this function returns JSX
        const hasJSXReturn = this.functionReturnsJSX(node);
        if (hasJSXReturn) {
          componentStart = node.getStart();
        }
      }

      if (!componentStart) {
        ts.forEachChild(node, visitNode);
      }
    };

    visitNode(sourceFile);
    return componentStart;
  }

  /**
   * Check if a function returns JSX
   */
  private static functionReturnsJSX(
    node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
  ): boolean {
    const body = node.body;

    if (!body) {
      return false;
    }

    if (ts.isBlock(body)) {
      // Look for return statements with JSX
      return body.statements.some((statement) => {
        if (ts.isReturnStatement(statement) && statement.expression) {
          return this.isJSXExpression(statement.expression);
        }
        return false;
      });
    } else {
      // Arrow function with expression body
      return this.isJSXExpression(body);
    }
  }

  /**
   * Check if an expression is JSX
   */
  private static isJSXExpression(expression: ts.Expression): boolean {
    return (
      ts.isJsxElement(expression) ||
      ts.isJsxSelfClosingElement(expression) ||
      ts.isJsxFragment(expression)
    );
  }

  /**
   * Check if an event handler is complex (potential performance issue)
   */
  private static isComplexEventHandler(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // This is a simplified check - in practice, you'd analyze the handler function
    // For now, just check if there are multiple event handlers or complex props
    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes.properties
      : node.attributes.properties;

    const eventHandlers = attributes.filter(
      (attr) => ts.isJsxAttribute(attr) && attr.name.getText().startsWith("on")
    );

    return eventHandlers.length > 2; // Arbitrary threshold
  }

  /**
   * Check if there's a preconnect for Google Fonts
   */
  private static hasPreconnectForGoogleFonts(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // This would need to check the document head for preconnect links
    // For static analysis, we can't fully determine this, so we return false
    // to encourage adding preconnect links
    return false;
  }

  /**
   * Analyze bundle impact of imports
   */
  public static analyzeBundleImpact(
    imports: Array<{
      importPath: string;
      isLibrary: boolean;
      isLargeLibrary: boolean;
      importType: string;
    }>
  ): {
    heavyImports: string[];
    treeshakingIssues: string[];
    bundleScore: number;
  } {
    const heavyImports: string[] = [];
    const treeshakingIssues: string[] = [];

    imports.forEach((imp) => {
      if (imp.isLargeLibrary) {
        heavyImports.push(imp.importPath);
      }

      // Check for imports that prevent tree shaking
      if (imp.importType === "namespace" && imp.isLibrary) {
        treeshakingIssues.push(imp.importPath);
      }
    });

    // Calculate bundle score (0-100)
    let bundleScore = 100;
    bundleScore -= heavyImports.length * 15; // -15 per heavy import
    bundleScore -= treeshakingIssues.length * 10; // -10 per tree shaking issue

    return {
      heavyImports,
      treeshakingIssues,
      bundleScore: Math.max(0, bundleScore),
    };
  }

  /**
   * Check if component is server or client component
   */
  public static isServerComponent(sourceFile: ts.SourceFile): {
    isServerComponent: boolean;
    hasUseClientDirective: boolean;
    hasUseServerDirective: boolean;
  } {
    let hasUseClientDirective = false;
    let hasUseServerDirective = false;

    const visitNode = (node: ts.Node) => {
      if (ts.isStringLiteral(node)) {
        if (node.text === "use client") {
          hasUseClientDirective = true;
        }
        if (node.text === "use server") {
          hasUseServerDirective = true;
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    // In App Router, components are server components by default unless marked with 'use client'
    const isServerComponent = !hasUseClientDirective;

    return {
      isServerComponent,
      hasUseClientDirective,
      hasUseServerDirective,
    };
  }
}
