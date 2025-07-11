#!/usr/bin/env node

import { Command } from "commander";
import analyzeProject from "./index";
import path from "path";
import fs from "fs/promises";
import pc from "picocolors";

// Version from package.json
const packageJson = require("../package.json");

const program = new Command();

interface ProjectValidationResult {
  isValid: boolean;
  projectType: "nextjs" | "react" | "unknown";
  nextjsVersion?: string;
  routerType?: "app" | "pages";
  hasSourceDirectory: boolean;
  sourceDirectory: string;
  availableDirectories: string[];
  issues: string[];
  suggestions: string[];
}

/**
 * Format an output message with color and icons
 */
function formatMessage(
  message: string,
  type: "info" | "success" | "error" | "warning" = "info"
): string {
  const icons = {
    info: "ℹ",
    success: "✓",
    error: "✖",
    warning: "⚠",
  };

  const colors = {
    info: pc.blue,
    success: pc.green,
    error: pc.red,
    warning: pc.yellow,
  };

  return `${colors[type](icons[type])} ${message}`;
}

/**
 * Enhanced project validation with detailed structure detection
 */
async function validateProject(
  projectPath: string
): Promise<ProjectValidationResult> {
  const result: ProjectValidationResult = {
    isValid: false,
    projectType: "unknown",
    hasSourceDirectory: false,
    sourceDirectory: projectPath,
    availableDirectories: [],
    issues: [],
    suggestions: [],
  };

  try {
    // Check if directory exists
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      result.issues.push("Path is not a directory");
      return result;
    }

    // Check for package.json
    const packageJsonPath = path.join(projectPath, "package.json");
    try {
      await fs.access(packageJsonPath);

      // Parse package.json to determine project type
      const packageContent = await fs.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageContent);

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for React
      const hasReact = dependencies.react;
      if (!hasReact) {
        result.issues.push("No React dependency found in package.json");
        result.suggestions.push(
          "This tool is designed for React/Next.js projects"
        );
        return result;
      }

      // Determine project type
      const nextVersion = dependencies.next;
      if (nextVersion) {
        result.projectType = "nextjs";
        result.nextjsVersion = nextVersion;

        // Determine router type
        const versionMatch = nextVersion.match(/(\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          const minor = parseInt(versionMatch[2]);

          if (major > 13 || (major === 13 && minor >= 4)) {
            result.routerType = "app";
          } else {
            result.routerType = "pages";
          }
        }
      } else {
        result.projectType = "react";
      }
    } catch (error) {
      result.issues.push("package.json not found or invalid");
      result.suggestions.push(
        "Make sure you're in the root directory of a React/Next.js project"
      );
      return result;
    }

    // Check for common project directories
    const possibleDirectories = [
      "src",
      "app",
      "pages",
      "components",
      "lib",
      "utils",
      "hooks",
      "context",
      "store",
      "styles",
      "public",
    ];

    const availableDirectories: string[] = [];

    for (const dir of possibleDirectories) {
      const dirPath = path.join(projectPath, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          availableDirectories.push(dir);
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }

    result.availableDirectories = availableDirectories;

    // Determine source directory
    if (availableDirectories.includes("src")) {
      result.hasSourceDirectory = true;
      result.sourceDirectory = path.join(projectPath, "src");
    } else {
      result.sourceDirectory = projectPath;
    }

    // Check for source files
    const hasSourceFiles = await checkForSourceFiles(result.sourceDirectory);
    if (!hasSourceFiles) {
      result.issues.push("No React/TypeScript source files found");
      result.suggestions.push(
        "Make sure your project contains .tsx, .jsx, .ts, or .js files"
      );
    }

    // Project type specific validations
    if (result.projectType === "nextjs") {
      await validateNextJsProject(projectPath, result);
    } else {
      await validateReactProject(projectPath, result);
    }

    // Determine if project is valid
    result.isValid = result.issues.length === 0;

    return result;
  } catch (error) {
    result.issues.push(
      `Failed to validate project: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return result;
  }
}

/**
 * Validate Next.js specific requirements
 */
async function validateNextJsProject(
  projectPath: string,
  result: ProjectValidationResult
): Promise<void> {
  const { routerType, availableDirectories } = result;

  if (routerType === "app") {
    // App router validation
    if (!availableDirectories.includes("app") && !result.hasSourceDirectory) {
      result.issues.push(
        "Next.js App Router project should have an 'app' directory"
      );
      result.suggestions.push(
        "Create an 'app' directory or use 'src/app' structure"
      );
    }

    // Check for app router files
    const appDir = result.hasSourceDirectory
      ? path.join(projectPath, "src", "app")
      : path.join(projectPath, "app");

    try {
      await fs.access(appDir);
      const appFiles = await fs.readdir(appDir);
      const hasLayout = appFiles.some((file) => file.startsWith("layout."));

      if (!hasLayout) {
        result.suggestions.push(
          "Consider adding a root layout.tsx file in your app directory"
        );
      }
    } catch {
      // App directory might not exist yet, which is okay for validation
    }
  } else if (routerType === "pages") {
    // Pages router validation
    if (!availableDirectories.includes("pages") && !result.hasSourceDirectory) {
      result.issues.push(
        "Next.js Pages Router project should have a 'pages' directory"
      );
      result.suggestions.push(
        "Create a 'pages' directory or use 'src/pages' structure"
      );
    }
  }

  // Check for Next.js config
  const configFiles = ["next.config.js", "next.config.ts", "next.config.mjs"];
  let hasConfig = false;

  for (const configFile of configFiles) {
    try {
      await fs.access(path.join(projectPath, configFile));
      hasConfig = true;
      break;
    } catch {
      // Continue checking
    }
  }

  if (!hasConfig) {
    result.suggestions.push(
      "Consider adding a next.config.js file for better configuration"
    );
  }
}

/**
 * Validate React project requirements
 */
async function validateReactProject(
  projectPath: string,
  result: ProjectValidationResult
): Promise<void> {
  // Check for common React project structure
  if (
    !result.hasSourceDirectory &&
    !result.availableDirectories.includes("components")
  ) {
    result.suggestions.push(
      "Consider organizing your code in a 'src' or 'components' directory"
    );
  }

  // Check for common React files
  const commonFiles = ["index.html", "public/index.html"];
  let hasEntryPoint = false;

  for (const file of commonFiles) {
    try {
      await fs.access(path.join(projectPath, file));
      hasEntryPoint = true;
      break;
    } catch {
      // Continue checking
    }
  }

  if (!hasEntryPoint) {
    result.suggestions.push(
      "Make sure your project has an entry point (index.html)"
    );
  }
}

/**
 * Check if directory contains React/TypeScript source files
 */
async function checkForSourceFiles(directory: string): Promise<boolean> {
  try {
    const files = await fs.readdir(directory, { recursive: true });
    const sourceExtensions = [".tsx", ".jsx", ".ts", ".js"];

    return files.some(
      (file) =>
        typeof file === "string" &&
        sourceExtensions.some((ext) => file.endsWith(ext)) &&
        !file.includes("node_modules") &&
        !file.includes(".d.ts")
    );
  } catch (error) {
    return false;
  }
}

/**
 * Display project validation results
 */
function displayValidationResults(
  result: ProjectValidationResult,
  projectPath: string
): void {
  console.log(`\n🔍 Project Validation Results for: ${pc.cyan(projectPath)}`);

  // Project type and basic info
  if (result.projectType !== "unknown") {
    console.log(
      formatMessage(`Project type: ${result.projectType.toUpperCase()}`, "info")
    );

    if (result.projectType === "nextjs") {
      console.log(
        formatMessage(`Next.js version: ${result.nextjsVersion}`, "info")
      );
      console.log(
        formatMessage(
          `Router type: ${result.routerType?.toUpperCase()}`,
          "info"
        )
      );
    }
  }

  // Source directory info
  console.log(
    formatMessage(
      `Source directory: ${
        result.hasSourceDirectory ? "src/" : "project root"
      }`,
      "info"
    )
  );

  // Available directories
  if (result.availableDirectories.length > 0) {
    console.log(
      formatMessage(
        `Found directories: ${result.availableDirectories.join(", ")}`,
        "info"
      )
    );
  }

  // Issues
  if (result.issues.length > 0) {
    console.log("\n❌ Issues found:");
    result.issues.forEach((issue) => {
      console.log(`   ${formatMessage(issue, "error")}`);
    });
  }

  // Suggestions
  if (result.suggestions.length > 0) {
    console.log("\n💡 Suggestions:");
    result.suggestions.forEach((suggestion) => {
      console.log(`   ${formatMessage(suggestion, "warning")}`);
    });
  }

  // Final result
  if (result.isValid) {
    console.log(formatMessage("\nProject validation passed! ✨", "success"));
  } else {
    console.log(formatMessage("\nProject validation failed", "error"));
    console.log(
      formatMessage(
        "You can still try running the analysis, but results may be limited",
        "warning"
      )
    );
  }
}

program
  .name("sicua")
  .description("A tool for analyzing React project structure and dependencies")
  .version(packageJson.version)
  .option("-p, --path <path>", "Path to the project", process.cwd())
  .option("-o, --output <path>", "Output file path")
  .option("--src <dir>", "Source directory to analyze")
  .option("--root-components <names>", "Root component names (comma-separated)")
  .option("--extensions <exts>", "File extensions to process (comma-separated)")
  .option("--verbose", "Enable verbose output", false)
  .option("--init", "Initialize a config file", false)
  .option("--silent", "Disable progress output", true)
  .option("--force", "Force analysis even if validation fails", false)
  .action(async (options) => {
    const projectPath = path.resolve(options.path);

    if (options.init) {
      await initConfigFile(projectPath);
      return;
    }

    // Enhanced project validation
    const validationResult = await validateProject(projectPath);

    if (!options.silent) {
      displayValidationResults(validationResult, projectPath);
    }

    // Decide whether to proceed based on validation
    if (!validationResult.isValid && !options.force) {
      console.error(
        formatMessage(
          "Project validation failed. Use --force to proceed anyway or fix the issues above.",
          "error"
        )
      );
      process.exit(1);
    }

    if (!validationResult.isValid && options.force) {
      console.log(
        formatMessage(
          "Forcing analysis despite validation issues...",
          "warning"
        )
      );
    }

    try {
      // Prepare options to pass to analyzer
      const analyzerOptions: any = {
        projectPath,
        silent: options.silent,
      };

      // Add optional parameters if specified
      if (options.output) analyzerOptions.outputFileName = options.output;
      if (options.src) analyzerOptions.srcDir = options.src;
      if (options.verbose) analyzerOptions.verbose = options.verbose;

      // Process array options
      if (options.rootComponents) {
        analyzerOptions.rootComponentNames = options.rootComponents
          .split(",")
          .map((c: string) => c.trim());
      }

      if (options.extensions) {
        analyzerOptions.fileExtensions = options.extensions
          .split(",")
          .map((e: string) => e.trim());
      }

      await analyzeProject(analyzerOptions);
    } catch (error) {
      console.error(
        formatMessage(
          `Error during analysis: ${
            error instanceof Error ? error.message : String(error)
          }`,
          "error"
        )
      );

      if (options.verbose && error instanceof Error && error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }

      // Provide helpful suggestions based on validation results
      if (!validationResult.isValid) {
        console.error(
          "\n💡 The analysis failed and validation issues were detected."
        );
        console.error(
          "Consider fixing the validation issues above and trying again."
        );
      }

      process.exit(1);
    }
  });

// Enhanced validate command
program
  .command("validate")
  .description("Validate the project structure without running analysis")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("--detailed", "Show detailed validation information", false)
  .action(async (options) => {
    const projectPath = path.resolve(options.path);
    const validationResult = await validateProject(projectPath);

    if (options.detailed) {
      displayValidationResults(validationResult, projectPath);
    } else {
      if (validationResult.isValid) {
        console.log(
          formatMessage(
            `${projectPath} is a valid ${validationResult.projectType.toUpperCase()} project.`,
            "success"
          )
        );
      } else {
        console.error(
          formatMessage(`${projectPath} has validation issues.`, "error")
        );
        console.log("Run with --detailed for more information.");
      }
    }

    process.exit(validationResult.isValid ? 0 : 1);
  });

// Enhanced init command
program
  .command("init")
  .description("Initialize a config file")
  .option("-p, --path <path>", "Project path", process.cwd())
  .action(async (options) => {
    await initConfigFile(path.resolve(options.path), options.template);
  });

// New info command
program
  .command("info")
  .description("Show project information and structure")
  .option("-p, --path <path>", "Project path", process.cwd())
  .action(async (options) => {
    const projectPath = path.resolve(options.path);
    const validationResult = await validateProject(projectPath);
    displayValidationResults(validationResult, projectPath);
  });

async function initConfigFile(projectPath: string, template: string = "basic") {
  const configPath = path.join(projectPath, "sicua.config.js");

  // Check if config already exists
  try {
    await fs.access(configPath);

    console.log(
      formatMessage(`Config file already exists at ${configPath}`, "warning")
    );
    console.log("To overwrite it, delete the file and run this command again.");
    return;
  } catch (error) {
    // File doesn't exist, continue
  }

  // Validate project first to generate appropriate config
  const validation = await validateProject(projectPath);

  // Generate config based on project type and template
  let configContent = "";

  if (template === "nextjs" || validation.projectType === "nextjs") {
    configContent = generateNextJsConfig(validation);
  } else if (template === "react" || validation.projectType === "react") {
    configContent = generateReactConfig(validation);
  } else {
    configContent = generateBasicConfig();
  }

  // Write config file
  await fs.writeFile(configPath, configContent);

  console.log(formatMessage(`Config file created at ${configPath}`, "success"));
  console.log(`Template used: ${validation.projectType || template}`);
  console.log("You can now run 'sicua' to start the analysis.");
}

function generateNextJsConfig(validation: ProjectValidationResult): string {
  const srcDir = validation.hasSourceDirectory ? "src" : ".";
  const routerSpecificComponents =
    validation.routerType === "app"
      ? ["layout", "page", "loading", "error", "not-found", "template"]
      : ["_app", "_document", "index"];

  return `module.exports = {
  // File extensions to analyze
  fileExtensions: [".ts", ".tsx", ".js", ".jsx"],
  
  // Root component names (Next.js ${validation.routerType} router specific)
  rootComponentNames: [${routerSpecificComponents
    .map((c) => `"${c}"`)
    .join(", ")}, "App", "Root", "Main"],
  
  // Source directory
  srcDir: "${srcDir}",
  
  // Output file
  outputFileName: "analysis-results.json",
};`;
}

function generateReactConfig(validation: ProjectValidationResult): string {
  const srcDir = validation.hasSourceDirectory ? "src" : ".";

  return `module.exports = {
  // File extensions to analyze
  fileExtensions: [".ts", ".tsx", ".js", ".jsx"],
  
  // Root component names (React project)
  rootComponentNames: ["App", "Root", "Main", "Index"],
  
  // Source directory
  srcDir: "${srcDir}",
  
  // Output file
  outputFileName: "analysis-results.json",
};`;
}

function generateBasicConfig(): string {
  return `module.exports = {
  fileExtensions: [".ts", ".tsx", ".js", ".jsx"],
  rootComponentNames: ["App", "Root", "Main"],
  srcDir: "src",
  outputFileName: "analysis-results.json",
};`;
}

program.parse(process.argv);
