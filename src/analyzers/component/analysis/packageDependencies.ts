import { parsePackageJson } from "../../../parsers/fileParser";
import {
  ComponentRelation,
  IConfigManager,
  DependencyAnalysisResult,
} from "../../../types";
import * as fs from "fs/promises";
import * as path from "path";
import {
  CONFIG_FILES,
  isDevToolPackage,
  isSpecialPackage,
} from "../../../constants/dependencyAnalyzer.constants";
import fg from "fast-glob";
import { isPathAlias } from "../../../utils/common/pathUtils";
import { PackageDependencyContext } from "../types/component.types";
import { PathResolver } from "../../../parsers/pathResolver";

/**
 * Analyzes package dependencies using optimized path resolution
 * @param components The list of components to analyze
 * @param config The config manager with project path
 * @param scanResult The enhanced scan result with file metadata
 * @param pathResolver Pre-initialized path resolver for O(1) external package detection
 * @returns Analysis result with unused and missing dependencies
 */
export async function analyzeDependencies(
  components: ComponentRelation[],
  config: IConfigManager,
  pathResolver: PathResolver
): Promise<DependencyAnalysisResult> {
  const packageDependencies = await parsePackageJson(config.projectPath);
  const context: PackageDependencyContext = {
    usedDependencies: new Set<string>(),
    usedInConfigs: new Set<string>(),
  };

  // Analyze components - only collect external package dependencies
  collectExternalDependencies(components, context, pathResolver);

  // Analyze config files - only collect external package dependencies
  await collectConfigExternalDependencies(
    config.projectPath,
    context,
    pathResolver
  );

  // Find unused dependencies
  const unusedDependencies = Object.keys(packageDependencies).filter(
    (dep) =>
      !context.usedDependencies.has(dep) &&
      !context.usedInConfigs.has(dep) &&
      !isSpecialPackage(dep) &&
      !isDevToolPackage(dep)
  );

  // Find missing dependencies (should now only be actual external packages)
  const missingDependencies = Array.from(context.usedDependencies).filter(
    (dep) => !packageDependencies[dep]
  );

  return {
    unusedDependencies,
    missingDependencies,
  };
}

/**
 * Collects only external package dependencies from components using optimized path resolution
 */
function collectExternalDependencies(
  components: ComponentRelation[],
  context: PackageDependencyContext,
  pathResolver: PathResolver
): void {
  for (const component of components) {
    for (const importPath of component.imports) {
      const resolution = pathResolver.resolveImportPath(
        importPath,
        component.fullPath
      );

      // Only process external packages
      if (resolution.isExternal && resolution.packageName) {
        if (!isPathAlias(resolution.packageName)) {
          context.usedDependencies.add(resolution.packageName);
        }
      }
    }
  }
}

/**
 * Collects only external package dependencies from config files using optimized detection
 */
async function collectConfigExternalDependencies(
  projectPath: string,
  context: PackageDependencyContext,
  pathResolver: PathResolver
): Promise<void> {
  const configPatterns = [...CONFIG_FILES];
  const configFiles = await fg(configPatterns, {
    cwd: projectPath,
    absolute: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**"],
  });

  await Promise.all(
    configFiles.map(async (configPath) => {
      try {
        const content = await fs.readFile(path.resolve(configPath), "utf8");

        // Extract all import/require patterns efficiently
        const importPatterns = extractImportPatterns(content);

        for (const importPath of importPatterns) {
          // Use PathResolver for consistent external package detection
          if (pathResolver.isExternalPackage(importPath)) {
            const packageName = pathResolver.extractPackageName(importPath);
            if (packageName && !isPathAlias(packageName)) {
              context.usedInConfigs.add(packageName);
            }
          }
        }
      } catch (error) {
        console.warn(`Error processing config file ${configPath}:`, error);
      }
    })
  );
}

/**
 * Extract import patterns from file content efficiently
 */
function extractImportPatterns(content: string): string[] {
  const patterns: string[] = [];

  // Combined regex for all import/require patterns
  const importRegex =
    /(?:require\s*\(\s*['"]([^'"]+)['"]|import\s+.*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"])/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    // match[1] = require, match[2] = import from, match[3] = dynamic import
    const importPath = match[1] || match[2] || match[3];
    if (importPath) {
      patterns.push(importPath);
    }
  }

  return patterns;
}
