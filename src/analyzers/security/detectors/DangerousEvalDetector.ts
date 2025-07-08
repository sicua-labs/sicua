/**
 * Detector for dangerous eval() usage and similar code execution vulnerabilities
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { ConfidenceLevel, Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";

export class DangerousEvalDetector extends BaseDetector {
  private static readonly EVAL_PATTERNS: PatternDefinition[] = [
    {
      id: "direct-eval",
      name: "Direct eval() usage",
      description:
        "Direct use of eval() function detected - this can lead to code injection vulnerabilities",
      pattern: {
        type: "regex",
        expression: /\beval\s*\(/g,
      },
      vulnerabilityType: "dangerous-eval",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "function-constructor",
      name: "Function constructor usage",
      description:
        "Use of Function() constructor detected - this can lead to code injection vulnerabilities",
      pattern: {
        type: "regex",
        expression: /\bnew\s+Function\s*\(/g,
      },
      vulnerabilityType: "dangerous-eval",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "settimeout-string",
      name: "setTimeout with string argument",
      description:
        "setTimeout() with string argument detected - use function instead to avoid code injection",
      pattern: {
        type: "regex",
        expression: /setTimeout\s*\(\s*['"`]/g,
      },
      vulnerabilityType: "dangerous-eval",
      severity: "critical",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "setinterval-string",
      name: "setInterval with string argument",
      description:
        "setInterval() with string argument detected - use function instead to avoid code injection",
      pattern: {
        type: "regex",
        expression: /setInterval\s*\(\s*['"`]/g,
      },
      vulnerabilityType: "dangerous-eval",
      severity: "critical",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "execscript",
      name: "execScript usage",
      description:
        "execScript() usage detected - this is deprecated and dangerous",
      pattern: {
        type: "regex",
        expression: /\bexecScript\s*\(/g,
      },
      vulnerabilityType: "dangerous-eval",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "DangerousEvalDetector",
      "dangerous-eval",
      "critical",
      DangerousEvalDetector.EVAL_PATTERNS
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

      // Apply pattern matching for basic detection
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateEvalMatch(match)
        );

      // Apply AST-based analysis for more sophisticated detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForDangerousEval(sf, fp)
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
   * Validate if a pattern match is actually dangerous eval usage
   */
  private validateEvalMatch(matchResult: any): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Check if it's in a string literal (not actual code)
    if (this.isInStringLiteral(match.context || "", match.match)) {
      return false;
    }

    // Check if it's in test files or documentation
    if (this.isInTestContext(match.context || "")) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for sophisticated eval detection
   */
  private analyzeASTForDangerousEval(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find all call expressions
    const callExpressions = ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression
    );
    const newExpressions = ASTTraverser.findNodesByKind<ts.NewExpression>(
      sourceFile,
      ts.SyntaxKind.NewExpression
    );

    for (const callExpr of callExpressions) {
      const vulnInfo = this.analyzeCallExpression(callExpr, sourceFile);
      if (vulnInfo) {
        const location = ASTTraverser.getNodeLocation(callExpr, sourceFile);
        const context = ASTTraverser.getNodeContext(callExpr, sourceFile);

        const vulnerability = this.createVulnerability(
          filePath,
          {
            line: location.line,
            column: location.column,
            endLine: location.line,
            endColumn: location.column + vulnInfo.codeSnippet.length,
          },
          {
            code: vulnInfo.codeSnippet,
            surroundingContext: context,
            functionName: this.extractFunctionFromAST(callExpr),
            componentName: this.extractComponentName(filePath),
          },
          vulnInfo.description,
          "critical",
          vulnInfo.confidence,
          {
            functionName: vulnInfo.functionName,
            argumentType: vulnInfo.argumentType,
            detectionMethod: "ast-analysis",
          }
        );

        vulnerabilities.push(vulnerability);
      }
    }

    for (const newExpr of newExpressions) {
      const vulnInfo = this.analyzeNewExpression(newExpr, sourceFile);
      if (vulnInfo) {
        const location = ASTTraverser.getNodeLocation(newExpr, sourceFile);
        const context = ASTTraverser.getNodeContext(newExpr, sourceFile);

        const vulnerability = this.createVulnerability(
          filePath,
          {
            line: location.line,
            column: location.column,
            endLine: location.line,
            endColumn: location.column + vulnInfo.codeSnippet.length,
          },
          {
            code: vulnInfo.codeSnippet,
            surroundingContext: context,
            functionName: this.extractFunctionFromAST(newExpr),
            componentName: this.extractComponentName(filePath),
          },
          vulnInfo.description,
          "critical",
          vulnInfo.confidence,
          {
            functionName: vulnInfo.functionName,
            argumentType: vulnInfo.argumentType,
            detectionMethod: "ast-analysis",
          }
        );

        vulnerabilities.push(vulnerability);
      }
    }

    return vulnerabilities;
  }

  /**
   * Fixed analyzeCallExpression function - properly handles CallExpression vs NewExpression
   */

  private analyzeCallExpression(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile
  ): {
    description: string;
    confidence: ConfidenceLevel;
    codeSnippet: string;
    functionName: string;
    argumentType: string;
  } | null {
    const callText = ASTTraverser.getNodeText(callExpr, sourceFile);

    // Check for direct eval() calls
    if (
      ts.isIdentifier(callExpr.expression) &&
      callExpr.expression.text === "eval"
    ) {
      return {
        description:
          "Direct eval() call detected - this allows arbitrary code execution",
        confidence: "high",
        codeSnippet: callText,
        functionName: "eval",
        argumentType: this.getArgumentType(callExpr.arguments[0]),
      };
    }

    // Check for setTimeout/setInterval with string arguments
    if (ts.isIdentifier(callExpr.expression)) {
      const funcName = callExpr.expression.text;
      if (
        (funcName === "setTimeout" || funcName === "setInterval") &&
        callExpr.arguments.length > 0
      ) {
        const firstArg = callExpr.arguments[0];
        if (ts.isStringLiteral(firstArg) || this.isStringVariable(firstArg)) {
          return {
            description: `${funcName}() with string argument detected - use function instead to avoid code injection`,
            confidence: "medium",
            codeSnippet: callText,
            functionName: funcName,
            argumentType: "string",
          };
        }
      }
    }

    // Check for execScript (IE-specific)
    if (
      ts.isIdentifier(callExpr.expression) &&
      callExpr.expression.text === "execScript"
    ) {
      return {
        description:
          "execScript() usage detected - this is deprecated and dangerous",
        confidence: "high",
        codeSnippet: callText,
        functionName: "execScript",
        argumentType: this.getArgumentType(callExpr.arguments[0]),
      };
    }

    return null;
  }

  /**
   * Separate function to analyze NewExpression for Function constructor
   */
  private analyzeNewExpression(
    newExpr: ts.NewExpression,
    sourceFile: ts.SourceFile
  ): {
    description: string;
    confidence: ConfidenceLevel;
    codeSnippet: string;
    functionName: string;
    argumentType: string;
  } | null {
    const callText = ASTTraverser.getNodeText(newExpr, sourceFile);

    // Check for Function constructor
    if (
      ts.isIdentifier(newExpr.expression) &&
      newExpr.expression.text === "Function"
    ) {
      return {
        description:
          "Function() constructor usage detected - this allows arbitrary code execution",
        confidence: "high",
        codeSnippet: callText,
        functionName: "Function",
        argumentType: this.getArgumentType(newExpr.arguments?.[0]),
      };
    }

    return null;
  }

  /**
   * Get the type of an argument for better context
   */
  private getArgumentType(arg: ts.Expression | undefined): string {
    if (!arg) return "unknown";

    if (ts.isStringLiteral(arg)) return "string-literal";
    if (ts.isIdentifier(arg)) return "identifier";
    if (ts.isCallExpression(arg)) return "function-call";
    if (ts.isBinaryExpression(arg)) return "expression";
    if (ts.isTemplateExpression(arg)) return "template-literal";

    return "unknown";
  }

  /**
   * Check if an expression represents a string variable
   */
  private isStringVariable(expr: ts.Expression): boolean {
    // This is a simplified check - in a real implementation,
    // you might want to use the TypeChecker for more accurate type information
    if (ts.isIdentifier(expr)) {
      const name = expr.text.toLowerCase();
      return (
        name.includes("code") ||
        name.includes("script") ||
        name.includes("eval")
      );
    }
    return false;
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

  /**
   * Check if text is inside a string literal
   */
  private isInStringLiteral(context: string, text: string): boolean {
    const textIndex = context.indexOf(text);
    if (textIndex === -1) return false;

    const beforeText = context.substring(0, textIndex);
    const quotes = (beforeText.match(/["'`]/g) || []).length;

    // If odd number of quotes before the text, it's inside a string
    return quotes % 2 === 1;
  }
}
