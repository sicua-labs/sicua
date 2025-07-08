import ts from "typescript";
import path from "path-browserify";
import { ComponentRelation } from "../../../types";
import { BundleOptimizationAnalysis } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { PerformanceUtils } from "../utils/performanceUtils";
import { PageComponentMap } from "../types/internalTypes";

/**
 * Analyzer for bundle optimization and JavaScript resource loading
 */
export class BundleAnalyzer {
  private pageComponents: PageComponentMap;
  private allComponents: ComponentRelation[];
  private dependencyGraph: Map<string, Set<string>>;
  private importMap: Map<
    string,
    Array<{
      importPath: string;
      importType: "static" | "dynamic";
      isLibrary: boolean;
      size: "small" | "medium" | "large";
    }>
  >;

  constructor(
    pageComponents: PageComponentMap,
    allComponents: ComponentRelation[]
  ) {
    this.pageComponents = pageComponents;
    this.allComponents = allComponents;
    this.dependencyGraph = new Map();
    this.importMap = new Map();
    this.buildDependencyGraph();
  }

  /**
   * Analyze bundle optimization opportunities
   */
  public analyzeBundleOptimization(): BundleOptimizationAnalysis {
    const heavyImports = this.analyzeHeavyImports();
    const criticalResources = this.analyzeCriticalResources();
    const statistics = this.calculateStatistics(
      heavyImports,
      criticalResources
    );

    return {
      heavyImports,
      criticalResources,
      statistics,
    };
  }

  /**
   * Build dependency graph for all components
   */
  private buildDependencyGraph(): void {
    this.allComponents.forEach((component) => {
      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      const dependencies = this.extractDependencies(sourceFile);
      this.dependencyGraph.set(
        component.fullPath,
        new Set(dependencies.map((dep) => dep.importPath))
      );
      this.importMap.set(component.fullPath, dependencies);
    });
  }

  /**
   * Extract dependencies from a source file
   */
  private extractDependencies(sourceFile: ts.SourceFile): Array<{
    importPath: string;
    importType: "static" | "dynamic";
    isLibrary: boolean;
    size: "small" | "medium" | "large";
  }> {
    const dependencies: Array<{
      importPath: string;
      importType: "static" | "dynamic";
      isLibrary: boolean;
      size: "small" | "medium" | "large";
    }> = [];

    // Analyze static imports
    const staticImports = PerformanceUtils.analyzeStaticImports(sourceFile);
    staticImports.forEach((imp) => {
      dependencies.push({
        importPath: imp.importPath,
        importType: "static",
        isLibrary: imp.isLibrary,
        size: this.estimateLibrarySize(imp.importPath),
      });
    });

    // Analyze dynamic imports
    const dynamicImports = PerformanceUtils.findDynamicImports(sourceFile);
    dynamicImports.forEach((imp) => {
      dependencies.push({
        importPath: imp.importPath,
        importType: "dynamic",
        isLibrary: !imp.importPath.startsWith("."),
        size: this.estimateLibrarySize(imp.importPath),
      });
    });

    return dependencies;
  }

  /**
   * Estimate library size based on known patterns
   */
  private estimateLibrarySize(
    importPath: string
  ): "small" | "medium" | "large" {
    // Known large libraries (>100KB)
    const largeLibraries = [
      "lodash",
      "moment",
      "chart.js",
      "three",
      "@tensorflow/tfjs",
      "monaco-editor",
      "codemirror",
      "pdf-lib",
      "fabric",
      "antd",
      "@mui/material",
      "react-bootstrap",
      "semantic-ui-react",
    ];

    // Known medium libraries (20-100KB)
    const mediumLibraries = [
      "axios",
      "react-router",
      "formik",
      "yup",
      "date-fns",
      "framer-motion",
      "react-spring",
      "styled-components",
      "emotion",
      "@apollo/client",
      "redux-toolkit",
      "recharts",
    ];

    // Libraries that are actually small or tree-shakeable (should not be flagged)
    const smallOrTreeShakeableLibraries = [
      "react",
      "react-dom",
      "next",
      "lucide-react",
      "clsx",
      "class-variance-authority",
      "tailwind-merge",
      "@tanstack/react-query",
      "zustand",
      "next-themes",
      "sonner",
      "zod",
    ];

    // Check for specific library matches
    const libName = importPath.split("/")[0].replace("@", "");

    // Don't flag small/tree-shakeable libraries
    if (
      smallOrTreeShakeableLibraries.some(
        (lib) => libName.includes(lib) || importPath.includes(lib)
      )
    ) {
      return "small";
    }

    if (
      largeLibraries.some(
        (lib) => libName.includes(lib) || importPath.includes(lib)
      )
    ) {
      return "large";
    }

    if (
      mediumLibraries.some(
        (lib) => libName.includes(lib) || importPath.includes(lib)
      )
    ) {
      return "medium";
    }

    // Local imports are small
    if (
      importPath.startsWith(".") ||
      importPath.startsWith("/") ||
      importPath.startsWith("@/")
    ) {
      return "small";
    }

    // Unknown third-party libraries default to medium
    return "medium";
  }

  /**
   * Analyze heavy imports that impact performance (refined approach)
   */
  private analyzeHeavyImports(): BundleOptimizationAnalysis["heavyImports"] {
    const heavyImports: BundleOptimizationAnalysis["heavyImports"] = [];
    const importAnalysis = new Map<
      string,
      {
        importedBy: string[];
        isDynamic: boolean;
        size: "small" | "medium" | "large";
        isServerComponent: boolean;
        pageImports: string[];
        hasTreeShakingIssues: boolean;
        actualImpact: "low" | "medium" | "high";
      }
    >();

    // Collect all imports and analyze their real impact
    this.importMap.forEach((dependencies, componentPath) => {
      const componentType = this.getComponentType(componentPath);
      const isPageComponent = this.pageComponents.has(componentPath);

      dependencies.forEach((dep) => {
        if (!importAnalysis.has(dep.importPath)) {
          importAnalysis.set(dep.importPath, {
            importedBy: [],
            isDynamic: dep.importType === "dynamic",
            size: dep.size,
            isServerComponent: componentType.isServerComponent,
            pageImports: [],
            hasTreeShakingIssues: this.hasTreeShakingIssues(
              dep.importPath,
              componentPath
            ),
            actualImpact: "low",
          });
        }

        const analysis = importAnalysis.get(dep.importPath)!;
        analysis.importedBy.push(componentPath);

        if (isPageComponent) {
          analysis.pageImports.push(componentPath);
        }

        if (dep.importType === "dynamic") {
          analysis.isDynamic = true;
        }
      });
    });

    // Calculate actual impact and filter for real issues
    importAnalysis.forEach((analysis, importPath) => {
      analysis.actualImpact = this.calculateActualImportImpact(
        analysis,
        importPath
      );

      // Only include imports that have real performance impact
      if (this.shouldFlagImport(analysis, importPath)) {
        heavyImports.push({
          importPath,
          importedBy: analysis.importedBy,
          isDynamic: analysis.isDynamic,
          isServerComponent: analysis.isServerComponent,
          potentialImpact: analysis.actualImpact,
        });
      }
    });

    // Sort by actual impact and relevance
    return heavyImports.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.potentialImpact] - impactOrder[a.potentialImpact];
    });
  }

  /**
   * Analyze critical resources that affect initial page load
   */
  private analyzeCriticalResources(): BundleOptimizationAnalysis["criticalResources"] {
    const criticalResources: BundleOptimizationAnalysis["criticalResources"] =
      [];
    const resourceMap = new Map<
      string,
      {
        type: "font" | "image" | "script" | "style";
        usedInPages: string[];
        isPreloaded: boolean;
        isOptimized: boolean;
      }
    >();

    // Analyze each component for critical resources
    this.allComponents.forEach((component) => {
      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      const resources = this.extractCriticalResources(
        sourceFile,
        component.fullPath
      );

      resources.forEach((resource) => {
        if (!resourceMap.has(resource.path)) {
          resourceMap.set(resource.path, {
            type: resource.type,
            usedInPages: [],
            isPreloaded: resource.isPreloaded,
            isOptimized: resource.isOptimized,
          });
        }

        const resourceData = resourceMap.get(resource.path)!;
        resourceData.usedInPages.push(component.fullPath);
      });
    });

    // Convert to final format
    resourceMap.forEach((data, resourcePath) => {
      criticalResources.push({
        type: data.type,
        path: resourcePath,
        usedInPages: data.usedInPages,
        isPreloaded: data.isPreloaded,
        isOptimized: data.isOptimized,
      });
    });

    return criticalResources;
  }

  /**
   * Extract critical resources from a source file
   */
  private extractCriticalResources(
    sourceFile: ts.SourceFile,
    componentPath: string
  ): Array<{
    path: string;
    type: "font" | "image" | "script" | "style";
    isPreloaded: boolean;
    isOptimized: boolean;
  }> {
    const resources: Array<{
      path: string;
      type: "font" | "image" | "script" | "style";
      isPreloaded: boolean;
      isOptimized: boolean;
    }> = [];

    const visitNode = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        let tagName: string;

        try {
          if (ts.isJsxElement(node)) {
            const openingElement = node.openingElement;
            if (ts.isIdentifier(openingElement.tagName)) {
              tagName = openingElement.tagName.text;
            } else {
              return; // Skip if not a simple identifier
            }
          } else {
            // JsxSelfClosingElement
            if (ts.isIdentifier(node.tagName)) {
              tagName = node.tagName.text;
            } else {
              return; // Skip if not a simple identifier
            }
          }

          if (!tagName) return;

          const lowerTagName = tagName.toLowerCase();

          // Analyze different resource types
          switch (lowerTagName) {
            case "script":
              const scriptSrc = this.getAttributeValue(node, "src");
              if (scriptSrc) {
                resources.push({
                  path: scriptSrc,
                  type: "script",
                  isPreloaded: this.hasPreloadLink(scriptSrc),
                  isOptimized:
                    this.hasAttribute(node, "async") ||
                    this.hasAttribute(node, "defer"),
                });
              }
              break;

            case "link":
              const rel = this.getAttributeValue(node, "rel");
              const href = this.getAttributeValue(node, "href");

              if (href) {
                if (rel === "stylesheet") {
                  resources.push({
                    path: href,
                    type: "style",
                    isPreloaded: false, // stylesheet links are not preloaded
                    isOptimized:
                      href.includes("display=swap") ||
                      this.hasAttribute(node, "media"),
                  });
                } else if (rel === "preload") {
                  const as = this.getAttributeValue(node, "as");
                  if (as === "font" || href.includes("font")) {
                    resources.push({
                      path: href,
                      type: "font",
                      isPreloaded: true,
                      isOptimized: this.hasAttribute(node, "crossorigin"),
                    });
                  }
                }
              }
              break;

            case "img":
            case "image":
              const imgSrc = this.getAttributeValue(node, "src");
              if (imgSrc) {
                const priority = this.getAttributeValue(node, "priority");
                resources.push({
                  path: imgSrc,
                  type: "image",
                  isPreloaded: priority === "true",
                  isOptimized: lowerTagName === "image", // Next.js Image component
                });
              }
              break;
          }
        } catch (error) {
          // Skip this node if there's any error processing it
          console.warn(`Error processing JSX node in ${componentPath}:`, error);
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return resources;
  }

  /**
   * Get attribute value from JSX element
   */
  private getAttributeValue(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    attributeName: string
  ): string | null {
    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes.properties
      : node.attributes.properties;

    for (const attr of attributes) {
      if (ts.isJsxAttribute(attr) && attr.name.getText() === attributeName) {
        if (attr.initializer && ts.isStringLiteral(attr.initializer)) {
          return attr.initializer.text;
        }
      }
    }
    return null;
  }

  /**
   * Check if element has specific attribute
   */
  private hasAttribute(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    attributeName: string
  ): boolean {
    return this.getAttributeValue(node, attributeName) !== null;
  }

  /**
   * Check if resource has preload link (simplified check)
   */
  private hasPreloadLink(resourcePath: string): boolean {
    // In a real implementation, this would check if there's a preload link
    // For static analysis, we can't determine this without analyzing document head
    return false;
  }

  /**
   * Get component type (server vs client)
   */
  private getComponentType(componentPath: string): {
    isServerComponent: boolean;
    hasUseClient: boolean;
  } {
    const component = this.allComponents.find(
      (c) => c.fullPath === componentPath
    );
    if (!component?.content) {
      return { isServerComponent: true, hasUseClient: false };
    }

    const sourceFile = ComponentUtils.getSourceFile(component);
    if (!sourceFile) {
      return { isServerComponent: true, hasUseClient: false };
    }

    const componentType = PerformanceUtils.isServerComponent(sourceFile);
    return {
      isServerComponent: componentType.isServerComponent,
      hasUseClient: componentType.hasUseClientDirective,
    };
  }

  /**
   * Check if import has tree shaking issues
   */
  private hasTreeShakingIssues(
    importPath: string,
    componentPath: string
  ): boolean {
    // Check for non-specific imports of tree-shakeable libraries
    const treeShakeableLibraries = ["lodash", "date-fns", "ramda", "rxjs"];

    return treeShakeableLibraries.some(
      (lib) =>
        importPath === lib ||
        (importPath.startsWith(lib) && !importPath.includes("/"))
    );
  }

  /**
   * Calculate actual import impact (refined approach)
   */
  private calculateActualImportImpact(
    analysis: {
      importedBy: string[];
      isDynamic: boolean;
      size: "small" | "medium" | "large";
      isServerComponent: boolean;
      pageImports: string[];
      hasTreeShakingIssues: boolean;
    },
    importPath: string
  ): "low" | "medium" | "high" {
    let score = 0;

    // Size impact (only for actually large libraries)
    if (analysis.size === "large") score += 3;
    else if (analysis.size === "medium") score += 1;

    // Page-level imports have higher impact
    if (analysis.pageImports.length > 0) {
      score += analysis.pageImports.length * 2;
    }

    // Client-side imports have higher impact
    if (!analysis.isServerComponent) score += 2;

    // Static imports in pages are critical
    if (!analysis.isDynamic && analysis.pageImports.length > 0) score += 3;

    // Tree shaking issues
    if (analysis.hasTreeShakingIssues) score += 2;

    // Reduce score for appropriately dynamic imports
    if (analysis.isDynamic) score -= 1;

    if (score >= 6) return "high";
    if (score >= 3) return "medium";
    return "low";
  }

  /**
   * Determine if import should be flagged as an issue
   */
  private shouldFlagImport(
    analysis: {
      size: "small" | "medium" | "large";
      pageImports: string[];
      hasTreeShakingIssues: boolean;
      isDynamic: boolean;
      isServerComponent: boolean;
    },
    importPath: string
  ): boolean {
    // Don't flag small libraries unless they have specific issues
    if (analysis.size === "small" && !analysis.hasTreeShakingIssues) {
      return false;
    }

    // Flag if it's a large library used in pages
    if (analysis.size === "large" && analysis.pageImports.length > 0) {
      return true;
    }

    // Flag if it has tree shaking issues
    if (analysis.hasTreeShakingIssues) {
      return true;
    }

    // Flag if it's a medium/large library used statically in client components
    if (
      analysis.size !== "small" &&
      !analysis.isDynamic &&
      !analysis.isServerComponent
    ) {
      return true;
    }

    // Flag if it's used in many pages without dynamic loading
    if (
      analysis.pageImports.length > 3 &&
      !analysis.isDynamic &&
      analysis.size !== "small"
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate bundle statistics
   */
  private calculateStatistics(
    heavyImports: BundleOptimizationAnalysis["heavyImports"],
    criticalResources: BundleOptimizationAnalysis["criticalResources"]
  ): BundleOptimizationAnalysis["statistics"] {
    const totalHeavyImports = heavyImports.length;
    const dynamicImportsUsage = heavyImports.filter(
      (hi) => hi.isDynamic
    ).length;

    const staticImportsInPages = heavyImports.filter(
      (hi) =>
        !hi.isDynamic &&
        hi.importedBy.some((path) => this.pageComponents.has(path))
    ).length;

    const criticalResourcesCount = criticalResources.length;

    return {
      totalHeavyImports,
      dynamicImportsUsage,
      staticImportsInPages,
      criticalResourcesCount,
    };
  }

  /**
   * Get bundle optimization suggestions (refined)
   */
  public getBundleOptimizationSuggestions(): string[] {
    const analysis = this.analyzeBundleOptimization();
    const suggestions: string[] = [];

    // Focus on actionable optimizations
    const highImpactImports = analysis.heavyImports.filter(
      (hi) => hi.potentialImpact === "high"
    );
    const mediumImpactImports = analysis.heavyImports.filter(
      (hi) => hi.potentialImpact === "medium"
    );

    // High priority suggestions
    if (highImpactImports.length > 0) {
      const pageImports = highImpactImports.filter((hi) =>
        hi.importedBy.some((path) => this.pageComponents.has(path))
      );

      if (pageImports.length > 0) {
        suggestions.push(
          `Use dynamic imports for ${pageImports.length} large libraries in page components`
        );
      }
    }

    // Tree shaking opportunities
    const treeShakingIssues = analysis.heavyImports.filter(
      (hi) =>
        hi.importPath === "lodash" ||
        hi.importPath === "date-fns" ||
        (hi.importPath.includes("lodash") && !hi.importPath.includes("/"))
    );

    if (treeShakingIssues.length > 0) {
      suggestions.push(
        "Use specific imports (e.g., 'lodash/debounce' instead of 'lodash') for better tree shaking"
      );
    }

    // Client-side optimization
    const clientSideHeavy = analysis.heavyImports.filter(
      (hi) =>
        !hi.isServerComponent && !hi.isDynamic && hi.potentialImpact !== "low"
    );

    if (clientSideHeavy.length > 0) {
      suggestions.push(
        `Move ${clientSideHeavy.length} heavy imports to server components or use dynamic loading`
      );
    }

    // Critical resources
    const unoptimizedCritical = analysis.criticalResources.filter(
      (r) => !r.isOptimized
    );
    if (unoptimizedCritical.length > 0) {
      const scripts = unoptimizedCritical.filter(
        (r) => r.type === "script"
      ).length;
      if (scripts > 0) {
        suggestions.push(
          `Add async/defer attributes to ${scripts} blocking scripts`
        );
      }
    }

    // Preloading opportunities for actual critical resources
    const criticalImages = analysis.criticalResources.filter(
      (r) =>
        r.type === "image" &&
        r.usedInPages.some((page) => this.pageComponents.has(page))
    );
    const unpreloadedCritical = criticalImages.filter((r) => !r.isPreloaded);

    if (unpreloadedCritical.length > 0) {
      suggestions.push(
        `Add priority prop to ${unpreloadedCritical.length} critical images in page components`
      );
    }

    // Only suggest if there are real optimizations
    if (
      suggestions.length === 0 &&
      (highImpactImports.length > 0 || mediumImpactImports.length > 0)
    ) {
      suggestions.push(
        "Consider code splitting for better initial page load performance"
      );
    }

    return suggestions;
  }

  /**
   * Get dependency analysis for a specific component
   */
  public getComponentDependencyAnalysis(componentPath: string): {
    directDependencies: string[];
    heavyDependencies: string[];
    circularDependencies: string[];
    optimizationOpportunities: string[];
  } {
    const dependencies = this.dependencyGraph.get(componentPath) || new Set();
    const imports = this.importMap.get(componentPath) || [];

    const directDependencies = Array.from(dependencies);
    const heavyDependencies = imports
      .filter((imp) => imp.size === "large")
      .map((imp) => imp.importPath);

    const circularDependencies = this.findCircularDependencies(componentPath);
    const optimizationOpportunities =
      this.getOptimizationOpportunities(componentPath);

    return {
      directDependencies,
      heavyDependencies,
      circularDependencies,
      optimizationOpportunities,
    };
  }

  /**
   * Find circular dependencies (simplified implementation)
   */
  private findCircularDependencies(componentPath: string): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps: string[] = [];

    const dfs = (path: string): boolean => {
      if (recursionStack.has(path)) {
        circularDeps.push(path);
        return true;
      }

      if (visited.has(path)) {
        return false;
      }

      visited.add(path);
      recursionStack.add(path);

      const dependencies = this.dependencyGraph.get(path) || new Set();
      for (const dep of dependencies) {
        if (dfs(dep)) {
          return true;
        }
      }

      recursionStack.delete(path);
      return false;
    };

    dfs(componentPath);
    return circularDeps;
  }

  /**
   * Get optimization opportunities for a component
   */
  private getOptimizationOpportunities(componentPath: string): string[] {
    const opportunities: string[] = [];
    const imports = this.importMap.get(componentPath) || [];

    // Check for large static imports
    const largeStaticImports = imports.filter(
      (imp) => imp.size === "large" && imp.importType === "static"
    );

    if (largeStaticImports.length > 0) {
      opportunities.push("Convert large static imports to dynamic imports");
    }

    // Check for unused imports (simplified heuristic)
    const componentContent =
      this.allComponents.find((c) => c.fullPath === componentPath)?.content ||
      "";
    imports.forEach((imp) => {
      const libName = path.basename(
        imp.importPath,
        path.extname(imp.importPath)
      );
      if (!componentContent.includes(libName)) {
        opportunities.push(
          `Remove potentially unused import: ${imp.importPath}`
        );
      }
    });

    // Check for tree shaking opportunities
    const nonSpecificImports = imports.filter(
      (imp) =>
        imp.importPath.includes("lodash") && !imp.importPath.includes("/")
    );

    if (nonSpecificImports.length > 0) {
      opportunities.push("Use specific lodash imports for better tree shaking");
    }

    return opportunities;
  }
}
