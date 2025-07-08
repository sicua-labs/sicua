/**
 * Type definitions for file structure visualization with Sigma.js
 */

// File system node (file or directory)
export interface FileSystemNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  // Structure properties
  isDirectory: boolean;
  depth: number;
  childCount: number;
  parentId?: string;
  // File metadata
  fullPath: string;
  fileName: string;
  fileType?: string;
  // Next.js properties
  isNextRoute?: boolean;
  routeType?: string;
  isNextSpecialFile?: boolean;
}

// Relationship between file system entities
export interface FileSystemEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  size: number;
  relationType: "parent-child" | "import";
}

// Complete file structure graph
export interface FileStructureGraph {
  nodes: FileSystemNode[];
  edges: FileSystemEdge[];
  version: string;
}

// Interface for directory scanning results
// Update the StructureScanResult interface in structureDiagram.types.ts

export interface StructureScanResult {
  directories: Map<
    string,
    {
      path: string;
      depth: number;
      childDirs: string[];
      childFiles: string[];
      isDynamicRoute?: boolean;
      dynamicRouteType?: string;
    }
  >;
  files: Map<
    string,
    {
      path: string;
      name: string;
      extension: string;
      size?: number;
      isNextRoute: boolean;
      routeType?: string;
      isNextSpecialFile: boolean;
      fileDepth: number;
    }
  >;
}
