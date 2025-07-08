/**
 * General Analyzer - Extracts general code metrics from the codebase
 */

import ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import {
  validateLineMetrics,
  aggregateLineMetrics,
  aggregateMagicNumbers,
  buildCodeMetrics,
} from "./calculators/metricsCalculator";
import { detectMagicNumbers } from "./detectors/magicNumberDetector";
import { detectProjectMetadata } from "./detectors/projectMetadataDetector";
import {
  GeneralAnalyzerConfig,
  GeneralAnalysisResult,
  LineMetrics,
  MagicNumber,
} from "./types/generalAnalyzer.types";
import { countLines } from "./utils/lineCounter";
import { ScanResult } from "../../types";

export class GeneralAnalyzer {
  private scanResult: ScanResult;
  private config: GeneralAnalyzerConfig;
  private projectRoot: string;

  constructor(scanResult: ScanResult, config: GeneralAnalyzerConfig = {}) {
    this.scanResult = scanResult;
    this.projectRoot = this.extractProjectRoot();
    this.config = {
      excludeTestFiles: true,
      excludeNodeModules: true,
      fileExtensions: [".ts", ".tsx", ".js", ".jsx"],
      ...config,
    };
  }

  /**
   * Extracts the project root directory from the scanned file paths
   * @returns The project root directory path
   */
  private extractProjectRoot(): string {
    if (this.scanResult.filePaths.length === 0) {
      throw new Error("No files found in scan result");
    }

    // Find the common root directory of all scanned files
    const firstPath = this.scanResult.filePaths[0];
    let commonRoot = path.dirname(firstPath);

    // Find the deepest common directory
    for (const filePath of this.scanResult.filePaths.slice(1)) {
      while (
        !filePath.startsWith(commonRoot + path.sep) &&
        !filePath.startsWith(commonRoot)
      ) {
        commonRoot = path.dirname(commonRoot);
        if (commonRoot === path.dirname(commonRoot)) {
          // Reached filesystem root
          break;
        }
      }
    }

    // Look for package.json in the common root and parent directories
    let projectRoot = commonRoot;
    const maxLevelsUp = 3; // Prevent infinite loops

    for (let i = 0; i < maxLevelsUp; i++) {
      const packageJsonPath = path.join(projectRoot, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        return projectRoot;
      }

      const parentDir = path.dirname(projectRoot);
      if (parentDir === projectRoot) {
        // Reached filesystem root
        break;
      }
      projectRoot = parentDir;
    }

    return commonRoot;
  }

  /**
   * Performs the general analysis and returns metrics
   * @returns Promise containing the analysis result
   */
  async analyze(): Promise<GeneralAnalysisResult> {
    const relevantFiles = this.getRelevantFiles();
    const totalFiles = this.scanResult.filePaths.length;
    const analyzedFiles = relevantFiles.length;

    const fileLineMetrics: LineMetrics[] = [];
    const fileMagicNumbers: MagicNumber[][] = [];

    // Process each relevant file
    for (const filePath of relevantFiles) {
      try {
        // Get file content and source file from scan result
        const content = this.scanResult.fileContents.get(filePath);
        const sourceFile = this.scanResult.sourceFiles.get(filePath);

        if (!content || !sourceFile) {
          console.warn(`Missing content or source file for: ${filePath}`);
          continue;
        }

        // Count lines for this file
        const lineMetrics = countLines(content);

        // Validate line metrics
        if (!validateLineMetrics(lineMetrics)) {
          console.warn(`Invalid line metrics for file: ${filePath}`);
        }

        fileLineMetrics.push(lineMetrics);

        // Detect magic numbers for this file
        const magicNumbers = detectMagicNumbers(
          sourceFile,
          filePath,
          this.getContextCode
        );
        fileMagicNumbers.push(magicNumbers);
      } catch (error) {
        console.error(`Error analyzing file ${filePath}:`, error);
        // Continue processing other files
        continue;
      }
    }

    // Aggregate all metrics
    const aggregatedLineMetrics = aggregateLineMetrics(fileLineMetrics);
    const allMagicNumbers = aggregateMagicNumbers(fileMagicNumbers);
    const codeMetrics = buildCodeMetrics(
      aggregatedLineMetrics,
      allMagicNumbers
    );

    // Detect project metadata
    const projectMetadata = detectProjectMetadata(this.projectRoot);

    return {
      codeMetrics,
      projectMetadata,
      analyzedFiles,
      totalFiles,
    };
  }

  /**
   * Filters files based on configuration
   * @returns Array of file paths that should be analyzed
   */
  private getRelevantFiles(): string[] {
    return this.scanResult.filePaths.filter((filePath) => {
      // Check file extension
      if (this.config.fileExtensions) {
        const hasValidExtension = this.config.fileExtensions.some((ext) =>
          filePath.endsWith(ext)
        );
        if (!hasValidExtension) return false;
      }

      // Exclude test files if configured
      if (this.config.excludeTestFiles) {
        const metadata = this.scanResult.fileMetadata.get(filePath);
        if (metadata?.isTest) return false;
      }

      // Exclude node_modules if configured
      if (this.config.excludeNodeModules && filePath.includes("node_modules")) {
        return false;
      }

      return true;
    });
  }

  /**
   * Gets context code for a node (line before, current line, line after)
   * This is the same function signature as used in translations
   * @param node The AST node
   * @param sourceFile The source file
   * @returns Object with before, line, and after text
   */
  private getContextCode(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): { before: string; line: string; after: string } {
    // Get the line number (0-based from TS API)
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    const fileLines = sourceFile.text.split("\n");
    const beforeLine = line > 0 ? fileLines[line - 1].trim() : "";
    const currentLine = fileLines[line].trim();
    const afterLine =
      line + 1 < fileLines.length ? fileLines[line + 1].trim() : "";

    return {
      before: beforeLine,
      line: currentLine,
      after: afterLine,
    };
  }
}
