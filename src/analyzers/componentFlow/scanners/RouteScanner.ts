import * as path from "path";
import * as fs from "fs";
import {
  RouteStructure,
  RouteSegment,
  RouteMetadata,
  SpecialFileCoverage,
} from "../types";
import { SpecialFileCoverageScanner } from "./SpecialFileCoverageScanner";
import {
  isCatchAllSegment,
  isDynamicSegment,
  isPageFile,
  isRouteGroup,
  parseRoutePath,
} from "../utils";

/**
 * Scans Next.js app directory for routes and integrates special file coverage
 */
export class RouteScanner {
  private appDirectory: string;
  private specialFileScanner: SpecialFileCoverageScanner;
  private validExtensions: string[];

  constructor(appDirectory: string) {
    this.appDirectory = appDirectory;
    this.specialFileScanner = new SpecialFileCoverageScanner(appDirectory);
    this.validExtensions = [".js", ".jsx", ".ts", ".tsx"];
  }

  /**
   * Scans the entire app directory and returns all route structures
   */
  scanAllRoutes(): RouteStructure[] {
    const routes: RouteStructure[] = [];

    try {
      const pageFiles = this.findAllPageFiles(this.appDirectory);

      for (const pageFile of pageFiles) {
        const route = this.buildRouteStructure(pageFile);
        if (route) {
          routes.push(route);
        }
      }
    } catch (error) {
      console.error("Error scanning routes:", error);
    }

    return routes;
  }

  /**
   * Scans a specific route path
   */
  scanRoute(routePath: string): RouteStructure | null {
    const pageFilePath = this.findPageFile(routePath);

    if (!pageFilePath) {
      return null;
    }

    return this.buildRouteStructure(pageFilePath);
  }

  /**
   * Gets all route paths in the app directory
   */
  getAllRoutePaths(): string[] {
    const pageFiles = this.findAllPageFiles(this.appDirectory);
    return pageFiles.map((pageFile) => this.extractRoutePathFromFile(pageFile));
  }

  /**
   * Checks if a route exists
   */
  routeExists(routePath: string): boolean {
    return this.findPageFile(routePath) !== null;
  }

  /**
   * Gets route metadata for a specific path
   */
  getRouteMetadata(routePath: string): RouteMetadata | null {
    const segments = parseRoutePath(routePath);
    return this.buildRouteMetadata(segments, routePath);
  }

  /**
   * Finds all page.js/page.tsx files in the app directory
   */
  private findAllPageFiles(directory: string, basePath: string = ""): string[] {
    const pageFiles: string[] = [];

    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }

          // Recursively scan subdirectories
          pageFiles.push(...this.findAllPageFiles(fullPath, relativePath));
        } else if (entry.isFile()) {
          // Check if it's a page file
          if (isPageFile(entry.name)) {
            pageFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${directory}:`, error);
    }

    return pageFiles;
  }

  /**
   * Finds page file for a specific route path
   */
  private findPageFile(routePath: string): string | null {
    const segments = parseRoutePath(routePath);
    let currentPath = this.appDirectory;

    // Navigate through route segments
    for (const segment of segments) {
      currentPath = path.join(currentPath, segment);

      if (!fs.existsSync(currentPath)) {
        // Try to find dynamic route that matches
        const parentDir = path.dirname(currentPath);
        const dynamicMatch = this.findDynamicRouteMatch(parentDir, segment);

        if (dynamicMatch) {
          currentPath = path.join(parentDir, dynamicMatch);
        } else {
          return null;
        }
      }
    }

    // Look for page file in the final directory
    return this.findPageFileInDirectory(currentPath);
  }

  /**
   * Builds complete route structure from a page file
   */
  private buildRouteStructure(pageFilePath: string): RouteStructure | null {
    const routePath = this.extractRoutePathFromFile(pageFilePath);
    const segments = parseRoutePath(routePath);
    const metadata = this.buildRouteMetadata(segments, routePath);

    if (!metadata) {
      return null;
    }

    const routeSegments = this.buildRouteSegments(segments);

    return {
      routePath,
      pageFilePath,
      segments: routeSegments,
      metadata,
    };
  }

  /**
   * Builds route segments with special file coverage
   */
  private buildRouteSegments(segments: string[]): RouteSegment[] {
    const routeSegments: RouteSegment[] = [];

    // Add root segment
    const rootSpecialFiles = this.specialFileScanner.getSegmentSpecialFiles("");
    routeSegments.push({
      name: "",
      isDynamic: false,
      isCatchAll: false,
      isRouteGroup: false,
      specialFiles: rootSpecialFiles,
      depth: 0,
    });

    // Add each route segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentPath = segments.slice(0, i + 1).join("/");
      const specialFiles =
        this.specialFileScanner.getSegmentSpecialFiles(segmentPath);

      routeSegments.push({
        name: segment,
        isDynamic: isDynamicSegment(segment),
        isCatchAll: isCatchAllSegment(segment),
        isRouteGroup: isRouteGroup(segment),
        specialFiles,
        depth: i + 1,
      });
    }

    return routeSegments;
  }

  /**
   * Builds route metadata from segments
   */
  private buildRouteMetadata(
    segments: string[],
    routePath: string
  ): RouteMetadata | null {
    const isDynamic = segments.some((segment) => isDynamicSegment(segment));
    const isCatchAll = segments.some((segment) => isCatchAllSegment(segment));
    const routeGroups = segments.filter((segment) => isRouteGroup(segment));

    return {
      isDynamic,
      isCatchAll,
      routeGroup: routeGroups.length > 0 ? routeGroups[0] : undefined,
      depth: segments.length,
      segments: segments.filter((segment) => !isRouteGroup(segment)), // Exclude route groups from segments
    };
  }

  /**
   * Extracts route path from page file path
   */
  private extractRoutePathFromFile(pageFilePath: string): string {
    const relativePath = path.relative(
      this.appDirectory,
      path.dirname(pageFilePath)
    );

    if (!relativePath || relativePath === ".") {
      return "/";
    }

    // Convert file path to route path
    const segments = relativePath.split(path.sep);
    const routeSegments = segments.filter((segment) => !isRouteGroup(segment));

    return "/" + routeSegments.join("/");
  }

  /**
   * Finds page file in a specific directory
   */
  private findPageFileInDirectory(directory: string): string | null {
    try {
      for (const ext of this.validExtensions) {
        const pageFile = path.join(directory, `page${ext}`);
        if (fs.existsSync(pageFile)) {
          return pageFile;
        }
      }
    } catch (error) {
      console.warn(`Error searching for page file in ${directory}:`, error);
    }

    return null;
  }

  /**
   * Finds dynamic route match in a directory
   */
  private findDynamicRouteMatch(
    directory: string,
    segment: string
  ): string | null {
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && isDynamicSegment(entry.name)) {
          // Check if this dynamic route has a page file
          const pageFile = this.findPageFileInDirectory(
            path.join(directory, entry.name)
          );
          if (pageFile) {
            return entry.name;
          }
        }
      }
    } catch (error) {
      console.warn(`Error finding dynamic route match in ${directory}:`, error);
    }

    return null;
  }

  /**
   * Checks if a directory should be skipped during scanning
   */
  private shouldSkipDirectory(dirName: string): boolean {
    // Skip common non-route directories
    const skipDirs = [
      "node_modules",
      ".next",
      ".git",
      "public",
      "styles",
      "components",
      "lib",
      "utils",
    ];
    return skipDirs.includes(dirName) || dirName.startsWith(".");
  }

  /**
   * Gets special file coverage for a specific route
   */
  getRouteSpecialFileCoverage(routePath: string): SpecialFileCoverage | null {
    return this.specialFileScanner.scanRouteSpecialFiles(routePath);
  }

  /**
   * Gets coverage summary for all routes
   */
  getAllRoutesCoverageSummary(): {
    totalRoutes: number;
    routesWithMissingFiles: string[];
    averageCoverage: number;
  } {
    const routes = this.scanAllRoutes();
    const routesWithMissingFiles: string[] = [];
    let totalCoverage = 0;

    for (const route of routes) {
      const coverage = this.specialFileScanner.scanRouteSpecialFiles(
        route.routePath
      );
      const summary = this.specialFileScanner.getCoverageSummary(coverage);

      totalCoverage += summary.coveragePercentage;

      if (summary.missingFiles.length > 0) {
        routesWithMissingFiles.push(route.routePath);
      }
    }

    return {
      totalRoutes: routes.length,
      routesWithMissingFiles,
      averageCoverage: routes.length > 0 ? totalCoverage / routes.length : 0,
    };
  }
}
