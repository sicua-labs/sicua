import ts from "typescript";
import path from "path-browserify";
import { ComponentRelation } from "../../../types";
import { LayoutHierarchy } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";

/**
 * Analyzer for App Router layout hierarchy and metadata conflicts
 */
export class LayoutAnalyzer {
  private allComponents: ComponentRelation[];
  private layoutComponents: Map<string, ComponentRelation>;

  constructor(allComponents: ComponentRelation[]) {
    this.allComponents = allComponents;
    this.layoutComponents = new Map();
    this.identifyLayoutComponents();
  }

  /**
   * Analyze layout hierarchy and metadata conflicts
   */
  public analyzeLayoutHierarchy(): LayoutHierarchy {
    const layouts: LayoutHierarchy["layouts"] = [];

    // Analyze each layout component
    this.layoutComponents.forEach((component, layoutPath) => {
      const layoutAnalysis = this.analyzeLayout(component, layoutPath);
      layouts.push(layoutAnalysis);
    });

    // Build parent-child relationships
    this.buildLayoutRelationships(layouts);

    // Calculate statistics
    const statistics = this.calculateLayoutStatistics(layouts);

    return {
      layouts,
      statistics,
    };
  }

  /**
   * Identify all layout components from the component list
   */
  private identifyLayoutComponents(): void {
    this.allComponents.forEach((component) => {
      const specialFileInfo = ComponentUtils.isAppRouterSpecialFile(component);

      if (
        specialFileInfo.isSpecialFile &&
        specialFileInfo.fileType === "layout"
      ) {
        this.layoutComponents.set(component.fullPath, component);
      }
    });
  }

  /**
   * Analyze a single layout component
   */
  private analyzeLayout(
    component: ComponentRelation,
    layoutPath: string
  ): LayoutHierarchy["layouts"][0] {
    const routeSegment = this.extractRouteSegment(layoutPath);
    const level = ComponentUtils.getLayoutNestingLevel(component);
    const hasMetadata = this.hasMetadata(component);
    const metadataConflicts = this.detectMetadataConflicts(component);
    const children = this.findAffectedChildren(layoutPath);

    return {
      path: layoutPath,
      routeSegment,
      level,
      parentLayout: null, // Will be set in buildLayoutRelationships
      childLayouts: [], // Will be set in buildLayoutRelationships
      hasMetadata,
      metadataConflicts,
      children,
    };
  }

  /**
   * Extract route segment from layout path
   */
  private extractRouteSegment(layoutPath: string): string {
    const normalizedPath = path.normalize(layoutPath);

    if (
      !normalizedPath.includes("/app/") &&
      !normalizedPath.includes("\\app\\")
    ) {
      return "/";
    }

    const appDir = normalizedPath.includes("/app/") ? "/app/" : "\\app\\";
    const routeStart = normalizedPath.indexOf(appDir) + appDir.length;
    let routeSegment = path.dirname(normalizedPath.slice(routeStart));

    // Normalize path separators
    routeSegment = routeSegment.replace(/\\/g, "/");

    // Handle route groups - remove them from the actual route
    routeSegment = routeSegment.replace(/\([^)]+\)\//g, "");

    // Handle parallel routes - remove them from the actual route
    routeSegment = routeSegment.replace(/@[^/]+\//g, "");

    // Clean up and format
    if (routeSegment === "." || routeSegment === "") {
      return "/";
    }

    return routeSegment.startsWith("/") ? routeSegment : "/" + routeSegment;
  }

  /**
   * Check if layout has metadata
   */
  private hasMetadata(component: ComponentRelation): boolean {
    if (!component.content) return false;

    const sourceFile = ComponentUtils.getSourceFile(component);
    if (!sourceFile) return false;

    let hasMetadata = false;

    const visitNode = (node: ts.Node) => {
      // Check for metadata export
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (
          declaration &&
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "metadata"
        ) {
          hasMetadata = true;
        }
      }

      // Check for generateMetadata function
      if (ComponentUtils.isGenerateMetadataFunction(node)) {
        hasMetadata = true;
      }

      if (!hasMetadata) {
        ts.forEachChild(node, visitNode);
      }
    };

    visitNode(sourceFile);
    return hasMetadata;
  }

  /**
   * Detect metadata conflicts with parent layouts
   */
  private detectMetadataConflicts(component: ComponentRelation): string[] {
    const conflictResult = ComponentUtils.hasMetadataConflicts(component);

    if (!conflictResult.hasConflicts) {
      return [];
    }

    // Additional analysis for layout-specific conflicts
    const conflicts: string[] = [];
    const parentLayoutPath = ComponentUtils.getParentLayoutPath(component);

    if (parentLayoutPath) {
      const parentLayout = this.layoutComponents.get(parentLayoutPath);
      if (parentLayout && this.hasMetadata(parentLayout)) {
        // Check for specific conflicting metadata fields
        conflictResult.conflictingFields.forEach((field) => {
          conflicts.push(
            `${field} metadata may conflict with parent layout at ${parentLayoutPath}`
          );
        });
      }
    }

    return conflicts;
  }

  /**
   * Find all pages and child layouts affected by this layout
   */
  private findAffectedChildren(layoutPath: string): string[] {
    const children: string[] = [];
    const layoutDir = path.dirname(layoutPath);
    const routeSegment = this.extractRouteSegment(layoutPath);

    // Find all components that would be affected by this layout
    this.allComponents.forEach((component) => {
      const componentDir = path.dirname(component.fullPath);

      // Check if component is in a subdirectory of this layout
      if (componentDir.startsWith(layoutDir) && componentDir !== layoutDir) {
        // Additional check for App Router structure
        if (this.isAffectedByLayout(component.fullPath, routeSegment)) {
          children.push(component.fullPath);
        }
      }
    });

    return children;
  }

  /**
   * Check if a component path is affected by a layout at the given route segment
   */
  private isAffectedByLayout(
    componentPath: string,
    layoutRouteSegment: string
  ): boolean {
    const normalizedPath = path.normalize(componentPath);

    if (
      !normalizedPath.includes("/app/") &&
      !normalizedPath.includes("\\app\\")
    ) {
      return false;
    }

    const appDir = normalizedPath.includes("/app/") ? "/app/" : "\\app\\";
    const routeStart = normalizedPath.indexOf(appDir) + appDir.length;
    let componentRoute = path.dirname(normalizedPath.slice(routeStart));

    // Normalize and clean route
    componentRoute = componentRoute.replace(/\\/g, "/");
    componentRoute = componentRoute.replace(/\([^)]+\)\//g, ""); // Remove route groups
    componentRoute = componentRoute.replace(/@[^/]+\//g, ""); // Remove parallel routes

    if (componentRoute === "." || componentRoute === "") {
      componentRoute = "/";
    } else if (!componentRoute.startsWith("/")) {
      componentRoute = "/" + componentRoute;
    }

    // Check if component route starts with layout route segment
    if (layoutRouteSegment === "/") {
      return true; // Root layout affects everything
    }

    return componentRoute.startsWith(layoutRouteSegment);
  }

  /**
   * Build parent-child relationships between layouts
   */
  private buildLayoutRelationships(layouts: LayoutHierarchy["layouts"]): void {
    // Sort layouts by nesting level for proper relationship building
    layouts.sort((a, b) => a.level - b.level);

    layouts.forEach((layout) => {
      // Find parent layout
      const parentPath = ComponentUtils.getParentLayoutPath(
        this.layoutComponents.get(layout.path)!
      );

      if (parentPath) {
        const parentLayout = layouts.find((l) => l.path === parentPath);
        if (parentLayout) {
          layout.parentLayout = parentPath;
          parentLayout.childLayouts.push(layout.path);
        }
      }
    });
  }

  /**
   * Calculate layout hierarchy statistics
   */
  private calculateLayoutStatistics(
    layouts: LayoutHierarchy["layouts"]
  ): LayoutHierarchy["statistics"] {
    const totalLayouts = layouts.length;
    const maxNestingLevel =
      layouts.length > 0 ? Math.max(...layouts.map((l) => l.level)) : 0;

    const totalChildren = layouts.reduce(
      (sum, layout) => sum + layout.children.length,
      0
    );
    const averageChildrenPerLayout =
      totalLayouts > 0 ? totalChildren / totalLayouts : 0;

    const layoutsWithMetadataConflicts = layouts.filter(
      (l) => l.metadataConflicts.length > 0
    ).length;

    return {
      totalLayouts,
      maxNestingLevel,
      averageChildrenPerLayout,
      layoutsWithMetadataConflicts,
    };
  }

  /**
   * Get layout improvement suggestions
   */
  public getLayoutImprovementSuggestions(): string[] {
    const analysis = this.analyzeLayoutHierarchy();
    const suggestions: string[] = [];

    // Check for metadata conflicts
    const conflictingLayouts = analysis.layouts.filter(
      (l) => l.metadataConflicts.length > 0
    );
    if (conflictingLayouts.length > 0) {
      suggestions.push(
        `Resolve metadata conflicts in ${conflictingLayouts.length} layout(s)`
      );
    }

    // Check for deep nesting
    if (analysis.statistics.maxNestingLevel > 5) {
      suggestions.push(
        "Consider reducing layout nesting depth for better performance and maintainability"
      );
    }

    // Check for layouts without metadata
    const layoutsWithoutMetadata = analysis.layouts.filter(
      (l) => !l.hasMetadata
    );
    if (layoutsWithoutMetadata.length > 0) {
      suggestions.push(
        `Add metadata to ${layoutsWithoutMetadata.length} layout(s) that lack SEO metadata`
      );
    }

    // Check for root layout
    const rootLayout = analysis.layouts.find((l) => l.level === 0);
    if (!rootLayout) {
      suggestions.push(
        "Add a root layout.tsx file in the /app directory for global metadata and structure"
      );
    } else if (!rootLayout.hasMetadata) {
      suggestions.push(
        "Add metadata to root layout for global SEO configuration"
      );
    }

    // Check for orphaned children
    const orphanedChildren = analysis.layouts.filter(
      (l) => l.children.length === 0 && l.level > 0
    );
    if (orphanedChildren.length > 0) {
      suggestions.push(
        `${orphanedChildren.length} layout(s) have no child components - consider if they're necessary`
      );
    }

    return suggestions;
  }

  /**
   * Get detailed metadata conflicts for a specific layout
   */
  public getDetailedMetadataConflicts(layoutPath: string): Array<{
    field: string;
    conflictWith: string;
    severity: "warning" | "error";
    recommendation: string;
  }> {
    const layout = this.layoutComponents.get(layoutPath);
    if (!layout) return [];

    const conflicts: Array<{
      field: string;
      conflictWith: string;
      severity: "warning" | "error";
      recommendation: string;
    }> = [];

    const conflictResult = ComponentUtils.hasMetadataConflicts(layout);

    conflictResult.conflictingFields.forEach((field) => {
      const parentLayoutPath = ComponentUtils.getParentLayoutPath(layout);

      if (parentLayoutPath) {
        let severity: "warning" | "error" = "warning";
        let recommendation = `Consider removing ${field} from this layout if it's already defined in parent layout`;

        // Specific field analysis
        switch (field) {
          case "title":
            severity = "error";
            recommendation =
              "Title conflicts can cause SEO issues. Use title templates or remove from child layout";
            break;
          case "description":
            severity = "warning";
            recommendation =
              "Description conflicts may confuse search engines. Ensure child descriptions are more specific";
            break;
          case "robots":
            severity = "error";
            recommendation =
              "Robots directive conflicts can prevent proper indexing. Only set in root layout unless overriding is intentional";
            break;
        }

        conflicts.push({
          field,
          conflictWith: parentLayoutPath,
          severity,
          recommendation,
        });
      }
    });

    return conflicts;
  }
}
