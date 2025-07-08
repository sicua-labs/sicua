/**
 * Updated individual metric calculation functions for component scoring
 * Focus on "easily overlooked" issues that developers miss
 * Each function returns a score from 0-100 where higher = more problematic
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
import { ComponentFlowAnalysisResult } from "../componentFlow/types";
import { GeneralAnalysisResult } from "../general/types/generalAnalyzer.types";
import { DEFAULT_SCORING_THRESHOLDS } from "./ScoringCriteria";

export interface MetricCalculationContext {
  component: ComponentRelation;
  allComponents: ComponentRelation[];
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

/**
 * Calculate circular dependency score
 * Returns 100 if component is in circular dependency, 0 otherwise
 */
export function calculateCircularDependencyScore(
  context: MetricCalculationContext
): number {
  if (!context.dependencyAnalysis?.circularDependencies) return 0;

  const { circularGroups } = context.dependencyAnalysis.circularDependencies;
  const componentPath = context.component.fullPath;

  for (const group of circularGroups) {
    if (group.components.some((comp) => comp === componentPath)) {
      // More critical if it's a larger circular group or marked as critical
      const severityMultiplier = group.isCritical ? 1.0 : 0.8;
      const sizeMultiplier = Math.min(group.size / 5, 1.0);
      return Math.round(100 * severityMultiplier * sizeMultiplier);
    }
  }

  return 0;
}

/**
 * Calculate error handling gaps score - ENHANCED
 * Higher score for components with risky operations but no error handling
 */
export function calculateErrorHandlingScore(
  context: MetricCalculationContext
): number {
  if (!context.errorHandlingAnalysis) return 0;

  const componentName = context.component.name;
  const componentResult =
    context.errorHandlingAnalysis.componentResults[componentName];

  if (!componentResult) return 0;

  let score = 0;
  let totalRiskyFunctions = 0;
  let functionsWithProperHandling = 0;
  let highRiskFunctions = 0;

  // Analyze function-level error handling with enhanced risk detection
  for (const funcHandling of componentResult.functionErrorHandling) {
    if (funcHandling.riskAnalysis.shouldHaveErrorHandling) {
      totalRiskyFunctions++;

      // Count high-risk functions (async operations, network calls, etc.)
      const riskIndicators = funcHandling.riskAnalysis.riskIndicators;
      if (
        riskIndicators.hasAsyncOperations ||
        riskIndicators.hasNetworkCalls ||
        riskIndicators.hasFileOperations ||
        riskIndicators.hasDatabaseOperations
      ) {
        highRiskFunctions++;
      }

      if (funcHandling.hasErrorHandling) {
        functionsWithProperHandling++;
      } else {
        // Higher penalty for high-risk operations without error handling
        const riskMultiplier =
          riskIndicators.hasAsyncOperations || riskIndicators.hasNetworkCalls
            ? 2.0
            : 1.0;
        score += funcHandling.riskAnalysis.riskScore * 25 * riskMultiplier;
      }
    }
  }

  // Additional penalties for missing error boundaries in components with fallback elements
  if (
    componentResult.fallbackElements.length > 0 &&
    componentResult.errorBoundaries.length === 0
  ) {
    score += 40; // Increased penalty
  }

  // Higher penalty for high-risk functions without any error handling
  if (highRiskFunctions > 0 && functionsWithProperHandling === 0) {
    score += 50; // Critical penalty for async/network operations without error handling
  }

  // Calculate percentage of risky functions without error handling
  if (totalRiskyFunctions > 0) {
    const uncoveredPercentage =
      (totalRiskyFunctions - functionsWithProperHandling) / totalRiskyFunctions;
    score += uncoveredPercentage * 60; // Increased from 50
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Calculate complexity score based on cyclomatic and cognitive complexity
 */
export function calculateComplexityScore(
  context: MetricCalculationContext
): number {
  if (!context.complexityAnalysis) return 0;

  const componentName = context.component.name;
  const cyclomaticComplexity =
    context.complexityAnalysis.cyclomaticComplexity[componentName] || 0;
  const cognitiveComplexity =
    context.complexityAnalysis.cognitiveComplexity[componentName] || 0;

  // Normalize complexity scores
  const cyclomaticScore = Math.min(
    (cyclomaticComplexity /
      DEFAULT_SCORING_THRESHOLDS.highCyclomaticComplexity) *
      50,
    50
  );
  const cognitiveScore = Math.min(
    (cognitiveComplexity / DEFAULT_SCORING_THRESHOLDS.highCognitiveComplexity) *
      50,
    50
  );

  return Math.round(cyclomaticScore + cognitiveScore);
}

/**
 * Calculate maintainability index score (inverted - lower maintainability = higher score)
 */
export function calculateMaintainabilityScore(
  context: MetricCalculationContext
): number {
  if (!context.complexityAnalysis) return 0;

  const componentName = context.component.name;
  const maintainabilityIndex =
    context.complexityAnalysis.maintainabilityIndex[componentName];

  if (maintainabilityIndex === undefined) return 0;

  // Lower maintainability index = higher problematic score
  if (
    maintainabilityIndex < DEFAULT_SCORING_THRESHOLDS.lowMaintainabilityIndex
  ) {
    const score =
      ((DEFAULT_SCORING_THRESHOLDS.lowMaintainabilityIndex -
        maintainabilityIndex) /
        DEFAULT_SCORING_THRESHOLDS.lowMaintainabilityIndex) *
      100;
    return Math.round(score);
  }

  return 0;
}

/**
 * Calculate coupling degree score
 */
export function calculateCouplingScore(
  context: MetricCalculationContext
): number {
  if (!context.complexityAnalysis) return 0;

  const componentName = context.component.name;
  const couplingDegree =
    context.complexityAnalysis.couplingDegree[componentName] || 0;

  const score = Math.min(
    (couplingDegree / DEFAULT_SCORING_THRESHOLDS.highCouplingDegree) * 100,
    100
  );
  return Math.round(score);
}

/**
 * Calculate type issues score - ENHANCED
 * Focus on critical type safety gaps that developers miss
 */
export function calculateTypeIssuesScore(
  context: MetricCalculationContext
): number {
  if (!context.typeAnalysis) return 0;

  const componentName = context.component.name;
  const componentPath = context.component.fullPath;
  let score = 0;

  // Higher penalty for components missing prop types (critical for React components)
  if (context.typeAnalysis.componentsWithoutPropTypes.includes(componentName)) {
    score += 50; // Increased from 40
  }

  // Check for any usage - more aggressive detection
  const anyUsageInComponent = context.typeAnalysis.anyUsageCount || 0;
  if (anyUsageInComponent > DEFAULT_SCORING_THRESHOLDS.highAnyUsage) {
    score += Math.min(anyUsageInComponent * 15, 40); // Increased penalty
  }

  // Check complex types that might indicate over-engineering or poor type design
  const componentComplexTypes = context.typeAnalysis.complexTypes.filter(
    (ct) => ct.fileName === componentPath
  );

  if (
    componentComplexTypes.length >
    DEFAULT_SCORING_THRESHOLDS.highComplexTypeCount
  ) {
    score += 25; // Reduced penalty - complex types aren't always bad
  }

  // Check for untyped function parameters and returns
  const functionsWithoutTypes =
    context.typeAnalysis.regularFunctionsWithoutReturnType || 0;
  if (functionsWithoutTypes > 0) {
    score += Math.min(functionsWithoutTypes * 10, 30);
  }

  // Bonus reduction for well-typed components with interfaces/types
  if (
    context.typeAnalysis.interfacesCount > 0 &&
    !context.typeAnalysis.componentsWithoutPropTypes.includes(componentName)
  ) {
    score = Math.max(score - 15, 0); // Reward good type practices
  }

  return Math.round(score);
}

/**
 * NEW: Calculate accessibility issues score
 * Focus on missing accessibility features that developers often forget
 */
export function calculateAccessibilityScore(
  context: MetricCalculationContext
): number {
  if (!context.seoAnalysis) return 0;

  let score = 0;
  const componentPath = context.component.fullPath;

  // Check for missing alt texts on images
  const imageIssues = context.seoAnalysis.imageOptimization.images.filter(
    (img) => img.usedInPages.includes(componentPath)
  );

  let missingAltCount = 0;
  let totalImages = 0;

  for (const image of imageIssues) {
    totalImages++;
    const hasAltIssue = image.issues.some(
      (issue) => issue.type === "missing-alt"
    );
    if (hasAltIssue || !image.attributes.alt) {
      missingAltCount++;
    }
  }

  // Penalty for missing alt texts
  if (missingAltCount > 0) {
    score += Math.min(
      (missingAltCount / DEFAULT_SCORING_THRESHOLDS.missingAltTexts) * 40,
      40
    );
  }

  // Check for missing ARIA attributes (approximate based on static analysis)
  const ariaAnalysis = context.seoAnalysis.semanticStructure.accessibility.aria;
  if (ariaAnalysis.potentialMisuse.length > 0) {
    score += Math.min(ariaAnalysis.potentialMisuse.length * 10, 30);
  }

  // Check for missing labels on form inputs
  const formIssues =
    context.seoAnalysis.semanticStructure.accessibility.forms.inputs;
  const missingLabelsRatio =
    formIssues.total > 0
      ? (formIssues.missingLabels + formIssues.missingAriaLabels) /
        formIssues.total
      : 0;

  if (missingLabelsRatio > 0.1) {
    // More than 10% missing labels
    score += missingLabelsRatio * 50;
  }

  // Check for missing semantic structure
  const landmarkUsage = context.seoAnalysis.semanticStructure.landmarkElements;
  if (componentPath.includes("/pages/") || componentPath.includes("layout")) {
    // Pages and layouts should have proper landmarks
    if (landmarkUsage.elements.main === 0) score += 20;
    if (landmarkUsage.elements.header === 0) score += 15;
    if (landmarkUsage.elements.nav === 0) score += 10;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * NEW: Calculate performance issues score
 * Focus on bundle optimization and loading performance
 */
export function calculatePerformanceScore(
  context: MetricCalculationContext
): number {
  if (!context.seoAnalysis) return 0;

  let score = 0;
  const componentPath = context.component.fullPath;

  // Check for missing lazy loading opportunities
  const lazyLoadingAnalysis = context.seoAnalysis.performance?.lazyLoading;
  if (lazyLoadingAnalysis) {
    const componentLazyInfo = lazyLoadingAnalysis.components.filter(
      (comp) => comp.path === componentPath
    );

    for (const comp of componentLazyInfo) {
      if (comp.shouldBeLazyLoaded && !comp.isLazyLoaded) {
        score += 25; // Penalty for missing lazy loading
      }
    }

    // Check for images that should be lazy loaded
    const imageLazyInfo = lazyLoadingAnalysis.images.filter((img) =>
      img.usedInPages.includes(componentPath)
    );

    let imagesToLazyLoad = 0;
    for (const img of imageLazyInfo) {
      if (!img.hasLazyLoading && !img.isAboveFold) {
        imagesToLazyLoad++;
      }
    }

    if (imagesToLazyLoad > DEFAULT_SCORING_THRESHOLDS.missingLazyLoading) {
      score += Math.min(imagesToLazyLoad * 10, 30);
    }
  }

  // Check for heavy imports (bundle optimization)
  const bundleAnalysis = context.seoAnalysis.performance?.bundleOptimization;
  if (bundleAnalysis) {
    const heavyImports = bundleAnalysis.heavyImports.filter((imp) =>
      imp.importedBy.includes(componentPath)
    );

    const highImpactImports = heavyImports.filter(
      (imp) => imp.potentialImpact === "high" && !imp.isDynamic
    );

    if (highImpactImports.length > 0) {
      score += Math.min(highImpactImports.length * 20, 40);
    }
  }

  // Check Core Web Vitals issues
  const coreWebVitals = context.seoAnalysis.performance?.coreWebVitals;
  if (coreWebVitals) {
    const componentIssues = coreWebVitals.potentialIssues.filter(
      (issue) => issue.location === componentPath
    );

    const highSeverityIssues = componentIssues.filter(
      (issue) => issue.severity === "high"
    );
    score += highSeverityIssues.length * 15;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Calculate SEO problems score - ENHANCED
 * Much more aggressive scoring for SEO issues
 */
export function calculateSEOScore(context: MetricCalculationContext): number {
  if (!context.seoAnalysis) return 0;

  let score = 0;
  const componentName = context.component.name;
  const componentPath = context.component.fullPath;

  // Enhanced page detection - check if this is a page component
  const isPage =
    componentPath.includes("/pages/") ||
    componentPath.includes("/app/") ||
    componentPath.includes("page.") ||
    componentName.toLowerCase().includes("page");

  if (isPage) {
    // Critical penalties for pages missing SEO essentials
    const pageMetaTags = context.seoAnalysis.metaTags.pages[componentPath];
    if (pageMetaTags) {
      // Missing title is critical
      if (!pageMetaTags.title.present) score += 40;

      // Missing description is critical
      if (!pageMetaTags.description.present) score += 40;

      // Poor title length
      if (
        pageMetaTags.title.present &&
        (pageMetaTags.title.length > 60 || pageMetaTags.title.length < 30)
      ) {
        score += 20;
      }

      // Poor description length
      if (
        pageMetaTags.description.present &&
        (pageMetaTags.description.length > 160 ||
          pageMetaTags.description.length < 120)
      ) {
        score += 20;
      }

      // Missing Open Graph
      if (!pageMetaTags.openGraph.present) score += 25;

      // Missing viewport responsiveness
      if (!pageMetaTags.viewport.isResponsive) score += 15;

      // Missing canonical URL
      if (!pageMetaTags.canonical.present) score += 15;
    } else {
      // No meta tag analysis available for this page - critical
      score += 80;
    }
  }

  // Check for heading hierarchy issues (affects all components)
  const headingIssues =
    context.seoAnalysis.semanticStructure.headingHierarchy.hierarchyIssues.filter(
      (issue) => issue.path === componentPath
    );
  score += headingIssues.length * 20; // Increased penalty

  // Check image optimization issues
  const imageIssues = context.seoAnalysis.imageOptimization.images.filter(
    (img) => img.usedInPages.includes(componentPath) && img.issues.length > 0
  );

  // Higher penalties for SEO-critical image issues
  for (const image of imageIssues) {
    const criticalIssues = image.issues.filter(
      (issue) =>
        issue.type === "missing-alt" || issue.type === "missing-dimensions"
    );
    score += criticalIssues.length * 8; // Increased penalty
  }

  // Check for structured data issues
  if (context.seoAnalysis.contentStructure?.structuredData) {
    const schemas =
      context.seoAnalysis.contentStructure.structuredData.schemas.filter(
        (schema) => schema.location === componentPath
      );

    for (const schema of schemas) {
      if (schema.coverage < 50) {
        // Less than 50% of required fields
        score += 15;
      }
    }
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Calculate zombie code score
 */
export function calculateZombieCodeScore(
  context: MetricCalculationContext
): number {
  if (!context.dependencyAnalysis?.zombieClusters) return 0;

  const componentPath = context.component.fullPath;
  const { clusters } = context.dependencyAnalysis.zombieClusters;

  for (const cluster of clusters) {
    if (cluster.components.includes(componentPath)) {
      // Score based on risk level and cluster size
      const riskMultiplier =
        cluster.risk === "high" ? 1.0 : cluster.risk === "medium" ? 0.7 : 0.4;
      const sizeMultiplier = Math.min(cluster.size / 10, 1.0);
      return Math.round(100 * riskMultiplier * sizeMultiplier);
    }
  }

  return 0;
}

/**
 * Calculate translation issues score
 */
export function calculateTranslationScore(
  context: MetricCalculationContext
): number {
  if (!context.translationAnalysis) return 0;

  const componentPath = context.component.fullPath;
  let score = 0;

  // Count missing translations in this component
  const missingTranslationsInComponent =
    context.translationAnalysis.missingTranslations.filter(
      (mt) => mt.key.filePath === componentPath
    ).length;

  if (
    missingTranslationsInComponent >
    DEFAULT_SCORING_THRESHOLDS.highMissingTranslations
  ) {
    score += 60;
  } else {
    score +=
      (missingTranslationsInComponent /
        DEFAULT_SCORING_THRESHOLDS.highMissingTranslations) *
      60;
  }

  // Check for duplicate translations used in this component
  const duplicatesInComponent =
    context.translationAnalysis.duplicateTranslations.filter((dt) =>
      dt.usages.some((usage) => usage.filePath === componentPath)
    ).length;

  score += duplicatesInComponent * 5;

  return Math.min(Math.round(score), 100);
}

/**
 * Calculate magic numbers score - REDUCED SENSITIVITY
 * Less aggressive since magic numbers are often obvious to developers
 */
export function calculateMagicNumbersScore(
  context: MetricCalculationContext
): number {
  if (!context.generalAnalysis) return 0;

  const componentPath = context.component.fullPath;
  const magicNumbersInComponent =
    context.generalAnalysis.codeMetrics.magicNumbers.filter(
      (mn) => mn.filePath === componentPath
    ).length;

  if (magicNumbersInComponent === 0) return 0;

  // Higher threshold, less sensitive
  const score = Math.min(
    (magicNumbersInComponent /
      DEFAULT_SCORING_THRESHOLDS.highMagicNumberCount) *
      100,
    100
  );
  return Math.round(score);
}

/**
 * Calculate code metrics score (line metrics, comment ratio) - REDUCED IMPORTANCE
 */
export function calculateCodeMetricsScore(
  context: MetricCalculationContext
): number {
  if (!context.generalAnalysis) return 0;

  let score = 0;

  // Less aggressive scoring for code metrics
  const codeToCommentRatio =
    context.generalAnalysis.codeMetrics.codeToCommentRatio;

  if (codeToCommentRatio < DEFAULT_SCORING_THRESHOLDS.lowCodeToCommentRatio) {
    score += 30; // Reduced from 50
  }

  return Math.round(score);
}

/**
 * Calculate deduplication opportunities score
 */
export function calculateDeduplicationScore(
  context: MetricCalculationContext
): number {
  if (!context.deduplicationAnalysis) return 0;

  const componentName = context.component.name;

  for (const similarity of context.deduplicationAnalysis) {
    if (similarity.components.includes(componentName)) {
      if (
        similarity.similarityScore >
        DEFAULT_SCORING_THRESHOLDS.highSimilarityScore
      ) {
        return Math.round(similarity.similarityScore * 100);
      }
    }
  }

  return 0;
}

/**
 * Calculate component flow complexity score
 */
export function calculateComponentFlowScore(
  context: MetricCalculationContext
): number {
  if (!context.componentFlowAnalysis) return 0;

  const componentName = context.component.name;
  let score = 0;

  // Find this component in the flow analysis
  for (const route of context.componentFlowAnalysis.routes) {
    const findComponentInFlow = (node: any): any => {
      if (node.componentName === componentName) return node;
      for (const child of node.children || []) {
        const found = findComponentInFlow(child);
        if (found) return found;
      }
      return null;
    };

    const componentNode = findComponentInFlow(route.pageComponent);
    if (componentNode) {
      // Score based on conditional renders
      const conditionalRenderCount =
        componentNode.conditionalRenders?.length || 0;
      if (
        conditionalRenderCount >
        DEFAULT_SCORING_THRESHOLDS.highConditionalRenderCount
      ) {
        score += 40;
      } else {
        score +=
          (conditionalRenderCount /
            DEFAULT_SCORING_THRESHOLDS.highConditionalRenderCount) *
          40;
      }

      // Score based on nesting depth
      const calculateDepth = (node: any, depth = 0): number => {
        if (!node.children || node.children.length === 0) return depth;
        return Math.max(
          ...node.children.map((child: any) => calculateDepth(child, depth + 1))
        );
      };

      const maxDepth = calculateDepth(componentNode);
      if (maxDepth > DEFAULT_SCORING_THRESHOLDS.deepComponentNesting) {
        score += 30;
      }

      break;
    }
  }

  return Math.min(Math.round(score), 100);
}
