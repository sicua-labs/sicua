import path from "path-browserify";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";
import { NormalizedLink } from "../types/internalTypes";
import { UI_COMPONENT_PATTERNS } from "../../../constants/uiPatterns";

/**
 * Utility functions for route extraction and normalization
 */
export class RouteUtils {
  /**
   * Extracts route from file path based on framework patterns
   */
  // RouteUtils.ts - updated extractRouteFromPath function
  public static extractRouteFromPath(filePath: string): string | null {
    // Skip route extraction for UI components
    if (this.isLikelyUIComponent(filePath)) {
      return null;
    }

    const normalizedPath = path.normalize(filePath);

    // Handle Next.js style routes
    if (
      normalizedPath.includes("/pages/") ||
      normalizedPath.includes("\\pages\\")
    ) {
      return this.extractNextJsRoute(normalizedPath);
    }

    // Handle React Router style routes
    if (
      normalizedPath.includes("/routes/") ||
      normalizedPath.includes("\\routes\\")
    ) {
      return this.extractReactRouterRoute(normalizedPath);
    }

    // Handle app directory routes (Next.js 13+)
    if (
      normalizedPath.includes("/app/") ||
      normalizedPath.includes("\\app\\")
    ) {
      return this.extractAppDirRoute(normalizedPath);
    }

    return null;
  }

  /**
   * Enhanced App Router route extraction with full Next.js 13+ support
   */
  public static extractAppDirRoute(filePath: string): string {
    const appDir = "/app/";
    const routeStart = filePath.indexOf(appDir) + appDir.length;
    let route = filePath.slice(routeStart);

    // Normalize path separators
    route = route.replace(/\\/g, "/");

    // Remove file extension and /page suffix
    route = route.replace(/\.[^/.]+$/, "");
    route = route.replace(/\/page$/, "");

    // Handle App Router special files - they don't affect routing
    const specialFiles = [
      "layout",
      "loading",
      "error",
      "not-found",
      "global-error",
      "template",
      "default",
    ];
    const fileName = path.basename(route);
    if (specialFiles.includes(fileName)) {
      // For special files, return the directory they're in as the route
      route = path.dirname(route);
    }

    // Handle route groups (parentheses are ignored in routing)
    route = route.replace(/\([^)]+\)\//g, "");

    // Handle parallel routes (@folder becomes empty in actual routing)
    route = route.replace(/@[^/]+\//g, "");

    // Handle dynamic segments
    route = route.replace(/\[([^\]]+)\]/g, ":$1");

    // Handle catch-all segments
    route = route.replace(/\[\.\.\.([^\]]+)\]/g, "*$1");

    // Handle optional catch-all segments
    route = route.replace(/\[\[\.\.\.([^\]]+)\]\]/g, "*$1?");

    // Handle intercepting routes
    route = route.replace(/\(\.\.\.\)/g, "");
    route = route.replace(/\(\.\)\//g, "");
    route = route.replace(/\(\.\.\)\//g, "");

    // Clean up multiple slashes
    route = route.replace(/\/+/g, "/");

    // Handle index routes
    if (route === "" || route === "/") route = "/";

    // Ensure route starts with /
    if (!route.startsWith("/")) {
      route = "/" + route;
    }

    // Remove trailing slash unless it's root
    if (route !== "/" && route.endsWith("/")) {
      route = route.slice(0, -1);
    }

    return route;
  }

  /**
   * Extracts route groups from App Router path
   */
  public static extractRouteGroups(filePath: string): string[] {
    const normalizedPath = path.normalize(filePath);
    const routeGroups: string[] = [];

    // Find all route group patterns (text in parentheses)
    const routeGroupMatches = normalizedPath.match(/\([^)]+\)/g);

    if (routeGroupMatches) {
      routeGroups.push(...routeGroupMatches);
    }

    return routeGroups;
  }

  /**
   * Extracts parallel route slots from App Router path
   */
  public static extractParallelRoutes(filePath: string): Array<{
    slot: string;
    path: string;
  }> {
    const normalizedPath = path.normalize(filePath);
    const parallelRoutes: Array<{ slot: string; path: string }> = [];

    // Find all parallel route patterns (@slot)
    const parallelRouteMatches = normalizedPath.match(/@[^/\\]+/g);

    if (parallelRouteMatches) {
      parallelRouteMatches.forEach((match) => {
        const slotIndex = normalizedPath.indexOf(match);
        const slotPath = normalizedPath.substring(0, slotIndex + match.length);

        parallelRoutes.push({
          slot: match,
          path: slotPath,
        });
      });
    }

    return parallelRoutes;
  }

  /**
   * Determines if a path represents an intercepting route
   */
  public static isInterceptingRoute(filePath: string): {
    isIntercepting: boolean;
    interceptType: "(..)" | "(...)" | "(....)" | "(.)" | null;
    targetRoute: string | null;
  } {
    const normalizedPath = path.normalize(filePath);

    // Check for intercepting route patterns
    const interceptPatterns = [
      { pattern: /\(\.\.\.\)/, type: "(...)" as const },
      { pattern: /\(\.\.\.\.\)/, type: "(....)" as const },
      { pattern: /\(\.\.\)/, type: "(..)" as const },
      { pattern: /\(\.\)/, type: "(.)" as const },
    ];

    for (const { pattern, type } of interceptPatterns) {
      if (pattern.test(normalizedPath)) {
        // Extract the target route (everything after the intercept pattern)
        const match = normalizedPath.match(pattern);
        if (match) {
          const interceptIndex = normalizedPath.indexOf(match[0]);
          const targetRoute = normalizedPath.substring(
            interceptIndex + match[0].length
          );

          return {
            isIntercepting: true,
            interceptType: type,
            targetRoute: targetRoute || null,
          };
        }
      }
    }

    return {
      isIntercepting: false,
      interceptType: null,
      targetRoute: null,
    };
  }

  /**
   * Gets the layout hierarchy for a given route
   */
  public static getLayoutHierarchy(filePath: string): string[] {
    const normalizedPath = path.normalize(filePath);
    const layouts: string[] = [];

    if (
      !normalizedPath.includes("/app/") &&
      !normalizedPath.includes("\\app\\")
    ) {
      return layouts;
    }

    const appDir = normalizedPath.includes("/app/") ? "/app/" : "\\app\\";
    const appDirIndex = normalizedPath.indexOf(appDir);
    const routePath = normalizedPath.substring(appDirIndex + appDir.length);

    // Get all directory segments
    const segments = path
      .dirname(routePath)
      .split(/[/\\]/)
      .filter((segment) => segment && segment !== ".");

    // Build layout paths from root to current level
    let currentPath = normalizedPath.substring(
      0,
      appDirIndex + appDir.length - 1
    );

    for (const segment of segments) {
      currentPath = path.join(currentPath, segment);
      const layoutPath = path.join(currentPath, "layout.tsx");
      layouts.push(layoutPath.replace(/\\/g, "/"));
    }

    return layouts;
  }

  /**
   * Checks if a route has dynamic segments
   */
  public static hasDynamicSegments(route: string): {
    hasDynamic: boolean;
    segments: Array<{
      type: "dynamic" | "catch-all" | "optional-catch-all";
      name: string;
      optional: boolean;
    }>;
  } {
    const segments: Array<{
      type: "dynamic" | "catch-all" | "optional-catch-all";
      name: string;
      optional: boolean;
    }> = [];

    // Dynamic segments [param]
    const dynamicMatches = route.match(/\[([^\]]+)\]/g);
    if (dynamicMatches) {
      dynamicMatches.forEach((match) => {
        const paramName = match.slice(1, -1);

        if (paramName.startsWith("...")) {
          // Catch-all segment
          segments.push({
            type: "catch-all",
            name: paramName.slice(3),
            optional: false,
          });
        } else {
          // Regular dynamic segment
          segments.push({
            type: "dynamic",
            name: paramName,
            optional: false,
          });
        }
      });
    }

    // Optional catch-all segments [[...param]]
    const optionalCatchAllMatches = route.match(/\[\[\.\.\.([^\]]+)\]\]/g);
    if (optionalCatchAllMatches) {
      optionalCatchAllMatches.forEach((match) => {
        const paramName = match.slice(5, -2); // Remove [[... and ]]
        segments.push({
          type: "optional-catch-all",
          name: paramName,
          optional: true,
        });
      });
    }

    return {
      hasDynamic: segments.length > 0,
      segments,
    };
  }

  // RouteUtils.ts - new helper method
  private static isLikelyUIComponent(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);

    // Check if it's in a components directory
    if (
      normalizedPath.includes("/components/") ||
      normalizedPath.includes("\\components\\")
    ) {
      // Check if it's not a page component inside a components directory
      return (
        !normalizedPath.endsWith("page.tsx") &&
        !normalizedPath.endsWith("page.jsx") &&
        !normalizedPath.endsWith("Page.tsx") &&
        !normalizedPath.endsWith("Page.jsx")
      );
    }

    // Check for common UI component file names
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

  /**
   * Extracts route from Next.js pages directory
   */
  public static extractNextJsRoute(filePath: string): string {
    const pagesDir = "/pages/";
    const routeStart = filePath.indexOf(pagesDir) + pagesDir.length;
    let route = filePath.slice(routeStart);

    // Normalize path separators
    route = route.replace(/\\/g, "/");

    // Remove file extension
    route = route.replace(/\.[^/.]+$/, "");

    // Handle dynamic routes
    route = route.replace(/\[([^\]]+)\]/g, ":$1");

    // Handle catch-all routes
    route = route.replace(/\.\.\./g, "*");

    // Handle index routes
    route = route.replace(/\/index$/, "/");
    if (route === "index") route = "/";

    // Ensure route starts with /
    return route.startsWith("/") ? route : "/" + route;
  }

  /**
   * Extracts route from React Router routes directory
   */
  public static extractReactRouterRoute(filePath: string): string {
    const routesDir = "/routes/";
    const routeStart = filePath.indexOf(routesDir) + routesDir.length;
    let route = filePath.slice(routeStart);

    // Normalize path separators
    route = route.replace(/\\/g, "/");

    // Remove file extension
    route = route.replace(/\.[^/.]+$/, "");

    // Handle index routes
    route = route.replace(/\/index$/, "/");
    if (route === "index") route = "/";

    // Ensure route starts with /
    return route.startsWith("/") ? route : "/" + route;
  }

  /**
   * Normalizes a link path for consistent analysis
   */
  public static normalizeLinkPath(
    link: string,
    sourcePath: string
  ): NormalizedLink {
    const isRelative = link.startsWith(".") || !link.startsWith("/");

    let normalizedPath = link;

    if (isRelative) {
      // Convert relative path to absolute
      const sourceDir = path.dirname(sourcePath);
      normalizedPath = path.join(path.dirname(sourceDir), link);
      normalizedPath = normalizedPath.replace(/\\/g, "/");

      // Ensure it starts with /
      if (!normalizedPath.startsWith("/")) {
        normalizedPath = "/" + normalizedPath;
      }
    }

    // Clean up the path
    normalizedPath = path.normalize(normalizedPath).replace(/\\/g, "/");

    // Remove file extensions
    normalizedPath = normalizedPath.replace(/\.(jsx?|tsx?)$/, "");

    // Handle index routes
    normalizedPath = normalizedPath.replace(/\/index$/, "/");

    return {
      to: normalizedPath,
      isRelative,
    };
  }

  /**
   * Extracts route params from a route string
   */
  public static extractRouteParams(route: string): string[] {
    return SeoRelated.extractRouteParams(route);
  }

  /**
   * Checks if a route is a dynamic route
   */
  public static isDynamicRoute(route: string): boolean {
    return route.includes(":") || route.includes("*");
  }

  /**
   * Gets matching routes between file system routes and route definitions
   */
  public static findMatchingRoutes(
    fileSystemRoutes: string[],
    routeDefinitions: string[]
  ): Map<string, string[]> {
    const matches = new Map<string, string[]>();

    // For each route definition, find matching file system route
    routeDefinitions.forEach((routeDef) => {
      const matchingRoutes = fileSystemRoutes.filter((fsRoute) => {
        // Convert both routes to regex patterns for matching
        const fsRoutePattern = this.routeToRegexPattern(fsRoute);
        const routeDefPattern = this.routeToRegexPattern(routeDef);

        return fsRoutePattern === routeDefPattern;
      });

      if (matchingRoutes.length > 0) {
        matches.set(routeDef, matchingRoutes);
      }
    });

    return matches;
  }

  /**
   * Converts a route to a regex pattern for matching
   */
  private static routeToRegexPattern(route: string): string {
    // Remove trailing slashes for consistency
    let pattern = route.replace(/\/+$/, "");

    // Replace param patterns with generic pattern
    pattern = pattern.replace(/:[^/]+/g, ":param");

    // Replace catch-all patterns
    pattern = pattern.replace(/\*[^/]*/g, "*");

    return pattern;
  }
}
