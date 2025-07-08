import {
  RouteFlowTree,
  ComponentFlowNode,
  RouteStructure,
  ComponentFlowConfig,
  ClusterInfo,
  ComponentTreeStats,
  EnhancedRouteFlowTree,
  LayoutHints,
  VisualizationMetadata,
} from "../types";
import { ComponentFlowScanner } from "../scanners/ComponentFlowScanner";
import { RouteCoverageBuilder } from "./RouteCoverageBuilder";

/**
 * Builds complete component flow trees with coverage data and visualization metadata
 */
export class FlowTreeBuilder {
  private componentScanner: ComponentFlowScanner;
  private coverageBuilder: RouteCoverageBuilder;

  constructor(
    projectRoot: string,
    srcDirectory: string,
    appDirectory: string,
    components: Array<{
      name: string;
      usedBy: string[];
      directory: string;
      imports: string[];
      exports: string[];
      fullPath: string;
      functions?: string[];
      functionCalls?: { [key: string]: string[] };
      content?: string;
    }>,
    config?: ComponentFlowConfig
  ) {
    this.componentScanner = new ComponentFlowScanner(
      projectRoot,
      srcDirectory,
      components,
      10, // maxDepth
      config // Pass config to scanner
    );
    this.coverageBuilder = new RouteCoverageBuilder(appDirectory);
  }

  /**
   * Builds complete flow tree for a single route
   */
  buildRouteFlowTree(routeStructure: RouteStructure): EnhancedRouteFlowTree {
    // Build component flow tree
    const pageComponent = this.componentScanner.scanComponentFlow(
      routeStructure.pageFilePath
    );

    if (!pageComponent) {
      throw new Error(
        `Failed to analyze page component: ${routeStructure.pageFilePath}`
      );
    }

    // Build coverage analysis
    const coverageAnalysis =
      this.coverageBuilder.buildRouteCoverage(routeStructure);

    // Calculate component statistics
    const componentStats = this.calculateComponentStats(pageComponent);

    // Generate visualization metadata
    const visualizationData = this.generateVisualizationMetadata(
      pageComponent,
      routeStructure,
      componentStats
    );

    // FIXED: Do NOT add special files as children to the component tree
    // Special files are architectural elements, not component children
    // They are already properly tracked in the specialFiles property

    return {
      routePath: routeStructure.routePath,
      pageComponent: pageComponent, // Keep original component tree without special files
      specialFiles: coverageAnalysis.specialFilesCoverage,
      metadata: routeStructure.metadata,
      coverageAnalysis,
      componentStats,
      visualizationData,
    };
  }

  /**
   * Builds flow trees for multiple routes
   */
  buildMultipleRouteFlowTrees(
    routeStructures: RouteStructure[]
  ): EnhancedRouteFlowTree[] {
    const trees: EnhancedRouteFlowTree[] = [];

    for (const routeStructure of routeStructures) {
      try {
        const tree = this.buildRouteFlowTree(routeStructure);
        trees.push(tree);
      } catch (error) {
        console.warn(
          `Failed to build flow tree for route ${routeStructure.routePath}:`,
          error
        );
      }
    }

    return trees;
  }

  /**
   * Builds a simplified tree for quick visualization
   */
  buildSimplifiedFlowTree(
    routeStructure: RouteStructure,
    maxDepth: number = 3
  ): RouteFlowTree {
    const originalMaxDepth = this.componentScanner["maxDepth"];
    this.componentScanner["maxDepth"] = maxDepth;

    try {
      const pageComponent = this.componentScanner.scanComponentFlow(
        routeStructure.pageFilePath
      );

      if (!pageComponent) {
        throw new Error(
          `Failed to analyze page component: ${routeStructure.pageFilePath}`
        );
      }

      const coverageAnalysis =
        this.coverageBuilder.buildRouteCoverage(routeStructure);

      return {
        routePath: routeStructure.routePath,
        pageComponent,
        specialFiles: coverageAnalysis.specialFilesCoverage,
        metadata: routeStructure.metadata,
      };
    } finally {
      this.componentScanner["maxDepth"] = originalMaxDepth;
    }
  }

  /**
   * Builds flow tree focused on conditional rendering patterns
   */
  buildConditionalFlowTree(routeStructure: RouteStructure): {
    routePath: string;
    conditionalPaths: ConditionalPath[];
    totalPaths: number;
  } {
    const pageComponent = this.componentScanner.scanComponentFlow(
      routeStructure.pageFilePath
    );

    if (!pageComponent) {
      throw new Error(
        `Failed to analyze page component: ${routeStructure.pageFilePath}`
      );
    }

    const conditionalPaths = this.extractConditionalPaths(pageComponent);

    return {
      routePath: routeStructure.routePath,
      conditionalPaths,
      totalPaths: conditionalPaths.length,
    };
  }

  /**
   * Calculates comprehensive component statistics - FIXED VERSION
   */
  private calculateComponentStats(
    rootComponent: ComponentFlowNode
  ): ComponentTreeStats {
    const stats: ComponentTreeStats = {
      totalComponents: 0,
      externalComponents: 0,
      internalComponents: 0,
      maxDepth: 0,
      conditionalRenderCount: 0,
      uniqueComponents: new Set<string>(),
      componentsByDepth: new Map<number, string[]>(),
    };

    // NEW: Track visited components to prevent double counting
    const visitedComponents = new Set<string>();

    this.traverseComponentTree(rootComponent, 0, stats, visitedComponents);

    return stats;
  }

  /**
   * Recursively traverses component tree to calculate statistics - FIXED VERSION
   */
  private traverseComponentTree(
    component: ComponentFlowNode,
    depth: number,
    stats: ComponentTreeStats,
    visitedComponents: Set<string>
  ): void {
    // Create unique key for this component
    const componentKey = `${component.componentName}:${component.filePath}`;

    // Skip if already processed to prevent double counting
    if (visitedComponents.has(componentKey)) {
      return;
    }
    visitedComponents.add(componentKey);

    // Count this component
    stats.totalComponents++;
    stats.uniqueComponents.add(component.componentName);
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (component.isExternal) {
      stats.externalComponents++;
    } else {
      stats.internalComponents++;
    }

    // Track components by depth
    if (!stats.componentsByDepth.has(depth)) {
      stats.componentsByDepth.set(depth, []);
    }
    stats.componentsByDepth.get(depth)!.push(component.componentName);

    // Count conditional renders for THIS component only
    stats.conditionalRenderCount += component.conditionalRenders.length;

    // Collect all children to process (avoiding duplicates)
    const childrenToProcess = new Map<string, ComponentFlowNode>();

    // Process conditional renders - collect children but don't traverse yet
    for (const conditionalRender of component.conditionalRenders) {
      for (const trueChild of conditionalRender.trueBranch) {
        const childKey = `${trueChild.componentName}:${trueChild.filePath}`;
        childrenToProcess.set(childKey, trueChild);
      }

      if (conditionalRender.falseBranch) {
        for (const falseChild of conditionalRender.falseBranch) {
          const childKey = `${falseChild.componentName}:${falseChild.filePath}`;
          childrenToProcess.set(childKey, falseChild);
        }
      }
    }

    // Process regular children - collect but don't traverse yet
    for (const child of component.children) {
      const childKey = `${child.componentName}:${child.filePath}`;
      childrenToProcess.set(childKey, child);
    }

    // NOW traverse all unique children
    for (const child of childrenToProcess.values()) {
      this.traverseComponentTree(child, depth + 1, stats, visitedComponents);
    }
  }

  /**
   * Generates visualization metadata for the component tree
   */
  private generateVisualizationMetadata(
    rootComponent: ComponentFlowNode,
    routeStructure: RouteStructure,
    stats: ComponentTreeStats
  ): VisualizationMetadata {
    const clusters = this.generateClusters(rootComponent);
    const layoutHints = this.generateLayoutHints(stats, routeStructure);

    return {
      nodeCount: stats.totalComponents,
      edgeCount: this.calculateEdgeCount(rootComponent),
      clusterInfo: clusters,
      layoutHints,
    };
  }

  /**
   * Generates cluster information for visualization grouping
   */
  private generateClusters(rootComponent: ComponentFlowNode): ClusterInfo[] {
    const clusters: ClusterInfo[] = [];
    let clusterId = 0;
    const visitedNodes = new Set<string>(); // NEW: Prevent duplicate processing

    const processNode = (component: ComponentFlowNode, depth: number): void => {
      const nodeKey = `${component.componentName}:${component.filePath}`;
      if (visitedNodes.has(nodeKey)) {
        return; // Skip already processed nodes
      }
      visitedNodes.add(nodeKey);

      // Create cluster for conditional renders
      for (const conditionalRender of component.conditionalRenders) {
        const trueComponents = conditionalRender.trueBranch.map(
          (c) => c.componentName
        );
        const falseComponents =
          conditionalRender.falseBranch?.map((c) => c.componentName) || [];

        if (trueComponents.length > 0) {
          clusters.push({
            clusterId: `conditional-true-${clusterId++}`,
            clusterType: "conditional",
            componentNames: trueComponents,
            depth,
          });
        }

        if (falseComponents.length > 0) {
          clusters.push({
            clusterId: `conditional-false-${clusterId++}`,
            clusterType: "conditional",
            componentNames: falseComponents,
            depth,
          });
        }

        // Recursively process conditional children
        [
          ...conditionalRender.trueBranch,
          ...(conditionalRender.falseBranch || []),
        ].forEach((child) => {
          processNode(child, depth + 1);
        });
      }

      // Create cluster for external components
      const externalChildren = component.children.filter((c) => c.isExternal);
      if (externalChildren.length > 0) {
        clusters.push({
          clusterId: `external-${clusterId++}`,
          clusterType: "external",
          componentNames: externalChildren.map((c) => c.componentName),
          depth,
        });
      }

      // Process remaining children
      component.children
        .filter((c) => !c.isExternal)
        .forEach((child) => {
          processNode(child, depth + 1);
        });
    };

    processNode(rootComponent, 0);
    return clusters;
  }

  /**
   * Generates layout hints for visualization
   */
  private generateLayoutHints(
    stats: ComponentTreeStats,
    routeStructure: RouteStructure
  ): LayoutHints {
    let suggestedLayout: "hierarchical" | "force" | "circular" = "hierarchical";
    let primaryFlow: "vertical" | "horizontal" = "vertical";

    // Determine layout based on tree characteristics
    if (stats.maxDepth > 5) {
      suggestedLayout = "force";
      primaryFlow = "horizontal";
    } else if (stats.conditionalRenderCount > 10) {
      suggestedLayout = "force";
    } else if (stats.totalComponents < 10) {
      suggestedLayout = "circular";
    }

    // Generate groupings
    const groupings: { [key: string]: string[] } = {};
    for (const [depth, components] of stats.componentsByDepth) {
      groupings[`depth-${depth}`] = components;
    }

    return {
      suggestedLayout,
      primaryFlow,
      groupings,
    };
  }

  /**
   * Calculates the total number of edges in the component tree - FIXED VERSION
   */
  private calculateEdgeCount(rootComponent: ComponentFlowNode): number {
    let edgeCount = 0;
    const visitedNodes = new Set<string>(); // NEW: Prevent double counting

    const processNode = (component: ComponentFlowNode): void => {
      const nodeKey = `${component.componentName}:${component.filePath}`;
      if (visitedNodes.has(nodeKey)) {
        return;
      }
      visitedNodes.add(nodeKey);

      // Count edges to conditional children
      for (const conditionalRender of component.conditionalRenders) {
        edgeCount += conditionalRender.trueBranch.length;
        edgeCount += conditionalRender.falseBranch?.length || 0;

        [
          ...conditionalRender.trueBranch,
          ...(conditionalRender.falseBranch || []),
        ].forEach(processNode);
      }

      // Count edges to regular children
      edgeCount += component.children.length;
      component.children.forEach(processNode);
    };

    processNode(rootComponent);
    return edgeCount;
  }

  /**
   * REMOVED: enhanceComponentWithSpecialFiles method
   *
   * Previously this method was adding special files (ErrorBoundary, Loading, NotFound)
   * as children to the component tree, which was architecturally incorrect.
   *
   * Special files are Next.js architectural elements that wrap or replace content,
   * not components that are directly rendered as children in the JSX tree.
   *
   * They are properly tracked in the `specialFiles` property of the RouteFlowTree.
   */

  /**
   * Extracts all possible conditional rendering paths - FIXED VERSION
   */
  private extractConditionalPaths(
    rootComponent: ComponentFlowNode
  ): ConditionalPath[] {
    const paths: ConditionalPath[] = [];
    const visitedNodes = new Set<string>(); // NEW: Prevent infinite loops

    const extractPaths = (
      component: ComponentFlowNode,
      currentPath: string[],
      conditions: string[]
    ): void => {
      const nodeKey = `${component.componentName}:${component.filePath}`;
      if (visitedNodes.has(nodeKey)) {
        return;
      }
      visitedNodes.add(nodeKey);

      const newPath = [...currentPath, component.componentName];

      // If this component has conditional renders, create paths for each branch
      for (const conditionalRender of component.conditionalRenders) {
        const newConditions = [...conditions, conditionalRender.condition];

        // True branch
        for (const trueChild of conditionalRender.trueBranch) {
          extractPaths(trueChild, newPath, [...newConditions, "true"]);
        }

        // False branch
        if (conditionalRender.falseBranch) {
          for (const falseChild of conditionalRender.falseBranch) {
            extractPaths(falseChild, newPath, [...newConditions, "false"]);
          }
        }
      }

      // Regular children
      for (const child of component.children) {
        extractPaths(child, newPath, conditions);
      }

      // If this is a leaf node, add the path
      if (
        component.children.length === 0 &&
        component.conditionalRenders.length === 0
      ) {
        paths.push({
          components: newPath,
          conditions: conditions,
          isConditional: conditions.length > 0,
        });
      }
    };

    extractPaths(rootComponent, [], []);
    return paths;
  }
}

/**
 * Represents a conditional rendering path through the component tree
 */
export interface ConditionalPath {
  components: string[];
  conditions: string[];
  isConditional: boolean;
}
