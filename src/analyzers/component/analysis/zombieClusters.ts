import { ComponentRelation } from "../../../types";
import {
  GraphTraversalContext,
  ClusterContext,
} from "../types/component.types";
import { normalizeImportPath } from "../utils/graphUtils";
import {
  IDiagramData,
  INode,
  IEdge,
  INodeData,
  IEdgeData,
  ZombieClusterInfo,
  ZombieClusterAnalysisResult,
} from "../../../types/zombieCluster.types";
import { generateComponentId } from "../../../utils/common/analysisUtils";
import { generateGridLayout, generateEdgeId } from "../utils/graphUtils";

/**
 * Detects zombie component clusters - components that are not reachable from entry points
 * @param components The list of components to analyze
 * @returns Complete zombie cluster analysis result
 */
export function detectZombieComponentClusters(
  components: ComponentRelation[]
): ZombieClusterAnalysisResult {
  const context: GraphTraversalContext = {
    graph: {},
    allNodes: new Set<string>(),
    functionToComponent: {},
    nodes: [],
    edges: [],
    processedNodes: new Set<string>(),
    visited: new Set<string>(),
  };

  // Create component map for efficient lookup
  const componentMap = new Map<string, ComponentRelation>();
  components.forEach((comp) => {
    const componentId = generateComponentId(comp);
    componentMap.set(componentId, comp);
  });

  // Build the graph and collect nodes
  buildGraphAndCollectNodes(components, context, componentMap);

  // Find entry points - nodes with no incoming edges
  const entryPoints = findEntryPoints(context);

  // Mark reachable nodes via DFS from entry points
  markReachableNodes(entryPoints, context);

  // Find and process zombie clusters
  const unvisited = Array.from(context.allNodes).filter(
    (c) => !context.visited.has(c)
  );

  const clusters: ZombieClusterInfo[] = [];
  let currentY = 0;
  const clusterSpacing = 400;

  processZombieClusters(
    unvisited,
    context,
    componentMap,
    clusters,
    currentY,
    clusterSpacing
  );

  // Create the complete zombie cluster graph
  const zombieClusterGraph: IDiagramData = {
    nodes: context.nodes as INode[],
    edges: context.edges as IEdge[],
    version: "1.1.0",
  };

  // Calculate statistics
  const totalZombieComponents = clusters.reduce(
    (sum, cluster) => sum + cluster.components.length,
    0
  );
  const largestClusterSize =
    clusters.length > 0
      ? Math.max(...clusters.map((c) => c.components.length))
      : 0;

  return {
    zombieClusterGraph,
    clusters,
    stats: {
      totalClusters: clusters.length,
      totalZombieComponents,
      largestCluster: largestClusterSize,
      entryPointsCount: entryPoints.size,
      avgComponentsPerCluster:
        clusters.length > 0 ? totalZombieComponents / clusters.length : 0,
    },
  };
}

/**
 * Builds the component and function graph and collects all nodes
 */
function buildGraphAndCollectNodes(
  components: ComponentRelation[],
  context: GraphTraversalContext,
  componentMap: Map<string, ComponentRelation>
): void {
  components.forEach((component) => {
    const componentId = generateComponentId(component);
    context.allNodes.add(componentId);

    // Map imports to unique component IDs
    context.graph[componentId] = component.imports
      .map((imp) => normalizeImportPath(imp, components))
      .map((normalizedImport) => {
        // Find target component by normalized import path
        const targetComponent = components.find(
          (c) => c.name === normalizedImport
        );
        return targetComponent ? generateComponentId(targetComponent) : null;
      })
      .filter((targetId): targetId is string => targetId !== null);

    if (Array.isArray(component.functions) && component.functionCalls) {
      component.functions.forEach((func) => {
        const fullName = `${componentId}.${func}`;
        context.allNodes.add(fullName);
        context.functionToComponent[fullName] = componentId;
        context.graph[fullName] = (component.functionCalls?.[func] || []).map(
          (callee) => `${componentId}.${callee}`
        );
      });
    }
  });
}

/**
 * Finds entry points - nodes with no incoming edges
 */
function findEntryPoints(context: GraphTraversalContext): Set<string> {
  const entryPoints = new Set(context.allNodes);
  Object.values(context.graph).forEach((imports) => {
    imports.forEach((imp) => entryPoints.delete(imp));
  });
  return entryPoints;
}

/**
 * Marks reachable nodes from entry points via DFS
 */
function markReachableNodes(
  entryPoints: Set<string>,
  context: GraphTraversalContext
): void {
  function dfs(node: string) {
    context.visited.add(node);
    (context.graph[node] || []).forEach((neighbor) => {
      if (!context.visited.has(neighbor)) {
        dfs(neighbor);
      }
    });
  }

  Array.from(entryPoints).forEach(dfs);
}

/**
 * Processes zombie clusters - groups of unreachable nodes
 */
function processZombieClusters(
  unvisited: string[],
  context: GraphTraversalContext,
  componentMap: Map<string, ComponentRelation>,
  clusters: ZombieClusterInfo[],
  currentY: number,
  clusterSpacing: number
): void {
  let clusterIndex = 0;

  while (unvisited.length > 0) {
    const clusterContext: ClusterContext = {
      clusterIndex,
      unvisited,
      clusterId: `cluster-${clusterIndex}`,
    };

    const cluster = processCluster(
      clusterContext,
      context,
      componentMap,
      currentY + clusterIndex * clusterSpacing
    );

    // Convert component IDs back to readable names for display
    const readableComponentNames = cluster.components
      .filter((nodeId) => !nodeId.includes(".")) // Only component nodes, not functions
      .map((componentId) => {
        const component = componentMap.get(componentId);
        return component?.name || componentId;
      });

    // Create ZombieClusterInfo object
    const clusterInfo: ZombieClusterInfo = {
      id: clusterContext.clusterId,
      components: readableComponentNames,
      entryPoints: [],
      functions: cluster.functions,
      size: readableComponentNames.length,
      risk:
        readableComponentNames.length > 5
          ? "high"
          : readableComponentNames.length > 2
          ? "medium"
          : "low",
      suggestion: getSuggestionForCluster(readableComponentNames.length),
    };

    clusters.push(clusterInfo);
    clusterIndex++;
  }
}

/**
 * Get a suggestion based on the cluster size
 */
function getSuggestionForCluster(size: number): string {
  if (size > 5) {
    return "Consider refactoring this large zombie cluster into smaller, reusable modules with clear entry points.";
  } else if (size > 2) {
    return "These components should either be connected to the main application or removed if unused.";
  }
  return "This small zombie cluster may be unused code that can be safely removed.";
}

/**
 * Processes a single zombie cluster
 * @returns Information about the processed cluster
 */
function processCluster(
  clusterContext: ClusterContext,
  context: GraphTraversalContext,
  componentMap: Map<string, ComponentRelation>,
  yPosition: number
): {
  components: string[];
  functions: { [componentName: string]: string[] };
} {
  const cluster: string[] = [];
  const queue = [clusterContext.unvisited[0]];
  const functions: { [componentName: string]: string[] } = {};
  const processedComponents = new Set<string>();

  // Create cluster parent node
  const clusterNodeData: INodeData = {
    label: `Zombie Cluster ${clusterContext.clusterIndex + 1}`,
    fullPath: clusterContext.clusterId,
    directory: "",
  };

  const clusterNode: INode = {
    id: clusterContext.clusterId,
    position: { x: 0, y: yPosition },
    data: clusterNodeData,
    type: "cluster",
  };

  context.nodes.push(clusterNode);

  while (queue.length > 0) {
    const node = queue.shift()!;

    if (!cluster.includes(node)) {
      cluster.push(node);

      if (!context.processedNodes.has(node)) {
        processNode(
          node,
          clusterContext.clusterId,
          context,
          componentMap,
          functions,
          yPosition,
          processedComponents
        );
        context.processedNodes.add(node);
      }

      (context.graph[node] || []).forEach((neighbor) => {
        if (!cluster.includes(neighbor)) {
          queue.push(neighbor);
        }
      });
    }
  }

  // Remove processed nodes from unvisited
  cluster.forEach((node) => {
    const index = clusterContext.unvisited.indexOf(node);
    if (index > -1) {
      clusterContext.unvisited.splice(index, 1);
    }
  });

  return {
    components: cluster.filter((node) => !node.includes(".")),
    functions,
  };
}

/**
 * Processes a single node in a zombie cluster
 */
function processNode(
  node: string,
  clusterId: string,
  context: GraphTraversalContext,
  componentMap: Map<string, ComponentRelation>,
  functionsMap: { [componentName: string]: string[] },
  clusterY: number,
  processedComponents: Set<string>
): void {
  const isFunction = node.includes(".");

  if (isFunction) {
    const [componentId, funcName] = node.split(".");

    // Find component data using unique ID
    const componentData = componentMap.get(componentId);
    const directory = componentData?.directory || "";

    // Ensure parent component node exists first
    if (!processedComponents.has(componentId)) {
      const parentNodeData: INodeData = {
        label: componentData?.name || componentId,
        fullPath: componentData?.fullPath || componentId,
        directory: componentData?.directory || "",
        isComponent: true,
      };

      const parentComponentNode: INode = {
        id: componentId,
        position: { x: 150, y: clusterY + 50 },
        data: parentNodeData,
        parentNode: clusterId,
        extent: "parent",
        type: "zombie",
      };

      context.nodes.push(parentComponentNode);

      // Add edge from cluster to component
      const clusterToComponentEdge: IEdge = {
        id: generateEdgeId(clusterId, componentId),
        source: clusterId,
        target: componentId,
      };

      context.edges.push(clusterToComponentEdge);
      processedComponents.add(componentId);
    }

    // Add function node as child of component
    const functionNodeData: INodeData = {
      label: funcName,
      fullPath: node,
      directory,
    };

    const functionNode: INode = {
      id: node,
      position: { x: 200, y: clusterY + 100 }, // Position relative to component
      data: functionNodeData,
      parentNode: componentId,
      extent: "parent",
      type: "function",
    };

    context.nodes.push(functionNode);

    // Add edge from component to function
    const edge: IEdge = {
      id: generateEdgeId(componentId, node),
      source: componentId,
      target: node,
      data: { type: "export" },
    };

    context.edges.push(edge);

    // Add function to the functions map using readable component name
    const componentName = componentData?.name || componentId;
    if (!functionsMap[componentName]) {
      functionsMap[componentName] = [];
    }
    functionsMap[componentName].push(funcName);
  } else {
    const componentData = componentMap.get(node);

    // Add component node with unique ID but readable label
    const nodeData: INodeData = {
      label: componentData?.name || node,
      fullPath: componentData?.fullPath || node,
      directory: componentData?.directory || "",
      isComponent: true,
    };

    const componentNode: INode = {
      id: node,
      position: { x: 150, y: clusterY + 50 }, // Position relative to cluster
      data: nodeData,
      parentNode: clusterId,
      extent: "parent",
      type: "zombie",
    };

    context.nodes.push(componentNode);

    // Add edge from cluster to component
    const edge: IEdge = {
      id: generateEdgeId(clusterId, node),
      source: clusterId,
      target: node,
    };

    context.edges.push(edge);
    processedComponents.add(node);
  }
}
