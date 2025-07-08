/**
 * Types for dependency analysis
 */
import { CircularDependencyAnalysisResult } from "./circularDependency.types";
import { ZombieClusterAnalysisResult } from "./zombieCluster.types";

// Dependency analysis types
export interface DependencyGraph {
  [key: string]: string[];
}

export interface DependencyAnalysisResult {
  unusedDependencies: string[];
  missingDependencies: string[];
}

export interface ZombieCluster {
  components: string[];
  entryPoints: string[];
  functions: { [key: string]: string[] };
}

export interface DependencyAnalysisDetailedResult {
  circularDependencies: CircularDependencyAnalysisResult;
  zombieClusters: ZombieClusterAnalysisResult;
  dependencyAnalysis: DependencyAnalysisResult;
}
