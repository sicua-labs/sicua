import { ComponentRelation, DependencyGraph } from "../../../types";
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
import { generateComponentId } from "../../../utils/common/analysisUtils";
import { generateCircularLayout, generateEdgeId } from "../utils/graphUtils";

/**
 * Detects circular dependencies in the component graph
 * @param graph The dependency graph with unique component IDs
 * @param components The list of components
 * @returns Complete circular dependency analysis
 */
export function detectCircularDependencies(
  graph: DependencyGraph,
  components: ComponentRelation[]
): CircularDependencyAnalysisResult {
  const context: DfsContext = {
    visited: {},
    recursionStack: {},
    nodesInCycles: new Set<string>(),
    edges: [],
  };

  const circularGroups: string[][] = [];

  // Create a map for efficient component lookup by unique ID
  const componentMap = new Map<string, ComponentRelation>();
  components.forEach((comp) => {
    const componentId = generateComponentId(comp);
    componentMap.set(componentId, comp);
  });

  // DFS function to detect cycles
  const dfs = (nodeId: string, path: string[] = []): void => {
    context.visited[nodeId] = true;
    context.recursionStack[nodeId] = true;
    path.push(nodeId);

    if (graph[nodeId]) {
      for (const neighborId of graph[nodeId]) {
        if (!context.visited[neighborId]) {
          dfs(neighborId, [...path]);
        } else if (context.recursionStack[neighborId]) {
          const cycleStart = path.indexOf(neighborId);
          const cycleNodes = path.slice(cycleStart);

          cycleNodes.forEach((node) => context.nodesInCycles.add(node));

          // Store this circular group
          circularGroups.push([...cycleNodes]);

          // Create edges for circular dependencies
          cycleNodes.forEach((componentId, index, cyclePath) => {
            const nextComponentId = cyclePath[(index + 1) % cyclePath.length];

            const edgeData: IEdgeData = {
              type: "import",
              label: "circular",
            };

            const edge: IEdge = {
              id: generateEdgeId(componentId, nextComponentId),
              source: componentId,
              target: nextComponentId,
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

            context.edges.push(edge);
          });
        }
      }
    }

    context.recursionStack[nodeId] = false;
    path.pop();
  };

  // Run DFS on each node in the graph
  Object.keys(graph).forEach((nodeId) => {
    if (!context.visited[nodeId]) {
      dfs(nodeId);
    }
  });

  // Generate positions for nodes in circular layout
  const nodeIds = Array.from(context.nodesInCycles);
  const positions = generateCircularLayout(
    nodeIds.length,
    400, // centerX
    300, // centerY
    250 // radius
  );

  // Create nodes using unique component IDs with positions
  const nodes: INode[] = nodeIds.map((nodeId, index) => {
    const component = componentMap.get(nodeId);

    const nodeData: INodeData = {
      label: component?.name || nodeId, // Use original component name as label
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

  // Create detailed circular group information
  const circularGroupInfos: CircularGroupInfo[] = circularGroups.map(
    (group, index) => {
      // Convert component IDs back to readable names for display
      const componentNames = group.map((componentId) => {
        const component = componentMap.get(componentId);
        return component?.name || componentId;
      });

      return {
        id: `circular-${index}`,
        components: componentNames, // Use readable names for display
        path: componentNames, // The full path of the circular dependency
        size: group.length,
        isCritical: group.length > 3, // Consider larger cycles more critical
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

  // Create the complete analysis result with unique IDs in stats
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
      componentsByCircularGroups: circularGroups.reduce((acc, group, i) => {
        // Use readable component names for the stats display
        const componentNames = group.map((componentId) => {
          const component = componentMap.get(componentId);
          return component?.name || componentId;
        });
        acc[`circular-${i}`] = componentNames;
        return acc;
      }, {} as Record<string, string[]>),
    },
  };
}
