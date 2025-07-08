/**
 * Detector for environment variable exposure in client-side code
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import { ENV_SENSITIVE_KEYWORDS } from "../constants/sensitiveData.constants";
import {
  CLIENT_SAFE_ENV_VARS,
  SERVER_ONLY_ENV_VARS,
} from "../constants/environment.constants";
import { DEVELOPMENT_GATING_PATTERNS } from "../constants/security.constants";

export class EnvironmentExposureDetector extends BaseDetector {
  private static readonly ENV_PATTERNS: PatternDefinition[] = [
    {
      id: "process-env-access",
      name: "process.env access in client code",
      description:
        "process.env access detected in client-side code - may expose server-only environment variables",
      pattern: {
        type: "regex",
        expression: /process\.env\.\w+/g,
      },
      vulnerabilityType: "environment-exposure",
      severity: "high",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "server-env-in-client",
      name: "Server environment variable in client code",
      description:
        "Server-only environment variable accessed in client code - this will be undefined or expose sensitive data",
      pattern: {
        type: "regex",
        expression:
          /process\.env\.(DATABASE_URL|DB_PASSWORD|SECRET_KEY|PRIVATE_KEY|API_SECRET)/g,
      },
      vulnerabilityType: "environment-exposure",
      severity: "high",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "EnvironmentExposureDetector",
      "environment-exposure",
      "high",
      EnvironmentExposureDetector.ENV_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files (focus on client-side files)
    // TODO: MOVE TO CONSTANTS
    const relevantFiles = this.filterRelevantFiles(
      scanResult,
      [".ts", ".tsx", ".js", ".jsx"],
      ["node_modules", "dist", "build", ".git", "coverage"]
    );

    for (const filePath of relevantFiles) {
      const content = scanResult.fileContents.get(filePath);
      if (!content) continue;

      // Determine if this is a client-side file
      const fileContext = this.getFileContext(filePath, content);

      // Skip server-side files (API routes, middleware, etc.)
      if (
        !fileContext.isClientSide ||
        fileContext.fileType === "api-route" ||
        fileContext.fileType === "middleware"
      ) {
        continue;
      }

      // Apply pattern matching
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateEnvMatch(match, fileContext.isClientSide)
        );

      // Apply AST-based analysis
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) =>
            this.analyzeASTForEnvExposure(sf, fp, fileContext.isClientSide)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Process pattern vulnerabilities
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
   * Validate if an environment variable match is problematic
   */
  private validateEnvMatch(matchResult: any, isClientSide: boolean): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Only flag client-side usage
    if (!isClientSide) {
      return false;
    }

    // Extract environment variable name
    const envVar = this.extractEnvVariableName(match.match);
    if (!envVar) return false;

    // Check if it's a known safe client variable
    if (this.isClientSafeEnvVar(envVar)) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for environment variable exposure
   */
  private analyzeASTForEnvExposure(
    sourceFile: ts.SourceFile,
    filePath: string,
    isClientSide: boolean
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    if (!isClientSide) {
      return vulnerabilities;
    }

    // Find all property access expressions for process.env
    const processEnvAccess = this.findProcessEnvAccess(sourceFile);

    for (const envAccess of processEnvAccess) {
      const envVarName = this.getEnvVariableName(envAccess);

      if (envVarName) {
        const context = ASTTraverser.getNodeContext(envAccess, sourceFile);

        // Check if NODE_ENV usage is properly gated
        if (
          envVarName === "NODE_ENV" &&
          this.isProperlyGatedForDevelopment(envVarName, context)
        ) {
          continue; // Skip properly gated NODE_ENV usage
        }

        const riskAssessment = this.assessEnvVariableRisk(envVarName);

        if (riskAssessment) {
          const location = ASTTraverser.getNodeLocation(envAccess, sourceFile);
          const code = ASTTraverser.getNodeText(envAccess, sourceFile);

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
              functionName: this.extractFunctionFromAST(envAccess),
            },
            riskAssessment.description,
            "high",
            riskAssessment.confidence,
            {
              envVariableName: envVarName,
              riskLevel: riskAssessment.riskLevel,
              isServerOnly: riskAssessment.isServerOnly,
              suggestion: riskAssessment.suggestion,
              detectionMethod: "ast-analysis",
            }
          );

          vulnerabilities.push(vulnerability);
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Find all process.env property access expressions
   */
  private findProcessEnvAccess(
    sourceFile: ts.SourceFile
  ): ts.PropertyAccessExpression[] {
    const propertyAccess = ASTTraverser.findPropertyAccess(sourceFile);

    return propertyAccess.filter((propAccess) => {
      // Check for process.env.VARIABLE pattern
      if (
        ts.isPropertyAccessExpression(propAccess.expression) &&
        ts.isIdentifier(propAccess.expression.expression) &&
        ts.isIdentifier(propAccess.expression.name) &&
        propAccess.expression.expression.text === "process" &&
        propAccess.expression.name.text === "env"
      ) {
        return true;
      }

      return false;
    });
  }

  /**
   * Get environment variable name from property access
   */
  private getEnvVariableName(
    propAccess: ts.PropertyAccessExpression
  ): string | null {
    if (ts.isIdentifier(propAccess.name)) {
      return propAccess.name.text;
    }
    return null;
  }

  /**
   * Assess the risk of using an environment variable in client code
   */
  private assessEnvVariableRisk(envVarName: string): {
    description: string;
    confidence: "high" | "medium" | "low";
    riskLevel: string;
    isServerOnly: boolean;
    suggestion: string;
  } | null {
    // Check if it's a known client-safe variable
    if (this.isClientSafeEnvVar(envVarName)) {
      return null;
    }

    // Check if it's a known server-only variable
    const isServerOnly = this.isServerOnlyEnvVar(envVarName);

    if (isServerOnly) {
      return {
        description: `Server-only environment variable '${envVarName}' accessed in client code - this will be undefined or may expose sensitive data`,
        confidence: "high",
        riskLevel: "critical",
        isServerOnly: true,
        suggestion: `Move to server-side code or use NEXT_PUBLIC_ prefix if safe for client exposure`,
      };
    }

    // Check if it looks sensitive based on naming
    const isSensitive = this.looksLikeSensitiveEnvVar(envVarName);

    if (isSensitive) {
      return {
        description: `Potentially sensitive environment variable '${envVarName}' accessed in client code - verify this is safe for client exposure`,
        confidence: "medium",
        riskLevel: "high",
        isServerOnly: false,
        suggestion: `Verify this is safe for client exposure or move to server-side code`,
      };
    }

    // Unknown variable - flag for review
    return {
      description: `Environment variable '${envVarName}' accessed in client code - verify this is safe for client exposure`,
      confidence: "low",
      riskLevel: "medium",
      isServerOnly: false,
      suggestion: `Review if this environment variable is safe for client exposure`,
    };
  }

  /**
   * Extract environment variable name from match string
   */
  private extractEnvVariableName(match: string): string | null {
    const envMatch = match.match(/process\.env\.(\w+)/);
    return envMatch ? envMatch[1] : null;
  }

  /**
   * Check if environment variable is safe for client-side use
   */
  private isClientSafeEnvVar(envVarName: string): boolean {
    return CLIENT_SAFE_ENV_VARS.some(
      (safe) => envVarName.startsWith(safe) || envVarName === safe
    );
  }

  /**
   * Check if environment variable is server-only
   */
  private isServerOnlyEnvVar(envVarName: string): boolean {
    return SERVER_ONLY_ENV_VARS.includes(envVarName);
  }

  /**
   * Check if environment variable name looks sensitive
   */
  private looksLikeSensitiveEnvVar(envVarName: string): boolean {
    const upperName = envVarName.toUpperCase();
    return ENV_SENSITIVE_KEYWORDS.some((keyword) =>
      upperName.includes(keyword)
    );
  }

  /**
   * Check if environment variable usage is properly gated for development
   */
  private isProperlyGatedForDevelopment(
    envVarName: string,
    context: string
  ): boolean {
    // Only apply gating check for NODE_ENV
    if (envVarName !== "NODE_ENV") {
      return false;
    }

    const cleanContext = context.replace(/\s+/g, " ").trim();

    // Check if it's used in a proper development gating pattern
    return DEVELOPMENT_GATING_PATTERNS.some((pattern) =>
      pattern.test(cleanContext)
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
