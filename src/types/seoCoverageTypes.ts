export interface SEOAnalysisResult {
  metaTags: {
    pages: Record<string, MetaTagAnalysis>;
    statistics: MetaTagStatistics;
  };
  semanticStructure: {
    headingHierarchy: HeadingAnalysis;
    landmarkElements: LandmarkUsage;
    accessibility: StaticA11yAnalysis;
  };
  contentStructure: {
    textContent: TextContentAnalysis;
    structuredData: StructuredDataAnalysis;
    routing: StaticRoutingAnalysis;
  };
  appRouter: {
    specialFiles: AppRouterSpecialFiles;
    layoutHierarchy: LayoutHierarchy;
    routeGroups: RouteGroupAnalysis;
    parallelRoutes: ParallelRouteAnalysis;
  };
  performance: {
    coreWebVitals: CoreWebVitalsAnalysis;
    bundleOptimization: BundleOptimizationAnalysis;
    lazyLoading: LazyLoadingAnalysis;
  };
  imageOptimization: ImageOptimizationAnalysis;
  middleware: MiddlewareAnalysis;
}

export interface MetaTagAnalysis {
  title: {
    present: boolean;
    length: number;
    isDynamic: boolean; // Can detect if using variables/props
  };
  description: {
    present: boolean;
    length: number;
    isDynamic: boolean;
  };
  robots: {
    present: boolean;
    directives: string[];
  };
  canonical: {
    present: boolean;
    value: string;
    isDynamic: boolean;
  };
  openGraph: {
    present: boolean;
    properties: {
      title: boolean;
      description: boolean;
      image: boolean;
      url: boolean;
    };
  };
  twitter: {
    present: boolean;
    properties: {
      card: boolean;
      title: boolean;
      description: boolean;
      image: boolean;
    };
  };
  viewport: {
    present: boolean;
    isResponsive: boolean;
  };
}

export interface MetaTagStatistics {
  pagesWithTitle: number;
  pagesWithDescription: number;
  pagesWithCanonical: number;
  averageTitleLength: number;
  averageDescriptionLength: number;
  pagesWithSocialMeta: number;
  duplicateTitles: Array<{
    title: string;
    pages: string[];
  }>;
}

export interface HeadingAnalysis {
  hierarchyIssues: Array<{
    page: string;
    path: string;
    issue: "missing-h1" | "multiple-h1" | "skipped-level";
  }>;
  statistics: {
    pagesWithH1: number;
    averageHeadingsPerPage: number;
    headingLevelDistribution: Record<
      "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
      number
    >;
  };
}

export interface LandmarkUsage {
  elements: {
    header: number;
    main: number;
    footer: number;
    nav: number;
    aside: number;
    article: number;
    section: number;
  };
  coverage: {
    pagesWithAllLandmarks: number;
    pagesWithHeader: number;
    pagesWithMain: number;
    pagesWithFooter: number;
  };
}

export interface StaticA11yAnalysis {
  images: {
    totalImages: number;
    missingAlt: number;
    emptyAlt: number;
    decorativeImages: number;
  };
  aria: {
    totalAttributes: number;
    byAttribute: Record<string, number>; // e.g., {'aria-label': 10}
    potentialMisuse: Array<{
      element: string;
      attribute: string;
      issue: string;
    }>;
  };
  buttons: {
    total: number;
    missingText: number;
    onlyIconButtons: number;
  };
  forms: {
    inputs: {
      total: number;
      missingLabels: number;
      missingAriaLabels: number;
    };
  };
}

export interface TextContentAnalysis {
  byPage: Record<
    string,
    {
      textLength: number;
      textToMarkupRatio: number;
      paragraphCount: number;
      listCount: number;
    }
  >;
  statistics: {
    averageTextLength: number;
    averageTextToMarkupRatio: number;
  };
}

export interface StructuredDataAnalysis {
  schemas: Array<{
    type: string; // e.g., 'Product', 'Article'
    coverage: number; // percentage of required fields present
    location: string; // component/page path
  }>;
  statistics: {
    totalSchemas: number;
    schemasPerPage: number;
    commonTypes: Array<{
      type: string;
      count: number;
    }>;
  };
}

export interface StaticRoutingAnalysis {
  routes: Array<{
    path: string;
    isDynamic: boolean;
    params?: string[];
    component: string;
  }>;
  internalLinks: Array<{
    from: string;
    to: string;
    isRelative: boolean;
  }>;
  statistics: {
    totalRoutes: number;
    dynamicRoutes: number;
    averageLinksPerPage: number;
    orphanedPages: string[]; // Pages with no internal links to them
  };
}

// New App Router Types
export interface AppRouterSpecialFiles {
  files: Array<{
    type:
      | "layout"
      | "loading"
      | "error"
      | "not-found"
      | "global-error"
      | "template";
    path: string;
    routeSegment: string;
    hasMetadata: boolean;
    hasGenerateMetadata: boolean;
    issues: string[];
  }>;
  coverage: {
    routesWithLayout: number;
    routesWithLoading: number;
    routesWithError: number;
    routesWithNotFound: number;
  };
  statistics: {
    totalSpecialFiles: number;
    specialFilesByType: Record<string, number>;
    averageSpecialFilesPerRoute: number;
  };
}

export interface LayoutHierarchy {
  layouts: Array<{
    path: string;
    routeSegment: string;
    level: number; // nesting level
    parentLayout: string | null;
    childLayouts: string[];
    hasMetadata: boolean;
    metadataConflicts: string[]; // conflicts with parent layouts
    children: string[]; // page/layout paths affected by this layout
  }>;
  statistics: {
    totalLayouts: number;
    maxNestingLevel: number;
    averageChildrenPerLayout: number;
    layoutsWithMetadataConflicts: number;
  };
}

export interface RouteGroupAnalysis {
  routeGroups: Array<{
    name: string; // e.g., "(dashboard)"
    path: string;
    routes: string[]; // routes within this group
    hasLayout: boolean;
    hasSpecialFiles: string[]; // loading, error, etc.
  }>;
  statistics: {
    totalRouteGroups: number;
    routesInGroups: number;
    ungroupedRoutes: number;
  };
}

export interface ParallelRouteAnalysis {
  parallelRoutes: Array<{
    name: string; // e.g., "@team", "@analytics"
    path: string;
    parentRoute: string;
    defaultSlot: boolean;
    hasDefault: boolean; // has default.tsx
    routes: string[]; // routes within this parallel segment
  }>;
  statistics: {
    totalParallelRoutes: number;
    parallelRoutesWithDefaults: number;
    routesWithParallelSegments: number;
  };
}

// Performance Analysis Types
export interface CoreWebVitalsAnalysis {
  potentialIssues: Array<{
    type: "LCP" | "CLS" | "FID" | "INP";
    severity: "low" | "medium" | "high";
    description: string;
    location: string;
    suggestion: string;
  }>;
  optimizations: {
    imageOptimization: number; // count of unoptimized images
    lazyLoadingCandidates: number;
    largeBundles: string[]; // components with many imports
    blockingResources: string[]; // synchronous imports in pages
  };
  statistics: {
    totalPotentialIssues: number;
    issuesByType: Record<string, number>;
    pagesWithIssues: number;
  };
}

export interface BundleOptimizationAnalysis {
  heavyImports: Array<{
    importPath: string;
    importedBy: string[];
    isDynamic: boolean;
    isServerComponent: boolean;
    potentialImpact: "low" | "medium" | "high";
  }>;
  criticalResources: Array<{
    type: "font" | "image" | "script" | "style";
    path: string;
    usedInPages: string[];
    isPreloaded: boolean;
    isOptimized: boolean;
  }>;
  statistics: {
    totalHeavyImports: number;
    dynamicImportsUsage: number;
    staticImportsInPages: number;
    criticalResourcesCount: number;
  };
}

export interface LazyLoadingAnalysis {
  components: Array<{
    name: string;
    path: string;
    usedInPages: string[];
    isLazyLoaded: boolean;
    lazyLoadingMethod: "React.lazy" | "next/dynamic" | "none";
    shouldBeLazyLoaded: boolean;
    reason: string;
  }>;
  images: Array<{
    path: string;
    usedInPages: string[];
    hasLazyLoading: boolean;
    isNextImage: boolean;
    isAboveFold: boolean | null; // null if cannot be determined statically
  }>;
  statistics: {
    totalComponents: number;
    lazyLoadedComponents: number;
    totalImages: number;
    lazyLoadedImages: number;
    componentsRecommendedForLazyLoading: number;
  };
}

// Image Optimization Types
export interface ImageOptimizationAnalysis {
  images: Array<{
    type: "next/image" | "img" | "background-image";
    path: string | null; // null for inline/base64
    usedInPages: string[];
    attributes: {
      alt: string | null;
      width: number | null;
      height: number | null;
      priority: boolean;
      placeholder: string | null;
      sizes: string | null;
      fill: boolean;
    };
    issues: Array<{
      type:
        | "missing-alt"
        | "missing-dimensions"
        | "no-optimization"
        | "large-size"
        | "wrong-format";
      severity: "low" | "medium" | "high";
      description: string;
    }>;
    seoScore: number; // 0-100
  }>;
  statistics: {
    totalImages: number;
    nextImageUsage: number;
    imagesWithIssues: number;
    averageSeoScore: number;
    imagesByFormat: Record<string, number>;
  };
  recommendations: string[];
}

// Middleware Analysis Types
export interface MiddlewareAnalysis {
  hasMiddleware: boolean;
  middlewareFile: {
    path: string | null;
    hasMatchers: boolean;
    matchers: string[];
    affectedRoutes: string[];
    seoImpacts: Array<{
      type:
        | "redirect"
        | "rewrite"
        | "header-modification"
        | "authentication"
        | "i18n";
      severity: "low" | "medium" | "high";
      description: string;
      recommendation: string;
    }>;
  };
  statistics: {
    totalSeoImpacts: number;
    affectedRoutes: number;
    highSeverityIssues: number;
  };
}
