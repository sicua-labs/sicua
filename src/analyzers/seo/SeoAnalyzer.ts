import { ComponentRelation } from "../../types";
import { SEOAnalysisResult } from "../../types/seoCoverageTypes";
import { ComponentUtils } from "./utils/componentUtils";
import { RouteUtils } from "./utils/routeUtils";
import { MetaTagAnalyzer } from "./analyzers/metaTagAnalyzer";
import { StructuredDataAnalyzer } from "./analyzers/structuredDataAnalyzer";
import { RoutingAnalyzer } from "./analyzers/routingAnalyzer";
import { AccessibilityAnalyzer } from "./analyzers/accessibilityAnalyzer";
import { ContentAnalyzer } from "./analyzers/contentAnalyzer";
import { HeadingAnalyzer } from "./analyzers/headingAnalyzer";
import { LandmarkAnalyzer } from "./analyzers/landmarkAnalyzer";
import { AppRouterAnalyzer } from "./analyzers/appRouterAnalyzer";
import { PerformanceAnalyzer } from "./analyzers/performanceAnalyzer";
import { ImageOptimizationAnalyzer } from "./analyzers/imageOptimizationAnalyzer";
import { MiddlewareAnalyzer } from "./analyzers/middlewareAnalyzer";
import { BundleAnalyzer } from "./analyzers/bundleAnalyzer";
import {
  SEOAnalysisOptions,
  PageComponentMap,
  MetaTagsMap,
  StructuredDataMap,
  RoutesMap,
} from "./types/internalTypes";
import path from "path";
import { generateComponentId } from "../../utils/common/analysisUtils";
import { UI_COMPONENT_PATTERNS } from "../../constants/uiPatterns";

/**
 * Main analyzer for SEO-related aspects of React applications
 */
export class SEOAnalyzer {
  private components: ComponentRelation[];
  private pageComponents: PageComponentMap;
  private metaTags: MetaTagsMap;
  private structuredData: StructuredDataMap;
  private routes: RoutesMap;
  private options: SEOAnalysisOptions;

  /**
   * Create a new SEO analyzer
   *
   * @param components Array of component relations to analyze
   * @param options Optional analysis configuration
   */
  constructor(
    components: ComponentRelation[],
    options: SEOAnalysisOptions = {}
  ) {
    this.components = components;
    this.pageComponents = new Map();
    this.metaTags = new Map();
    this.structuredData = new Map();
    this.routes = new Map();
    this.options = {
      analyzeRouting: true,
      analyzeStructuredData: true,
      analyzeAccessibility: true,
      analyzeTextContent: true,
      ...options,
    };
  }

  /**
   * Run the comprehensive SEO analysis including new Next.js features
   */
  public async analyze(): Promise<SEOAnalysisResult> {
    // First pass: identify page components and build route map
    this.identifyPageComponents();

    // Second pass: detailed analysis of each page component
    for (const [componentId, component] of this.pageComponents.entries()) {
      await this.analyzePageComponent(componentId, component);
    }

    // Create specialized analyzers
    const headingAnalyzer = new HeadingAnalyzer(this.pageComponents);
    const landmarkAnalyzer = new LandmarkAnalyzer(this.pageComponents);
    const accessibilityAnalyzer = new AccessibilityAnalyzer(
      this.pageComponents
    );
    const contentAnalyzer = new ContentAnalyzer(this.pageComponents);
    const routingAnalyzer = new RoutingAnalyzer(
      this.pageComponents,
      this.routes
    );

    // New analyzers for enhanced functionality
    const appRouterAnalyzer = new AppRouterAnalyzer(
      this.pageComponents,
      this.components
    );
    const performanceAnalyzer = new PerformanceAnalyzer(
      this.pageComponents,
      this.components
    );
    const imageOptimizationAnalyzer = new ImageOptimizationAnalyzer(
      this.pageComponents,
      this.components
    );
    const middlewareAnalyzer = new MiddlewareAnalyzer(this.components);
    const bundleAnalyzer = new BundleAnalyzer(
      this.pageComponents,
      this.components
    );

    // Build the comprehensive result
    return {
      metaTags: {
        pages: Object.fromEntries(this.metaTags),
        statistics: MetaTagAnalyzer.calculateMetaTagStatistics(this.metaTags),
      },
      semanticStructure: {
        headingHierarchy: headingAnalyzer.analyzeHeadingHierarchy(),
        landmarkElements: landmarkAnalyzer.analyzeLandmarkUsage(),
        accessibility: accessibilityAnalyzer.analyzeAccessibility(),
      },
      contentStructure: {
        textContent: contentAnalyzer.analyzeTextContent(),
        structuredData: StructuredDataAnalyzer.generateStructuredDataAnalysis(
          this.structuredData
        ),
        routing: routingAnalyzer.analyzeRouting(),
      },
      appRouter: {
        specialFiles: appRouterAnalyzer.analyzeAppRouter().specialFiles,
        layoutHierarchy: appRouterAnalyzer.analyzeAppRouter().layoutHierarchy,
        routeGroups: appRouterAnalyzer.analyzeAppRouter().routeGroups,
        parallelRoutes: appRouterAnalyzer.analyzeAppRouter().parallelRoutes,
      },
      performance: {
        coreWebVitals: performanceAnalyzer.analyzeCoreWebVitals(),
        bundleOptimization: bundleAnalyzer.analyzeBundleOptimization(),
        lazyLoading: performanceAnalyzer.analyzeLazyLoading(),
      },
      imageOptimization: imageOptimizationAnalyzer.analyzeImageOptimization(),
      middleware: middlewareAnalyzer.analyzeMiddleware(),
    };
  }

  /**
   * Identify page components from all components
   */
  private identifyPageComponents(): void {
    for (const component of this.components) {
      if (ComponentUtils.isPageComponent(component)) {
        const normalizedPath = component.fullPath;

        // Additional check to exclude UI components
        if (!this.isUIComponent(component)) {
          this.pageComponents.set(generateComponentId(component), component);

          // Extract route information
          const route = RouteUtils.extractRouteFromPath(normalizedPath);
          if (route) {
            this.routes.set(generateComponentId(component), [route]);
          }
        }
      }
    }
  }

  private isUIComponent(component: ComponentRelation): boolean {
    const normalizedPath = path.normalize(component.fullPath);

    // Check for components directory
    const isInComponentsDir =
      normalizedPath.includes("/components/") ||
      normalizedPath.includes("\\components\\");

    // If it's not in a components directory, check for UI component naming patterns
    if (!isInComponentsDir) {
      const fileName = path.basename(
        normalizedPath,
        path.extname(normalizedPath)
      );

      return UI_COMPONENT_PATTERNS.some(
        (pattern) =>
          fileName === pattern ||
          fileName.endsWith(pattern) ||
          fileName.startsWith(pattern)
      );
    }

    // Special case: page components can sometimes live in component directories
    // Check for explicit page indicators
    if (isInComponentsDir) {
      return !(
        normalizedPath.endsWith("page.tsx") ||
        normalizedPath.endsWith("page.jsx") ||
        normalizedPath.endsWith("Page.tsx") ||
        normalizedPath.endsWith("Page.jsx") ||
        component.content?.includes("generateMetadata") ||
        component.content?.includes("export const metadata")
      );
    }

    return isInComponentsDir;
  }

  /**
   * Analyze a single page component
   */
  private async analyzePageComponent(
    pagePath: string,
    component: ComponentRelation
  ): Promise<void> {
    if (!component.content) return;

    try {
      // Analyze meta tags
      const metaAnalyzer = new MetaTagAnalyzer(component);
      const metaAnalysis = metaAnalyzer.analyzeMetaTags();
      this.metaTags.set(pagePath, metaAnalysis);

      // Analyze structured data if enabled
      if (this.options.analyzeStructuredData) {
        const structuredDataAnalyzer = new StructuredDataAnalyzer(component);
        const structuredDataAnalysis =
          structuredDataAnalyzer.analyzeStructuredData();
        if (structuredDataAnalysis) {
          this.structuredData.set(pagePath, structuredDataAnalysis);
        }
      }
    } catch (error) {
      // Silently continue with other components if one fails
    }
  }

  /**
   * Get comprehensive SEO improvement suggestions including new features
   */
  public getSEOImprovementSuggestions(): {
    metaTags: string[];
    headings: string[];
    landmarks: string[];
    accessibility: string[];
    content: string[];
    routing: string[];
    structuredData: string[];
    appRouter: string[];
    performance: string[];
    imageOptimization: string[];
    middleware: string[];
  } {
    // Create specialized analyzers
    const headingAnalyzer = new HeadingAnalyzer(this.pageComponents);
    const landmarkAnalyzer = new LandmarkAnalyzer(this.pageComponents);
    const accessibilityAnalyzer = new AccessibilityAnalyzer(
      this.pageComponents
    );
    const contentAnalyzer = new ContentAnalyzer(this.pageComponents);
    const routingAnalyzer = new RoutingAnalyzer(
      this.pageComponents,
      this.routes
    );

    // New analyzers
    const appRouterAnalyzer = new AppRouterAnalyzer(
      this.pageComponents,
      this.components
    );
    const performanceAnalyzer = new PerformanceAnalyzer(
      this.pageComponents,
      this.components
    );
    const imageOptimizationAnalyzer = new ImageOptimizationAnalyzer(
      this.pageComponents,
      this.components
    );
    const middlewareAnalyzer = new MiddlewareAnalyzer(this.components);
    const bundleAnalyzer = new BundleAnalyzer(
      this.pageComponents,
      this.components
    );

    // Generate meta tag suggestions
    const metaTags: string[] = [];
    const pages = Array.from(this.metaTags.values());

    if (
      pages.filter((p) => p.title.present).length < this.pageComponents.size
    ) {
      metaTags.push("Add title metadata to all pages");
    }

    if (
      pages.filter((p) => p.description.present).length <
      this.pageComponents.size
    ) {
      metaTags.push("Add description metadata to all pages");
    }

    if (
      pages.filter((p) => p.openGraph.present).length <
      this.pageComponents.size * 0.5
    ) {
      metaTags.push("Add Open Graph metadata for better social media sharing");
    }

    // Get App Router suggestions
    const appRouterSuggestions =
      appRouterAnalyzer.getAppRouterImprovementSuggestions();
    const appRouter = [
      ...appRouterSuggestions.specialFiles,
      ...appRouterSuggestions.layouts,
      ...appRouterSuggestions.routeGroups,
      ...appRouterSuggestions.parallelRoutes,
      ...appRouterSuggestions.general,
    ];

    return {
      metaTags,
      headings: headingAnalyzer.getHeadingImprovementSuggestions(),
      landmarks: landmarkAnalyzer.getLandmarkImprovementSuggestions(),
      accessibility:
        accessibilityAnalyzer.getAccessibilityImprovementSuggestions(),
      content: contentAnalyzer.getContentImprovementSuggestions(),
      routing: this.options.analyzeRouting
        ? routingAnalyzer.getRoutingImprovementSuggestions()
        : [],
      structuredData: this.options.analyzeStructuredData
        ? StructuredDataAnalyzer.getImprovementSuggestions(this.structuredData)
        : [],
      appRouter,
      performance: [
        ...performanceAnalyzer.getPerformanceImprovementSuggestions(),
        ...bundleAnalyzer.getBundleOptimizationSuggestions(),
      ],
      imageOptimization:
        imageOptimizationAnalyzer.getImageOptimizationSuggestions(),
      middleware: middlewareAnalyzer.getMiddlewareImprovementSuggestions(),
    };
  }

  /**
   * Get overall SEO health score (0-100)
   */
  public calculateSEOHealthScore(): {
    overallScore: number;
    categoryScores: {
      metaTags: number;
      semanticStructure: number;
      performance: number;
      appRouter: number;
      imageOptimization: number;
      accessibility: number;
    };
    criticalIssues: string[];
  } {
    const suggestions = this.getSEOImprovementSuggestions();
    const criticalIssues: string[] = [];

    // Calculate category scores
    const metaTagsScore = Math.max(0, 100 - suggestions.metaTags.length * 15);
    const semanticScore = Math.max(
      0,
      100 - (suggestions.headings.length + suggestions.landmarks.length) * 10
    );
    const performanceScore = Math.max(
      0,
      100 - suggestions.performance.length * 12
    );
    const appRouterScore = Math.max(0, 100 - suggestions.appRouter.length * 8);
    const imageScore = Math.max(
      0,
      100 - suggestions.imageOptimization.length * 10
    );
    const accessibilityScore = Math.max(
      0,
      100 - suggestions.accessibility.length * 12
    );

    // Identify critical issues
    if (metaTagsScore < 50) {
      criticalIssues.push("Critical meta tag issues detected");
    }
    if (performanceScore < 40) {
      criticalIssues.push("Severe performance issues affecting SEO");
    }
    if (accessibilityScore < 30) {
      criticalIssues.push("Major accessibility issues impacting SEO");
    }

    // Calculate weighted overall score
    const weights = {
      metaTags: 0.25,
      semantic: 0.15,
      performance: 0.2,
      appRouter: 0.15,
      image: 0.15,
      accessibility: 0.1,
    };

    const overallScore = Math.round(
      metaTagsScore * weights.metaTags +
        semanticScore * weights.semantic +
        performanceScore * weights.performance +
        appRouterScore * weights.appRouter +
        imageScore * weights.image +
        accessibilityScore * weights.accessibility
    );

    return {
      overallScore,
      categoryScores: {
        metaTags: metaTagsScore,
        semanticStructure: semanticScore,
        performance: performanceScore,
        appRouter: appRouterScore,
        imageOptimization: imageScore,
        accessibility: accessibilityScore,
      },
      criticalIssues,
    };
  }

  /**
   * Get Next.js specific recommendations
   */
  public getNextJSRecommendations(): {
    appRouterMigration: string[];
    imageOptimization: string[];
    performanceOptimization: string[];
    middlewareOptimization: string[];
  } {
    const appRouterAnalyzer = new AppRouterAnalyzer(
      this.pageComponents,
      this.components
    );
    const performanceAnalyzer = new PerformanceAnalyzer(
      this.pageComponents,
      this.components
    );
    const imageOptimizationAnalyzer = new ImageOptimizationAnalyzer(
      this.pageComponents,
      this.components
    );
    const middlewareAnalyzer = new MiddlewareAnalyzer(this.components);
    const bundleAnalyzer = new BundleAnalyzer(
      this.pageComponents,
      this.components
    );

    const appRouterSuggestions =
      appRouterAnalyzer.getAppRouterImprovementSuggestions();

    return {
      appRouterMigration: appRouterSuggestions.general,
      imageOptimization:
        imageOptimizationAnalyzer.getImageOptimizationSuggestions(),
      performanceOptimization: [
        ...performanceAnalyzer.getPerformanceImprovementSuggestions(),
        ...bundleAnalyzer.getBundleOptimizationSuggestions(),
      ],
      middlewareOptimization:
        middlewareAnalyzer.getMiddlewareImprovementSuggestions(),
    };
  }

  /**
   * Get all page components detected during analysis
   */
  public getPageComponents(): PageComponentMap {
    return this.pageComponents;
  }

  /**
   * Get all routes detected during analysis
   */
  public getRoutes(): RoutesMap {
    return this.routes;
  }

  /**
   * Get detailed meta tag analysis for a specific page
   */
  public getPageMetaTags(pagePath: string) {
    return this.metaTags.get(pagePath);
  }

  /**
   * Get structured data for a specific page
   */
  public getPageStructuredData(pagePath: string) {
    return this.structuredData.get(pagePath);
  }

  /**
   * Check if a component is a page component
   */
  public isPageComponent(component: ComponentRelation): boolean {
    return ComponentUtils.isPageComponent(component);
  }

  /**
   * Get all meta tags analysis results
   */
  public getAllMetaTags(): MetaTagsMap {
    return this.metaTags;
  }

  /**
   * Get all structured data analysis results
   */
  public getAllStructuredData(): StructuredDataMap {
    return this.structuredData;
  }

  /**
   * Get performance insights for Core Web Vitals
   */
  public getCoreWebVitalsInsights(): {
    lcpIssues: number;
    clsIssues: number;
    fidIssues: number;
    recommendations: string[];
  } {
    const performanceAnalyzer = new PerformanceAnalyzer(
      this.pageComponents,
      this.components
    );
    const analysis = performanceAnalyzer.analyzeCoreWebVitals();

    const lcpIssues = analysis.potentialIssues.filter(
      (issue) => issue.type === "LCP"
    ).length;
    const clsIssues = analysis.potentialIssues.filter(
      (issue) => issue.type === "CLS"
    ).length;
    const fidIssues = analysis.potentialIssues.filter(
      (issue) => issue.type === "FID" || issue.type === "INP"
    ).length;

    const recommendations = [
      ...performanceAnalyzer.getPerformanceImprovementSuggestions(),
      ...(lcpIssues > 0
        ? ["Optimize Largest Contentful Paint (LCP) by improving image loading"]
        : []),
      ...(clsIssues > 0
        ? ["Reduce Cumulative Layout Shift (CLS) by adding image dimensions"]
        : []),
      ...(fidIssues > 0
        ? ["Improve First Input Delay (FID) by optimizing JavaScript execution"]
        : []),
    ];

    return {
      lcpIssues,
      clsIssues,
      fidIssues,
      recommendations,
    };
  }

  /**
   * Get bundle optimization insights
   */
  public getBundleOptimizationInsights(): {
    heavyImports: number;
    criticalResources: number;
    optimizationOpportunities: string[];
    recommendations: string[];
  } {
    const bundleAnalyzer = new BundleAnalyzer(
      this.pageComponents,
      this.components
    );
    const analysis = bundleAnalyzer.analyzeBundleOptimization();

    return {
      heavyImports: analysis.statistics.totalHeavyImports,
      criticalResources: analysis.statistics.criticalResourcesCount,
      optimizationOpportunities: analysis.heavyImports
        .filter((hi) => hi.potentialImpact === "high")
        .map((hi) => `Consider dynamic import for ${hi.importPath}`),
      recommendations: bundleAnalyzer.getBundleOptimizationSuggestions(),
    };
  }
  public getAppRouterReadiness(): {
    isUsingAppRouter: boolean;
    readinessScore: number;
    missingFeatures: string[];
    recommendations: string[];
  } {
    const appRouterAnalyzer = new AppRouterAnalyzer(
      this.pageComponents,
      this.components
    );
    const seoReadiness = appRouterAnalyzer.analyzeSEOReadiness();
    const suggestions = appRouterAnalyzer.getAppRouterImprovementSuggestions();

    const hasAppRouter = this.components.some(
      (component) =>
        component.fullPath.includes("/app/") ||
        component.fullPath.includes("\\app\\")
    );

    const missingFeatures: string[] = [];
    if (suggestions.specialFiles.length > 0) {
      missingFeatures.push("Missing special files (layout, error, loading)");
    }
    if (suggestions.layouts.length > 0) {
      missingFeatures.push("Layout hierarchy issues");
    }

    return {
      isUsingAppRouter: hasAppRouter,
      readinessScore: seoReadiness.score,
      missingFeatures,
      recommendations: [
        ...suggestions.general,
        ...suggestions.specialFiles.slice(0, 3), // Top 3 suggestions
        ...suggestions.layouts.slice(0, 2), // Top 2 layout suggestions
      ],
    };
  }
}
