import { parsePackageJson } from "../../../parsers/fileParser";
import {
  ComponentRelation,
  ConfigManager,
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
import {
  extractPackageName,
  isPathAlias,
} from "../../../utils/common/pathUtils";
import { PackageDependencyContext } from "../types/component.types";

/**
 * Analyzes package dependencies, finding unused and missing dependencies
 * @param components The list of components to analyze
 * @param config The config manager with project path
 * @returns Analysis result with unused and missing dependencies
 */
export async function analyzeDependencies(
  components: ComponentRelation[],
  config: ConfigManager
): Promise<DependencyAnalysisResult> {
  const packageDependencies = await parsePackageJson(config.projectPath);
  const context: PackageDependencyContext = {
    usedDependencies: new Set<string>(),
    usedInConfigs: new Set<string>(),
  };

  // Analyze components
  collectComponentDependencies(components, context);

  // Analyze config files
  await collectConfigDependencies(config.projectPath, context);

  // Find unused dependencies
  const unusedDependencies = Object.keys(packageDependencies).filter(
    (dep) =>
      !context.usedDependencies.has(dep) &&
      !context.usedInConfigs.has(dep) &&
      !isSpecialPackage(dep) &&
      !isDevToolPackage(dep)
  );

  // Find missing dependencies
  const missingDependencies = Array.from(context.usedDependencies).filter(
    (dep) => !packageDependencies[dep]
  );

  return {
    unusedDependencies,
    missingDependencies,
  };
}

/**
 * Collects dependencies used in components
 */
function collectComponentDependencies(
  components: ComponentRelation[],
  context: PackageDependencyContext
): void {
  components.forEach((component) => {
    component.imports.forEach((imp) => {
      const packageName = extractPackageName(imp);
      if (packageName && !isPathAlias(packageName)) {
        context.usedDependencies.add(packageName);
      }
    });
  });
}

/**
 * Collects dependencies used in config files
 */
async function collectConfigDependencies(
  projectPath: string,
  context: PackageDependencyContext
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
        const matches =
          content.match(/(?:require|import)\s*\(['"]([^'"]+)['"]\)/g) || [];
        matches.forEach((match) => {
          const packageName = extractPackageName(match);
          if (packageName && !isPathAlias(packageName)) {
            context.usedInConfigs.add(packageName);
          }
        });
      } catch (error) {
        console.warn(`Error processing config file ${configPath}:`, error);
      }
    })
  );
}
