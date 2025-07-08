/**
 * Context analyzer for accessibility validation
 * Analyzes surrounding elements and component context for accessibility patterns
 */

import { JSXElementInfo } from "../types/accessibilityTypes";
import { JSXAnalysisUtils } from "./jsxAnalysisUtils";
import { TextContentExtractor } from "./textContentExtractor";
import {
  ARIA_LABELING_ATTRIBUTES,
  ICON_COMPONENT_PATTERNS,
  INPUT_TYPES_WITHOUT_LABELS,
  LABELING_PROP_NAMES,
} from "../constants";

export class ContextAnalyzer {
  /**
   * Analyzes if a form input has proper labeling considering context
   */
  static hasFormInputLabeling(
    element: JSXElementInfo,
    allElements: JSXElementInfo[]
  ): boolean {
    // Skip input types that don't require labels
    const inputType = JSXAnalysisUtils.getPropStringValue(element, "type");
    if (inputType && INPUT_TYPES_WITHOUT_LABELS.includes(inputType)) {
      return true;
    }

    // Check if input is hidden
    if (this.isHiddenInput(element)) {
      return true;
    }

    // Check for direct ARIA labeling
    if (this.hasDirectLabeling(element)) {
      return true;
    }

    // Check for associated label elements
    if (this.hasAssociatedLabel(element, allElements)) {
      return true;
    }

    // Check for parent label element
    if (this.hasParentLabel(element)) {
      return true;
    }

    // Check for placeholder as fallback (warning level)
    if (this.hasPlaceholderText(element)) {
      return true; // Consider as labeled but should generate warning elsewhere
    }

    // Check for props that might be passed through (common in component libraries)
    if (this.hasLabelingProps(element)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if an input is hidden and doesn't need labeling
   */
  private static isHiddenInput(element: JSXElementInfo): boolean {
    // Check for hidden type
    const inputType = JSXAnalysisUtils.getPropStringValue(element, "type");
    if (inputType === "hidden") {
      return true;
    }

    // Check for hidden class patterns
    const className = JSXAnalysisUtils.getPropStringValue(element, "className");
    if (className) {
      const hiddenPatterns = [
        /\bhidden\b/,
        /\binvisible\b/,
        /\bopacity-0\b/,
        /\bsr-only\b/,
        /\bscreen-reader-only\b/,
      ];

      return hiddenPatterns.some((pattern) => pattern.test(className));
    }

    // Check for style-based hiding
    const style = JSXAnalysisUtils.getPropStringValue(element, "style");
    if (style) {
      return /display:\s*none|visibility:\s*hidden|opacity:\s*0/.test(style);
    }

    return false;
  }

  /**
   * Checks for direct ARIA labeling attributes
   */
  private static hasDirectLabeling(element: JSXElementInfo): boolean {
    for (const attr of ARIA_LABELING_ATTRIBUTES) {
      const value = JSXAnalysisUtils.getPropStringValue(element, attr);
      if (value && value.trim()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks for associated label elements using htmlFor/id relationship
   */
  private static hasAssociatedLabel(
    element: JSXElementInfo,
    allElements: JSXElementInfo[]
  ): boolean {
    const elementId = JSXAnalysisUtils.getPropStringValue(element, "id");
    if (!elementId) {
      return false;
    }

    // Find label elements that reference this input
    return allElements.some((el) => {
      if (el.tagName.toLowerCase() !== "label") {
        return false;
      }

      const htmlFor =
        JSXAnalysisUtils.getPropStringValue(el, "htmlFor") ||
        JSXAnalysisUtils.getPropStringValue(el, "for");

      return htmlFor === elementId;
    });
  }

  /**
   * Checks if element is wrapped in a label element
   */
  private static hasParentLabel(element: JSXElementInfo): boolean {
    // This would require parent traversal which isn't available in current structure
    // For now, we'll check if this is commonly implemented via component patterns
    return false; // TODO: Implement when parent traversal is available
  }

  /**
   * Checks for placeholder text as a fallback labeling mechanism
   */
  private static hasPlaceholderText(element: JSXElementInfo): boolean {
    const placeholder = JSXAnalysisUtils.getPropStringValue(
      element,
      "placeholder"
    );
    return Boolean(placeholder && placeholder.trim());
  }

  /**
   * Checks for labeling props that might be spread or passed through
   */
  private static hasLabelingProps(element: JSXElementInfo): boolean {
    return LABELING_PROP_NAMES.some((prop) =>
      JSXAnalysisUtils.hasProp(element, prop)
    );
  }

  /**
   * Analyzes interactive elements for proper roles and labeling
   */
  static hasInteractiveLabeling(element: JSXElementInfo): boolean {
    // Check for accessible text content
    if (TextContentExtractor.hasAccessibleText(element)) {
      return true;
    }

    // Check if element likely has text but we can't extract it
    if (TextContentExtractor.likelyHasText(element)) {
      return true;
    }

    // Check for ARIA labeling
    if (this.hasDirectLabeling(element)) {
      return true;
    }

    // For icon-only buttons, require explicit labeling
    if (this.isIconOnlyElement(element)) {
      return this.hasExplicitLabeling(element);
    }

    return false;
  }

  /**
   * Checks if element appears to be icon-only
   */
  private static isIconOnlyElement(element: JSXElementInfo): boolean {
    // Check for common icon indicators
    const className = JSXAnalysisUtils.getPropStringValue(element, "className");
    if (className) {
      const iconPatterns = [
        /\bicon\b/,
        /\bfa-/,
        /\bmaterial-icons\b/,
        /\blucide\b/,
        /\bfeather\b/,
        /\bheroicons\b/,
      ];

      if (iconPatterns.some((pattern) => pattern.test(className))) {
        return true;
      }
    }

    // Check for icon-like children
    const hasIconChildren = element.children.some((child) => {
      const childTag = child.tagName.toLowerCase();
      return (
        childTag === "svg" ||
        childTag === "icon" ||
        childTag.includes("icon") ||
        this.isIconComponent(child)
      );
    });

    return hasIconChildren;
  }

  /**
   * Checks if a child element is likely an icon component
   */
  private static isIconComponent(element: JSXElementInfo): boolean {
    const tagName = element.tagName;

    return ICON_COMPONENT_PATTERNS.some((pattern) => pattern.test(tagName));
  }

  /**
   * Checks for explicit labeling required for icon-only elements
   */
  private static hasExplicitLabeling(element: JSXElementInfo): boolean {
    const explicitLabels = ["aria-label", "aria-labelledby", "title"];

    return explicitLabels.some((attr) => {
      const value = JSXAnalysisUtils.getPropStringValue(element, attr);
      return Boolean(value && value.trim());
    });
  }

  /**
   * Analyzes if a link has descriptive text considering context
   */
  static hasDescriptiveLinkText(element: JSXElementInfo): boolean {
    const text = TextContentExtractor.extractAccessibleText(element);

    if (!text) {
      return false;
    }

    // Check against non-descriptive patterns
    const nonDescriptivePatterns = [
      /^(click here|here|this|that|more|read more|learn more|see more|view more|show more|continue|next|previous|prev|back|forward|go|download|open|view|see|watch|listen)$/i,
      /^(link|url|website|page|site|document|file|article|post|item|content|details|info|information)$/i,
      /^[>\<»«x+\-123]$/,
      /^lorem ipsum/i,
      /^(placeholder|example|sample|test)$/i,
    ];

    return !nonDescriptivePatterns.some((pattern) => pattern.test(text.trim()));
  }

  /**
   * Checks if an element is within a form context
   */
  static isInFormContext(allElements: JSXElementInfo[]): boolean {
    // Check if any parent elements are forms
    // This would require parent traversal - for now check for form-related siblings
    const formElements = allElements.filter(
      (el) =>
        el.tagName.toLowerCase() === "form" ||
        el.tagName.toLowerCase() === "fieldset"
    );

    return formElements.length > 0;
  }

  /**
   * Analyzes component props for accessibility patterns
   */
  static hasAccessibilityProps(element: JSXElementInfo): boolean {
    const a11yProps = Object.keys(element.props).filter(
      (prop) =>
        prop.startsWith("aria-") ||
        prop.startsWith("data-testid") ||
        ["role", "tabIndex", "title"].includes(prop)
    );

    return a11yProps.length > 0;
  }

  /**
   * Checks for spread props that might contain accessibility attributes
   */
  static hasSpreadProps(element: JSXElementInfo): boolean {
    // Look for common spread prop patterns
    const spreadPatterns = [
      "...props",
      "...rest",
      "...otherProps",
      "...additionalProps",
      "...a11yProps",
      "...accessibility",
    ];

    return (
      Object.keys(element.props).some((prop) =>
        spreadPatterns.some((pattern) =>
          prop.includes(pattern.replace("...", ""))
        )
      ) ||
      Object.values(element.props).some(
        (propValue) =>
          propValue.type === "expression" &&
          propValue.rawValue &&
          spreadPatterns.some((pattern) =>
            propValue.rawValue!.includes(pattern)
          )
      )
    );
  }

  /**
   * Determines severity level based on context analysis
   */
  static determineSeverity(
    element: JSXElementInfo,
    hasIssue: boolean,
    hasPartialSupport: boolean
  ): "error" | "warning" | "info" | null {
    if (!hasIssue) {
      return null;
    }

    // Error level: Critical accessibility missing
    if (!hasPartialSupport && !this.hasSpreadProps(element)) {
      return "error";
    }

    // Warning level: Some accessibility but not complete
    if (hasPartialSupport || this.hasSpreadProps(element)) {
      return "warning";
    }

    // Info level: Minor improvements
    return "info";
  }

  /**
   * Provides context-aware suggestions for accessibility improvements
   */
  static getSuggestions(element: JSXElementInfo): string[] {
    const suggestions: string[] = [];

    if (element.tagName === "input") {
      if (!this.hasDirectLabeling(element)) {
        suggestions.push("Add aria-label or associate with a label element");
      }
    }

    if (element.tagName === "button") {
      if (
        this.isIconOnlyElement(element) &&
        !this.hasExplicitLabeling(element)
      ) {
        suggestions.push("Icon-only buttons should have aria-label");
      }
    }

    if (element.tagName === "a") {
      const text = TextContentExtractor.extractAccessibleText(element);
      if (text && !this.hasDescriptiveLinkText(element)) {
        suggestions.push("Use more descriptive link text");
      }
    }

    return suggestions;
  }
}
