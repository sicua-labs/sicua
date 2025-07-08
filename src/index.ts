import { ProjectAnalyzer } from "./core/projectAnalyzer";
import { ConfigManager } from "./core/configManager";
import { ProgressTracker } from "./core/progressTracker";
import * as fs from "fs/promises";
import path from "path";

// Export types for users who want to work with the analysis results programmatically
export {
  AnalysisResult,
  ComponentRelation,
  ProjectAnalysisConfig,
  FunctionData,
  StateFlow,
  TypeAnalysisResult,
  ComplexityAnalysisResult,
  DependencyAnalysisDetailedResult,
  ComponentSimilarity,
} from "./types";

// Export core classes for programmatic use
export { ProjectAnalyzer, ConfigManager, ProgressTracker };

/**
 * Configuration options for project analysis
 */
export interface AnalysisOptions {
  /**
   * Path to the project root
   */
  projectPath: string;

  /**
   * Path where analysis results will be saved
   */
  outputFileName?: string;

  /**
   * Path to source directory, relative to project path
   */
  srcDir?: string;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;

  /**
   * Custom root component names to consider as entry points
   */
  rootComponentNames?: string[];

  /**
   * File extensions to include in analysis
   */
  fileExtensions?: string[];

  /**
   * Disable terminal output (for programmatic use)
   */
  silent?: boolean;
}

/**
 * Analyzes a React project and generates a comprehensive analysis report
 *
 * @param options Analysis configuration options or path to project
 * @returns Promise that resolves when analysis is complete
 */
export async function analyzeProject(
  options: string | AnalysisOptions
): Promise<void> {
  // Handle the case where only a string path is provided
  const config: AnalysisOptions =
    typeof options === "string" ? { projectPath: options } : options;

  // Normalize project path
  const projectPath = path.resolve(config.projectPath);

  try {
    // Check if the project path exists
    await fs.access(projectPath);
  } catch (error) {
    throw new Error(
      `Project path ${projectPath} does not exist or is not accessible`
    );
  }

  // Create the project analyzer
  const analyzer = new ProjectAnalyzer(projectPath);

  // Configure the analyzer with options if provided
  if (
    config.outputFileName ||
    config.srcDir ||
    config.rootComponentNames ||
    config.fileExtensions
  ) {
    // Get the config manager and apply options
    const configManager = (analyzer as any).config as ConfigManager;

    // Wait for the config to load first to get proper default values
    await configManager.loadConfig();

    // Apply CLI options to override config file settings
    if (config.outputFileName) {
      configManager.outputFileName = path.resolve(
        projectPath,
        config.outputFileName
      );
    }

    if (config.srcDir) {
      configManager.srcDir = path.resolve(projectPath, config.srcDir);
    }

    if (config.rootComponentNames) {
      configManager.rootComponentNames = config.rootComponentNames;
    }

    if (config.fileExtensions) {
      configManager.fileExtensions = config.fileExtensions;
    }
  }

  // Enable verbose logging if requested
  if (config.verbose) {
    // Simple wrapper that adds timestamps to all console logs
    const originalConsoleLog = console.log;
    console.log = function (...args) {
      originalConsoleLog(`[sicua] [${new Date().toISOString()}]`, ...args);
    };
  }

  // Run the analysis
  await analyzer.analyze();
}

// Default export for CommonJS compatibility
export default analyzeProject;
