/**
 * Configuration types for project analysis
 */

// Project structure detection interface
export interface ProjectStructureDetection {
  projectType: "nextjs" | "react";
  nextjsVersion?: string;
  routerType?: "app" | "pages";
  detectedSourceDirectory: string;
  hasSourceDirectory: boolean;
  availableDirectories: string[];
}

// Configuration types
export interface ProjectAnalysisConfig {
  fileExtensions: string[];
  rootComponentNames: string[];
  srcDir: string;
  outputFileName: string;
}

export interface IConfigManager extends ProjectAnalysisConfig {
  projectPath: string;

  // Methods for project structure detection
  getProjectStructure(): ProjectStructureDetection | null;
  isSourceDirectoryDetected(): boolean;
  updateSourceDirectory(newSrcDir: string): void;
  validateConfig(): string[];
  getConfigSummary(): string;
}
