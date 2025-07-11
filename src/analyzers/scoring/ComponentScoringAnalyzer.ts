/**
 * Updated component scoring analyzer with enhanced pattern detection
 * and support for new metrics (accessibility, performance)
 */

import {
  ComponentRelation,
  DependencyAnalysisDetailedResult,
  ErrorHandlingCompleteAnalysis,
  ComplexityAnalysisResult,
  TypeAnalysisResult,
  SEOAnalysisResult,
  TranslationAnalysisResult,
  ComponentSimilarity,
} from "../../types";

import {
  ScoringWeights,
  ScoringMultipliers,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_SCORING_MULTIPLIERS,
  SCORE_RANGES,
  getFileType,
} from "./ScoringCriteria";

import { MetricCalculationContext } from "./ScoringMetrics";
import { ScoringAggregator, ScoringResult } from "./ScoringAggregator";
import { GeneralAnalysisResult } from "../general/types/generalAnalyzer.types";
import { ComponentFlowAnalysisResult } from "../componentFlow/types";
import { ComponentFilter } from "../seo/utils/ComponentFilter";

export interface ScoredComponentRelation extends ComponentRelation {
  score: number;
}

export interface ComponentScoringOptions {
  weights?: ScoringWeights;
  multipliers?: ScoringMultipliers;
  includeScoreBreakdown?: boolean;
  minimumScore?: number;
  excludeFileTypes?: string[];
}

export interface AnalyzerResults {
  generalAnalysis?: GeneralAnalysisResult;
  dependencyAnalysis?: DependencyAnalysisDetailedResult;
  errorHandlingAnalysis?: ErrorHandlingCompleteAnalysis;
  complexityAnalysis?: ComplexityAnalysisResult;
  typeAnalysis?: TypeAnalysisResult;
  seoAnalysis?: SEOAnalysisResult;
  translationAnalysis?: TranslationAnalysisResult;
  componentFlowAnalysis?: ComponentFlowAnalysisResult;
  deduplicationAnalysis?: ComponentSimilarity[];
}

export interface ComponentScoringReport {
  topComponents: ScoredComponentRelation[];
  scoringStatistics: {
    totalComponents: number;
    averageScore: number;
    scoreDistribution: Record<keyof typeof SCORE_RANGES, number>;
    highestScore: number;
    lowestScore: number;
    fileTypeDistribution: Record<
      string,
      { count: number; averageScore: number }
    >;
  };
  categoryBreakdown: {
    criticalIssues: number;
    highPriorityIssues: number;
    mediumPriorityIssues: number;
    lowPriorityIssues: number;
    minimalIssues: number;
  };
  detailedResults?: Map<string, ScoringResult>;
  excludedComponents?: {
    constants: number;
    configs: number;
    types: number;
    total: number;
  };
}

export class ComponentScoringAnalyzer {
  private scoringAggregator: ScoringAggregator;
  private options: ComponentScoringOptions;

  constructor(options: ComponentScoringOptions = {}) {
    this.options = {
      weights: DEFAULT_SCORING_WEIGHTS,
      multipliers: DEFAULT_SCORING_MULTIPLIERS,
      includeScoreBreakdown: false,
      minimumScore: 0,
      excludeFileTypes: [],
      ...options,
    };

    this.scoringAggregator = new ScoringAggregator(
      this.options.weights,
      this.options.multipliers
    );
  }

  /**
   * Calculate top scoring (most problematic) components with component filtering
   */
  async calculateTopScoringComponents(
    components: ComponentRelation[],
    analyzerResults: AnalyzerResults,
    topCount: number = 20
  ): Promise<ScoredComponentRelation[]> {
    const report = await this.generateScoringReport(
      components,
      analyzerResults
    );

    return report.topComponents.slice(0, topCount);
  }

  /**
   * Generate a comprehensive scoring report with relative normalization
   */
  async generateScoringReport(
    components: ComponentRelation[],
    analyzerResults: AnalyzerResults
  ): Promise<ComponentScoringReport> {
    // Filter to only include actual React components
    const actualComponents = ComponentFilter.filterComponents(components);

    const rawScoredComponents: Array<{
      component: ComponentRelation;
      rawScore: number;
      scoringResult: ScoringResult;
    }> = [];
    const excludedComponents = {
      constants: 0,
      configs: 0,
      types: 0,
      total: 0,
    };

    // Count filtered out components
    const filteredOut = components.length - actualComponents.length;
    excludedComponents.total = filteredOut;

    // First pass: Calculate raw scores for all components
    for (const component of actualComponents) {
      const fileType = getFileType(component.name, component.fullPath);

      // Skip if file type is in exclusion list
      if (this.options.excludeFileTypes?.includes(fileType)) {
        excludedComponents[fileType as keyof typeof excludedComponents]++;
        excludedComponents.total++;
        continue;
      }

      const context: MetricCalculationContext = {
        component,
        allComponents: actualComponents,
        ...analyzerResults,
      };

      const scoringResult = this.scoringAggregator.calculateScore(context);

      // Only include components meeting minimum score threshold
      if (scoringResult.finalScore >= (this.options.minimumScore || 0)) {
        rawScoredComponents.push({
          component,
          rawScore: scoringResult.finalScore,
          scoringResult,
        });
      }
    }

    // Apply relative normalization
    const normalizedComponents =
      this.applyRelativeNormalization(rawScoredComponents);

    // Build final scored components with file type stats
    const fileTypeStats: Record<string, { count: number; totalScore: number }> =
      {};
    const detailedResults = new Map<string, ScoringResult>();

    const scoredComponents: ScoredComponentRelation[] =
      normalizedComponents.map(
        ({ component, normalizedScore, scoringResult }) => {
          const fileType = getFileType(component.name, component.fullPath);

          // Track file type statistics using normalized scores
          if (!fileTypeStats[fileType]) {
            fileTypeStats[fileType] = { count: 0, totalScore: 0 };
          }
          fileTypeStats[fileType].count++;
          fileTypeStats[fileType].totalScore += normalizedScore;

          if (this.options.includeScoreBreakdown) {
            detailedResults.set(component.name, {
              ...scoringResult,
              finalScore: normalizedScore, // Use normalized score in breakdown
            });
          }

          return {
            ...component,
            score: normalizedScore,
          };
        }
      );

    // Sort by normalized score (highest first - most problematic)
    scoredComponents.sort((a, b) => b.score - a.score);

    // Calculate statistics with normalized scores
    const statistics = this.calculateStatistics(
      scoredComponents,
      fileTypeStats
    );
    const categoryBreakdown = this.calculateCategoryBreakdown(scoredComponents);

    return {
      topComponents: scoredComponents,
      scoringStatistics: statistics,
      categoryBreakdown,
      detailedResults: this.options.includeScoreBreakdown
        ? detailedResults
        : undefined,
      excludedComponents,
    };
  }

  /**
   * Apply relative normalization to create meaningful comparative scores
   */
  private applyRelativeNormalization(
    rawScoredComponents: Array<{
      component: ComponentRelation;
      rawScore: number;
      scoringResult: ScoringResult;
    }>
  ): Array<{
    component: ComponentRelation;
    normalizedScore: number;
    scoringResult: ScoringResult;
  }> {
    if (rawScoredComponents.length === 0) {
      return [];
    }

    const rawScores = rawScoredComponents.map((item) => item.rawScore);
    const maxScore = Math.max(...rawScores);
    const minScore = Math.min(...rawScores);
    const scoreRange = maxScore - minScore;

    // Calculate percentiles for better distribution
    const sortedScores = [...rawScores].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedScores.length * 0.25);
    const q3Index = Math.floor(sortedScores.length * 0.75);
    const q1Score = sortedScores[q1Index];
    const q3Score = sortedScores[q3Index];

    return rawScoredComponents.map(({ component, rawScore, scoringResult }) => {
      let normalizedScore = 0;

      if (scoreRange > 0) {
        // Method 1: Min-max normalization to 0-100 scale
        const minMaxNormalized = ((rawScore - minScore) / scoreRange) * 100;

        // Method 2: Percentile-based normalization for better distribution
        let percentileScore = 0;
        if (rawScore <= q1Score) {
          // Bottom 25% -> 0-25 range
          percentileScore = (rawScore / q1Score) * 25;
        } else if (rawScore <= q3Score) {
          // Middle 50% -> 25-75 range
          percentileScore =
            25 + ((rawScore - q1Score) / (q3Score - q1Score)) * 50;
        } else {
          // Top 25% -> 75-100 range
          percentileScore =
            75 + ((rawScore - q3Score) / (maxScore - q3Score)) * 25;
        }

        // Blend the two approaches: 70% min-max, 30% percentile
        normalizedScore = minMaxNormalized * 0.7 + percentileScore * 0.3;

        // Apply logarithmic scaling for better spread in the upper range
        if (normalizedScore > 50) {
          const upperRange = normalizedScore - 50;
          const logScaled =
            50 + (upperRange * Math.log10(upperRange + 1)) / Math.log10(51);
          normalizedScore = Math.min(logScaled, 100);
        }
      } else {
        // All components have the same score - give them middle scores
        normalizedScore = 50;
      }

      return {
        component,
        normalizedScore: Math.round(normalizedScore * 100) / 100,
        scoringResult,
      };
    });
  }

  /**
   * Enhanced summary report that explains the normalization
   */
  generateSummaryReport(report: ComponentScoringReport): string {
    const summary: string[] = [];

    summary.push("Component Scoring Analysis Summary (Relative Scoring)");
    summary.push("=====================================================");
    summary.push("");

    summary.push(
      `Total Components Analyzed: ${report.scoringStatistics.totalComponents}`
    );
    summary.push(
      `Average Score: ${report.scoringStatistics.averageScore}/100 (normalized)`
    );
    summary.push(
      `Highest Score: ${report.scoringStatistics.highestScore}/100 (most problematic)`
    );
    summary.push(
      `Lowest Score: ${report.scoringStatistics.lowestScore}/100 (least problematic)`
    );
    summary.push("");

    summary.push(
      "📊 Scoring Method: Relative normalization within project context"
    );
    summary.push(
      "   • Scores are normalized to 0-100 based on component comparison"
    );
    summary.push(
      "   • Higher scores indicate more problematic components relative to your project"
    );
    summary.push(
      "   • A score of 80+ means this component is among the most complex in your codebase"
    );
    summary.push("");

    // File type distribution
    if (Object.keys(report.scoringStatistics.fileTypeDistribution).length > 0) {
      summary.push("Score by File Type (normalized):");
      Object.entries(report.scoringStatistics.fileTypeDistribution)
        .sort(([, a], [, b]) => b.averageScore - a.averageScore)
        .forEach(([fileType, stats]) => {
          summary.push(
            `  ${fileType}: ${stats.averageScore}/100 (${stats.count} files)`
          );
        });
      summary.push("");
    }

    // Excluded components
    if (report.excludedComponents && report.excludedComponents.total > 0) {
      summary.push("Excluded Components:");
      if (report.excludedComponents.constants > 0) {
        summary.push(
          `  Constants files: ${report.excludedComponents.constants}`
        );
      }
      if (report.excludedComponents.configs > 0) {
        summary.push(`  Config files: ${report.excludedComponents.configs}`);
      }
      if (report.excludedComponents.types > 0) {
        summary.push(`  Type files: ${report.excludedComponents.types}`);
      }
      summary.push(`  Total excluded: ${report.excludedComponents.total}`);
      summary.push("");
    }

    summary.push("Score Distribution (relative to your project):");
    summary.push(
      `  Critical (80-100): ${report.scoringStatistics.scoreDistribution.CRITICAL} components - Highest complexity in your project`
    );
    summary.push(
      `  High (60-79): ${report.scoringStatistics.scoreDistribution.HIGH} components - Above average complexity`
    );
    summary.push(
      `  Medium (40-59): ${report.scoringStatistics.scoreDistribution.MEDIUM} components - Average complexity`
    );
    summary.push(
      `  Low (20-39): ${report.scoringStatistics.scoreDistribution.LOW} components - Below average complexity`
    );
    summary.push(
      `  Minimal (0-19): ${report.scoringStatistics.scoreDistribution.MINIMAL} components - Lowest complexity in your project`
    );
    summary.push("");

    summary.push(
      "Top 10 Most Problematic Components (relative to your project):"
    );
    const top10 = report.topComponents.slice(0, 10);
    top10.forEach((component, index) => {
      const fileType = getFileType(component.name, component.fullPath);
      summary.push(
        `  ${index + 1}. ${component.name} (${
          component.score
        }/100) [${fileType}]`
      );
    });

    return summary.join("\n");
  }

  /**
   * Get detailed scoring breakdown for a specific component with filtering
   */
  async getComponentScoreBreakdown(
    component: ComponentRelation,
    analyzerResults: AnalyzerResults
  ): Promise<string> {
    // Check if this is an actual component
    if (!ComponentFilter.isActualComponent(component)) {
      return `Component "${component.name}" is not a React component (utility function, hook, or handler) and was excluded from scoring.`;
    }

    const context: MetricCalculationContext = {
      component,
      allComponents: [component], // Minimal context for single component analysis
      ...analyzerResults,
    };

    const scoringResult = this.scoringAggregator.calculateScore(context);
    return this.scoringAggregator.getScoreBreakdown(scoringResult);
  }

  /**
   * Calculate scoring statistics with file type breakdown
   */
  private calculateStatistics(
    scoredComponents: ScoredComponentRelation[],
    fileTypeStats: Record<string, { count: number; totalScore: number }>
  ): ComponentScoringReport["scoringStatistics"] {
    if (scoredComponents.length === 0) {
      return {
        totalComponents: 0,
        averageScore: 0,
        scoreDistribution: {
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          MINIMAL: 0,
        },
        highestScore: 0,
        lowestScore: 0,
        fileTypeDistribution: {},
      };
    }

    const scores = scoredComponents.map((c) => c.score);
    const totalComponents = scoredComponents.length;
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / totalComponents;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Calculate score distribution
    const scoreDistribution = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      MINIMAL: 0,
    };

    for (const component of scoredComponents) {
      const score = component.score;

      if (score >= SCORE_RANGES.CRITICAL.min) {
        scoreDistribution.CRITICAL++;
      } else if (score >= SCORE_RANGES.HIGH.min) {
        scoreDistribution.HIGH++;
      } else if (score >= SCORE_RANGES.MEDIUM.min) {
        scoreDistribution.MEDIUM++;
      } else if (score >= SCORE_RANGES.LOW.min) {
        scoreDistribution.LOW++;
      } else {
        scoreDistribution.MINIMAL++;
      }
    }

    // Calculate file type distribution
    const fileTypeDistribution: Record<
      string,
      { count: number; averageScore: number }
    > = {};
    for (const [fileType, stats] of Object.entries(fileTypeStats)) {
      fileTypeDistribution[fileType] = {
        count: stats.count,
        averageScore: Math.round((stats.totalScore / stats.count) * 100) / 100,
      };
    }

    return {
      totalComponents,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreDistribution,
      highestScore: Math.round(highestScore * 100) / 100,
      lowestScore: Math.round(lowestScore * 100) / 100,
      fileTypeDistribution,
    };
  }

  /**
   * Calculate category breakdown for reporting
   */
  private calculateCategoryBreakdown(
    scoredComponents: ScoredComponentRelation[]
  ): ComponentScoringReport["categoryBreakdown"] {
    const breakdown = {
      criticalIssues: 0,
      highPriorityIssues: 0,
      mediumPriorityIssues: 0,
      lowPriorityIssues: 0,
      minimalIssues: 0,
    };

    for (const component of scoredComponents) {
      const score = component.score;

      if (score >= SCORE_RANGES.CRITICAL.min) {
        breakdown.criticalIssues++;
      } else if (score >= SCORE_RANGES.HIGH.min) {
        breakdown.highPriorityIssues++;
      } else if (score >= SCORE_RANGES.MEDIUM.min) {
        breakdown.mediumPriorityIssues++;
      } else if (score >= SCORE_RANGES.LOW.min) {
        breakdown.lowPriorityIssues++;
      } else {
        breakdown.minimalIssues++;
      }
    }

    return breakdown;
  }

  /**
   * Filter components by score range
   */
  filterComponentsByScoreRange(
    scoredComponents: ScoredComponentRelation[],
    range: keyof typeof SCORE_RANGES
  ): ScoredComponentRelation[] {
    const scoreRange = SCORE_RANGES[range];
    return scoredComponents.filter(
      (component) =>
        component.score >= scoreRange.min && component.score <= scoreRange.max
    );
  }

  /**
   * Get components with specific problematic patterns - ENHANCED
   */
  getComponentsWithPattern(
    scoredComponents: ScoredComponentRelation[],
    analyzerResults: AnalyzerResults,
    pattern:
      | "circular-dependencies"
      | "missing-error-handling"
      | "high-complexity"
      | "type-issues"
      | "seo-issues"
      | "accessibility-issues"
      | "performance-issues"
  ): ScoredComponentRelation[] {
    return scoredComponents.filter((component) => {
      switch (pattern) {
        case "circular-dependencies":
          return this.hasCircularDependencies(component, analyzerResults);

        case "missing-error-handling":
          return this.hasMissingErrorHandling(component, analyzerResults);

        case "high-complexity":
          return this.hasHighComplexity(component, analyzerResults);

        case "type-issues":
          return this.hasTypeIssues(component, analyzerResults);

        case "seo-issues":
          return this.hasSEOIssues(component, analyzerResults);

        case "accessibility-issues":
          return this.hasAccessibilityIssues(component, analyzerResults);

        case "performance-issues":
          return this.hasPerformanceIssues(component, analyzerResults);

        default:
          return false;
      }
    });
  }

  /**
   * Check if component has circular dependencies
   */
  private hasCircularDependencies(
    component: ComponentRelation,
    results: AnalyzerResults
  ): boolean {
    if (!results.dependencyAnalysis?.circularDependencies) return false;

    return results.dependencyAnalysis.circularDependencies.circularGroups.some(
      (group) => group.components.includes(component.fullPath)
    );
  }

  /**
   * Check if component has missing error handling
   */
  private hasMissingErrorHandling(
    component: ComponentRelation,
    results: AnalyzerResults
  ): boolean {
    if (!results.errorHandlingAnalysis) return false;

    const componentResult =
      results.errorHandlingAnalysis.componentResults[component.name];
    if (!componentResult) return false;

    return componentResult.functionErrorHandling.some(
      (func) =>
        func.riskAnalysis.shouldHaveErrorHandling && !func.hasErrorHandling
    );
  }

  /**
   * Check if component has high complexity
   */
  private hasHighComplexity(
    component: ComponentRelation,
    results: AnalyzerResults
  ): boolean {
    if (!results.complexityAnalysis) return false;

    const cyclomaticComplexity =
      results.complexityAnalysis.cyclomaticComplexity[component.name] || 0;
    const cognitiveComplexity =
      results.complexityAnalysis.cognitiveComplexity[component.name] || 0;

    return cyclomaticComplexity > 10 || cognitiveComplexity > 15;
  }

  /**
   * Check if component has type issues
   */
  private hasTypeIssues(
    component: ComponentRelation,
    results: AnalyzerResults
  ): boolean {
    if (!results.typeAnalysis) return false;

    return (
      results.typeAnalysis.componentsWithoutPropTypes.includes(
        component.name
      ) ||
      results.typeAnalysis.complexTypes.some(
        (ct) => ct.fileName === component.fullPath
      )
    );
  }

  /**
   * NEW: Check if component has SEO issues
   */
  private hasSEOIssues(
    component: ComponentRelation,
    results: AnalyzerResults
  ): boolean {
    if (!results.seoAnalysis) return false;

    const componentPath = component.fullPath;

    // Check if it's a page with SEO issues
    const isPage =
      componentPath.includes("/pages/") || componentPath.includes("/app/");
    if (isPage) {
      const pageMetaTags = results.seoAnalysis.metaTags.pages[componentPath];
      if (
        !pageMetaTags ||
        !pageMetaTags.title.present ||
        !pageMetaTags.description.present
      ) {
        return true;
      }
    }

    // Check for heading hierarchy issues
    const headingIssues =
      results.seoAnalysis.semanticStructure.headingHierarchy.hierarchyIssues.filter(
        (issue) => issue.path === componentPath
      );

    return headingIssues.length > 0;
  }

  /**
   * NEW: Check if component has accessibility issues
   */
  private hasAccessibilityIssues(
    component: ComponentRelation,
    results: AnalyzerResults
  ): boolean {
    if (!results.seoAnalysis) return false;

    const componentPath = component.fullPath;

    // Check for images without alt text
    const imageIssues = results.seoAnalysis.imageOptimization.images.filter(
      (img) => img.usedInPages.includes(componentPath)
    );

    const hasImageAltIssues = imageIssues.some(
      (img) =>
        !img.attributes.alt ||
        img.issues.some((issue) => issue.type === "missing-alt")
    );

    // Check for ARIA issues
    const ariaIssues =
      results.seoAnalysis.semanticStructure.accessibility.aria.potentialMisuse
        .length > 0;

    // Check for form label issues
    const formIssues =
      results.seoAnalysis.semanticStructure.accessibility.forms.inputs;
    const hasFormIssues =
      formIssues.total > 0 &&
      (formIssues.missingLabels > 0 || formIssues.missingAriaLabels > 0);

    return hasImageAltIssues || ariaIssues || hasFormIssues;
  }

  /**
   * NEW: Check if component has performance issues
   */
  private hasPerformanceIssues(
    component: ComponentRelation,
    results: AnalyzerResults
  ): boolean {
    if (!results.seoAnalysis?.performance) return false;

    const componentPath = component.fullPath;

    // Check for missing lazy loading
    const lazyLoadingAnalysis = results.seoAnalysis.performance.lazyLoading;
    if (lazyLoadingAnalysis) {
      const shouldBeLazyLoaded = lazyLoadingAnalysis.components.some(
        (comp) =>
          comp.path === componentPath &&
          comp.shouldBeLazyLoaded &&
          !comp.isLazyLoaded
      );

      if (shouldBeLazyLoaded) return true;
    }

    // Check for heavy imports
    const bundleAnalysis = results.seoAnalysis.performance.bundleOptimization;
    if (bundleAnalysis) {
      const hasHeavyImports = bundleAnalysis.heavyImports.some(
        (imp) =>
          imp.importedBy.includes(componentPath) &&
          imp.potentialImpact === "high" &&
          !imp.isDynamic
      );

      if (hasHeavyImports) return true;
    }

    // Check for Core Web Vitals issues
    const coreWebVitals = results.seoAnalysis.performance.coreWebVitals;
    if (coreWebVitals) {
      const hasVitalsIssues = coreWebVitals.potentialIssues.some(
        (issue) => issue.location === componentPath && issue.severity === "high"
      );

      if (hasVitalsIssues) return true;
    }

    return false;
  }

  /**
   * Get components by file type
   */
  getComponentsByFileType(
    scoredComponents: ScoredComponentRelation[],
    fileType: string
  ): ScoredComponentRelation[] {
    return scoredComponents.filter(
      (component) =>
        getFileType(component.name, component.fullPath) === fileType
    );
  }
}
