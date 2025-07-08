import { IEdge } from "../../../types/circularDependency.types";
import {
  INode,
  IEdge as ZombieIEdge,
} from "../../../types/zombieCluster.types";

export interface DfsContext {
  visited: Record<string, boolean>;
  recursionStack: Record<string, boolean>;
  nodesInCycles: Set<string>;
  edges: IEdge[];
}

export interface GraphTraversalContext {
  visited: Set<string>;
  processedNodes: Set<string>;
  graph: Record<string, string[]>;
  nodes: INode[];
  edges: ZombieIEdge[];
  allNodes: Set<string>;
  functionToComponent: Record<string, string>;
}

export interface ClusterContext {
  clusterIndex: number;
  unvisited: string[];
  clusterId: string;
}

export interface PackageDependencyContext {
  usedDependencies: Set<string>;
  usedInConfigs: Set<string>;
}
