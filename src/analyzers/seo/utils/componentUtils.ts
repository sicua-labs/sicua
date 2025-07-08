import ts from "typescript";
import path from "path-browserify";
import { ComponentRelation } from "../../../types";
import { UI_COMPONENT_PATTERNS } from "../../../constants/uiPatterns";

/**
 * Utility functions for identifying and processing components for SEO analysis
 */
export class ComponentUtils {
  /**
   * Identifies if a component is a page component for SEO analysis
   */
  // ComponentUtils.ts - updated isPageComponent function
  public static isPageComponent(component: ComponentRelation): boolean {
    if (!component.content) return false;

    const sourceFile = ts.createSourceFile(
      component.fullPath,
      component.content,
      ts.ScriptTarget.Latest,
      true
    );

    let isPage = false;
    let hasMetadata = false;
    let hasDefaultExport = false;
    let isUIComponent = false;

    // Check normalized path for component patterns
    const normalizedPath = path.normalize(component.fullPath);

    // Check if this is likely a UI component based on path
    isUIComponent = this.isUIComponentPath(normalizedPath);

    const visit = (node: ts.Node) => {
      // Check for metadata export
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (declaration && ts.isIdentifier(declaration.name)) {
          if (declaration.name.text === "metadata") {
            hasMetadata = true;
          }
        }
      }

      // Check for generateMetadata function
      if (
        ts.isFunctionDeclaration(node) &&
        node.name?.text === "generateMetadata"
      ) {
        hasMetadata = true;
      }

      // Check for default export
      if (ts.isExportAssignment(node)) {
        hasDefaultExport = true;
      } else if (ts.isFunctionDeclaration(node) && node.modifiers) {
        const isExport = node.modifiers.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword
        );
        const isDefault = node.modifiers.some(
          (m) => m.kind === ts.SyntaxKind.DefaultKeyword
        );
        if (isExport && isDefault) {
          hasDefaultExport = true;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Check if the file matches page patterns
    isPage = this.matchesPagePattern(normalizedPath);

    // A component is a page if:
    // 1. It's in a typical page location AND has a default export
    // 2. OR It has metadata defined
    // 3. AND it's not a UI component in a components directory
    return ((isPage && hasDefaultExport) || hasMetadata) && !isUIComponent;
  }

  /**
   * Identifies if a component is an App Router special file
   */
  public static isAppRouterSpecialFile(component: ComponentRelation): {
    isSpecialFile: boolean;
    fileType:
      | "layout"
      | "loading"
      | "error"
      | "not-found"
      | "global-error"
      | "template"
      | null;
    routeSegment: string;
  } {
    const normalizedPath = path.normalize(component.fullPath);
    const fileName = path.basename(
      normalizedPath,
      path.extname(normalizedPath)
    );

    // Check if it's in app directory
    if (
      !normalizedPath.includes("/app/") &&
      !normalizedPath.includes("\\app\\")
    ) {
      return { isSpecialFile: false, fileType: null, routeSegment: "" };
    }

    // Determine file type
    let fileType:
      | "layout"
      | "loading"
      | "error"
      | "not-found"
      | "global-error"
      | "template"
      | null = null;

    switch (fileName) {
      case "layout":
        fileType = "layout";
        break;
      case "loading":
        fileType = "loading";
        break;
      case "error":
        fileType = "error";
        break;
      case "not-found":
        fileType = "not-found";
        break;
      case "global-error":
        fileType = "global-error";
        break;
      case "template":
        fileType = "template";
        break;
      default:
        return { isSpecialFile: false, fileType: null, routeSegment: "" };
    }

    // Extract route segment
    const appDir = normalizedPath.includes("/app/") ? "/app/" : "\\app\\";
    const routeStart = normalizedPath.indexOf(appDir) + appDir.length;
    const routeSegment = path
      .dirname(normalizedPath.slice(routeStart))
      .replace(/\\/g, "/");

    return {
      isSpecialFile: true,
      fileType,
      routeSegment: routeSegment === "." ? "/" : `/${routeSegment}`,
    };
  }

  /**
   * Identifies if a component is in a route group
   */
  public static getRouteGroupInfo(component: ComponentRelation): {
    isInRouteGroup: boolean;
    routeGroupName: string | null;
    routeGroupPath: string | null;
  } {
    const normalizedPath = path.normalize(component.fullPath);

    // Check if it's in app directory
    if (
      !normalizedPath.includes("/app/") &&
      !normalizedPath.includes("\\app\\")
    ) {
      return {
        isInRouteGroup: false,
        routeGroupName: null,
        routeGroupPath: null,
      };
    }

    // Look for route group pattern (parentheses)
    const routeGroupMatch = normalizedPath.match(/[/\\](\([^)]+\))[/\\]/);

    if (!routeGroupMatch) {
      return {
        isInRouteGroup: false,
        routeGroupName: null,
        routeGroupPath: null,
      };
    }

    const routeGroupName = routeGroupMatch[1];
    const routeGroupPath = normalizedPath.substring(
      0,
      normalizedPath.indexOf(routeGroupName) + routeGroupName.length
    );

    return {
      isInRouteGroup: true,
      routeGroupName,
      routeGroupPath,
    };
  }

  /**
   * Identifies if a component is a parallel route
   */
  public static getParallelRouteInfo(component: ComponentRelation): {
    isParallelRoute: boolean;
    slotName: string | null;
    parentRoute: string | null;
    isDefaultSlot: boolean;
  } {
    const normalizedPath = path.normalize(component.fullPath);

    // Check if it's in app directory
    if (
      !normalizedPath.includes("/app/") &&
      !normalizedPath.includes("\\app\\")
    ) {
      return {
        isParallelRoute: false,
        slotName: null,
        parentRoute: null,
        isDefaultSlot: false,
      };
    }

    // Look for parallel route pattern (@slot)
    const parallelRouteMatch = normalizedPath.match(/[/\\](@[^/\\]+)[/\\]/);

    if (!parallelRouteMatch) {
      return {
        isParallelRoute: false,
        slotName: null,
        parentRoute: null,
        isDefaultSlot: false,
      };
    }

    const slotName = parallelRouteMatch[1];
    const slotIndex = normalizedPath.indexOf(slotName);
    const parentRoute = normalizedPath.substring(0, slotIndex - 1);

    // Check if this is a default slot file
    const fileName = path.basename(
      normalizedPath,
      path.extname(normalizedPath)
    );
    const isDefaultSlot = fileName === "default";

    return {
      isParallelRoute: true,
      slotName,
      parentRoute,
      isDefaultSlot,
    };
  }

  /**
   * Checks if a component has metadata that could conflict with parent layouts
   */
  public static hasMetadataConflicts(component: ComponentRelation): {
    hasConflicts: boolean;
    conflictingFields: string[];
  } {
    if (!component.content)
      return { hasConflicts: false, conflictingFields: [] };

    const sourceFile = ts.createSourceFile(
      component.fullPath,
      component.content,
      ts.ScriptTarget.Latest,
      true
    );

    const metadataObject = this.extractMetadataObject(sourceFile);
    if (!metadataObject) return { hasConflicts: false, conflictingFields: [] };

    // Fields that commonly cause conflicts between layouts
    const potentialConflictFields = [
      "title",
      "description",
      "openGraph",
      "twitter",
      "robots",
    ];
    const conflictingFields: string[] = [];

    metadataObject.properties.forEach((prop) => {
      if (ts.isPropertyAssignment(prop)) {
        const propertyName = prop.name.getText();
        if (potentialConflictFields.includes(propertyName)) {
          conflictingFields.push(propertyName);
        }
      }
    });

    return {
      hasConflicts: conflictingFields.length > 0,
      conflictingFields,
    };
  }

  /**
   * Determines the nesting level of a layout in the App Router hierarchy
   */
  public static getLayoutNestingLevel(component: ComponentRelation): number {
    const normalizedPath = path.normalize(component.fullPath);

    if (
      !normalizedPath.includes("/app/") &&
      !normalizedPath.includes("\\app\\")
    ) {
      return 0;
    }

    const appDir = normalizedPath.includes("/app/") ? "/app/" : "\\app\\";
    const routeStart = normalizedPath.indexOf(appDir) + appDir.length;
    const routePath = normalizedPath.slice(routeStart);

    // Count directory levels (excluding file itself)
    const segments = path
      .dirname(routePath)
      .split(/[/\\]/)
      .filter((segment) => segment && segment !== ".");

    // Filter out route groups from nesting level calculation
    const realSegments = segments.filter(
      (segment) => !segment.startsWith("(") || !segment.endsWith(")")
    );

    return realSegments.length;
  }

  /**
   * Gets the parent layout path for a given component
   */
  public static getParentLayoutPath(
    component: ComponentRelation
  ): string | null {
    const normalizedPath = path.normalize(component.fullPath);

    if (
      !normalizedPath.includes("/app/") &&
      !normalizedPath.includes("\\app\\")
    ) {
      return null;
    }

    const appDir = normalizedPath.includes("/app/") ? "/app/" : "\\app\\";
    const appDirIndex = normalizedPath.indexOf(appDir);
    const currentDir = path.dirname(normalizedPath);

    // Walk up the directory tree looking for parent layout
    let searchDir = path.dirname(currentDir);

    while (searchDir.length > appDirIndex + appDir.length - 1) {
      const possibleLayoutPath = path.join(searchDir, "layout.tsx");
      const possibleLayoutPathJsx = path.join(searchDir, "layout.jsx");

      // In a real implementation, you'd check if these files exist
      // For now, we return the first potential parent layout path
      if (searchDir !== currentDir) {
        return possibleLayoutPath.replace(/\\/g, "/");
      }

      searchDir = path.dirname(searchDir);
    }

    return null;
  }

  // ComponentUtils.ts - new helper methods
  private static isUIComponentPath(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);

    // Check if it's in a components directory but not a page component
    const isInComponentsDir =
      normalizedPath.includes("/components/") ||
      normalizedPath.includes("\\components\\");

    // Check if it's a typical UI component name
    const fileName = path.basename(
      normalizedPath,
      path.extname(normalizedPath)
    );

    const matchesUIPattern = UI_COMPONENT_PATTERNS.some(
      (pattern) =>
        fileName === pattern ||
        fileName.endsWith(pattern) ||
        fileName.startsWith(pattern)
    );

    return isInComponentsDir || matchesUIPattern;
  }

  private static matchesPagePattern(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);

    // Check for various Next.js page patterns
    return (
      normalizedPath.includes("/pages/") ||
      normalizedPath.includes("\\pages\\") ||
      normalizedPath.includes("/app/") ||
      normalizedPath.includes("\\app\\") ||
      normalizedPath.endsWith(".page.tsx") ||
      normalizedPath.endsWith(".page.jsx") ||
      normalizedPath.endsWith("Page.tsx") ||
      normalizedPath.endsWith("Page.jsx") ||
      // Exclude component files in these directories
      (!normalizedPath.includes("/components/") &&
        !normalizedPath.includes("\\components\\") &&
        (normalizedPath.includes("/views/") ||
          normalizedPath.includes("\\views\\") ||
          normalizedPath.includes("/routes/") ||
          normalizedPath.includes("\\routes\\")))
    );
  }

  /**
   * Gets a source file from component content
   */
  public static getSourceFile(
    component: ComponentRelation
  ): ts.SourceFile | null {
    if (!component.content) return null;

    return ts.createSourceFile(
      component.fullPath,
      component.content,
      ts.ScriptTarget.Latest,
      true
    );
  }

  /**
   * Checks if a filename matches page component patterns
   */
  public static isPageFilename(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);

    return (
      normalizedPath.includes("pages/") ||
      normalizedPath.includes("app/") ||
      normalizedPath.endsWith(".page.tsx") ||
      normalizedPath.endsWith("Page.tsx") ||
      normalizedPath.endsWith("Page.jsx") ||
      normalizedPath.includes("views/") ||
      normalizedPath.includes("routes/")
    );
  }

  /**
   * Extracts metadata object from a page component's source file
   */
  public static extractMetadataObject(
    sourceFile: ts.SourceFile
  ): ts.ObjectLiteralExpression | null {
    let metadataObject: ts.ObjectLiteralExpression | null = null;

    const visit = (node: ts.Node) => {
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (
          declaration &&
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "metadata" &&
          declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
        ) {
          metadataObject = declaration.initializer;
        }
      }

      if (!metadataObject) {
        ts.forEachChild(node, visit);
      }
    };

    visit(sourceFile);
    return metadataObject;
  }

  /**
   * Checks if a node is a generateMetadata function
   */
  public static isGenerateMetadataFunction(node: ts.Node): boolean {
    return (
      ts.isFunctionDeclaration(node) &&
      !!node.name &&
      node.name.text === "generateMetadata"
    );
  }

  /**
   * Extracts page name from file path
   */
  public static extractPageName(filePath: string): string {
    const normalizedPath = path.normalize(filePath);
    const fileName = path.basename(normalizedPath);

    // Remove extension
    let pageName = fileName.replace(/\.[^/.]+$/, "");

    // Handle index pages
    if (pageName === "index") {
      const dirName = path.basename(path.dirname(normalizedPath));
      pageName = dirName === "pages" || dirName === "app" ? "Home" : dirName;
    }

    // Handle page naming conventions
    pageName = pageName
      .replace(/^page$/, path.basename(path.dirname(normalizedPath)))
      .replace(/\.page$/, "")
      .replace(/Page$/, "");

    return pageName;
  }
}
