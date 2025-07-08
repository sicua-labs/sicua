import * as t from "@babel/types";
import { PropReference, CodePosition, HTMLElementReference } from "../types";
import {
  getJSXElementName,
  isReactComponentElement,
} from "../../../utils/ast/reactSpecific";

/**
 * Utility functions for component flow analysis
 */

/**
 * Parses JSX props into prop references
 */
export function parseJSXProps(
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  sourceCode: string
): PropReference[] {
  const props: PropReference[] = [];

  for (const attr of attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      const name = attr.name.name;
      let value = "";
      let isDynamic = false;

      if (attr.value) {
        if (t.isStringLiteral(attr.value)) {
          value = attr.value.value;
        } else if (t.isJSXExpressionContainer(attr.value)) {
          if (!t.isJSXEmptyExpression(attr.value.expression)) {
            value = extractExpressionString(attr.value.expression, sourceCode);
            isDynamic = true;
          }
        }
      }

      props.push({ name, value, isDynamic });
    }
  }

  return props;
}

/**
 * Extracts string representation of expressions
 */
export function extractExpressionString(
  expression: t.Expression,
  sourceCode: string
): string {
  if (expression.start !== null && expression.end !== null) {
    return sourceCode.slice(expression.start, expression.end);
  }

  if (t.isIdentifier(expression)) {
    return expression.name;
  } else if (t.isBooleanLiteral(expression)) {
    return String(expression.value);
  } else if (t.isNumericLiteral(expression)) {
    return String(expression.value);
  } else if (t.isStringLiteral(expression)) {
    return `"${expression.value}"`;
  }

  return "unknown";
}

/**
 * Gets code position from node
 */
export function getCodePosition(node: t.Node): CodePosition {
  return {
    line: node.loc?.start.line || 0,
    column: node.loc?.start.column || 0,
    startOffset: node.start || 0,
    endOffset: node.end || 0,
  };
}

/**
 * Checks if a node contains JSX elements
 */
export function nodeContainsJSX(node: t.Node): boolean {
  if (t.isJSXElement(node) || t.isJSXFragment(node)) {
    return true;
  }

  if (t.isConditionalExpression(node)) {
    return nodeContainsJSX(node.consequent) || nodeContainsJSX(node.alternate);
  }

  if (t.isLogicalExpression(node)) {
    return nodeContainsJSX(node.right) || nodeContainsJSX(node.left);
  }

  if (t.isArrayExpression(node)) {
    return node.elements.some((element) => element && nodeContainsJSX(element));
  }

  if (t.isCallExpression(node)) {
    // Function calls might return JSX - assume they do for now
    return true;
  }

  return false;
}

/**
 * Extracts component references from various node types - ENHANCED VERSION
 */
export function extractComponentReferencesFromNode(
  node: t.Node,
  sourceCode: string
): Array<{
  name: string;
  isJSXElement: boolean;
  props: PropReference[];
  position: CodePosition;
}> {
  const references: Array<{
    name: string;
    isJSXElement: boolean;
    props: PropReference[];
    position: CodePosition;
  }> = [];

  if (t.isJSXElement(node)) {
    // Only include React components (uppercase), not HTML elements
    if (isReactComponentElement(node)) {
      references.push(parseJSXElement(node, sourceCode));
    }

    // Also analyze children for nested components
    for (const child of node.children) {
      if (t.isJSXElement(child)) {
        references.push(
          ...extractComponentReferencesFromNode(child, sourceCode)
        );
      } else if (
        t.isJSXExpressionContainer(child) &&
        !t.isJSXEmptyExpression(child.expression)
      ) {
        references.push(
          ...extractComponentReferencesFromNode(child.expression, sourceCode)
        );
      }
    }
  } else if (t.isJSXFragment(node)) {
    for (const child of node.children) {
      if (t.isJSXElement(child)) {
        references.push(
          ...extractComponentReferencesFromNode(child, sourceCode)
        );
      } else if (
        t.isJSXExpressionContainer(child) &&
        !t.isJSXEmptyExpression(child.expression)
      ) {
        references.push(
          ...extractComponentReferencesFromNode(child.expression, sourceCode)
        );
      }
    }
  } else if (t.isConditionalExpression(node)) {
    // Handle ternary operators: condition ? ComponentA : ComponentB
    references.push(
      ...extractComponentReferencesFromNode(node.consequent, sourceCode)
    );
    references.push(
      ...extractComponentReferencesFromNode(node.alternate, sourceCode)
    );
  } else if (t.isLogicalExpression(node)) {
    // Handle logical expressions: condition && Component or condition || Component
    if (node.operator === "&&") {
      references.push(
        ...extractComponentReferencesFromNode(node.right, sourceCode)
      );
    } else if (node.operator === "||") {
      references.push(
        ...extractComponentReferencesFromNode(node.left, sourceCode)
      );
      references.push(
        ...extractComponentReferencesFromNode(node.right, sourceCode)
      );
    }
  } else if (t.isCallExpression(node)) {
    // Handle function calls that might return JSX components
    if (t.isIdentifier(node.callee)) {
      references.push({
        name: node.callee.name,
        isJSXElement: false,
        props: [],
        position: getCodePosition(node),
      });
    } else if (t.isMemberExpression(node.callee)) {
      // Handle member expressions like React.createElement or obj.method()
      const memberName = extractMemberExpressionName(node.callee);
      if (memberName) {
        references.push({
          name: memberName,
          isJSXElement: false,
          props: [],
          position: getCodePosition(node),
        });
      }
    }
  } else if (t.isArrayExpression(node)) {
    // Handle arrays of JSX elements (like map results)
    for (const element of node.elements) {
      if (element) {
        references.push(
          ...extractComponentReferencesFromNode(element, sourceCode)
        );
      }
    }
  } else if (t.isIdentifier(node)) {
    // Handle bare identifiers that might be component references
    // Only include if it's capitalized (component convention)
    if (node.name.charAt(0) === node.name.charAt(0).toUpperCase()) {
      references.push({
        name: node.name,
        isJSXElement: false,
        props: [],
        position: getCodePosition(node),
      });
    }
  } else if (t.isMemberExpression(node)) {
    // Handle member expressions like React.Component
    const memberName = extractMemberExpressionName(node);
    if (
      memberName &&
      memberName.charAt(0) === memberName.charAt(0).toUpperCase()
    ) {
      references.push({
        name: memberName,
        isJSXElement: false,
        props: [],
        position: getCodePosition(node),
      });
    }
  }

  return references;
}

/**
 * NEW: Extracts HTML element references from various node types
 */
export function extractHTMLElementReferencesFromNode(
  node: t.Node,
  sourceCode: string,
  includeTags: string[] = [],
  excludeTags: string[] = [],
  includeAll: boolean = false
): HTMLElementReference[] {
  const references: HTMLElementReference[] = [];

  if (t.isJSXElement(node)) {
    const elementName = getJSXElementName(node.openingElement.name);

    // Only include HTML elements (lowercase), not React components
    if (
      !isReactComponentElement(node) &&
      shouldIncludeHTMLTag(elementName, includeTags, excludeTags, includeAll)
    ) {
      references.push(parseHTMLElement(node, sourceCode));
    }

    // Also analyze children for nested HTML elements
    for (const child of node.children) {
      if (t.isJSXElement(child)) {
        references.push(
          ...extractHTMLElementReferencesFromNode(
            child,
            sourceCode,
            includeTags,
            excludeTags,
            includeAll
          )
        );
      } else if (
        t.isJSXExpressionContainer(child) &&
        !t.isJSXEmptyExpression(child.expression)
      ) {
        references.push(
          ...extractHTMLElementReferencesFromNode(
            child.expression,
            sourceCode,
            includeTags,
            excludeTags,
            includeAll
          )
        );
      }
    }
  } else if (t.isJSXFragment(node)) {
    for (const child of node.children) {
      if (t.isJSXElement(child)) {
        references.push(
          ...extractHTMLElementReferencesFromNode(
            child,
            sourceCode,
            includeTags,
            excludeTags,
            includeAll
          )
        );
      } else if (
        t.isJSXExpressionContainer(child) &&
        !t.isJSXEmptyExpression(child.expression)
      ) {
        references.push(
          ...extractHTMLElementReferencesFromNode(
            child.expression,
            sourceCode,
            includeTags,
            excludeTags,
            includeAll
          )
        );
      }
    }
  } else if (t.isConditionalExpression(node)) {
    // Handle ternary operators: condition ? <div> : <span>
    references.push(
      ...extractHTMLElementReferencesFromNode(
        node.consequent,
        sourceCode,
        includeTags,
        excludeTags,
        includeAll
      )
    );
    references.push(
      ...extractHTMLElementReferencesFromNode(
        node.alternate,
        sourceCode,
        includeTags,
        excludeTags,
        includeAll
      )
    );
  } else if (t.isLogicalExpression(node)) {
    // Handle logical expressions: condition && <div> or condition || <span>
    if (node.operator === "&&") {
      references.push(
        ...extractHTMLElementReferencesFromNode(
          node.right,
          sourceCode,
          includeTags,
          excludeTags,
          includeAll
        )
      );
    } else if (node.operator === "||") {
      references.push(
        ...extractHTMLElementReferencesFromNode(
          node.left,
          sourceCode,
          includeTags,
          excludeTags,
          includeAll
        )
      );
      references.push(
        ...extractHTMLElementReferencesFromNode(
          node.right,
          sourceCode,
          includeTags,
          excludeTags,
          includeAll
        )
      );
    }
  } else if (t.isArrayExpression(node)) {
    // Handle arrays of JSX elements (like map results)
    for (const element of node.elements) {
      if (element) {
        references.push(
          ...extractHTMLElementReferencesFromNode(
            element,
            sourceCode,
            includeTags,
            excludeTags,
            includeAll
          )
        );
      }
    }
  }

  return references;
}

/**
 * NEW: Parses HTML element into HTMLElementReference
 */
export function parseHTMLElement(
  element: t.JSXElement,
  sourceCode: string,
  captureTextContent: boolean = true,
  maxTextLength: number = 100
): HTMLElementReference {
  const tagName = getJSXElementName(element.openingElement.name);
  const props = parseJSXProps(element.openingElement.attributes, sourceCode);
  const hasChildren = element.children.length > 0;

  // Extract text content if enabled and element has text children
  let textContent: string | undefined;

  if (captureTextContent && hasChildren) {
    textContent = extractTextContentFromJSX(element, sourceCode);

    // Truncate if too long
    if (textContent && textContent.length > maxTextLength) {
      textContent = textContent.substring(0, maxTextLength) + "...";
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
export function extractTextContentFromJSX(
  element: t.JSXElement,
  sourceCode: string
): string | undefined {
  const textParts: string[] = [];

  for (const child of element.children) {
    if (t.isJSXText(child)) {
      // Direct text content
      const trimmedText = child.value.trim();
      if (trimmedText.length > 0) {
        textParts.push(trimmedText);
      }
    } else if (t.isJSXExpressionContainer(child)) {
      if (t.isStringLiteral(child.expression)) {
        // String literals in expressions
        textParts.push(child.expression.value);
      } else if (t.isTemplateLiteral(child.expression)) {
        // Template literals
        textParts.push("[template]"); // Placeholder for template literals
      } else if (t.isIdentifier(child.expression)) {
        // Variable references
        textParts.push(`{${child.expression.name}}`);
      } else {
        // Other expressions
        textParts.push("{expr}");
      }
    }
    // Could extend to handle more complex nested structures
  }

  const fullText = textParts.join(" ").trim();
  return fullText.length > 0 ? fullText : undefined;
}

/**
 * NEW: Determines if an HTML tag should be included based on filter criteria
 */
export function shouldIncludeHTMLTag(
  tagName: string,
  includeTags: string[],
  excludeTags: string[],
  includeAll: boolean
): boolean {
  // Check exclude list first
  if (excludeTags.includes(tagName)) {
    return false;
  }

  // If includeAll is true, include everything not excluded
  if (includeAll) {
    return true;
  }

  // Otherwise, only include if in the include list
  return includeTags.includes(tagName);
}

/**
 * Helper function to extract name from member expressions
 */
function extractMemberExpressionName(
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
 * Parses JSX element into component reference
 */
export function parseJSXElement(
  element: t.JSXElement,
  sourceCode: string
): {
  name: string;
  isJSXElement: boolean;
  props: PropReference[];
  position: CodePosition;
} {
  const name = getJSXElementName(element.openingElement.name);
  const props = parseJSXProps(element.openingElement.attributes, sourceCode);

  return {
    name,
    isJSXElement: true,
    props,
    position: getCodePosition(element),
  };
}

/**
 * Extracts component references from statements
 */
export function extractComponentReferencesFromStatement(
  statement: t.Statement,
  sourceCode: string
): Array<{
  name: string;
  isJSXElement: boolean;
  props: PropReference[];
  position: CodePosition;
}> {
  if (t.isReturnStatement(statement) && statement.argument) {
    return extractComponentReferencesFromNode(statement.argument, sourceCode);
  } else if (t.isExpressionStatement(statement)) {
    return extractComponentReferencesFromNode(statement.expression, sourceCode);
  } else if (t.isBlockStatement(statement)) {
    const references: Array<{
      name: string;
      isJSXElement: boolean;
      props: PropReference[];
      position: CodePosition;
    }> = [];
    for (const stmt of statement.body) {
      references.push(
        ...extractComponentReferencesFromStatement(stmt, sourceCode)
      );
    }
    return references;
  }

  return [];
}

/**
 * NEW: Extracts HTML element references from statements
 */
export function extractHTMLElementReferencesFromStatement(
  statement: t.Statement,
  sourceCode: string,
  includeTags: string[] = [],
  excludeTags: string[] = [],
  includeAll: boolean = false
): HTMLElementReference[] {
  if (t.isReturnStatement(statement) && statement.argument) {
    return extractHTMLElementReferencesFromNode(
      statement.argument,
      sourceCode,
      includeTags,
      excludeTags,
      includeAll
    );
  } else if (t.isExpressionStatement(statement)) {
    return extractHTMLElementReferencesFromNode(
      statement.expression,
      sourceCode,
      includeTags,
      excludeTags,
      includeAll
    );
  } else if (t.isBlockStatement(statement)) {
    const references: HTMLElementReference[] = [];
    for (const stmt of statement.body) {
      references.push(
        ...extractHTMLElementReferencesFromStatement(
          stmt,
          sourceCode,
          includeTags,
          excludeTags,
          includeAll
        )
      );
    }
    return references;
  }

  return [];
}

/**
 * Checks if a filename is a page file
 */
export function isPageFile(fileName: string): boolean {
  const nameWithoutExt = fileName.replace(/\.(js|jsx|ts|tsx)$/, "");
  return nameWithoutExt === "page";
}

/**
 * Checks if a segment is dynamic ([param])
 */
export function isDynamicSegment(segment: string): boolean {
  return (
    segment.startsWith("[") &&
    segment.endsWith("]") &&
    !segment.startsWith("[...")
  );
}

/**
 * Checks if a segment is catch-all ([...param])
 */
export function isCatchAllSegment(segment: string): boolean {
  return segment.startsWith("[...") && segment.endsWith("]");
}

/**
 * Checks if a segment is a route group ((group))
 */
export function isRouteGroup(segment: string): boolean {
  return segment.startsWith("(") && segment.endsWith(")");
}

/**
 * Parses route path into segments
 */
export function parseRoutePath(routePath: string): string[] {
  const cleanPath = routePath.startsWith("/") ? routePath.slice(1) : routePath;

  if (!cleanPath) {
    return [];
  }

  return cleanPath.split("/").filter((segment) => segment.length > 0);
}

/**
 * Simple pattern matching for route filtering
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob-like pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\./g, "\\.");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Parses file content to AST
 */
export function parseFileToAST(content: string): t.File | null {
  try {
    const { parse } = require("@babel/parser");
    return parse(content, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "decorators",
        "classProperties",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "dynamicImport",
      ],
      errorRecovery: true,
    });
  } catch (error) {
    console.warn("Error parsing AST:", error);
    return null;
  }
}

/**
 * Extracts default export name from AST
 */
export function extractDefaultExportName(ast: t.File): string | null {
  let exportName: string | null = null;

  const traverse = require("@babel/traverse").default;

  traverse(ast, {
    ExportDefaultDeclaration(path: any) {
      const declaration = path.node.declaration;

      if (t.isIdentifier(declaration)) {
        exportName = declaration.name;
      } else if (t.isFunctionDeclaration(declaration) && declaration.id) {
        exportName = declaration.id.name;
      } else if (t.isArrowFunctionExpression(declaration)) {
        // For arrow functions, we'll use the variable name if it's assigned
        const parent = path.parent;
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          exportName = parent.id.name;
        }
      }
    },
  });

  return exportName;
}

/**
 * Checks if a component has multiple return statements
 */
export function checkMultipleReturns(ast: t.File): boolean {
  let returnCount = 0;

  const traverse = require("@babel/traverse").default;

  traverse(ast, {
    ReturnStatement() {
      returnCount++;
    },
  });

  return returnCount > 1;
}
