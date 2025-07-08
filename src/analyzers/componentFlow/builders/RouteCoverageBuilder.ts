import {
  RouteStructure,
  SpecialFileCoverage,
  CoverageMetrics,
  CoverageRecommendation,
  RiskLevel,
  RouteCoverageAnalysis,
} from "../types";
import { SpecialFileCoverageScanner } from "../scanners/SpecialFileCoverageScanner";

/**
 * Builds comprehensive coverage analysis for routes
 */
export class RouteCoverageBuilder {
  private specialFileScanner: SpecialFileCoverageScanner;

  constructor(appDirectory: string) {
    this.specialFileScanner = new SpecialFileCoverageScanner(appDirectory);
  }

  /**
   * Builds coverage analysis for a single route
   */
  buildRouteCoverage(routeStructure: RouteStructure): RouteCoverageAnalysis {
    const specialFilesCoverage = this.specialFileScanner.scanRouteSpecialFiles(
      routeStructure.routePath
    );
    const coverageMetrics = this.calculateCoverageMetrics(
      specialFilesCoverage,
      routeStructure
    );
    const recommendations = this.generateRecommendations(
      specialFilesCoverage,
      routeStructure
    );
    const riskAssessment = this.assessRisk(coverageMetrics, routeStructure);

    return {
      routePath: routeStructure.routePath,
      routeMetadata: routeStructure.metadata,
      specialFilesCoverage,
      coverageMetrics,
      recommendations,
      riskAssessment,
    };
  }

  /**
   * Builds coverage analysis for multiple routes
   */
  buildMultipleRoutesCoverage(
    routeStructures: RouteStructure[]
  ): RouteCoverageAnalysis[] {
    return routeStructures.map((route) => this.buildRouteCoverage(route));
  }

  /**
   * Builds overall coverage summary across all routes
   */
  buildOverallCoverageSummary(routeCoverages: RouteCoverageAnalysis[]): {
    totalRoutes: number;
    averageCoverage: number;
    criticalRiskRoutes: string[];
    highRiskRoutes: string[];
    mostCommonMissingFiles: { fileName: string; count: number }[];
    recommendations: CoverageRecommendation[];
  } {
    const totalRoutes = routeCoverages.length;
    const totalCoverage = routeCoverages.reduce(
      (sum, route) => sum + route.coverageMetrics.coveragePercentage,
      0
    );
    const averageCoverage = totalRoutes > 0 ? totalCoverage / totalRoutes : 0;

    const criticalRiskRoutes = routeCoverages
      .filter((route) => route.riskAssessment === "critical")
      .map((route) => route.routePath);

    const highRiskRoutes = routeCoverages
      .filter((route) => route.riskAssessment === "high")
      .map((route) => route.routePath);

    const missingFilesCount = new Map<string, number>();
    const allRecommendations: CoverageRecommendation[] = [];

    for (const route of routeCoverages) {
      // Count missing files
      for (const missingFile of route.coverageMetrics.missingFiles) {
        missingFilesCount.set(
          missingFile,
          (missingFilesCount.get(missingFile) || 0) + 1
        );
      }

      // Collect high-priority recommendations
      allRecommendations.push(
        ...route.recommendations.filter((rec) => rec.priority === "high")
      );
    }

    const mostCommonMissingFiles = Array.from(missingFilesCount.entries())
      .map(([fileName, count]) => ({ fileName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRoutes,
      averageCoverage,
      criticalRiskRoutes,
      highRiskRoutes,
      mostCommonMissingFiles,
      recommendations: this.deduplicateRecommendations(allRecommendations),
    };
  }

  /**
   * Calculates detailed coverage metrics
   */
  private calculateCoverageMetrics(
    coverage: SpecialFileCoverage,
    routeStructure: RouteStructure
  ): CoverageMetrics {
    const missingFiles: string[] = [];
    let totalRequiredFiles = 0;
    let existingFiles = 0;

    // Analyze layout coverage
    const layoutTotal = coverage.layout.length;
    const layoutExisting = coverage.layout.filter(
      (layout) => layout.exists
    ).length;
    const layoutMissing = coverage.layout
      .filter((layout) => !layout.exists)
      .map((layout) => `layout (${layout.routeSegment || "root"})`);

    totalRequiredFiles += layoutTotal;
    existingFiles += layoutExisting;
    missingFiles.push(...layoutMissing);

    // Analyze other special files
    const specialFiles = [
      { name: "template", info: coverage.template },
      { name: "error", info: coverage.error },
      { name: "loading", info: coverage.loading },
      { name: "not-found", info: coverage.notFound },
    ];

    for (const file of specialFiles) {
      if (file.info) {
        totalRequiredFiles += 1;
        if (file.info.exists) {
          existingFiles += 1;
        } else {
          missingFiles.push(file.name);
        }
      }
    }

    const coveragePercentage =
      totalRequiredFiles > 0 ? (existingFiles / totalRequiredFiles) * 100 : 100;

    return {
      totalRequiredFiles,
      existingFiles,
      missingFiles,
      coveragePercentage,
      layoutCoverage: {
        total: layoutTotal,
        existing: layoutExisting,
        missing: layoutMissing,
      },
      errorHandlingCoverage: {
        hasErrorBoundary: coverage.error?.exists || false,
        hasNotFound: coverage.notFound?.exists || false,
        hasLoading: coverage.loading?.exists || false,
      },
    };
  }

  /**
   * Generates recommendations based on coverage analysis
   */
  private generateRecommendations(
    coverage: SpecialFileCoverage,
    routeStructure: RouteStructure
  ): CoverageRecommendation[] {
    const recommendations: CoverageRecommendation[] = [];

    // Check for missing root layout
    const rootLayout = coverage.layout.find(
      (layout) => layout.routeSegment === ""
    );
    if (!rootLayout?.exists) {
      recommendations.push({
        type: "missing_file",
        priority: "high",
        message: "Missing root layout.tsx - required for all Next.js apps",
        filePath: "app/layout.tsx",
        action: "Create a root layout file with html and body tags",
      });
    }

    // Check for missing error boundaries
    if (!coverage.error?.exists) {
      recommendations.push({
        type: "missing_file",
        priority: routeStructure.metadata.isDynamic ? "high" : "medium",
        message: "Missing error.tsx - recommended for error handling",
        filePath: `app${routeStructure.routePath}/error.tsx`,
        action: "Create an error boundary to handle runtime errors gracefully",
      });
    }

    // Check for missing loading UI
    if (!coverage.loading?.exists) {
      recommendations.push({
        type: "missing_file",
        priority: "medium",
        message:
          "Missing loading.tsx - improves user experience during data fetching",
        filePath: `app${routeStructure.routePath}/loading.tsx`,
        action:
          "Create a loading component to show while the page is being rendered",
      });
    }

    // Check for missing not-found page
    if (!coverage.notFound?.exists && routeStructure.metadata.isDynamic) {
      recommendations.push({
        type: "missing_file",
        priority: "medium",
        message: "Missing not-found.tsx - recommended for dynamic routes",
        filePath: `app${routeStructure.routePath}/not-found.tsx`,
        action: "Create a not-found page for when dynamic routes don't match",
      });
    }

    // Performance recommendations
    if (routeStructure.metadata.depth > 3 && !coverage.template?.exists) {
      recommendations.push({
        type: "performance",
        priority: "low",
        message:
          "Consider using template.tsx for deeply nested routes to optimize re-renders",
        filePath: `app${routeStructure.routePath}/template.tsx`,
        action:
          "Create a template file if you need to re-render the layout on navigation",
      });
    }

    // Best practice recommendations
    if (routeStructure.metadata.isCatchAll && !coverage.notFound?.exists) {
      recommendations.push({
        type: "best_practice",
        priority: "high",
        message: "Catch-all routes should have proper not-found handling",
        filePath: `app${routeStructure.routePath}/not-found.tsx`,
        action: "Create a not-found page to handle unmatched catch-all routes",
      });
    }

    return recommendations;
  }

  /**
   * Assesses risk level based on coverage metrics and route characteristics
   */
  private assessRisk(
    metrics: CoverageMetrics,
    routeStructure: RouteStructure
  ): RiskLevel {
    let riskScore = 0;

    // Coverage percentage impact
    if (metrics.coveragePercentage < 50) {
      riskScore += 3;
    } else if (metrics.coveragePercentage < 75) {
      riskScore += 2;
    } else if (metrics.coveragePercentage < 90) {
      riskScore += 1;
    }

    // Missing critical files
    if (!metrics.layoutCoverage.existing && metrics.layoutCoverage.total > 0) {
      riskScore += 2; // Missing layouts are critical
    }

    if (!metrics.errorHandlingCoverage.hasErrorBoundary) {
      riskScore += routeStructure.metadata.isDynamic ? 2 : 1;
    }

    // Route complexity impact
    if (routeStructure.metadata.isDynamic) {
      riskScore += 1;
    }

    if (routeStructure.metadata.isCatchAll) {
      riskScore += 1;
    }

    if (routeStructure.metadata.depth > 3) {
      riskScore += 1;
    }

    // Determine risk level
    if (riskScore >= 6) {
      return "critical";
    } else if (riskScore >= 4) {
      return "high";
    } else if (riskScore >= 2) {
      return "medium";
    } else {
      return "low";
    }
  }

  /**
   * Removes duplicate recommendations
   */
  private deduplicateRecommendations(
    recommendations: CoverageRecommendation[]
  ): CoverageRecommendation[] {
    const seen = new Set<string>();
    const deduplicated: CoverageRecommendation[] = [];

    for (const rec of recommendations) {
      const key = `${rec.type}-${rec.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(rec);
      }
    }

    return deduplicated.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Gets detailed analysis for a specific special file type across routes
   */
  getSpecialFileAnalysis(
    routeCoverages: RouteCoverageAnalysis[],
    fileType: keyof SpecialFileCoverage
  ): {
    totalRoutes: number;
    routesWithFile: number;
    routesMissingFile: string[];
    averageImplementation: number;
  } {
    const totalRoutes = routeCoverages.length;
    let routesWithFile = 0;
    const routesMissingFile: string[] = [];

    for (const route of routeCoverages) {
      const fileInfo = route.specialFilesCoverage[fileType];
      let hasFile = false;

      if (Array.isArray(fileInfo)) {
        // Layout files
        hasFile = fileInfo.some((layout) => layout.exists);
      } else if (fileInfo) {
        // Other special files
        hasFile = fileInfo.exists;
      }

      if (hasFile) {
        routesWithFile++;
      } else {
        routesMissingFile.push(route.routePath);
      }
    }

    return {
      totalRoutes,
      routesWithFile,
      routesMissingFile,
      averageImplementation:
        totalRoutes > 0 ? (routesWithFile / totalRoutes) * 100 : 0,
    };
  }
}
