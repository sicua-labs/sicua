/**
 * Type definitions for Sigma.js graph data
 */

// Node interface for Sigma.js
export interface ComponentNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  // Additional metadata
  fullPath?: string;
  directory?: string;
  parent?: string;
  fileType?: string;
  isNextRoute?: boolean;
  routeType?: string;
  isComponent?: boolean;
  hasClientDirective?: boolean;
  hasServerDirective?: boolean;
}

// Edge interface for Sigma.js
export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  color: string;
  size: number;
  type?: "import" | "export" | "dynamic";
}

// Graph data structure for Sigma.js
export interface ComponentDependencyGraph {
  nodes: ComponentNode[];
  edges: DependencyEdge[];
  version: string;
}
