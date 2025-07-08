import ts from "typescript";
import { ComponentRelation } from "../../../types";
import {
  CoreWebVitalsAnalysis,
  LazyLoadingAnalysis,
} from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { PerformanceUtils } from "../utils/performanceUtils";
import { JsxUtils } from "../utils/jsxUtils";
import { PageComponentMap } from "../types/internalTypes";

/**
 * Analyzer for Core Web Vitals and lazy loading aspects that impact SEO
 */
export class PerformanceAnalyzer {
  private pageComponents: PageComponentMap;
  private allComponents: ComponentRelation[];

  constructor(
    pageComponents: PageComponentMap,
    allComponents: ComponentRelation[]
  ) {
    this.pageComponents = pageComponents;
    this.allComponents = allComponents;
  }

  /**
   * Analyze Core Web Vitals potential issues
   */
  public analyzeCoreWebVitals(): CoreWebVitalsAnalysis {
    const potentialIssues: CoreWebVitalsAnalysis["potentialIssues"] = [];
    const optimizations = {
      imageOptimization: 0,
      lazyLoadingCandidates: 0,
      largeBundles: [] as string[],
      blockingResources: [] as string[],
    };

    // Analyze each page component
    this.pageComponents.forEach((component, pagePath) => {
      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      // Detect CWV issues in this component
      const componentIssues = PerformanceUtils.detectCWVIssues(sourceFile);
      componentIssues.forEach((issue) => {
        potentialIssues.push({
          ...issue,
          location: `${pagePath} - ${issue.location}`,
          suggestion: this.generateSuggestionForIssue(issue),
        });
      });

      // Count images for CWV optimization potential
      this.countImagesForCWVOptimization(sourceFile, optimizations);
    });

    // Calculate statistics
    const issuesByType: Record<string, number> = {};
    potentialIssues.forEach((issue) => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });

    const pagesWithIssues = new Set(
      potentialIssues.map((issue) => issue.location.split(" - ")[0])
    ).size;

    return {
      potentialIssues,
      optimizations,
      statistics: {
        totalPotentialIssues: potentialIssues.length,
        issuesByType,
        pagesWithIssues,
      },
    };
  }

  /**
   * Analyze lazy loading opportunities for components and images
   */
  public analyzeLazyLoading(): LazyLoadingAnalysis {
    const components: LazyLoadingAnalysis["components"] = [];
    const images: LazyLoadingAnalysis["images"] = [];

    this.allComponents.forEach((component) => {
      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      // Analyze component lazy loading
      const dynamicImports = PerformanceUtils.findDynamicImports(sourceFile);
      const staticImports = PerformanceUtils.analyzeStaticImports(sourceFile);

      const usedInPages = this.findComponentPageUsage(component);
      const isLazyLoaded = dynamicImports.length > 0;
      const shouldBeLazyLoaded = this.evaluateComponentForLazyLoading(
        component,
        staticImports
      );

      if (usedInPages.length > 0 || isLazyLoaded || shouldBeLazyLoaded) {
        const lazyLoadingMethod =
          this.identifyLazyLoadingMethod(dynamicImports);

        components.push({
          name: component.name,
          path: component.fullPath,
          usedInPages,
          isLazyLoaded,
          lazyLoadingMethod,
          shouldBeLazyLoaded,
          reason: shouldBeLazyLoaded
            ? this.generateLazyLoadingReason(component, staticImports)
            : "",
        });
      }

      // Analyze image lazy loading in this component
      this.extractImageLazyLoadingInfo(sourceFile, images, component.fullPath);
    });

    // Calculate statistics
    const totalComponents = components.length;
    const lazyLoadedComponents = components.filter(
      (c) => c.isLazyLoaded
    ).length;
    const componentsRecommendedForLazyLoading = components.filter(
      (c) => c.shouldBeLazyLoaded && !c.isLazyLoaded
    ).length;

    return {
      components,
      images,
      statistics: {
        totalComponents,
        lazyLoadedComponents,
        totalImages: images.length,
        lazyLoadedImages: images.filter((img) => img.hasLazyLoading).length,
        componentsRecommendedForLazyLoading,
      },
    };
  }

  /**
   * Generate suggestion for a Core Web Vitals issue
   */
  private generateSuggestionForIssue(issue: {
    type: "LCP" | "CLS" | "FID" | "INP";
    description: string;
    element?: string;
  }): string {
    switch (issue.type) {
      case "LCP":
        if (issue.description.includes("priority")) {
          return "Add priority={true} prop to above-the-fold images";
        }
        if (issue.description.includes("sizes")) {
          return "Add sizes prop with responsive breakpoints to Next.js Image";
        }
        if (issue.description.includes("Google Fonts")) {
          return "Add <link rel='preconnect' href='https://fonts.gstatic.com'> to document head";
        }
        return "Optimize image loading and consider using Next.js Image component";

      case "CLS":
        if (issue.description.includes("dimensions")) {
          return "Add width and height attributes to prevent layout shift";
        }
        return "Reserve space for dynamic content to prevent layout shifts";

      case "FID":
      case "INP":
        return "Optimize event handlers and consider debouncing for better interaction responsiveness";

      default:
        return "Review and optimize for better performance";
    }
  }

  /**
   * Count images that impact Core Web Vitals
   */
  private countImagesForCWVOptimization(
    sourceFile: ts.SourceFile,
    optimizations: { imageOptimization: number; lazyLoadingCandidates: number }
  ): void {
    const visitNode = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = JsxUtils.getTagName(node).toLowerCase();

        if (tagName === "img" || tagName === "image") {
          optimizations.imageOptimization++;

          // Check if it's a candidate for lazy loading (CWV perspective)
          const loading = JsxUtils.getAttribute(node, "loading");
          const priority = JsxUtils.getAttribute(node, "priority");

          if (
            (tagName === "img" && (!loading || loading !== "lazy")) ||
            (tagName === "image" && priority !== "true")
          ) {
            optimizations.lazyLoadingCandidates++;
          }
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
  }

  /**
   * Find which pages use a specific component
   */
  private findComponentPageUsage(component: ComponentRelation): string[] {
    const usedInPages: string[] = [];

    this.pageComponents.forEach((pageComponent, pagePath) => {
      if (
        pageComponent.content &&
        pageComponent.content.includes(component.name)
      ) {
        usedInPages.push(pagePath);
      }
    });

    return usedInPages;
  }

  /**
   * Evaluate if component should be lazy loaded for performance
   */
  private evaluateComponentForLazyLoading(
    component: ComponentRelation,
    staticImports: Array<{ isLargeLibrary: boolean; importType: string }>
  ): boolean {
    // Component should be lazy loaded if:
    // 1. It imports large libraries
    // 2. It's not used in critical pages
    // 3. It's a complex component (has many imports)

    const hasLargeLibraries = staticImports.some((imp) => imp.isLargeLibrary);
    const hasManyImports = staticImports.length > 10;
    const usedInPages = this.findComponentPageUsage(component);
    const isUsedInCriticalPages = usedInPages.some(
      (page) => page.includes("index") || page.includes("home") || page === "/"
    );

    return (hasLargeLibraries || hasManyImports) && !isUsedInCriticalPages;
  }

  /**
   * Generate explanation for why component should be lazy loaded
   */
  private generateLazyLoadingReason(
    component: ComponentRelation,
    staticImports: Array<{ isLargeLibrary: boolean; importPath: string }>
  ): string {
    const largeLibraries = staticImports.filter((imp) => imp.isLargeLibrary);

    if (largeLibraries.length > 0) {
      return `Uses heavy libraries: ${largeLibraries
        .map((lib) => lib.importPath)
        .join(", ")}`;
    }

    if (staticImports.length > 10) {
      return `Has many imports (${staticImports.length}) which may increase bundle size`;
    }

    return "Component complexity suggests lazy loading would improve performance";
  }

  /**
   * Identify the lazy loading method being used
   */
  private identifyLazyLoadingMethod(
    dynamicImports: Array<{ isNextDynamic: boolean }>
  ): "React.lazy" | "next/dynamic" | "none" {
    if (dynamicImports.length === 0) return "none";

    const hasNextDynamic = dynamicImports.some((imp) => imp.isNextDynamic);
    return hasNextDynamic ? "next/dynamic" : "React.lazy";
  }

  /**
   * Extract image lazy loading information from a component
   */
  private extractImageLazyLoadingInfo(
    sourceFile: ts.SourceFile,
    images: LazyLoadingAnalysis["images"],
    componentPath: string
  ): void {
    const visitNode = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = JsxUtils.getTagName(node).toLowerCase();

        if (tagName === "img" || tagName === "image") {
          const src = JsxUtils.getAttribute(node, "src");
          const loading = JsxUtils.getAttribute(node, "loading");
          const priority = JsxUtils.getAttribute(node, "priority");

          const hasLazyLoading =
            loading === "lazy" || (tagName === "image" && priority !== "true");
          const isAboveFold = this.estimateImagePosition(node);

          images.push({
            path: src || "inline-image",
            usedInPages: [componentPath],
            hasLazyLoading,
            isNextImage: tagName === "image",
            isAboveFold,
          });
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
  }

  /**
   * Estimate if image is above the fold (simplified heuristic)
   */
  private estimateImagePosition(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean | null {
    // Simplified heuristic: check if image appears early in the component structure
    const sourceFile = node.getSourceFile();
    const nodePosition = node.getStart();
    const fileLength = sourceFile.getEnd();

    // If image appears in first 30% of file, consider it potentially above fold
    return nodePosition / fileLength < 0.3 ? true : null; // null = can't determine
  }

  /**
   * Get Core Web Vitals and lazy loading improvement suggestions
   */
  public getPerformanceImprovementSuggestions(): string[] {
    const suggestions: string[] = [];

    const cwvAnalysis = this.analyzeCoreWebVitals();
    const lazyLoadingAnalysis = this.analyzeLazyLoading();

    // Core Web Vitals suggestions
    if (cwvAnalysis.statistics.totalPotentialIssues > 0) {
      suggestions.push(
        `Address ${cwvAnalysis.statistics.totalPotentialIssues} Core Web Vitals issues for better SEO`
      );
    }

    // Lazy loading suggestions
    if (
      lazyLoadingAnalysis.statistics.componentsRecommendedForLazyLoading > 0
    ) {
      suggestions.push(
        `Implement lazy loading for ${lazyLoadingAnalysis.statistics.componentsRecommendedForLazyLoading} components`
      );
    }

    if (
      lazyLoadingAnalysis.statistics.totalImages >
      lazyLoadingAnalysis.statistics.lazyLoadedImages
    ) {
      const unoptimizedImages =
        lazyLoadingAnalysis.statistics.totalImages -
        lazyLoadingAnalysis.statistics.lazyLoadedImages;
      suggestions.push(
        `Enable lazy loading for ${unoptimizedImages} images not above the fold`
      );
    }

    // Image optimization suggestions for CWV
    if (cwvAnalysis.optimizations.imageOptimization > 0) {
      suggestions.push(
        `Optimize ${cwvAnalysis.optimizations.imageOptimization} images for better LCP scores`
      );
    }

    return suggestions;
  }
}
