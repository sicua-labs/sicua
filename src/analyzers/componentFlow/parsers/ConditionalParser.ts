import * as t from "@babel/types";
import {
  ConditionalPattern,
  ComponentReference,
  HTMLElementReference,
  ComponentFlowConfig,
  DEFAULT_HTML_ELEMENT_FILTER,
} from "../types";
import {
  extractExpressionString,
  getCodePosition,
  parseJSXElement,
  parseJSXProps,
} from "../utils";
import {
  containsJSX,
  getJSXElementName,
  isReactComponentElement,
} from "../../../utils/ast/reactSpecific";

/**
 * Core parser for detecting and analyzing conditional rendering patterns in JSX
 */
export class ConditionalParser {
  private config: ComponentFlowConfig;

  constructor(config?: ComponentFlowConfig) {
    // Use provided config or create default
    this.config = config || {
      maxDepth: 10,
      includeExternalComponents: true,
      excludePatterns: [],
      onlyAnalyzeRoutes: [],
      includeHtmlElements: false,
      htmlElementFilter: DEFAULT_HTML_ELEMENT_FILTER,
    };
  }

  /**
   * Analyzes a JSX expression for conditional rendering patterns
   */
  analyzeExpression(
    expression: t.Expression,
    sourceCode: string
  ): ConditionalPattern[] {
    const patterns: ConditionalPattern[] = [];

    if (t.isConditionalExpression(expression)) {
      patterns.push(this.parseTernaryExpression(expression, sourceCode));
    } else if (t.isLogicalExpression(expression)) {
      const logicalPattern = this.parseLogicalExpression(
        expression,
        sourceCode
      );
      if (logicalPattern) {
        patterns.push(logicalPattern);
      }
    } else if (t.isCallExpression(expression)) {
      // Handle function calls that might return conditional JSX
      const callPatterns = this.analyzeCallExpression(expression, sourceCode);
      patterns.push(...callPatterns);
    } else if (t.isJSXElement(expression) || t.isJSXFragment(expression)) {
      // Check if JSX element itself contains conditional expressions
      const jsxPatterns = this.analyzeJSXExpressions(expression, sourceCode);
      patterns.push(...jsxPatterns);
    }

    return patterns;
  }

  /**
   * Analyzes JSX expressions for conditional patterns within JSX
   */
  private analyzeJSXExpressions(
    jsxNode: t.JSXElement | t.JSXFragment,
    sourceCode: string
  ): ConditionalPattern[] {
    const patterns: ConditionalPattern[] = [];

    if (t.isJSXElement(jsxNode)) {
      // Check children for JSX expression containers with conditionals
      for (const child of jsxNode.children) {
        if (
          t.isJSXExpressionContainer(child) &&
          !t.isJSXEmptyExpression(child.expression)
        ) {
          const childPatterns = this.analyzeExpression(
            child.expression,
            sourceCode
          );
          patterns.push(...childPatterns);
        } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
          const nestedPatterns = this.analyzeJSXExpressions(child, sourceCode);
          patterns.push(...nestedPatterns);
        }
      }
    } else if (t.isJSXFragment(jsxNode)) {
      // Check fragment children
      for (const child of jsxNode.children) {
        if (
          t.isJSXExpressionContainer(child) &&
          !t.isJSXEmptyExpression(child.expression)
        ) {
          const childPatterns = this.analyzeExpression(
            child.expression,
            sourceCode
          );
          patterns.push(...childPatterns);
        } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
          const nestedPatterns = this.analyzeJSXExpressions(child, sourceCode);
          patterns.push(...nestedPatterns);
        }
      }
    }

    return patterns;
  }

  /**
   * Analyzes function body for conditional return statements
   */
  analyzeFunctionBody(
    body: t.BlockStatement | t.Expression,
    sourceCode: string
  ): ConditionalPattern[] {
    const patterns: ConditionalPattern[] = [];

    if (t.isBlockStatement(body)) {
      patterns.push(...this.analyzeBlockStatement(body, sourceCode));
    } else if (t.isExpression(body)) {
      patterns.push(...this.analyzeExpression(body, sourceCode));
    }

    return patterns;
  }

  /**
   * Parses ternary conditional expressions (condition ? true : false) - ENHANCED
   */
  private parseTernaryExpression(
    expression: t.ConditionalExpression,
    sourceCode: string
  ): ConditionalPattern {
    const condition = this.extractConditionString(expression.test, sourceCode);

    // Extract both components and HTML elements
    const { components: trueBranchComponents, htmlElements: trueBranchHtml } =
      this.extractAllReferences(expression.consequent, sourceCode);

    const { components: falseBranchComponents, htmlElements: falseBranchHtml } =
      this.extractAllReferences(expression.alternate, sourceCode);

    return {
      type: "ternary",
      condition,
      trueBranch: trueBranchComponents,
      falseBranch: falseBranchComponents,
      htmlElementsTrue: trueBranchHtml,
      htmlElementsFalse: falseBranchHtml,
      position: getCodePosition(expression),
    };
  }

  /**
   * Parses logical AND expressions (condition && <Component />) - ENHANCED
   */
  private parseLogicalExpression(
    expression: t.LogicalExpression,
    sourceCode: string
  ): ConditionalPattern | null {
    if (expression.operator === "&&") {
      const condition = this.extractConditionString(
        expression.left,
        sourceCode
      );

      const { components: trueBranchComponents, htmlElements: trueBranchHtml } =
        this.extractAllReferences(expression.right, sourceCode);

      // Only create pattern if we found components or HTML elements in the right side
      if (trueBranchComponents.length > 0 || trueBranchHtml.length > 0) {
        return {
          type: "logical_and",
          condition,
          trueBranch: trueBranchComponents,
          // Logical AND has no explicit false branch
          falseBranch: undefined,
          htmlElementsTrue: trueBranchHtml,
          htmlElementsFalse: undefined,
          position: getCodePosition(expression),
        };
      }
    } else if (expression.operator === "||") {
      // Handle OR expressions (fallback rendering)
      const condition = this.extractConditionString(
        expression.left,
        sourceCode
      );

      const { components: trueBranchComponents, htmlElements: trueBranchHtml } =
        this.extractAllReferences(expression.left, sourceCode);

      const {
        components: falseBranchComponents,
        htmlElements: falseBranchHtml,
      } = this.extractAllReferences(expression.right, sourceCode);

      if (
        trueBranchComponents.length > 0 ||
        falseBranchComponents.length > 0 ||
        trueBranchHtml.length > 0 ||
        falseBranchHtml.length > 0
      ) {
        return {
          type: "logical_and", // Treat OR as logical for now
          condition,
          trueBranch: trueBranchComponents,
          falseBranch: falseBranchComponents,
          htmlElementsTrue: trueBranchHtml,
          htmlElementsFalse: falseBranchHtml,
          position: getCodePosition(expression),
        };
      }
    }

    return null;
  }

  /**
   * Analyzes block statements for if/else and early return patterns
   */
  private analyzeBlockStatement(
    block: t.BlockStatement,
    sourceCode: string
  ): ConditionalPattern[] {
    const patterns: ConditionalPattern[] = [];

    for (const statement of block.body) {
      if (t.isIfStatement(statement)) {
        patterns.push(this.parseIfStatement(statement, sourceCode));
      } else if (t.isReturnStatement(statement)) {
        const returnPatterns = this.analyzeReturnStatement(
          statement,
          sourceCode
        );
        patterns.push(...returnPatterns);
      } else if (t.isSwitchStatement(statement)) {
        patterns.push(this.parseSwitchStatement(statement, sourceCode));
      }
    }

    return patterns;
  }

  /**
   * Parses if/else statements - ENHANCED
   */
  private parseIfStatement(
    statement: t.IfStatement,
    sourceCode: string
  ): ConditionalPattern {
    const condition = this.extractConditionString(statement.test, sourceCode);

    const { components: trueBranchComponents, htmlElements: trueBranchHtml } =
      this.extractReferencesFromStatement(statement.consequent, sourceCode);

    let falseBranchComponents: ComponentReference[] = [];
    let falseBranchHtml: HTMLElementReference[] = [];

    if (statement.alternate) {
      const falseResult = this.extractReferencesFromStatement(
        statement.alternate,
        sourceCode
      );
      falseBranchComponents = falseResult.components;
      falseBranchHtml = falseResult.htmlElements;
    }

    return {
      type: "if_statement",
      condition,
      trueBranch: trueBranchComponents,
      falseBranch:
        falseBranchComponents.length > 0 ? falseBranchComponents : undefined,
      htmlElementsTrue: trueBranchHtml,
      htmlElementsFalse:
        falseBranchHtml.length > 0 ? falseBranchHtml : undefined,
      position: getCodePosition(statement),
    };
  }

  /**
   * Parses switch statements - ENHANCED
   */
  private parseSwitchStatement(
    statement: t.SwitchStatement,
    sourceCode: string
  ): ConditionalPattern {
    const condition = this.extractConditionString(
      statement.discriminant,
      sourceCode
    );

    const trueBranchComponents: ComponentReference[] = [];
    const trueBranchHtml: HTMLElementReference[] = [];

    for (const caseClause of statement.cases) {
      for (const stmt of caseClause.consequent) {
        const { components, htmlElements } =
          this.extractReferencesFromStatement(stmt, sourceCode);
        trueBranchComponents.push(...components);
        trueBranchHtml.push(...htmlElements);
      }
    }

    return {
      type: "switch_statement",
      condition,
      trueBranch: trueBranchComponents,
      htmlElementsTrue: trueBranchHtml,
      position: getCodePosition(statement),
    };
  }

  /**
   * Analyzes return statements for conditional patterns
   */
  private analyzeReturnStatement(
    statement: t.ReturnStatement,
    sourceCode: string
  ): ConditionalPattern[] {
    if (!statement.argument) {
      return [];
    }

    // First check if the return statement itself contains conditional logic
    const patterns = this.analyzeExpression(statement.argument, sourceCode);

    // If no conditional patterns found but contains JSX, treat as early return
    if (patterns.length === 0 && containsJSX(statement.argument)) {
      const { components, htmlElements } = this.extractAllReferences(
        statement.argument,
        sourceCode
      );

      if (components.length > 0 || htmlElements.length > 0) {
        patterns.push({
          type: "early_return",
          condition: "early return",
          trueBranch: components,
          htmlElementsTrue: htmlElements,
          position: getCodePosition(statement),
        });
      }
    }

    return patterns;
  }

  /**
   * Analyzes call expressions that might return conditional JSX
   */
  private analyzeCallExpression(
    expression: t.CallExpression,
    sourceCode: string
  ): ConditionalPattern[] {
    // Handle render functions or factory functions
    if (
      t.isIdentifier(expression.callee) &&
      expression.callee.name.toLowerCase().includes("render")
    ) {
      // This might be a render function that returns conditional JSX
      return [];
    }

    return [];
  }

  /**
   * NEW: Extracts both component and HTML element references from various node types
   */
  private extractAllReferences(
    node: t.Node,
    sourceCode: string
  ): {
    components: ComponentReference[];
    htmlElements: HTMLElementReference[];
  } {
    const components: ComponentReference[] = [];
    const htmlElements: HTMLElementReference[] = [];

    if (t.isJSXElement(node)) {
      // Check if this is a component or HTML element
      const elementName = getJSXElementName(node.openingElement.name);

      if (isReactComponentElement(node)) {
        // It's a React component
        components.push(parseJSXElement(node, sourceCode));
      } else if (this.shouldIncludeHtmlElement(elementName)) {
        // It's an HTML element and we should track it
        htmlElements.push(this.parseHTMLElement(node, sourceCode));
      }

      // Also check children for more components/elements
      for (const child of node.children) {
        if (t.isJSXElement(child)) {
          const childRefs = this.extractAllReferences(child, sourceCode);
          components.push(...childRefs.components);
          htmlElements.push(...childRefs.htmlElements);
        } else if (
          t.isJSXExpressionContainer(child) &&
          !t.isJSXEmptyExpression(child.expression)
        ) {
          const exprRefs = this.extractAllReferences(
            child.expression,
            sourceCode
          );
          components.push(...exprRefs.components);
          htmlElements.push(...exprRefs.htmlElements);
        }
      }
    } else if (t.isJSXFragment(node)) {
      // Handle React fragments
      for (const child of node.children) {
        if (t.isJSXElement(child)) {
          const childRefs = this.extractAllReferences(child, sourceCode);
          components.push(...childRefs.components);
          htmlElements.push(...childRefs.htmlElements);
        } else if (
          t.isJSXExpressionContainer(child) &&
          !t.isJSXEmptyExpression(child.expression)
        ) {
          const exprRefs = this.extractAllReferences(
            child.expression,
            sourceCode
          );
          components.push(...exprRefs.components);
          htmlElements.push(...exprRefs.htmlElements);
        }
      }
    } else if (t.isArrayExpression(node)) {
      // Handle arrays of JSX elements (like map results)
      for (const element of node.elements) {
        if (element) {
          const elementRefs = this.extractAllReferences(element, sourceCode);
          components.push(...elementRefs.components);
          htmlElements.push(...elementRefs.htmlElements);
        }
      }
    } else if (t.isCallExpression(node)) {
      // Handle function calls that might return JSX
      if (t.isIdentifier(node.callee)) {
        components.push({
          name: node.callee.name,
          isJSXElement: false,
          props: [],
          position: getCodePosition(node),
        });
      } else if (t.isMemberExpression(node.callee)) {
        // Handle member expressions like React.createElement
        const memberName = this.extractMemberExpressionName(node.callee);
        if (memberName) {
          components.push({
            name: memberName,
            isJSXElement: false,
            props: [],
            position: getCodePosition(node),
          });
        }
      }
    } else if (t.isConditionalExpression(node)) {
      // Handle nested conditionals - extract from both branches
      const consequentRefs = this.extractAllReferences(
        node.consequent,
        sourceCode
      );
      const alternateRefs = this.extractAllReferences(
        node.alternate,
        sourceCode
      );
      components.push(
        ...consequentRefs.components,
        ...alternateRefs.components
      );
      htmlElements.push(
        ...consequentRefs.htmlElements,
        ...alternateRefs.htmlElements
      );
    } else if (t.isLogicalExpression(node)) {
      // Handle logical expressions
      if (node.operator === "&&") {
        const rightRefs = this.extractAllReferences(node.right, sourceCode);
        components.push(...rightRefs.components);
        htmlElements.push(...rightRefs.htmlElements);
      } else if (node.operator === "||") {
        const leftRefs = this.extractAllReferences(node.left, sourceCode);
        const rightRefs = this.extractAllReferences(node.right, sourceCode);
        components.push(...leftRefs.components, ...rightRefs.components);
        htmlElements.push(...leftRefs.htmlElements, ...rightRefs.htmlElements);
      }
    } else if (t.isIdentifier(node)) {
      // Handle bare identifiers that might be component references
      // Only include if it's capitalized (component convention)
      if (node.name.charAt(0) === node.name.charAt(0).toUpperCase()) {
        components.push({
          name: node.name,
          isJSXElement: false,
          props: [],
          position: getCodePosition(node),
        });
      }
    } else if (t.isMemberExpression(node)) {
      // Handle member expressions like React.Component
      const memberName = this.extractMemberExpressionName(node);
      if (
        memberName &&
        memberName.charAt(0) === memberName.charAt(0).toUpperCase()
      ) {
        components.push({
          name: memberName,
          isJSXElement: false,
          props: [],
          position: getCodePosition(node),
        });
      }
    }

    return { components, htmlElements };
  }

  /**
   * NEW: Extracts references from statements
   */
  private extractReferencesFromStatement(
    statement: t.Statement,
    sourceCode: string
  ): {
    components: ComponentReference[];
    htmlElements: HTMLElementReference[];
  } {
    if (t.isReturnStatement(statement) && statement.argument) {
      return this.extractAllReferences(statement.argument, sourceCode);
    } else if (t.isExpressionStatement(statement)) {
      return this.extractAllReferences(statement.expression, sourceCode);
    } else if (t.isBlockStatement(statement)) {
      const components: ComponentReference[] = [];
      const htmlElements: HTMLElementReference[] = [];

      for (const stmt of statement.body) {
        const refs = this.extractReferencesFromStatement(stmt, sourceCode);
        components.push(...refs.components);
        htmlElements.push(...refs.htmlElements);
      }

      return { components, htmlElements };
    }

    return { components: [], htmlElements: [] };
  }

  /**
   * NEW: Parses HTML element into HTMLElementReference
   */
  private parseHTMLElement(
    element: t.JSXElement,
    sourceCode: string
  ): HTMLElementReference {
    const tagName = getJSXElementName(element.openingElement.name);
    const props = parseJSXProps(element.openingElement.attributes, sourceCode);
    const hasChildren = element.children.length > 0;

    // Extract text content if enabled and element has text children
    let textContent: string | undefined;

    if (this.config.htmlElementFilter.captureTextContent && hasChildren) {
      textContent = this.extractTextContent(element, sourceCode);

      // Truncate if too long
      if (
        textContent &&
        textContent.length > this.config.htmlElementFilter.maxTextLength
      ) {
        textContent =
          textContent.substring(
            0,
            this.config.htmlElementFilter.maxTextLength
          ) + "...";
      }
    }

    return {
      tagName,
      props,
      hasChildren,
      textContent,
      position: getCodePosition(element),
    };
  }

  /**
   * NEW: Extracts text content from JSX element
   */
  private extractTextContent(
    element: t.JSXElement,
    sourceCode: string
  ): string | undefined {
    const textParts: string[] = [];

    for (const child of element.children) {
      if (t.isJSXText(child)) {
        // Direct text content
        textParts.push(child.value.trim());
      } else if (
        t.isJSXExpressionContainer(child) &&
        t.isStringLiteral(child.expression)
      ) {
        // String literals in expressions
        textParts.push(child.expression.value);
      }
      // Could extend to handle more complex text extraction
    }

    const fullText = textParts.join(" ").trim();
    return fullText.length > 0 ? fullText : undefined;
  }

  /**
   * NEW: Determines if an HTML element should be included based on configuration
   */
  private shouldIncludeHtmlElement(tagName: string): boolean {
    if (!this.config.includeHtmlElements) {
      return false;
    }

    const filter = this.config.htmlElementFilter;

    // Check exclude list first
    if (filter.excludeTags.includes(tagName)) {
      return false;
    }

    // If includeAll is true, include everything not excluded
    if (filter.includeAll) {
      return true;
    }

    // Otherwise, only include if in the include list
    return filter.includeTags.includes(tagName);
  }

  /**
   * Helper function to extract name from member expressions
   */
  private extractMemberExpressionName(
    memberExpr: t.MemberExpression
  ): string | null {
    if (
      t.isIdentifier(memberExpr.object) &&
      t.isIdentifier(memberExpr.property)
    ) {
      return `${memberExpr.object.name}.${memberExpr.property.name}`;
    } else if (t.isIdentifier(memberExpr.property)) {
      return memberExpr.property.name;
    }
    return null;
  }

  /**
   * Extracts condition string from test expressions
   */
  private extractConditionString(
    test: t.Expression,
    sourceCode: string
  ): string {
    return extractExpressionString(test, sourceCode);
  }
}
