/**
 * Individual validator functions for accessibility rules
 * Updated to use enhanced text extraction and context analysis
 */

import {
  ARIA_ATTRIBUTE_VALUES,
  ARIA_LABELING_ATTRIBUTES,
  INTERACTIVE_ARIA_ROLES,
  MEANINGLESS_ALT_PATTERNS,
  VALID_ARIA_ROLES,
} from "../constants";
import {
  JSXElementInfo,
  AccessibilityViolation,
  JSXPropValue,
} from "../types/accessibilityTypes";
import { JSXAnalysisUtils } from "../utils/jsxAnalysisUtils";
import { TextContentExtractor } from "../utils/textContentExtractor";
import { ContextAnalyzer } from "../utils/contextAnalyzer";

export class RuleValidators {
  /**
   * Images must have alt text - WCAG 1.1.1 (Level A)
   */
  static validateImageAlt(
    element: JSXElementInfo
  ): AccessibilityViolation | null {
    if (element.tagName !== "img") return null;

    const altProp = JSXAnalysisUtils.getPropValue(element, "alt");

    if (!altProp) {
      return {
        ruleId: "img-alt",
        severity: "error",
        message: "img element must have an alt attribute",
        element: element.tagName,
        elementLocation: element.location,
        context: element.context,
      };
    }

    // Check for empty alt text (decorative images should have alt="")
    if (altProp.type === "string" && altProp.value === "") {
      return null; // Valid for decorative images
    }

    // Enhanced meaningless alt text detection
    if (altProp.type === "string") {
      const altText = (altProp.value as string).toLowerCase().trim();

      if (MEANINGLESS_ALT_PATTERNS.some((pattern) => altText === pattern)) {
        return {
          ruleId: "img-alt-meaningful",
          severity: "warning",
          message: `Alt text "${altText}" is not descriptive. Use text that describes the image content or purpose.`,
          element: element.tagName,
          elementLocation: element.location,
          context: element.context,
        };
      }

      // Check for file extension patterns
      if (/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i.test(altText)) {
        return {
          ruleId: "img-alt-meaningful",
          severity: "warning",
          message:
            "Alt text should not contain file extensions. Describe the image content instead.",
          element: element.tagName,
          elementLocation: element.location,
          context: element.context,
        };
      }
    }

    return null;
  }

  /**
   * Form inputs must have labels - WCAG 1.3.1 (Level A)
   */
  static validateInputLabel(
    element: JSXElementInfo,
    allElements?: JSXElementInfo[]
  ): AccessibilityViolation | null {
    if (element.tagName !== "input") return null;

    // Use context analyzer for comprehensive labeling check
    const hasLabeling = ContextAnalyzer.hasFormInputLabeling(
      element,
      allElements || []
    );

    if (!hasLabeling) {
      const suggestions = ContextAnalyzer.getSuggestions(element);
      const severity = ContextAnalyzer.determineSeverity(element, true, false);

      return {
        ruleId: "input-label",
        severity: severity || "error",
        message: `Form input must have accessible labeling. ${suggestions.join(
          ". "
        )}`,
        element: element.tagName,
        elementLocation: element.location,
        context: element.context,
      };
    }

    // Check for placeholder-only labeling (should warn)
    const hasPlaceholder = JSXAnalysisUtils.getPropStringValue(
      element,
      "placeholder"
    );
    const hasDirectLabeling =
      ARIA_LABELING_ATTRIBUTES.some((attr) =>
        JSXAnalysisUtils.hasProp(element, attr)
      ) || JSXAnalysisUtils.hasProp(element, "title");

    if (hasPlaceholder && !hasDirectLabeling) {
      return {
        ruleId: "input-label",
        severity: "warning",
        message:
          "Relying only on placeholder text for labeling is not sufficient. Consider adding aria-label or a label element.",
        element: element.tagName,
        elementLocation: element.location,
        context: element.context,
      };
    }

    return null;
  }

  /**
   * Buttons must have accessible text - WCAG 4.1.2 (Level A)
   */
  static validateButtonText(
    element: JSXElementInfo
  ): AccessibilityViolation | null {
    if (element.tagName !== "button") return null;

    // Use enhanced text extraction
    const hasText = TextContentExtractor.hasAccessibleText(element);
    const likelyHasText = TextContentExtractor.likelyHasText(element);

    if (hasText || likelyHasText) {
      return null; // Has or likely has accessible text
    }

    // Check for ARIA labeling
    const hasDirectLabeling =
      ARIA_LABELING_ATTRIBUTES.some((attr) =>
        JSXAnalysisUtils.hasProp(element, attr)
      ) || JSXAnalysisUtils.hasProp(element, "title");

    if (hasDirectLabeling) {
      return null;
    }

    // Special case: Icon-only buttons should have explicit labeling
    if (this.isIconOnlyButton(element)) {
      return {
        ruleId: "button-text",
        severity: "error",
        message:
          "Icon-only button must have aria-label or aria-labelledby for accessibility",
        element: element.tagName,
        elementLocation: element.location,
        context: element.context,
      };
    }

    // Determine context and severity
    const hasSpreadProps = ContextAnalyzer.hasSpreadProps(element);
    let severity: "error" | "warning" = "error";
    let message = "Button must have accessible text content or aria-label";

    if (hasSpreadProps) {
      severity = "warning";
      message +=
        ". Note: Button uses spread props which may contain accessibility attributes.";
    }

    return {
      ruleId: "button-text",
      severity,
      message,
      element: element.tagName,
      elementLocation: element.location,
      context: element.context,
    };
  }

  /**
   * Check if button is icon-only (has only decorative children)
   */
  private static isIconOnlyButton(element: JSXElementInfo): boolean {
    if (!element.children || element.children.length === 0) {
      return false;
    }

    // Check if all children are decorative
    const allChildrenDecorative = element.children.every((child) => {
      return TextContentExtractor["isDecorativeElement"](child);
    });

    // Also check context for icon patterns
    if (element.context) {
      const hasOnlyIcons =
        /^<Button[^>]*>\s*<[A-Z][a-zA-Z]*\s+[^>]*\/>\s*<\/Button>$/m.test(
          element.context
        );
      if (hasOnlyIcons) {
        return true;
      }
    }

    return allChildrenDecorative;
  }

  /**
   * Links must have accessible text - WCAG 4.1.2 (Level A)
   */
  static validateLinkText(
    element: JSXElementInfo
  ): AccessibilityViolation | null {
    if (element.tagName !== "a") return null;

    // Enhanced text extraction
    const accessibleText = TextContentExtractor.extractAccessibleText(element);
    const hasText = TextContentExtractor.hasAccessibleText(element);
    const likelyHasText = TextContentExtractor.likelyHasText(element);

    if (!hasText && !likelyHasText) {
      // Check for ARIA labeling
      const hasDirectLabeling =
        ARIA_LABELING_ATTRIBUTES.some((attr) =>
          JSXAnalysisUtils.hasProp(element, attr)
        ) || JSXAnalysisUtils.hasProp(element, "title");

      if (hasDirectLabeling) {
        return null;
      }

      const hasSpreadProps = ContextAnalyzer.hasSpreadProps(element);
      const severity = hasSpreadProps ? "warning" : "error";

      let message = "Link must have accessible text content or aria-label";
      if (hasSpreadProps) {
        message +=
          ". Note: Link uses spread props which may contain accessibility attributes.";
      }

      return {
        ruleId: "link-text",
        severity,
        message,
        element: element.tagName,
        elementLocation: element.location,
        context: element.context,
      };
    }

    // Check for descriptive text if we have actual text content
    if (hasText && accessibleText) {
      const isDescriptive = ContextAnalyzer.hasDescriptiveLinkText(element);

      if (!isDescriptive) {
        return {
          ruleId: "link-text-descriptive",
          severity: "warning",
          message: `Link text "${accessibleText}" is not descriptive. Use text that describes the destination or purpose.`,
          element: element.tagName,
          elementLocation: element.location,
          context: element.context,
        };
      }
    }

    return null;
  }

  /**
   * Validate ARIA roles are valid - WCAG 4.1.2 (Level A)
   */
  static validateAriaRole(
    element: JSXElementInfo
  ): AccessibilityViolation | null {
    const roleProp = JSXAnalysisUtils.getPropValue(element, "role");
    if (!roleProp) return null;

    let roleValue: string | undefined;

    switch (roleProp.type) {
      case "string":
        roleValue = roleProp.value as string;
        break;
      case "expression":
        if (roleProp.rawValue) {
          // Handle conditional expressions like: role={condition ? "button" : undefined}
          const conditionalMatch = roleProp.rawValue.match(
            /.*\?\s*["']([^"']+)["']\s*:\s*(?:undefined|null|["']([^"']*)["'])/
          );
          if (conditionalMatch) {
            // Validate the non-undefined role value
            const primaryRole = conditionalMatch[1];
            const fallbackRole = conditionalMatch[2];

            if (primaryRole && !VALID_ARIA_ROLES.includes(primaryRole)) {
              return this.createInvalidRoleError(element, primaryRole);
            }

            if (
              fallbackRole &&
              fallbackRole !== "" &&
              !VALID_ARIA_ROLES.includes(fallbackRole)
            ) {
              return this.createInvalidRoleError(element, fallbackRole);
            }

            return null; // Valid conditional role
          }

          // Handle simple string literals in expressions like: role={"button"}
          const stringLiteralMatch =
            roleProp.rawValue.match(/^["']([^"']+)["']$/);
          if (stringLiteralMatch) {
            roleValue = stringLiteralMatch[1];
          } else {
            // For complex expressions we can't statically validate, skip validation
            // unless it's obviously invalid
            if (this.isObviouslyInvalidRole(roleProp.rawValue)) {
              return this.createInvalidRoleError(element, roleProp.rawValue);
            }
            return null;
          }
        }
        break;
      default:
        return null; // Skip validation for other types
    }

    if (!roleValue) return null;

    // Handle multiple roles (space-separated)
    const roles = roleValue.split(/\s+/).filter((role) => role.trim());

    for (const role of roles) {
      const trimmedRole = role.trim();
      if (trimmedRole && !VALID_ARIA_ROLES.includes(trimmedRole)) {
        return this.createInvalidRoleError(element, trimmedRole);
      }
    }

    return null;
  }

  /**
   * Helper method to create invalid role error
   */
  private static createInvalidRoleError(
    element: JSXElementInfo,
    invalidRole: string
  ): AccessibilityViolation {
    return {
      ruleId: "aria-role-valid",
      severity: "error",
      message: `Invalid ARIA role "${invalidRole}". Must be a valid ARIA role: ${VALID_ARIA_ROLES.slice(
        0,
        10
      ).join(", ")}...`,
      element: element.tagName,
      elementLocation: element.location,
      context: element.context,
    };
  }

  /**
   * Check if a role expression is obviously invalid
   */
  private static isObviouslyInvalidRole(expression: string): boolean {
    const cleanExpr = expression.trim();

    // Don't flag variables, function calls, or property access as invalid
    if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*(\(\s*.*\s*\))?$/.test(cleanExpr)) {
      return false;
    }

    // Don't flag ternary expressions
    if (/^.+\?\s*.+\s*:\s*.+$/.test(cleanExpr)) {
      return false;
    }

    // Don't flag logical expressions
    if (/^.+\s*(&&|\|\|)\s*.+$/.test(cleanExpr)) {
      return false;
    }

    // Only flag if it's a string literal with an obviously invalid role
    const stringMatch = cleanExpr.match(/^["']([^"']+)["']$/);
    if (stringMatch) {
      const role = stringMatch[1];
      return !VALID_ARIA_ROLES.includes(role);
    }

    return false;
  }

  /**
   * Interactive elements should not have onClick without proper role
   */
  static validateInteractiveRole(
    element: JSXElementInfo
  ): AccessibilityViolation | null {
    // Check if element has interactive event handlers
    const hasOnClick = [
      "onClick",
      "onPress",
      "onTap",
      "onKeyDown",
      "onKeyPress",
      "onKeyUp",
    ].some((handler) => JSXAnalysisUtils.hasProp(element, handler));

    if (!hasOnClick) return null;

    // Allow inherently interactive HTML elements
    const interactiveElements = [
      "button",
      "a",
      "input",
      "select",
      "textarea",
      "details",
      "summary",
    ];
    if (interactiveElements.includes(element.tagName.toLowerCase())) {
      return null;
    }

    // Check for proper ARIA role
    const roleProp = JSXAnalysisUtils.getPropStringValue(element, "role");
    if (roleProp && INTERACTIVE_ARIA_ROLES.includes(roleProp)) {
      return null;
    }

    // Check for keyboard accessibility
    const hasTabIndex = JSXAnalysisUtils.hasProp(element, "tabIndex");
    const hasKeyboardHandlers = ["onKeyDown", "onKeyPress", "onKeyUp"].some(
      (handler) => JSXAnalysisUtils.hasProp(element, handler)
    );

    let severity: "error" | "warning" = "warning";
    let message = `Interactive ${element.tagName} should have appropriate ARIA role (button, link, etc.)`;

    if (!hasTabIndex && !hasKeyboardHandlers) {
      message += " and keyboard accessibility (tabIndex, onKeyDown)";
    }

    // Check if this might be handled by a component library
    if (ContextAnalyzer.hasSpreadProps(element)) {
      severity = "warning";
      message +=
        ". Note: Element uses spread props which may handle accessibility.";
    }

    return {
      ruleId: "interactive-role",
      severity,
      message,
      element: element.tagName,
      elementLocation: element.location,
      context: element.context,
    };
  }

  /**
   * Form elements should have proper labels or fieldsets
   */
  static validateFormStructure(
    element: JSXElementInfo
  ): AccessibilityViolation | null {
    if (element.tagName !== "fieldset") return null;

    // Check for legend element in children
    const hasLegend = element.children.some(
      (child) => child.tagName.toLowerCase() === "legend"
    );

    if (!hasLegend) {
      // Check if fieldset has other labeling
      const hasDirectLabeling =
        ARIA_LABELING_ATTRIBUTES.some((attr) =>
          JSXAnalysisUtils.hasProp(element, attr)
        ) || JSXAnalysisUtils.hasProp(element, "title");

      if (hasDirectLabeling) {
        return {
          ruleId: "fieldset-legend",
          severity: "info",
          message:
            "Fieldset has ARIA labeling but would benefit from a legend element for better semantic structure.",
          element: element.tagName,
          elementLocation: element.location,
          context: element.context,
        };
      }

      return {
        ruleId: "fieldset-legend",
        severity: "warning",
        message:
          "Fieldset should contain a legend element for better accessibility and form structure.",
        element: element.tagName,
        elementLocation: element.location,
        context: element.context,
      };
    }

    return null;
  }

  /**
   * Heading hierarchy should be logical
   */
  static validateHeadingHierarchy(
    elements: JSXElementInfo[]
  ): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const headings = elements.filter((el) =>
      /^h[1-6]$/.test(el.tagName.toLowerCase())
    );

    if (headings.length === 0) return violations;

    let previousLevel = 0;

    headings.forEach((heading, index) => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      const headingText =
        TextContentExtractor.extractAccessibleText(heading) ||
        "[No text content]";

      // First heading should be h1
      if (index === 0 && currentLevel !== 1) {
        violations.push({
          ruleId: "heading-hierarchy-start",
          severity: "warning",
          message: `Page should start with an h1 heading, but found ${heading.tagName}. Current text: "${headingText}"`,
          element: heading.tagName,
          elementLocation: heading.location,
          context: heading.context,
        });
      }

      // Don't skip heading levels
      if (previousLevel > 0 && currentLevel > previousLevel + 1) {
        violations.push({
          ruleId: "heading-hierarchy-skip",
          severity: "warning",
          message: `Heading level skipped: ${
            heading.tagName
          } follows h${previousLevel}. Consider using h${
            previousLevel + 1
          } instead. Current text: "${headingText}"`,
          element: heading.tagName,
          elementLocation: heading.location,
          context: heading.context,
        });
      }

      previousLevel = currentLevel;
    });

    return violations;
  }

  /**
   * Check for missing lang attribute on html element
   */
  static validateLangAttribute(
    element: JSXElementInfo
  ): AccessibilityViolation | null {
    if (element.tagName !== "html") return null;

    const langProp = JSXAnalysisUtils.getPropValue(element, "lang");

    if (!langProp) {
      return {
        ruleId: "html-lang",
        severity: "error",
        message:
          'html element must have a lang attribute to identify the page language (e.g., lang="en")',
        element: element.tagName,
        elementLocation: element.location,
        context: element.context,
      };
    }

    let langValue: string | undefined;

    switch (langProp.type) {
      case "string":
        langValue = langProp.value as string;
        break;
      case "expression":
        if (langProp.rawValue) {
          // Handle string literals in expressions
          const stringLiteralMatch =
            langProp.rawValue.match(/^["']([^"']+)["']$/);
          if (stringLiteralMatch) {
            langValue = stringLiteralMatch[1];
          } else {
            // For variables and complex expressions, check if they likely contain locale values
            if (this.isLikelyLocaleExpression(langProp.rawValue)) {
              return null; // Skip validation for likely valid locale expressions
            }
            // For other expressions we can't validate, skip unless obviously wrong
            return null;
          }
        }
        break;
      default:
        return null;
    }

    if (!langValue) return null;

    // Validate lang value format (basic check)
    if (!this.isValidLanguageCode(langValue)) {
      return {
        ruleId: "html-lang",
        severity: "warning",
        message: `lang attribute value "${langValue}" should follow ISO language codes (e.g., "en", "en-US", "fr", "es")`,
        element: element.tagName,
        elementLocation: element.location,
        context: element.context,
      };
    }

    return null;
  }

  /**
   * Check if an expression likely contains a valid locale value
   */
  private static isLikelyLocaleExpression(expression: string): boolean {
    const cleanExpr = expression.trim();

    // Common locale variable names
    const localeVariablePatterns = [
      /^locale$/i,
      /^language$/i,
      /^lang$/i,
      /^currentLocale$/i,
      /^activeLocale$/i,
      /^selectedLanguage$/i,
      /^i18n\.locale$/i,
      /^router\.locale$/i,
      /^params\.locale$/i,
      /^props\.locale$/i,
    ];

    if (localeVariablePatterns.some((pattern) => pattern.test(cleanExpr))) {
      return true;
    }

    // Property access that likely contains locale
    if (
      /^[a-zA-Z_$][a-zA-Z0-9_$.]*\.(locale|language|lang)\b/i.test(cleanExpr)
    ) {
      return true;
    }

    // Function calls that likely return locale
    const localeFunctionPatterns = [
      /^getLocale\s*\(/i,
      /^getCurrentLocale\s*\(/i,
      /^getLanguage\s*\(/i,
      /^useLocale\s*\(/i,
      /^i18n\.getLocale\s*\(/i,
    ];

    if (localeFunctionPatterns.some((pattern) => pattern.test(cleanExpr))) {
      return true;
    }

    // Conditional expressions that likely contain locale
    if (
      /.*\?\s*["'][a-z]{2,3}(-[A-Z]{2})?["']\s*:\s*["'][a-z]{2,3}(-[A-Z]{2})?["']/.test(
        cleanExpr
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Validate language code format
   */
  private static isValidLanguageCode(langValue: string): boolean {
    // Basic ISO language code patterns
    const validPatterns = [
      /^[a-z]{2}$/, // "en", "fr", "es"
      /^[a-z]{2}-[A-Z]{2}$/, // "en-US", "fr-FR", "es-ES"
      /^[a-z]{3}$/, // "eng", "fra" (ISO 639-2)
      /^[a-z]{2}-[A-Z]{2}-[a-zA-Z]+$/, // "en-US-posix"
    ];

    return validPatterns.some((pattern) => pattern.test(langValue));
  }

  /**
   * Check for duplicate IDs within component
   */
  static validateUniqueIds(
    elements: JSXElementInfo[]
  ): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const idCounts = new Map<string, JSXElementInfo[]>();

    // Collect all elements with IDs
    elements.forEach((element) => {
      const idProp = JSXAnalysisUtils.getPropStringValue(element, "id");
      if (idProp && idProp.trim()) {
        if (!idCounts.has(idProp)) {
          idCounts.set(idProp, []);
        }
        idCounts.get(idProp)!.push(element);
      }
    });

    // Find duplicates
    for (const [id, elementsWithId] of idCounts) {
      if (elementsWithId.length > 1) {
        elementsWithId.forEach((element, index) => {
          violations.push({
            ruleId: "duplicate-id",
            severity: "error",
            message: `Duplicate ID "${id}" found on ${
              element.tagName
            } element (occurrence ${index + 1} of ${
              elementsWithId.length
            }). IDs must be unique within the document.`,
            element: element.tagName,
            elementLocation: element.location,
            context: element.context,
          });
        });
      }
    }

    return violations;
  }

  /**
   * Check ARIA attributes have valid values
   */
  static validateAriaAttributes(
    element: JSXElementInfo
  ): AccessibilityViolation | null {
    const ariaProps = Object.keys(element.props).filter((prop) =>
      prop.startsWith("aria-")
    );

    for (const ariaProp of ariaProps) {
      const propValue = JSXAnalysisUtils.getPropValue(element, ariaProp);

      // Check for specific ARIA attribute validation
      if (ariaProp in ARIA_ATTRIBUTE_VALUES) {
        const validValues =
          ARIA_ATTRIBUTE_VALUES[ariaProp as keyof typeof ARIA_ATTRIBUTE_VALUES];

        // Handle different prop value types
        if (propValue) {
          let valueToCheck: string | undefined;

          switch (propValue.type) {
            case "string":
              valueToCheck = propValue.value as string;
              break;
            case "boolean":
              valueToCheck = String(propValue.value);
              break;
            case "expression":
              // For expressions, we need to be more lenient
              if (propValue.rawValue) {
                // Check if it's a simple boolean variable or expression
                if (
                  this.isLikelyValidBooleanExpression(
                    propValue.rawValue,
                    ariaProp
                  )
                ) {
                  continue; // Skip validation for likely valid expressions
                }

                // Check if it's a string literal within the expression
                const stringMatch = propValue.rawValue.match(/^["'](.+)["']$/);
                if (stringMatch) {
                  valueToCheck = stringMatch[1];
                } else {
                  // For complex expressions, we can't statically validate
                  // Only flag obvious invalid patterns
                  if (
                    this.isObviouslyInvalidAriaValue(
                      propValue.rawValue,
                      ariaProp
                    )
                  ) {
                    valueToCheck = propValue.rawValue;
                  } else {
                    continue; // Skip validation for complex expressions
                  }
                }
              }
              break;
            default:
              continue; // Skip validation for undefined or other types
          }

          if (valueToCheck && !validValues.includes(valueToCheck)) {
            return {
              ruleId: `${ariaProp.replace("-", "-")}-value`,
              severity: "error",
              message: `${ariaProp} must be one of: ${validValues.join(
                ", "
              )}. Current value: "${valueToCheck}"`,
              element: element.tagName,
              elementLocation: element.location,
              context: element.context,
            };
          }
        }
      }

      // Check for empty ARIA labeling attributes
      if (ARIA_LABELING_ATTRIBUTES.includes(ariaProp)) {
        const stringValue = JSXAnalysisUtils.getPropStringValue(
          element,
          ariaProp
        );

        // Only flag as empty if it's explicitly an empty string, not an expression
        if (
          propValue &&
          propValue.type === "string" &&
          (!stringValue || stringValue.trim() === "")
        ) {
          return {
            ruleId: "aria-empty-value",
            severity: "warning",
            message: `${ariaProp} should not be empty. Provide meaningful text for screen readers.`,
            element: element.tagName,
            elementLocation: element.location,
            context: element.context,
          };
        }
      }
    }

    return null;
  }

  /**
   * Check if an expression is likely a valid boolean expression for ARIA attributes
   */
  private static isLikelyValidBooleanExpression(
    expression: string,
    ariaProp: string
  ): boolean {
    const cleanExpr = expression.trim();

    // Boolean variables (simple identifiers)
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(cleanExpr)) {
      return true;
    }

    // Boolean expressions with logical operators
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[!&|]\s*/.test(cleanExpr)) {
      return true;
    }

    // Negation expressions
    if (/^!\s*[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(cleanExpr)) {
      return true;
    }

    // Comparison expressions that result in boolean
    if (/^.+\s*(===|!==|==|!=|<|>|<=|>=)\s*.+$/.test(cleanExpr)) {
      return true;
    }

    // Ternary expressions
    if (/^.+\?\s*.+\s*:\s*.+$/.test(cleanExpr)) {
      return true;
    }

    // Function calls that likely return boolean (for aria-expanded, aria-pressed, etc.)
    if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*\(\s*.*\s*\)$/.test(cleanExpr)) {
      return true;
    }

    // Property access that might be boolean
    if (/^[a-zA-Z_$][a-zA-Z0-9_$.]+$/.test(cleanExpr)) {
      return true;
    }

    return false;
  }

  /**
   * Check if an expression is obviously invalid for ARIA attributes
   */
  private static isObviouslyInvalidAriaValue(
    expression: string,
    ariaProp: string
  ): boolean {
    const cleanExpr = expression.trim();

    // Obviously invalid string literals
    const invalidStringPatterns = [
      /^["'](?!(true|false|undefined|yes|no|mixed|off|polite|assertive|page|step|location|date|time|menu|listbox|tree|grid|dialog|ascending|descending|none|other|inline|list|both|horizontal|vertical|grammar|spelling)).*["']$/,
    ];

    return invalidStringPatterns.some((pattern) => pattern.test(cleanExpr));
  }
}
