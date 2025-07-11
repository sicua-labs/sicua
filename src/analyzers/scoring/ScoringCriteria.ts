/**
 * Scoring criteria and weights for component analysis
 * Defines how different metrics contribute to the overall problematic score
 * Focus on "easily overlooked" issues that developers miss
 */

export interface ScoringWeights {
  // Architectural complexity metrics
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  couplingDegree: number;
  maintainabilityIndex: number;
  reactComplexity: number; // NEW
  containerComplexity: number; // NEW

  // Code quality issues
  errorHandlingGaps: number;
  typeIssues: number;
  componentFlowComplexity: number;
  zombieCode: number;
  circularDependencies: number;

  // Surface-level issues
  translationIssues: number;
  seoProblems: number;
  accessibilityIssues: number;
  performanceIssues: number;
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
 * Rebalanced scoring weights focusing on architectural and maintainability issues
 * that actually make components problematic in real Next.js/React projects
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  // High impact factors - Architectural complexity (50% total weight)
  cyclomaticComplexity: 0.12, // Reduced to make room for new metrics
  cognitiveComplexity: 0.1, // Reduced to make room for new metrics
  couplingDegree: 0.12, // Keep high - coupling is critical
  maintainabilityIndex: 0.1, // Keep high - direct maintainability measure
  reactComplexity: 0.08, // NEW - React-specific complexity patterns
  containerComplexity: 0.08, // NEW - Container component complexity

  // Medium impact factors - Code quality issues (35% total weight)
  errorHandlingGaps: 0.12, // Keep high - critical for reliability
  typeIssues: 0.08, // Reduced but still important
  componentFlowComplexity: 0.08, // Keep same - complex rendering logic
  zombieCode: 0.04, // Keep same - waste but not critical
  circularDependencies: 0.03, // Keep same - rare but critical

  // Lower impact factors - Surface-level issues (15% total weight)
  translationIssues: 0.04, // Keep same
  seoProblems: 0.03, // Significantly reduced
  accessibilityIssues: 0.03, // Reduced but still important
  performanceIssues: 0.02, // Keep same
  deduplicationOpportunities: 0.02, // Keep same
  codeMetrics: 0.01, // Reduced - surface-level
  magicNumbers: 0.01, // Reduced - usually obvious
};

/**
 * Updated thresholds focusing on architectural complexity
 */
export const DEFAULT_SCORING_THRESHOLDS: ScoringThresholds = {
  // Complexity thresholds (more sensitive)
  highCyclomaticComplexity: 8, // Lowered - be more sensitive
  highCognitiveComplexity: 12, // Lowered - cognitive load matters
  lowMaintainabilityIndex: 50, // Increased - higher bar for maintainability

  // Coupling thresholds (more sensitive)
  highCouplingDegree: 0.85, // Adjusted for new coupling formula

  // Code quality thresholds
  lowCodeToCommentRatio: 0.1,
  highMagicNumberCount: 15, // Increased - be less sensitive

  // Type analysis thresholds (more sensitive)
  highAnyUsage: 1, // Lowered - any usage of 'any' is problematic
  highComplexTypeCount: 2, // Lowered - complex types indicate over-engineering

  // Component flow thresholds (more sensitive)
  highConditionalRenderCount: 4, // Lowered - conditional rendering complexity
  deepComponentNesting: 3, // Lowered - deep nesting is hard to follow

  // SEO thresholds (less sensitive)
  criticalSeoIssues: 3, // Increased - don't flag minor SEO issues
  missingSeoMeta: 2, // Increased - some pages don't need all meta
  poorImageOptimization: 5, // Increased

  // Accessibility thresholds (less sensitive)
  missingAltTexts: 3, // Increased
  missingAriaLabels: 4, // Increased
  poorSemanticStructure: 3, // Increased

  // Performance thresholds
  largeBundleSize: 500,
  missingLazyLoading: 3,
  blockingResources: 4,

  // Translation thresholds (less sensitive)
  highMissingTranslations: 15, // Increased

  // Deduplication thresholds
  highSimilarityScore: 0.8,
};

/**
 * Updated scoring multipliers with focus on architectural issues
 */
export const DEFAULT_SCORING_MULTIPLIERS: ScoringMultipliers = {
  // Critical architectural penalties
  inCircularDependency: 2.0, // Increased - breaks builds
  noErrorHandlingForRiskyOps: 1.8, // Increased - causes runtime failures
  hasAnyType: 1.2, // Reduced - common in migration scenarios

  // Reduced SEO/accessibility penalties for pages
  criticalSeoMissing: 1.1, // Significantly reduced - expected in some page types
  criticalAccessibilityMissing: 1.2, // Slightly reduced

  // Enhanced bonuses for good architecture
  hasProperErrorHandling: 0.8, // Better bonus for good practices
  hasGoodTypeAnnotations: 0.85, // Better bonus
  lowComplexity: 0.85, // Better bonus for simple, clean code
  goodSeoImplementation: 0.95, // Minimal bonus - not architecture
  goodAccessibilityImplementation: 0.92, // Minimal bonus
};

/**
 * Updated file type exclusions with better page component handling
 */
export const FILE_TYPE_EXCLUSIONS = {
  constants: {
    excludeMetrics: [
      "magicNumbers",
      "codeMetrics",
      "deduplicationOpportunities",
      "componentFlowComplexity",
      "seoProblems",
      "accessibilityIssues",
    ] as const,
    reduceWeights: {
      typeIssues: 0.3,
      translationIssues: 0.1,
    },
  },
  config: {
    excludeMetrics: [
      "magicNumbers",
      "componentFlowComplexity",
      "translationIssues",
      "seoProblems",
      "accessibilityIssues",
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
      "errorHandlingGaps",
    ] as const,
    increaseWeights: {
      typeIssues: 2.5, // Type files should have excellent types
    },
  },
  utility: {
    increaseWeights: {
      errorHandlingGaps: 1.5, // Utilities should handle errors well
      typeIssues: 1.4, // Utilities should be strongly typed
      cyclomaticComplexity: 1.2, // Utilities should be simple
    },
    reduceWeights: {
      seoProblems: 0.1, // Utilities don't affect SEO
      accessibilityIssues: 0.1,
    },
  },
  component: {
    increaseWeights: {
      cyclomaticComplexity: 1.3, // Components should be simple
      cognitiveComplexity: 1.3,
      couplingDegree: 1.2, // Components should be loosely coupled
      componentFlowComplexity: 1.4, // Complex rendering is problematic
    },
    reduceWeights: {
      seoProblems: 0.3, // Most components don't handle SEO directly
    },
  },
  hook: {
    increaseWeights: {
      errorHandlingGaps: 1.4, // Hooks should handle edge cases
      typeIssues: 1.3, // Hooks should be well-typed
      cyclomaticComplexity: 1.2, // Hooks should be simple
    },
    reduceWeights: {
      couplingDegree: 0.7, // Hooks naturally have dependencies
      seoProblems: 0.1,
      accessibilityIssues: 0.1,
    },
  },
  page: {
    // Special handling for pages - distinguish simple from complex
    increaseWeights: {
      cyclomaticComplexity: 1.8, // Pages should be simple containers
      cognitiveComplexity: 1.8,
      couplingDegree: 1.5, // Pages shouldn't be highly coupled
      componentFlowComplexity: 1.6, // Complex page logic is problematic
      errorHandlingGaps: 1.3, // Pages should handle errors gracefully
    },
    reduceWeights: {
      seoProblems: 0.2, // Pages naturally have SEO - don't over-penalize
      accessibilityIssues: 0.4, // Important but not architecture-breaking
      translationIssues: 0.8, // Reduced penalty for pages
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
