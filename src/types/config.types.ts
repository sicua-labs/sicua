/**
 * Configuration types for project analysis
 */

import { ContextualSummariesConfig } from "../analyzers/contextualSummaries/types/contextualSummaries.types";

// Configuration types
export interface ProjectAnalysisConfig {
  fileExtensions: string[];
  rootComponentNames: string[];
  srcDir: string;
  outputFileName: string;
  contextualSummaries?: ContextualSummariesConfig;
}

export interface ConfigManager extends ProjectAnalysisConfig {
  projectPath: string;
}
