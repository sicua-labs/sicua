// General Imports
import * as path from "path";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { ComponentRelation, IConfigManager, ScanResult } from "../types";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import * as os from "os";
import { readJsonFile } from "../utils/common/pathUtils";
import {
  isReactComponentBabel,
  getBabelFunctionName,
} from "../utils/ast/reactSpecific";
import { ConfigManager } from "../core/configManager";

let errorCount = 0;
const MAX_ERROR_LOGS = 3;
const errorFiles = new Set<string>();

interface ComponentInfo {
  name: string;
  isDefault: boolean;
  isExported: boolean;
  functions: string[];
  functionCalls: { [key: string]: string[] };
}

interface ParseContext {
  projectType: "nextjs" | "react";
  routerType?: "app" | "pages";
  sourceDirectory: string;
  projectRoot: string;
}

/**
 * Create parse context from config and scan result
 */
function createParseContext(config: IConfigManager): ParseContext {
  const projectStructure = config.getProjectStructure();

  return {
    projectType: projectStructure?.projectType || "react",
    routerType: projectStructure?.routerType,
    sourceDirectory: config.srcDir,
    projectRoot: config.projectPath,
  };
}

/**
 * Normalize file path relative to appropriate base directory
 */
function normalizeFilePath(filePath: string, context: ParseContext): string {
  // Try to make path relative to source directory first
  if (filePath.startsWith(context.sourceDirectory)) {
    const relativePath = path.relative(context.sourceDirectory, filePath);
    return relativePath || ".";
  }

  // Fallback to project root
  const relativePath = path.relative(context.projectRoot, filePath);
  return relativePath || ".";
}

/**
 * Extract directory for component relation
 */
function extractDirectory(filePath: string, context: ParseContext): string {
  const normalizedPath = normalizeFilePath(filePath, context);
  const directory = path.dirname(normalizedPath);

  // Handle root directory cases
  if (directory === "." || directory === "") {
    return "/";
  }

  return directory;
}

/**
 * Resolve import paths considering project structure
 */
function resolveImportPath(
  importPath: string,
  currentFile: string,
  context: ParseContext
): string {
  // Skip external packages
  if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
    return importPath;
  }

  try {
    const currentDir = path.dirname(currentFile);
    let resolvedPath: string;

    if (importPath.startsWith(".")) {
      // Relative import
      resolvedPath = path.resolve(currentDir, importPath);
    } else {
      // Absolute import from project root
      resolvedPath = path.resolve(context.projectRoot, importPath.substring(1));
    }

    // Normalize the resolved path
    return normalizeFilePath(resolvedPath, context);
  } catch (error) {
    console.warn(
      `Failed to resolve import path: ${importPath} from ${currentFile}`
    );
    return importPath;
  }
}

/**
 * Enhanced component detection based on project structure - but analyze ALL files for SAST
 */
function shouldTreatAsComponent(
  filePath: string,
  context: ParseContext
): boolean {
  const fileName = path.basename(filePath, path.extname(filePath));
  const normalizedPath = normalizeFilePath(filePath, context);

  // Next.js specific component detection
  if (context.projectType === "nextjs") {
    // App router specific files
    if (context.routerType === "app") {
      const appRouterFiles = [
        "layout",
        "page",
        "loading",
        "error",
        "not-found",
        "template",
        "default",
      ];
      if (appRouterFiles.includes(fileName.toLowerCase())) {
        return true;
      }
    }

    // Pages router specific files
    if (context.routerType === "pages") {
      const pagesRouterFiles = ["_app", "_document", "_error", "404", "500"];
      if (pagesRouterFiles.includes(fileName)) {
        return true;
      }
    }
  }

  // General component detection - but still analyze ALL files for security
  const isReactFile = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
  const isComponentName = /^[A-Z]/.test(fileName); // Starts with capital letter
  const isInComponentsDir = normalizedPath.includes("component");

  // For SAST purposes, we want to analyze all files, but identify what's likely a component
  return isReactFile && (isComponentName || isInComponentsDir);
}

/**
 * Parse file content using Babel AST for component analysis with enhanced project structure awareness
 */
function parseFileContent(
  content: string,
  filePath: string,
  context: ParseContext
) {
  const analysis = {
    imports: [] as string[],
    lazyImports: [] as string[],
    hocConnections: [] as string[],
    exports: [] as string[],
    components: new Map<string, ComponentInfo>(),
    globalFunctions: [] as string[],
    globalFunctionCalls: {} as { [key: string]: string[] },
  };

  try {
    const ast = parse(content, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "decorators",
        "classProperties",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "dynamicImport",
      ],
      errorRecovery: true,
    });

    let currentFunction: string | undefined;
    let currentComponent: string | undefined;

    traverse(ast, {
      ImportDeclaration(path) {
        const importPath = path.node.source.value;
        const resolvedPath = resolveImportPath(importPath, filePath, context);
        analysis.imports.push(resolvedPath);
      },

      CallExpression(path) {
        const callName = getCallExpressionName(path.node);

        // Handle lazy imports with enhanced resolution
        if (callName === "lazy" || callName === "React.lazy") {
          const arg = path.node.arguments[0];
          if (t.isArrowFunctionExpression(arg) || t.isFunctionExpression(arg)) {
            const body = arg.body;
            if (t.isCallExpression(body) && t.isImport(body.callee)) {
              const importArg = body.arguments[0];
              if (t.isStringLiteral(importArg)) {
                const resolvedPath = resolveImportPath(
                  importArg.value,
                  filePath,
                  context
                );
                analysis.lazyImports.push(resolvedPath);
              }
            }
          }
        }

        // Track function calls for components
        if (callName && currentComponent) {
          const component = analysis.components.get(currentComponent);
          if (component) {
            if (!component.functionCalls[currentFunction || currentComponent]) {
              component.functionCalls[currentFunction || currentComponent] = [];
            }
            component.functionCalls[currentFunction || currentComponent].push(
              callName
            );
          }
        } else if (callName && currentFunction) {
          if (!analysis.globalFunctionCalls[currentFunction]) {
            analysis.globalFunctionCalls[currentFunction] = [];
          }
          analysis.globalFunctionCalls[currentFunction].push(callName);
        }
      },

      ExportNamedDeclaration(path) {
        if (path.node.specifiers) {
          path.node.specifiers.forEach((specifier) => {
            if (t.isExportSpecifier(specifier)) {
              if (t.isIdentifier(specifier.exported)) {
                analysis.exports.push(specifier.exported.name);
              }
            }
          });
        }

        if (path.node.source) {
          const resolvedPath = resolveImportPath(
            path.node.source.value,
            filePath,
            context
          );
          analysis.imports.push(resolvedPath);
        }

        // Handle exported function/class declarations
        if (path.node.declaration) {
          const declaration = path.node.declaration;

          if (t.isFunctionDeclaration(declaration) && declaration.id) {
            const functionName = declaration.id.name;
            analysis.exports.push(functionName);

            if (
              isReactComponentBabel(declaration, functionName) ||
              shouldTreatAsComponent(filePath, context)
            ) {
              const componentInfo = createComponentInfo(
                functionName,
                false,
                true
              );
              analysis.components.set(functionName, componentInfo);
            }
          }

          if (t.isVariableDeclaration(declaration)) {
            declaration.declarations.forEach((declarator) => {
              if (t.isIdentifier(declarator.id) && declarator.init) {
                const varName = declarator.id.name;
                analysis.exports.push(varName);

                if (
                  (t.isArrowFunctionExpression(declarator.init) ||
                    t.isFunctionExpression(declarator.init)) &&
                  (isReactComponentBabel(declarator.init, varName) ||
                    shouldTreatAsComponent(filePath, context))
                ) {
                  const componentInfo = createComponentInfo(
                    varName,
                    false,
                    true
                  );
                  analysis.components.set(varName, componentInfo);
                }
              }
            });
          }
        }
      },

      ExportDefaultDeclaration(path) {
        if (t.isCallExpression(path.node.declaration)) {
          const callExpr = path.node.declaration;
          if (
            t.isIdentifier(callExpr.callee) &&
            callExpr.callee.name === "compose"
          ) {
            callExpr.arguments.forEach((arg) => {
              if (t.isIdentifier(arg)) {
                analysis.hocConnections.push(arg.name);
              } else if (
                t.isCallExpression(arg) &&
                t.isIdentifier(arg.callee)
              ) {
                analysis.hocConnections.push(arg.callee.name);
              }
            });
          }
        }

        // Handle default exported components with project structure awareness
        if (
          t.isFunctionDeclaration(path.node.declaration) &&
          path.node.declaration.id
        ) {
          const functionName = path.node.declaration.id.name;
          if (
            isReactComponentBabel(path.node.declaration, functionName) ||
            shouldTreatAsComponent(filePath, context)
          ) {
            const componentInfo = createComponentInfo(functionName, true, true);
            analysis.components.set(functionName, componentInfo);
          }
        }

        if (t.isIdentifier(path.node.declaration)) {
          const componentName = path.node.declaration.name;
          if (analysis.components.has(componentName)) {
            const component = analysis.components.get(componentName)!;
            component.isDefault = true;
          } else if (shouldTreatAsComponent(filePath, context)) {
            // Create component info for files that should be treated as components
            const componentInfo = createComponentInfo(
              componentName,
              true,
              true
            );
            analysis.components.set(componentName, componentInfo);
          }
        }
      },

      FunctionDeclaration: {
        enter(path: NodePath<t.FunctionDeclaration>) {
          if (path.node.id && t.isIdentifier(path.node.id)) {
            const functionName = path.node.id.name;

            if (
              isReactComponentBabel(path.node, functionName) ||
              shouldTreatAsComponent(filePath, context)
            ) {
              currentComponent = functionName;
              if (!analysis.components.has(functionName)) {
                const componentInfo = createComponentInfo(
                  functionName,
                  false,
                  false
                );
                analysis.components.set(functionName, componentInfo);
              }
            } else {
              analysis.globalFunctions.push(functionName);
            }

            currentFunction = functionName;
          }
        },
        exit() {
          currentFunction = undefined;
          currentComponent = undefined;
        },
      },

      ArrowFunctionExpression: {
        enter(path: NodePath<t.ArrowFunctionExpression>) {
          const functionName = getBabelFunctionName(path.node, path.parent);

          if (
            functionName &&
            (isReactComponentBabel(path.node, functionName) ||
              shouldTreatAsComponent(filePath, context))
          ) {
            currentComponent = functionName;
            if (!analysis.components.has(functionName)) {
              const componentInfo = createComponentInfo(
                functionName,
                false,
                false
              );
              analysis.components.set(functionName, componentInfo);
            }
          } else if (functionName) {
            analysis.globalFunctions.push(functionName);
          }

          currentFunction = functionName || currentFunction;
        },
        exit() {
          currentFunction = undefined;
          currentComponent = undefined;
        },
      },

      VariableDeclaration(path) {
        path.node.declarations.forEach((declaration) => {
          if (t.isIdentifier(declaration.id) && declaration.init) {
            const varName = declaration.id.name;

            if (
              (t.isArrowFunctionExpression(declaration.init) ||
                t.isFunctionExpression(declaration.init)) &&
              (isReactComponentBabel(declaration.init, varName) ||
                shouldTreatAsComponent(filePath, context))
            ) {
              if (!analysis.components.has(varName)) {
                const componentInfo = createComponentInfo(
                  varName,
                  false,
                  false
                );
                analysis.components.set(varName, componentInfo);
              }
            }
          }
        });
      },
    });
  } catch (error) {
    console.error(`Error parsing AST for ${filePath}:`, error);
    return analysis;
  }

  return analysis;
}

/**
 * Create component info structure
 */
function createComponentInfo(
  name: string,
  isDefault: boolean,
  isExported: boolean
): ComponentInfo {
  return {
    name,
    isDefault,
    isExported,
    functions: [name],
    functionCalls: {},
  };
}

/**
 * Get call expression name helper
 */
function getCallExpressionName(node: t.CallExpression): string {
  if (t.isIdentifier(node.callee)) {
    return node.callee.name;
  } else if (t.isMemberExpression(node.callee)) {
    if (
      t.isIdentifier(node.callee.object) &&
      t.isIdentifier(node.callee.property)
    ) {
      return `${node.callee.object.name}.${node.callee.property.name}`;
    } else if (t.isIdentifier(node.callee.property)) {
      return node.callee.property.name;
    }
  }
  return "";
}

/**
 * Process a single file and return multiple ComponentRelations with enhanced path handling
 */
export async function processFile(
  filePath: string,
  srcPath: string,
  config: IConfigManager,
  scanResult: ScanResult
): Promise<ComponentRelation[]> {
  try {
    const content = scanResult.fileContents.get(filePath) || "";
    const context = createParseContext(config);
    const directory = extractDirectory(filePath, context);

    const {
      imports,
      lazyImports,
      hocConnections,
      exports,
      components,
      globalFunctions,
      globalFunctionCalls,
    } = parseFileContent(content, filePath, context);

    const componentRelations: ComponentRelation[] = [];

    // Create ComponentRelation for each detected component
    for (const [componentName, componentInfo] of components) {
      const usedBy = [...imports, ...lazyImports, ...hocConnections]
        .map((imp) => {
          // Handle both relative and absolute imports
          if (imp.startsWith(".")) {
            return path.basename(imp, path.extname(imp));
          }
          return path.basename(imp, path.extname(imp));
        })
        .filter((imp) => imp !== componentName);

      const componentRelation: ComponentRelation = {
        name: componentName,
        usedBy,
        directory,
        imports,
        exports,
        fullPath: filePath,
        functions: componentInfo.functions,
        functionCalls: componentInfo.functionCalls,
        content,
      };

      componentRelations.push(componentRelation);
    }

    // Always create fallback relation for SAST analysis - analyze ALL files
    if (componentRelations.length === 0) {
      const fileName = path.basename(filePath, path.extname(filePath));

      const usedBy = [...imports, ...lazyImports, ...hocConnections]
        .map((imp) => {
          if (imp.startsWith(".")) {
            return path.basename(imp, path.extname(imp));
          }
          return path.basename(imp, path.extname(imp));
        })
        .filter((imp) => imp !== fileName);

      const fallbackRelation: ComponentRelation = {
        name: fileName,
        usedBy,
        directory,
        imports,
        exports,
        fullPath: filePath,
        functions: globalFunctions,
        functionCalls: globalFunctionCalls,
        content,
      };

      componentRelations.push(fallbackRelation);
    }

    // Handle usedBy relationships between components in the same file
    componentRelations.forEach((relation) => {
      const componentsInSameFile = componentRelations
        .filter((r) => r.name !== relation.name)
        .map((r) => r.name);

      relation.usedBy = [...relation.usedBy, ...componentsInSameFile];
    });

    return componentRelations;
  } catch (error) {
    errorFiles.add(filePath);

    if (errorCount < MAX_ERROR_LOGS) {
      console.error(`Error processing file ${filePath}:`, error);
      errorCount++;
    } else if (errorCount === MAX_ERROR_LOGS) {
      console.warn(
        `Additional errors occurred. Suppressing further error messages...`
      );
      errorCount++;
    }

    throw error;
  }
}

/**
 * Parse files using the unified scan data with enhanced project structure support
 */
export async function parseFiles(
  scanResult: ScanResult,
  srcPath: string,
  config: IConfigManager
): Promise<ComponentRelation[]> {
  if (isMainThread) {
    errorCount = 0;
    errorFiles.clear();

    const filePaths = scanResult.filePaths;

    // Use workers for parallel processing
    return await processWithWorkers(filePaths, srcPath, config, scanResult);
  } else {
    // Worker thread - process the chunk
    const {
      chunk,
      srcPath,
      config: configData,
      fileContents,
      fileMetadata,
    } = workerData;

    // Reconstruct config manager in worker
    const config = new ConfigManager(configData.projectPath);
    Object.assign(config, configData);

    const workerScanResult: ScanResult = {
      filePaths: chunk,
      sourceFiles: new Map(),
      fileContents: new Map(Object.entries(fileContents)),
      fileMetadata: new Map(Object.entries(fileMetadata)),
      securityFiles: [],
      configFiles: [],
      environmentFiles: [],
      apiRoutes: [],
      middlewareFiles: [],
      packageInfo: [],
      securityScanMetadata: {
        scanTimestamp: Date.now(),
        scanDuration: 0,
        filesScanned: chunk.length,
        securityIssuesFound: 0,
        riskLevel: "low",
        coveragePercentage: 0,
      },
    };

    const results = await Promise.all(
      chunk.map(async (filePath: string) => {
        try {
          return await processFile(filePath, srcPath, config, workerScanResult);
        } catch (error) {
          console.warn(`Worker failed to process ${filePath}:`, error);
          return [];
        }
      })
    );

    const flatResults = results.flat();
    parentPort?.postMessage(flatResults);
    return [];
  }
}

/**
 * Process files with worker threads for parallel processing
 */
async function processWithWorkers(
  filePaths: string[],
  srcPath: string,
  config: IConfigManager,
  scanResult: ScanResult
): Promise<ComponentRelation[]> {
  const numWorkers = Math.min(os.cpus().length, 6);
  const chunkSize = Math.ceil(filePaths.length / numWorkers);
  const chunks = chunkArray(filePaths, chunkSize);

  try {
    const workers = chunks.map(
      (chunk, index) =>
        new Worker(__filename, {
          workerData: {
            chunk,
            srcPath,
            config: {
              projectPath: config.projectPath,
              srcDir: config.srcDir,
              fileExtensions: config.fileExtensions,
              rootComponentNames: config.rootComponentNames,
              outputFileName: config.outputFileName,
              // Include project structure info for workers
              _projectStructure: config.getProjectStructure(),
            },
            fileContents: Object.fromEntries(
              Array.from(scanResult.fileContents.entries()).filter(([path]) =>
                chunk.includes(path)
              )
            ),
            fileMetadata: Object.fromEntries(
              Array.from(scanResult.fileMetadata.entries()).filter(([path]) =>
                chunk.includes(path)
              )
            ),
          },
        })
    );

    const results = await Promise.all(
      workers.map(
        (worker, index) =>
          new Promise<ComponentRelation[]>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn(`Worker ${index} timeout, terminating...`);
              worker.terminate();
              resolve([]);
            }, 120000);

            worker.on("message", (result) => {
              clearTimeout(timeout);
              resolve(result);
            });

            worker.on("error", (error) => {
              clearTimeout(timeout);
              console.error(`Worker ${index} error:`, error);
              resolve([]);
            });

            worker.on("exit", (code) => {
              clearTimeout(timeout);
              if (code !== 0) {
                console.error(`Worker ${index} exited with code ${code}`);
              }
              resolve([]);
            });
          })
      )
    );

    return results.flat();
  } catch (error) {
    console.error("Fatal error during worker processing:", error);
    return [];
  }
}

/**
 * Split an array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

// Worker thread entry point
if (!isMainThread) {
  const {
    chunk,
    srcPath,
    config: configData,
    fileContents,
    fileMetadata,
  } = workerData;

  // Reconstruct config manager in worker
  const config = new ConfigManager(configData.projectPath);
  Object.assign(config, configData);

  const workerScanResult: ScanResult = {
    filePaths: chunk,
    sourceFiles: new Map(),
    fileContents: new Map(Object.entries(fileContents)),
    fileMetadata: new Map(Object.entries(fileMetadata)),
    securityFiles: [],
    configFiles: [],
    environmentFiles: [],
    apiRoutes: [],
    middlewareFiles: [],
    packageInfo: [],
    securityScanMetadata: {
      scanTimestamp: Date.now(),
      scanDuration: 0,
      filesScanned: chunk.length,
      securityIssuesFound: 0,
      riskLevel: "low",
      coveragePercentage: 0,
    },
  };

  Promise.all(
    chunk.map(async (filePath: string) => {
      try {
        return await processFile(filePath, srcPath, config, workerScanResult);
      } catch (error) {
        console.warn(`Worker error processing ${filePath}:`, error);
        return [];
      }
    })
  )
    .then((results) => {
      const flatResults = results.flat();
      parentPort?.postMessage(flatResults);
    })
    .catch((error) => {
      console.error("Worker fatal error:", error);
      parentPort?.postMessage([]);
    });
}

/**
 * Parse package.json to extract dependencies
 */
export async function parsePackageJson(
  projectPath: string
): Promise<{ [key: string]: string }> {
  try {
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = await readJsonFile(packageJsonPath);
    return packageJson.dependencies || {};
  } catch (error) {
    console.error("Error parsing package.json:", error);
    return {};
  }
}
