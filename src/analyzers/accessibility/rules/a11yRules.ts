/**
 * Accessibility rule definitions using the rule-based system
 * Each rule contains metadata and validation logic
 */

import {
  INTERACTIVE_EVENT_HANDLERS,
  ARIA_LABELING_ATTRIBUTES,
  HEADING_TAGS,
} from "../constants";
import { A11yRule } from "../types/accessibilityTypes";
import { RuleValidators } from "../validators/ruleValidators";

export const A11Y_RULES: Record<string, A11yRule> = {
  // Image Accessibility Rules
  "img-alt": {
    id: "img-alt",
    name: "Images must have alt text",
    description:
      "All img elements must have an alt attribute for screen readers",
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "1.1.1",
    selector: {
      tagName: "img",
    },
    validator: RuleValidators.validateImageAlt,
  },

  "img-alt-meaningful": {
    id: "img-alt-meaningful",
    name: "Image alt text should be meaningful",
    description:
      'Alt text should describe the image content, not generic terms like "image" or "picture"',
    severity: "warning",
    wcagLevel: "A",
    wcagCriterion: "1.1.1",
    selector: {
      tagName: "img",
    },
    validator: RuleValidators.validateImageAlt,
  },

  // Form Accessibility Rules
  "input-label": {
    id: "input-label",
    name: "Form inputs must have labels",
    description: "All form inputs must have associated labels or ARIA labeling",
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "1.3.1",
    selector: {
      tagName: "input",
    },
    validator: RuleValidators.validateInputLabel,
  },

  "fieldset-legend": {
    id: "fieldset-legend",
    name: "Fieldsets should have legends",
    description:
      "Fieldset elements should contain a legend for better form structure",
    severity: "warning",
    wcagLevel: "A",
    wcagCriterion: "1.3.1",
    selector: {
      tagName: "fieldset",
    },
    validator: RuleValidators.validateFormStructure,
  },

  // Interactive Element Rules
  "button-text": {
    id: "button-text",
    name: "Buttons must have accessible text",
    description: "Button elements must have text content or ARIA labeling",
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "4.1.2",
    selector: {
      tagName: "button",
    },
    validator: RuleValidators.validateButtonText,
  },

  "link-text": {
    id: "link-text",
    name: "Links must have accessible text",
    description: "Link elements must have text content or ARIA labeling",
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "4.1.2",
    selector: {
      tagName: "a",
    },
    validator: RuleValidators.validateLinkText,
  },

  "link-text-descriptive": {
    id: "link-text-descriptive",
    name: "Link text should be descriptive",
    description:
      "Link text should describe the destination or purpose, avoid generic terms",
    severity: "warning",
    wcagLevel: "AA",
    wcagCriterion: "2.4.4",
    selector: {
      tagName: "a",
    },
    validator: RuleValidators.validateLinkText,
  },

  "interactive-role": {
    id: "interactive-role",
    name: "Interactive elements need proper roles",
    description:
      "Elements with click handlers should have appropriate ARIA roles",
    severity: "warning",
    wcagLevel: "A",
    wcagCriterion: "4.1.2",
    selector: {
      hasAnyProp: INTERACTIVE_EVENT_HANDLERS,
    },
    validator: RuleValidators.validateInteractiveRole,
  },

  // ARIA Rules
  "aria-role-valid": {
    id: "aria-role-valid",
    name: "ARIA roles must be valid",
    description: "Role attributes must contain valid ARIA role values",
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "4.1.2",
    selector: {
      hasProps: ["role"],
    },
    validator: RuleValidators.validateAriaRole,
  },

  "aria-hidden-value": {
    id: "aria-hidden-value",
    name: "aria-hidden must have valid value",
    description: 'aria-hidden attribute must be "true" or "false"',
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "4.1.2",
    selector: {
      hasProps: ["aria-hidden"],
    },
    validator: RuleValidators.validateAriaAttributes,
  },

  "aria-expanded-value": {
    id: "aria-expanded-value",
    name: "aria-expanded must have valid value",
    description:
      'aria-expanded attribute must be "true", "false", or "undefined"',
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "4.1.2",
    selector: {
      hasProps: ["aria-expanded"],
    },
    validator: RuleValidators.validateAriaAttributes,
  },

  "aria-empty-value": {
    id: "aria-empty-value",
    name: "ARIA labels should not be empty",
    description: "ARIA labeling attributes should have meaningful values",
    severity: "warning",
    wcagLevel: "A",
    wcagCriterion: "4.1.2",
    selector: {
      hasAnyProp: ARIA_LABELING_ATTRIBUTES,
    },
    validator: RuleValidators.validateAriaAttributes,
  },

  // Document Structure Rules
  "html-lang": {
    id: "html-lang",
    name: "HTML must have lang attribute",
    description:
      "The html element must have a lang attribute to identify the page language",
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "3.1.1",
    selector: {
      tagName: "html",
    },
    validator: RuleValidators.validateLangAttribute,
  },

  // Multi-element validation rules (handled separately)
  "heading-hierarchy-start": {
    id: "heading-hierarchy-start",
    name: "Page should start with h1",
    description: "The first heading should be an h1 element",
    severity: "warning",
    wcagLevel: "AA",
    wcagCriterion: "1.3.1",
    selector: {
      tagNames: HEADING_TAGS,
    },
    validator: () => null, // Handled by multi-element validator
  },

  "heading-hierarchy-skip": {
    id: "heading-hierarchy-skip",
    name: "Do not skip heading levels",
    description:
      "Heading levels should not be skipped (e.g., h1 followed by h3)",
    severity: "warning",
    wcagLevel: "AA",
    wcagCriterion: "1.3.1",
    selector: {
      tagNames: HEADING_TAGS,
    },
    validator: () => null, // Handled by multi-element validator
  },

  "duplicate-id": {
    id: "duplicate-id",
    name: "IDs must be unique",
    description: "Element IDs must be unique within the component",
    severity: "error",
    wcagLevel: "A",
    wcagCriterion: "4.1.1",
    selector: {
      hasProps: ["id"],
    },
    validator: () => null, // Handled by multi-element validator
  },
};

// Rule categories for better organization and filtering
export const RULE_CATEGORIES = {
  IMAGES: ["img-alt", "img-alt-meaningful"],
  FORMS: ["input-label", "fieldset-legend"],
  INTERACTIVE: [
    "button-text",
    "link-text",
    "link-text-descriptive",
    "interactive-role",
  ],
  ARIA: [
    "aria-role-valid",
    "aria-hidden-value",
    "aria-expanded-value",
    "aria-empty-value",
  ],
  STRUCTURE: [
    "html-lang",
    "heading-hierarchy-start",
    "heading-hierarchy-skip",
    "duplicate-id",
  ],
} as const;

// WCAG level groupings
export const WCAG_LEVELS = {
  A: [
    "img-alt",
    "img-alt-meaningful",
    "input-label",
    "fieldset-legend",
    "button-text",
    "link-text",
    "interactive-role",
    "aria-role-valid",
    "aria-hidden-value",
    "aria-expanded-value",
    "aria-empty-value",
    "html-lang",
    "duplicate-id",
  ],
  AA: [
    "link-text-descriptive",
    "heading-hierarchy-start",
    "heading-hierarchy-skip",
  ],
  AAA: [], // No AAA rules in current set
} as const;

// Severity groupings
export const SEVERITY_LEVELS = {
  error: [
    "img-alt",
    "input-label",
    "button-text",
    "link-text",
    "aria-role-valid",
    "aria-hidden-value",
    "aria-expanded-value",
    "html-lang",
    "duplicate-id",
  ],
  warning: [
    "img-alt-meaningful",
    "fieldset-legend",
    "link-text-descriptive",
    "interactive-role",
    "aria-empty-value",
    "heading-hierarchy-start",
    "heading-hierarchy-skip",
  ],
  info: [], // No info level rules in current set
} as const;

// Multi-element validation rules that require special handling
export const MULTI_ELEMENT_RULES = [
  "heading-hierarchy-start",
  "heading-hierarchy-skip",
  "duplicate-id",
] as const;

// Helper functions for rule management
export class A11yRuleManager {
  /**
   * Get all rules for a specific WCAG level
   */
  static getRulesByWCAGLevel(level: "A" | "AA" | "AAA"): A11yRule[] {
    const ruleIds = WCAG_LEVELS[level];
    return ruleIds.map((id) => A11Y_RULES[id]);
  }

  /**
   * Get all rules for a specific severity level
   */
  static getRulesBySeverity(
    severity: "error" | "warning" | "info"
  ): A11yRule[] {
    const ruleIds = SEVERITY_LEVELS[severity];
    return ruleIds.map((id) => A11Y_RULES[id]);
  }

  /**
   * Get all rules in a specific category
   */
  static getRulesByCategory(
    category: keyof typeof RULE_CATEGORIES
  ): A11yRule[] {
    const ruleIds = RULE_CATEGORIES[category];
    return ruleIds.map((id) => A11Y_RULES[id]);
  }

  /**
   * Get all rule IDs
   */
  static getAllRuleIds(): string[] {
    return Object.keys(A11Y_RULES);
  }

  /**
   * Check if a rule requires multi-element validation
   */
  static isMultiElementRule(ruleId: string): boolean {
    return MULTI_ELEMENT_RULES.includes(
      ruleId as (typeof MULTI_ELEMENT_RULES)[number]
    );
  }

  /**
   * Get rules that apply to a specific element tag
   */
  static getRulesForElement(tagName: string): A11yRule[] {
    return Object.values(A11Y_RULES).filter((rule) => {
      const selector = rule.selector;
      return (
        selector.tagName === tagName || selector.tagNames?.includes(tagName)
      );
    });
  }

  /**
   * Get rules that check for specific props
   */
  static getRulesForProps(props: string[]): A11yRule[] {
    return Object.values(A11Y_RULES).filter((rule) => {
      const selector = rule.selector;

      if (selector.hasProps) {
        return selector.hasProps.some((prop) => props.includes(prop));
      }

      if (selector.hasAnyProp) {
        return selector.hasAnyProp.some((prop) => props.includes(prop));
      }

      return false;
    });
  }
}
