import { ComponentRelation } from "../../../types";
import { ComponentLookupService } from "../../../core/componentLookupService";
import {
  GraphTraversalContext,
  ClusterContext,
} from "../types/component.types";
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
import { generateEdgeId } from "../utils/graphUtils";

/**
 * Detects zombie component clusters using optimized lookups
 * @param components The list of components to analyze
 * @param lookupService Pre-initialized lookup service for O(1) component resolution
 * @returns Complete zombie cluster analysis result
 */
export function detectZombieComponentClusters(
  components: ComponentRelation[],
  lookupService: ComponentLookupService
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

  // Build the graph and collect nodes using optimized operations
  buildGraphAndCollectNodes(components, context, lookupService);

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
    lookupService,
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
 * Builds the component and function graph using optimized lookups
 */
function buildGraphAndCollectNodes(
  components: ComponentRelation[],
  context: GraphTraversalContext,
  lookupService: ComponentLookupService
): void {
  for (const component of components) {
    const componentId = generateComponentId(component);
    context.allNodes.add(componentId);

    // Resolve imports to component IDs using O(1) lookups
    context.graph[componentId] = component.imports
      .flatMap((imp) => lookupService.resolveImportToComponentIds(imp))
      .filter((targetId) => targetId !== componentId); // Exclude self-references

    // Process functions if available
    if (Array.isArray(component.functions) && component.functionCalls) {
      for (const func of component.functions) {
        const fullName = `${componentId}.${func}`;
        context.allNodes.add(fullName);
        context.functionToComponent[fullName] = componentId;
        context.graph[fullName] = (component.functionCalls[func] || []).map(
          (callee) => `${componentId}.${callee}`
        );
      }
    }
  }
}

/**
 * Finds entry points - nodes with no incoming edges
 */
function findEntryPoints(context: GraphTraversalContext): Set<string> {
  const entryPoints = new Set(context.allNodes);

  // Remove nodes that have incoming edges
  for (const targets of Object.values(context.graph)) {
    for (const target of targets) {
      entryPoints.delete(target);
    }
  }

  return entryPoints;
}

/**
 * Marks reachable nodes from entry points via optimized DFS
 */
function markReachableNodes(
  entryPoints: Set<string>,
  context: GraphTraversalContext
): void {
  const dfs = (node: string): void => {
    if (context.visited.has(node)) return;

    context.visited.add(node);
    const neighbors = context.graph[node] || [];

    for (const neighbor of neighbors) {
      dfs(neighbor);
    }
  };

  for (const entryPoint of entryPoints) {
    dfs(entryPoint);
  }
}

/**
 * Processes zombie clusters using optimized lookups
 */
function processZombieClusters(
  unvisited: string[],
  context: GraphTraversalContext,
  lookupService: ComponentLookupService,
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
      lookupService,
      currentY + clusterIndex * clusterSpacing
    );

    // Convert component IDs back to readable names using O(1) lookups
    const readableComponentNames = cluster.components
      .filter((nodeId) => !nodeId.includes(".")) // Only component nodes, not functions
      .map((componentId) => {
        const component = lookupService.getComponentById(componentId);
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
 * Processes a single zombie cluster using optimized lookups
 */
function processCluster(
  clusterContext: ClusterContext,
  context: GraphTraversalContext,
  lookupService: ComponentLookupService,
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

  // BFS to find all connected nodes in cluster
  while (queue.length > 0) {
    const node = queue.shift()!;

    if (!cluster.includes(node)) {
      cluster.push(node);

      if (!context.processedNodes.has(node)) {
        processNode(
          node,
          clusterContext.clusterId,
          context,
          lookupService,
          functions,
          yPosition,
          processedComponents
        );
        context.processedNodes.add(node);
      }

      // Add neighbors to queue
      const neighbors = context.graph[node] || [];
      for (const neighbor of neighbors) {
        if (!cluster.includes(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }

  // Remove processed nodes from unvisited
  for (const node of cluster) {
    const index = clusterContext.unvisited.indexOf(node);
    if (index > -1) {
      clusterContext.unvisited.splice(index, 1);
    }
  }

  return {
    components: cluster.filter((node) => !node.includes(".")),
    functions,
  };
}

/**
 * Processes a single node in a zombie cluster using O(1) lookups
 */
function processNode(
  node: string,
  clusterId: string,
  context: GraphTraversalContext,
  lookupService: ComponentLookupService,
  functionsMap: { [componentName: string]: string[] },
  clusterY: number,
  processedComponents: Set<string>
): void {
  const isFunction = node.includes(".");

  if (isFunction) {
    const [componentId, funcName] = node.split(".");

    // Get component data using O(1) lookup
    const componentData = lookupService.getComponentById(componentId);
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
      position: { x: 200, y: clusterY + 100 },
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
    // Handle component node using O(1) lookup
    const componentData = lookupService.getComponentById(node);

    const nodeData: INodeData = {
      label: componentData?.name || node,
      fullPath: componentData?.fullPath || node,
      directory: componentData?.directory || "",
      isComponent: true,
    };

    const componentNode: INode = {
      id: node,
      position: { x: 150, y: clusterY + 50 },
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
