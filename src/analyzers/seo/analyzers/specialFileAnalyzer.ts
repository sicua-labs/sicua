import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { AppRouterSpecialFiles } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { PageComponentMap } from "../types/internalTypes";

/**
 * Analyzer for App Router special files (layout, loading, error, not-found, etc.)
 */
export class SpecialFileAnalyzer {
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
   * Analyze all App Router special files
   */
  public analyzeSpecialFiles(): AppRouterSpecialFiles {
    const specialFiles: AppRouterSpecialFiles["files"] = [];
    const routeCoverage = new Map<string, Set<string>>();

    // Analyze all components for special files
    this.allComponents.forEach((component) => {
      const specialFileInfo = ComponentUtils.isAppRouterSpecialFile(component);

      if (specialFileInfo.isSpecialFile && specialFileInfo.fileType) {
        const analysis = this.analyzeSpecialFile(
          component,
          specialFileInfo.fileType,
          specialFileInfo.routeSegment
        );
        specialFiles.push(analysis);

        // Track coverage by route segment
        if (!routeCoverage.has(specialFileInfo.routeSegment)) {
          routeCoverage.set(specialFileInfo.routeSegment, new Set());
        }
        routeCoverage
          .get(specialFileInfo.routeSegment)!
          .add(specialFileInfo.fileType);
      }
    });

    // Calculate coverage statistics
    const coverage = this.calculateCoverage(routeCoverage);
    const statistics = this.calculateStatistics(specialFiles);

    return {
      files: specialFiles,
      coverage,
      statistics,
    };
  }

  /**
   * Analyze a single special file
   */
  private analyzeSpecialFile(
    component: ComponentRelation,
    fileType:
      | "layout"
      | "loading"
      | "error"
      | "not-found"
      | "global-error"
      | "template",
    routeSegment: string
  ): AppRouterSpecialFiles["files"][0] {
    const issues: string[] = [];
    let hasMetadata = false;
    let hasGenerateMetadata = false;

    if (!component.content) {
      issues.push("File is empty or could not be read");
      return {
        type: fileType,
        path: component.fullPath,
        routeSegment,
        hasMetadata: false,
        hasGenerateMetadata: false,
        issues,
      };
    }

    const sourceFile = ComponentUtils.getSourceFile(component);
    if (!sourceFile) {
      issues.push("Could not parse TypeScript/JavaScript content");
      return {
        type: fileType,
        path: component.fullPath,
        routeSegment,
        hasMetadata: false,
        hasGenerateMetadata: false,
        issues,
      };
    }

    // Check for metadata and other SEO-related issues
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
        hasGenerateMetadata = true;
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    // File-type specific validation
    switch (fileType) {
      case "layout":
        this.validateLayoutFile(sourceFile, issues);
        break;
      case "loading":
        this.validateLoadingFile(sourceFile, issues);
        break;
      case "error":
        this.validateErrorFile(sourceFile, issues);
        break;
      case "not-found":
        this.validateNotFoundFile(sourceFile, issues);
        break;
      case "global-error":
        this.validateGlobalErrorFile(sourceFile, issues);
        break;
      case "template":
        this.validateTemplateFile(sourceFile, issues);
        break;
    }

    return {
      type: fileType,
      path: component.fullPath,
      routeSegment,
      hasMetadata,
      hasGenerateMetadata,
      issues,
    };
  }

  /**
   * Validate layout file for SEO best practices
   */
  private validateLayoutFile(
    sourceFile: ts.SourceFile,
    issues: string[]
  ): void {
    let hasDefaultExport = false;
    let hasChildrenProp = false;
    let hasHtmlTag = false;
    let hasBodyTag = false;

    const visitNode = (node: ts.Node) => {
      // Check for default export
      if (
        ts.isExportAssignment(node) ||
        (ts.isFunctionDeclaration(node) &&
          node.modifiers?.some(
            (m) =>
              m.kind === ts.SyntaxKind.ExportKeyword &&
              node.modifiers?.some(
                (m2) => m2.kind === ts.SyntaxKind.DefaultKeyword
              )
          ))
      ) {
        hasDefaultExport = true;
      }

      // Check for children prop usage
      if (
        ts.isParameter(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "children"
      ) {
        hasChildrenProp = true;
      }

      // Check for destructured children prop
      if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
        node.elements.forEach((element) => {
          if (
            ts.isBindingElement(element) &&
            ts.isIdentifier(element.name) &&
            element.name.text === "children"
          ) {
            hasChildrenProp = true;
          }
        });
      }

      // Check for html and body tags (root layout)
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = ts.isJsxElement(node)
          ? node.openingElement.tagName.getText().toLowerCase()
          : node.tagName.getText().toLowerCase();

        if (tagName === "html") hasHtmlTag = true;
        if (tagName === "body") hasBodyTag = true;
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    if (!hasDefaultExport) {
      issues.push("Layout file should have a default export");
    }

    if (!hasChildrenProp) {
      issues.push("Layout component should accept and render children prop");
    }

    // Root layout specific checks
    const isRootLayout = sourceFile.fileName.includes("/app/layout.");
    if (isRootLayout) {
      if (!hasHtmlTag) {
        issues.push("Root layout should include <html> tag");
      }
      if (!hasBodyTag) {
        issues.push("Root layout should include <body> tag");
      }
    }
  }

  /**
   * Validate loading file
   */
  private validateLoadingFile(
    sourceFile: ts.SourceFile,
    issues: string[]
  ): void {
    let hasDefaultExport = false;

    const visitNode = (node: ts.Node) => {
      if (
        ts.isExportAssignment(node) ||
        (ts.isFunctionDeclaration(node) &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      ) {
        hasDefaultExport = true;
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    if (!hasDefaultExport) {
      issues.push("Loading file should have a default export");
    }
  }

  /**
   * Validate error file
   */
  private validateErrorFile(sourceFile: ts.SourceFile, issues: string[]): void {
    let hasDefaultExport = false;
    let hasErrorProp = false;
    let hasResetProp = false;
    let hasUseClientDirective = false;

    const visitNode = (node: ts.Node) => {
      // Check for 'use client' directive
      if (ts.isStringLiteral(node) && node.text === "use client") {
        hasUseClientDirective = true;
      }

      if (
        ts.isExportAssignment(node) ||
        (ts.isFunctionDeclaration(node) &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      ) {
        hasDefaultExport = true;
      }

      // Check for error and reset props
      if (ts.isParameter(node)) {
        if (ts.isIdentifier(node.name)) {
          if (node.name.text === "error") hasErrorProp = true;
          if (node.name.text === "reset") hasResetProp = true;
        } else if (ts.isObjectBindingPattern(node.name)) {
          node.name.elements.forEach((element) => {
            if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
              if (element.name.text === "error") hasErrorProp = true;
              if (element.name.text === "reset") hasResetProp = true;
            }
          });
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    if (!hasDefaultExport) {
      issues.push("Error file should have a default export");
    }

    if (!hasUseClientDirective) {
      issues.push(
        "Error boundary components must be client components (add 'use client' directive)"
      );
    }

    if (!hasErrorProp) {
      issues.push(
        "Error component should accept an 'error' prop for SEO-friendly error display"
      );
    }

    if (!hasResetProp) {
      issues.push(
        "Error component should accept a 'reset' prop for error recovery"
      );
    }
  }

  /**
   * Validate not-found file
   */
  private validateNotFoundFile(
    sourceFile: ts.SourceFile,
    issues: string[]
  ): void {
    let hasDefaultExport = false;

    const visitNode = (node: ts.Node) => {
      if (
        ts.isExportAssignment(node) ||
        (ts.isFunctionDeclaration(node) &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      ) {
        hasDefaultExport = true;
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    if (!hasDefaultExport) {
      issues.push("Not-found file should have a default export");
    }

    // Additional SEO check for 404 pages
    issues.push(
      "Consider adding structured data for 404 pages to help search engines understand the error"
    );
  }

  /**
   * Validate global-error file
   */
  private validateGlobalErrorFile(
    sourceFile: ts.SourceFile,
    issues: string[]
  ): void {
    let hasDefaultExport = false;
    let hasUseClientDirective = false;
    let hasHtmlStructure = false;

    const visitNode = (node: ts.Node) => {
      if (ts.isStringLiteral(node) && node.text === "use client") {
        hasUseClientDirective = true;
      }

      if (
        ts.isExportAssignment(node) ||
        (ts.isFunctionDeclaration(node) &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      ) {
        hasDefaultExport = true;
      }

      // Check for html structure
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = ts.isJsxElement(node)
          ? node.openingElement.tagName.getText().toLowerCase()
          : node.tagName.getText().toLowerCase();

        if (tagName === "html" || tagName === "body") {
          hasHtmlStructure = true;
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    if (!hasDefaultExport) {
      issues.push("Global error file should have a default export");
    }

    if (!hasUseClientDirective) {
      issues.push(
        "Global error component must be a client component (add 'use client' directive)"
      );
    }

    if (!hasHtmlStructure) {
      issues.push(
        "Global error component should render html and body tags as it replaces the root layout"
      );
    }
  }

  /**
   * Validate template file
   */
  private validateTemplateFile(
    sourceFile: ts.SourceFile,
    issues: string[]
  ): void {
    let hasDefaultExport = false;
    let hasChildrenProp = false;

    const visitNode = (node: ts.Node) => {
      if (
        ts.isExportAssignment(node) ||
        (ts.isFunctionDeclaration(node) &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      ) {
        hasDefaultExport = true;
      }

      // Check for children prop
      if (
        ts.isParameter(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "children"
      ) {
        hasChildrenProp = true;
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    if (!hasDefaultExport) {
      issues.push("Template file should have a default export");
    }

    if (!hasChildrenProp) {
      issues.push("Template component should accept and render children prop");
    }
  }

  /**
   * Calculate coverage statistics
   */
  private calculateCoverage(
    routeCoverage: Map<string, Set<string>>
  ): AppRouterSpecialFiles["coverage"] {
    let routesWithLayout = 0;
    let routesWithLoading = 0;
    let routesWithError = 0;
    let routesWithNotFound = 0;

    routeCoverage.forEach((fileTypes) => {
      if (fileTypes.has("layout")) routesWithLayout++;
      if (fileTypes.has("loading")) routesWithLoading++;
      if (fileTypes.has("error")) routesWithError++;
      if (fileTypes.has("not-found")) routesWithNotFound++;
    });

    return {
      routesWithLayout,
      routesWithLoading,
      routesWithError,
      routesWithNotFound,
    };
  }

  /**
   * Calculate general statistics
   */
  private calculateStatistics(
    specialFiles: AppRouterSpecialFiles["files"]
  ): AppRouterSpecialFiles["statistics"] {
    const specialFilesByType: Record<string, number> = {};

    specialFiles.forEach((file) => {
      specialFilesByType[file.type] = (specialFilesByType[file.type] || 0) + 1;
    });

    const routeSegments = new Set(
      specialFiles.map((file) => file.routeSegment)
    );
    const averageSpecialFilesPerRoute =
      routeSegments.size > 0 ? specialFiles.length / routeSegments.size : 0;

    return {
      totalSpecialFiles: specialFiles.length,
      specialFilesByType,
      averageSpecialFilesPerRoute,
    };
  }

  /**
   * Get improvement suggestions for special files
   */
  public getSpecialFileImprovementSuggestions(): string[] {
    const analysis = this.analyzeSpecialFiles();
    const suggestions: string[] = [];

    // Check for missing layouts
    const routeSegments = new Set(analysis.files.map((f) => f.routeSegment));
    const layoutRoutes = new Set(
      analysis.files
        .filter((f) => f.type === "layout")
        .map((f) => f.routeSegment)
    );

    routeSegments.forEach((segment) => {
      if (!layoutRoutes.has(segment) && segment !== "/") {
        suggestions.push(
          `Consider adding a layout.tsx file for route segment: ${segment}`
        );
      }
    });

    // Check for missing error boundaries
    const errorRoutes = new Set(
      analysis.files
        .filter((f) => f.type === "error")
        .map((f) => f.routeSegment)
    );
    if (errorRoutes.size === 0) {
      suggestions.push(
        "Add error.tsx files to provide better error handling and SEO-friendly error pages"
      );
    }

    // Check for missing loading states
    const loadingRoutes = new Set(
      analysis.files
        .filter((f) => f.type === "loading")
        .map((f) => f.routeSegment)
    );
    if (loadingRoutes.size === 0) {
      suggestions.push(
        "Add loading.tsx files to improve user experience during page transitions"
      );
    }

    // Check for files with issues
    const filesWithIssues = analysis.files.filter((f) => f.issues.length > 0);
    if (filesWithIssues.length > 0) {
      suggestions.push(
        `Fix ${filesWithIssues.length} special files with validation issues`
      );
    }

    return suggestions;
  }
}
