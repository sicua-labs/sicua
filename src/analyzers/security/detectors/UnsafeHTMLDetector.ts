/**
 * Detector for unsafe HTML usage including dangerouslySetInnerHTML without sanitization
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import {
  SANITIZATION_LIBRARIES,
  SANITIZATION_PATTERNS,
} from "../constants/security.constants";
import { CSS_PATTERNS } from "../constants/general.constants";

export class UnsafeHTMLDetector extends BaseDetector {
  private static readonly HTML_PATTERNS: PatternDefinition[] = [
    {
      id: "dangerously-set-inner-html",
      name: "dangerouslySetInnerHTML usage",
      description:
        "Usage of dangerouslySetInnerHTML detected - ensure content is properly sanitized",
      pattern: {
        type: "regex",
        expression: /dangerouslySetInnerHTML\s*:/g,
      },
      vulnerabilityType: "unsafe-innerhtml",
      severity: "critical",
      confidence: "high",
      fileTypes: [".tsx", ".jsx"],
      enabled: true,
    },
    {
      id: "innerHTML-assignment",
      name: "innerHTML assignment",
      description:
        "Direct innerHTML assignment detected - this can lead to XSS if content is not sanitized",
      pattern: {
        type: "regex",
        expression: /\.innerHTML\s*=/g,
      },
      vulnerabilityType: "unsafe-innerhtml",
      severity: "critical",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "outerhtml-assignment",
      name: "outerHTML assignment",
      description:
        "Direct outerHTML assignment detected - this can lead to XSS if content is not sanitized",
      pattern: {
        type: "regex",
        expression: /\.outerHTML\s*=/g,
      },
      vulnerabilityType: "unsafe-innerhtml",
      severity: "critical",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "document-write",
      name: "document.write usage",
      description:
        "document.write() usage detected - this can lead to XSS vulnerabilities",
      pattern: {
        type: "regex",
        expression: /document\.write\s*\(/g,
      },
      vulnerabilityType: "unsafe-innerhtml",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "document-writeln",
      name: "document.writeln usage",
      description:
        "document.writeln() usage detected - this can lead to XSS vulnerabilities",
      pattern: {
        type: "regex",
        expression: /document\.writeln\s*\(/g,
      },
      vulnerabilityType: "unsafe-innerhtml",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "UnsafeHTMLDetector",
      "unsafe-innerhtml",
      "critical",
      UnsafeHTMLDetector.HTML_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files
    // TODO: MOVE TO CONSTANTS
    const relevantFiles = this.filterRelevantFiles(
      scanResult,
      [".ts", ".tsx", ".js", ".jsx"],
      ["node_modules", "dist", "build", ".git", "coverage"]
    );

    for (const filePath of relevantFiles) {
      const content = scanResult.fileContents.get(filePath);
      if (!content) continue;

      // Check if file has sanitization imports
      const hasSanitization = this.detectSanitizationLibraries(content);

      // Apply pattern matching
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateHTMLMatch(match, hasSanitization)
        );

      // Apply AST-based analysis
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForUnsafeHTML(sf, fp, hasSanitization)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Adjust confidence based on file context and sanitization
      const fileContext = this.getFileContext(filePath, content);
      for (const vuln of patternVulnerabilities) {
        // Lower confidence if sanitization is detected
        if (hasSanitization.length > 0) {
          vuln.confidence = "medium";
          vuln.metadata = {
            ...vuln.metadata,
            sanitizationLibraries: hasSanitization,
            note: "Sanitization libraries detected - verify proper usage",
          };
        }

        vuln.confidence = this.adjustConfidenceBasedOnContext(
          vuln,
          fileContext
        );

        if (this.validateVulnerability(vuln)) {
          vulnerabilities.push(vuln);
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect sanitization libraries in the file
   */
  private detectSanitizationLibraries(content: string): string[] {
    const foundLibraries: string[] = [];

    for (const lib of SANITIZATION_LIBRARIES) {
      if (content.includes(lib)) {
        foundLibraries.push(lib);
      }
    }

    return foundLibraries;
  }

  /**
   * Validate if a pattern match represents unsafe HTML usage
   */
  private validateHTMLMatch(
    matchResult: any,
    sanitizationLibraries: string[]
  ): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Check if sanitization is used in the same context
    if (this.isSanitizedInContext(match.context || "", sanitizationLibraries)) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for unsafe HTML usage
   */
  private analyzeASTForUnsafeHTML(
    sourceFile: ts.SourceFile,
    filePath: string,
    sanitizationLibraries: string[]
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find JSX expressions with dangerouslySetInnerHTML
    const jsxElements = ASTTraverser.findJSXElements(sourceFile);
    for (const jsxElement of jsxElements) {
      const dangerouslySetVuln = this.analyzeDangerouslySetInnerHTML(
        jsxElement,
        sourceFile,
        filePath,
        sanitizationLibraries
      );
      if (dangerouslySetVuln) {
        vulnerabilities.push(dangerouslySetVuln);
      }
    }

    // Find property access expressions for innerHTML/outerHTML
    const propertyAccess = ASTTraverser.findPropertyAccess(sourceFile);
    for (const propAccess of propertyAccess) {
      const htmlVuln = this.analyzeHTMLPropertyAccess(
        propAccess,
        sourceFile,
        filePath,
        sanitizationLibraries
      );
      if (htmlVuln) {
        vulnerabilities.push(htmlVuln);
      }
    }

    // Find document.write calls
    const documentWriteCalls = this.findDocumentWriteCalls(sourceFile);
    for (const writeCall of documentWriteCalls) {
      const writeVuln = this.analyzeDocumentWrite(
        writeCall,
        sourceFile,
        filePath
      );
      if (writeVuln) {
        vulnerabilities.push(writeVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Analyze dangerouslySetInnerHTML usage in JSX
   */
  private analyzeDangerouslySetInnerHTML(
    jsxElement: ts.JsxElement | ts.JsxSelfClosingElement,
    sourceFile: ts.SourceFile,
    filePath: string,
    sanitizationLibraries: string[]
  ): Vulnerability | null {
    const attributes = ts.isJsxElement(jsxElement)
      ? jsxElement.openingElement.attributes.properties
      : jsxElement.attributes.properties;

    for (const attr of attributes) {
      if (
        ts.isJsxAttribute(attr) &&
        ts.isIdentifier(attr.name) &&
        attr.name.text === "dangerouslySetInnerHTML"
      ) {
        const location = ASTTraverser.getNodeLocation(attr, sourceFile);
        const context = ASTTraverser.getNodeContext(jsxElement, sourceFile);
        const code = ASTTraverser.getNodeText(attr, sourceFile);

        // Check if the content appears to be sanitized
        const isSanitized = this.isSanitizedInContext(
          context,
          sanitizationLibraries
        );

        // Check if it's safe CSS generation
        const isSafeCSS = this.isSafeCSSGeneration(context, code);

        // If it's safe CSS generation, lower the severity and confidence
        if (isSafeCSS) {
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
            "dangerouslySetInnerHTML used for CSS generation - verify content is properly constructed and safe",
            "medium",
            "medium",
            {
              hasSanitization: false,
              sanitizationLibraries,
              jsxElementType: ts.isJsxElement(jsxElement)
                ? "element"
                : "self-closing",
              isSafeCSS: true,
            }
          );
        }

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
          isSanitized
            ? "dangerouslySetInnerHTML used with apparent sanitization - verify proper implementation"
            : "dangerouslySetInnerHTML used without apparent sanitization - potential XSS vulnerability",
          "critical",
          isSanitized ? "medium" : "high",
          {
            hasSanitization: isSanitized,
            sanitizationLibraries,
            jsxElementType: ts.isJsxElement(jsxElement)
              ? "element"
              : "self-closing",
          }
        );
      }
    }

    return null;
  }

  /**
   * Analyze innerHTML/outerHTML property access
   */
  private analyzeHTMLPropertyAccess(
    propAccess: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    filePath: string,
    sanitizationLibraries: string[]
  ): Vulnerability | null {
    if (!ts.isIdentifier(propAccess.name)) return null;

    const propertyName = propAccess.name.text;
    if (propertyName !== "innerHTML" && propertyName !== "outerHTML")
      return null;

    // Check if this is an assignment (we're looking for assignments, not reads)
    const parent = propAccess.parent;
    if (
      !ts.isBinaryExpression(parent) ||
      parent.operatorToken.kind !== ts.SyntaxKind.EqualsToken
    ) {
      return null;
    }

    const location = ASTTraverser.getNodeLocation(propAccess, sourceFile);
    const context = ASTTraverser.getNodeContext(parent, sourceFile);
    const code = ASTTraverser.getNodeText(parent, sourceFile);

    // Check if it's just clearing innerHTML (safe operation)
    if (this.isInnerHTMLClearing(code)) {
      return null; // Skip clearing operations
    }

    const isSanitized = this.isSanitizedInContext(
      context,
      sanitizationLibraries
    );

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
        functionName: this.extractFunctionFromAST(propAccess),
        componentName: this.extractComponentName(filePath),
      },
      isSanitized
        ? `${propertyName} assignment with apparent sanitization - verify proper implementation`
        : `Direct ${propertyName} assignment detected - potential XSS vulnerability`,
      "critical",
      isSanitized ? "medium" : "high",
      {
        propertyName,
        hasSanitization: isSanitized,
        sanitizationLibraries,
      }
    );
  }

  /**
   * Find document.write/document.writeln calls
   */
  private findDocumentWriteCalls(
    sourceFile: ts.SourceFile
  ): ts.CallExpression[] {
    const callExpressions = ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression
    );

    return callExpressions.filter((callExpr) => {
      if (ts.isPropertyAccessExpression(callExpr.expression)) {
        const obj = callExpr.expression.expression;
        const method = callExpr.expression.name;

        return (
          ts.isIdentifier(obj) &&
          obj.text === "document" &&
          ts.isIdentifier(method) &&
          (method.text === "write" || method.text === "writeln")
        );
      }
      return false;
    });
  }

  /**
   * Analyze document.write calls
   */
  private analyzeDocumentWrite(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(callExpr, sourceFile);
    const context = ASTTraverser.getNodeContext(callExpr, sourceFile);
    const code = ASTTraverser.getNodeText(callExpr, sourceFile);

    const methodName =
      ts.isPropertyAccessExpression(callExpr.expression) &&
      ts.isIdentifier(callExpr.expression.name)
        ? callExpr.expression.name.text
        : "write";

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
        functionName: this.extractFunctionFromAST(callExpr),
        componentName: this.extractComponentName(filePath),
      },
      `document.${methodName}() usage detected - this can lead to XSS vulnerabilities`,
      "critical",
      "high",
      {
        methodName,
        argumentCount: callExpr.arguments.length,
      }
    );
  }

  /**
   * Check if sanitization is used in the given context
   */
  private isSanitizedInContext(
    context: string,
    sanitizationLibraries: string[]
  ): boolean {
    for (const lib of sanitizationLibraries) {
      if (
        context.includes(lib) &&
        (context.includes(".sanitize") || context.includes(".clean"))
      ) {
        return true;
      }
    }

    return SANITIZATION_PATTERNS.some((pattern) => pattern.test(context));
  }

  /**
   * Check if dangerouslySetInnerHTML is used for safe CSS generation
   */
  private isSafeCSSGeneration(context: string, code: string): boolean {
    const lowerContext = context.toLowerCase();
    const lowerCode = code.toLowerCase();

    // Check if it's a style element with CSS generation
    const isStyleElement =
      lowerContext.includes("<style") || lowerContext.includes("style");

    // Check for CSS-specific patterns
    const hasCSSContent = CSS_PATTERNS.some(
      (pattern) => lowerCode.includes(pattern) || lowerContext.includes(pattern)
    );

    // Check if it's generating style rules dynamically
    const isDynamicCSS =
      lowerCode.includes("entries") ||
      lowerCode.includes("map") ||
      lowerCode.includes("join") ||
      lowerCode.includes("theme");

    return isStyleElement && hasCSSContent && isDynamicCSS;
  }

  /**
   * Check if innerHTML is being cleared (safe operation)
   */
  private isInnerHTMLClearing(code: string): boolean {
    const trimmedCode = code.trim();
    return (
      trimmedCode.endsWith('innerHTML = ""') ||
      trimmedCode.endsWith("innerHTML = ''") ||
      trimmedCode.endsWith("innerHTML = ``")
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
