import ts from "typescript";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";
import { AttributeInfo } from "../types/internalTypes";

/**
 * Utility functions for working with JSX elements in SEO analysis
 */
export class JsxUtils {
  /**
   * Gets the tag name of a JSX element
   */
  public static getTagName(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): string {
    return SeoRelated.getJsxTagName(node);
  }

  /**
   * Gets the value of a JSX attribute
   */
  public static getAttribute(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    attributeName: string
  ): string | null {
    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes.properties
      : node.attributes.properties;

    for (const attr of attributes) {
      if (!ts.isJsxAttribute(attr)) continue;
      if (attr.name.getText() === attributeName) {
        const initializer = attr.initializer;
        if (initializer) {
          if (ts.isStringLiteral(initializer)) {
            return initializer.text;
          } else if (
            ts.isJsxExpression(initializer) &&
            initializer.expression
          ) {
            return SeoRelated.extractStaticValue(initializer.expression);
          }
        }
        return ""; // attribute exists but has no value
      }
    }
    return null; // attribute doesn't exist
  }

  /**
   * Gets all attributes from a JSX element
   */
  public static getAllAttributes(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): AttributeInfo[] {
    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes.properties
      : node.attributes.properties;

    const result: AttributeInfo[] = [];

    for (const attr of attributes) {
      if (!ts.isJsxAttribute(attr)) continue;

      const name = attr.name.getText();
      const initializer = attr.initializer;
      let value: string | null = null;

      if (initializer) {
        if (ts.isStringLiteral(initializer)) {
          value = initializer.text;
        } else if (ts.isJsxExpression(initializer) && initializer.expression) {
          value = SeoRelated.extractStaticValue(initializer.expression);
        }
      } else {
        value = ""; // attribute exists but has no value
      }

      result.push({ name, value });
    }

    return result;
  }

  /**
   * Checks if a node is a Link component (Next.js, React Router, etc.)
   */
  public static isLinkComponent(node: ts.Node): boolean {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node))
      return false;

    const tagName = ts.isJsxElement(node)
      ? node.openingElement.tagName.getText()
      : node.tagName.getText();

    return (
      tagName === "Link" || tagName === "NavLink" || tagName === "RouterLink"
    );
  }

  /**
   * Checks if a node is an anchor tag
   */
  public static isAnchorTag(node: ts.Node): boolean {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node))
      return false;

    const tagName = ts.isJsxElement(node)
      ? node.openingElement.tagName.getText()
      : node.tagName.getText();

    return tagName.toLowerCase() === "a";
  }

  /**
   * Extracts link target from Link component or anchor
   */
  public static extractLinkTarget(node: ts.Node): string | null {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node))
      return null;

    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes.properties
      : node.attributes.properties;

    for (const attr of attributes) {
      if (!ts.isJsxAttribute(attr)) continue;

      if (attr.name.getText() === "to" || attr.name.getText() === "href") {
        const initializer = attr.initializer;
        if (initializer) {
          if (ts.isStringLiteral(initializer)) {
            return initializer.text;
          } else if (
            ts.isJsxExpression(initializer) &&
            initializer.expression
          ) {
            return SeoRelated.extractStaticValue(initializer.expression);
          }
        }
      }
    }

    return null;
  }

  /**
   * Checks if a node has accessible text (for SEO and a11y)
   */
  public static hasAccessibleText(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // Check for text content
    if (ts.isJsxElement(node) && node.children) {
      const hasText = node.children.some(
        (child) => ts.isJsxText(child) && child.text.trim().length > 0
      );
      if (hasText) return true;
    }

    // Check for aria-label
    const ariaLabel = this.getAttribute(node, "aria-label");
    if (ariaLabel) return true;

    // Check for aria-labelledby
    const ariaLabelledBy = this.getAttribute(node, "aria-labelledby");
    if (ariaLabelledBy) return true;

    return false;
  }

  /**
   * Checks if a node is an icon-only button (accessibility issue for SEO)
   */
  public static isIconOnlyButton(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // Check if button only contains icon-like elements
    if (ts.isJsxElement(node)) {
      const hasOnlyIconChildren = node.children.every((child) => {
        if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
          const tagName = this.getTagName(child).toLowerCase();
          return tagName === "svg" || tagName === "img" || tagName === "i";
        }
        if (ts.isJsxText(child)) {
          return child.text.trim().length === 0;
        }
        return true;
      });

      return hasOnlyIconChildren;
    }

    return false;
  }

  /**
   * Extracts text content from JSX elements
   */
  public static extractTextContent(node: ts.Node): string {
    let text = "";

    const visit = (node: ts.Node): void => {
      if (ts.isJsxText(node)) {
        text += node.text.trim() + " ";
      }
      ts.forEachChild(node, visit);
    };

    visit(node);
    return text.trim();
  }

  // ========== PERFORMANCE-RELATED DETECTION METHODS ==========

  /**
   * Detects Next.js Image component usage and optimization
   */
  public static isNextImageComponent(node: ts.Node): boolean {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
      return false;
    }

    const tagName = this.getTagName(node);
    return tagName === "Image";
  }

  /**
   * Checks if image has performance-critical attributes
   */
  public static hasPerformanceOptimizedImage(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): {
    isOptimized: boolean;
    issues: string[];
    hasLazyLoading: boolean;
    hasPriority: boolean;
    hasDimensions: boolean;
  } {
    const tagName = this.getTagName(node).toLowerCase();
    const issues: string[] = [];
    let isOptimized = true;

    const loading = this.getAttribute(node, "loading");
    const priority = this.getAttribute(node, "priority");
    const width = this.getAttribute(node, "width");
    const height = this.getAttribute(node, "height");
    const sizes = this.getAttribute(node, "sizes");

    const hasLazyLoading =
      loading === "lazy" || (tagName === "image" && !priority);
    const hasPriority = priority === "true" || priority === "{true}";
    const hasDimensions = !!(width && height);

    if (tagName === "img") {
      issues.push("Use Next.js Image component for automatic optimization");
      isOptimized = false;
    }

    if (!hasDimensions && tagName !== "image") {
      issues.push("Missing width/height attributes can cause CLS");
      isOptimized = false;
    }

    if (tagName === "image" && !sizes && !width) {
      issues.push("Missing sizes prop for responsive images");
    }

    return {
      isOptimized,
      issues,
      hasLazyLoading,
      hasPriority,
      hasDimensions,
    };
  }

  /**
   * Detects lazy loading opportunities
   */
  public static getLazyLoadingInfo(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): {
    supportsLazyLoading: boolean;
    hasLazyLoading: boolean;
    method: "native" | "next-image" | "none";
    recommendation: string | null;
  } {
    const tagName = this.getTagName(node).toLowerCase();
    const loading = this.getAttribute(node, "loading");
    const priority = this.getAttribute(node, "priority");

    if (tagName === "img") {
      return {
        supportsLazyLoading: true,
        hasLazyLoading: loading === "lazy",
        method: loading === "lazy" ? "native" : "none",
        recommendation:
          loading !== "lazy"
            ? "Add loading='lazy' for below-fold images"
            : null,
      };
    }

    if (tagName === "image") {
      return {
        supportsLazyLoading: true,
        hasLazyLoading: !priority,
        method: "next-image",
        recommendation: priority
          ? "Remove priority for below-fold images"
          : null,
      };
    }

    return {
      supportsLazyLoading: false,
      hasLazyLoading: false,
      method: "none",
      recommendation: null,
    };
  }

  /**
   * Detects components that might benefit from lazy loading
   */
  public static isHeavyComponent(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): {
    isHeavy: boolean;
    reasons: string[];
    complexity: "low" | "medium" | "high";
  } {
    const tagName = this.getTagName(node);
    const attributes = this.getAllAttributes(node);
    const reasons: string[] = [];
    let complexity: "low" | "medium" | "high" = "low";

    // Check for heavy component patterns
    const heavyComponentPatterns = [
      "Chart",
      "Graph",
      "Map",
      "Editor",
      "Calendar",
      "DataTable",
      "Video",
      "Canvas",
      "ThreeJS",
      "WebGL",
      "CodeEditor",
    ];

    const isHeavyByName = heavyComponentPatterns.some((pattern) =>
      tagName.includes(pattern)
    );

    if (isHeavyByName) {
      reasons.push(`Component name suggests heavy functionality: ${tagName}`);
      complexity = "high";
    }

    // Check for many props (might indicate complexity)
    if (attributes.length > 10) {
      reasons.push("Component has many props indicating complexity");
      complexity = complexity === "high" ? "high" : "medium";
    }

    // Check for data-heavy attributes
    const dataAttributes = attributes.filter(
      (attr) =>
        attr.name.startsWith("data-") ||
        attr.name.includes("config") ||
        attr.name.includes("options")
    );

    if (dataAttributes.length > 3) {
      reasons.push("Component has many data attributes");
      complexity = complexity === "high" ? "high" : "medium";
    }

    return {
      isHeavy: reasons.length > 0,
      reasons,
      complexity,
    };
  }

  /**
   * Detects performance-impacting event handlers
   */
  public static hasPerformanceIssues(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): {
    hasIssues: boolean;
    issues: Array<{
      type: "complex-handlers" | "too-many-handlers" | "inline-functions";
      description: string;
      severity: "low" | "medium" | "high";
    }>;
  } {
    const attributes = this.getAllAttributes(node);
    const issues: Array<{
      type: "complex-handlers" | "too-many-handlers" | "inline-functions";
      description: string;
      severity: "low" | "medium" | "high";
    }> = [];

    // Count event handlers
    const eventHandlers = attributes.filter(
      (attr) => attr.name.startsWith("on") && attr.name.length > 2
    );

    if (eventHandlers.length > 3) {
      issues.push({
        type: "too-many-handlers",
        description: `Element has ${eventHandlers.length} event handlers`,
        severity: "medium",
      });
    }

    // Check for inline functions (simplified detection)
    eventHandlers.forEach((handler) => {
      if (
        handler.value &&
        (handler.value.includes("=>") || handler.value.includes("function"))
      ) {
        issues.push({
          type: "inline-functions",
          description: `Inline function in ${handler.name} handler`,
          severity: "low",
        });
      }
    });

    return {
      hasIssues: issues.length > 0,
      issues,
    };
  }

  /**
   * Detects third-party scripts and their performance impact
   */
  public static isThirdPartyScript(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): {
    isThirdParty: boolean;
    service: string | null;
    performanceImpact: "low" | "medium" | "high";
    recommendations: string[];
  } {
    const tagName = this.getTagName(node).toLowerCase();
    const src = this.getAttribute(node, "src");
    const recommendations: string[] = [];

    if (tagName !== "script" || !src) {
      return {
        isThirdParty: false,
        service: null,
        performanceImpact: "low",
        recommendations: [],
      };
    }

    // Common third-party services and their impact
    const thirdPartyServices = [
      {
        pattern: "google-analytics",
        name: "Google Analytics",
        impact: "medium" as const,
      },
      {
        pattern: "googletagmanager",
        name: "Google Tag Manager",
        impact: "high" as const,
      },
      {
        pattern: "facebook.net",
        name: "Facebook Pixel",
        impact: "high" as const,
      },
      { pattern: "doubleclick", name: "Google Ads", impact: "high" as const },
      { pattern: "hotjar", name: "Hotjar", impact: "medium" as const },
      { pattern: "intercom", name: "Intercom", impact: "medium" as const },
      { pattern: "zendesk", name: "Zendesk", impact: "medium" as const },
      { pattern: "stripe", name: "Stripe", impact: "low" as const },
      { pattern: "paypal", name: "PayPal", impact: "medium" as const },
      { pattern: "recaptcha", name: "reCAPTCHA", impact: "medium" as const },
    ];

    const matchedService = thirdPartyServices.find((service) =>
      src.toLowerCase().includes(service.pattern)
    );

    if (matchedService) {
      // Generate recommendations based on service type
      switch (matchedService.impact) {
        case "high":
          recommendations.push("Consider loading this script asynchronously");
          recommendations.push(
            "Use defer or async attributes to prevent blocking"
          );
          recommendations.push(
            "Consider server-side implementation if possible"
          );
          break;
        case "medium":
          recommendations.push("Add async attribute to prevent blocking");
          recommendations.push(
            "Consider conditional loading based on user interaction"
          );
          break;
        case "low":
          recommendations.push("Ensure script has proper error handling");
          break;
      }

      return {
        isThirdParty: true,
        service: matchedService.name,
        performanceImpact: matchedService.impact,
        recommendations,
      };
    }

    // Check if it's any external script
    const isExternal = src.startsWith("http") && !src.includes("localhost");

    if (isExternal) {
      recommendations.push("Consider hosting third-party scripts locally");
      recommendations.push("Add async or defer attributes");

      return {
        isThirdParty: true,
        service: "Unknown third-party service",
        performanceImpact: "medium",
        recommendations,
      };
    }

    return {
      isThirdParty: false,
      service: null,
      performanceImpact: "low",
      recommendations: [],
    };
  }

  /**
   * Detects preloading opportunities
   */
  public static shouldBePreloaded(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): {
    shouldPreload: boolean;
    resourceType: "image" | "font" | "script" | "style" | null;
    priority: "high" | "medium" | "low";
    recommendation: string | null;
  } {
    const tagName = this.getTagName(node).toLowerCase();
    const src = this.getAttribute(node, "src");
    const href = this.getAttribute(node, "href");
    const rel = this.getAttribute(node, "rel");

    // Critical images should be preloaded
    if ((tagName === "img" || tagName === "image") && src) {
      const priority = this.getAttribute(node, "priority");
      if (priority === "true") {
        return {
          shouldPreload: true,
          resourceType: "image",
          priority: "high",
          recommendation:
            "Add <link rel='preload' as='image'> for this critical image",
        };
      }
    }

    // Critical fonts should be preloaded
    if (tagName === "link" && rel === "stylesheet" && href?.includes("font")) {
      return {
        shouldPreload: true,
        resourceType: "font",
        priority: "high",
        recommendation: "Add <link rel='preload' as='font'> for critical fonts",
      };
    }

    // Critical scripts
    if (
      tagName === "script" &&
      src &&
      !this.getAttribute(node, "async") &&
      !this.getAttribute(node, "defer")
    ) {
      return {
        shouldPreload: true,
        resourceType: "script",
        priority: "medium",
        recommendation:
          "Consider preloading or adding async/defer to prevent blocking",
      };
    }

    return {
      shouldPreload: false,
      resourceType: null,
      priority: "low",
      recommendation: null,
    };
  }

  /**
   * Analyzes Core Web Vitals impact of an element
   */
  public static analyzeCoreWebVitalsImpact(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): {
    lcpImpact: "none" | "low" | "medium" | "high";
    clsImpact: "none" | "low" | "medium" | "high";
    fidImpact: "none" | "low" | "medium" | "high";
    recommendations: string[];
  } {
    const tagName = this.getTagName(node).toLowerCase();
    const recommendations: string[] = [];
    let lcpImpact: "none" | "low" | "medium" | "high" = "none";
    let clsImpact: "none" | "low" | "medium" | "high" = "none";
    let fidImpact: "none" | "low" | "medium" | "high" = "none";

    // LCP Impact Analysis
    if (tagName === "img" || tagName === "image") {
      const priority = this.getAttribute(node, "priority");
      const loading = this.getAttribute(node, "loading");

      if (priority === "true") {
        lcpImpact = "high";
        recommendations.push("Ensure this LCP candidate image is optimized");
      } else if (loading !== "lazy") {
        lcpImpact = "medium";
      }
    }

    // CLS Impact Analysis
    const width = this.getAttribute(node, "width");
    const height = this.getAttribute(node, "height");

    if (
      (tagName === "img" || tagName === "iframe" || tagName === "video") &&
      (!width || !height)
    ) {
      clsImpact = "high";
      recommendations.push("Add explicit dimensions to prevent layout shift");
    }

    // FID Impact Analysis
    const eventHandlers = this.getAllAttributes(node).filter((attr) =>
      attr.name.startsWith("on")
    );
    if (eventHandlers.length > 2) {
      fidImpact = "medium";
      recommendations.push(
        "Optimize event handlers to reduce main thread blocking"
      );
    }

    if (
      tagName === "script" &&
      !this.getAttribute(node, "async") &&
      !this.getAttribute(node, "defer")
    ) {
      fidImpact = "high";
      recommendations.push("Add async or defer to scripts to improve FID");
    }

    return {
      lcpImpact,
      clsImpact,
      fidImpact,
      recommendations,
    };
  }
}
