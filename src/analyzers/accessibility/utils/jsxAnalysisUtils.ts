/**
 * Utility functions for analyzing JSX structure from ComponentRelation data
 * Enhanced with better text extraction and accessibility analysis helpers
 * Updated to work with enhanced ScanResult and ProcessedContent
 */

import * as ts from "typescript";
import { JSXElementInfo, JSXPropValue } from "../types/accessibilityTypes";
import {
  ComponentRelation,
  JSXStructure,
  ScanResult,
  ProcessedContent,
} from "../../../types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { traverseAST } from "../../../utils/ast/traversal";
import {
  HTML_TAGS,
  SCREEN_READER_ONLY_PATTERNS,
  HIDDEN_ELEMENT_PATTERNS,
  HIDDEN_STYLE_PATTERNS,
  ICON_COMPONENT_PATTERNS,
  ICON_CLASS_PATTERNS,
  DECORATIVE_ELEMENTS,
  TEXT_VARIABLE_PATTERNS,
  LABELING_PROP_NAMES,
  SPREAD_PROP_PATTERNS,
} from "../constants";

export class JSXAnalysisUtils {
  /**
   * Extracts JSX elements from component content for accessibility analysis
   * Updated to work with enhanced ScanResult and ProcessedContent
   */
  static extractJSXElements(
    component: ComponentRelation,
    scanResult: ScanResult
  ): JSXElementInfo[] {
    const elements: JSXElementInfo[] = [];

    // First try to use existing jsxStructure if available
    if (component.jsxStructure) {
      elements.push(
        this.convertJSXStructureToElementInfo(component.jsxStructure)
      );
    }

    // Get enhanced content from ScanResult
    const enhancedContent = this.getEnhancedContent(component, scanResult);
    if (enhancedContent) {
      const contentElements = this.parseJSXFromContent(enhancedContent);
      elements.push(...contentElements);
    }

    // Fallback to original content if available
    if (component.content && elements.length === 0) {
      const fallbackElements = this.parseJSXFromContent(component.content);
      elements.push(...fallbackElements);
    }

    return this.deduplicateElements(elements);
  }

  /**
   * Gets enhanced content from ScanResult fileContents map
   */
  private static getEnhancedContent(
    component: ComponentRelation,
    scanResult: ScanResult
  ): string | null {
    // Try to get content from ScanResult first (this is the most up-to-date)
    const scanContent = scanResult.fileContents.get(component.fullPath);
    if (scanContent) {
      return scanContent;
    }

    // Fallback to component content if not in scan result
    return component.content || null;
  }

  /**
   * Converts existing JSXStructure to JSXElementInfo format
   */
  private static convertJSXStructureToElementInfo(
    jsxStructure: JSXStructure
  ): JSXElementInfo {
    const props: Record<string, JSXPropValue> = {};

    // Convert props from JSXStructure format
    jsxStructure.props.forEach((prop) => {
      props[prop.name] = {
        type: this.inferPropType(prop.type),
        value: this.parsePropValue(prop.type),
        rawValue: prop.type,
      };
    });

    // Recursively convert children
    const children: JSXElementInfo[] = jsxStructure.children.map((child) =>
      this.convertJSXStructureToElementInfo(child)
    );

    return {
      tagName: jsxStructure.tagName.toLowerCase(),
      props,
      children,
      textContent: this.extractTextContent(children),
    };
  }

  /**
   * Parses JSX elements directly from component content string
   * Enhanced to handle TypeScript and modern JSX patterns
   */
  private static parseJSXFromContent(content: string): JSXElementInfo[] {
    const elements: JSXElementInfo[] = [];

    try {
      // Create a TypeScript source file for AST parsing
      const sourceFile = ts.createSourceFile(
        "temp.tsx",
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      // Traverse AST to find JSX elements
      traverseAST(sourceFile, (node: ts.Node) => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const elementInfo = this.convertTSNodeToElementInfo(node, sourceFile);
          if (elementInfo) {
            elements.push(elementInfo);
          }
        }
      });
    } catch (error) {
      // Silently handle parsing errors - some content may not be valid JSX
      // This is expected for files that might contain partial JSX or complex patterns
    }

    return elements;
  }

  /**
   * Converts TypeScript JSX node to JSXElementInfo
   * Enhanced with better error handling and context extraction
   */
  private static convertTSNodeToElementInfo(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    sourceFile: ts.SourceFile
  ): JSXElementInfo | null {
    try {
      const tagName = this.getJSXTagName(node);
      const props = this.extractPropsFromNode(node);
      const location = ASTUtils.getNodeLocation(node, sourceFile);
      const context = this.getNodeContext(node, sourceFile);

      let children: JSXElementInfo[] = [];
      let textContent: string | undefined;

      // Handle children for regular JSX elements (not self-closing)
      if (ts.isJsxElement(node)) {
        const childElements = node.children
          .filter(
            (child) =>
              ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)
          )
          .map((child) =>
            this.convertTSNodeToElementInfo(
              child as ts.JsxElement | ts.JsxSelfClosingElement,
              sourceFile
            )
          )
          .filter((child): child is JSXElementInfo => child !== null);

        children = childElements;
        textContent = this.extractTextFromJSXChildren(node.children);
      }

      return {
        tagName: tagName.toLowerCase(),
        props,
        children,
        textContent,
        location,
        context,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extracts tag name from JSX node
   * Fixed to handle TypeScript type narrowing properly
   */
  private static getJSXTagName(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): string {
    const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
    const tagNameNode = openingElement.tagName;

    if (ts.isIdentifier(tagNameNode)) {
      return tagNameNode.text;
    } else if (ts.isPropertyAccessExpression(tagNameNode)) {
      // Handle cases like React.Fragment, styled.div, or motion.div
      const objectName = ts.isIdentifier(tagNameNode.expression)
        ? tagNameNode.expression.text
        : tagNameNode.expression.getText();
      const propertyName = tagNameNode.name.text;
      return `${objectName}.${propertyName}`;
    } else if (ts.isJsxNamespacedName(tagNameNode)) {
      // Handle namespace cases like svg:circle
      return `${tagNameNode.namespace.text}:${tagNameNode.name.text}`;
    }

    return "unknown";
  }

  /**
   * Extracts props from JSX node
   * Enhanced with better prop value extraction
   */
  private static extractPropsFromNode(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): Record<string, JSXPropValue> {
    const props: Record<string, JSXPropValue> = {};
    const openingElement = ts.isJsxElement(node) ? node.openingElement : node;

    if (openingElement.attributes) {
      openingElement.attributes.properties.forEach((attr) => {
        if (ts.isJsxAttribute(attr) && attr.name) {
          const propName = this.getAttributeName(attr.name);
          const propValue = this.extractPropValue(attr);
          props[propName] = propValue;
        } else if (ts.isJsxSpreadAttribute(attr)) {
          // Handle spread attributes like {...props}
          const spreadExpression = attr.expression.getText();
          props[`...${spreadExpression}`] = {
            type: "expression",
            value: undefined,
            rawValue: `{...${spreadExpression}}`,
          };
        }
      });
    }

    return props;
  }

  /**
   * Safely extracts attribute name from different JSX attribute name types
   */
  private static getAttributeName(name: ts.JsxAttributeName): string {
    if (ts.isIdentifier(name)) {
      return name.text;
    } else if (ts.isJsxNamespacedName(name)) {
      // Handle namespaced attributes like xml:lang
      return `${name.namespace.text}:${name.name.text}`;
    }
    return "unknown";
  }

  /**
   * Extracts value from JSX attribute
   * Enhanced with better expression handling
   */
  private static extractPropValue(attr: ts.JsxAttribute): JSXPropValue {
    if (!attr.initializer) {
      // Boolean prop with no value (e.g., <input disabled />)
      return {
        type: "boolean",
        value: true,
      };
    }

    if (ts.isStringLiteral(attr.initializer)) {
      return {
        type: "string",
        value: attr.initializer.text,
      };
    }

    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
      const expr = attr.initializer.expression;

      if (ts.isStringLiteral(expr)) {
        return {
          type: "string",
          value: expr.text,
        };
      }

      if (ts.isNumericLiteral(expr)) {
        return {
          type: "number",
          value: parseFloat(expr.text),
        };
      }

      if (expr.kind === ts.SyntaxKind.TrueKeyword) {
        return {
          type: "boolean",
          value: true,
        };
      }

      if (expr.kind === ts.SyntaxKind.FalseKeyword) {
        return {
          type: "boolean",
          value: false,
        };
      }

      if (expr.kind === ts.SyntaxKind.NullKeyword) {
        return {
          type: "undefined",
          value: undefined,
          rawValue: "null",
        };
      }

      if (expr.kind === ts.SyntaxKind.UndefinedKeyword) {
        return {
          type: "undefined",
          value: undefined,
          rawValue: "undefined",
        };
      }

      // For complex expressions, store the raw text
      return {
        type: "expression",
        value: undefined,
        rawValue: expr.getText(),
      };
    }

    return {
      type: "undefined",
      value: undefined,
    };
  }

  /**
   * Extracts text content from JSX children
   * Enhanced to handle more text patterns
   */
  private static extractTextFromJSXChildren(
    children: ts.NodeArray<ts.JsxChild>
  ): string | undefined {
    const textParts: string[] = [];

    children.forEach((child) => {
      if (ts.isJsxText(child)) {
        const text = child.text.trim();
        if (text) {
          textParts.push(text);
        }
      } else if (ts.isJsxExpression(child) && child.expression) {
        // Try to extract static text from expressions
        if (ts.isStringLiteral(child.expression)) {
          textParts.push(child.expression.text);
        } else if (ts.isTemplateExpression(child.expression)) {
          // Handle template literals
          const templateText = child.expression.head.text;
          if (templateText.trim()) {
            textParts.push(templateText);
          }
        }
      }
    });

    return textParts.length > 0 ? textParts.join(" ") : undefined;
  }

  /**
   * Gets surrounding context for better error reporting
   * Enhanced with better context boundaries
   */
  private static getNodeContext(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): string {
    try {
      const start = Math.max(0, node.getStart(sourceFile) - 100);
      const end = Math.min(
        sourceFile.getFullText().length,
        node.getEnd() + 100
      );
      const context = sourceFile.getFullText().substring(start, end);

      // Clean up context to remove excessive whitespace
      return context.replace(/\s+/g, " ").trim();
    } catch (error) {
      return "";
    }
  }

  /**
   * Extracts text content from child elements
   */
  private static extractTextContent(
    children: JSXElementInfo[]
  ): string | undefined {
    const textParts = children
      .map((child) => child.textContent)
      .filter((text): text is string => Boolean(text));

    return textParts.length > 0 ? textParts.join(" ") : undefined;
  }

  /**
   * Infers prop type from string representation
   */
  private static inferPropType(typeStr: string): JSXPropValue["type"] {
    if (
      typeStr === "string" ||
      typeStr.startsWith('"') ||
      typeStr.startsWith("'") ||
      typeStr.startsWith("`")
    ) {
      return "string";
    }
    if (typeStr === "number" || !isNaN(Number(typeStr))) {
      return "number";
    }
    if (typeStr === "boolean" || typeStr === "true" || typeStr === "false") {
      return "boolean";
    }
    if (typeStr === "undefined" || typeStr === "null") {
      return "undefined";
    }
    return "expression";
  }

  /**
   * Parses prop value from string representation
   */
  private static parsePropValue(typeStr: string): JSXPropValue["value"] {
    if (typeStr.startsWith('"') || typeStr.startsWith("'")) {
      return typeStr.slice(1, -1); // Remove quotes
    }
    if (typeStr.startsWith("`") && typeStr.endsWith("`")) {
      return typeStr.slice(1, -1); // Remove backticks for template literals
    }
    if (!isNaN(Number(typeStr))) {
      return Number(typeStr);
    }
    if (typeStr === "true") {
      return true;
    }
    if (typeStr === "false") {
      return false;
    }
    return undefined;
  }

  /**
   * Removes duplicate elements based on tag name, props, and content
   * Enhanced deduplication logic
   */
  private static deduplicateElements(
    elements: JSXElementInfo[]
  ): JSXElementInfo[] {
    const seen = new Set<string>();
    return elements.filter((element) => {
      // Create a more comprehensive key for deduplication
      const propsKey = Object.entries(element.props)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value.type}:${value.value}`)
        .join(";");

      const key = `${element.tagName}-${propsKey}-${
        element.textContent || ""
      }-${element.location?.line || 0}`;

      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Checks if an element has a specific prop
   */
  static hasProp(element: JSXElementInfo, propName: string): boolean {
    return propName in element.props;
  }

  /**
   * Gets prop value safely
   */
  static getPropValue(
    element: JSXElementInfo,
    propName: string
  ): JSXPropValue | undefined {
    return element.props[propName];
  }

  /**
   * Checks if element has any of the specified props
   */
  static hasAnyProp(element: JSXElementInfo, propNames: string[]): boolean {
    return propNames.some((propName) => this.hasProp(element, propName));
  }

  /**
   * Gets string value of a prop, handling different value types
   */
  static getPropStringValue(
    element: JSXElementInfo,
    propName: string
  ): string | undefined {
    const prop = this.getPropValue(element, propName);
    if (!prop) return undefined;

    if (prop.type === "string") {
      return prop.value as string;
    }
    if (prop.type === "number" || prop.type === "boolean") {
      return String(prop.value);
    }
    if (prop.type === "expression" && prop.rawValue) {
      return prop.rawValue;
    }

    return undefined;
  }

  /**
   * Checks if element is an HTML element using the comprehensive HTML_TAGS constant
   */
  static isHTMLElement(element: JSXElementInfo): boolean {
    return HTML_TAGS.includes(element.tagName);
  }

  /**
   * Checks if element is a React component (capitalized tag name)
   */
  static isReactComponent(element: JSXElementInfo): boolean {
    return (
      element.tagName.charAt(0) === element.tagName.charAt(0).toUpperCase()
    );
  }

  /**
   * Enhanced helper: Checks if element is hidden via CSS classes
   */
  static isHiddenByClass(element: JSXElementInfo): boolean {
    const className = this.getPropStringValue(element, "className");
    if (!className) return false;

    return HIDDEN_ELEMENT_PATTERNS.some((pattern) => pattern.test(className));
  }

  /**
   * Enhanced helper: Checks if element is screen reader only
   */
  static isScreenReaderOnly(element: JSXElementInfo): boolean {
    const className = this.getPropStringValue(element, "className");
    if (!className) return false;

    return SCREEN_READER_ONLY_PATTERNS.some((pattern) =>
      pattern.test(className)
    );
  }

  /**
   * Enhanced helper: Checks if element is hidden via inline styles
   */
  static isHiddenByStyle(element: JSXElementInfo): boolean {
    const style = this.getPropStringValue(element, "style");
    if (!style) return false;

    return HIDDEN_STYLE_PATTERNS.some((pattern) => pattern.test(style));
  }

  /**
   * Enhanced helper: Checks if element is completely hidden
   */
  static isHiddenElement(element: JSXElementInfo): boolean {
    // Check type="hidden" for inputs
    if (element.tagName === "input") {
      const inputType = this.getPropStringValue(element, "type");
      if (inputType === "hidden") return true;
    }

    // Check aria-hidden="true"
    const ariaHidden = this.getPropStringValue(element, "aria-hidden");
    if (ariaHidden === "true") return true;

    // Check CSS-based hiding
    return this.isHiddenByClass(element) || this.isHiddenByStyle(element);
  }

  /**
   * Enhanced helper: Checks if element is likely an icon component
   */
  static isIconComponent(element: JSXElementInfo): boolean {
    const tagName = element.tagName;

    // Check component name patterns
    if (ICON_COMPONENT_PATTERNS.some((pattern) => pattern.test(tagName))) {
      return true;
    }

    // Check CSS class patterns
    const className = this.getPropStringValue(element, "className");
    if (
      className &&
      ICON_CLASS_PATTERNS.some((pattern) => pattern.test(className))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Enhanced helper: Checks if element is decorative
   */
  static isDecorativeElement(element: JSXElementInfo): boolean {
    const tagName = element.tagName.toLowerCase();

    // Check tag name
    if (DECORATIVE_ELEMENTS.includes(tagName)) {
      // For images, check if they have empty alt text (decorative)
      if (tagName === "img") {
        const alt = this.getPropStringValue(element, "alt");
        return alt === "";
      }
      return true;
    }

    // Check for decorative role
    const role = this.getPropStringValue(element, "role");
    return role === "presentation" || role === "none";
  }

  /**
   * Enhanced helper: Checks if variable name suggests text content
   */
  static isTextVariable(variableName: string): boolean {
    return TEXT_VARIABLE_PATTERNS.some((pattern) => pattern.test(variableName));
  }

  /**
   * Enhanced helper: Checks if element has labeling props
   */
  static hasLabelingProps(element: JSXElementInfo): boolean {
    return LABELING_PROP_NAMES.some((propName) =>
      this.hasProp(element, propName)
    );
  }

  /**
   * Enhanced helper: Checks if element has spread props
   */
  static hasSpreadProps(element: JSXElementInfo): boolean {
    // Check for common spread prop patterns in prop names
    const propNames = Object.keys(element.props);
    if (
      SPREAD_PROP_PATTERNS.some((pattern) =>
        propNames.some((prop) => prop.includes(pattern))
      )
    ) {
      return true;
    }

    // Check for spread syntax in prop values
    return Object.values(element.props).some(
      (propValue) =>
        propValue.type === "expression" &&
        propValue.rawValue &&
        SPREAD_PROP_PATTERNS.some((pattern) =>
          propValue.rawValue!.includes(`...${pattern}`)
        )
    );
  }

  /**
   * Enhanced helper: Extracts variable names from expression
   */
  static extractVariableNames(expression: string): string[] {
    const variableNames: string[] = [];

    // Simple regex to extract identifiers
    const identifierRegex = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
    let match;

    while ((match = identifierRegex.exec(expression)) !== null) {
      const identifier = match[0];
      // Filter out keywords and common non-variable identifiers
      if (!this.isJavaScriptKeyword(identifier)) {
        variableNames.push(identifier);
      }
    }

    return [...new Set(variableNames)]; // Remove duplicates
  }

  /**
   * Enhanced helper: Checks if a string is a JavaScript keyword
   */
  private static isJavaScriptKeyword(word: string): boolean {
    const keywords = [
      "true",
      "false",
      "null",
      "undefined",
      "if",
      "else",
      "for",
      "while",
      "function",
      "return",
      "var",
      "let",
      "const",
      "class",
      "extends",
      "import",
      "export",
      "default",
      "from",
      "as",
      "typeof",
      "instanceof",
    ];
    return keywords.includes(word);
  }

  /**
   * Enhanced helper: Checks if expression likely contains text
   */
  static expressionLikelyContainsText(expression: string): boolean {
    const variables = this.extractVariableNames(expression);
    return variables.some((variable) => this.isTextVariable(variable));
  }

  /**
   * Enhanced helper: Gets all accessible text sources from element
   */
  static getAccessibleTextSources(element: JSXElementInfo): string[] {
    const sources: string[] = [];

    // Direct text content
    if (element.textContent && element.textContent.trim()) {
      sources.push(`text: "${element.textContent.trim()}"`);
    }

    // ARIA labeling
    const ariaLabel = this.getPropStringValue(element, "aria-label");
    if (ariaLabel) {
      sources.push(`aria-label: "${ariaLabel}"`);
    }

    const ariaLabelledby = this.getPropStringValue(element, "aria-labelledby");
    if (ariaLabelledby) {
      sources.push(`aria-labelledby: "${ariaLabelledby}"`);
    }

    // Title attribute
    const title = this.getPropStringValue(element, "title");
    if (title) {
      sources.push(`title: "${title}"`);
    }

    // Children text
    const childrenText = this.extractTextContent(element.children);
    if (childrenText && childrenText.trim()) {
      sources.push(`children: "${childrenText.trim()}"`);
    }

    return sources;
  }
}
