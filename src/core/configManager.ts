import * as path from "path";
import { ProjectAnalysisConfig } from "../types";
import { ContextualSummariesConfig } from "../analyzers/contextualSummaries/types/contextualSummaries.types";

export class ConfigManager implements ProjectAnalysisConfig {
  fileExtensions: string[];
  rootComponentNames: string[];
  srcDir: string;
  outputFileName: string;
  projectPath: string;
  contextualSummaries: ContextualSummariesConfig;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.fileExtensions = [".ts", ".tsx", ".js", ".jsx"];
    this.rootComponentNames = ["main", "index", "app"];
    this.srcDir = "src";
    this.outputFileName = "analysis-results.json";
    this.contextualSummaries = {
      maxPromptLength: 1000,
      includeCodeExamples: false,
      prioritizeBusinessLogic: true,
      includePerformanceNotes: true,
      templatePreference: "detailed",
      customPatterns: [],
    };
  }

  async loadConfig(): Promise<void> {
    const configPath = path.join(this.projectPath, "sicua.config.js");
    try {
      const userConfig = require(configPath);
      this.mergeConfig(userConfig);
    } catch (error) {
      console.log("No custom configuration found. Using default settings.");
    }

    // Resolve paths
    this.srcDir = path.resolve(this.projectPath, this.srcDir);
    this.outputFileName = path.resolve(this.projectPath, this.outputFileName);
  }

  private mergeConfig(userConfig: Partial<ProjectAnalysisConfig>): void {
    if (userConfig.fileExtensions)
      this.fileExtensions = userConfig.fileExtensions;
    if (userConfig.rootComponentNames)
      this.rootComponentNames = userConfig.rootComponentNames;
    if (userConfig.srcDir) this.srcDir = userConfig.srcDir;
    if (userConfig.outputFileName)
      this.outputFileName = userConfig.outputFileName;
    if (userConfig.contextualSummaries) {
      this.contextualSummaries = {
        ...this.contextualSummaries,
        ...userConfig.contextualSummaries,
      };
    }
  }

  getConfig(): ProjectAnalysisConfig {
    return {
      fileExtensions: this.fileExtensions,
      rootComponentNames: this.rootComponentNames,
      srcDir: this.srcDir,
      outputFileName: this.outputFileName,
      contextualSummaries: this.contextualSummaries,
    };
  }
}
