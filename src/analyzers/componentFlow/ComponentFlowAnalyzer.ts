import * as path from "path";
import {
  ComponentFlowAnalysisResult,
  FlowAnalysisSummary,
  ExternalDependency,
  ComponentFlowConfig,
  FlowAnalysisError,
  ValidationResult,
  RouteFlowTree,
  DEFAULT_HTML_ELEMENT_FILTER,
  EnhancedRouteFlowTree,
} from "./types";
import { RouteScanner } from "./scanners/RouteScanner";
import { FlowTreeBuilder } from "./builders/FlowTreeBuilder";
import { RouteCoverageBuilder } from "./builders/RouteCoverageBuilder";
import { ComponentRelation } from "../../types";
import { matchesPattern } from "./utils";

/**
 * Main analyzer that orchestrates component flow analysis for Next.js applications
 */
export class ComponentFlowAnalyzer {
  private projectRoot: string;
  private srcDirectory: string;
  private appDirectory: string;
  private components: ComponentRelation[];
  private config: ComponentFlowConfig;
  private errors: FlowAnalysisError[];

  constructor(
    projectRoot: string,
    srcDirectory: string,
    components: ComponentRelation[],
    config: Partial<ComponentFlowConfig> = {}
  ) {
    this.projectRoot = projectRoot;
    this.srcDirectory = srcDirectory;

    // Find the app directory in common locations
    const possibleAppDirs = [
      path.join(projectRoot, "app"),
      path.join(srcDirectory, "app"),
      path.join(projectRoot, "src", "app"),
    ];

    let appDirectory = "";
    for (const dir of possibleAppDirs) {
      if (require("fs").existsSync(dir)) {
        appDirectory = dir;
        break;
      }
    }

    this.appDirectory = appDirectory || path.join(projectRoot, "app");
    this.components = components;
    this.config = this.mergeWithDefaultConfig(config);
    this.errors = [];
  }

  /**
   * Performs complete component flow analysis
   */
  async analyze(): Promise<ComponentFlowAnalysisResult> {
    try {
      // Validate input and configuration
      const validation = this.validateInput();
      if (!validation.isValid) {
        throw new Error(
          `Validation failed: ${validation.errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      // Scan all routes in the app directory
      const routeScanner = new RouteScanner(this.appDirectory);
      const routeStructures = routeScanner.scanAllRoutes();

      if (routeStructures.length === 0) {
        return this.createEmptyResult();
      }

      // Filter routes if specified in config
      const filteredRoutes = this.filterRoutes(routeStructures);

      // Build flow trees for all routes
      const flowTreeBuilder = new FlowTreeBuilder(
        this.projectRoot,
        this.srcDirectory,
        this.appDirectory,
        this.components,
        this.config
      );

      const routeFlowTrees: EnhancedRouteFlowTree[] = [];

      for (const routeStructure of filteredRoutes) {
        try {
          const flowTree = flowTreeBuilder.buildRouteFlowTree(routeStructure);
          routeFlowTrees.push(flowTree);
        } catch (error) {
          this.addError(
            "parsing_error",
            `Failed to analyze route ${routeStructure.routePath}`,
            routeStructure.pageFilePath,
            error as Error
          );
        }
      }

      // Extract external dependencies
      const externalDependencies =
        this.extractExternalDependencies(routeFlowTrees);

      // Generate summary
      const summary = this.generateSummary(
        routeFlowTrees,
        externalDependencies
      );

      return {
        routes: routeFlowTrees.map((tree) => ({
          routePath: tree.routePath,
          pageComponent: tree.pageComponent,
          specialFiles: tree.specialFiles,
          metadata: tree.metadata,
        })),
        summary,
        externalDependencies,
      };
    } catch (error) {
      this.addError("parsing_error", "Analysis failed", "", error as Error);
      throw error;
    }
  }

  /**
   * Analyzes a single route
   */
  async analyzeSingleRoute(routePath: string): Promise<RouteFlowTree | null> {
    try {
      const routeScanner = new RouteScanner(this.appDirectory);
      const routeStructure = routeScanner.scanRoute(routePath);

      if (!routeStructure) {
        return null;
      }

      const flowTreeBuilder = new FlowTreeBuilder(
        this.projectRoot,
        this.srcDirectory,
        this.appDirectory,
        this.components,
        this.config
      );

      const enhancedTree = flowTreeBuilder.buildRouteFlowTree(routeStructure);

      return {
        routePath: enhancedTree.routePath,
        pageComponent: enhancedTree.pageComponent,
        specialFiles: enhancedTree.specialFiles,
        metadata: enhancedTree.metadata,
      };
    } catch (error) {
      this.addError(
        "parsing_error",
        `Failed to analyze route ${routePath}`,
        "",
        error as Error
      );
      return null;
    }
  }

  /**
   * Performs quick analysis with limited depth
   */
  async quickAnalyze(
    maxDepth: number = 2
  ): Promise<ComponentFlowAnalysisResult> {
    const originalMaxDepth = this.config.maxDepth;
    this.config.maxDepth = maxDepth;

    try {
      return await this.analyze();
    } finally {
      this.config.maxDepth = originalMaxDepth;
    }
  }

  /**
   * Gets analysis errors
   */
  getErrors(): FlowAnalysisError[] {
    return [...this.errors];
  }

  /**
   * Gets coverage summary for all routes
   */
  async getCoverageSummary(): Promise<{
    totalRoutes: number;
    routesWithMissingFiles: string[];
    averageCoverage: number;
    mostCommonMissingFiles: { fileName: string; count: number }[];
  }> {
    const routeScanner = new RouteScanner(this.appDirectory);
    const routeStructures = routeScanner.scanAllRoutes();

    const coverageBuilder = new RouteCoverageBuilder(this.appDirectory);
    const coverageAnalyses =
      coverageBuilder.buildMultipleRoutesCoverage(routeStructures);

    const summary =
      coverageBuilder.buildOverallCoverageSummary(coverageAnalyses);

    return {
      totalRoutes: summary.totalRoutes,
      routesWithMissingFiles: summary.criticalRiskRoutes.concat(
        summary.highRiskRoutes
      ),
      averageCoverage: summary.averageCoverage,
      mostCommonMissingFiles: summary.mostCommonMissingFiles,
    };
  }

  /**
   * Validates input data and configuration
   */
  private validateInput(): ValidationResult {
    const errors: FlowAnalysisError[] = [];
    const warnings: string[] = [];

    // Check if app directory exists
    try {
      const fs = require("fs");
      if (!fs.existsSync(this.appDirectory)) {
        errors.push({
          type: "file_not_found",
          message: "App directory not found",
          filePath: this.appDirectory,
        });
      }
    } catch (error) {
      errors.push({
        type: "file_not_found",
        message: "Cannot access app directory",
        filePath: this.appDirectory,
      });
    }

    // Check if components array is not empty
    if (this.components.length === 0) {
      warnings.push("No components provided for analysis");
    }

    // Validate configuration
    if (this.config.maxDepth < 1) {
      errors.push({
        type: "parsing_error",
        message: "maxDepth must be at least 1",
        filePath: "",
      });
    }

    // Validate HTML element configuration
    if (this.config.includeHtmlElements) {
      const filter = this.config.htmlElementFilter;

      if (!filter.includeAll && filter.includeTags.length === 0) {
        warnings.push(
          "HTML element tracking enabled but no tags specified to include"
        );
      }

      if (filter.maxTextLength < 0) {
        errors.push({
          type: "parsing_error",
          message: "maxTextLength cannot be negative",
          filePath: "",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Merges user config with default configuration
   */
  private mergeWithDefaultConfig(
    userConfig: Partial<ComponentFlowConfig>
  ): ComponentFlowConfig {
    const defaultConfig: ComponentFlowConfig = {
      maxDepth: 10,
      includeExternalComponents: true,
      excludePatterns: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
      onlyAnalyzeRoutes: [],
      includeHtmlElements: false,
      htmlElementFilter: DEFAULT_HTML_ELEMENT_FILTER,
    };

    return {
      ...defaultConfig,
      ...userConfig,
      htmlElementFilter: {
        ...defaultConfig.htmlElementFilter,
        ...(userConfig.htmlElementFilter || {}),
      },
    };
  }

  /**
   * Filters routes based on configuration
   */
  private filterRoutes(
    routeStructures: Array<{
      routePath: string;
      pageFilePath: string;
      segments: Array<{
        name: string;
        isDynamic: boolean;
        isCatchAll: boolean;
        isRouteGroup: boolean;
        specialFiles: any;
        depth: number;
      }>;
      metadata: any;
    }>
  ): Array<{
    routePath: string;
    pageFilePath: string;
    segments: Array<{
      name: string;
      isDynamic: boolean;
      isCatchAll: boolean;
      isRouteGroup: boolean;
      specialFiles: any;
      depth: number;
    }>;
    metadata: any;
  }> {
    let filtered = routeStructures;

    // Filter by onlyAnalyzeRoutes if specified
    if (this.config.onlyAnalyzeRoutes.length > 0) {
      filtered = filtered.filter((route) =>
        this.config.onlyAnalyzeRoutes.some(
          (pattern) =>
            route.routePath.includes(pattern) ||
            matchesPattern(route.routePath, pattern)
        )
      );
    }

    // Filter by exclude patterns
    if (this.config.excludePatterns.length > 0) {
      filtered = filtered.filter(
        (route) =>
          !this.config.excludePatterns.some((pattern) =>
            matchesPattern(route.pageFilePath, pattern)
          )
      );
    }

    return filtered;
  }

  /**
   * Extracts external dependencies from route flow trees
   */
  private extractExternalDependencies(
    routeFlowTrees: EnhancedRouteFlowTree[]
  ): ExternalDependency[] {
    const dependencyMap = new Map<
      string,
      { usedInRoutes: Set<string>; usageCount: number }
    >();

    const allImports = new Set<string>();

    for (const tree of routeFlowTrees) {
      this.collectImportsFromComponent(tree.pageComponent, allImports);
    }

    const nodeModuleDetector = require("./utils/NodeModuleDetector");
    const detector = new nodeModuleDetector.NodeModuleDetector(
      this.projectRoot,
      this.srcDirectory
    );

    // Build dependency usage map
    for (const tree of routeFlowTrees) {
      const routeImports = new Set<string>();
      this.collectImportsFromComponent(tree.pageComponent, routeImports);

      for (const importPath of routeImports) {
        if (
          detector.isExternalComponent(importPath, tree.pageComponent.filePath)
        ) {
          const packageName = detector.getPackageName(importPath);

          if (!dependencyMap.has(packageName)) {
            dependencyMap.set(packageName, {
              usedInRoutes: new Set(),
              usageCount: 0,
            });
          }

          const dependency = dependencyMap.get(packageName)!;
          dependency.usedInRoutes.add(tree.routePath);
          dependency.usageCount++;
        }
      }
    }

    return Array.from(dependencyMap.entries()).map(([name, data]) => ({
      name,
      usedInRoutes: Array.from(data.usedInRoutes),
      usageCount: data.usageCount,
    }));
  }

  /**
   * Collects all imports from a component tree
   */
  private collectImportsFromComponent(
    component: {
      componentName: string;
      filePath: string;
      isExternal: boolean;
      conditionalRenders: Array<{
        conditionType: any;
        condition: string;
        trueBranch: any[];
        falseBranch?: any[];
        position: any;
      }>;
      children: any[];
    },
    imports: Set<string>,
    visited: Set<string> = new Set()
  ): void {
    const componentKey = `${component.componentName}-${component.filePath}`;

    if (visited.has(componentKey)) {
      return;
    }
    visited.add(componentKey);

    if (component.isExternal && component.componentName) {
      imports.add(component.componentName);
    }

    // Process conditional renders
    for (const conditionalRender of component.conditionalRenders) {
      for (const child of conditionalRender.trueBranch) {
        this.collectImportsFromComponent(child, imports, visited);
      }
      if (conditionalRender.falseBranch) {
        for (const child of conditionalRender.falseBranch) {
          this.collectImportsFromComponent(child, imports, visited);
        }
      }
    }

    // Process regular children
    for (const child of component.children) {
      this.collectImportsFromComponent(child, imports, visited);
    }
  }

  /**
   * Generates analysis summary
   */
  private generateSummary(
    routeFlowTrees: EnhancedRouteFlowTree[],
    externalDependencies: ExternalDependency[]
  ): FlowAnalysisSummary {
    const totalRoutes = routeFlowTrees.length;
    const globalStats = this.calculateGlobalStats(routeFlowTrees);
    const routesWithMissingFiles: string[] = [];

    for (const tree of routeFlowTrees) {
      if (tree.coverageAnalysis.coverageMetrics.missingFiles.length > 0) {
        routesWithMissingFiles.push(tree.routePath);
      }
    }

    // Find most complex route
    let mostComplexRoute = "/";
    let maxComplexity = 0;

    for (const tree of routeFlowTrees) {
      const routeComplexity =
        tree.componentStats.totalComponents +
        tree.componentStats.conditionalRenderCount * 2;

      if (routeComplexity > maxComplexity) {
        maxComplexity = routeComplexity;
        mostComplexRoute = tree.routePath;
      }
    }

    const averageComponentDepth =
      totalRoutes > 0 ? globalStats.totalDepth / totalRoutes : 0;

    return {
      totalRoutes,
      totalComponents: globalStats.uniqueComponents,
      totalConditionalRenders: globalStats.totalConditionals,
      routesWithMissingSpecialFiles: routesWithMissingFiles,
      mostComplexRoute,
      averageComponentDepth: Math.round(averageComponentDepth * 100) / 100,
    };
  }

  /**
   * Calculates global statistics across all routes
   */
  private calculateGlobalStats(routeFlowTrees: EnhancedRouteFlowTree[]): {
    totalConditionals: number;
    uniqueComponents: number;
    totalDepth: number;
  } {
    const visitedComponents = new Set<string>();
    let totalConditionals = 0;
    let totalDepth = 0;

    const traverseComponent = (
      component: {
        componentName: string;
        filePath: string;
        isExternal: boolean;
        conditionalRenders: Array<{
          conditionType: any;
          condition: string;
          trueBranch: any[];
          falseBranch?: any[];
          position: any;
        }>;
        children: any[];
      },
      depth: number = 0
    ): void => {
      const componentKey = `${component.componentName}-${component.filePath}`;

      if (visitedComponents.has(componentKey)) {
        return;
      }
      visitedComponents.add(componentKey);

      totalConditionals += component.conditionalRenders.length;
      totalDepth += depth;

      // Traverse children
      for (const child of component.children) {
        traverseComponent(child, depth + 1);
      }

      // Traverse conditional branches
      for (const conditionalRender of component.conditionalRenders) {
        for (const child of conditionalRender.trueBranch) {
          traverseComponent(child, depth + 1);
        }
        if (conditionalRender.falseBranch) {
          for (const child of conditionalRender.falseBranch) {
            traverseComponent(child, depth + 1);
          }
        }
      }
    };

    for (const tree of routeFlowTrees) {
      traverseComponent(tree.pageComponent, 0);
    }

    return {
      totalConditionals,
      uniqueComponents: visitedComponents.size,
      totalDepth,
    };
  }

  /**
   * Creates empty result for when no routes are found
   */
  private createEmptyResult(): ComponentFlowAnalysisResult {
    return {
      routes: [],
      summary: {
        totalRoutes: 0,
        totalComponents: 0,
        totalConditionalRenders: 0,
        routesWithMissingSpecialFiles: [],
        mostComplexRoute: "",
        averageComponentDepth: 0,
      },
      externalDependencies: [],
    };
  }

  /**
   * Adds an error to the error collection
   */
  private addError(
    type: FlowAnalysisError["type"],
    message: string,
    filePath: string,
    originalError?: Error
  ): void {
    this.errors.push({
      type,
      message: originalError ? `${message}: ${originalError.message}` : message,
      filePath,
    });
  }

  /**
   * Clears all accumulated errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Gets configuration used for analysis
   */
  getConfig(): ComponentFlowConfig {
    return { ...this.config };
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<ComponentFlowConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      htmlElementFilter: {
        ...this.config.htmlElementFilter,
        ...(newConfig.htmlElementFilter || {}),
      },
    };
  }

  /**
   * Enables HTML element tracking with optional filter configuration
   */
  enableHtmlElementTracking(
    filter?: Partial<typeof DEFAULT_HTML_ELEMENT_FILTER>
  ): void {
    this.config.includeHtmlElements = true;
    if (filter) {
      this.config.htmlElementFilter = {
        ...this.config.htmlElementFilter,
        ...filter,
      };
    }
  }

  /**
   * Disables HTML element tracking
   */
  disableHtmlElementTracking(): void {
    this.config.includeHtmlElements = false;
  }
}
