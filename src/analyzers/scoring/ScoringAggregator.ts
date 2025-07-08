/**
 * Updated scoring aggregator with file type exclusions and new metrics
 * Combines multiple metric scores into a final component score
 * Applies weights, multipliers, and file type adjustments
 */

import { ComponentRelation } from "../../types";
import {
  ScoringWeights,
  ScoringMultipliers,
  FILE_TYPE_EXCLUSIONS,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_SCORING_MULTIPLIERS,
  getFileType,
} from "./ScoringCriteria";
import {
  MetricCalculationContext,
  calculateCircularDependencyScore,
  calculateErrorHandlingScore,
  calculateComplexityScore,
  calculateMaintainabilityScore,
  calculateCouplingScore,
  calculateTypeIssuesScore,
  calculateAccessibilityScore,
  calculatePerformanceScore,
  calculateSEOScore,
  calculateZombieCodeScore,
  calculateTranslationScore,
  calculateMagicNumbersScore,
  calculateCodeMetricsScore,
  calculateDeduplicationScore,
  calculateComponentFlowScore,
} from "./ScoringMetrics";

export interface IndividualScores {
  circularDependencies: number;
  errorHandlingGaps: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  typeIssues: number;
  accessibilityIssues: number;
  performanceIssues: number;
  seoProblems: number;
  couplingDegree: number;
  zombieCode: number;
  translationIssues: number;
  componentFlowComplexity: number;
  deduplicationOpportunities: number;
  codeMetrics: number;
  magicNumbers: number;
}

export interface ScoringResult {
  finalScore: number;
  individualScores: IndividualScores;
  appliedMultipliers: string[];
  fileType: keyof typeof FILE_TYPE_EXCLUSIONS;
  weightedContributions: Record<keyof IndividualScores, number>;
  excludedMetrics: string[];
  appliedWeightAdjustments: Record<string, number>;
}

export class ScoringAggregator {
  private weights: ScoringWeights;
  private multipliers: ScoringMultipliers;

  constructor(
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
    multipliers: ScoringMultipliers = DEFAULT_SCORING_MULTIPLIERS
  ) {
    this.weights = weights;
    this.multipliers = multipliers;
  }

  /**
   * Calculate the final score for a component with file type exclusions
   */
  calculateScore(context: MetricCalculationContext): ScoringResult {
    // Determine file type for exclusions and adjustments
    const fileType = getFileType(
      context.component.name,
      context.component.fullPath
    );

    // Calculate individual metric scores
    const rawScores = this.calculateIndividualScores(context);

    // Apply file type exclusions
    const { adjustedScores, excludedMetrics } = this.applyFileTypeExclusions(
      rawScores,
      fileType
    );

    // Apply file type specific weight adjustments
    const { adjustedWeights, appliedWeightAdjustments } =
      this.applyFileTypeAdjustments(this.weights, fileType);

    // Calculate weighted score using adjusted weights and scores
    const weightedScore = this.calculateWeightedScore(
      adjustedScores,
      adjustedWeights
    );

    // Calculate weighted contributions for analysis
    const weightedContributions = this.calculateWeightedContributions(
      adjustedScores,
      adjustedWeights
    );

    // Apply multipliers
    const { finalScore, appliedMultipliers } = this.applyMultipliers(
      weightedScore,
      adjustedScores,
      context,
      fileType
    );

    return {
      finalScore: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      individualScores: rawScores, // Keep original scores for debugging
      appliedMultipliers,
      fileType,
      weightedContributions,
      excludedMetrics,
      appliedWeightAdjustments,
    };
  }

  /**
   * Calculate all individual metric scores including new metrics
   */
  private calculateIndividualScores(
    context: MetricCalculationContext
  ): IndividualScores {
    const complexityScore = calculateComplexityScore(context);

    return {
      circularDependencies: calculateCircularDependencyScore(context),
      errorHandlingGaps: calculateErrorHandlingScore(context),
      cyclomaticComplexity: complexityScore, // This includes both cyclomatic and cognitive
      cognitiveComplexity: 0, // Already included in cyclomaticComplexity
      maintainabilityIndex: calculateMaintainabilityScore(context),
      typeIssues: calculateTypeIssuesScore(context),
      accessibilityIssues: calculateAccessibilityScore(context), // NEW
      performanceIssues: calculatePerformanceScore(context), // NEW
      seoProblems: calculateSEOScore(context),
      couplingDegree: calculateCouplingScore(context),
      zombieCode: calculateZombieCodeScore(context),
      translationIssues: calculateTranslationScore(context),
      componentFlowComplexity: calculateComponentFlowScore(context),
      deduplicationOpportunities: calculateDeduplicationScore(context),
      codeMetrics: calculateCodeMetricsScore(context),
      magicNumbers: calculateMagicNumbersScore(context),
    };
  }

  /**
   * Apply file type exclusions to remove inappropriate metrics
   */
  private applyFileTypeExclusions(
    scores: IndividualScores,
    fileType: keyof typeof FILE_TYPE_EXCLUSIONS
  ): { adjustedScores: IndividualScores; excludedMetrics: string[] } {
    const exclusions = FILE_TYPE_EXCLUSIONS[fileType];
    const excludedMetrics: string[] = [];
    const adjustedScores = { ...scores };

    if (
      exclusions &&
      "excludeMetrics" in exclusions &&
      exclusions.excludeMetrics
    ) {
      for (const metric of exclusions.excludeMetrics) {
        if (metric in adjustedScores) {
          (adjustedScores as any)[metric] = 0;
          excludedMetrics.push(metric);
        }
      }
    }

    return { adjustedScores, excludedMetrics };
  }

  /**
   * Apply file type specific weight adjustments with renormalization
   */
  private applyFileTypeAdjustments(
    baseWeights: ScoringWeights,
    fileType: keyof typeof FILE_TYPE_EXCLUSIONS
  ): {
    adjustedWeights: ScoringWeights;
    appliedWeightAdjustments: Record<string, number>;
  } {
    const exclusions = FILE_TYPE_EXCLUSIONS[fileType];
    const adjustedWeights = { ...baseWeights };
    const appliedWeightAdjustments: Record<string, number> = {};

    if (!exclusions) {
      return { adjustedWeights, appliedWeightAdjustments };
    }

    // Apply weight reductions
    if ("reduceWeights" in exclusions && exclusions.reduceWeights) {
      for (const [metric, multiplier] of Object.entries(
        exclusions.reduceWeights
      )) {
        if (metric in adjustedWeights && typeof multiplier === "number") {
          (adjustedWeights as any)[metric] *= multiplier;
          appliedWeightAdjustments[metric] = multiplier;
        }
      }
    }

    // Apply weight increases
    if ("increaseWeights" in exclusions && exclusions.increaseWeights) {
      for (const [metric, multiplier] of Object.entries(
        exclusions.increaseWeights
      )) {
        if (metric in adjustedWeights && typeof multiplier === "number") {
          (adjustedWeights as any)[metric] *= multiplier;
          appliedWeightAdjustments[metric] = multiplier;
        }
      }
    }

    // Zero out weights for excluded metrics
    if ("excludeMetrics" in exclusions && exclusions.excludeMetrics) {
      for (const metric of exclusions.excludeMetrics) {
        if (metric in adjustedWeights) {
          (adjustedWeights as any)[metric] = 0;
          appliedWeightAdjustments[metric] = 0;
        }
      }
    }

    // Renormalize weights to sum to 1
    const totalWeight = Object.values(adjustedWeights).reduce(
      (sum, weight) => sum + weight,
      0
    );

    if (totalWeight > 0) {
      for (const key in adjustedWeights) {
        (adjustedWeights as any)[key] /= totalWeight;
      }
    }

    return { adjustedWeights, appliedWeightAdjustments };
  }

  /**
   * Calculate weighted score using adjusted weights
   */
  private calculateWeightedScore(
    scores: IndividualScores,
    weights: ScoringWeights
  ): number {
    let weightedSum = 0;

    weightedSum += scores.circularDependencies * weights.circularDependencies;
    weightedSum += scores.errorHandlingGaps * weights.errorHandlingGaps;
    weightedSum += scores.cyclomaticComplexity * weights.cyclomaticComplexity;
    weightedSum += scores.cognitiveComplexity * weights.cognitiveComplexity;
    weightedSum += scores.maintainabilityIndex * weights.maintainabilityIndex;
    weightedSum += scores.typeIssues * weights.typeIssues;
    weightedSum += scores.accessibilityIssues * weights.accessibilityIssues;
    weightedSum += scores.performanceIssues * weights.performanceIssues;
    weightedSum += scores.seoProblems * weights.seoProblems;
    weightedSum += scores.couplingDegree * weights.couplingDegree;
    weightedSum += scores.zombieCode * weights.zombieCode;
    weightedSum += scores.translationIssues * weights.translationIssues;
    weightedSum +=
      scores.componentFlowComplexity * weights.componentFlowComplexity;
    weightedSum +=
      scores.deduplicationOpportunities * weights.deduplicationOpportunities;
    weightedSum += scores.codeMetrics * weights.codeMetrics;
    weightedSum += scores.magicNumbers * weights.magicNumbers;

    return weightedSum;
  }

  /**
   * Calculate weighted contributions for each metric
   */
  private calculateWeightedContributions(
    scores: IndividualScores,
    weights: ScoringWeights
  ): Record<keyof IndividualScores, number> {
    return {
      circularDependencies:
        scores.circularDependencies * weights.circularDependencies,
      errorHandlingGaps: scores.errorHandlingGaps * weights.errorHandlingGaps,
      cyclomaticComplexity:
        scores.cyclomaticComplexity * weights.cyclomaticComplexity,
      cognitiveComplexity:
        scores.cognitiveComplexity * weights.cognitiveComplexity,
      maintainabilityIndex:
        scores.maintainabilityIndex * weights.maintainabilityIndex,
      typeIssues: scores.typeIssues * weights.typeIssues,
      accessibilityIssues:
        scores.accessibilityIssues * weights.accessibilityIssues,
      performanceIssues: scores.performanceIssues * weights.performanceIssues,
      seoProblems: scores.seoProblems * weights.seoProblems,
      couplingDegree: scores.couplingDegree * weights.couplingDegree,
      zombieCode: scores.zombieCode * weights.zombieCode,
      translationIssues: scores.translationIssues * weights.translationIssues,
      componentFlowComplexity:
        scores.componentFlowComplexity * weights.componentFlowComplexity,
      deduplicationOpportunities:
        scores.deduplicationOpportunities * weights.deduplicationOpportunities,
      codeMetrics: scores.codeMetrics * weights.codeMetrics,
      magicNumbers: scores.magicNumbers * weights.magicNumbers,
    };
  }

  /**
   * Apply multipliers based on critical conditions with file type awareness
   */
  private applyMultipliers(
    baseScore: number,
    scores: IndividualScores,
    context: MetricCalculationContext,
    fileType: keyof typeof FILE_TYPE_EXCLUSIONS
  ): { finalScore: number; appliedMultipliers: string[] } {
    let finalScore = baseScore;
    const appliedMultipliers: string[] = [];

    // Critical penalty multipliers
    if (scores.circularDependencies > 0) {
      finalScore *= this.multipliers.inCircularDependency;
      appliedMultipliers.push(
        `Circular Dependency Penalty (×${this.multipliers.inCircularDependency})`
      );
    }

    if (scores.errorHandlingGaps > 70) {
      // High error handling gaps
      finalScore *= this.multipliers.noErrorHandlingForRiskyOps;
      appliedMultipliers.push(
        `Critical Error Handling Gap (×${this.multipliers.noErrorHandlingForRiskyOps})`
      );
    }

    if (scores.typeIssues > 60) {
      // High type issues (likely has any types)
      finalScore *= this.multipliers.hasAnyType;
      appliedMultipliers.push(
        `Type Safety Issues (×${this.multipliers.hasAnyType})`
      );
    }

    // NEW: Critical SEO multiplier for pages
    if (fileType === "page" && scores.seoProblems > 60) {
      finalScore *= this.multipliers.criticalSeoMissing;
      appliedMultipliers.push(
        `Critical SEO Missing (×${this.multipliers.criticalSeoMissing})`
      );
    }

    // NEW: Critical accessibility multiplier
    if (scores.accessibilityIssues > 50) {
      finalScore *= this.multipliers.criticalAccessibilityMissing;
      appliedMultipliers.push(
        `Critical Accessibility Missing (×${this.multipliers.criticalAccessibilityMissing})`
      );
    }

    // Bonus multipliers for good practices
    if (scores.errorHandlingGaps < 20 && this.hasProperErrorHandling(context)) {
      finalScore *= this.multipliers.hasProperErrorHandling;
      appliedMultipliers.push(
        `Good Error Handling (×${this.multipliers.hasProperErrorHandling})`
      );
    }

    if (scores.typeIssues < 20 && this.hasGoodTypeAnnotations(context)) {
      finalScore *= this.multipliers.hasGoodTypeAnnotations;
      appliedMultipliers.push(
        `Good Type Annotations (×${this.multipliers.hasGoodTypeAnnotations})`
      );
    }

    if (scores.cyclomaticComplexity < 30 && scores.maintainabilityIndex < 20) {
      finalScore *= this.multipliers.lowComplexity;
      appliedMultipliers.push(
        `Low Complexity Bonus (×${this.multipliers.lowComplexity})`
      );
    }

    // NEW: SEO bonus for pages with good implementation
    if (
      fileType === "page" &&
      scores.seoProblems < 20 &&
      this.hasGoodSeoImplementation(context)
    ) {
      finalScore *= this.multipliers.goodSeoImplementation;
      appliedMultipliers.push(
        `Good SEO Implementation (×${this.multipliers.goodSeoImplementation})`
      );
    }

    // NEW: Accessibility bonus
    if (
      scores.accessibilityIssues < 15 &&
      this.hasGoodAccessibilityImplementation(context)
    ) {
      finalScore *= this.multipliers.goodAccessibilityImplementation;
      appliedMultipliers.push(
        `Good Accessibility Implementation (×${this.multipliers.goodAccessibilityImplementation})`
      );
    }

    // Ensure score doesn't exceed 100
    finalScore = Math.min(finalScore, 100);

    return { finalScore, appliedMultipliers };
  }

  /**
   * Check if component has proper error handling
   */
  private hasProperErrorHandling(context: MetricCalculationContext): boolean {
    if (!context.errorHandlingAnalysis) return false;

    const componentResult =
      context.errorHandlingAnalysis.componentResults[context.component.name];
    if (!componentResult) return false;

    // Has error boundaries or comprehensive try-catch coverage
    return (
      componentResult.errorBoundaries.length > 0 ||
      componentResult.tryCatchBlocks.length > 0 ||
      componentResult.errorStates.length > 0
    );
  }

  /**
   * Check if component has good type annotations
   */
  private hasGoodTypeAnnotations(context: MetricCalculationContext): boolean {
    if (!context.typeAnalysis) return false;

    const componentName = context.component.name;

    // Component has prop types and is not in the "without prop types" list
    return (
      !context.typeAnalysis.componentsWithoutPropTypes.includes(
        componentName
      ) &&
      context.component.props !== undefined &&
      context.component.props.length > 0
    );
  }

  /**
   * NEW: Check if component has good SEO implementation
   */
  private hasGoodSeoImplementation(context: MetricCalculationContext): boolean {
    if (!context.seoAnalysis) return false;

    const componentPath = context.component.fullPath;
    const pageMetaTags = context.seoAnalysis.metaTags.pages[componentPath];

    if (!pageMetaTags) return false;

    // Good SEO means: title, description, Open Graph, proper lengths
    return (
      pageMetaTags.title.present &&
      pageMetaTags.description.present &&
      pageMetaTags.openGraph.present &&
      pageMetaTags.title.length >= 30 &&
      pageMetaTags.title.length <= 60 &&
      pageMetaTags.description.length >= 120 &&
      pageMetaTags.description.length <= 160
    );
  }

  /**
   * NEW: Check if component has good accessibility implementation
   */
  private hasGoodAccessibilityImplementation(
    context: MetricCalculationContext
  ): boolean {
    if (!context.seoAnalysis) return false;

    const componentPath = context.component.fullPath;

    // Check for images with alt texts
    const images = context.seoAnalysis.imageOptimization.images.filter((img) =>
      img.usedInPages.includes(componentPath)
    );

    const imagesWithAlt = images.filter(
      (img) =>
        img.attributes.alt &&
        !img.issues.some((issue) => issue.type === "missing-alt")
    );

    // Good accessibility means: most images have alt text, no ARIA misuse
    const imageAltRatio =
      images.length > 0 ? imagesWithAlt.length / images.length : 1;
    const ariaIssues =
      context.seoAnalysis.semanticStructure.accessibility.aria.potentialMisuse
        .length;

    return imageAltRatio >= 0.8 && ariaIssues === 0;
  }

  /**
   * Get a breakdown of the scoring for debugging/analysis with file type info
   */
  getScoreBreakdown(result: ScoringResult): string {
    const breakdown: string[] = [];

    breakdown.push(
      `Final Score: ${result.finalScore}/100 (${result.fileType} file)`
    );
    breakdown.push("");

    if (result.excludedMetrics.length > 0) {
      breakdown.push("Excluded Metrics (file type specific):");
      result.excludedMetrics.forEach((metric) => {
        breakdown.push(
          `  • ${metric} (not applicable for ${result.fileType} files)`
        );
      });
      breakdown.push("");
    }

    if (Object.keys(result.appliedWeightAdjustments).length > 0) {
      breakdown.push("Applied Weight Adjustments:");
      Object.entries(result.appliedWeightAdjustments).forEach(
        ([metric, multiplier]) => {
          breakdown.push(`  • ${metric}: ×${multiplier}`);
        }
      );
      breakdown.push("");
    }

    breakdown.push("Individual Contributions:");

    // Sort contributions by impact
    const sortedContributions = Object.entries(result.weightedContributions)
      .sort(([, a], [, b]) => b - a)
      .filter(([, contribution]) => contribution > 0);

    for (const [metric, contribution] of sortedContributions) {
      const rawScore =
        result.individualScores[metric as keyof IndividualScores];
      breakdown.push(
        `  ${metric}: ${contribution.toFixed(2)} (raw: ${rawScore})`
      );
    }

    if (result.appliedMultipliers.length > 0) {
      breakdown.push("");
      breakdown.push("Applied Multipliers:");
      result.appliedMultipliers.forEach((multiplier) => {
        breakdown.push(`  • ${multiplier}`);
      });
    }

    return breakdown.join("\n");
  }
}
