import { ComponentRelation } from "../../../types";
import {
  AppRouterSpecialFiles,
  LayoutHierarchy,
  RouteGroupAnalysis,
  ParallelRouteAnalysis,
} from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { RouteUtils } from "../utils/routeUtils";
import { SpecialFileAnalyzer } from "./specialFileAnalyzer";
import { LayoutAnalyzer } from "./layoutAnalyzer";
import { PageComponentMap } from "../types/internalTypes";
import path from "path-browserify";

/**
 * Main analyzer for App Router specific features and SEO implications
 */
export class AppRouterAnalyzer {
  private pageComponents: PageComponentMap;
  private allComponents: ComponentRelation[];
  private specialFileAnalyzer: SpecialFileAnalyzer;
  private layoutAnalyzer: LayoutAnalyzer;

  constructor(
    pageComponents: PageComponentMap,
    allComponents: ComponentRelation[]
  ) {
    this.pageComponents = pageComponents;
    this.allComponents = allComponents;
    this.specialFileAnalyzer = new SpecialFileAnalyzer(
      pageComponents,
      allComponents
    );
    this.layoutAnalyzer = new LayoutAnalyzer(allComponents);
  }

  /**
   * Perform comprehensive App Router analysis
   */
  public analyzeAppRouter(): {
    specialFiles: AppRouterSpecialFiles;
    layoutHierarchy: LayoutHierarchy;
    routeGroups: RouteGroupAnalysis;
    parallelRoutes: ParallelRouteAnalysis;
  } {
    return {
      specialFiles: this.specialFileAnalyzer.analyzeSpecialFiles(),
      layoutHierarchy: this.layoutAnalyzer.analyzeLayoutHierarchy(),
      routeGroups: this.analyzeRouteGroups(),
      parallelRoutes: this.analyzeParallelRoutes(),
    };
  }

  /**
   * Analyze route groups in the App Router structure
   */
  private analyzeRouteGroups(): RouteGroupAnalysis {
    const routeGroupMap = new Map<
      string,
      {
        name: string;
        path: string;
        routes: Set<string>;
        hasLayout: boolean;
        hasSpecialFiles: Set<string>;
      }
    >();

    // Analyze all components for route group patterns
    this.allComponents.forEach((component) => {
      const routeGroupInfo = ComponentUtils.getRouteGroupInfo(component);

      if (
        routeGroupInfo.isInRouteGroup &&
        routeGroupInfo.routeGroupName &&
        routeGroupInfo.routeGroupPath
      ) {
        const groupKey = routeGroupInfo.routeGroupPath;

        if (!routeGroupMap.has(groupKey)) {
          routeGroupMap.set(groupKey, {
            name: routeGroupInfo.routeGroupName,
            path: routeGroupInfo.routeGroupPath,
            routes: new Set(),
            hasLayout: false,
            hasSpecialFiles: new Set(),
          });
        }

        const groupData = routeGroupMap.get(groupKey)!;

        // Check if this is a special file
        const specialFileInfo =
          ComponentUtils.isAppRouterSpecialFile(component);
        if (specialFileInfo.isSpecialFile && specialFileInfo.fileType) {
          groupData.hasSpecialFiles.add(specialFileInfo.fileType);

          if (specialFileInfo.fileType === "layout") {
            groupData.hasLayout = true;
          }
        } else {
          // Add regular routes
          const route = RouteUtils.extractRouteFromPath(component.fullPath);
          if (route) {
            groupData.routes.add(route);
          }
        }
      }
    });

    // Convert to final format
    const routeGroups = Array.from(routeGroupMap.values()).map((group) => ({
      name: group.name,
      path: group.path,
      routes: Array.from(group.routes),
      hasLayout: group.hasLayout,
      hasSpecialFiles: Array.from(group.hasSpecialFiles),
    }));

    // Calculate statistics
    const totalRoutes = this.getAllRoutes().length;
    const routesInGroups = routeGroups.reduce(
      (sum, group) => sum + group.routes.length,
      0
    );
    const ungroupedRoutes = totalRoutes - routesInGroups;

    return {
      routeGroups,
      statistics: {
        totalRouteGroups: routeGroups.length,
        routesInGroups,
        ungroupedRoutes,
      },
    };
  }

  /**
   * Analyze parallel routes in the App Router structure
   */
  private analyzeParallelRoutes(): ParallelRouteAnalysis {
    const parallelRouteMap = new Map<
      string,
      {
        name: string;
        path: string;
        parentRoute: string;
        defaultSlot: boolean;
        hasDefault: boolean;
        routes: Set<string>;
      }
    >();

    // Analyze all components for parallel route patterns
    this.allComponents.forEach((component) => {
      const parallelRouteInfo = ComponentUtils.getParallelRouteInfo(component);

      if (
        parallelRouteInfo.isParallelRoute &&
        parallelRouteInfo.slotName &&
        parallelRouteInfo.parentRoute
      ) {
        const slotKey = `${parallelRouteInfo.parentRoute}/${parallelRouteInfo.slotName}`;

        if (!parallelRouteMap.has(slotKey)) {
          parallelRouteMap.set(slotKey, {
            name: parallelRouteInfo.slotName,
            path: component.fullPath,
            parentRoute: parallelRouteInfo.parentRoute,
            defaultSlot: parallelRouteInfo.isDefaultSlot,
            hasDefault: false,
            routes: new Set(),
          });
        }

        const slotData = parallelRouteMap.get(slotKey)!;

        if (parallelRouteInfo.isDefaultSlot) {
          slotData.hasDefault = true;
        }

        // Extract route for this parallel segment
        const route = RouteUtils.extractRouteFromPath(component.fullPath);
        if (route) {
          slotData.routes.add(route);
        }
      }
    });

    // Check for default.tsx files in parallel routes
    this.allComponents.forEach((component) => {
      const fileName = path.basename(
        component.fullPath,
        path.extname(component.fullPath)
      );

      if (fileName === "default") {
        const parallelRoutes = RouteUtils.extractParallelRoutes(
          component.fullPath
        );

        parallelRoutes.forEach(({ slot, path: slotPath }) => {
          const parentRoute = path.dirname(slotPath);
          const slotKey = `${parentRoute}/${slot}`;

          if (parallelRouteMap.has(slotKey)) {
            parallelRouteMap.get(slotKey)!.hasDefault = true;
          }
        });
      }
    });

    // Convert to final format
    const parallelRoutes = Array.from(parallelRouteMap.values()).map(
      (slot) => ({
        name: slot.name,
        path: slot.path,
        parentRoute: slot.parentRoute,
        defaultSlot: slot.defaultSlot,
        hasDefault: slot.hasDefault,
        routes: Array.from(slot.routes),
      })
    );

    // Calculate statistics
    const parallelRoutesWithDefaults = parallelRoutes.filter(
      (route) => route.hasDefault
    ).length;
    const routesWithParallelSegments = new Set(
      parallelRoutes.map((route) => route.parentRoute)
    ).size;

    return {
      parallelRoutes,
      statistics: {
        totalParallelRoutes: parallelRoutes.length,
        parallelRoutesWithDefaults,
        routesWithParallelSegments,
      },
    };
  }

  /**
   * Get all routes from page components
   */
  private getAllRoutes(): string[] {
    const routes: string[] = [];

    this.pageComponents.forEach((component, path) => {
      const route = RouteUtils.extractRouteFromPath(path);
      if (route) {
        routes.push(route);
      }
    });

    return routes;
  }

  /**
   * Get comprehensive App Router improvement suggestions
   */
  public getAppRouterImprovementSuggestions(): {
    specialFiles: string[];
    layouts: string[];
    routeGroups: string[];
    parallelRoutes: string[];
    general: string[];
  } {
    const specialFilesSuggestions =
      this.specialFileAnalyzer.getSpecialFileImprovementSuggestions();
    const layoutSuggestions =
      this.layoutAnalyzer.getLayoutImprovementSuggestions();
    const routeGroupAnalysis = this.analyzeRouteGroups();
    const parallelRouteAnalysis = this.analyzeParallelRoutes();

    // Route group suggestions
    const routeGroupSuggestions: string[] = [];
    if (
      routeGroupAnalysis.statistics.ungroupedRoutes >
      routeGroupAnalysis.statistics.routesInGroups
    ) {
      routeGroupSuggestions.push(
        "Consider organizing routes into route groups for better structure and shared layouts"
      );
    }

    routeGroupAnalysis.routeGroups.forEach((group) => {
      if (!group.hasLayout && group.routes.length > 2) {
        routeGroupSuggestions.push(
          `Add a layout.tsx to route group ${group.name} for shared UI and metadata`
        );
      }
    });

    // Parallel route suggestions
    const parallelRouteSuggestions: string[] = [];
    parallelRouteAnalysis.parallelRoutes.forEach((route) => {
      if (!route.hasDefault) {
        parallelRouteSuggestions.push(
          `Add default.tsx for parallel route ${route.name} to handle unmatched segments`
        );
      }
    });

    if (
      parallelRouteAnalysis.statistics.totalParallelRoutes > 0 &&
      parallelRouteAnalysis.statistics.parallelRoutesWithDefaults <
        parallelRouteAnalysis.statistics.totalParallelRoutes
    ) {
      parallelRouteSuggestions.push(
        "Ensure all parallel routes have default.tsx files to prevent navigation errors"
      );
    }

    // General App Router suggestions
    const generalSuggestions: string[] = [];

    // Check for proper App Router adoption
    const hasAppRouter = this.allComponents.some(
      (component) =>
        component.fullPath.includes("/app/") ||
        component.fullPath.includes("\\app\\")
    );

    if (!hasAppRouter) {
      generalSuggestions.push(
        "Consider migrating to App Router for better SEO features and performance"
      );
    }

    // Check for intercepting routes usage
    const interceptingRoutes = this.allComponents.filter(
      (component) =>
        RouteUtils.isInterceptingRoute(component.fullPath).isIntercepting
    );

    if (interceptingRoutes.length > 0) {
      generalSuggestions.push(
        "Review intercepting routes for proper SEO handling and fallback pages"
      );
    }

    return {
      specialFiles: specialFilesSuggestions,
      layouts: layoutSuggestions,
      routeGroups: routeGroupSuggestions,
      parallelRoutes: parallelRouteSuggestions,
      general: generalSuggestions,
    };
  }

  /**
   * Analyze App Router SEO readiness
   */
  public analyzeSEOReadiness(): {
    score: number;
    issues: Array<{
      category: "critical" | "warning" | "suggestion";
      message: string;
      impact: "high" | "medium" | "low";
    }>;
  } {
    const issues: Array<{
      category: "critical" | "warning" | "suggestion";
      message: string;
      impact: "high" | "medium" | "low";
    }> = [];

    const specialFiles = this.specialFileAnalyzer.analyzeSpecialFiles();
    const layoutHierarchy = this.layoutAnalyzer.analyzeLayoutHierarchy();

    // Check for root layout
    const rootLayout = layoutHierarchy.layouts.find((l) => l.level === 0);
    if (!rootLayout) {
      issues.push({
        category: "critical",
        message: "Missing root layout - required for global metadata and SEO",
        impact: "high",
      });
    } else if (!rootLayout.hasMetadata) {
      issues.push({
        category: "warning",
        message:
          "Root layout lacks metadata - missed opportunity for global SEO",
        impact: "medium",
      });
    }

    // Check for metadata conflicts
    if (layoutHierarchy.statistics.layoutsWithMetadataConflicts > 0) {
      issues.push({
        category: "warning",
        message: `${layoutHierarchy.statistics.layoutsWithMetadataConflicts} layout(s) have metadata conflicts`,
        impact: "medium",
      });
    }

    // Check for error handling
    const errorFiles = specialFiles.files.filter((f) => f.type === "error");
    if (errorFiles.length === 0) {
      issues.push({
        category: "suggestion",
        message:
          "No error.tsx files found - consider adding for better error handling",
        impact: "low",
      });
    }

    // Check for loading states
    const loadingFiles = specialFiles.files.filter((f) => f.type === "loading");
    if (loadingFiles.length === 0) {
      issues.push({
        category: "suggestion",
        message: "No loading.tsx files found - consider adding for better UX",
        impact: "low",
      });
    }

    // Calculate score based on issues
    let score = 100;
    issues.forEach((issue) => {
      switch (issue.category) {
        case "critical":
          score -= issue.impact === "high" ? 30 : 20;
          break;
        case "warning":
          score -= issue.impact === "high" ? 15 : 10;
          break;
        case "suggestion":
          score -= 5;
          break;
      }
    });

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * Get detailed route analysis
   */
  public getDetailedRouteAnalysis(): Array<{
    route: string;
    hasLayout: boolean;
    hasLoading: boolean;
    hasError: boolean;
    hasMetadata: boolean;
    routeGroup: string | null;
    parallelRoutes: string[];
    seoScore: number;
  }> {
    const routes = this.getAllRoutes();
    const specialFiles = this.specialFileAnalyzer.analyzeSpecialFiles();
    const layoutHierarchy = this.layoutAnalyzer.analyzeLayoutHierarchy();
    const routeGroups = this.analyzeRouteGroups();
    const parallelRoutes = this.analyzeParallelRoutes();

    return routes.map((route) => {
      // Find relevant special files for this route
      const routeSpecialFiles = specialFiles.files.filter(
        (f) => route.startsWith(f.routeSegment) || f.routeSegment === "/"
      );

      const hasLayout = routeSpecialFiles.some((f) => f.type === "layout");
      const hasLoading = routeSpecialFiles.some((f) => f.type === "loading");
      const hasError = routeSpecialFiles.some((f) => f.type === "error");

      // Check for metadata in any affecting layout
      const affectingLayouts = layoutHierarchy.layouts.filter(
        (l) => route.startsWith(l.routeSegment) || l.routeSegment === "/"
      );
      const hasMetadata = affectingLayouts.some((l) => l.hasMetadata);

      // Find route group
      const routeGroup =
        routeGroups.routeGroups.find((g) => g.routes.includes(route))?.name ||
        null;

      // Find parallel routes
      const routeParallelRoutes = parallelRoutes.parallelRoutes
        .filter((p) => p.parentRoute === route)
        .map((p) => p.name);

      // Calculate SEO score for this route
      let seoScore = 50; // Base score
      if (hasLayout) seoScore += 15;
      if (hasLoading) seoScore += 10;
      if (hasError) seoScore += 10;
      if (hasMetadata) seoScore += 15;

      return {
        route,
        hasLayout,
        hasLoading,
        hasError,
        hasMetadata,
        routeGroup,
        parallelRoutes: routeParallelRoutes,
        seoScore,
      };
    });
  }
}
