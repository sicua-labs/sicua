/**
 * Detector for hardcoded secrets, API keys, passwords, and tokens
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { Vulnerability } from "../types/vulnerability.types";
import { SecretPattern } from "../types/pattern.types";
import { PatternMatcher } from "../utils/PatternMatcher";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import { PLACEHOLDER_PATTERNS } from "../constants/debugging.constants";
import { SENSITIVE_VARIABLE_NAMES } from "../constants/sensitiveData.constants";

export class HardcodedSecretDetector extends BaseDetector {
  private static readonly SECRET_PATTERNS: SecretPattern[] = [
    {
      id: "aws-access-key",
      name: "AWS Access Key",
      description: "Hardcoded AWS access key detected",
      pattern: {
        type: "regex",
        expression: /AKIA[0-9A-Z]{16}/g,
      },
      vulnerabilityType: "hardcoded-secret",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx", ".json"],
      enabled: true,
      entropyThreshold: 4.5,
      minLength: 20,
      knownPrefixes: ["AKIA"],
    },
    {
      id: "aws-secret-key",
      name: "AWS Secret Key",
      description: "Hardcoded AWS secret access key detected",
      pattern: {
        type: "regex",
        expression: /[A-Za-z0-9\/\+=]{40}/g,
      },
      vulnerabilityType: "hardcoded-secret",
      severity: "critical",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx", ".json"],
      enabled: true,
      entropyThreshold: 5.0,
      minLength: 40,
      maxLength: 40,
    },
    {
      id: "github-token",
      name: "GitHub Token",
      description: "Hardcoded GitHub personal access token detected",
      pattern: {
        type: "regex",
        expression: /ghp_[a-zA-Z0-9]{36}/g,
      },
      vulnerabilityType: "hardcoded-secret",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx", ".json"],
      enabled: true,
      knownPrefixes: ["ghp_"],
    },
    {
      id: "api-key-generic",
      name: "Generic API Key",
      description: "Hardcoded API key detected",
      pattern: {
        type: "regex",
        expression:
          /(?:api[_-]?key|apikey|key)\s*[:=]\s*['"]([a-zA-Z0-9\-_]{20,})['"]/gi,
      },
      vulnerabilityType: "hardcoded-secret",
      severity: "critical",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx", ".json"],
      enabled: true,
      entropyThreshold: 4.0,
      minLength: 20,
    },
    {
      id: "database-url",
      name: "Database Connection String",
      description: "Hardcoded database connection string detected",
      pattern: {
        type: "regex",
        expression: /(?:mongodb|mysql|postgres|postgresql):\/\/[^\s'"]+/gi,
      },
      vulnerabilityType: "hardcoded-secret",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx", ".json"],
      enabled: true,
    },
    {
      id: "jwt-secret",
      name: "JWT Secret",
      description: "Hardcoded JWT secret detected",
      pattern: {
        type: "regex",
        expression:
          /(?:jwt[_-]?secret|jwtsecret)\s*[:=]\s*['"]([a-zA-Z0-9\-_+=\/]{16,})['"]/gi,
      },
      vulnerabilityType: "hardcoded-secret",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx", ".json"],
      enabled: true,
      entropyThreshold: 4.5,
      minLength: 16,
    },
    {
      id: "private-key",
      name: "Private Key",
      description: "Hardcoded private key detected",
      pattern: {
        type: "regex",
        expression: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
      },
      vulnerabilityType: "hardcoded-secret",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx", ".json", ".pem", ".key"],
      enabled: true,
    },
    {
      id: "password-hardcoded",
      name: "Hardcoded Password",
      description: "Hardcoded password detected",
      pattern: {
        type: "regex",
        expression:
          /(?:password|passwd|pwd)\s*[:=]\s*['"](?!.*\$\{)[a-zA-Z0-9\-_!@#$%^&*()+=]{8,}['"]/gi,
      },
      vulnerabilityType: "hardcoded-secret",
      severity: "critical",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx", ".json"],
      enabled: true,
      entropyThreshold: 3.5,
      minLength: 8,
    },
  ];

  constructor() {
    super(
      "HardcodedSecretDetector",
      "hardcoded-secret",
      "critical",
      HardcodedSecretDetector.SECRET_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files (exclude node_modules, dist, etc.)
    // TODO: MOVE TO CONSTANTS
    const relevantFiles = this.filterRelevantFiles(
      scanResult,
      [".ts", ".tsx", ".js", ".jsx", ".json"],
      ["node_modules", "dist", "build", ".git", "coverage"]
    );

    for (const filePath of relevantFiles) {
      const content = scanResult.fileContents.get(filePath);
      if (!content) continue;

      // Apply pattern matching
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateSecretMatch(match)
        );

      // Apply AST-based analysis for more sophisticated detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForSecrets(sf, fp)
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
   * Validate if a pattern match is actually a secret
   */
  private validateSecretMatch(matchResult: any): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    const matchedText = match.match;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Check if it's a placeholder or example
    if (this.isPlaceholderValue(matchedText)) {
      return false;
    }

    // Check entropy for potential secrets
    const pattern = matchResult.pattern as SecretPattern;
    if (pattern.entropyThreshold) {
      const entropy = PatternMatcher.calculateEntropy(matchedText);
      if (entropy < pattern.entropyThreshold) {
        return false;
      }
    }

    // Length validation
    if (pattern.minLength && matchedText.length < pattern.minLength) {
      return false;
    }
    if (pattern.maxLength && matchedText.length > pattern.maxLength) {
      return false;
    }

    return true;
  }

  /**
   * AST-based secret detection for more sophisticated analysis
   */
  private analyzeASTForSecrets(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find all string literals
    const stringLiterals = ASTTraverser.findNodesByKind<ts.StringLiteral>(
      sourceFile,
      ts.SyntaxKind.StringLiteral
    );

    for (const stringLiteral of stringLiterals) {
      const text = stringLiteral.text;

      // Skip short strings
      if (text.length < 16) continue;

      // Check if it looks like a secret
      if (this.looksLikeSecret(text, stringLiteral)) {
        const location = ASTTraverser.getNodeLocation(
          stringLiteral,
          sourceFile
        );
        const context = ASTTraverser.getNodeContext(stringLiteral, sourceFile);

        const vulnerability = this.createVulnerability(
          filePath,
          {
            line: location.line,
            column: location.column,
            endLine: location.line,
            endColumn: location.column + text.length,
          },
          {
            code: text,
            surroundingContext: context,
            functionName: this.extractFunctionFromAST(stringLiteral),
            componentName: this.extractComponentName(filePath),
          },
          "Potential hardcoded secret detected in string literal",
          "critical",
          "medium",
          {
            entropy: PatternMatcher.calculateEntropy(text),
            length: text.length,
            detectionMethod: "ast-analysis",
          }
        );

        vulnerabilities.push(vulnerability);
      }
    }

    return vulnerabilities;
  }

  /**
   * Check if a string looks like a secret based on various heuristics
   */
  private looksLikeSecret(text: string, node: ts.StringLiteral): boolean {
    // Calculate entropy
    const entropy = PatternMatcher.calculateEntropy(text);
    if (entropy < 4.0) return false;

    // Check if it has mixed character types
    if (!PatternMatcher.isPotentialSecret(text, 4.0, 16)) {
      return false;
    }

    // Check the variable name or property name
    const variableName = this.getVariableNameForStringLiteral(node);
    if (variableName && this.isSensitiveVariableName(variableName)) {
      return true;
    }

    // Check if it's assigned to a sensitive property
    const parent = node.parent;
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      const propertyName = parent.name.text;
      if (this.isSensitiveVariableName(propertyName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a variable name suggests it contains sensitive data
   */
  private isSensitiveVariableName(name: string): boolean {
    const lowerName = name.toLowerCase();
    return SENSITIVE_VARIABLE_NAMES.some(
      (sensitive) =>
        lowerName.includes(sensitive) ||
        lowerName.replace(/[_-]/g, "").includes(sensitive.replace(/[_-]/g, ""))
    );
  }

  /**
   * Get variable name for a string literal
   */
  private getVariableNameForStringLiteral(
    node: ts.StringLiteral
  ): string | undefined {
    let parent = node.parent;

    // Check if it's a variable declaration
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }

    // Check if it's a property assignment
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }

    return undefined;
  }

  /**
   * Fixed extractFunctionFromAST function
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
   * Check if value is a placeholder or example
   */
  private isPlaceholderValue(value: string): boolean {
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
  }
}
