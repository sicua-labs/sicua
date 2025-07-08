import ts from "typescript";
import path from "path-browserify";
import { ComponentRelation } from "../../../types";
import { MiddlewareAnalysis } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";

/**
 * Analyzer for Next.js middleware and its SEO implications
 */
export class MiddlewareAnalyzer {
  private allComponents: ComponentRelation[];
  private middlewareComponent: ComponentRelation | null = null;

  constructor(allComponents: ComponentRelation[]) {
    this.allComponents = allComponents;
    this.findMiddlewareFile();
  }

  /**
   * Analyze middleware for SEO impact
   */
  public analyzeMiddleware(): MiddlewareAnalysis {
    if (!this.middlewareComponent) {
      return {
        hasMiddleware: false,
        middlewareFile: {
          path: null,
          hasMatchers: false,
          matchers: [],
          affectedRoutes: [],
          seoImpacts: [],
        },
        statistics: {
          totalSeoImpacts: 0,
          affectedRoutes: 0,
          highSeverityIssues: 0,
        },
      };
    }

    const sourceFile = ComponentUtils.getSourceFile(this.middlewareComponent);
    if (!sourceFile) {
      return this.createEmptyAnalysis();
    }

    const middlewareAnalysis = this.analyzeMiddlewareFile(sourceFile);
    const statistics = this.calculateStatistics(middlewareAnalysis);

    return {
      hasMiddleware: true,
      middlewareFile: middlewareAnalysis,
      statistics,
    };
  }

  /**
   * Find middleware.ts or middleware.js file
   */
  private findMiddlewareFile(): void {
    this.middlewareComponent =
      this.allComponents.find((component) => {
        const fileName = path.basename(
          component.fullPath,
          path.extname(component.fullPath)
        );
        return fileName === "middleware";
      }) || null;
  }

  /**
   * Analyze the middleware file content
   */
  private analyzeMiddlewareFile(
    sourceFile: ts.SourceFile
  ): MiddlewareAnalysis["middlewareFile"] {
    const analysis: MiddlewareAnalysis["middlewareFile"] = {
      path: this.middlewareComponent!.fullPath,
      hasMatchers: false,
      matchers: [],
      affectedRoutes: [],
      seoImpacts: [],
    };

    // Extract middleware function and config
    const middlewareInfo = this.extractMiddlewareInfo(sourceFile);

    if (middlewareInfo.config) {
      analysis.hasMatchers = middlewareInfo.config.matchers.length > 0;
      analysis.matchers = middlewareInfo.config.matchers;
      analysis.affectedRoutes = this.calculateAffectedRoutes(
        middlewareInfo.config.matchers
      );
    }

    // Analyze middleware function for SEO impacts
    if (middlewareInfo.middlewareFunction) {
      analysis.seoImpacts = this.analyzeSEOImpacts(
        middlewareInfo.middlewareFunction,
        sourceFile
      );
    }

    return analysis;
  }

  /**
   * Extract middleware function and configuration
   */
  private extractMiddlewareInfo(sourceFile: ts.SourceFile): {
    middlewareFunction: ts.FunctionDeclaration | ts.ArrowFunction | null;
    config: { matchers: string[] } | null;
  } {
    let middlewareFunction: ts.FunctionDeclaration | ts.ArrowFunction | null =
      null;
    let config: { matchers: string[] } | null = null;

    const visitNode = (node: ts.Node) => {
      // Look for middleware function
      if (ts.isFunctionDeclaration(node) && node.name?.text === "middleware") {
        middlewareFunction = node;
      }

      // Look for arrow function assigned to middleware
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (
          declaration &&
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "middleware" &&
          declaration.initializer &&
          ts.isArrowFunction(declaration.initializer)
        ) {
          middlewareFunction = declaration.initializer;
        }
      }

      // Look for config export
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (
          declaration &&
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "config" &&
          declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
        ) {
          config = this.extractConfigObject(declaration.initializer);
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return { middlewareFunction, config };
  }

  /**
   * Extract configuration object from middleware config
   */
  private extractConfigObject(configObject: ts.ObjectLiteralExpression): {
    matchers: string[];
  } {
    const matchers: string[] = [];

    configObject.properties.forEach((prop) => {
      if (
        ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === "matcher"
      ) {
        if (ts.isArrayLiteralExpression(prop.initializer)) {
          prop.initializer.elements.forEach((element) => {
            if (ts.isStringLiteral(element)) {
              matchers.push(element.text);
            }
          });
        } else if (ts.isStringLiteral(prop.initializer)) {
          matchers.push(prop.initializer.text);
        }
      }
    });

    return { matchers };
  }

  /**
   * Calculate which routes are affected by matchers
   */
  private calculateAffectedRoutes(matchers: string[]): string[] {
    const affectedRoutes: string[] = [];

    matchers.forEach((matcher) => {
      // Convert matcher pattern to affected routes
      if (matcher.includes("*")) {
        // Wildcard matcher - affects multiple routes
        const baseRoute = matcher.replace(/\*.*$/, "");
        affectedRoutes.push(`${baseRoute}*`);
      } else {
        // Specific route matcher
        affectedRoutes.push(matcher);
      }
    });

    return affectedRoutes;
  }

  /**
   * Analyze middleware function for SEO impacts
   */
  private analyzeSEOImpacts(
    middlewareFunction: ts.FunctionDeclaration | ts.ArrowFunction,
    sourceFile: ts.SourceFile
  ): MiddlewareAnalysis["middlewareFile"]["seoImpacts"] {
    const seoImpacts: MiddlewareAnalysis["middlewareFile"]["seoImpacts"] = [];

    const functionBody = middlewareFunction.body;
    if (!functionBody) return seoImpacts;

    const visitNode = (node: ts.Node) => {
      // Check for redirects
      if (this.isRedirectCall(node)) {
        seoImpacts.push({
          type: "redirect",
          severity: "medium",
          description:
            "Middleware performs redirects which affect SEO crawling",
          recommendation:
            "Ensure redirects are permanent (301) for SEO and temporary (302) for user flow",
        });
      }

      // Check for rewrites
      if (this.isRewriteCall(node)) {
        seoImpacts.push({
          type: "rewrite",
          severity: "low",
          description: "Middleware performs URL rewrites",
          recommendation:
            "Ensure rewritten URLs maintain SEO value and are crawlable",
        });
      }

      // Check for header modifications
      if (this.isHeaderModification(node)) {
        seoImpacts.push({
          type: "header-modification",
          severity: "medium",
          description: "Middleware modifies HTTP headers",
          recommendation:
            "Ensure SEO-critical headers (robots, canonical) are properly set",
        });
      }

      // Check for authentication logic
      if (this.isAuthenticationLogic(node)) {
        seoImpacts.push({
          type: "authentication",
          severity: "high",
          description:
            "Middleware implements authentication which may block search engine crawlers",
          recommendation:
            "Ensure public pages remain accessible to search engines",
        });
      }

      // Check for i18n logic
      if (this.isI18nLogic(node)) {
        seoImpacts.push({
          type: "i18n",
          severity: "medium",
          description: "Middleware handles internationalization",
          recommendation:
            "Implement proper hreflang tags and language-specific sitemaps",
        });
      }

      ts.forEachChild(node, visitNode);
    };

    if (ts.isBlock(functionBody)) {
      functionBody.statements.forEach((statement) => visitNode(statement));
    } else {
      visitNode(functionBody);
    }

    return seoImpacts;
  }

  /**
   * Check if node represents a redirect call
   */
  private isRedirectCall(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      // NextResponse.redirect()
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "NextResponse" &&
        node.expression.name.text === "redirect"
      ) {
        return true;
      }

      // Response.redirect()
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "redirect"
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if node represents a rewrite call
   */
  private isRewriteCall(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "NextResponse" &&
        node.expression.name.text === "rewrite"
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if node represents header modification
   */
  private isHeaderModification(node: ts.Node): boolean {
    // Look for headers.set(), headers.delete(), or similar
    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;
        const objectName = node.expression.expression;

        if (
          (methodName === "set" ||
            methodName === "delete" ||
            methodName === "append") &&
          ts.isPropertyAccessExpression(objectName) &&
          objectName.name.text === "headers"
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if node contains authentication logic
   */
  private isAuthenticationLogic(node: ts.Node): boolean {
    // Look for common authentication patterns
    if (ts.isCallExpression(node)) {
      const text = node.getText();
      const authPatterns = [
        "getToken",
        "verify",
        "authenticate",
        "authorization",
        "bearer",
        "jwt",
        "session",
      ];

      return authPatterns.some((pattern) =>
        text.toLowerCase().includes(pattern.toLowerCase())
      );
    }

    // Look for conditional logic that might be auth-related
    if (ts.isIfStatement(node)) {
      const conditionText = node.expression.getText().toLowerCase();
      return (
        conditionText.includes("auth") ||
        conditionText.includes("token") ||
        conditionText.includes("login")
      );
    }

    return false;
  }

  /**
   * Check if node contains internationalization logic
   */
  private isI18nLogic(node: ts.Node): boolean {
    const text = node.getText().toLowerCase();
    const i18nPatterns = [
      "locale",
      "language",
      "i18n",
      "intl",
      "accept-language",
      "lang",
    ];

    return i18nPatterns.some((pattern) => text.includes(pattern));
  }

  /**
   * Calculate middleware statistics
   */
  private calculateStatistics(
    middlewareFile: MiddlewareAnalysis["middlewareFile"]
  ): MiddlewareAnalysis["statistics"] {
    const totalSeoImpacts = middlewareFile.seoImpacts.length;
    const affectedRoutes = middlewareFile.affectedRoutes.length;
    const highSeverityIssues = middlewareFile.seoImpacts.filter(
      (impact) => impact.severity === "high"
    ).length;

    return {
      totalSeoImpacts,
      affectedRoutes,
      highSeverityIssues,
    };
  }

  /**
   * Create empty analysis when no middleware found
   */
  private createEmptyAnalysis(): MiddlewareAnalysis {
    return {
      hasMiddleware: false,
      middlewareFile: {
        path: null,
        hasMatchers: false,
        matchers: [],
        affectedRoutes: [],
        seoImpacts: [],
      },
      statistics: {
        totalSeoImpacts: 0,
        affectedRoutes: 0,
        highSeverityIssues: 0,
      },
    };
  }

  /**
   * Get middleware improvement suggestions
   */
  public getMiddlewareImprovementSuggestions(): string[] {
    const analysis = this.analyzeMiddleware();
    const suggestions: string[] = [];

    if (!analysis.hasMiddleware) {
      return suggestions; // No suggestions if no middleware
    }

    // High severity issues
    const highSeverityIssues = analysis.middlewareFile.seoImpacts.filter(
      (impact) => impact.severity === "high"
    );

    if (highSeverityIssues.length > 0) {
      suggestions.push(
        `Address ${highSeverityIssues.length} high-severity SEO issues in middleware`
      );
    }

    // Authentication concerns
    const authImpacts = analysis.middlewareFile.seoImpacts.filter(
      (impact) => impact.type === "authentication"
    );

    if (authImpacts.length > 0) {
      suggestions.push(
        "Ensure authentication middleware doesn't block search engine crawlers from public content"
      );
    }

    // Redirect optimization
    const redirectImpacts = analysis.middlewareFile.seoImpacts.filter(
      (impact) => impact.type === "redirect"
    );

    if (redirectImpacts.length > 0) {
      suggestions.push(
        "Review redirect logic to ensure proper HTTP status codes (301 vs 302) for SEO"
      );
    }

    // i18n optimization
    const i18nImpacts = analysis.middlewareFile.seoImpacts.filter(
      (impact) => impact.type === "i18n"
    );

    if (i18nImpacts.length > 0) {
      suggestions.push(
        "Implement proper hreflang tags and language-specific SEO optimization for i18n middleware"
      );
    }

    // Matcher optimization
    if (
      !analysis.middlewareFile.hasMatchers &&
      analysis.middlewareFile.seoImpacts.length > 0
    ) {
      suggestions.push(
        "Consider adding matchers to limit middleware execution to specific routes for better performance"
      );
    }

    // General recommendation
    if (analysis.statistics.totalSeoImpacts > 0) {
      suggestions.push(
        "Review middleware implementation to ensure it enhances rather than hinders SEO performance"
      );
    }

    return suggestions;
  }

  /**
   * Get detailed SEO impact analysis
   */
  public getDetailedSEOAnalysis(): Array<{
    route: string;
    impacts: MiddlewareAnalysis["middlewareFile"]["seoImpacts"];
    recommendations: string[];
  }> {
    const analysis = this.analyzeMiddleware();

    if (!analysis.hasMiddleware) {
      return [];
    }

    return analysis.middlewareFile.affectedRoutes.map((route) => ({
      route,
      impacts: analysis.middlewareFile.seoImpacts,
      recommendations: this.getRouteSpecificRecommendations(
        route,
        analysis.middlewareFile.seoImpacts
      ),
    }));
  }

  /**
   * Get route-specific SEO recommendations
   */
  private getRouteSpecificRecommendations(
    route: string,
    impacts: MiddlewareAnalysis["middlewareFile"]["seoImpacts"]
  ): string[] {
    const recommendations: string[] = [];

    impacts.forEach((impact) => {
      switch (impact.type) {
        case "authentication":
          if (this.isPublicRoute(route)) {
            recommendations.push(
              `Ensure ${route} remains accessible to search engines despite authentication middleware`
            );
          }
          break;
        case "redirect":
          recommendations.push(
            `Review redirect logic for ${route} to use appropriate HTTP status codes`
          );
          break;
        case "i18n":
          recommendations.push(
            `Implement language-specific SEO optimization for ${route}`
          );
          break;
        case "header-modification":
          recommendations.push(
            `Ensure SEO headers are properly maintained for ${route}`
          );
          break;
      }
    });

    return recommendations;
  }

  /**
   * Determine if a route should be publicly accessible
   */
  private isPublicRoute(route: string): boolean {
    const publicRoutes = [
      "/",
      "/about",
      "/contact",
      "/blog",
      "/products",
      "/services",
      "/sitemap",
      "/robots.txt",
    ];

    return publicRoutes.some(
      (publicRoute) =>
        route === publicRoute || route.startsWith(`${publicRoute}/`)
    );
  }
}
