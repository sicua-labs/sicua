/**
 * Project Metadata Detector - Extracts project metadata from package.json and configuration files
 */

import * as fs from "fs";
import * as path from "path";
import {
  FRAMEWORK_PACKAGES,
  UI_STYLING_PACKAGES,
  STATE_MANAGEMENT_PACKAGES,
  DEVELOPMENT_TOOLS,
  CONFIG_FILES,
} from "../constants/projectMetadata.constants";

export interface PackageJsonMetadata {
  name?: string;
  version?: string;
  description?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
}

export interface FrameworkInfo {
  react?: string;
  nextjs?: string;
  typescript?: string;
  nodejs?: string;
}

export interface DevelopmentTools {
  buildTools: Record<string, string>;
  linting: Record<string, string>;
  testing: Record<string, string>;
  bundlers: Record<string, string>;
}

export interface UIAndStyling {
  cssFrameworks: Record<string, string>;
  uiLibraries: Record<string, string>;
  iconLibraries: Record<string, string>;
}

export interface StateManagement {
  libraries: Record<string, string>;
}

export interface ConfigurationFiles {
  nextConfig: boolean;
  tsConfig: boolean;
  eslintConfig: boolean;
  prettierConfig: boolean;
  jestConfig: boolean;
  vitestConfig: boolean;
  playwrightConfig: boolean;
  cypressConfig: boolean;
}

export interface ProjectMetadata {
  packageInfo: {
    name?: string;
    version?: string;
    description?: string;
    private?: boolean;
    hasScripts: boolean;
    scriptCount: number;
  };
  framework: FrameworkInfo;
  developmentTools: DevelopmentTools;
  uiAndStyling: UIAndStyling;
  stateManagement: StateManagement;
  configurationFiles: ConfigurationFiles;
}

/**
 * Detects project metadata from package.json and configuration files
 * @param projectRoot Root directory of the project
 * @returns ProjectMetadata object with all detected information
 */
export function detectProjectMetadata(projectRoot: string): ProjectMetadata {
  const packageJsonPath = path.join(projectRoot, "package.json");

  let packageJson: PackageJsonMetadata = {};

  // Read package.json if it exists
  try {
    if (fs.existsSync(packageJsonPath)) {
      const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
      packageJson = JSON.parse(packageJsonContent);
    }
  } catch (error) {
    console.warn(`Error reading package.json: ${error}`);
  }

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  return {
    packageInfo: extractPackageInfo(packageJson),
    framework: extractFrameworkInfo(packageJson, allDependencies),
    developmentTools: extractDevelopmentTools(allDependencies),
    uiAndStyling: extractUIAndStyling(allDependencies),
    stateManagement: extractStateManagement(allDependencies),
    configurationFiles: detectConfigurationFiles(projectRoot),
  };
}

/**
 * Extracts basic package information
 */
function extractPackageInfo(packageJson: PackageJsonMetadata) {
  return {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    private: packageJson.private,
    hasScripts:
      !!packageJson.scripts && Object.keys(packageJson.scripts).length > 0,
    scriptCount: packageJson.scripts
      ? Object.keys(packageJson.scripts).length
      : 0,
  };
}

/**
 * Extracts framework and runtime information
 */
function extractFrameworkInfo(
  packageJson: PackageJsonMetadata,
  allDependencies: Record<string, string>
): FrameworkInfo {
  const frameworkInfo: FrameworkInfo = {};

  FRAMEWORK_PACKAGES.forEach(({ key, packageNames }) => {
    for (const packageName of packageNames) {
      if (allDependencies[packageName]) {
        frameworkInfo[key as keyof FrameworkInfo] =
          allDependencies[packageName];
        break;
      }
    }
  });

  // Check Node.js version from engines
  if (packageJson.engines?.node) {
    frameworkInfo.nodejs = packageJson.engines.node;
  }

  return frameworkInfo;
}

/**
 * Extracts development tools information
 */
function extractDevelopmentTools(
  allDependencies: Record<string, string>
): DevelopmentTools {
  const tools: DevelopmentTools = {
    buildTools: {},
    linting: {},
    testing: {},
    bundlers: {},
  };

  Object.entries(DEVELOPMENT_TOOLS).forEach(([category, packages]) => {
    packages.forEach((packageName) => {
      if (allDependencies[packageName]) {
        tools[category as keyof DevelopmentTools][packageName] =
          allDependencies[packageName];
      }
    });
  });

  return tools;
}

/**
 * Extracts UI and styling library information
 */
function extractUIAndStyling(
  allDependencies: Record<string, string>
): UIAndStyling {
  const uiStyling: UIAndStyling = {
    cssFrameworks: {},
    uiLibraries: {},
    iconLibraries: {},
  };

  Object.entries(UI_STYLING_PACKAGES).forEach(([category, packages]) => {
    packages.forEach((packageName) => {
      if (allDependencies[packageName]) {
        uiStyling[category as keyof UIAndStyling][packageName] =
          allDependencies[packageName];
      }
    });
  });

  return uiStyling;
}

/**
 * Extracts state management library information
 */
function extractStateManagement(
  allDependencies: Record<string, string>
): StateManagement {
  const stateManagement: StateManagement = {
    libraries: {},
  };

  STATE_MANAGEMENT_PACKAGES.forEach((packageName) => {
    if (allDependencies[packageName]) {
      stateManagement.libraries[packageName] = allDependencies[packageName];
    }
  });

  return stateManagement;
}

/**
 * Detects presence of configuration files
 */
function detectConfigurationFiles(projectRoot: string): ConfigurationFiles {
  const configFiles: ConfigurationFiles = {
    nextConfig: false,
    tsConfig: false,
    eslintConfig: false,
    prettierConfig: false,
    jestConfig: false,
    vitestConfig: false,
    playwrightConfig: false,
    cypressConfig: false,
  };

  Object.entries(CONFIG_FILES).forEach(([configType, fileNames]) => {
    configFiles[configType as keyof ConfigurationFiles] = fileNames.some(
      (fileName) => fs.existsSync(path.join(projectRoot, fileName))
    );
  });

  return configFiles;
}
