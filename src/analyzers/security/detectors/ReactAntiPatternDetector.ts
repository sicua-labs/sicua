/**
 * Detector for React-specific security anti-patterns
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";

export class ReactAntiPatternDetector extends BaseDetector {
  private static readonly REACT_ANTIPATTERN_PATTERNS: PatternDefinition[] = [
    {
      id: "react-create-element-script",
      name: "React.createElement with script tag",
      description:
        "React.createElement used to create script elements - potential XSS vulnerability",
      pattern: {
        type: "regex",
        expression: /React\.createElement\s*\(\s*['"`]script['"`]/g,
      },
      vulnerabilityType: "react-antipattern",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "jsx-script-with-variable",
      name: "JSX script tag with variable content",
      description:
        "JSX script element contains variable content - potential XSS vulnerability",
      pattern: {
        type: "regex",
        expression: /<script[^>]*>\s*\{[^}]*\}/g,
      },
      vulnerabilityType: "react-antipattern",
      severity: "critical",
      confidence: "high",
      fileTypes: [".tsx", ".jsx"],
      enabled: true,
    },
  ];

  // Dangerous HTML elements that should not contain user content
  private static readonly DANGEROUS_HTML_ELEMENTS = [
    "script",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
    "style",
  ];

  // React props that can execute JavaScript
  private static readonly DANGEROUS_PROPS = [
    "onClick",
    "onLoad",
    "onError",
    "onFocus",
    "onBlur",
    "onChange",
    "onSubmit",
    "onMouseOver",
    "onMouseOut",
    "onKeyDown",
    "onKeyUp",
    "href",
    "src",
    "action",
    "formAction",
  ];

  // Ref-related anti-patterns
  private static readonly DANGEROUS_REF_OPERATIONS = [
    "innerHTML",
    "outerHTML",
    "insertAdjacentHTML",
    "execCommand",
  ];

  constructor() {
    super(
      "ReactAntiPatternDetector",
      "react-antipattern",
      "critical",
      ReactAntiPatternDetector.REACT_ANTIPATTERN_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter for React/JSX files only
    const reactFiles = this.filterReactFiles(scanResult);

    for (const filePath of reactFiles) {
      const content = scanResult.fileContents.get(filePath);
      if (!content) continue;

      // Apply AST-based analysis for comprehensive detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForReactAntiPatterns(sf, fp)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Apply pattern matching as backup
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateReactAntiPatternMatch(match)
        );

      // Process pattern vulnerabilities
      for (const vuln of patternVulnerabilities) {
        if (this.validateVulnerability(vuln)) {
          vulnerabilities.push(vuln);
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Filter files to only include React/JSX files
   */
  private filterReactFiles(scanResult: ScanResult): string[] {
    return scanResult.filePaths.filter((filePath) => {
      // Only process React/JSX files
      if (
        ![".tsx", ".jsx", ".ts", ".js"].some((ext) => filePath.endsWith(ext))
      ) {
        return false;
      }

      // Check if file contains React/JSX content
      const content = scanResult.fileContents.get(filePath);
      if (!content) return false;

      return this.isReactFile(content);
    });
  }

  /**
   * Check if file contains React/JSX content
   */
  private isReactFile(content: string): boolean {
    const reactIndicators = [
      /import\s+.*React.*from\s+['"]react['"]/,
      /import\s+.*\{[^}]*useState[^}]*\}.*from\s+['"]react['"]/,
      /import\s+.*\{[^}]*useEffect[^}]*\}.*from\s+['"]react['"]/,
      /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*return\s*\(/,
      /<[A-Z][a-zA-Z0-9]*[\s>]/, // JSX component
      /<\/[A-Z][a-zA-Z0-9]*>/, // JSX closing tag
      /React\./,
      /\.jsx?$|\.tsx?$/,
    ];

    return reactIndicators.some((indicator) => indicator.test(content));
  }

  /**
   * Validate if a React anti-pattern match is actually problematic
   */
  private validateReactAntiPatternMatch(matchResult: any): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Check if it's in test code
    if (this.isInTestContext(match.context || "")) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for React anti-patterns
   */
  private analyzeASTForReactAntiPatterns(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find React.createElement calls
    const createElementCalls = this.findReactCreateElementCalls(sourceFile);
    for (const createElementCall of createElementCalls) {
      const createElementVuln = this.analyzeCreateElementCall(
        createElementCall,
        sourceFile,
        filePath
      );
      if (createElementVuln) {
        vulnerabilities.push(createElementVuln);
      }
    }

    // Find JSX elements
    const jsxElements = ASTTraverser.findJSXElements(sourceFile);
    for (const jsxElement of jsxElements) {
      const jsxVuln = this.analyzeJSXElement(jsxElement, sourceFile, filePath);
      if (jsxVuln) {
        vulnerabilities.push(jsxVuln);
      }
    }

    // Find ref usage with dangerous operations
    const refUsages = this.findDangerousRefUsage(sourceFile);
    for (const refUsage of refUsages) {
      const refVuln = this.analyzeRefUsage(refUsage, sourceFile, filePath);
      if (refVuln) {
        vulnerabilities.push(refVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find React.createElement calls
   */
  private findReactCreateElementCalls(
    sourceFile: ts.SourceFile
  ): ts.CallExpression[] {
    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        if (ts.isPropertyAccessExpression(node.expression)) {
          const obj = node.expression.expression;
          const method = node.expression.name;

          return (
            ts.isIdentifier(obj) &&
            obj.text === "React" &&
            ts.isIdentifier(method) &&
            method.text === "createElement"
          );
        }
        return false;
      }
    );
  }

  /**
   * Find dangerous ref usage
   */
  private findDangerousRefUsage(
    sourceFile: ts.SourceFile
  ): ts.PropertyAccessExpression[] {
    return ASTTraverser.findNodesByKind<ts.PropertyAccessExpression>(
      sourceFile,
      ts.SyntaxKind.PropertyAccessExpression,
      (node) => {
        // Look for ref.current.dangerousOperation
        if (
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.name) &&
          ReactAntiPatternDetector.DANGEROUS_REF_OPERATIONS.includes(
            node.name.text
          )
        ) {
          const refAccess = node.expression;
          if (
            ts.isPropertyAccessExpression(refAccess) &&
            ts.isIdentifier(refAccess.name) &&
            refAccess.name.text === "current"
          ) {
            return true;
          }
        }
        return false;
      }
    );
  }

  /**
   * Analyze React.createElement call for dangerous patterns
   */
  private analyzeCreateElementCall(
    createElementCall: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (createElementCall.arguments.length === 0) return null;

    const firstArg = createElementCall.arguments[0];
    let elementType: string | null = null;

    if (ts.isStringLiteral(firstArg)) {
      elementType = firstArg.text;
    } else if (ts.isIdentifier(firstArg)) {
      elementType = firstArg.text;
    }

    if (!elementType) return null;

    // Check if creating dangerous HTML elements
    if (
      ReactAntiPatternDetector.DANGEROUS_HTML_ELEMENTS.includes(
        elementType.toLowerCase()
      )
    ) {
      const location = ASTTraverser.getNodeLocation(
        createElementCall,
        sourceFile
      );
      const context = ASTTraverser.getNodeContext(
        createElementCall,
        sourceFile
      );
      const code = ASTTraverser.getNodeText(createElementCall, sourceFile);

      // Check if there are props or children that could be user-controlled
      const hasUserContent = this.hasUserControlledContent(createElementCall);

      return this.createVulnerability(
        filePath,
        {
          line: location.line,
          column: location.column,
          endLine: location.line,
          endColumn: location.column + code.length,
        },
        {
          code,
          surroundingContext: context,
          functionName: this.extractFunctionFromAST(createElementCall),
          componentName: this.extractComponentName(filePath),
        },
        `React.createElement used to create '${elementType}' element - ${
          hasUserContent ? "with user-controlled content, " : ""
        }potential XSS vulnerability`,
        elementType === "script" ? "critical" : "high",
        hasUserContent ? "high" : "medium",
        {
          elementType,
          hasUserContent,
          createMethod: "React.createElement",
          recommendations: [
            `Avoid creating '${elementType}' elements dynamically`,
            "Use safer alternatives for dynamic content",
            "Sanitize any user input before rendering",
            "Consider using dangerouslySetInnerHTML with proper sanitization if needed",
          ],
          detectionMethod: "react-create-element-analysis",
        }
      );
    }

    return null;
  }

  /**
   * Analyze JSX element for dangerous patterns
   */
  private analyzeJSXElement(
    jsxElement: ts.JsxElement | ts.JsxSelfClosingElement,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const tagName = this.getJSXTagName(jsxElement);
    if (!tagName) return null;

    // Check dangerous HTML elements
    if (
      ReactAntiPatternDetector.DANGEROUS_HTML_ELEMENTS.includes(
        tagName.toLowerCase()
      )
    ) {
      const hasUserContent = this.jsxHasUserControlledContent(jsxElement);

      // Special handling for script tags
      if (tagName.toLowerCase() === "script") {
        const location = ASTTraverser.getNodeLocation(jsxElement, sourceFile);
        const context = ASTTraverser.getNodeContext(jsxElement, sourceFile);
        const code = ASTTraverser.getNodeText(jsxElement, sourceFile);

        return this.createVulnerability(
          filePath,
          {
            line: location.line,
            column: location.column,
            endLine: location.line,
            endColumn: location.column + code.length,
          },
          {
            code,
            surroundingContext: context,
            functionName: this.extractFunctionFromAST(jsxElement),
            componentName: this.extractComponentName(filePath),
          },
          `JSX script element detected - ${
            hasUserContent ? "contains user-controlled content, " : ""
          }potential XSS vulnerability`,
          "critical",
          "high",
          {
            elementType: tagName,
            hasUserContent,
            createMethod: "JSX",
            recommendations: [
              "Remove script tags from JSX",
              "Load scripts through proper React mechanisms",
              "Use useEffect for script loading if needed",
              "Never include user content in script tags",
            ],
            detectionMethod: "jsx-element-analysis",
          }
        );
      }

      // Check for dangerous props
      const dangerousProps = this.findDangerousJSXProps(jsxElement);
      if (dangerousProps.length > 0) {
        const location = ASTTraverser.getNodeLocation(jsxElement, sourceFile);
        const context = ASTTraverser.getNodeContext(jsxElement, sourceFile);
        const code = ASTTraverser.getNodeText(jsxElement, sourceFile);

        return this.createVulnerability(
          filePath,
          {
            line: location.line,
            column: location.column,
            endLine: location.line,
            endColumn: location.column + code.length,
          },
          {
            code,
            surroundingContext: context,
            functionName: this.extractFunctionFromAST(jsxElement),
            componentName: this.extractComponentName(filePath),
          },
          `JSX ${tagName} element with potentially dangerous props: ${dangerousProps.join(
            ", "
          )}`,
          "high",
          "medium",
          {
            elementType: tagName,
            dangerousProps,
            createMethod: "JSX",
            recommendations: [
              "Validate and sanitize prop values",
              "Avoid user-controlled content in event handlers",
              "Use safe alternatives for dynamic URLs",
            ],
            detectionMethod: "jsx-props-analysis",
          }
        );
      }
    }

    return null;
  }

  /**
   * Analyze ref usage for dangerous operations
   */
  private analyzeRefUsage(
    refUsage: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(refUsage, sourceFile);
    const context = ASTTraverser.getNodeContext(refUsage, sourceFile);
    const code = ASTTraverser.getNodeText(refUsage, sourceFile);

    const operation = ts.isIdentifier(refUsage.name)
      ? refUsage.name.text
      : "unknown";

    return this.createVulnerability(
      filePath,
      {
        line: location.line,
        column: location.column,
        endLine: location.line,
        endColumn: location.column + code.length,
      },
      {
        code,
        surroundingContext: context,
        functionName: this.extractFunctionFromAST(refUsage),
        componentName: this.extractComponentName(filePath),
      },
      `Dangerous ref operation '${operation}' detected - potential XSS vulnerability`,
      "high",
      "high",
      {
        operation,
        recommendations: [
          "Avoid direct DOM manipulation through refs",
          "Use React state and props for content updates",
          "Sanitize any content before setting innerHTML",
          "Consider using dangerouslySetInnerHTML with proper sanitization",
        ],
        detectionMethod: "ref-usage-analysis",
      }
    );
  }

  /**
   * Get JSX tag name
   */
  private getJSXTagName(
    jsxElement: ts.JsxElement | ts.JsxSelfClosingElement
  ): string | null {
    if (ts.isJsxElement(jsxElement)) {
      const tagName = jsxElement.openingElement.tagName;
      if (ts.isIdentifier(tagName)) {
        return tagName.text;
      }
    } else if (ts.isJsxSelfClosingElement(jsxElement)) {
      const tagName = jsxElement.tagName;
      if (ts.isIdentifier(tagName)) {
        return tagName.text;
      }
    }
    return null;
  }

  /**
   * Check if React.createElement has user-controlled content
   */
  private hasUserControlledContent(
    createElementCall: ts.CallExpression
  ): boolean {
    // Check props (second argument)
    if (createElementCall.arguments.length > 1) {
      const propsArg = createElementCall.arguments[1];
      if (this.containsUserVariables(propsArg)) {
        return true;
      }
    }

    // Check children (third+ arguments)
    for (let i = 2; i < createElementCall.arguments.length; i++) {
      const child = createElementCall.arguments[i];
      if (this.containsUserVariables(child)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if JSX element has user-controlled content
   */
  private jsxHasUserControlledContent(
    jsxElement: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // Check attributes
    const attributes = ts.isJsxElement(jsxElement)
      ? jsxElement.openingElement.attributes.properties
      : jsxElement.attributes.properties;

    for (const attr of attributes) {
      if (ts.isJsxAttribute(attr) && attr.initializer) {
        if (
          ts.isJsxExpression(attr.initializer) &&
          attr.initializer.expression
        ) {
          if (this.containsUserVariables(attr.initializer.expression)) {
            return true;
          }
        }
      }
    }

    // Check children for JSX elements
    if (ts.isJsxElement(jsxElement)) {
      for (const child of jsxElement.children) {
        if (ts.isJsxExpression(child) && child.expression) {
          if (this.containsUserVariables(child.expression)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Find dangerous JSX props
   */
  private findDangerousJSXProps(
    jsxElement: ts.JsxElement | ts.JsxSelfClosingElement
  ): string[] {
    const dangerousProps: string[] = [];
    const attributes = ts.isJsxElement(jsxElement)
      ? jsxElement.openingElement.attributes.properties
      : jsxElement.attributes.properties;

    for (const attr of attributes) {
      if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
        const propName = attr.name.text;

        if (ReactAntiPatternDetector.DANGEROUS_PROPS.includes(propName)) {
          // Check if the prop value contains user variables
          if (
            attr.initializer &&
            ts.isJsxExpression(attr.initializer) &&
            attr.initializer.expression
          ) {
            if (this.containsUserVariables(attr.initializer.expression)) {
              dangerousProps.push(propName);
            }
          }
        }
      }
    }

    return dangerousProps;
  }

  /**
   * Check if expression contains user-controlled variables
   */
  private containsUserVariables(expr: ts.Expression): boolean {
    // Simple heuristic - look for variables that suggest user input
    const userInputIndicators = [
      "props",
      "userInput",
      "query",
      "params",
      "body",
      "request",
      "form",
      "input",
      "data",
      "content",
      "message",
      "text",
    ];

    const exprText = expr.getText().toLowerCase();
    return userInputIndicators.some((indicator) =>
      exprText.includes(indicator)
    );
  }

  /**
   * Extract function name from AST node context
   */
  private extractFunctionFromAST(node: ts.Node): string | undefined {
    let current = node.parent;

    while (current) {
      if (ts.isFunctionDeclaration(current) && current.name) {
        return current.name.text;
      }
      if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
        return current.name.text;
      }
      if (
        ts.isVariableDeclaration(current) &&
        ts.isIdentifier(current.name) &&
        current.initializer &&
        (ts.isFunctionExpression(current.initializer) ||
          ts.isArrowFunction(current.initializer))
      ) {
        return current.name.text;
      }
      current = current.parent;
    }

    return undefined;
  }
}
