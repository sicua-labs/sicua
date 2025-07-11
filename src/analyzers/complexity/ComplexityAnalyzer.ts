import {
  ComponentRelation,
  ComplexityAnalysisResult,
  ScanResult,
} from "../../types";
import { ComponentLookupService } from "../../core/componentLookupService";
import { PathResolver } from "../../parsers/pathResolver";
import { UnifiedComplexityCalculator } from "./metrics/unifiedComplexityCalculator";

export class ComplexityAnalyzer {
  private components: ComponentRelation[];
  private lookupService: ComponentLookupService;
  private pathResolver: PathResolver;
  private scanResult: ScanResult;

  constructor(
    components: ComponentRelation[],
    lookupService: ComponentLookupService,
    pathResolver: PathResolver,
    scanResult: ScanResult
  ) {
    this.components = components;
    this.lookupService = lookupService;
    this.pathResolver = pathResolver;
    this.scanResult = scanResult;
  }

  async analyze(): Promise<ComplexityAnalysisResult> {
    // Create unified calculator with optimized services
    const calculator = new UnifiedComplexityCalculator(this.scanResult);

    // Calculate all complexity metrics in single pass
    const metrics = calculator.calculateAllMetrics(this.components);

    return {
      componentComplexity: metrics.componentComplexity,
      couplingDegree: metrics.couplingDegree,
      cyclomaticComplexity: metrics.cyclomaticComplexity,
      maintainabilityIndex: metrics.maintainabilityIndex,
      cognitiveComplexity: metrics.cognitiveComplexity,
    };
  }
}
