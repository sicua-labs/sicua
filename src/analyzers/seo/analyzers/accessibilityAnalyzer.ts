import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { StaticA11yAnalysis } from "../../../types/seoCoverageTypes";
import { ComponentUtils } from "../utils/componentUtils";
import { JsxUtils } from "../utils/jsxUtils";
import { SeoRelated } from "../../../utils/common/seoRelatedUtils";
import { PageComponentMap } from "../types/internalTypes";

/**
 * Analyzer for accessibility factors affecting SEO
 */
export class AccessibilityAnalyzer {
  private pageComponents: PageComponentMap;

  constructor(pageComponents: PageComponentMap) {
    this.pageComponents = pageComponents;
  }

  /**
   * Analyze accessibility aspects that affect SEO
   */
  public analyzeAccessibility(): StaticA11yAnalysis {
    const analysis: StaticA11yAnalysis = {
      images: {
        totalImages: 0,
        missingAlt: 0,
        emptyAlt: 0,
        decorativeImages: 0,
      },
      aria: {
        totalAttributes: 0,
        byAttribute: {},
        potentialMisuse: [],
      },
      buttons: {
        total: 0,
        missingText: 0,
        onlyIconButtons: 0,
      },
      forms: {
        inputs: {
          total: 0,
          missingLabels: 0,
          missingAriaLabels: 0,
        },
      },
    };

    // Analyze each page component
    this.pageComponents.forEach((component) => {
      if (!component.content) return;

      const sourceFile = ComponentUtils.getSourceFile(component);
      if (!sourceFile) return;

      const visitNode = (node: ts.Node) => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          this.analyzeAccessibilityNode(node, analysis);
        }
        ts.forEachChild(node, visitNode);
      };

      visitNode(sourceFile);
    });

    return analysis;
  }

  /**
   * Analyze a single JSX node for accessibility issues
   */
  private analyzeAccessibilityNode(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    analysis: StaticA11yAnalysis
  ): void {
    const tagName = JsxUtils.getTagName(node).toLowerCase();

    // Analyze images
    if (tagName === "img") {
      analysis.images.totalImages++;
      const altAttribute = JsxUtils.getAttribute(node, "alt");

      if (!altAttribute) {
        analysis.images.missingAlt++;
      } else if (altAttribute === "") {
        analysis.images.decorativeImages++;
      }
    }

    // Analyze buttons
    if (
      tagName === "button" ||
      JsxUtils.getAttribute(node, "role") === "button"
    ) {
      analysis.buttons.total++;
      if (!JsxUtils.hasAccessibleText(node)) {
        analysis.buttons.missingText++;
      }
      if (JsxUtils.isIconOnlyButton(node)) {
        analysis.buttons.onlyIconButtons++;
      }
    }

    // Analyze form inputs
    if (tagName === "input") {
      analysis.forms.inputs.total++;
      if (!this.hasAssociatedLabel(node)) {
        analysis.forms.inputs.missingLabels++;
      }
      if (
        !JsxUtils.getAttribute(node, "aria-label") &&
        !JsxUtils.getAttribute(node, "aria-labelledby")
      ) {
        analysis.forms.inputs.missingAriaLabels++;
      }
    }

    // Analyze ARIA attributes
    this.analyzeAriaAttributes(node, analysis.aria);
  }

  /**
   * Check if an input has an associated label
   */
  private hasAssociatedLabel(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    // Check for id attribute that might be referenced by a label
    const id = JsxUtils.getAttribute(node, "id");
    if (!id) return false;

    // Search parent components for associated label
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isJsxElement(current)) {
        const hasLabel = current.children.some((child) => {
          if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child))
            return false;
          const tagName = JsxUtils.getTagName(child).toLowerCase();
          if (tagName !== "label") return false;

          const htmlFor = JsxUtils.getAttribute(child, "htmlFor");
          return htmlFor === id;
        });

        if (hasLabel) return true;
      }
      current = current.parent;
    }

    return false;
  }

  /**
   * Analyze ARIA attributes in a node
   */
  private analyzeAriaAttributes(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    ariaAnalysis: StaticA11yAnalysis["aria"]
  ): void {
    const attributes = JsxUtils.getAllAttributes(node);

    for (const attr of attributes) {
      const attrName = attr.name;
      if (attrName.startsWith("aria-")) {
        ariaAnalysis.totalAttributes++;
        ariaAnalysis.byAttribute[attrName] =
          (ariaAnalysis.byAttribute[attrName] || 0) + 1;

        // Check for potential misuse
        this.checkAriaAttributeMisuse(node, attrName, ariaAnalysis);
      }
    }
  }

  /**
   * Check for misuse of ARIA attributes
   */
  private checkAriaAttributeMisuse(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    attribute: string,
    ariaAnalysis: StaticA11yAnalysis["aria"]
  ): void {
    const tagName = JsxUtils.getTagName(node).toLowerCase();

    // Example check: aria-label on elements that shouldn't have it
    if (
      attribute === "aria-label" &&
      ["br", "hr", "script", "style"].includes(tagName)
    ) {
      ariaAnalysis.potentialMisuse.push({
        element: tagName,
        attribute,
        issue: `${attribute} should not be used on <${tagName}> elements`,
      });
    }
  }

  /**
   * Get accessibility improvement suggestions
   */
  public getAccessibilityImprovementSuggestions(): string[] {
    const analysis = this.analyzeAccessibility();
    const suggestions: string[] = [];

    // Check for missing alt attributes
    if (analysis.images.totalImages > 0) {
      const missingAltPercentage =
        (analysis.images.missingAlt / analysis.images.totalImages) * 100;
      if (missingAltPercentage > 10) {
        suggestions.push(
          `Add alt attributes to ${analysis.images.missingAlt} images to improve accessibility and SEO.`
        );
      }
    }

    // Check for buttons without accessible text
    if (analysis.buttons.total > 0) {
      const missingTextPercentage =
        (analysis.buttons.missingText / analysis.buttons.total) * 100;
      if (missingTextPercentage > 10) {
        suggestions.push(
          `Add accessible text to ${analysis.buttons.missingText} buttons without proper labels.`
        );
      }
    }

    // Check for form inputs without labels
    if (analysis.forms.inputs.total > 0) {
      const missingLabelsPercentage =
        (analysis.forms.inputs.missingLabels / analysis.forms.inputs.total) *
        100;
      if (missingLabelsPercentage > 10) {
        suggestions.push(
          `Add proper labels to ${analysis.forms.inputs.missingLabels} form inputs.`
        );
      }
    }

    // Check for aria attribute misuse
    if (analysis.aria.potentialMisuse.length > 0) {
      suggestions.push(
        `Fix ${analysis.aria.potentialMisuse.length} instances of ARIA attribute misuse.`
      );
    }

    return suggestions;
  }
}
