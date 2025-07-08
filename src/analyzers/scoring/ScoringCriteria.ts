/**
 * Scoring criteria and weights for component analysis
 * Defines how different metrics contribute to the overall problematic score
 * Focus on "easily overlooked" issues that developers miss
 */

export interface ScoringWeights {
  // High impact factors - "Hidden" issues developers often miss (60% total)
  seoProblems: number;
  errorHandlingGaps: number;
  typeIssues: number;
  accessibilityIssues: number;
  performanceIssues: number;
  circularDependencies: number;

  // Medium impact factors - Architectural issues (30% total)
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  zombieCode: number;
  couplingDegree: number;
  translationIssues: number;

  // Lower impact factors - More obvious issues (10% total)
  componentFlowComplexity: number;
  deduplicationOpportunities: number;
  codeMetrics: number;
  magicNumbers: number;
}

export interface ScoringThresholds {
  // Complexity thresholds
  highCyclomaticComplexity: number;
  highCognitiveComplexity: number;
  lowMaintainabilityIndex: number;

  // Coupling thresholds
  highCouplingDegree: number;

  // Code quality thresholds (less important now)
  lowCodeToCommentRatio: number;
  highMagicNumberCount: number;

  // Type analysis thresholds (more important)
  highAnyUsage: number;
  highComplexTypeCount: number;

  // Component flow thresholds
  highConditionalRenderCount: number;
  deepComponentNesting: number;

  // SEO thresholds (much more important)
  criticalSeoIssues: number;
  missingSeoMeta: number;
  poorImageOptimization: number;

  // Accessibility thresholds (new category)
  missingAltTexts: number;
  missingAriaLabels: number;
  poorSemanticStructure: number;

  // Performance thresholds (new category)
  largeBundleSize: number;
  missingLazyLoading: number;
  blockingResources: number;

  // Translation thresholds
  highMissingTranslations: number;

  // Deduplication thresholds
  highSimilarityScore: number;
}

export interface ScoringMultipliers {
  // Critical penalty multipliers
  inCircularDependency: number;
  noErrorHandlingForRiskyOps: number;
  hasAnyType: number;
  criticalSeoMissing: number;
  criticalAccessibilityMissing: number;

  // Bonus multipliers for good practices
  hasProperErrorHandling: number;
  hasGoodTypeAnnotations: number;
  lowComplexity: number;
  goodSeoImplementation: number;
  goodAccessibilityImplementation: number;
}

/**
 * Rebalanced scoring weights focusing on "hidden" issues
 * Higher weights = more impact on final score
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  // High impact factors - Hidden issues developers miss (60% total weight)
  seoProblems: 0.2, // SEO often completely overlooked
  errorHandlingGaps: 0.15, // Critical but often skipped
  typeIssues: 0.15, // Type safety gaps are subtle
  accessibilityIssues: 0.05, // Often forgotten in development
  performanceIssues: 0.03, // Bundle optimization missed
  circularDependencies: 0.02, // Rare but critical when they occur

  // Medium impact factors - Architectural issues (30% total weight)
  cyclomaticComplexity: 0.08, // Reduced from 0.10
  cognitiveComplexity: 0.06, // Reduced from 0.10
  maintainabilityIndex: 0.05, // Keep same
  zombieCode: 0.04, // Reduced from 0.06
  couplingDegree: 0.04, // Reduced from 0.08
  translationIssues: 0.03, // Reduced from 0.06

  // Lower impact factors - More obvious issues (10% total weight)
  componentFlowComplexity: 0.03, // Keep same
  deduplicationOpportunities: 0.03, // Keep same
  codeMetrics: 0.02, // Reduced from 0.04
  magicNumbers: 0.02, // Reduced from 0.05 - too obvious
};

/**
 * Updated thresholds with new categories
 */
export const DEFAULT_SCORING_THRESHOLDS: ScoringThresholds = {
  // Complexity thresholds
  highCyclomaticComplexity: 10,
  highCognitiveComplexity: 15,
  lowMaintainabilityIndex: 40,

  // Coupling thresholds
  highCouplingDegree: 8,

  // Code quality thresholds (less important now)
  lowCodeToCommentRatio: 0.1,
  highMagicNumberCount: 10, // Increased threshold - be less sensitive

  // Type analysis thresholds (more important)
  highAnyUsage: 2, // Lowered threshold - be more sensitive
  highComplexTypeCount: 3, // Lowered threshold - be more sensitive

  // Component flow thresholds
  highConditionalRenderCount: 5,
  deepComponentNesting: 4,

  // SEO thresholds (much more important)
  criticalSeoIssues: 2, // Lowered - be more sensitive
  missingSeoMeta: 1, // New - even one missing meta tag is problematic
  poorImageOptimization: 3, // New - multiple unoptimized images

  // Accessibility thresholds (new category)
  missingAltTexts: 2, // New - images without alt text
  missingAriaLabels: 3, // New - interactive elements without ARIA
  poorSemanticStructure: 2, // New - missing semantic HTML

  // Performance thresholds (new category)
  largeBundleSize: 500, // New - KB threshold for large components
  missingLazyLoading: 2, // New - components that should be lazy loaded
  blockingResources: 3, // New - synchronous imports in pages

  // Translation thresholds
  highMissingTranslations: 10,

  // Deduplication thresholds
  highSimilarityScore: 0.8,
};

/**
 * Updated multipliers with new categories
 */
export const DEFAULT_SCORING_MULTIPLIERS: ScoringMultipliers = {
  // Critical penalty multipliers
  inCircularDependency: 1.8, // Increased - very serious
  noErrorHandlingForRiskyOps: 1.6, // Increased - very dangerous
  hasAnyType: 1.4, // Increased - type safety critical
  criticalSeoMissing: 1.5, // New - missing title/description
  criticalAccessibilityMissing: 1.3, // New - missing alt text on images

  // Bonus multipliers for good practices (reduces score)
  hasProperErrorHandling: 0.85, // Better bonus
  hasGoodTypeAnnotations: 0.9, // Better bonus
  lowComplexity: 0.9, // Keep same
  goodSeoImplementation: 0.85, // New - proper meta tags and structure
  goodAccessibilityImplementation: 0.88, // New - proper ARIA and semantic HTML
};

/**
 * File type specific exclusions and weight adjustments
 */
export const FILE_TYPE_EXCLUSIONS = {
  constants: {
    // Exclude metrics that are expected in constants files
    excludeMetrics: [
      "magicNumbers",
      "codeMetrics",
      "deduplicationOpportunities",
    ] as const,
    // Reduce weights for metrics that are less relevant
    reduceWeights: {
      typeIssues: 0.3, // Constants don't need complex prop types
      componentFlowComplexity: 0.1, // Constants have no flow
      translationIssues: 0.1, // Constants aren't translated
    },
  },
  config: {
    excludeMetrics: [
      "magicNumbers",
      "componentFlowComplexity",
      "translationIssues",
    ] as const,
    reduceWeights: {
      typeIssues: 0.5,
      codeMetrics: 0.3,
    },
  },
  types: {
    excludeMetrics: [
      "componentFlowComplexity",
      "seoProblems",
      "accessibilityIssues",
      "performanceIssues",
    ] as const,
    increaseWeights: {
      typeIssues: 2.0, // Type files should have excellent type definitions
    },
  },
  utility: {
    increaseWeights: {
      errorHandlingGaps: 1.4, // Utilities should handle errors well
      typeIssues: 1.3, // Utilities should be strongly typed
    },
  },
  component: {
    increaseWeights: {
      seoProblems: 1.5, // Components care more about SEO
      accessibilityIssues: 1.4, // Components should be accessible
      typeIssues: 1.2, // Props should be well-typed
    },
  },
  hook: {
    increaseWeights: {
      errorHandlingGaps: 1.3,
      typeIssues: 1.2,
    },
    reduceWeights: {
      couplingDegree: 0.8, // Hooks naturally have dependencies
      seoProblems: 0.1, // Hooks don't directly affect SEO
      accessibilityIssues: 0.1, // Hooks don't directly affect accessibility
    },
  },
  page: {
    increaseWeights: {
      seoProblems: 2.5, // Pages are critical for SEO
      accessibilityIssues: 1.8, // Pages should be accessible
      performanceIssues: 1.5, // Pages should be optimized
      translationIssues: 1.5, // Pages need proper i18n
    },
  },
} as const;

/**
 * Score ranges for categorizing issues
 */
export const SCORE_RANGES = {
  CRITICAL: { min: 80, max: 100 },
  HIGH: { min: 60, max: 79 },
  MEDIUM: { min: 40, max: 59 },
  LOW: { min: 20, max: 39 },
  MINIMAL: { min: 0, max: 19 },
} as const;

/**
 * Enhanced file type detection with more specific categorization
 */
export function getFileType(
  componentName: string,
  fullPath: string
): keyof typeof FILE_TYPE_EXCLUSIONS {
  const fileName = componentName.toLowerCase();
  const path = fullPath.toLowerCase();

  // Check for constants/configuration files
  if (
    fileName.includes("constant") ||
    fileName.includes("config") ||
    path.includes("/constants/") ||
    path.includes("/config/") ||
    (fileName === "index" && path.includes("/constants/"))
  ) {
    return "constants";
  }

  // Check for configuration files
  if (
    fileName.includes(".config") ||
    fileName.includes("configuration") ||
    path.includes("config.") ||
    fileName.endsWith("rc")
  ) {
    return "config";
  }

  // Check for type definition files
  if (
    fileName.includes(".types") ||
    fileName.includes(".type") ||
    path.includes("/types/") ||
    fileName.includes("interface") ||
    fileName.includes("schema")
  ) {
    return "types";
  }

  // Check for pages (higher priority than components)
  if (
    path.includes("/pages/") ||
    (path.includes("/app/") && path.includes("page."))
  ) {
    return "page";
  }

  // Check for hooks
  if (fileName.startsWith("use") && fileName.length > 3) {
    return "hook";
  }

  // Check for utilities
  if (
    path.includes("/utils/") ||
    path.includes("/helpers/") ||
    path.includes("/lib/") ||
    fileName.includes("util")
  ) {
    return "utility";
  }

  // Default to component
  return "component";
}
