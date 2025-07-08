/**
 * Detector for console logging of sensitive data
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { ConfidenceLevel, Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import { CONSOLE_METHODS } from "../constants/debugging.constants";
import {
  CONSOLE_SENSITIVE_KEYWORDS,
  EXPLICIT_SENSITIVE_KEYWORDS,
  POTENTIAL_SENSITIVE_KEYWORDS,
} from "../constants/sensitiveData.constants";

export class ConsoleLoggingDetector extends BaseDetector {
  private static readonly CONSOLE_PATTERNS: PatternDefinition[] = [
    {
      id: "console-log-password",
      name: "Console logging password",
      description:
        "Console logging of password detected - sensitive data should not be logged",
      pattern: {
        type: "regex",
        expression:
          /console\.(log|warn|error|info|debug)\s*\([^)]*password[^)]*\)/gi,
      },
      vulnerabilityType: "console-logging-sensitive",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "console-log-token",
      name: "Console logging token",
      description:
        "Console logging of token detected - sensitive data should not be logged",
      pattern: {
        type: "regex",
        expression:
          /console\.(log|warn|error|info|debug)\s*\([^)]*token[^)]*\)/gi,
      },
      vulnerabilityType: "console-logging-sensitive",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "console-log-secret",
      name: "Console logging secret",
      description:
        "Console logging of secret detected - sensitive data should not be logged",
      pattern: {
        type: "regex",
        expression:
          /console\.(log|warn|error|info|debug)\s*\([^)]*secret[^)]*\)/gi,
      },
      vulnerabilityType: "console-logging-sensitive",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "console-log-key",
      name: "Console logging key",
      description:
        "Console logging of key detected - sensitive data should not be logged",
      pattern: {
        type: "regex",
        expression:
          /console\.(log|warn|error|info|debug)\s*\([^)]*\b(api_?key|private_?key|encryption_?key)\b[^)]*\)/gi,
      },
      vulnerabilityType: "console-logging-sensitive",
      severity: "critical",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "ConsoleLoggingDetector",
      "console-logging-sensitive",
      "critical",
      ConsoleLoggingDetector.CONSOLE_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files (exclude test files as they might legitimately log test data)
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
          this.validateConsoleMatch(match, content)
        );

      // Apply AST-based analysis for more sophisticated detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForConsoleLogging(sf, fp)
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
   * Validate if a pattern match represents actual sensitive console logging
   */
  private validateConsoleMatch(matchResult: any, content: string): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Check if it's in test code (test files might legitimately log test data)
    if (this.isInTestContext(match.context || "")) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for console logging detection
   */
  private analyzeASTForConsoleLogging(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find all console method calls
    const consoleCallExpressions = this.findConsoleCallExpressions(sourceFile);

    for (const callExpr of consoleCallExpressions) {
      const sensitivity = this.analyzeConsoleSensitivity(callExpr, sourceFile);
      if (sensitivity) {
        const location = ASTTraverser.getNodeLocation(callExpr, sourceFile);
        const context = ASTTraverser.getNodeContext(callExpr, sourceFile);
        const code = ASTTraverser.getNodeText(callExpr, sourceFile);

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
            functionName: this.extractFunctionFromAST(callExpr),
          },
          sensitivity.description,
          "critical",
          sensitivity.confidence,
          {
            consoleMethod: sensitivity.method,
            sensitiveVariables: sensitivity.sensitiveVariables,
            detectionMethod: "ast-analysis",
          }
        );

        vulnerabilities.push(vulnerability);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find all console method call expressions
   */
  private findConsoleCallExpressions(
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
          obj.text === "console" &&
          ts.isIdentifier(method) &&
          this.isConsoleMethod(method.text)
        );
      }
      return false;
    });
  }

  /**
   * Check if method name is a console logging method
   */
  private isConsoleMethod(methodName: string): boolean {
    return CONSOLE_METHODS.includes(methodName);
  }

  /**
   * Analyze console call for sensitivity
   */
  private analyzeConsoleSensitivity(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile
  ): {
    description: string;
    confidence: ConfidenceLevel;
    method: string;
    sensitiveVariables: string[];
  } | null {
    const methodName = this.getConsoleMethodName(callExpr);
    if (!methodName) return null;

    const sensitiveVariables: string[] = [];
    const argumentTexts: string[] = [];

    // Analyze each argument to the console call
    for (const arg of callExpr.arguments) {
      const argText = ASTTraverser.getNodeText(arg, sourceFile);
      argumentTexts.push(argText);

      // Check for sensitive variable names
      const sensitiveVars = this.extractSensitiveVariables(arg, sourceFile);
      sensitiveVariables.push(...sensitiveVars);
    }

    if (sensitiveVariables.length === 0) {
      return null;
    }

    // Determine confidence based on how explicit the sensitive data logging is
    let confidence: ConfidenceLevel = "medium";

    // High confidence if variable names are explicitly sensitive
    if (sensitiveVariables.some((v) => this.isExplicitlySensitive(v))) {
      confidence = "high";
    }

    // Medium confidence if only potentially sensitive
    if (sensitiveVariables.every((v) => this.isPotentiallySensitive(v))) {
      confidence = "medium";
    }

    return {
      description: `Console.${methodName}() logging potentially sensitive data: ${sensitiveVariables.join(
        ", "
      )}`,
      confidence,
      method: methodName,
      sensitiveVariables,
    };
  }

  /**
   * Extract console method name from call expression
   */
  private getConsoleMethodName(callExpr: ts.CallExpression): string | null {
    if (
      ts.isPropertyAccessExpression(callExpr.expression) &&
      ts.isIdentifier(callExpr.expression.name)
    ) {
      return callExpr.expression.name.text;
    }
    return null;
  }

  /**
   * Extract sensitive variable names from an argument expression
   */
  private extractSensitiveVariables(
    expr: ts.Expression,
    sourceFile: ts.SourceFile
  ): string[] {
    const sensitiveVars: string[] = [];

    // Handle different expression types
    if (ts.isIdentifier(expr)) {
      if (this.isSensitiveVariableName(expr.text)) {
        sensitiveVars.push(expr.text);
      }
    } else if (ts.isPropertyAccessExpression(expr)) {
      const propertyName = ts.isIdentifier(expr.name) ? expr.name.text : "";
      if (this.isSensitiveVariableName(propertyName)) {
        sensitiveVars.push(propertyName);
      }
    } else if (ts.isObjectLiteralExpression(expr)) {
      // Check object properties
      for (const prop of expr.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          if (this.isSensitiveVariableName(prop.name.text)) {
            sensitiveVars.push(prop.name.text);
          }
        }
      }
    } else if (ts.isTemplateExpression(expr)) {
      // Check template literal expressions for variable references
      for (const span of expr.templateSpans) {
        const spanVars = this.extractSensitiveVariables(
          span.expression,
          sourceFile
        );
        sensitiveVars.push(...spanVars);
      }
    }

    return sensitiveVars;
  }

  /**
   * Check if variable name suggests sensitive data
   */
  private isSensitiveVariableName(name: string): boolean {
    const lowerName = name.toLowerCase();
    return CONSOLE_SENSITIVE_KEYWORDS.some(
      (keyword) =>
        lowerName.includes(keyword) ||
        lowerName.replace(/[_-]/g, "").includes(keyword.replace(/[_-]/g, ""))
    );
  }

  /**
   * Check if variable name is explicitly sensitive (high confidence)
   */
  private isExplicitlySensitive(name: string): boolean {
    const lowerName = name.toLowerCase();
    return EXPLICIT_SENSITIVE_KEYWORDS.some((keyword) =>
      lowerName.includes(keyword)
    );
  }

  /**
   * Check if variable name is potentially sensitive (medium confidence)
   */
  private isPotentiallySensitive(name: string): boolean {
    const lowerName = name.toLowerCase();
    return POTENTIAL_SENSITIVE_KEYWORDS.some((keyword) =>
      lowerName.includes(keyword)
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
