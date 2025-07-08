#!/usr/bin/env node

import { Command } from "commander";
import analyzeProject from "./index";
import path from "path";
import fs from "fs/promises";
import pc from "picocolors";

// Version from package.json
const packageJson = require("../package.json");

const program = new Command();

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

async function checkProjectValidity(projectPath: string): Promise<boolean> {
  try {
    // Check if directory exists
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      return false;
    }

    // Check for package.json to verify it's a node project
    const packageJsonPath = path.join(projectPath, "package.json");
    await fs.access(packageJsonPath);

    // Check for typical React project folders
    const hasSrc = await fs
      .stat(path.join(projectPath, "src"))
      .then((stat) => stat.isDirectory())
      .catch(() => false);

    return hasSrc;
  } catch (error) {
    return false;
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
  .option("--silent", "Disable progress output", false)
  .option("--contextual-summaries", "Generate contextual summaries", false)
  .option("--max-prompt-length <length>", "Maximum prompt length", "1000")
  .option(
    "--template-preference <type>",
    "Template preference (concise|detailed|technical|business)",
    "detailed"
  )
  .option(
    "--include-code-examples",
    "Include code examples in summaries",
    false
  )
  .action(async (options) => {
    const projectPath = path.resolve(options.path);

    if (options.init) {
      await initConfigFile(projectPath);
      return;
    }

    // Check if the directory looks like a React project
    const isValidProject = await checkProjectValidity(projectPath);
    if (!isValidProject) {
      console.error(
        formatMessage(
          `The specified path doesn't appear to be a valid React project. Please check the path or use --init to create a config file.`,
          "error"
        )
      );
      process.exit(1);
    }

    if (!options.silent) {
      console.log(
        formatMessage(`Analyzing project at: ${projectPath}`, "info")
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

      process.exit(1);
    }
  });

// Add sub-commands
program
  .command("init")
  .description("Initialize a config file")
  .option("-p, --path <path>", "Project path", process.cwd())
  .action(async (options) => {
    await initConfigFile(path.resolve(options.path));
  });

program
  .command("validate")
  .description("Validate the project structure without running analysis")
  .option("-p, --path <path>", "Project path", process.cwd())
  .action(async (options) => {
    const projectPath = path.resolve(options.path);
    const isValid = await checkProjectValidity(projectPath);

    if (isValid) {
      console.log(
        formatMessage(
          `${projectPath} appears to be a valid React project.`,
          "success"
        )
      );
    } else {
      console.error(
        formatMessage(
          `${projectPath} doesn't appear to be a valid React project.`,
          "error"
        )
      );
      process.exit(1);
    }
  });

async function initConfigFile(projectPath: string) {
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

  // Default configuration as a JS module
  const configContent = `module.exports = {
  fileExtensions: [".ts", ".tsx", ".js", ".jsx"],
  rootComponentNames: ["App", "Root", "Main"],
  srcDir: "src",
  outputFileName: "analysis-results.json",
  contextualSummaries: {
    maxPromptLength: 1000,
    includeCodeExamples: false,
    prioritizeBusinessLogic: true,
    includePerformanceNotes: true,
    templatePreference: "detailed",
    customPatterns: []
  }
};`;

  // Write config file
  await fs.writeFile(configPath, configContent);

  console.log(formatMessage(`Config file created at ${configPath}`, "success"));
  console.log("You can now run 'sicua' to start the analysis.");
}

program.parse(process.argv);
