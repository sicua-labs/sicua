import {
  DependencyAnalysisDetailedResult,
  ComponentRelation,
  IConfigManager,
  ScanResult,
} from "../../types";
import { ComponentLookupService } from "../../core/componentLookupService";
import { buildDependencyGraph } from "./analysis/dependencyGraph";
import { detectCircularDependencies } from "./analysis/circularDependencies";
import { detectZombieComponentClusters } from "./analysis/zombieClusters";
import { analyzeDependencies } from "./analysis/packageDependencies";
import { PathResolver } from "../../parsers/pathResolver";

export class ComponentAnalyzer {
  private components: ComponentRelation[];
  private config: IConfigManager;
  private lookupService: ComponentLookupService;
  private pathResolver: PathResolver;

  constructor(
    components: ComponentRelation[],
    config: IConfigManager,
    lookupService: ComponentLookupService,
    pathResolver: PathResolver
  ) {
    this.components = components;
    this.config = config;
    this.lookupService = lookupService;
    this.pathResolver = pathResolver;
  }

  async analyze(): Promise<DependencyAnalysisDetailedResult> {
    // Build dependency graph using shared optimized lookups
    const graph = buildDependencyGraph(this.components, this.lookupService);

    // Analyze package dependencies using shared optimized path resolution
    const dependencyAnalysis = await analyzeDependencies(
      this.components,
      this.config,
      this.pathResolver
    );

    // Detect circular dependencies using shared optimized component lookups
    const circularDependencies = detectCircularDependencies(
      graph,
      this.lookupService
    );

    // Detect zombie clusters using shared optimized component lookups
    const zombieClusters = detectZombieComponentClusters(
      this.components,
      this.lookupService
    );

    return {
      circularDependencies,
      zombieClusters,
      dependencyAnalysis,
    };
  }
}
