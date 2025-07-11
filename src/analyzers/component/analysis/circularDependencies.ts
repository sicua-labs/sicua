import { DependencyGraph } from "../../../types";
import { ComponentLookupService } from "../../../core/componentLookupService";
import { DfsContext } from "../types/component.types";
import {
  IDiagramData,
  INode,
  IEdge,
  INodeData,
  IEdgeData,
  CircularGroupInfo,
  CircularDependencyAnalysisResult,
} from "../../../types/circularDependency.types";
import { generateCircularLayout, generateEdgeId } from "../utils/graphUtils";

/**
 * Detects circular dependencies in the component graph using optimized lookups
 * @param graph The dependency graph with unique component IDs
 * @param lookupService Pre-initialized lookup service for O(1) component resolution
 * @returns Complete circular dependency analysis
 */
export function detectCircularDependencies(
  graph: DependencyGraph,
  lookupService: ComponentLookupService
): CircularDependencyAnalysisResult {
  const context: DfsContext = {
    visited: {},
    recursionStack: {},
    nodesInCycles: new Set<string>(),
    edges: [],
  };

  const circularGroups: string[][] = [];

  // Optimized DFS with early cycle detection
  const dfs = (nodeId: string, path: string[]): void => {
    context.visited[nodeId] = true;
    context.recursionStack[nodeId] = true;
    path.push(nodeId);

    const neighbors = graph[nodeId];
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!context.visited[neighborId]) {
          dfs(neighborId, path);
        } else if (context.recursionStack[neighborId]) {
          // Found cycle - extract it efficiently
          const cycleStart = path.indexOf(neighborId);
          const cycleNodes = path.slice(cycleStart);

          // Mark all nodes in cycle
          for (const node of cycleNodes) {
            context.nodesInCycles.add(node);
          }

          // Store circular group
          circularGroups.push([...cycleNodes]);

          // Create edges for visualization
          createCircularEdges(cycleNodes, context.edges);
        }
      }
    }

    context.recursionStack[nodeId] = false;
    path.pop();
  };

  // Run DFS on all unvisited nodes
  const allNodeIds = Object.keys(graph);
  for (const nodeId of allNodeIds) {
    if (!context.visited[nodeId]) {
      dfs(nodeId, []);
    }
  }

  // Generate optimized node layout
  const nodeIds = Array.from(context.nodesInCycles);
  const positions = generateCircularLayout(
    nodeIds.length,
    400, // centerX
    300, // centerY
    250 // radius
  );

  // Create nodes using O(1) lookups
  const nodes: INode[] = nodeIds.map((nodeId, index) => {
    const component = lookupService.getComponentById(nodeId);

    const nodeData: INodeData = {
      label: component?.name || nodeId,
      fullPath: component?.fullPath || nodeId,
      directory: component?.directory || "",
      isComponent: true,
      fileType: component?.fullPath
        ? component.fullPath.split(".").pop()
        : undefined,
    };

    return {
      id: nodeId,
      position: positions[index],
      data: nodeData,
      type: "circular",
    };
  });

  // Create detailed circular group information using O(1) lookups
  const circularGroupInfos: CircularGroupInfo[] = circularGroups.map(
    (group, index) => {
      const componentNames = group.map((componentId) => {
        const component = lookupService.getComponentById(componentId);
        return component?.name || componentId;
      });

      return {
        id: `circular-${index}`,
        components: componentNames,
        path: componentNames,
        size: group.length,
        isCritical: group.length > 3,
        breakSuggestions: [
          {
            component: componentNames[0],
            alternativeDesign:
              "Consider extracting common functionality into a shared utility",
          },
        ],
      };
    }
  );

  // Create the complete graph data
  const circularDependencyGraph: IDiagramData = {
    nodes: nodes,
    edges: context.edges as IEdge[],
    version: "1.1.0",
  };

  // Create stats with O(1) lookups
  const componentsByCircularGroups = circularGroups.reduce((acc, group, i) => {
    const componentNames = group.map((componentId) => {
      const component = lookupService.getComponentById(componentId);
      return component?.name || componentId;
    });
    acc[`circular-${i}`] = componentNames;
    return acc;
  }, {} as Record<string, string[]>);

  return {
    circularDependencyGraph,
    circularGroups: circularGroupInfos,
    stats: {
      totalCircularGroups: circularGroups.length,
      totalComponentsInCircular: context.nodesInCycles.size,
      maxCircularPathLength: Math.max(
        ...circularGroups.map((g) => g.length),
        0
      ),
      criticalCircularPaths: circularGroups.filter((g) => g.length > 3).length,
      componentsByCircularGroups,
    },
  };
}

/**
 * Create circular dependency edges efficiently
 */
function createCircularEdges(cycleNodes: string[], edges: IEdge[]): void {
  for (let i = 0; i < cycleNodes.length; i++) {
    const currentNode = cycleNodes[i];
    const nextNode = cycleNodes[(i + 1) % cycleNodes.length];

    const edgeData: IEdgeData = {
      type: "import",
      label: "circular",
    };

    const edge: IEdge = {
      id: generateEdgeId(currentNode, nextNode),
      source: currentNode,
      target: nextNode,
      data: edgeData,
      animated: true,
      style: {
        stroke: "#ff6b6b",
        strokeWidth: 2,
      },
      markerEnd: {
        type: "arrowclosed",
        color: "#ff6b6b",
      },
    };

    edges.push(edge);
  }
}
