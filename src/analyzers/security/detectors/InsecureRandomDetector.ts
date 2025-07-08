/**
 * Detector for insecure random number generation in security contexts
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { ConfidenceLevel, Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import {
  SECURE_RANDOM_ALTERNATIVES,
  SECURITY_CONTEXTS,
  SECURITY_FUNCTIONS,
  UI_FUNCTION_PATTERNS,
  UI_VISUAL_CONTEXTS,
} from "../constants/security.constants";

export class InsecureRandomDetector extends BaseDetector {
  private static readonly RANDOM_PATTERNS: PatternDefinition[] = [
    {
      id: "math-random-security",
      name: "Math.random() in security context",
      description:
        "Math.random() used in security context - use cryptographically secure random instead",
      pattern: {
        type: "regex",
        expression: /Math\.random\s*\(\s*\)/g,
      },
      vulnerabilityType: "insecure-random",
      severity: "high",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "date-now-random",
      name: "Date.now() used for randomness",
      description:
        "Date.now() used for randomness - this is predictable and insecure",
      pattern: {
        type: "regex",
        expression: /Date\.now\s*\(\s*\)\s*%/g,
      },
      vulnerabilityType: "insecure-random",
      severity: "high",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "InsecureRandomDetector",
      "insecure-random",
      "high",
      InsecureRandomDetector.RANDOM_PATTERNS
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

      // Check if file has secure random alternatives
      const hasSecureAlternatives = this.detectSecureRandomUsage(content);

      // Apply pattern matching
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateRandomMatch(match)
        );

      // Apply AST-based analysis for context-aware detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) =>
            this.analyzeASTForInsecureRandom(sf, fp, hasSecureAlternatives)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Adjust confidence based on file context and security usage
      const fileContext = this.getFileContext(filePath, content);
      for (const vuln of patternVulnerabilities) {
        // Increase confidence if file handles sensitive data
        if (
          fileContext.handlesSensitiveData ||
          fileContext.riskContexts.includes("authentication")
        ) {
          vuln.confidence = "high";
        }

        // Add metadata about secure alternatives if not already used
        if (hasSecureAlternatives.length === 0) {
          vuln.metadata = {
            ...vuln.metadata,
            secureAlternatives: SECURE_RANDOM_ALTERNATIVES,
            note: "Consider using cryptographically secure random generation",
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
   * Detect usage of secure random alternatives in the file
   */
  private detectSecureRandomUsage(content: string): string[] {
    const foundAlternatives: string[] = [];

    for (const alternative of SECURE_RANDOM_ALTERNATIVES) {
      if (content.includes(alternative)) {
        foundAlternatives.push(alternative);
      }
    }

    return foundAlternatives;
  }

  /**
   * Validate if a random pattern match is in a security context
   */
  private validateRandomMatch(matchResult: any): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Check if it's in a security context
    return this.isInSecurityContext(match.context || "");
  }

  /**
   * AST-based analysis for insecure random usage
   */
  private analyzeASTForInsecureRandom(
    sourceFile: ts.SourceFile,
    filePath: string,
    secureAlternatives: string[]
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find Math.random() calls
    const mathRandomCalls = this.findMathRandomCalls(sourceFile);

    for (const randomCall of mathRandomCalls) {
      const securityContext = this.analyzeRandomSecurityContext(
        randomCall,
        sourceFile
      );

      if (securityContext) {
        const location = ASTTraverser.getNodeLocation(randomCall, sourceFile);
        const context = ASTTraverser.getNodeContext(randomCall, sourceFile);
        const code = ASTTraverser.getNodeText(randomCall, sourceFile);

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
            functionName: this.extractFunctionFromAST(randomCall),
          },
          securityContext.description,
          "high",
          securityContext.confidence,
          {
            securityContext: securityContext.contextType,
            variableName: securityContext.variableName,
            hasSecureAlternatives: secureAlternatives.length > 0,
            secureAlternatives: SECURE_RANDOM_ALTERNATIVES,
            detectionMethod: "ast-analysis",
          }
        );

        vulnerabilities.push(vulnerability);
      }
    }

    // Find Date.now() usage for randomness
    const dateNowCalls = this.findDateNowRandomUsage(sourceFile);

    for (const dateCall of dateNowCalls) {
      const location = ASTTraverser.getNodeLocation(dateCall, sourceFile);
      const context = ASTTraverser.getNodeContext(dateCall, sourceFile);
      const code = ASTTraverser.getNodeText(dateCall, sourceFile);

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
          functionName: this.extractFunctionFromAST(dateCall),
        },
        "Date.now() used for randomness - this is predictable and insecure for cryptographic purposes",
        "high",
        "medium",
        {
          randomnessMethod: "date-based",
          secureAlternatives: SECURE_RANDOM_ALTERNATIVES,
          detectionMethod: "ast-analysis",
        }
      );

      vulnerabilities.push(vulnerability);
    }

    return vulnerabilities;
  }

  /**
   * Find Math.random() call expressions
   */
  private findMathRandomCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
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
          obj.text === "Math" &&
          ts.isIdentifier(method) &&
          method.text === "random"
        );
      }
      return false;
    });
  }

  /**
   * Find Date.now() usage in random contexts
   */
  private findDateNowRandomUsage(sourceFile: ts.SourceFile): ts.Node[] {
    const randomUsages: ts.Node[] = [];
    const callExpressions = ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression
    );

    for (const callExpr of callExpressions) {
      if (ts.isPropertyAccessExpression(callExpr.expression)) {
        const obj = callExpr.expression.expression;
        const method = callExpr.expression.name;

        if (
          ts.isIdentifier(obj) &&
          obj.text === "Date" &&
          ts.isIdentifier(method) &&
          method.text === "now"
        ) {
          // Check if it's used in a modulo operation (common for "randomness")
          const parent = callExpr.parent;
          if (
            ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === ts.SyntaxKind.PercentToken
          ) {
            randomUsages.push(parent);
          }
        }
      }
    }

    return randomUsages;
  }

  /**
   * Analyze the security context of a Math.random() call
   */
  private analyzeRandomSecurityContext(
    randomCall: ts.CallExpression,
    sourceFile: ts.SourceFile
  ): {
    description: string;
    confidence: ConfidenceLevel;
    contextType: string;
    variableName?: string;
  } | null {
    // Get the variable name this random call is assigned to
    const variableName = this.getAssignmentVariableName(randomCall);

    // Check if variable name suggests security context
    if (variableName && this.isSecurityRelatedVariable(variableName)) {
      return {
        description: `Math.random() used for security-sensitive variable '${variableName}' - use cryptographically secure random instead`,
        confidence: "high",
        contextType: "variable-assignment",
        variableName,
      };
    }

    // Check function context
    const functionName = this.extractFunctionFromAST(randomCall);
    if (functionName && this.isSecurityRelatedFunction(functionName)) {
      return {
        description: `Math.random() used in security-related function '${functionName}' - use cryptographically secure random instead`,
        confidence: "high",
        contextType: "function-context",
        variableName: functionName,
      };
    }

    // Check surrounding code context
    const context = ASTTraverser.getNodeContext(randomCall, sourceFile, 5);
    if (this.isInSecurityContext(context)) {
      return {
        description:
          "Math.random() used in security context - use cryptographically secure random instead",
        confidence: "medium",
        contextType: "contextual",
        variableName,
      };
    }

    return null;
  }

  /**
   * Get the variable name that a random call is assigned to
   */
  private getAssignmentVariableName(node: ts.Node): string | undefined {
    let parent = node.parent;

    // Walk up to find variable declaration or assignment
    while (parent) {
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
      if (
        ts.isBinaryExpression(parent) &&
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(parent.left)
      ) {
        return parent.left.text;
      }
      if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
      parent = parent.parent;
    }

    return undefined;
  }

  /**
   * Check if variable name suggests security context
   */
  private isSecurityRelatedVariable(name: string): boolean {
    const lowerName = name.toLowerCase();

    // First check if it's a UI/visual context (should NOT be flagged)
    if (UI_VISUAL_CONTEXTS.some((context) => lowerName.includes(context))) {
      return false;
    }

    // Then check if it's actually security-related
    return SECURITY_CONTEXTS.some(
      (context) =>
        lowerName.includes(context) ||
        lowerName.replace(/[_-]/g, "").includes(context.replace(/[_-]/g, ""))
    );
  }

  /**
   * Check if function name suggests security context
   */
  private isSecurityRelatedFunction(name: string): boolean {
    const lowerName = name.toLowerCase();

    // First check if it's a UI/visual function (should NOT be flagged)
    if (UI_FUNCTION_PATTERNS.some((pattern) => pattern.test(lowerName))) {
      return false;
    }

    // Then check if it's actually security-related
    return SECURITY_FUNCTIONS.some(
      (func) =>
        lowerName.includes(func) &&
        SECURITY_CONTEXTS.some((ctx) => lowerName.includes(ctx))
    );
  }

  /**
   * Check if context suggests security usage
   */
  private isInSecurityContext(context: string): boolean {
    const lowerContext = context.toLowerCase();

    // Check if it's clearly a UI/visual context (should NOT be flagged)
    if (
      UI_VISUAL_CONTEXTS.some((uiContext) => lowerContext.includes(uiContext))
    ) {
      return false;
    }

    if (UI_FUNCTION_PATTERNS.some((pattern) => pattern.test(lowerContext))) {
      return false;
    }

    // Then check if it's actually security-related
    return SECURITY_CONTEXTS.some((secContext) =>
      lowerContext.includes(secContext)
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
