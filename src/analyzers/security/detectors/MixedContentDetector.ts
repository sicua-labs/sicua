/**
 * Detector for mixed content vulnerabilities (HTTP resources in HTTPS context)
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { ConfidenceLevel, Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import {
  CRITICAL_HTML_ATTRIBUTES,
  HIGH_RISK_HTML_ATTRIBUTES,
} from "../constants/general.constants";
import {
  ALLOWED_HTTP_CONTEXTS,
  RISKY_HTTP_CONTEXTS,
} from "../constants/network.constants";
import { SAFE_XML_NAMESPACES } from "../constants/security.constants";

export class MixedContentDetector extends BaseDetector {
  private static readonly MIXED_CONTENT_PATTERNS: PatternDefinition[] = [
    {
      id: "http-url-string",
      name: "HTTP URL in string literal",
      description:
        "HTTP URL detected - this may cause mixed content issues in HTTPS context",
      pattern: {
        type: "regex",
        expression: /['"`]https?:\/\/[^'"`\s]+['"`]/g,
      },
      vulnerabilityType: "mixed-content",
      severity: "high",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "http-api-call",
      name: "HTTP API endpoint",
      description:
        "HTTP API endpoint detected - ensure HTTPS is used in production",
      pattern: {
        type: "regex",
        expression: /fetch\s*\(\s*['"`]http:\/\/[^'"`\s]+['"`]/g,
      },
      vulnerabilityType: "mixed-content",
      severity: "high",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "http-axios-call",
      name: "HTTP Axios request",
      description:
        "HTTP Axios request detected - ensure HTTPS is used in production",
      pattern: {
        type: "regex",
        expression: /axios\.[a-z]+\s*\(\s*['"`]http:\/\/[^'"`\s]+['"`]/g,
      },
      vulnerabilityType: "mixed-content",
      severity: "high",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "http-image-src",
      name: "HTTP image source",
      description:
        "HTTP image source detected - this will be blocked in HTTPS context",
      pattern: {
        type: "regex",
        expression:
          /src\s*=\s*['"`]http:\/\/[^'"`\s]+\.(jpg|jpeg|png|gif|svg|webp)['"`]/gi,
      },
      vulnerabilityType: "mixed-content",
      severity: "high",
      confidence: "high",
      fileTypes: [".tsx", ".jsx"],
      enabled: true,
    },
    {
      id: "http-script-src",
      name: "HTTP script source",
      description:
        "HTTP script source detected - this will be blocked in HTTPS context",
      pattern: {
        type: "regex",
        expression: /src\s*=\s*['"`]http:\/\/[^'"`\s]+\.js['"`]/gi,
      },
      vulnerabilityType: "mixed-content",
      severity: "high",
      confidence: "high",
      fileTypes: [".tsx", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "MixedContentDetector",
      "mixed-content",
      "high",
      MixedContentDetector.MIXED_CONTENT_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files
    // TODO: MOVE TO CONSTANTS
    const relevantFiles = this.filterRelevantFiles(
      scanResult,
      [".ts", ".tsx", ".js", ".jsx"],
      [
        "node_modules",
        "dist",
        "build",
        ".git",
        "coverage",
        "__tests__",
        ".test.",
        ".spec.",
      ]
    );

    for (const filePath of relevantFiles) {
      const content = scanResult.fileContents.get(filePath);
      if (!content) continue;

      // Apply pattern matching
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateMixedContentMatch(match)
        );

      // Apply AST-based analysis for more sophisticated detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForMixedContent(sf, fp)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Adjust confidence based on file context
      const fileContext = this.getFileContext(filePath, content);
      for (const vuln of patternVulnerabilities) {
        // Higher confidence for client-side files
        if (fileContext.isClientSide) {
          vuln.confidence = "high";
        }

        // Lower confidence for server-side files
        if (fileContext.riskContexts.includes("server-side")) {
          vuln.confidence = "medium";
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
   * Validate if a mixed content match is actually risky
   */
  private validateMixedContentMatch(matchResult: any): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Extract URL from the match
    const url = this.extractURLFromMatch(match.match);
    if (!url) return false;

    // Allow localhost and development URLs
    if (this.isAllowedHTTPContext(url)) {
      return false;
    }

    // Check if it's actually HTTP (not HTTPS)
    if (!url.startsWith("http://")) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for mixed content detection
   */
  private analyzeASTForMixedContent(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find string literals with HTTP URLs
    const httpStrings = this.findHTTPStringLiterals(sourceFile);

    for (const stringLiteral of httpStrings) {
      const url = stringLiteral.text;

      // Skip allowed contexts
      if (this.isAllowedHTTPContext(url)) {
        continue;
      }

      const riskAssessment = this.assessMixedContentRisk(
        stringLiteral,
        sourceFile
      );

      if (riskAssessment) {
        const location = ASTTraverser.getNodeLocation(
          stringLiteral,
          sourceFile
        );
        const context = ASTTraverser.getNodeContext(stringLiteral, sourceFile);
        const code = ASTTraverser.getNodeText(stringLiteral, sourceFile);

        const vulnerability = this.createVulnerability(
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
            functionName: this.extractFunctionFromAST(stringLiteral),
          },
          riskAssessment.description,
          "high",
          riskAssessment.confidence,
          {
            url,
            usageContext: riskAssessment.usageContext,
            riskLevel: riskAssessment.riskLevel,
            detectionMethod: "ast-analysis",
          }
        );

        vulnerabilities.push(vulnerability);
      }
    }

    // Find JSX attributes with HTTP URLs
    const jsxHTTPAttributes = this.findJSXHTTPAttributes(sourceFile);

    for (const jsxAttr of jsxHTTPAttributes) {
      const attrVuln = this.analyzeJSXHTTPAttribute(
        jsxAttr,
        sourceFile,
        filePath
      );
      if (attrVuln) {
        vulnerabilities.push(attrVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find string literals containing HTTP URLs
   */
  private findHTTPStringLiterals(
    sourceFile: ts.SourceFile
  ): ts.StringLiteral[] {
    const httpPattern = /^http?:\/\//;

    return ASTTraverser.findNodesByKind<ts.StringLiteral>(
      sourceFile,
      ts.SyntaxKind.StringLiteral,
      (node) => httpPattern.test(node.text)
    );
  }

  /**
   * Find JSX attributes with HTTP URLs
   */
  private findJSXHTTPAttributes(sourceFile: ts.SourceFile): ts.JsxAttribute[] {
    const jsxAttributes: ts.JsxAttribute[] = [];
    const jsxElements = ASTTraverser.findJSXElements(sourceFile);

    for (const jsxElement of jsxElements) {
      const attributes = ts.isJsxElement(jsxElement)
        ? jsxElement.openingElement.attributes.properties
        : jsxElement.attributes.properties;

      for (const attr of attributes) {
        if (ts.isJsxAttribute(attr) && attr.initializer) {
          if (
            ts.isStringLiteral(attr.initializer) &&
            attr.initializer.text.startsWith("http://")
          ) {
            jsxAttributes.push(attr);
          } else if (
            ts.isJsxExpression(attr.initializer) &&
            attr.initializer.expression &&
            ts.isStringLiteral(attr.initializer.expression) &&
            attr.initializer.expression.text.startsWith("http://")
          ) {
            jsxAttributes.push(attr);
          }
        }
      }
    }

    return jsxAttributes;
  }

  /**
   * Assess the risk of mixed content for a string literal
   */
  private assessMixedContentRisk(
    stringLiteral: ts.StringLiteral,
    sourceFile: ts.SourceFile
  ): {
    description: string;
    confidence: ConfidenceLevel;
    usageContext: string;
    riskLevel: string;
  } | null {
    const url = stringLiteral.text;

    // Determine usage context
    const usageContext = this.determineURLUsageContext(
      stringLiteral,
      sourceFile
    );

    if (!usageContext) {
      return null;
    }

    // Assess risk based on usage context
    const riskLevel = this.getRiskLevel(usageContext, url);
    const confidence = this.getConfidenceLevel(usageContext);

    return {
      description: `HTTP URL '${url}' used in ${usageContext} - this may cause mixed content issues in HTTPS context`,
      confidence,
      usageContext,
      riskLevel,
    };
  }

  /**
   * Determine how a URL is being used
   */
  private determineURLUsageContext(
    stringLiteral: ts.StringLiteral,
    sourceFile: ts.SourceFile
  ): string | null {
    const parent = stringLiteral.parent;

    // Check if it's a fetch call
    if (
      ts.isCallExpression(parent) &&
      ts.isIdentifier(parent.expression) &&
      parent.expression.text === "fetch"
    ) {
      return "fetch-api-call";
    }

    // Check if it's an axios call
    if (
      ts.isCallExpression(parent) &&
      ts.isPropertyAccessExpression(parent.expression) &&
      ts.isIdentifier(parent.expression.expression) &&
      parent.expression.expression.text === "axios"
    ) {
      return "axios-api-call";
    }

    // Check if it's a variable assignment
    const variableName = this.getVariableNameForStringLiteral(stringLiteral);
    if (variableName && this.isURLRelatedVariable(variableName)) {
      return `variable-assignment-${variableName}`;
    }

    // Check if it's a property assignment
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      const propertyName = parent.name.text;
      if (this.isURLRelatedProperty(propertyName)) {
        return `property-assignment-${propertyName}`;
      }
    }

    return null;
  }

  /**
   * Analyze JSX HTTP attribute
   */
  private analyzeJSXHTTPAttribute(
    jsxAttr: ts.JsxAttribute,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (!ts.isIdentifier(jsxAttr.name) || !jsxAttr.initializer) {
      return null;
    }

    const attrName = jsxAttr.name.text;
    const url = this.getJSXAttributeURL(jsxAttr);

    if (!url || this.isAllowedHTTPContext(url)) {
      return null;
    }

    // Skip XML namespace declarations
    if (attrName === "xmlns" && this.isXMLNamespace(url)) {
      return null;
    }

    const location = ASTTraverser.getNodeLocation(jsxAttr, sourceFile);
    const context = ASTTraverser.getNodeContext(jsxAttr, sourceFile);
    const code = ASTTraverser.getNodeText(jsxAttr, sourceFile);

    const riskLevel = this.getJSXAttributeRiskLevel(attrName);

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
        functionName: this.extractFunctionFromAST(jsxAttr),
      },
      `HTTP URL in JSX ${attrName} attribute - this will be blocked in HTTPS context`,
      "high",
      riskLevel === "critical" ? "high" : "medium",
      {
        attributeName: attrName,
        url,
        riskLevel,
        detectionMethod: "jsx-analysis",
      }
    );
  }

  /**
   * Get URL from JSX attribute
   */
  private getJSXAttributeURL(jsxAttr: ts.JsxAttribute): string | null {
    if (!jsxAttr.initializer) return null;

    if (ts.isStringLiteral(jsxAttr.initializer)) {
      return jsxAttr.initializer.text;
    } else if (
      ts.isJsxExpression(jsxAttr.initializer) &&
      jsxAttr.initializer.expression &&
      ts.isStringLiteral(jsxAttr.initializer.expression)
    ) {
      return jsxAttr.initializer.expression.text;
    }

    return null;
  }

  /**
   * Get risk level for JSX attribute
   */
  private getJSXAttributeRiskLevel(attrName: string): string {
    if (CRITICAL_HTML_ATTRIBUTES.includes(attrName)) {
      return "critical";
    } else if (HIGH_RISK_HTML_ATTRIBUTES.includes(attrName)) {
      return "high";
    }

    return "medium";
  }

  /**
   * Extract URL from pattern match
   */
  private extractURLFromMatch(match: string): string | null {
    const urlMatch = match.match(/https?:\/\/[^'"`\s]+/);
    return urlMatch ? urlMatch[0] : null;
  }

  /**
   * Check if HTTP context is allowed (development/localhost)
   */
  private isAllowedHTTPContext(url: string): boolean {
    // Check standard XML namespaces first
    if (SAFE_XML_NAMESPACES.includes(url)) {
      return true;
    }

    // Check development/localhost contexts
    return ALLOWED_HTTP_CONTEXTS.some((allowed) => url.includes(allowed));
  }

  /**
   * Check if URL is a standard XML namespace declaration
   */
  private isXMLNamespace(url: string): boolean {
    return SAFE_XML_NAMESPACES.includes(url);
  }

  /**
   * Get variable name for string literal
   */
  private getVariableNameForStringLiteral(
    node: ts.StringLiteral
  ): string | undefined {
    let parent = node.parent;

    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }

    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }

    return undefined;
  }

  /**
   * Check if variable name is URL-related
   */
  private isURLRelatedVariable(name: string): boolean {
    const lowerName = name.toLowerCase();
    return RISKY_HTTP_CONTEXTS.some((context) => lowerName.includes(context));
  }

  /**
   * Check if property name is URL-related
   */
  private isURLRelatedProperty(name: string): boolean {
    return this.isURLRelatedVariable(name);
  }

  /**
   * Get risk level based on usage context
   */
  private getRiskLevel(usageContext: string, url: string): string {
    if (usageContext.includes("api-call") || usageContext.includes("fetch")) {
      return "high";
    }
    if (usageContext.includes("src") || usageContext.includes("href")) {
      return "critical";
    }
    return "medium";
  }

  /**
   * Get confidence level based on usage context
   */
  private getConfidenceLevel(usageContext: string): ConfidenceLevel {
    if (
      usageContext.includes("api-call") ||
      usageContext.includes("fetch") ||
      usageContext.includes("src") ||
      usageContext.includes("href")
    ) {
      return "high";
    }
    return "medium";
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
