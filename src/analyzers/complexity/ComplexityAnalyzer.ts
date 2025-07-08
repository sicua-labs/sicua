import { ComponentRelation, ComplexityAnalysisResult } from "../../types";
import { calculateComponentComplexity } from "./metrics/componentComplexity";
import { calculateCouplingDegree } from "./metrics/couplingDegree";
import { calculateCyclomaticComplexity } from "./metrics/cyclomaticComplexity";
import { calculateMaintainabilityIndex } from "./metrics/maintainabilityIndex";
import { calculateCognitiveComplexity } from "./metrics/cognitiveComplexity";

export class ComplexityAnalyzer {
  private components: ComponentRelation[];

  constructor(components: ComponentRelation[]) {
    this.components = components;
  }

  async analyze(): Promise<ComplexityAnalysisResult> {
    const componentComplexity = calculateComponentComplexity(this.components);
    const couplingDegree = calculateCouplingDegree(this.components);
    const cyclomaticComplexity = await calculateCyclomaticComplexity(
      this.components
    );
    const maintainabilityIndex = await calculateMaintainabilityIndex(
      this.components
    );
    const cognitiveComplexity = await calculateCognitiveComplexity(
      this.components
    );

    return {
      componentComplexity,
      couplingDegree,
      cyclomaticComplexity,
      maintainabilityIndex,
      cognitiveComplexity,
    };
  }
}
