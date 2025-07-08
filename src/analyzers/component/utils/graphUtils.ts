import { DependencyGraph, ComponentRelation } from "../../../types";
import {
  INode,
  IEdge,
  INodeData,
  IEdgeData,
} from "../../../types/zombieCluster.types";

/**
 * Creates a node element for React Flow visualization
 * @param id Node identifier
 * @param label Display label
 * @param fullPath Full path to the file
 * @param directory Directory information
 * @param position Position coordinates for React Flow
 * @param parent Optional parent group id
 * @returns INode compliant with React Flow structure
 */
export function createNode(
  id: string,
  label: string,
  fullPath: string,
  directory: string,
  position: { x: number; y: number },
  parent?: string,
  isComponent?: boolean,
  fileType?: string
): INode {
  const nodeData: INodeData = {
    label,
    fullPath,
    directory,
  };

  if (isComponent !== undefined) {
    nodeData.isComponent = isComponent;
  }

  if (fileType) {
    nodeData.fileType = fileType;
  }

  const node: INode = {
    id,
    position,
    data: nodeData,
  };

  if (parent) {
    node.parentNode = parent;
    node.extent = "parent";
  }

  return node;
}

/**
 * Creates an edge element for React Flow visualization
 * @param id Unique edge identifier
 * @param source Source node id
 * @param target Target node id
 * @param type Optional connection type
 * @param label Optional label
 * @returns IEdge compliant with React Flow structure
 */
export function createEdge(
  id: string,
  source: string,
  target: string,
  type?: "import" | "export" | "dynamic",
  label?: string
): IEdge {
  const edgeData: IEdgeData = {};

  if (type) {
    edgeData.type = type;
  }

  if (label) {
    edgeData.label = label;
  }

  const edge: IEdge = {
    id,
    source,
    target,
  };

  if (Object.keys(edgeData).length > 0) {
    edge.data = edgeData;
  }

  return edge;
}

/**
 * Generates a unique edge ID from source and target
 * @param source Source node id
 * @param target Target node id
 * @returns Unique edge identifier
 */
export function generateEdgeId(source: string, target: string): string {
  return `${source}-${target}`;
}

/**
 * Normalizes an import path to match component names
 * @param importPath The raw import path
 * @param components The list of components to match against
 * @returns The normalized component name or the original import path
 */
export function normalizeImportPath(
  importPath: string,
  components: ComponentRelation[]
): string {
  const cleanedImport = importPath
    .replace(/\.(js|jsx|ts|tsx)$/, "")
    .replace(/^\.\//, "");

  const match = components.find(
    (c) => c.name === cleanedImport || c.fullPath.endsWith(cleanedImport)
  );

  return match ? match.name : importPath;
}

/**
 * Finds isolated nodes in a graph (nodes with no incoming or outgoing edges)
 * @param graph The dependency graph
 * @returns Set of isolated node ids
 */
export function findIsolatedNodes(graph: DependencyGraph): Set<string> {
  const allNodes = new Set(Object.keys(graph));
  const connectedNodes = new Set<string>();

  // Add nodes with outgoing edges
  Object.keys(graph).forEach((node) => {
    if (graph[node]?.length > 0) {
      connectedNodes.add(node);
    }
  });

  // Add nodes with incoming edges
  Object.entries(graph).forEach(([source, targets]) => {
    targets.forEach((target) => {
      connectedNodes.add(target);
    });
  });

  // Find isolated nodes (in allNodes but not in connectedNodes)
  return new Set([...allNodes].filter((node) => !connectedNodes.has(node)));
}

/**
 * Gets the file type from a full path
 * @param fullPath The full path to the file
 * @returns The file extension or undefined
 */
export function getFileTypeFromPath(fullPath: string): string | undefined {
  return fullPath ? fullPath.split(".").pop() : undefined;
}

/**
 * Determines risk level based on cluster size
 * @param size The size of the cluster
 * @returns The risk level as 'high', 'medium', or 'low'
 */
export function determineRiskLevel(size: number): "high" | "medium" | "low" {
  if (size > 5) return "high";
  if (size > 2) return "medium";
  return "low";
}

/**
 * Generates a simple grid layout for nodes
 * @param nodeCount Number of nodes to position
 * @param startX Starting X coordinate
 * @param startY Starting Y coordinate
 * @param spacing Spacing between nodes
 * @returns Array of position coordinates
 */
export function generateGridLayout(
  nodeCount: number,
  startX: number = 0,
  startY: number = 0,
  spacing: number = 150
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const cols = Math.ceil(Math.sqrt(nodeCount));

  for (let i = 0; i < nodeCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({
      x: startX + col * spacing,
      y: startY + row * spacing,
    });
  }

  return positions;
}

/**
 * Generates a circular layout for nodes (useful for circular dependencies)
 * @param nodeCount Number of nodes to position
 * @param centerX Center X coordinate
 * @param centerY Center Y coordinate
 * @param radius Radius of the circle
 * @returns Array of position coordinates
 */
export function generateCircularLayout(
  nodeCount: number,
  centerX: number = 0,
  centerY: number = 0,
  radius: number = 200
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const angleStep = (2 * Math.PI) / nodeCount;

  for (let i = 0; i < nodeCount; i++) {
    const angle = i * angleStep;
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  return positions;
}
