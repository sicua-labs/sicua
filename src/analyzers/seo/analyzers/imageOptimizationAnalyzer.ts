import ts from "typescript";
import path from "path-browserify";
import { ComponentRelation } from "../../../types";
import { ImageOptimizationAnalysis } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { JsxUtils } from "../utils/jsxUtils";
import { PageComponentMap } from "../types/internalTypes";

/**
 * Analyzer for image optimization and SEO best practices
 */
export class ImageOptimizationAnalyzer {
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
   * Analyze image optimization across all components
   */
  public analyzeImageOptimization(): ImageOptimizationAnalysis {
    const images: ImageOptimizationAnalysis["images"] = [];
    const formatCounts: Record<string, number> = {};

    // Analyze images in all components
    this.allComponents.forEach((component) => {
      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      const componentImages = this.analyzeImagesInComponent(
        sourceFile,
        component.fullPath
      );
      images.push(...componentImages);

      // Count formats
      componentImages.forEach((img) => {
        if (img.path) {
          const format = this.getImageFormat(img.path);
          if (format) {
            formatCounts[format] = (formatCounts[format] || 0) + 1;
          }
        }
      });
    });

    // Calculate statistics
    const statistics = this.calculateImageStatistics(images, formatCounts);

    // Generate recommendations
    const recommendations = this.generateImageRecommendations(
      images,
      statistics
    );

    return {
      images,
      statistics,
      recommendations,
    };
  }

  /**
   * Analyze images in a single component
   */
  private analyzeImagesInComponent(
    sourceFile: ts.SourceFile,
    componentPath: string
  ): ImageOptimizationAnalysis["images"] {
    const images: ImageOptimizationAnalysis["images"] = [];

    const visitNode = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = JsxUtils.getTagName(node).toLowerCase();

        if (tagName === "img" || tagName === "Image") {
          const imageAnalysis = this.analyzeImageElement(
            node,
            tagName,
            componentPath
          );
          if (imageAnalysis) {
            images.push(imageAnalysis);
          }
        }
      }

      // Check for CSS background images
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const backgroundImage = this.checkForBackgroundImage(
          node,
          componentPath
        );
        if (backgroundImage) {
          images.push(backgroundImage);
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return images;
  }

  /**
   * Analyze a single image element
   */
  private analyzeImageElement(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    tagName: string,
    componentPath: string
  ): ImageOptimizationAnalysis["images"][0] | null {
    const src = JsxUtils.getAttribute(node, "src");
    const alt = JsxUtils.getAttribute(node, "alt");
    const width = JsxUtils.getAttribute(node, "width");
    const height = JsxUtils.getAttribute(node, "height");
    const priority = JsxUtils.getAttribute(node, "priority");
    const placeholder = JsxUtils.getAttribute(node, "placeholder");
    const sizes = JsxUtils.getAttribute(node, "sizes");
    const fill = JsxUtils.getAttribute(node, "fill");

    const attributes = {
      alt,
      width: width ? parseInt(width) || null : null,
      height: height ? parseInt(height) || null : null,
      priority: priority === "true" || priority === "{true}",
      placeholder,
      sizes,
      fill: fill === "true" || fill === "{true}",
    };

    const issues = this.identifyImageIssues(tagName, attributes, src);
    const seoScore = this.calculateImageSEOScore(tagName, attributes, issues);

    return {
      type:
        tagName === "Image" ? "next/image" : src ? "img" : "background-image",
      path: src,
      usedInPages: [componentPath],
      attributes,
      issues,
      seoScore,
    };
  }

  /**
   * Check for CSS background images
   */
  private checkForBackgroundImage(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    componentPath: string
  ): ImageOptimizationAnalysis["images"][0] | null {
    const style = JsxUtils.getAttribute(node, "style");
    const className = JsxUtils.getAttribute(node, "className");

    // Simple check for background-image in inline styles
    if (style && style.includes("background-image")) {
      const urlMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch) {
        return {
          type: "background-image",
          path: urlMatch[1],
          usedInPages: [componentPath],
          attributes: {
            alt: null,
            width: null,
            height: null,
            priority: false,
            placeholder: null,
            sizes: null,
            fill: false,
          },
          issues: [
            {
              type: "no-optimization",
              severity: "medium",
              description:
                "Background images cannot be optimized by Next.js Image component",
            },
          ],
          seoScore: 30, // Low score for background images
        };
      }
    }

    return null;
  }

  /**
   * Identify issues with an image
   */
  private identifyImageIssues(
    tagName: string,
    attributes: ImageOptimizationAnalysis["images"][0]["attributes"],
    src: string | null
  ): ImageOptimizationAnalysis["images"][0]["issues"] {
    const issues: ImageOptimizationAnalysis["images"][0]["issues"] = [];

    // Missing alt attribute
    if (!attributes.alt && attributes.alt !== "") {
      issues.push({
        type: "missing-alt",
        severity: "high",
        description:
          "Image missing alt attribute affects accessibility and SEO",
      });
    }

    // Empty alt for decorative images is OK, but null alt is not
    if (attributes.alt === null) {
      issues.push({
        type: "missing-alt",
        severity: "high",
        description:
          "Alt attribute is required for all images (use empty string for decorative images)",
      });
    }

    // Missing dimensions for regular img tags
    if (tagName === "img" && (!attributes.width || !attributes.height)) {
      issues.push({
        type: "missing-dimensions",
        severity: "medium",
        description:
          "Missing width/height attributes can cause Cumulative Layout Shift (CLS)",
      });
    }

    // Using img instead of Next.js Image
    if (tagName === "img" && src && !src.startsWith("data:")) {
      issues.push({
        type: "no-optimization",
        severity: "high",
        description: "Use Next.js Image component for automatic optimization",
      });
    }

    // Next.js Image issues
    if (tagName === "Image") {
      // Missing sizes attribute for responsive images
      if (!attributes.sizes && !attributes.fill && !attributes.width) {
        issues.push({
          type: "missing-dimensions",
          severity: "medium",
          description: "Missing sizes prop may cause suboptimal image loading",
        });
      }

      // Priority should be used for above-the-fold images
      if (!attributes.priority) {
        issues.push({
          type: "missing-dimensions",
          severity: "low",
          description:
            "Consider adding priority prop for above-the-fold images",
        });
      }
    }

    // Large image format detection
    if (src && this.isLargeImageFormat(src)) {
      issues.push({
        type: "large-size",
        severity: "medium",
        description:
          "Consider using modern image formats (WebP, AVIF) for better compression",
      });
    }

    // Wrong format detection
    if (src && this.isIneffientFormat(src)) {
      issues.push({
        type: "wrong-format",
        severity: "medium",
        description:
          "Consider using WebP or AVIF format for better performance",
      });
    }

    return issues;
  }

  /**
   * Calculate SEO score for an image (0-100)
   */
  private calculateImageSEOScore(
    tagName: string,
    attributes: ImageOptimizationAnalysis["images"][0]["attributes"],
    issues: ImageOptimizationAnalysis["images"][0]["issues"]
  ): number {
    let score = 100;

    // Deduct points for issues
    issues.forEach((issue) => {
      switch (issue.severity) {
        case "high":
          score -= 25;
          break;
        case "medium":
          score -= 15;
          break;
        case "low":
          score -= 5;
          break;
      }
    });

    // Bonus points for good practices
    if (tagName === "Image") {
      score += 10; // Using Next.js Image
    }

    if (attributes.alt && attributes.alt.length > 0) {
      score += 10; // Has meaningful alt text
    }

    if (attributes.width && attributes.height) {
      score += 10; // Has dimensions
    }

    if (attributes.placeholder) {
      score += 5; // Has placeholder
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get image format from path
   */
  private getImageFormat(imagePath: string): string | null {
    if (!imagePath) return null;

    const extension = path.extname(imagePath).toLowerCase();
    const formatMap: Record<string, string> = {
      ".jpg": "JPEG",
      ".jpeg": "JPEG",
      ".png": "PNG",
      ".gif": "GIF",
      ".svg": "SVG",
      ".webp": "WebP",
      ".avif": "AVIF",
    };

    return formatMap[extension] || null;
  }

  /**
   * Check if image format is large/unoptimized
   */
  private isLargeImageFormat(imagePath: string): boolean {
    const format = this.getImageFormat(imagePath);
    return format === "PNG" || format === "JPEG" || format === "GIF";
  }

  /**
   * Check if image format is inefficient
   */
  private isIneffientFormat(imagePath: string): boolean {
    const format = this.getImageFormat(imagePath);
    return format === "PNG" || format === "JPEG";
  }

  /**
   * Calculate image statistics
   */
  private calculateImageStatistics(
    images: ImageOptimizationAnalysis["images"],
    formatCounts: Record<string, number>
  ): ImageOptimizationAnalysis["statistics"] {
    const totalImages = images.length;
    const nextImageUsage = images.filter(
      (img) => img.type === "next/image"
    ).length;
    const imagesWithIssues = images.filter(
      (img) => img.issues.length > 0
    ).length;

    const totalScore = images.reduce((sum, img) => sum + img.seoScore, 0);
    const averageSeoScore =
      totalImages > 0 ? Math.round(totalScore / totalImages) : 0;

    return {
      totalImages,
      nextImageUsage,
      imagesWithIssues,
      averageSeoScore,
      imagesByFormat: formatCounts,
    };
  }

  /**
   * Generate image optimization recommendations
   */
  private generateImageRecommendations(
    images: ImageOptimizationAnalysis["images"],
    statistics: ImageOptimizationAnalysis["statistics"]
  ): string[] {
    const recommendations: string[] = [];

    // Next.js Image adoption
    const regularImages = images.filter((img) => img.type === "img").length;
    if (regularImages > 0) {
      recommendations.push(
        `Replace ${regularImages} regular <img> tags with Next.js <Image> component for automatic optimization`
      );
    }

    // Alt text issues
    const missingAlt = images.filter((img) =>
      img.issues.some((issue) => issue.type === "missing-alt")
    ).length;
    if (missingAlt > 0) {
      recommendations.push(
        `Add alt attributes to ${missingAlt} images for better accessibility and SEO`
      );
    }

    // Dimension issues
    const missingDimensions = images.filter((img) =>
      img.issues.some((issue) => issue.type === "missing-dimensions")
    ).length;
    if (missingDimensions > 0) {
      recommendations.push(
        `Add width/height attributes to ${missingDimensions} images to prevent layout shift`
      );
    }

    // Format optimization
    const inefficientFormats = images.filter((img) =>
      img.issues.some((issue) => issue.type === "wrong-format")
    ).length;
    if (inefficientFormats > 0) {
      recommendations.push(
        `Convert ${inefficientFormats} images to modern formats (WebP/AVIF) for better compression`
      );
    }

    // Background images
    const backgroundImages = images.filter(
      (img) => img.type === "background-image"
    ).length;
    if (backgroundImages > 0) {
      recommendations.push(
        `Consider replacing ${backgroundImages} CSS background images with <Image> components where possible`
      );
    }

    // Overall score improvement
    if (statistics.averageSeoScore < 70) {
      recommendations.push(
        "Focus on improving image SEO score by addressing missing alt texts, dimensions, and using Next.js Image"
      );
    }

    // Priority optimization
    const nextImages = images.filter((img) => img.type === "next/image");
    const withoutPriority = nextImages.filter(
      (img) => !img.attributes.priority
    ).length;
    if (withoutPriority > 0 && nextImages.length > 0) {
      recommendations.push(
        "Consider adding priority prop to above-the-fold Next.js Images for better LCP"
      );
    }

    return recommendations;
  }

  /**
   * Get detailed image analysis for a specific page
   */
  public getPageImageAnalysis(pagePath: string): Array<{
    image: ImageOptimizationAnalysis["images"][0];
    recommendations: string[];
  }> {
    const analysis = this.analyzeImageOptimization();
    const pageImages = analysis.images.filter((img) =>
      img.usedInPages.includes(pagePath)
    );

    return pageImages.map((image) => ({
      image,
      recommendations: this.getImageSpecificRecommendations(image),
    }));
  }

  /**
   * Get specific recommendations for an image
   */
  private getImageSpecificRecommendations(
    image: ImageOptimizationAnalysis["images"][0]
  ): string[] {
    const recommendations: string[] = [];

    image.issues.forEach((issue) => {
      switch (issue.type) {
        case "missing-alt":
          recommendations.push(
            "Add descriptive alt text that explains the image content"
          );
          break;
        case "missing-dimensions":
          if (image.type === "img") {
            recommendations.push(
              "Add width and height attributes to prevent layout shift"
            );
          } else {
            recommendations.push(
              "Add sizes prop for responsive images or use fill prop for intrinsic sizing"
            );
          }
          break;
        case "no-optimization":
          if (image.type === "img") {
            recommendations.push(
              "Replace with Next.js Image component for automatic optimization"
            );
          } else {
            recommendations.push(
              "Consider using Next.js Image instead of CSS background images"
            );
          }
          break;
        case "large-size":
          recommendations.push(
            "Optimize image size and consider using WebP/AVIF format"
          );
          break;
        case "wrong-format":
          recommendations.push(
            "Convert to WebP or AVIF format for better compression"
          );
          break;
      }
    });

    // Additional recommendations based on image type
    if (image.type === "next/image") {
      if (!image.attributes.placeholder) {
        recommendations.push(
          "Consider adding a placeholder for better loading experience"
        );
      }
      if (!image.attributes.sizes && !image.attributes.fill) {
        recommendations.push(
          "Add sizes prop to optimize loading for different screen sizes"
        );
      }
    }

    return recommendations;
  }

  /**
   * Get image optimization suggestions
   */
  public getImageOptimizationSuggestions(): string[] {
    const analysis = this.analyzeImageOptimization();
    return analysis.recommendations;
  }
}
