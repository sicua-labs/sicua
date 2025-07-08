/**
 * Detector for unvalidated redirects using router.push() and similar methods
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { ConfidenceLevel, Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import {
  HIGH_RISK_INPUT_SOURCES,
  MEDIUM_RISK_INPUT_SOURCES,
  REDIRECT_GATING_PATTERNS,
  REDIRECT_METHODS,
  USER_INPUT_SOURCES,
  VALIDATION_INDICATORS,
} from "../constants/network.constants";
import {
  ARRAY_INDICATORS,
  ARRAY_METHODS,
  DATA_MANIPULATION_PATTERNS,
  SERVER_DATA_INDICATORS,
} from "../constants/security.constants";

export class UnvalidatedRedirectDetector extends BaseDetector {
  private static readonly REDIRECT_PATTERNS: PatternDefinition[] = [
    {
      id: "router-push-user-input",
      name: "router.push with user input",
      description:
        "router.push() with potentially unvalidated user input detected",
      pattern: {
        type: "regex",
        expression:
          /router\.push\s*\(\s*[^)]*(?:query|params|searchParams|req\.|request\.)/gi,
      },
      vulnerabilityType: "unvalidated-redirect",
      severity: "medium",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "window-location-user-input",
      name: "window.location with user input",
      description:
        "window.location assignment with potentially unvalidated user input detected",
      pattern: {
        type: "regex",
        expression:
          /window\.location\s*=\s*[^;]*(?:query|params|searchParams|req\.|request\.)/gi,
      },
      vulnerabilityType: "unvalidated-redirect",
      severity: "medium",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "redirect-function-user-input",
      name: "redirect() with user input",
      description:
        "redirect() function with potentially unvalidated user input detected",
      pattern: {
        type: "regex",
        expression:
          /redirect\s*\(\s*[^)]*(?:query|params|searchParams|req\.|request\.)/gi,
      },
      vulnerabilityType: "unvalidated-redirect",
      severity: "medium",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "UnvalidatedRedirectDetector",
      "unvalidated-redirect",
      "medium",
      UnvalidatedRedirectDetector.REDIRECT_PATTERNS
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
          this.validateRedirectMatch(match)
        );

      // Apply AST-based analysis
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForUnvalidatedRedirects(sf, fp)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Adjust confidence based on file context
      const fileContext = this.getFileContext(filePath, content);
      for (const vuln of patternVulnerabilities) {
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
   * Validate if a redirect pattern match is problematic
   */
  private validateRedirectMatch(matchResult: any): boolean {
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

    // Check if there's validation in the context
    if (this.hasValidationInContext(match.context || "")) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for unvalidated redirects
   */
  private analyzeASTForUnvalidatedRedirects(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find redirect-related call expressions
    const redirectCalls = this.findRedirectCalls(sourceFile);
    for (const redirectCall of redirectCalls) {
      const redirectVuln = this.analyzeRedirectCall(
        redirectCall,
        sourceFile,
        filePath
      );
      if (redirectVuln) {
        vulnerabilities.push(redirectVuln);
      }
    }

    // Find window.location assignments
    const locationAssignments = this.findLocationAssignments(sourceFile);
    for (const locationAssign of locationAssignments) {
      const locationVuln = this.analyzeLocationAssignment(
        locationAssign,
        sourceFile,
        filePath
      );
      if (locationVuln) {
        vulnerabilities.push(locationVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find redirect-related function calls
   */
  private findRedirectCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        // Skip array methods first
        if (this.isArrayMethod(node)) {
          return false;
        }

        if (ts.isPropertyAccessExpression(node.expression)) {
          const method = node.expression.name;

          if (ts.isIdentifier(method)) {
            return REDIRECT_METHODS.includes(method.text);
          }
        } else if (ts.isIdentifier(node.expression)) {
          return REDIRECT_METHODS.includes(node.expression.text);
        }

        return false;
      }
    );
  }

  /**
   * Find window.location assignments
   */
  private findLocationAssignments(
    sourceFile: ts.SourceFile
  ): ts.BinaryExpression[] {
    return ASTTraverser.findNodesByKind<ts.BinaryExpression>(
      sourceFile,
      ts.SyntaxKind.BinaryExpression,
      (node) => {
        return (
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          this.isLocationProperty(node.left)
        );
      }
    );
  }

  /**
   * Check if expression is a location property (window.location, location.href, etc.)
   */
  private isLocationProperty(expr: ts.Expression): boolean {
    if (ts.isPropertyAccessExpression(expr)) {
      const obj = expr.expression;
      const prop = expr.name;

      if (ts.isIdentifier(obj) && ts.isIdentifier(prop)) {
        return (
          (obj.text === "window" && prop.text === "location") ||
          (obj.text === "location" &&
            (prop.text === "href" || prop.text === "pathname"))
        );
      }

      // Check for window.location.href
      if (
        ts.isPropertyAccessExpression(obj) &&
        ts.isIdentifier(obj.expression) &&
        ts.isIdentifier(obj.name) &&
        obj.expression.text === "window" &&
        obj.name.text === "location" &&
        ts.isIdentifier(prop) &&
        (prop.text === "href" || prop.text === "pathname")
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze redirect function call
   */
  private analyzeRedirectCall(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(callExpr, sourceFile);
    const context = ASTTraverser.getNodeContext(callExpr, sourceFile);
    const code = ASTTraverser.getNodeText(callExpr, sourceFile);

    // Get method name
    const methodName = this.getRedirectMethodName(callExpr);
    if (!methodName) return null;

    // Analyze arguments for user input
    const userInputAnalysis = this.analyzeRedirectArguments(
      callExpr,
      sourceFile
    );

    if (!userInputAnalysis || userInputAnalysis.userInputSources.length === 0) {
      return null;
    }

    // Check if there's validation
    const hasValidation =
      this.hasValidationInContext(context) ||
      this.hasValidationInFunction(callExpr, sourceFile);

    const confidence = hasValidation
      ? "low"
      : userInputAnalysis.confidence === "high"
      ? "medium"
      : "low";

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
      },
      `${methodName}() called with potentially unvalidated user input: ${userInputAnalysis.userInputSources.join(
        ", "
      )}`,
      "medium",
      confidence,
      {
        method: methodName,
        userInputSources: userInputAnalysis.userInputSources,
        hasValidation,
        riskLevel: userInputAnalysis.riskLevel,
        recommendations: this.generateRedirectRecommendations(
          userInputAnalysis.userInputSources,
          hasValidation
        ),
        detectionMethod: "redirect-call-analysis",
      }
    );
  }

  /**
   * Analyze location assignment
   */
  private analyzeLocationAssignment(
    assignment: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(assignment, sourceFile);
    const context = ASTTraverser.getNodeContext(assignment, sourceFile);
    const code = ASTTraverser.getNodeText(assignment, sourceFile);

    // Analyze right side for user input
    const userInputAnalysis = this.analyzeExpressionForUserInput(
      assignment.right,
      sourceFile
    );

    if (!userInputAnalysis || userInputAnalysis.userInputSources.length === 0) {
      return null;
    }

    // Check if there's validation
    const hasValidation =
      this.hasValidationInContext(context) ||
      this.hasValidationInFunction(assignment, sourceFile);

    const confidence = hasValidation
      ? "low"
      : userInputAnalysis.confidence === "high"
      ? "medium"
      : "low";

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
        functionName: this.extractFunctionFromAST(assignment),
      },
      `window.location assignment with potentially unvalidated user input: ${userInputAnalysis.userInputSources.join(
        ", "
      )}`,
      "medium",
      confidence,
      {
        locationType: "location-assignment",
        userInputSources: userInputAnalysis.userInputSources,
        hasValidation,
        riskLevel: userInputAnalysis.riskLevel,
        recommendations: this.generateRedirectRecommendations(
          userInputAnalysis.userInputSources,
          hasValidation
        ),
        detectionMethod: "location-assignment-analysis",
      }
    );
  }

  /**
   * Get redirect method name
   */
  private getRedirectMethodName(callExpr: ts.CallExpression): string | null {
    if (
      ts.isPropertyAccessExpression(callExpr.expression) &&
      ts.isIdentifier(callExpr.expression.name)
    ) {
      return callExpr.expression.name.text;
    } else if (ts.isIdentifier(callExpr.expression)) {
      return callExpr.expression.text;
    }

    return null;
  }

  /**
   * Analyze redirect function arguments for user input
   */
  private analyzeRedirectArguments(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile
  ): UserInputAnalysis | null {
    const analysis: UserInputAnalysis = {
      userInputSources: [],
      confidence: "low",
      riskLevel: "low",
    };

    if (callExpr.arguments.length > 0) {
      const urlArg = callExpr.arguments[0];
      const urlAnalysis = this.analyzeExpressionForUserInput(
        urlArg,
        sourceFile
      );

      if (urlAnalysis) {
        // Filter out server data sources and data manipulation
        const filteredSources = urlAnalysis.userInputSources.filter(
          (source) =>
            !this.isServerData(source) && !this.isDataManipulation(source)
        );

        if (filteredSources.length > 0) {
          analysis.userInputSources.push(...filteredSources);
          analysis.confidence = urlAnalysis.confidence;
          analysis.riskLevel = urlAnalysis.riskLevel;
        }
      }
    }

    return analysis.userInputSources.length > 0 ? analysis : null;
  }

  /**
   * Analyze expression for user input sources
   */
  private analyzeExpressionForUserInput(
    expr: ts.Expression,
    sourceFile: ts.SourceFile
  ): UserInputAnalysis | null {
    const analysis: UserInputAnalysis = {
      userInputSources: [],
      confidence: "low",
      riskLevel: "low",
    };

    // Check property access expressions (e.g., req.query.redirect)
    if (ts.isPropertyAccessExpression(expr)) {
      const userInputSource = this.extractUserInputFromPropertyAccess(expr);
      if (userInputSource && !this.isDataManipulation(userInputSource)) {
        analysis.userInputSources.push(userInputSource);
        analysis.confidence = "high";
        analysis.riskLevel = this.assessRiskLevel(userInputSource);
      }
    }

    // Check identifiers that might be user input
    else if (ts.isIdentifier(expr)) {
      const name = expr.text.toLowerCase();

      // Skip data manipulation variables
      if (this.isDataManipulation(name)) {
        return null;
      }

      const matchingSource = USER_INPUT_SOURCES.find((source) =>
        name.includes(source.toLowerCase())
      );
      if (matchingSource) {
        analysis.userInputSources.push(name);
        analysis.confidence = "medium";
        analysis.riskLevel = this.assessRiskLevel(name);
      }
    }

    // Check template expressions
    else if (ts.isTemplateExpression(expr)) {
      for (const span of expr.templateSpans) {
        const spanAnalysis = this.analyzeExpressionForUserInput(
          span.expression,
          sourceFile
        );
        if (spanAnalysis) {
          analysis.userInputSources.push(...spanAnalysis.userInputSources);
          analysis.confidence = "medium";
          analysis.riskLevel = "medium";
        }
      }
    }

    return analysis.userInputSources.length > 0 ? analysis : null;
  }

  /**
   * Extract user input source from property access
   */
  private extractUserInputFromPropertyAccess(
    expr: ts.PropertyAccessExpression
  ): string | null {
    const path: string[] = [];
    let current: ts.Expression = expr;

    // Build the property access path
    while (ts.isPropertyAccessExpression(current)) {
      if (ts.isIdentifier(current.name)) {
        path.unshift(current.name.text);
      }
      current = current.expression;
    }

    if (ts.isIdentifier(current)) {
      path.unshift(current.text);
    }

    const fullPath = path.join(".");

    // Check if any part of the path indicates user input
    const hasUserInput = USER_INPUT_SOURCES.some((source) =>
      fullPath.toLowerCase().includes(source.toLowerCase())
    );

    return hasUserInput ? fullPath : null;
  }

  /**
   * Check if the input source is actually data manipulation rather than user input
   */
  private isDataManipulation(inputSource: string): boolean {
    const lowerSource = inputSource.toLowerCase();
    return DATA_MANIPULATION_PATTERNS.some(
      (pattern) =>
        lowerSource.includes(pattern) ||
        lowerSource.replace(/[_-]/g, "").includes(pattern)
    );
  }

  /**
   * Assess risk level based on input source
   */
  private assessRiskLevel(inputSource: string): ConfidenceLevel {
    const lowerSource = inputSource.toLowerCase();

    if (HIGH_RISK_INPUT_SOURCES.some((risk) => lowerSource.includes(risk))) {
      return "high";
    } else if (
      MEDIUM_RISK_INPUT_SOURCES.some((risk) => lowerSource.includes(risk))
    ) {
      return "medium";
    }

    return "low";
  }

  /**
   * Check if validation exists in context
   */
  private hasValidationInContext(context: string): boolean {
    return REDIRECT_GATING_PATTERNS.some((pattern) => pattern.test(context));
  }

  private isServerData(inputSource: string): boolean {
    return SERVER_DATA_INDICATORS.some((indicator) =>
      inputSource.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Check if the method call is actually for array/collection operations, not navigation
   */
  private isArrayMethod(callExpr: ts.CallExpression): boolean {
    if (!ts.isPropertyAccessExpression(callExpr.expression)) {
      return false;
    }

    const obj = callExpr.expression.expression;
    const method = callExpr.expression.name;

    if (!ts.isIdentifier(method)) {
      return false;
    }

    // Check if it's an array method
    if (!ARRAY_METHODS.includes(method.text)) {
      return false;
    }

    // Check if the object appears to be an array/collection
    if (ts.isIdentifier(obj)) {
      const objName = obj.text.toLowerCase();

      return ARRAY_INDICATORS.some((indicator) => objName.includes(indicator));
    }

    return false;
  }

  /**
   * Check if validation exists in the containing function
   */
  private hasValidationInFunction(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): boolean {
    const containingFunction = ASTTraverser.findNearestParent(
      node,
      ts.isFunctionLike
    );
    if (!containingFunction) return false;

    const functionText = ASTTraverser.getNodeText(
      containingFunction,
      sourceFile
    );
    return this.hasValidationInContext(functionText);
  }

  /**
   * Generate security recommendations
   */
  private generateRedirectRecommendations(
    userInputSources: string[],
    hasValidation: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!hasValidation) {
      recommendations.push("Implement URL validation before redirecting");
      recommendations.push("Use allowlist of permitted redirect URLs");
    }

    if (
      userInputSources.some(
        (source) => source.includes("query") || source.includes("params")
      )
    ) {
      recommendations.push("Sanitize URL parameters before using in redirects");
      recommendations.push(
        "Validate that redirect URLs are internal or trusted domains"
      );
    }

    recommendations.push(
      "Consider using relative URLs instead of absolute URLs"
    );
    recommendations.push("Log redirect attempts for security monitoring");

    return recommendations;
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

// Helper interfaces
interface UserInputAnalysis {
  userInputSources: string[];
  confidence: ConfidenceLevel;
  riskLevel: ConfidenceLevel;
}
