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
 * Enhanced SEO scoring that doesn't penalize simple pages
 */
export function calculateSEOScore(context: MetricCalculationContext): number {
  if (!context.seoAnalysis) return 0;

  let score = 0;
  const componentName = context.component.name;
  const componentPath = context.component.fullPath;

  // Check if this is a page component
  const isPage =
    componentPath.includes("/pages/") ||
    componentPath.includes("/app/") ||
    componentPath.includes("page.") ||
    componentName.toLowerCase().includes("page");

  // For simple pages that just render a client component (like StrMapPage), don't penalize
  if (isPage && context.component.content) {
    const content = context.component.content;
    const lineCount = content.split('\n').length;
    
    // If it's a simple page (< 50 lines) with proper metadata, don't penalize
    if (lineCount < 50 && content.includes('generateMetadata')) {
      return 0; // Simple pages with metadata are good
    }
  }

  if (isPage) {
    const pageMetaTags = context.seoAnalysis.metaTags.pages[componentPath];
    if (pageMetaTags) {
      // Only penalize missing critical SEO for complex pages
      if (!pageMetaTags.title.present) score += 30; // Reduced penalty
      if (!pageMetaTags.description.present) score += 30; // Reduced penalty

      // Don't penalize length issues as heavily
      if (
        pageMetaTags.title.present &&
        (pageMetaTags.title.length > 70 || pageMetaTags.title.length < 20)
      ) {
        score += 10; // Reduced penalty
      }

      if (
        pageMetaTags.description.present &&
        (pageMetaTags.description.length > 180 ||
          pageMetaTags.description.length < 100)
      ) {
        score += 10; // Reduced penalty
      }

      // Missing Open Graph - less critical
      if (!pageMetaTags.openGraph.present) score += 15; // Reduced penalty
    }
  }

  // Reduce other SEO penalties
  const headingIssues =
    context.seoAnalysis.semanticStructure.headingHierarchy.hierarchyIssues.filter(
      (issue) => issue.path === componentPath
    );
  score += headingIssues.length * 8; // Reduced penalty

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

/**
 * NEW: Calculate React-specific complexity patterns that make components problematic
 */
export function calculateReactComplexityScore(
  context: MetricCalculationContext
): number {
  if (!context.component.content) return 0;

  const content = context.component.content;
  let score = 0;

  // Multiple useEffect hooks (like ReportCreationContainer)
  const useEffectMatches = content.match(/useEffect\s*\(/g);
  const useEffectCount = useEffectMatches ? useEffectMatches.length : 0;
  if (useEffectCount > 3) {
    score += (useEffectCount - 3) * 15; // Heavy penalty for many useEffects
  }

  // Multiple useState hooks indicating complex state management
  const useStateMatches = content.match(/useState\s*[<(]/g);
  const useStateCount = useStateMatches ? useStateMatches.length : 0;
  if (useStateCount > 5) {
    score += (useStateCount - 5) * 8; // Penalty for complex state
  }

  // Complex conditional rendering (nested ternary, multiple conditions)
  const ternaryMatches = content.match(/\?\s*[^:]*:/g);
  const ternaryCount = ternaryMatches ? ternaryMatches.length : 0;
  if (ternaryCount > 3) {
    score += (ternaryCount - 3) * 10;
  }

  // Nested JSX expressions indicating complex rendering logic
  const jsxExpressionMatches = content.match(/{\s*[^}]*{[^}]*}[^}]*}/g);
  const nestedJsxCount = jsxExpressionMatches ? jsxExpressionMatches.length : 0;
  if (nestedJsxCount > 2) {
    score += nestedJsxCount * 8;
  }

  // Long functions/components (lines of code)
  const lineCount = content.split('\n').length;
  if (lineCount > 150) {
    score += (lineCount - 150) * 0.3; // Penalty for very long components
  }

  // Multiple async operations without proper error handling
  const asyncMatches = content.match(/async\s+/g);
  const awaitMatches = content.match(/await\s+/g);
  const asyncCount = asyncMatches ? asyncMatches.length : 0;
  const awaitCount = awaitMatches ? awaitMatches.length : 0;
  const tryMatches = content.match(/try\s*{/g);
  const tryCount = tryMatches ? tryMatches.length : 0;

  if ((asyncCount > 2 || awaitCount > 3) && tryCount === 0) {
    score += 25; // Heavy penalty for async operations without error handling
  }

  // Store/context coupling (multiple store imports like ReportCreationContainer)
  const storeMatches = content.match(/use\w*Store\s*\(/g);
  const storeCount = storeMatches ? storeMatches.length : 0;
  if (storeCount > 3) {
    score += (storeCount - 3) * 12; // Penalty for high store coupling
  }

  return Math.min(Math.round(score), 100);
}

/**
 * NEW: Calculate container component penalty
 * Container components should be simple - if they're complex, they're problematic
 */
export function calculateContainerComplexityScore(
  context: MetricCalculationContext
): number {
  if (!context.component.content) return 0;

  const content = context.component.content;
  const componentName = context.component.name;

  // Identify if this is likely a container component
  const containerPatterns = [
    /Container$/,
    /Provider$/,
    /Wrapper$/,
    /Manager$/,
    /Controller$/,
  ];

  const isContainer = containerPatterns.some(pattern => 
    pattern.test(componentName)
  ) || context.component.fullPath.includes('container');

  if (!isContainer) return 0;

  let score = 0;

  // Containers should delegate, not implement complex logic
  const implementationPatterns = [
    /useEffect\s*\(/g,
    /useState\s*[<(]/g,
    /async\s+/g,
    /setInterval\s*\(/g,
    /setTimeout\s*\(/g,
    /fetch\s*\(/g,
    /axios\./g,
  ];

  implementationPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches && matches.length > 2) {
      score += matches.length * 8; // Heavy penalty for implementation in containers
    }
  });

  // Containers with complex JSX are doing too much
  const jsxComplexity = (content.match(/<\w/g) || []).length;
  if (jsxComplexity > 10) {
    score += (jsxComplexity - 10) * 2;
  }

  return Math.min(Math.round(score), 100);
}