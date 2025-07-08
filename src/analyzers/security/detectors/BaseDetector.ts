/**
 * Abstract base class for security vulnerability detectors
 */

import ts from "typescript";
import {
  Vulnerability,
  VulnerabilityType,
  SeverityLevel,
  ConfidenceLevel,
  VulnerabilityLocation,
  VulnerabilityContext,
} from "../types/vulnerability.types";
import { PatternDefinition, PatternMatchResult } from "../types/pattern.types";
import { AnalysisContext } from "../types/analysis.types";
import { PatternMatcher } from "../utils/PatternMatcher";
import { SecurityContext, FileContextInfo } from "../utils/SecurityContext";
import { ScanResult } from "../../../types";
import { PathUtils } from "../../../utils/common/pathUtils";
import { TEST_INDICATORS } from "../constants/general.constants";

export abstract class BaseDetector {
  protected readonly detectorName: string;
  protected readonly vulnerabilityType: VulnerabilityType;
  protected readonly defaultSeverity: SeverityLevel;
  protected readonly patterns: PatternDefinition[];

  constructor(
    detectorName: string,
    vulnerabilityType: VulnerabilityType,
    defaultSeverity: SeverityLevel,
    patterns: PatternDefinition[] = []
  ) {
    this.detectorName = detectorName;
    this.vulnerabilityType = vulnerabilityType;
    this.defaultSeverity = defaultSeverity;
    this.patterns = patterns;
  }

  /**
   * Main detection method - must be implemented by subclasses
   */
  abstract detect(
    scanResult: ScanResult,
    context: AnalysisContext
  ): Promise<Vulnerability[]>;

  /**
   * Apply text-based pattern matching to file content
   */
  protected applyPatternMatching(
    content: string,
    filePath: string,
    patterns: PatternDefinition[] = this.patterns
  ): PatternMatchResult[] {
    const results: PatternMatchResult[] = [];

    for (const pattern of patterns) {
      if (this.shouldApplyPattern(pattern, filePath)) {
        const result = PatternMatcher.applyPattern(pattern, content, filePath);
        if (result.matches.length > 0) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Apply AST-based analysis to TypeScript source files
   */
  protected applyASTAnalysis(
    sourceFile: ts.SourceFile,
    filePath: string,
    customAnalyzer?: (
      sourceFile: ts.SourceFile,
      filePath: string
    ) => Vulnerability[]
  ): Vulnerability[] {
    if (customAnalyzer) {
      return customAnalyzer(sourceFile, filePath);
    }
    return [];
  }

  /**
   * Create a vulnerability instance with proper metadata
   */
  protected createVulnerability(
    filePath: string,
    location: VulnerabilityLocation,
    context: VulnerabilityContext,
    description: string,
    severity: SeverityLevel = this.defaultSeverity,
    confidence: ConfidenceLevel = "high",
    metadata?: Record<string, unknown>
  ): Vulnerability {
    return {
      id: this.generateVulnerabilityId(
        filePath,
        location,
        this.vulnerabilityType
      ),
      type: this.vulnerabilityType,
      severity,
      confidence,
      description,
      filePath,
      location,
      context,
      metadata,
      detectedAt: Date.now(),
    };
  }

  /**
   * Convert pattern match results to vulnerabilities
   */
  protected convertPatternMatchesToVulnerabilities(
    patternResults: PatternMatchResult[],
    additionalValidator?: (match: PatternMatchResult) => boolean
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    for (const result of patternResults) {
      // Apply additional validation if provided
      if (additionalValidator && !additionalValidator(result)) {
        continue;
      }

      for (const match of result.matches) {
        const location: VulnerabilityLocation = {
          line: match.line,
          column: match.column,
          endLine: match.line,
          endColumn: match.column + match.match.length,
        };

        const context: VulnerabilityContext = {
          code: match.match,
          surroundingContext: match.context,
          functionName: this.extractFunctionName(match.context || ""),
          componentName: this.extractComponentName(result.filePath),
        };

        const vulnerability = this.createVulnerability(
          result.filePath,
          location,
          context,
          result.pattern.description,
          result.pattern.severity,
          result.pattern.confidence,
          {
            patternId: result.pattern.id,
            matchedGroups: match.groups,
          }
        );

        vulnerabilities.push(vulnerability);
      }
    }

    return vulnerabilities;
  }

  /**
   * Filter files that should be analyzed by this detector
   */
  protected filterRelevantFiles(
    scanResult: ScanResult,
    fileExtensions?: string[],
    excludePatterns?: string[]
  ): string[] {
    let relevantFiles = scanResult.filePaths;

    // Filter by file extensions
    if (fileExtensions && fileExtensions.length > 0) {
      relevantFiles = relevantFiles.filter((filePath) =>
        fileExtensions.some((ext) => filePath.endsWith(ext))
      );
    }

    // Exclude files matching patterns
    if (excludePatterns && excludePatterns.length > 0) {
      relevantFiles = relevantFiles.filter(
        (filePath) =>
          !excludePatterns.some((pattern) => {
            const regex = new RegExp(pattern);
            return regex.test(filePath);
          })
      );
    }

    return relevantFiles;
  }

  /**
   * Get file context information for security analysis
   */
  protected getFileContext(filePath: string, content: string): FileContextInfo {
    return SecurityContext.analyzeFileContext(filePath, content);
  }

  /**
   * Check if a pattern should be applied to a specific file
   */
  protected shouldApplyPattern(
    pattern: PatternDefinition,
    filePath: string
  ): boolean {
    if (pattern.fileTypes && pattern.fileTypes.length > 0) {
      const fileExtension = filePath.split(".").pop();
      return pattern.fileTypes.includes(`.${fileExtension}`);
    }
    return pattern.enabled;
  }

  /**
   * Generate a unique ID for a vulnerability
   */
  private generateVulnerabilityId(
    filePath: string,
    location: VulnerabilityLocation,
    type: VulnerabilityType
  ): string {
    const input = `${filePath}:${location.line}:${location.column}:${type}`;
    return PathUtils.generateHash(input).substring(0, 16);
  }

  /**
   * Extract function name from context
   */
  private extractFunctionName(context: string): string | undefined {
    // Simple heuristic to find function names in context
    const functionPatterns = [
      /function\s+(\w+)/,
      /const\s+(\w+)\s*=/,
      /(\w+)\s*:\s*\(/,
      /(\w+)\s*\(/,
    ];

    for (const pattern of functionPatterns) {
      const match = context.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract component name from file path
   */
  protected extractComponentName(filePath: string): string | undefined {
    const fileName = filePath.split("/").pop();
    if (!fileName) return undefined;

    const nameWithoutExtension = fileName.replace(/\.(tsx?|jsx?)$/, "");

    // Return component name if it starts with uppercase (React convention)
    if (/^[A-Z]/.test(nameWithoutExtension)) {
      return nameWithoutExtension;
    }

    return undefined;
  }

  /**
   * Validate vulnerability before adding to results
   */
  protected validateVulnerability(vulnerability: Vulnerability): boolean {
    // Basic validation checks
    if (!vulnerability.filePath || !vulnerability.description) {
      return false;
    }

    if (vulnerability.location.line < 1 || vulnerability.location.column < 1) {
      return false;
    }

    if (!vulnerability.context.code.trim()) {
      return false;
    }

    return true;
  }

  /**
   * Apply confidence adjustments based on context
   */
  protected adjustConfidenceBasedOnContext(
    vulnerability: Vulnerability,
    fileContext: FileContextInfo
  ): ConfidenceLevel {
    let confidence = vulnerability.confidence;

    // Lower confidence for test files
    if (fileContext.fileType === "test") {
      confidence = this.lowerConfidence(confidence);
    }

    // Higher confidence for security-sensitive contexts
    if (
      fileContext.riskContexts.includes("authentication") ||
      fileContext.riskContexts.includes("authorization")
    ) {
      confidence = this.raiseConfidence(confidence);
    }

    return confidence;
  }

  /**
   * Helper to lower confidence level
   */
  private lowerConfidence(confidence: ConfidenceLevel): ConfidenceLevel {
    const levels: ConfidenceLevel[] = ["low", "medium", "high"];
    const currentIndex = levels.indexOf(confidence);
    return levels[Math.max(0, currentIndex - 1)];
  }

  /**
   * Helper to raise confidence level
   */
  private raiseConfidence(confidence: ConfidenceLevel): ConfidenceLevel {
    const levels: ConfidenceLevel[] = ["low", "medium", "high"];
    const currentIndex = levels.indexOf(confidence);
    return levels[Math.min(levels.length - 1, currentIndex + 1)];
  }

  /**
   * Check if context suggests this is test code
   */
  protected isInTestContext(context: string): boolean {
    return TEST_INDICATORS.some((indicator) => context.includes(indicator));
  }

  /**
   * Check if text is in a comment
   */
  protected isInComment(context: string, text: string): boolean {
    const lines = context.split("\n");
    for (const line of lines) {
      if (
        line.includes(text) &&
        (line.trim().startsWith("//") || line.trim().startsWith("*"))
      ) {
        return true;
      }
    }
    return false;
  }
}
