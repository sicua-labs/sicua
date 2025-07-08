/**
 * Detector for Regular Expression Denial of Service (ReDoS) vulnerabilities
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { ConfidenceLevel, Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";

export class RedosPatternDetector extends BaseDetector {
  private static readonly REDOS_PATTERNS: PatternDefinition[] = [
    {
      id: "regex-exponential-backtrack",
      name: "Exponential backtracking regex",
      description:
        "Regular expression with exponential backtracking pattern detected - vulnerable to ReDoS attacks",
      pattern: {
        type: "regex",
        expression: /\([^)]*\+[^)]*\)\+|\([^)]*\*[^)]*\)\*|\([^)]*\+[^)]*\)\{/g,
      },
      vulnerabilityType: "redos-vulnerability",
      severity: "high",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "regex-nested-quantifiers",
      name: "Nested quantifiers regex",
      description:
        "Regular expression with nested quantifiers detected - may cause ReDoS",
      pattern: {
        type: "regex",
        expression:
          /\([^)]*[\+\*]\)[^)]*[\+\*]|\([^)]*\{[^}]*\}[^)]*\)[^)]*[\+\*]/g,
      },
      vulnerabilityType: "redos-vulnerability",
      severity: "medium",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  // Known dangerous regex patterns that cause exponential backtracking
  private static readonly DANGEROUS_PATTERNS = [
    // Classic exponential patterns
    /^\(a\+\)\+$/, // (a+)+
    /^\(a\*\)\*$/, // (a*)*
    /^\(a\|\*\)\*$/, // (a|*)*
    /^\(a\|a\)\*$/, // (a|a)*

    // Nested quantifiers
    /\([^)]*\+[^)]*\)\+/, // (pattern+)+
    /\([^)]*\*[^)]*\)\*/, // (pattern*)*
    /\([^)]*\+[^)]*\)\{/, // (pattern+){n,m}
    /\([^)]*\*[^)]*\)\{/, // (pattern*){n,m}

    // Alternation with overlap
    /\([^|)]*\|[^|)]*\)[\+\*]/, // (a|b)+

    // Complex nested structures
    /\([^)]*\([^)]*[\+\*][^)]*\)[^)]*\)[\+\*]/, // nested groups with quantifiers

    // Catastrophic backtracking patterns
    /\^[^$]*\([^)]*\+[^)]*\)[^$]*\$/, // ^...(pattern+)...$
  ];

  constructor() {
    super(
      "RedosPatternDetector",
      "redos-vulnerability",
      "high",
      RedosPatternDetector.REDOS_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files
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

      // Only use AST-based analysis for accurate regex detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForRedosPatterns(sf, fp)
        );

        // Adjust confidence based on file context and validate
        const fileContext = this.getFileContext(filePath, content);
        for (const vuln of astVulnerabilities) {
          vuln.confidence = this.adjustConfidenceBasedOnContext(
            vuln,
            fileContext
          );

          if (this.validateVulnerability(vuln)) {
            vulnerabilities.push(vuln);
          }
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * AST-based analysis for ReDoS patterns
   */
  private analyzeASTForRedosPatterns(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find regex literals (/pattern/flags)
    const regexLiterals = this.findRegexLiterals(sourceFile);
    for (const regexLiteral of regexLiterals) {
      const redosVuln = this.analyzeRegexLiteral(
        regexLiteral,
        sourceFile,
        filePath
      );
      if (redosVuln) {
        vulnerabilities.push(redosVuln);
      }
    }

    // Find RegExp constructor calls (new RegExp("pattern"))
    const regexpConstructors = this.findRegExpConstructors(sourceFile);
    for (const regexpConstructor of regexpConstructors) {
      const redosVuln = this.analyzeRegExpConstructor(
        regexpConstructor,
        sourceFile,
        filePath
      );
      if (redosVuln) {
        vulnerabilities.push(redosVuln);
      }
    }

    // Find string.match(), string.replace() with regex patterns
    const regexMethodCalls = this.findRegexMethodCalls(sourceFile);
    for (const methodCall of regexMethodCalls) {
      const methodVuln = this.analyzeRegexMethodCall(
        methodCall,
        sourceFile,
        filePath
      );
      if (methodVuln) {
        vulnerabilities.push(methodVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find method calls that use regex patterns
   */
  private findRegexMethodCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        if (ts.isPropertyAccessExpression(node.expression)) {
          const method = node.expression.name;
          if (ts.isIdentifier(method)) {
            const methodName = method.text;
            return [
              "match",
              "replace",
              "test",
              "exec",
              "search",
              "split",
            ].includes(methodName);
          }
        }
        return false;
      }
    );
  }

  /**
   * Analyze regex method calls
   */
  private analyzeRegexMethodCall(
    methodCall: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (methodCall.arguments.length === 0) return null;

    const firstArg = methodCall.arguments[0];

    // Only analyze if the first argument is a regex literal
    if (ts.isRegularExpressionLiteral(firstArg)) {
      return this.analyzeRegexLiteral(firstArg, sourceFile, filePath);
    }

    return null;
  }

  /**
   * Improved regex analysis with better pattern detection
   */
  private analyzeRegexForReDoS(pattern: string): {
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    confidence: ConfidenceLevel;
    type: string;
    complexityEstimate: string;
    recommendations: string[];
  } | null {
    // More precise dangerous pattern detection
    const exponentialPatterns = [
      /\([^)]*[+*][^)]*\)[+*]/, // (a+)+ or (a*)*
      /\([^)]*[+*][^)]*\)\{[0-9,]+\}/, // (a+){2,}
      /\([^)]*\|[^)]*\)[+*]/, // (a|b)+
    ];

    const nestedQuantifierPatterns = [
      /\([^)]*\([^)]*[+*][^)]*\)[^)]*\)[+*]/, // ((a+)b)+
      /\([^)]*[+*][^)]*\)[+*]/, // (a+)+
    ];

    // Check for exponential backtracking
    for (const expPattern of exponentialPatterns) {
      if (expPattern.test(pattern)) {
        return {
          description: `Regular expression contains exponential backtracking pattern: ${pattern}`,
          severity: "high",
          confidence: "high",
          type: "exponential-backtracking",
          complexityEstimate: "O(2^n)",
          recommendations: [
            "Rewrite regex to avoid nested quantifiers",
            "Use atomic groups or possessive quantifiers",
            "Add input length limits",
            "Consider using a parsing library instead",
          ],
        };
      }
    }

    // Check for nested quantifiers
    for (const nestedPattern of nestedQuantifierPatterns) {
      if (nestedPattern.test(pattern)) {
        return {
          description: `Regular expression contains nested quantifiers: ${pattern}`,
          severity: "medium",
          confidence: "high",
          type: "nested-quantifiers",
          complexityEstimate: "O(n^k)",
          recommendations: [
            "Simplify nested quantifier structure",
            "Test with long input strings",
            "Consider breaking into multiple simpler patterns",
          ],
        };
      }
    }

    return null;
  }

  /**
   * Find regex literal expressions
   */
  private findRegexLiterals(
    sourceFile: ts.SourceFile
  ): ts.RegularExpressionLiteral[] {
    return ASTTraverser.findNodesByKind<ts.RegularExpressionLiteral>(
      sourceFile,
      ts.SyntaxKind.RegularExpressionLiteral
    );
  }

  /**
   * Find RegExp constructor calls
   */
  private findRegExpConstructors(
    sourceFile: ts.SourceFile
  ): ts.NewExpression[] {
    return ASTTraverser.findNodesByKind<ts.NewExpression>(
      sourceFile,
      ts.SyntaxKind.NewExpression,
      (node) => {
        return (
          ts.isIdentifier(node.expression) && node.expression.text === "RegExp"
        );
      }
    );
  }

  /**
   * Analyze regex literal for ReDoS patterns
   */
  private analyzeRegexLiteral(
    regexLiteral: ts.RegularExpressionLiteral,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const regexText = regexLiteral.text;
    const regexPattern = this.extractRegexPattern(regexText);

    if (!regexPattern) return null;

    const redosAnalysis = this.analyzeRegexForReDoS(regexPattern);

    if (!redosAnalysis) return null;

    const location = ASTTraverser.getNodeLocation(regexLiteral, sourceFile);
    const context = ASTTraverser.getNodeContext(regexLiteral, sourceFile);
    const code = ASTTraverser.getNodeText(regexLiteral, sourceFile);

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
        functionName: this.extractFunctionFromAST(regexLiteral),
      },
      redosAnalysis.description,
      redosAnalysis.severity,
      redosAnalysis.confidence,
      {
        regexPattern,
        vulnerabilityType: redosAnalysis.type,
        complexityEstimate: redosAnalysis.complexityEstimate,
        recommendations: redosAnalysis.recommendations,
        detectionMethod: "regex-literal-analysis",
      }
    );
  }

  /**
   * Analyze RegExp constructor for ReDoS patterns
   */
  private analyzeRegExpConstructor(
    regexpConstructor: ts.NewExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (
      !regexpConstructor.arguments ||
      regexpConstructor.arguments.length === 0
    ) {
      return null;
    }

    const firstArg = regexpConstructor.arguments[0];
    if (!ts.isStringLiteral(firstArg)) {
      return null; // Can't analyze dynamic patterns
    }

    const regexPattern = firstArg.text;
    const redosAnalysis = this.analyzeRegexForReDoS(regexPattern);

    if (!redosAnalysis) return null;

    const location = ASTTraverser.getNodeLocation(
      regexpConstructor,
      sourceFile
    );
    const context = ASTTraverser.getNodeContext(regexpConstructor, sourceFile);
    const code = ASTTraverser.getNodeText(regexpConstructor, sourceFile);

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
        functionName: this.extractFunctionFromAST(regexpConstructor),
      },
      redosAnalysis.description,
      redosAnalysis.severity,
      redosAnalysis.confidence,
      {
        regexPattern,
        vulnerabilityType: redosAnalysis.type,
        complexityEstimate: redosAnalysis.complexityEstimate,
        recommendations: redosAnalysis.recommendations,
        detectionMethod: "regexp-constructor-analysis",
      }
    );
  }

  /**
   * Extract regex pattern from literal text
   */
  private extractRegexPattern(regexText: string): string | null {
    // Remove the surrounding / and flags
    const match = regexText.match(/^\/(.*)\/[gimuy]*$/);
    return match ? match[1] : null;
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
