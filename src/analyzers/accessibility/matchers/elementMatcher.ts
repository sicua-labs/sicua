/**
 * Logic for matching JSX elements to applicable accessibility rules
 * Provides efficient rule lookup and filtering based on element characteristics
 */

import {
  JSXElementInfo,
  A11yRule,
  A11yRuleMatch,
  ElementSelector,
} from "../types/accessibilityTypes";
import { A11Y_RULES, A11yRuleManager } from "../rules/a11yRules";
import { JSXAnalysisUtils } from "../utils/jsxAnalysisUtils";
import { HTML_TAGS } from "../constants";

export class ElementMatcher {
  /**
   * Find all rules that apply to a given JSX element
   */
  static getApplicableRules(element: JSXElementInfo): A11yRule[] {
    const applicableRules: A11yRule[] = [];

    for (const rule of Object.values(A11Y_RULES)) {
      if (this.matchesSelector(element, rule.selector)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  /**
   * Create rule matches for an element with its applicable rules
   */
  static createRuleMatches(element: JSXElementInfo): A11yRuleMatch[] {
    const applicableRules = this.getApplicableRules(element);

    return applicableRules.map((rule) => ({
      rule,
      element,
    }));
  }

  /**
   * Batch process multiple elements to find all rule matches
   */
  static createRuleMatchesForElements(
    elements: JSXElementInfo[]
  ): A11yRuleMatch[] {
    const matches: A11yRuleMatch[] = [];

    for (const element of elements) {
      const elementMatches = this.createRuleMatches(element);
      matches.push(...elementMatches);
    }

    return matches;
  }

  /**
   * Check if an element matches a given selector
   */
  private static matchesSelector(
    element: JSXElementInfo,
    selector: ElementSelector
  ): boolean {
    // Check tag name match
    if (selector.tagName && element.tagName !== selector.tagName) {
      return false;
    }

    // Check tag names array match
    if (selector.tagNames && !selector.tagNames.includes(element.tagName)) {
      return false;
    }

    // Check required props (all must be present)
    if (selector.hasProps) {
      for (const requiredProp of selector.hasProps) {
        if (!JSXAnalysisUtils.hasProp(element, requiredProp)) {
          return false;
        }
      }
    }

    // Check any prop (at least one must be present)
    if (selector.hasAnyProp) {
      if (!JSXAnalysisUtils.hasAnyProp(element, selector.hasAnyProp)) {
        return false;
      }
    }

    // Check custom matcher
    if (selector.customMatcher) {
      if (!selector.customMatcher(element)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get rules that are specifically for HTML elements
   */
  static getHTMLElementRules(): A11yRule[] {
    return Object.values(A11Y_RULES).filter((rule) => {
      const selector = rule.selector;
      return (
        (selector.tagName && HTML_TAGS.includes(selector.tagName)) ||
        (selector.tagNames &&
          selector.tagNames.some((tag) => HTML_TAGS.includes(tag)))
      );
    });
  }

  /**
   * Get rules that apply to React components (non-HTML elements)
   */
  static getReactComponentRules(): A11yRule[] {
    return Object.values(A11Y_RULES).filter((rule) => {
      // Rules that check for props or custom matchers can apply to React components
      return (
        rule.selector.hasProps ||
        rule.selector.hasAnyProp ||
        rule.selector.customMatcher ||
        (!rule.selector.tagName && !rule.selector.tagNames)
      );
    });
  }

  /**
   * Filter elements by type (HTML vs React components)
   */
  static filterElementsByType(
    elements: JSXElementInfo[],
    type: "html" | "react"
  ): JSXElementInfo[] {
    return elements.filter((element) => {
      if (type === "html") {
        return JSXAnalysisUtils.isHTMLElement(element);
      } else {
        return JSXAnalysisUtils.isReactComponent(element);
      }
    });
  }

  /**
   * Get rules applicable to a specific WCAG level
   */
  static getRulesForWCAGLevel(level: "A" | "AA" | "AAA"): A11yRule[] {
    return A11yRuleManager.getRulesByWCAGLevel(level);
  }

  /**
   * Get rules with specific severity level
   */
  static getRulesForSeverity(
    severity: "error" | "warning" | "info"
  ): A11yRule[] {
    return A11yRuleManager.getRulesBySeverity(severity);
  }

  /**
   * Find elements that match a specific rule
   */
  static findElementsForRule(
    elements: JSXElementInfo[],
    ruleId: string
  ): JSXElementInfo[] {
    const rule = A11Y_RULES[ruleId];
    if (!rule) {
      return [];
    }

    return elements.filter((element) =>
      this.matchesSelector(element, rule.selector)
    );
  }

  /**
   * Check if any elements in a collection match a rule
   */
  static hasElementsForRule(
    elements: JSXElementInfo[],
    ruleId: string
  ): boolean {
    const rule = A11Y_RULES[ruleId];
    if (!rule) {
      return false;
    }

    return elements.some((element) =>
      this.matchesSelector(element, rule.selector)
    );
  }

  /**
   * Get rule matches grouped by rule ID
   */
  static groupMatchesByRule(
    matches: A11yRuleMatch[]
  ): Record<string, A11yRuleMatch[]> {
    const grouped: Record<string, A11yRuleMatch[]> = {};

    for (const match of matches) {
      const ruleId = match.rule.id;
      if (!grouped[ruleId]) {
        grouped[ruleId] = [];
      }
      grouped[ruleId].push(match);
    }

    return grouped;
  }

  /**
   * Get rule matches grouped by element
   */
  static groupMatchesByElement(
    matches: A11yRuleMatch[]
  ): Map<JSXElementInfo, A11yRuleMatch[]> {
    const grouped = new Map<JSXElementInfo, A11yRuleMatch[]>();

    for (const match of matches) {
      const element = match.element;
      if (!grouped.has(element)) {
        grouped.set(element, []);
      }
      grouped.get(element)!.push(match);
    }

    return grouped;
  }

  /**
   * Find rules that have no matching elements (useful for coverage analysis)
   */
  static findUnusedRules(elements: JSXElementInfo[]): A11yRule[] {
    const unusedRules: A11yRule[] = [];

    for (const rule of Object.values(A11Y_RULES)) {
      const hasMatches = elements.some((element) =>
        this.matchesSelector(element, rule.selector)
      );

      if (!hasMatches) {
        unusedRules.push(rule);
      }
    }

    return unusedRules;
  }

  /**
   * Calculate rule coverage statistics
   */
  static calculateRuleCoverage(elements: JSXElementInfo[]): {
    totalRules: number;
    applicableRules: number;
    coveragePercentage: number;
    unusedRules: string[];
  } {
    const totalRules = Object.keys(A11Y_RULES).length;
    const unusedRules = this.findUnusedRules(elements);
    const applicableRules = totalRules - unusedRules.length;
    const coveragePercentage =
      totalRules > 0 ? (applicableRules / totalRules) * 100 : 0;

    return {
      totalRules,
      applicableRules,
      coveragePercentage,
      unusedRules: unusedRules.map((rule) => rule.id),
    };
  }

  /**
   * Optimize rule matching by pre-filtering based on element characteristics
   */
  static optimizedRuleMatching(elements: JSXElementInfo[]): A11yRuleMatch[] {
    const matches: A11yRuleMatch[] = [];

    // Group elements by tag name for efficient processing
    const elementsByTag = new Map<string, JSXElementInfo[]>();

    for (const element of elements) {
      const tagName = element.tagName;
      if (!elementsByTag.has(tagName)) {
        elementsByTag.set(tagName, []);
      }
      elementsByTag.get(tagName)!.push(element);
    }

    // Process rules more efficiently by matching tag-specific rules first
    for (const [tagName, tagElements] of elementsByTag) {
      const relevantRules = A11yRuleManager.getRulesForElement(tagName);

      for (const element of tagElements) {
        for (const rule of relevantRules) {
          if (this.matchesSelector(element, rule.selector)) {
            matches.push({ rule, element });
          }
        }
      }
    }

    // Process prop-based rules for all elements
    const propBasedRules = Object.values(A11Y_RULES).filter(
      (rule) =>
        rule.selector.hasProps ||
        rule.selector.hasAnyProp ||
        rule.selector.customMatcher
    );

    for (const element of elements) {
      const elementProps = Object.keys(element.props);
      const relevantPropRules = A11yRuleManager.getRulesForProps(elementProps);

      for (const rule of relevantPropRules) {
        if (this.matchesSelector(element, rule.selector)) {
          // Avoid duplicate matches
          const alreadyMatched = matches.some(
            (match) => match.rule.id === rule.id && match.element === element
          );

          if (!alreadyMatched) {
            matches.push({ rule, element });
          }
        }
      }
    }

    return matches;
  }
}
