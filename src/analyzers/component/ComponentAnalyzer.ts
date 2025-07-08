import {
  DependencyAnalysisDetailedResult,
  ComponentRelation,
  ConfigManager,
} from "../../types";
import { buildDependencyGraph } from "./analysis/dependencyGraph";
import { detectCircularDependencies } from "./analysis/circularDependencies";
import { detectZombieComponentClusters } from "./analysis/zombieClusters";
import { analyzeDependencies } from "./analysis/packageDependencies";

export class ComponentAnalyzer {
  private components: ComponentRelation[];
  private config: ConfigManager;

  constructor(components: ComponentRelation[], config: ConfigManager) {
    this.components = components;
    this.config = config;
  }

  async analyze(): Promise<DependencyAnalysisDetailedResult> {
    const graph = buildDependencyGraph(this.components);
    const dependencyAnalysis = await analyzeDependencies(
      this.components,
      this.config
    );

    const circularDependencies = detectCircularDependencies(
      graph,
      this.components
    );
    const zombieClusters = detectZombieComponentClusters(this.components);

    return {
      circularDependencies,
      zombieClusters,
      dependencyAnalysis,
    };
  }
}
