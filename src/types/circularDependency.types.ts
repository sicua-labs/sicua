export interface INodeData {
  label: string; // Display name (filename)
  fullPath: string; // Full path to the file (for unique identification)
  directory: string; // Directory path (not optional anymore)

  // Essential metadata in flat structure to save space
  fileType?: string; // e.g., 'tsx', 'ts', 'jsx', 'js'
  isNextRoute?: boolean; // Whether this is a Next.js route file
  routeType?: string; // 'page', 'layout', 'loading', 'error', etc.
  isComponent?: boolean; // Whether this file exports a React component
  hasClientDirective?: boolean; // Has 'use client' directive
  hasServerDirective?: boolean; // Has 'use server' directive
}

export interface IEdgeData {
  label?: string; // Optional label
  type?: "import" | "export" | "dynamic"; // Basic type of connection
}

export interface INode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: INodeData;
  parentNode?: string; // For clustering support
  extent?: "parent" | [[number, number], [number, number]]; // Constrain child nodes to parent
}

export interface IEdge {
  id: string;
  source: string;
  target: string;
  data?: IEdgeData;
  type?: string;
  animated?: boolean;
  style?: Record<string, string | number>; // CSS properties as object
  markerEnd?: {
    type: string;
    color?: string;
  };
}

export interface IDiagramData {
  nodes: INode[];
  edges: IEdge[];
  version?: string; // Version of the generator
}

export interface CircularGroupInfo {
  id: string;
  components: string[];
  path: string[]; // The dependency path that forms the circle
  size: number;
  isCritical: boolean;
  breakSuggestions: {
    component: string;
    alternativeDesign: string;
  }[];
}

export interface CircularDependencyAnalysisResult {
  circularDependencyGraph: IDiagramData;
  circularGroups: CircularGroupInfo[];
  stats: {
    totalCircularGroups: number;
    totalComponentsInCircular: number;
    maxCircularPathLength: number;
    criticalCircularPaths: number;
    componentsByCircularGroups: Record<string, string[]>;
  };
}
