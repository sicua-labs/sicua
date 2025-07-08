/**
 * Detector for debug code and development flags in production code
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import {
  DEBUG_CONSOLE_METHODS,
  ENV_GATING_PATTERNS,
} from "../constants/debugging.constants";
import { DEVELOPMENT_FLAGS } from "../constants/environment.constants";
import { DEVELOPMENT_GATING_PATTERNS } from "../constants/security.constants";

export class DebugCodeDetector extends BaseDetector {
  private static readonly DEBUG_PATTERNS: PatternDefinition[] = [
    {
      id: "debugger-statement",
      name: "debugger statement",
      description:
        "debugger statement detected - this should be removed before production",
      pattern: {
        type: "regex",
        expression: /\bdebugger\s*;?/g,
      },
      vulnerabilityType: "debug-code",
      severity: "high",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "debug-flag-true",
      name: "Debug flag set to true",
      description:
        "Debug flag permanently set to true - this may expose debug information in production",
      pattern: {
        type: "regex",
        expression:
          /(?:debug|DEBUG|isDebug|debugMode|isDev|devMode)\s*[:=]\s*true/g,
      },
      vulnerabilityType: "debug-code",
      severity: "high",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "console-debug-methods",
      name: "Console debug methods",
      description:
        "Debug console methods detected - these should be removed or properly gated in production",
      pattern: {
        type: "regex",
        expression:
          /console\.(debug|trace|group|groupCollapsed|groupEnd|time|timeEnd|profile|profileEnd)/g,
      },
      vulnerabilityType: "debug-code",
      severity: "high",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "development-only-code",
      name: "Development-only code",
      description:
        "Development-only code block detected - verify this is properly gated for production",
      pattern: {
        type: "regex",
        expression:
          /if\s*\(\s*(?:process\.env\.NODE_ENV\s*===?\s*['"]development['"]|isDev|isDebug|debugMode)\s*\)/g,
      },
      vulnerabilityType: "debug-code",
      severity: "high",
      confidence: "low",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "DebugCodeDetector",
      "debug-code",
      "high",
      DebugCodeDetector.DEBUG_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files (exclude test files as they may legitimately contain debug code)
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
          this.validateDebugMatch(match)
        );

      // Apply AST-based analysis for more sophisticated detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForDebugCode(sf, fp)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Adjust confidence based on file context
      const fileContext = this.getFileContext(filePath, content);
      for (const vuln of patternVulnerabilities) {
        // Lower confidence for development/config files
        if (
          fileContext.fileType === "config" ||
          filePath.includes("dev") ||
          filePath.includes("development")
        ) {
          vuln.confidence = "low";
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
   * Validate if a debug code match is problematic
   */
  private validateDebugMatch(matchResult: any): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment (comments with TODO/FIXME are still flagged)
    if (this.isInComment(match.context || "", match.match)) {
      // Allow TODO/FIXME in comments but flag debugger statements
      return match.match.includes("debugger");
    }

    // Check if it's properly gated by environment checks
    if (this.isProperlyGated(match.context || "")) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for debug code detection
   */
  private analyzeASTForDebugCode(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find debugger statements
    const debuggerStatements = this.findDebuggerStatements(sourceFile);
    for (const debugStmt of debuggerStatements) {
      const debugVuln = this.analyzeDebuggerStatement(
        debugStmt,
        sourceFile,
        filePath
      );
      if (debugVuln) {
        vulnerabilities.push(debugVuln);
      }
    }

    // Find debug-related variables and flags
    const debugVariables = this.findDebugVariables(sourceFile);
    for (const debugVar of debugVariables) {
      const debugVuln = this.analyzeDebugVariable(
        debugVar,
        sourceFile,
        filePath
      );
      if (debugVuln) {
        vulnerabilities.push(debugVuln);
      }
    }

    // Find console debug methods
    const consoleDebugCalls = this.findConsoleDebugCalls(sourceFile);
    for (const consoleCall of consoleDebugCalls) {
      const consoleVuln = this.analyzeConsoleDebugCall(
        consoleCall,
        sourceFile,
        filePath
      );
      if (consoleVuln) {
        vulnerabilities.push(consoleVuln);
      }
    }

    // Find development-only code blocks
    const devCodeBlocks = this.findDevelopmentCodeBlocks(sourceFile);
    for (const devBlock of devCodeBlocks) {
      const devVuln = this.analyzeDevelopmentCodeBlock(
        devBlock,
        sourceFile,
        filePath
      );
      if (devVuln) {
        vulnerabilities.push(devVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find debugger statements
   */
  private findDebuggerStatements(
    sourceFile: ts.SourceFile
  ): ts.DebuggerStatement[] {
    return ASTTraverser.findNodesByKind<ts.DebuggerStatement>(
      sourceFile,
      ts.SyntaxKind.DebuggerStatement
    );
  }

  /**
   * Find debug-related variables
   */
  private findDebugVariables(
    sourceFile: ts.SourceFile
  ): ts.VariableDeclaration[] {
    return ASTTraverser.findNodesByKind<ts.VariableDeclaration>(
      sourceFile,
      ts.SyntaxKind.VariableDeclaration,
      (node) => {
        if (ts.isIdentifier(node.name)) {
          return this.isDebugRelatedVariable(node.name.text);
        }
        return false;
      }
    );
  }

  /**
   * Find console debug method calls
   */
  private findConsoleDebugCalls(
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
            obj.text === "console" &&
            ts.isIdentifier(method) &&
            DEBUG_CONSOLE_METHODS.includes(method.text)
          );
        }
        return false;
      }
    );
  }

  /**
   * Find development-only code blocks
   */
  private findDevelopmentCodeBlocks(
    sourceFile: ts.SourceFile
  ): ts.IfStatement[] {
    return ASTTraverser.findNodesByKind<ts.IfStatement>(
      sourceFile,
      ts.SyntaxKind.IfStatement,
      (node) => this.isDevelopmentOnlyCondition(node.expression)
    );
  }

  /**
   * Analyze debugger statement
   */
  private analyzeDebuggerStatement(
    debugStmt: ts.DebuggerStatement,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability {
    const location = ASTTraverser.getNodeLocation(debugStmt, sourceFile);
    const context = ASTTraverser.getNodeContext(debugStmt, sourceFile);
    const code = ASTTraverser.getNodeText(debugStmt, sourceFile);

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
        functionName: this.extractFunctionFromAST(debugStmt),
      },
      "debugger statement found - this should be removed before production deployment",
      "high",
      "high",
      {
        debugType: "debugger-statement",
        suggestion: "Remove debugger statement before production deployment",
        detectionMethod: "ast-analysis",
      }
    );
  }

  /**
   * Analyze debug variable
   */
  private analyzeDebugVariable(
    debugVar: ts.VariableDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (!ts.isIdentifier(debugVar.name)) return null;

    const varName = debugVar.name.text;
    const location = ASTTraverser.getNodeLocation(debugVar, sourceFile);
    const context = ASTTraverser.getNodeContext(debugVar, sourceFile);
    const code = ASTTraverser.getNodeText(debugVar, sourceFile);

    // Check if it's set to true or a truthy value
    const isSetToTrue = this.isVariableSetToTrue(debugVar);
    const isProperlyGated = this.isProperlyGated(context);

    if (isSetToTrue && !isProperlyGated) {
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
          functionName: this.extractFunctionFromAST(debugVar),
        },
        `Debug variable '${varName}' is permanently set to true - this may expose debug information in production`,
        "high",
        isProperlyGated ? "low" : "medium",
        {
          debugType: "debug-variable",
          variableName: varName,
          isGated: isProperlyGated,
          suggestion:
            "Ensure debug variables are properly gated by environment checks",
          detectionMethod: "ast-analysis",
        }
      );
    }

    return null;
  }

  /**
   * Analyze console debug call
   */
  private analyzeConsoleDebugCall(
    consoleCall: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const methodName = this.getConsoleMethodName(consoleCall);
    if (!methodName) return null;

    const location = ASTTraverser.getNodeLocation(consoleCall, sourceFile);
    const context = ASTTraverser.getNodeContext(consoleCall, sourceFile);
    const code = ASTTraverser.getNodeText(consoleCall, sourceFile);

    const isProperlyGated = this.isProperlyGated(context);

    // If properly gated with development checks, lower the severity
    const severity = isProperlyGated ? "medium" : "high";
    const confidence = isProperlyGated ? "low" : "medium";

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
        functionName: this.extractFunctionFromAST(consoleCall),
      },
      `console.${methodName}() call detected - debug console methods should be removed or gated in production`,
      severity,
      confidence,
      {
        debugType: "console-debug",
        methodName,
        isGated: isProperlyGated,
        suggestion:
          "Remove debug console methods or gate them with environment checks",
        detectionMethod: "ast-analysis",
      }
    );
  }

  /**
   * Analyze development code block
   */
  private analyzeDevelopmentCodeBlock(
    ifStmt: ts.IfStatement,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(ifStmt, sourceFile);
    const context = ASTTraverser.getNodeContext(ifStmt, sourceFile);
    const code = ASTTraverser.getNodeText(ifStmt.expression, sourceFile);

    // Check if this is a proper development gating pattern
    const isProperGating = DEVELOPMENT_GATING_PATTERNS.some((pattern) =>
      pattern.test(code)
    );

    // Don't flag proper development gating patterns
    if (isProperGating) {
      return null;
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
        functionName: this.extractFunctionFromAST(ifStmt),
      },
      "Development-only code block detected - verify this is properly implemented for production",
      "high",
      "low",
      {
        debugType: "development-block",
        condition: code,
        suggestion:
          "Verify development checks are correct and code is properly gated",
        detectionMethod: "ast-analysis",
      }
    );
  }

  /**
   * Check if variable name is debug-related
   */
  private isDebugRelatedVariable(name: string): boolean {
    const lowerName = name.toLowerCase();
    return DEVELOPMENT_FLAGS.some(
      (flag) =>
        lowerName.includes(flag.toLowerCase()) ||
        lowerName
          .replace(/[_-]/g, "")
          .includes(flag.toLowerCase().replace(/[_-]/g, ""))
    );
  }

  /**
   * Check if variable is set to true
   */
  private isVariableSetToTrue(varDecl: ts.VariableDeclaration): boolean {
    if (varDecl.initializer) {
      if (varDecl.initializer.kind === ts.SyntaxKind.TrueKeyword) {
        return true;
      }
      if (
        ts.isStringLiteral(varDecl.initializer) &&
        (varDecl.initializer.text === "true" ||
          varDecl.initializer.text === "1")
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if condition is development-only
   */
  private isDevelopmentOnlyCondition(expr: ts.Expression): boolean {
    const exprText = expr.getText();
    return DEVELOPMENT_FLAGS.some((flag) => exprText.includes(flag));
  }

  /**
   * Get console method name
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
   * Check if debug code is properly gated by environment checks
   */
  private isProperlyGated(context: string): boolean {
    return DEVELOPMENT_GATING_PATTERNS.some((pattern) => pattern.test(context));
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
