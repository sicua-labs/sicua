/**
 * Enhanced text content extractor for JSX elements
 * Handles complex patterns like conditional rendering, variables, and nested elements
 */

import { JSXElementInfo, JSXPropValue } from "../types/accessibilityTypes";
import { JSXAnalysisUtils } from "./jsxAnalysisUtils";
import { ARIA_LABELING_ATTRIBUTES } from "../constants";

export class TextContentExtractor {
  /**
   * Extracts accessible text content from JSX elements
   * Handles conditional rendering, variables, nested text, and ARIA labeling
   */
  static extractAccessibleText(element: JSXElementInfo): string | null {
    // First check for ARIA labeling attributes
    const ariaText = this.extractAriaText(element);
    if (ariaText) {
      return ariaText;
    }

    // Check for title attribute
    const titleText = this.extractTitleText(element);
    if (titleText) {
      return titleText;
    }

    // Extract text content from element and children
    const contentText = this.extractContentText(element);
    if (contentText) {
      return contentText;
    }

    return null;
  }

  /**
   * Extracts text from ARIA labeling attributes
   */
  private static extractAriaText(element: JSXElementInfo): string | null {
    for (const ariaAttr of ARIA_LABELING_ATTRIBUTES) {
      const prop = JSXAnalysisUtils.getPropValue(element, ariaAttr);
      if (prop) {
        const text = this.extractTextFromProp(prop);
        if (text && text.trim()) {
          return text.trim();
        }
      }
    }
    return null;
  }

  /**
   * Extracts text from title attribute
   */
  private static extractTitleText(element: JSXElementInfo): string | null {
    const titleProp = JSXAnalysisUtils.getPropValue(element, "title");
    if (titleProp) {
      const text = this.extractTextFromProp(titleProp);
      if (text && text.trim()) {
        return text.trim();
      }
    }
    return null;
  }

  /**
   * Extracts text content from element's children and text content
   */
  private static extractContentText(element: JSXElementInfo): string | null {
    const textParts: string[] = [];

    // Check direct text content
    if (element.textContent && element.textContent.trim()) {
      textParts.push(element.textContent.trim());
    }

    // Check children for text content
    const childrenText = this.extractTextFromChildren(element.children);
    if (childrenText) {
      textParts.push(childrenText);
    }

    // Handle JSX expressions that might contain text
    const expressionText = this.extractTextFromExpressions(element);
    if (expressionText) {
      textParts.push(expressionText);
    }

    return textParts.length > 0 ? textParts.join(" ").trim() : null;
  }

  /**
   * Extracts text from JSX prop values handling different types
   */
  private static extractTextFromProp(prop: JSXPropValue): string | null {
    switch (prop.type) {
      case "string":
        return prop.value as string;

      case "number":
      case "boolean":
        return String(prop.value);

      case "expression":
        // Try to extract text from expression
        if (prop.rawValue) {
          return this.extractTextFromExpression(prop.rawValue);
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Recursively extracts text from child elements
   */
  private static extractTextFromChildren(
    children: JSXElementInfo[]
  ): string | null {
    const textParts: string[] = [];

    for (const child of children) {
      // Skip certain non-text elements
      if (this.isNonTextElement(child)) {
        continue;
      }

      // Get text from child
      const childText = this.extractAccessibleText(child);
      if (childText && childText.trim()) {
        textParts.push(childText.trim());
      }
    }

    return textParts.length > 0 ? textParts.join(" ").trim() : null;
  }

  /**
   * Extracts text from JSX expressions in props or children
   */
  private static extractTextFromExpressions(
    element: JSXElementInfo
  ): string | null {
    const textParts: string[] = [];

    // Check all props for expressions that might contain text
    for (const [propName, propValue] of Object.entries(element.props)) {
      if (propValue.type === "expression" && propValue.rawValue) {
        const expressionText = this.extractTextFromExpression(
          propValue.rawValue
        );
        if (expressionText) {
          textParts.push(expressionText);
        }
      }
    }

    return textParts.length > 0 ? textParts.join(" ").trim() : null;
  }

  /**
   * Extracts text from JSX expression strings
   * Handles conditional rendering, variables, and template literals
   */
  private static extractTextFromExpression(expression: string): string | null {
    const cleaned = expression.trim();

    // Handle string literals
    if (this.isStringLiteral(cleaned)) {
      return this.extractStringLiteral(cleaned);
    }

    // Handle conditional expressions (ternary operators)
    const conditionalText = this.extractTextFromConditional(cleaned);
    if (conditionalText) {
      return conditionalText;
    }

    // Handle logical expressions (&&, ||)
    const logicalText = this.extractTextFromLogical(cleaned);
    if (logicalText) {
      return logicalText;
    }

    // Handle template literals
    const templateText = this.extractTextFromTemplate(cleaned);
    if (templateText) {
      return templateText;
    }

    // Handle variable references that might contain text
    const variableText = this.extractTextFromVariable(cleaned);
    if (variableText) {
      return variableText;
    }

    return null;
  }

  /**
   * Checks if a string is a string literal
   */
  private static isStringLiteral(expression: string): boolean {
    return (
      (expression.startsWith('"') && expression.endsWith('"')) ||
      (expression.startsWith("'") && expression.endsWith("'")) ||
      (expression.startsWith("`") && expression.endsWith("`"))
    );
  }

  /**
   * Extracts text from string literals
   */
  private static extractStringLiteral(expression: string): string {
    return expression.slice(1, -1); // Remove quotes
  }

  /**
   * Extracts text from conditional expressions (ternary)
   * Pattern: condition ? "text1" : "text2"
   */
  private static extractTextFromConditional(expression: string): string | null {
    const ternaryMatch = expression.match(/.*\?\s*(.+?)\s*:\s*(.+)/);
    if (ternaryMatch) {
      const [, trueBranch, falseBranch] = ternaryMatch;

      const trueText = this.extractTextFromExpression(trueBranch.trim());
      const falseText = this.extractTextFromExpression(falseBranch.trim());

      // Return the first valid text found
      if (trueText && trueText.trim()) {
        return trueText.trim();
      }
      if (falseText && falseText.trim()) {
        return falseText.trim();
      }
    }
    return null;
  }

  /**
   * Extracts text from logical expressions
   * Pattern: condition && "text" or condition || "text"
   */
  private static extractTextFromLogical(expression: string): string | null {
    // Handle && expressions
    const andMatch = expression.match(/.*&&\s*(.+)/);
    if (andMatch) {
      const rightSide = andMatch[1].trim();
      const text = this.extractTextFromExpression(rightSide);
      if (text && text.trim()) {
        return text.trim();
      }
    }

    // Handle || expressions
    const orMatch = expression.match(/(.+?)\s*\|\|\s*(.+)/);
    if (orMatch) {
      const [, leftSide, rightSide] = orMatch;

      const leftText = this.extractTextFromExpression(leftSide.trim());
      if (leftText && leftText.trim()) {
        return leftText.trim();
      }

      const rightText = this.extractTextFromExpression(rightSide.trim());
      if (rightText && rightText.trim()) {
        return rightText.trim();
      }
    }

    return null;
  }

  /**
   * Extracts text from template literals
   */
  private static extractTextFromTemplate(expression: string): string | null {
    if (expression.startsWith("`") && expression.endsWith("`")) {
      // Simple template literal without expressions
      const content = expression.slice(1, -1);
      if (!content.includes("${")) {
        return content;
      }

      // Template with expressions - extract static parts
      const staticParts = content.split(/\$\{[^}]+\}/);
      const staticText = staticParts.join("").trim();
      if (staticText) {
        return staticText;
      }
    }
    return null;
  }

  /**
   * Extracts text from variable references
   * Handles common variable names that likely contain text
   */
  private static extractTextFromVariable(expression: string): string | null {
    // Common variable patterns that likely contain text
    const textVariablePatterns = [
      /\b(text|label|title|message|content|name|value)\b/i,
      /\b\w*Text\b/i,
      /\b\w*Label\b/i,
      /\b\w*Title\b/i,
      /\b\w*Message\b/i,
      /\b\w*Content\b/i,
    ];

    for (const pattern of textVariablePatterns) {
      if (pattern.test(expression)) {
        // This is likely a variable containing text
        // We can't evaluate it statically, but we know it probably has text
        return "[Variable Text]";
      }
    }

    return null;
  }

  /**
   * Checks if an element is non-text (decorative, hidden, etc.)
   */
  private static isNonTextElement(element: JSXElementInfo): boolean {
    // Check for aria-hidden="true"
    const ariaHidden = JSXAnalysisUtils.getPropStringValue(
      element,
      "aria-hidden"
    );
    if (ariaHidden === "true") {
      return true;
    }

    // Check for decorative role
    const role = JSXAnalysisUtils.getPropStringValue(element, "role");
    if (role === "presentation" || role === "none") {
      return true;
    }

    // Check for common decorative elements
    const decorativeElements = ["svg", "img", "icon", "loader", "spinner"];
    if (decorativeElements.includes(element.tagName.toLowerCase())) {
      // For images, check if they have empty alt text (decorative)
      if (element.tagName.toLowerCase() === "img") {
        const alt = JSXAnalysisUtils.getPropStringValue(element, "alt");
        return alt === "";
      }
      return true;
    }

    // Check for screen reader only content (common class patterns)
    const className = JSXAnalysisUtils.getPropStringValue(element, "className");
    if (className) {
      const srOnlyPatterns = [
        /\bsr-only\b/,
        /\bscreen-reader-only\b/,
        /\bvisually-hidden\b/,
        /\bhidden\b/,
      ];

      for (const pattern of srOnlyPatterns) {
        if (pattern.test(className)) {
          return false; // SR-only content IS accessible text
        }
      }
    }

    return false;
  }

  /**
   * Checks if an element has any form of accessible text
   */
  static hasAccessibleText(element: JSXElementInfo): boolean {
    const text = this.extractAccessibleText(element);
    const hasStaticText =
      text !== null && text.trim().length > 0 && text !== "[Variable Text]";

    if (hasStaticText) {
      return true;
    }

    // Enhanced JSX expression analysis
    return this.hasJSXExpressionText(element);
  }

  /**
   * Checks if an element likely has text but we can't extract it statically
   */
  static likelyHasText(element: JSXElementInfo): boolean {
    const text = this.extractAccessibleText(element);
    const hasVariableText = text === "[Variable Text]";

    if (hasVariableText) {
      return true;
    }

    return (
      this.hasJSXExpressionText(element) || this.hasTextIndicatingProps(element)
    );
  }

  /**
   * Check for JSX expressions that likely contain text
   */
  private static hasJSXExpressionText(element: JSXElementInfo): boolean {
    // Check if we have access to the original JSX content through context
    if (element.context) {
      return this.analyzeJSXContext(element.context);
    }

    // Check children for expressions
    if (element.children && element.children.length > 0) {
      return this.analyzeChildrenForExpressions(element.children);
    }

    // Check props for children expressions
    const childrenProp = JSXAnalysisUtils.getPropValue(element, "children");
    if (
      childrenProp &&
      childrenProp.type === "expression" &&
      childrenProp.rawValue
    ) {
      return this.isTextExpression(childrenProp.rawValue);
    }

    return false;
  }

  /**
   * Analyze JSX context string for text expressions
   */
  private static analyzeJSXContext(context: string): boolean {
    // Look for translation function calls in JSX
    const translationInJSX = [
      /\{[^}]*t\s*\([^)]+\)[^}]*\}/g, // {t("key")}
      /\{[^}]*i18n\s*\([^)]+\)[^}]*\}/g, // {i18n("key")}
      /\{[^}]*translate\s*\([^)]+\)[^}]*\}/g, // {translate("key")}
      /\{[^}]*_\s*\([^)]+\)[^}]*\}/g, // {_("key")}
      /\{[^}]*formatMessage\s*\([^)]+\)[^}]*\}/g, // {formatMessage()}
      /\{[^}]*getText\s*\([^)]+\)[^}]*\}/g, // {getText()}
    ];

    if (translationInJSX.some((pattern) => pattern.test(context))) {
      return true;
    }

    // Look for string literals in JSX expressions
    const stringLiteralsInJSX = /\{[^}]*["'`][^"'`]+["'`][^}]*\}/g;
    if (stringLiteralsInJSX.test(context)) {
      return true;
    }

    // Look for conditional expressions with text
    const conditionalWithText = [
      /\{[^}]*\?[^}]*["'`][^"'`]+["'`][^}]*:[^}]*["'`][^"'`]+["'`][^}]*\}/g, // {condition ? "text1" : "text2"}
      /\{[^}]*\?[^}]*t\s*\([^)]+\)[^}]*:[^}]*t\s*\([^)]+\)[^}]*\}/g, // {condition ? t("key1") : t("key2")}
    ];

    if (conditionalWithText.some((pattern) => pattern.test(context))) {
      return true;
    }

    // Look for template literals
    const templateLiterals = /\{[^}]*`[^`]*\$\{[^}]*\}[^`]*`[^}]*\}/g;
    if (templateLiterals.test(context)) {
      return true;
    }

    // Look for variable names that likely contain text
    const textVariables = [
      /\{[^}]*(text|label|title|message|content|name|children)[^}]*\}/gi,
      /\{[^}]*[a-zA-Z_$][a-zA-Z0-9_$]*Text[^}]*\}/g,
      /\{[^}]*[a-zA-Z_$][a-zA-Z0-9_$]*Label[^}]*\}/g,
    ];

    if (textVariables.some((pattern) => pattern.test(context))) {
      return true;
    }

    return false;
  }

  /**
   * Analyze children for JSX expressions that contain text
   */
  private static analyzeChildrenForExpressions(
    children: JSXElementInfo[]
  ): boolean {
    for (const child of children) {
      // Skip decorative elements
      if (this.isDecorativeElement(child)) {
        continue;
      }

      // Check if child has text content
      if (child.textContent && child.textContent.trim()) {
        return true;
      }

      // Check child's context for expressions
      if (child.context && this.analyzeJSXContext(child.context)) {
        return true;
      }

      // Recursively check child's children
      if (child.children && child.children.length > 0) {
        if (this.analyzeChildrenForExpressions(child.children)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if element has props that indicate text content
   */
  private static hasTextIndicatingProps(element: JSXElementInfo): boolean {
    const textProps = [
      "children",
      "label",
      "text",
      "title",
      "value",
      "placeholder",
    ];

    for (const propName of textProps) {
      const prop = JSXAnalysisUtils.getPropValue(element, propName);
      if (prop) {
        if (
          prop.type === "string" &&
          prop.value &&
          (prop.value as string).trim()
        ) {
          return true;
        }
        if (
          prop.type === "expression" &&
          prop.rawValue &&
          this.isTextExpression(prop.rawValue)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Enhanced text expression detection
   */
  private static isTextExpression(expression: string): boolean {
    const cleanExpr = expression.trim();

    // Translation function patterns (more comprehensive)
    const translationPatterns = [
      /^t\s*\(/, // t("key")
      /^i18n\s*\(/, // i18n("key")
      /^translate\s*\(/, // translate("key")
      /^_\s*\(/, // _("key")
      /^__\s*\(/, // __("key")
      /^tr\s*\(/, // tr("key")
      /^getText\s*\(/, // getText("key")
      /^gettext\s*\(/, // gettext("key")
      /^formatMessage\s*\(/, // formatMessage({id: "key"})
      /^intl\.formatMessage\s*\(/, // intl.formatMessage()
      /^this\.props\.intl\.formatMessage\s*\(/, // this.props.intl.formatMessage()
    ];

    if (translationPatterns.some((pattern) => pattern.test(cleanExpr))) {
      return true;
    }

    // String literals
    if (
      /^["'`]/.test(cleanExpr) &&
      /["'`]$/.test(cleanExpr) &&
      cleanExpr.length > 2
    ) {
      const content = cleanExpr.slice(1, -1);
      return content.trim().length > 0;
    }

    // Template literals with interpolation
    if (/^`[^`]*\$\{.*\}[^`]*`$/.test(cleanExpr)) {
      return true;
    }

    // Conditional expressions with text
    const conditionalWithText = [
      /.*\?\s*["'`][^"'`]+["'`]\s*:\s*["'`][^"'`]+["'`].*/, // condition ? "text1" : "text2"
      /.*\?\s*t\s*\([^)]+\)\s*:\s*t\s*\([^)]+\).*/, // condition ? t("key1") : t("key2")
      /.*\?\s*["'`][^"'`]+["'`]\s*:\s*t\s*\([^)]+\).*/, // condition ? "text" : t("key")
    ];

    if (conditionalWithText.some((pattern) => pattern.test(cleanExpr))) {
      return true;
    }

    // Variable names that likely contain text
    const textVariablePatterns = [
      /^(text|label|title|message|content|name|value|children)$/i,
      /^[a-zA-Z_$][a-zA-Z0-9_$]*Text$/,
      /^[a-zA-Z_$][a-zA-Z0-9_$]*Label$/,
      /^[a-zA-Z_$][a-zA-Z0-9_$]*Message$/,
      /^[a-zA-Z_$][a-zA-Z0-9_$]*Content$/,
      /^(buttonText|btnText|linkText|menuText|tooltipText)$/i,
    ];

    if (textVariablePatterns.some((pattern) => pattern.test(cleanExpr))) {
      return true;
    }

    // Property access for text
    if (
      /^[a-zA-Z_$][a-zA-Z0-9_$.]*\.(text|label|title|message|content|name|value|children)\b/i.test(
        cleanExpr
      )
    ) {
      return true;
    }

    // Function calls that likely return text
    const textFunctionPatterns = [
      /^get[A-Z][a-zA-Z]*Text\s*\(/,
      /^format[A-Z][a-zA-Z]*\s*\(/,
      /^render[A-Z][a-zA-Z]*\s*\(/,
      /^[a-zA-Z_$][a-zA-Z0-9_$]*\.getText\s*\(/,
      /^[a-zA-Z_$][a-zA-Z0-9_$]*\.getLabel\s*\(/,
    ];

    if (textFunctionPatterns.some((pattern) => pattern.test(cleanExpr))) {
      return true;
    }

    // Logical expressions where one side likely has text
    if (
      /.*\|\|\s*["'`][^"'`]+["'`]/.test(cleanExpr) ||
      /.*\|\|\s*t\s*\(/.test(cleanExpr)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if element is decorative (enhanced version)
   */
  private static isDecorativeElement(element: JSXElementInfo): boolean {
    const tagName = element.tagName.toLowerCase();

    // Icon and loader components
    const decorativeComponents = [
      "loader",
      "loader2",
      "spinner",
      "loading",
      "icon",
      "svg",
      "upload",
      "eye",
      "creditcard",
      "chevrondown",
      "chevronsupdown",
      "mappin",
      "check",
      "x",
      "plus",
      "minus",
      "arrow",
      "caret",
    ];

    if (decorativeComponents.some((comp) => tagName.includes(comp))) {
      return true;
    }

    // Check for aria-hidden
    const ariaHidden = JSXAnalysisUtils.getPropStringValue(
      element,
      "aria-hidden"
    );
    if (ariaHidden === "true") {
      return true;
    }

    // Check for decorative classes
    const className = JSXAnalysisUtils.getPropStringValue(element, "className");
    if (className) {
      const decorativePatterns = [
        /\bicon\b/i,
        /\bspinner\b/i,
        /\bloader\b/i,
        /\banimate-spin\b/i,
        /\bsr-only\b/i,
        /\bhidden\b/i,
        /\bopacity-\d+\b/i,
      ];

      if (decorativePatterns.some((pattern) => pattern.test(className))) {
        return true;
      }
    }

    return false;
  }
}
