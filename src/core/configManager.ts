import * as path from "path";
import * as fs from "fs";
import { ProjectAnalysisConfig } from "../types";

export interface ProjectStructureDetection {
  projectType: "nextjs" | "react";
  nextjsVersion?: string;
  routerType?: "app" | "pages";
  detectedSourceDirectory: string;
  hasSourceDirectory: boolean;
  availableDirectories: string[];
}

export class ConfigManager implements ProjectAnalysisConfig {
  fileExtensions: string[];
  rootComponentNames: string[];
  srcDir: string;
  outputFileName: string;
  projectPath: string;

  // Internal properties for dynamic detection
  private _projectStructure: ProjectStructureDetection | null = null;
  private _isSourceDirDetected: boolean = false;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.fileExtensions = [".ts", ".tsx", ".js", ".jsx"];
    this.rootComponentNames = ["main", "index", "app"];
    this.srcDir = ""; // Will be set dynamically
    this.outputFileName = "analysis-results.json";
  }

  async loadConfig(): Promise<void> {
    // First detect project structure
    await this.detectProjectStructure();

    // Then try to load user config
    const configPath = path.join(this.projectPath, "sicua.config.js");
    try {
      const userConfig = require(configPath);
      this.mergeConfig(userConfig);
    } catch (error) {
      console.log("No custom configuration found. Using default settings.");
    }

    // Resolve paths after all config is loaded
    this.resolvePaths();
  }

  /**
   * Detect project structure and set appropriate defaults
   */
  private async detectProjectStructure(): Promise<void> {
    this._projectStructure = await this.analyzeProjectStructure();

    // Set source directory based on detection
    this.srcDir = this._projectStructure.detectedSourceDirectory;
    this._isSourceDirDetected = true;

    // Adjust root component names based on project type
    this.adjustRootComponentNames();
  }

  /**
   * Analyze the project structure to determine type and source directory
   */
  private async analyzeProjectStructure(): Promise<ProjectStructureDetection> {
    const packageJsonPath = path.join(this.projectPath, "package.json");

    let detection: ProjectStructureDetection = {
      projectType: "react",
      detectedSourceDirectory: this.projectPath,
      hasSourceDirectory: false,
      availableDirectories: [],
    };

    // Read package.json to determine project type
    try {
      const packageContent = fs.readFileSync(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageContent);

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const nextVersion = dependencies.next;

      if (nextVersion) {
        detection.projectType = "nextjs";
        detection.nextjsVersion = nextVersion;

        // Determine router type based on version
        const versionMatch = nextVersion.match(/(\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          const minor = parseInt(versionMatch[2]);

          if (major > 13 || (major === 13 && minor >= 4)) {
            detection.routerType = "app";
          } else {
            detection.routerType = "pages";
          }
        } else {
          detection.routerType = "pages";
        }
      }
    } catch (error) {
      console.warn("Could not read package.json, assuming React project");
    }

    // Detect available directories
    const possibleDirectories = [
      "src",
      "app",
      "pages",
      "components",
      "lib",
      "utils",
      "hooks",
    ];
    const availableDirectories: string[] = [];

    for (const dir of possibleDirectories) {
      const dirPath = path.join(this.projectPath, dir);
      try {
        const stat = fs.statSync(dirPath);
        if (stat.isDirectory()) {
          availableDirectories.push(dir);
        }
      } catch {
        // Directory doesn't exist
      }
    }

    detection.availableDirectories = availableDirectories;

    // Determine source directory with priority system
    detection.detectedSourceDirectory = this.determineSourceDirectory(
      detection,
      availableDirectories
    );
    detection.hasSourceDirectory = availableDirectories.includes("src");

    return detection;
  }

  /**
   * Determine the best source directory based on project structure
   */
  private determineSourceDirectory(
    detection: ProjectStructureDetection,
    availableDirectories: string[]
  ): string {
    // Priority 1: src directory (universal preference)
    if (availableDirectories.includes("src")) {
      return path.join(this.projectPath, "src");
    }

    // Priority 2: Next.js specific directories
    if (detection.projectType === "nextjs") {
      if (
        detection.routerType === "app" &&
        availableDirectories.includes("app")
      ) {
        return this.projectPath; // Use project root for app router without src
      }
      if (
        detection.routerType === "pages" &&
        availableDirectories.includes("pages")
      ) {
        return this.projectPath; // Use project root for pages router without src
      }
    }

    // Priority 3: Common React directories
    const commonReactDirs = ["components", "lib", "utils"];
    for (const dir of commonReactDirs) {
      if (availableDirectories.includes(dir)) {
        return this.projectPath; // Use project root if any common directories exist
      }
    }

    // Fallback: project root
    return this.projectPath;
  }

  /**
   * Adjust root component names based on project type and structure
   */
  private adjustRootComponentNames(): void {
    if (!this._projectStructure) return;

    const { projectType, routerType, hasSourceDirectory } =
      this._projectStructure;

    // Create a comprehensive list based on project structure
    let adjustedNames = [...this.rootComponentNames];

    if (projectType === "nextjs") {
      if (routerType === "app") {
        // App router specific entry points
        adjustedNames.unshift(
          "layout",
          "page",
          "template",
          "loading",
          "error",
          "not-found"
        );
        if (hasSourceDirectory) {
          adjustedNames.push("root-layout", "global-layout");
        }
      } else {
        // Pages router specific entry points
        adjustedNames.unshift("_app", "_document", "index");
      }
    } else {
      // Regular React project
      adjustedNames.unshift("App", "Root", "Main", "Index");
    }

    // Remove duplicates while preserving order
    this.rootComponentNames = Array.from(new Set(adjustedNames));
  }

  /**
   * Update source directory (called by directory scanner)
   */
  updateSourceDirectory(newSrcDir: string): void {
    if (this._isSourceDirDetected && this.srcDir !== newSrcDir) {
      this.srcDir = newSrcDir;
    }
  }

  /**
   * Get detected project structure information
   */
  getProjectStructure(): ProjectStructureDetection | null {
    return this._projectStructure;
  }

  /**
   * Check if the source directory was auto-detected
   */
  isSourceDirectoryDetected(): boolean {
    return this._isSourceDirDetected;
  }

  /**
   * Merge user configuration with detected defaults
   */
  private mergeConfig(userConfig: Partial<ProjectAnalysisConfig>): void {
    if (userConfig.fileExtensions) {
      this.fileExtensions = userConfig.fileExtensions;
    }

    if (userConfig.rootComponentNames) {
      // If user provides custom root components, prepend them to detected ones
      const userComponents = userConfig.rootComponentNames;
      const detectedComponents = this.rootComponentNames;
      this.rootComponentNames = Array.from(
        new Set([...userComponents, ...detectedComponents])
      );
    }

    // Only override srcDir if user explicitly set it AND it exists
    if (userConfig.srcDir) {
      const userSrcDir = path.resolve(this.projectPath, userConfig.srcDir);
      try {
        const stat = fs.statSync(userSrcDir);
        if (stat.isDirectory()) {
          this.srcDir = userConfig.srcDir;
          this._isSourceDirDetected = false; // User override
        } else {
          console.warn(
            `⚠️  User-specified srcDir "${userSrcDir}" is not a directory, using detected: ${this.srcDir}`
          );
        }
      } catch (error) {
        console.warn(
          `⚠️  User-specified srcDir "${userSrcDir}" does not exist, using detected: ${this.srcDir}`
        );
      }
    }

    if (userConfig.outputFileName) {
      this.outputFileName = userConfig.outputFileName;
    }
  }

  /**
   * Resolve all paths to absolute paths
   */
  private resolvePaths(): void {
    // Resolve srcDir - handle both absolute and relative paths
    if (path.isAbsolute(this.srcDir)) {
      // Already absolute, keep as is
    } else if (this.srcDir === "" || this.srcDir === ".") {
      // Empty or current directory means project root
      this.srcDir = this.projectPath;
    } else {
      // Relative path, resolve against project path
      this.srcDir = path.resolve(this.projectPath, this.srcDir);
    }

    // Resolve output file name
    if (path.isAbsolute(this.outputFileName)) {
      // Already absolute, keep as is
    } else {
      this.outputFileName = path.resolve(this.projectPath, this.outputFileName);
    }

    // Validate that srcDir exists
    try {
      const stat = fs.statSync(this.srcDir);
      if (!stat.isDirectory()) {
        throw new Error(`Source directory is not a directory: ${this.srcDir}`);
      }
    } catch (error) {
      console.error(`❌ Source directory does not exist: ${this.srcDir}`);
      // Fallback to project root
      this.srcDir = this.projectPath;
    }
  }

  /**
   * Validate configuration and provide warnings for potential issues
   */
  validateConfig(): string[] {
    const warnings: string[] = [];

    if (!this._projectStructure) {
      warnings.push("Project structure was not detected properly");
    }

    // Check if file extensions make sense for detected project type
    if (this._projectStructure?.projectType === "nextjs") {
      const hasTypeScript = this.fileExtensions.some((ext) =>
        ext.includes("ts")
      );
      if (!hasTypeScript) {
        warnings.push(
          "Next.js project detected but no TypeScript extensions configured"
        );
      }
    }

    // Check if source directory contains expected files
    if (this.srcDir) {
      const hasFiles = this.checkForSourceFiles();
      if (!hasFiles) {
        warnings.push(
          `Source directory "${this.srcDir}" appears to be empty or contains no matching files`
        );
      }
    }

    return warnings;
  }

  /**
   * Check if source directory contains files with configured extensions
   */
  private checkForSourceFiles(): boolean {
    try {
      const files = fs.readdirSync(this.srcDir, { recursive: true });
      return files.some(
        (file) =>
          typeof file === "string" &&
          this.fileExtensions.some((ext) => file.endsWith(ext))
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get final configuration object
   */
  getConfig(): ProjectAnalysisConfig {
    return {
      fileExtensions: this.fileExtensions,
      rootComponentNames: this.rootComponentNames,
      srcDir: this.srcDir,
      outputFileName: this.outputFileName,
    };
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): string {
    const structure = this._projectStructure;
    return `
📋 Configuration Summary:
  Project Type: ${structure?.projectType?.toUpperCase() || "Unknown"}
  ${
    structure?.projectType === "nextjs"
      ? `Next.js Version: ${structure.nextjsVersion}`
      : ""
  }
  ${
    structure?.routerType
      ? `Router Type: ${structure.routerType.toUpperCase()}`
      : ""
  }
  Source Directory: ${this.srcDir}
  ${this._isSourceDirDetected ? "(Auto-detected)" : "(User-specified)"}
  Available Directories: ${structure?.availableDirectories.join(", ") || "None"}
  File Extensions: ${this.fileExtensions.join(", ")}
  Root Components: ${this.rootComponentNames.slice(0, 5).join(", ")}${
      this.rootComponentNames.length > 5 ? "..." : ""
    }
  Output File: ${this.outputFileName}
    `.trim();
  }
}
