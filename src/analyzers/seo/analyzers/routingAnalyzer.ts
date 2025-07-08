import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { StaticRoutingAnalysis } from "../../../types/seoCoverageTypes";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";
import { ComponentUtils } from "../utils/componentUtils";
import { JsxUtils } from "../utils/jsxUtils";
import { RouteUtils } from "../utils/routeUtils";
import {
  ExtractedLink,
  PageComponentMap,
  RoutesMap,
} from "../types/internalTypes";

/**
 * Analyzer for routing and internal links
 */
export class RoutingAnalyzer {
  private pageComponents: PageComponentMap;
  private routes: RoutesMap;

  constructor(pageComponents: PageComponentMap, routes: RoutesMap) {
    this.pageComponents = pageComponents;
    this.routes = routes;
  }

  /**
   * Analyze routing and links structure
   */
  public analyzeRouting(): StaticRoutingAnalysis {
    const routes = Array.from(this.routes.entries()).map(
      ([component, paths]) => ({
        path: paths[0],
        isDynamic: paths[0].includes(":"),
        params: SeoRelated.extractRouteParams(paths[0]),
        component,
      })
    );

    const internalLinks = this.analyzeInternalLinks();

    return {
      routes,
      internalLinks,
      statistics: {
        totalRoutes: routes.length,
        dynamicRoutes: routes.filter((r) => r.isDynamic).length,
        averageLinksPerPage: this.calculateAverageLinksPerPage(internalLinks),
        orphanedPages: this.findOrphanedPages(routes, internalLinks),
      },
    };
  }

  /**
   * Analyze internal links between pages
   */
  private analyzeInternalLinks(): StaticRoutingAnalysis["internalLinks"] {
    const internalLinks: StaticRoutingAnalysis["internalLinks"] = [];

    // Analyze each page component for links
    this.pageComponents.forEach((component, sourcePath) => {
      if (!component.content) return;

      const sourceRoute = this.routes.get(sourcePath)?.[0] || sourcePath;

      // Find all Link components and a tags
      const links = this.extractLinksFromComponent(component);

      links.forEach((link) => {
        const { to, isRelative } = RouteUtils.normalizeLinkPath(
          link,
          sourcePath
        );

        if (to) {
          internalLinks.push({
            from: sourceRoute,
            to,
            isRelative,
          });
        }
      });
    });

    return internalLinks;
  }

  /**
   * Extract links from a component
   */
  private extractLinksFromComponent(component: ComponentRelation): string[] {
    const links: string[] = [];

    if (!component.content) return links;

    try {
      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return links;

      // Visit all nodes to find links
      const visitNode = (node: ts.Node) => {
        if (JsxUtils.isLinkComponent(node)) {
          const link = JsxUtils.extractLinkTarget(node);
          if (link) links.push(link);
        }

        if (JsxUtils.isAnchorTag(node)) {
          const href = JsxUtils.extractLinkTarget(node);
          if (href && SeoRelated.isInternalLink(href)) {
            links.push(href);
          }
        }

        ts.forEachChild(node, visitNode);
      };

      visitNode(sourceFile);
    } catch (error) {
      console.warn(`Error extracting links from ${component.name}:`, error);
    }

    return links;
  }

  /**
   * Calculate average links per page
   */
  private calculateAverageLinksPerPage(
    internalLinks: StaticRoutingAnalysis["internalLinks"]
  ): number {
    if (this.pageComponents.size === 0) return 0;

    const linksByPage = new Map<string, number>();

    internalLinks.forEach((link) => {
      const count = linksByPage.get(link.from) || 0;
      linksByPage.set(link.from, count + 1);
    });

    const totalLinks = Array.from(linksByPage.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    return totalLinks / this.pageComponents.size;
  }

  /**
   * Find orphaned pages (pages with no incoming links)
   */
  private findOrphanedPages(
    routes: StaticRoutingAnalysis["routes"],
    internalLinks: StaticRoutingAnalysis["internalLinks"]
  ): string[] {
    const allRoutes = new Set(routes.map((r) => r.path));
    const linkedRoutes = new Set(internalLinks.map((l) => l.to));

    // Find routes that have no incoming links
    return (
      Array.from(allRoutes)
        .filter((route) => !linkedRoutes.has(route))
        // Exclude the index/home route from being considered orphaned
        .filter((route) => route !== "/" && route !== "/index")
    );
  }

  /**
   * Get routing improvement suggestions
   */
  public getRoutingImprovementSuggestions(): string[] {
    const suggestions: string[] = [];
    const analysis = this.analyzeRouting();

    // Check for orphaned pages
    if (analysis.statistics.orphanedPages.length > 0) {
      suggestions.push(
        `Add internal links to orphaned pages: ${analysis.statistics.orphanedPages.join(
          ", "
        )}`
      );
    }

    // Check for low internal linking
    if (analysis.statistics.averageLinksPerPage < 3) {
      suggestions.push(
        "Improve internal linking structure by adding more links between pages."
      );
    }

    // Check for excessive dynamic routes
    const dynamicRoutePercentage =
      (analysis.statistics.dynamicRoutes / analysis.statistics.totalRoutes) *
      100;
    if (dynamicRoutePercentage > 70) {
      suggestions.push(
        "Consider reducing the number of dynamic routes for better SEO performance."
      );
    }

    return suggestions;
  }
}
