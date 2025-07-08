/**
 * Detector for client-side storage of sensitive data
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { Vulnerability, ConfidenceLevel } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import {
  STORAGE_APIS,
  STORAGE_LIBRARIES,
  UI_STATE_PATTERNS,
  UI_STATE_TERMS,
} from "../constants/storage.constants";
import {
  CLIENT_EXPLICIT_SENSITIVE,
  HIGH_SENSITIVITY_KEYWORDS,
  MEDIUM_SENSITIVITY_KEYWORDS,
  NON_SENSITIVE_TERMS,
  SENSITIVE_DATA_KEYWORDS,
} from "../constants/sensitiveData.constants";

export class ClientStorageDetector extends BaseDetector {
  private static readonly STORAGE_PATTERNS: PatternDefinition[] = [
    {
      id: "localstorage-sensitive",
      name: "localStorage with sensitive data",
      description:
        "localStorage usage with potentially sensitive data detected",
      pattern: {
        type: "regex",
        expression:
          /localStorage\.(setItem|getItem)\s*\([^)]*(?:password|token|secret|key|auth|jwt|session)[^)]*/gi,
      },
      vulnerabilityType: "client-storage-sensitive",
      severity: "medium",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "sessionstorage-sensitive",
      name: "sessionStorage with sensitive data",
      description:
        "sessionStorage usage with potentially sensitive data detected",
      pattern: {
        type: "regex",
        expression:
          /sessionStorage\.(setItem|getItem)\s*\([^)]*(?:password|token|secret|key|auth|jwt|session)[^)]*/gi,
      },
      vulnerabilityType: "client-storage-sensitive",
      severity: "medium",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "indexeddb-sensitive",
      name: "IndexedDB with sensitive data",
      description: "IndexedDB usage with potentially sensitive data detected",
      pattern: {
        type: "regex",
        expression: /indexedDB\.|IDBDatabase/gi,
      },
      vulnerabilityType: "client-storage-sensitive",
      severity: "medium",
      confidence: "low",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "ClientStorageDetector",
      "client-storage-sensitive",
      "medium",
      ClientStorageDetector.STORAGE_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files (focus on client-side files)
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

      // Only analyze client-side files
      const fileContext = this.getFileContext(filePath, content);
      if (
        !fileContext.isClientSide ||
        fileContext.fileType === "api-route" ||
        fileContext.fileType === "middleware"
      ) {
        continue;
      }

      // Check for storage libraries
      const storageLibraries = this.detectStorageLibraries(content);

      // Apply pattern matching
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateStorageMatch(match)
        );

      // Apply AST-based analysis
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForClientStorage(sf, fp, storageLibraries)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Process pattern vulnerabilities
      for (const vuln of patternVulnerabilities) {
        // Add library information if detected
        if (storageLibraries.length > 0) {
          vuln.metadata = {
            ...vuln.metadata,
            storageLibraries,
            note: "Storage libraries detected - verify their security configuration",
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
   * Detect storage libraries used in the file
   */
  private detectStorageLibraries(content: string): string[] {
    const foundLibraries: string[] = [];

    for (const lib of STORAGE_LIBRARIES) {
      if (content.includes(lib)) {
        foundLibraries.push(lib);
      }
    }

    return foundLibraries;
  }

  /**
   * Validate if a storage pattern match is problematic
   */
  private validateStorageMatch(matchResult: any): boolean {
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
   * AST-based analysis for client storage usage
   */
  private analyzeASTForClientStorage(
    sourceFile: ts.SourceFile,
    filePath: string,
    storageLibraries: string[]
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find storage API calls
    const storageApiCalls = this.findStorageApiCalls(sourceFile);
    for (const apiCall of storageApiCalls) {
      const apiVuln = this.analyzeStorageApiCall(apiCall, sourceFile, filePath);
      if (apiVuln) {
        vulnerabilities.push(apiVuln);
      }
    }

    // Find storage library calls
    const storageLibraryCalls = this.findStorageLibraryCalls(
      sourceFile,
      storageLibraries
    );
    for (const libCall of storageLibraryCalls) {
      const libVuln = this.analyzeStorageLibraryCall(
        libCall,
        sourceFile,
        filePath
      );
      if (libVuln) {
        vulnerabilities.push(libVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find storage API calls (localStorage, sessionStorage, etc.)
   */
  private findStorageApiCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        if (ts.isPropertyAccessExpression(node.expression)) {
          const obj = node.expression.expression;
          const method = node.expression.name;

          if (ts.isIdentifier(obj) && ts.isIdentifier(method)) {
            return (
              STORAGE_APIS.includes(obj.text) &&
              (method.text === "setItem" ||
                method.text === "getItem" ||
                method.text === "removeItem" ||
                method.text === "clear")
            );
          }
        }

        return false;
      }
    );
  }

  /**
   * Find storage library calls
   */
  private findStorageLibraryCalls(
    sourceFile: ts.SourceFile,
    storageLibraries: string[]
  ): ts.CallExpression[] {
    if (storageLibraries.length === 0) return [];

    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        // Look for library method calls
        if (ts.isPropertyAccessExpression(node.expression)) {
          const obj = node.expression.expression;
          const method = node.expression.name;

          if (ts.isIdentifier(obj) && ts.isIdentifier(method)) {
            const objName = obj.text.toLowerCase();
            return (
              storageLibraries.some(
                (lib) =>
                  objName.includes(lib.replace("-", "")) ||
                  objName.includes("storage") ||
                  objName.includes("db")
              ) &&
              (method.text === "set" ||
                method.text === "get" ||
                method.text === "put" ||
                method.text === "add")
            );
          }
        }

        return false;
      }
    );
  }

  /**
   * Analyze storage API call
   */
  private analyzeStorageApiCall(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(callExpr, sourceFile);
    const context = ASTTraverser.getNodeContext(callExpr, sourceFile);
    const code = ASTTraverser.getNodeText(callExpr, sourceFile);

    // Get storage type and method
    const storageInfo = this.getStorageInfo(callExpr);
    if (!storageInfo) return null;

    // Analyze the key and value for sensitive data
    const sensitivityAnalysis = this.analyzeStorageSensitivity(callExpr);

    if (
      !sensitivityAnalysis ||
      sensitivityAnalysis.sensitivityLevel === "none"
    ) {
      return null;
    }

    // Check if this appears to be UI state storage
    const keyArg = callExpr.arguments[0];
    if (keyArg && ts.isStringLiteral(keyArg)) {
      if (this.isUIStateStorage(keyArg.text, context)) {
        return null; // Skip UI state storage
      }
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
        functionName: this.extractFunctionFromAST(callExpr),
      },
      `${storageInfo.storageType}.${
        storageInfo.method
      }() used with potentially sensitive data: ${sensitivityAnalysis.sensitiveKeys.join(
        ", "
      )}`,
      "medium",
      sensitivityAnalysis.confidence,
      {
        storageType: storageInfo.storageType,
        method: storageInfo.method,
        sensitiveKeys: sensitivityAnalysis.sensitiveKeys,
        sensitivityLevel: sensitivityAnalysis.sensitivityLevel,
        recommendations: sensitivityAnalysis.recommendations,
        detectionMethod: "storage-api-analysis",
      }
    );
  }

  /**
   * Analyze storage library call
   */
  private analyzeStorageLibraryCall(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(callExpr, sourceFile);
    const context = ASTTraverser.getNodeContext(callExpr, sourceFile);
    const code = ASTTraverser.getNodeText(callExpr, sourceFile);

    // Analyze for sensitive data patterns
    const sensitivityAnalysis = this.analyzeStorageSensitivity(callExpr);

    if (
      !sensitivityAnalysis ||
      sensitivityAnalysis.sensitivityLevel === "none"
    ) {
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
        functionName: this.extractFunctionFromAST(callExpr),
      },
      `Storage library used with potentially sensitive data: ${sensitivityAnalysis.sensitiveKeys.join(
        ", "
      )}`,
      "medium",
      sensitivityAnalysis.confidence,
      {
        libraryCall: true,
        sensitiveKeys: sensitivityAnalysis.sensitiveKeys,
        sensitivityLevel: sensitivityAnalysis.sensitivityLevel,
        recommendations: sensitivityAnalysis.recommendations,
        detectionMethod: "storage-library-analysis",
      }
    );
  }

  /**
   * Get storage type and method information
   */
  private getStorageInfo(
    callExpr: ts.CallExpression
  ): { storageType: string; method: string } | null {
    if (ts.isPropertyAccessExpression(callExpr.expression)) {
      const obj = callExpr.expression.expression;
      const method = callExpr.expression.name;

      if (ts.isIdentifier(obj) && ts.isIdentifier(method)) {
        return {
          storageType: obj.text,
          method: method.text,
        };
      }
    }

    return null;
  }

  /**
   * Analyze storage call for sensitive data
   */
  private analyzeStorageSensitivity(
    callExpr: ts.CallExpression
  ): StorageSensitivityAnalysis | null {
    const analysis: StorageSensitivityAnalysis = {
      sensitiveKeys: [],
      sensitivityLevel: "none",
      confidence: "low",
      recommendations: [],
    };

    // Analyze arguments for sensitive data
    for (let i = 0; i < callExpr.arguments.length; i++) {
      const arg = callExpr.arguments[i];
      const sensitiveData = this.extractSensitiveDataFromArgument(arg);

      if (sensitiveData.length > 0) {
        analysis.sensitiveKeys.push(...sensitiveData);
      }
    }

    if (analysis.sensitiveKeys.length === 0) {
      return null;
    }

    // Determine sensitivity level and confidence
    analysis.sensitivityLevel = this.determineSensitivityLevel(
      analysis.sensitiveKeys
    );
    analysis.confidence = this.determineConfidenceLevel(analysis.sensitiveKeys);
    analysis.recommendations = this.generateStorageRecommendations(
      analysis.sensitiveKeys
    );

    return analysis;
  }

  /**
   * Extract sensitive data indicators from function argument
   */
  private extractSensitiveDataFromArgument(arg: ts.Expression): string[] {
    const sensitiveData: string[] = [];

    if (ts.isStringLiteral(arg)) {
      const text = arg.text.toLowerCase();

      // Check if it's explicitly non-sensitive or UI state
      if (NON_SENSITIVE_TERMS.some((term) => text.includes(term))) {
        return []; // Return empty array for non-sensitive terms
      }

      if (UI_STATE_TERMS.some((term) => text.includes(term))) {
        return []; // Return empty for UI state
      }

      const foundSensitive = SENSITIVE_DATA_KEYWORDS.filter((keyword) =>
        text.includes(keyword)
      );
      sensitiveData.push(...foundSensitive);
    } else if (ts.isIdentifier(arg)) {
      const name = arg.text.toLowerCase();

      if (NON_SENSITIVE_TERMS.some((term) => name.includes(term))) {
        return [];
      }

      if (UI_STATE_TERMS.some((term) => name.includes(term))) {
        return [];
      }

      const foundSensitive = SENSITIVE_DATA_KEYWORDS.filter((keyword) =>
        name.includes(keyword)
      );
      sensitiveData.push(...foundSensitive);
    } else if (ts.isPropertyAccessExpression(arg)) {
      const propertyName = ts.isIdentifier(arg.name)
        ? arg.name.text.toLowerCase()
        : "";

      if (NON_SENSITIVE_TERMS.some((term) => propertyName.includes(term))) {
        return [];
      }

      const foundSensitive = SENSITIVE_DATA_KEYWORDS.filter((keyword) =>
        propertyName.includes(keyword)
      );
      sensitiveData.push(...foundSensitive);
    }

    return sensitiveData;
  }

  /**
   * Check if storage usage is for UI state rather than sensitive data
   */
  private isUIStateStorage(key: string, context: string): boolean {
    const lowerKey = key.toLowerCase();
    const lowerContext = context.toLowerCase();

    // Check if key or context suggests UI state
    const isUIKey = UI_STATE_PATTERNS.some(
      (pattern) => lowerKey.includes(pattern) || lowerContext.includes(pattern)
    );

    // Additional context checks for common UI patterns
    const hasUIContext =
      lowerContext.includes("component") ||
      lowerContext.includes("hook") ||
      lowerContext.includes("use") ||
      lowerContext.includes("state") ||
      lowerContext.includes("local");

    return isUIKey || hasUIContext;
  }

  /**
   * Determine sensitivity level based on found keywords
   */
  private determineSensitivityLevel(
    sensitiveKeys: string[]
  ): "high" | "medium" | "low" | "none" {
    if (sensitiveKeys.some((key) => HIGH_SENSITIVITY_KEYWORDS.includes(key))) {
      return "high";
    } else if (
      sensitiveKeys.some((key) => MEDIUM_SENSITIVITY_KEYWORDS.includes(key))
    ) {
      return "medium";
    } else if (sensitiveKeys.length > 0) {
      return "low";
    }

    return "none";
  }

  /**
   * Determine confidence level based on context
   */
  private determineConfidenceLevel(sensitiveKeys: string[]): ConfidenceLevel {
    if (sensitiveKeys.some((key) => CLIENT_EXPLICIT_SENSITIVE.includes(key))) {
      return "high";
    } else if (sensitiveKeys.length > 1) {
      return "medium";
    }

    return "low";
  }

  /**
   * Generate storage security recommendations
   */
  private generateStorageRecommendations(sensitiveKeys: string[]): string[] {
    const recommendations: string[] = [];

    if (
      sensitiveKeys.includes("password") ||
      sensitiveKeys.includes("secret")
    ) {
      recommendations.push(
        "Never store passwords or secrets in client-side storage"
      );
      recommendations.push("Use secure server-side session management instead");
    }

    if (sensitiveKeys.includes("token") || sensitiveKeys.includes("jwt")) {
      recommendations.push("Consider using httpOnly cookies for token storage");
      recommendations.push("Implement token rotation and expiration");
    }

    if (sensitiveKeys.length > 0) {
      recommendations.push("Encrypt sensitive data before storing");
      recommendations.push(
        "Use sessionStorage instead of localStorage for temporary data"
      );
      recommendations.push("Implement data cleanup on logout");
    }

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
interface StorageSensitivityAnalysis {
  sensitiveKeys: string[];
  sensitivityLevel: "high" | "medium" | "low" | "none";
  confidence: ConfidenceLevel;
  recommendations: string[];
}
