import ts from "typescript";
import * as t from "@babel/types";
import { FunctionDefinition } from "../../analyzers/contextualSummaries/types/functionExtractor.types";

/**
 * Enhanced TypeScript version - Checks if a node is a React component
 * Combines TypeScript type checking with deep JSX analysis
 */
export function isReactComponent(
  node: ts.Node,
  typeChecker?: ts.TypeChecker
): boolean {
  // Check if it's a function-like node
  if (
    !ts.isFunctionDeclaration(node) &&
    !ts.isArrowFunction(node) &&
    !ts.isFunctionExpression(node) &&
    !ts.isMethodDeclaration(node)
  ) {
    return false;
  }

  // Get function name for naming convention check
  const functionName = getFunctionName(node);

  // Check naming convention (PascalCase) - React components should start with uppercase
  if (functionName && functionName[0] !== functionName[0].toUpperCase()) {
    return false;
  }

  // Primary method: Use TypeScript type checker if available (most reliable)
  if (typeChecker) {
    const signature = typeChecker.getSignatureFromDeclaration(
      node as ts.SignatureDeclaration
    );
    if (signature) {
      const returnType = typeChecker.getReturnTypeOfSignature(signature);
      const returnTypeString = typeChecker.typeToString(returnType);

      // Check for React return types
      if (
        returnTypeString.includes("JSX.Element") ||
        returnTypeString.includes("ReactElement") ||
        returnTypeString.includes("ReactNode") ||
        returnTypeString.includes("Element") ||
        returnTypeString.includes("React.ReactElement") ||
        returnTypeString.includes("React.ReactNode")
      ) {
        return true;
      }
    }
  }

  // Fallback: Enhanced JSX pattern analysis
  return containsJSXPatterns(node);
}

/**
 * Check if a custom FunctionDefinition object is a React component
 */
export function isReactComponentDefinition(
  funcDef: FunctionDefinition
): boolean {
  // If reactSpecific info is already analyzed, use it
  if (funcDef.reactSpecific) {
    return true;
  }

  // Check naming convention (PascalCase)
  if (!funcDef.name || funcDef.name[0] !== funcDef.name[0].toUpperCase()) {
    return false;
  }

  // Check patterns for React-specific usage
  if (
    funcDef.patterns &&
    funcDef.patterns.some(
      (pattern) =>
        pattern.toString().toLowerCase().includes("jsx") ||
        pattern.toString().toLowerCase().includes("react")
    )
  ) {
    return true;
  }

  // Check dependencies for React-related imports
  if (
    funcDef.dependencies &&
    funcDef.dependencies.some(
      (dep) =>
        dep.name === "React" ||
        dep.name === "react" ||
        dep.name.includes("jsx") ||
        dep.name.includes("JSX")
    )
  ) {
    return true;
  }

  // If function is exported and follows naming convention, likely a component
  if (funcDef.isExported && funcDef.name[0] === funcDef.name[0].toUpperCase()) {
    return true;
  }

  return false;
}

/**
 * Check if a JSX element represents a React component (vs HTML element)
 */
export function isReactComponentElement(node: t.JSXElement): boolean {
  const elementName = getJSXElementName(node.openingElement.name);

  // React components start with uppercase, HTML elements with lowercase
  return (
    elementName.length > 0 && elementName[0] === elementName[0].toUpperCase()
  );
}

/**
 * Get the name of a JSX element
 */
export function getJSXElementName(
  name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
): string {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }

  if (t.isJSXMemberExpression(name)) {
    // Handle cases like <Component.SubComponent>
    const object = getJSXElementName(name.object);
    const property = name.property.name;
    return `${object}.${property}`;
  }

  if (t.isJSXNamespacedName(name)) {
    // Handle cases like <namespace:Component>
    return `${name.namespace.name}:${name.name.name}`;
  }

  return "Unknown";
}

/**
 * Check if a JSX element is an HTML element (vs React component)
 */
export function isHTMLElement(node: t.JSXElement): boolean {
  return !isReactComponentElement(node);
}

/**
 * Extract function name from various TypeScript function node types
 */
function getFunctionName(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return node.name.text;
  }

  if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }

  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }

    // Check for property assignment (e.g., obj.MyComponent = () => ...)
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }

    // Check for export assignment (e.g., export const MyComponent = () => ...)
    if (ts.isBindingElement(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }
  }

  return "";
}

/**
 * Enhanced JSX pattern detection for TypeScript nodes
 */
function containsJSXPatterns(node: ts.Node): boolean {
  const nodeText = node.getText();

  // Check for obvious JSX patterns
  const hasBasicJSX =
    (nodeText.includes("return (") || nodeText.includes("return<")) &&
    (nodeText.includes("</") || nodeText.includes("/>"));

  // Check for React.createElement calls
  const hasReactCalls =
    nodeText.includes("React.createElement") ||
    nodeText.includes("jsx(") ||
    nodeText.includes("jsxs(") ||
    nodeText.includes("_jsx(") ||
    nodeText.includes("_jsxs(");

  if (hasBasicJSX || hasReactCalls) {
    return true;
  }

  // Deep JSX analysis using TypeScript AST traversal
  return hasDeepJSXPatterns(node);
}

/**
 * Deep JSX pattern analysis using TypeScript AST traversal
 */
function hasDeepJSXPatterns(node: ts.Node): boolean {
  let foundJSX = false;

  function visit(child: ts.Node): void {
    if (foundJSX) return;

    // Check for JSX elements
    if (
      ts.isJsxElement(child) ||
      ts.isJsxSelfClosingElement(child) ||
      ts.isJsxFragment(child)
    ) {
      foundJSX = true;
      return;
    }

    // Check return statements
    if (ts.isReturnStatement(child) && child.expression) {
      if (containsJSXInExpression(child.expression)) {
        foundJSX = true;
        return;
      }
    }

    // Check arrow function bodies
    if (ts.isArrowFunction(child) && child.body) {
      if (ts.isExpression(child.body) && containsJSXInExpression(child.body)) {
        foundJSX = true;
        return;
      }
    }

    ts.forEachChild(child, visit);
  }

  ts.forEachChild(node, visit);
  return foundJSX;
}

/**
 * Check if an expression contains JSX (handles complex expressions)
 */
function containsJSXInExpression(expr: ts.Expression): boolean {
  // Direct JSX
  if (
    ts.isJsxElement(expr) ||
    ts.isJsxSelfClosingElement(expr) ||
    ts.isJsxFragment(expr)
  ) {
    return true;
  }

  // Conditional expressions (ternary)
  if (ts.isConditionalExpression(expr)) {
    return (
      containsJSXInExpression(expr.whenTrue) ||
      containsJSXInExpression(expr.whenFalse)
    );
  }

  // Binary expressions (&&, ||)
  if (ts.isBinaryExpression(expr)) {
    return (
      containsJSXInExpression(expr.left as ts.Expression) ||
      containsJSXInExpression(expr.right as ts.Expression)
    );
  }

  // Array expressions (for .map() etc.)
  if (ts.isArrayLiteralExpression(expr)) {
    return expr.elements.some(
      (element) =>
        element && ts.isExpression(element) && containsJSXInExpression(element)
    );
  }

  // Parenthesized expressions
  if (ts.isParenthesizedExpression(expr)) {
    return containsJSXInExpression(expr.expression);
  }

  // Call expressions (might return JSX)
  if (ts.isCallExpression(expr)) {
    // Check if it's a .map() call that might return JSX
    const text = expr.getText();
    if (
      text.includes(".map(") &&
      (text.includes("</") || text.includes("/>"))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Babel version - Enhanced with better JSX detection
 * Checks if a function node is a React component
 */
export function isReactComponentBabel(
  node: t.Function | t.ArrowFunctionExpression,
  functionName?: string
): boolean {
  // Check naming convention if name is provided
  if (functionName && functionName[0] !== functionName[0].toUpperCase()) {
    return false;
  }

  // Check if arrow function with direct JSX return
  if (t.isArrowFunctionExpression(node) && !t.isBlockStatement(node.body)) {
    return containsJSX(node.body);
  }

  // Check function body for JSX returns
  if (node.body && t.isBlockStatement(node.body)) {
    return node.body.body.some((statement) => {
      if (t.isReturnStatement(statement) && statement.argument) {
        return containsJSX(statement.argument);
      }
      return false;
    });
  }

  return false;
}

/**
 * Enhanced JSX detection for Babel AST nodes
 */
export function containsJSX(node: t.Node): boolean {
  // Direct JSX elements
  if (t.isJSXElement(node) || t.isJSXFragment(node)) {
    return true;
  }

  // Conditional expressions (ternary operators)
  if (t.isConditionalExpression(node)) {
    return containsJSX(node.consequent) || containsJSX(node.alternate);
  }

  // Logical expressions (&&, ||)
  if (t.isLogicalExpression(node)) {
    return containsJSX(node.left) || containsJSX(node.right);
  }

  // Binary expressions
  if (t.isBinaryExpression(node)) {
    return containsJSX(node.left) || containsJSX(node.right);
  }

  // Array expressions (for mapping)
  if (t.isArrayExpression(node)) {
    return node.elements.some((element) => element && containsJSX(element));
  }

  // JSX expression containers
  if (
    t.isJSXExpressionContainer(node) &&
    !t.isJSXEmptyExpression(node.expression)
  ) {
    return containsJSX(node.expression);
  }

  // Return statements
  if (t.isReturnStatement(node) && node.argument) {
    return containsJSX(node.argument);
  }

  // Block statements (function bodies)
  if (t.isBlockStatement(node)) {
    return node.body.some((statement) => {
      if (t.isReturnStatement(statement) && statement.argument) {
        return containsJSX(statement.argument);
      }
      return containsJSX(statement);
    });
  }

  // Arrow function bodies
  if (t.isArrowFunctionExpression(node)) {
    return containsJSX(node.body);
  }

  // Function bodies
  if (
    (t.isFunctionDeclaration(node) || t.isFunctionExpression(node)) &&
    node.body
  ) {
    return containsJSX(node.body);
  }

  // Call expressions (might be component calls or .map() returning JSX)
  if (t.isCallExpression(node)) {
    return node.arguments.some((arg) => containsJSX(arg));
  }

  // Member expressions (for chained calls like items.map(...))
  if (t.isMemberExpression(node)) {
    return containsJSX(node.object) || containsJSX(node.property);
  }

  // Parenthesized expressions
  if (t.isParenthesizedExpression(node)) {
    return containsJSX(node.expression);
  }

  // Sequence expressions
  if (t.isSequenceExpression(node)) {
    return node.expressions.some((expr) => containsJSX(expr));
  }

  // Check for JSX children in nodes that might have them
  if ("children" in node && Array.isArray((node as any).children)) {
    return (node as any).children.some((child: t.Node) => containsJSX(child));
  }

  return false;
}

/**
 * Utility function to get function name from Babel AST nodes
 */
export function getBabelFunctionName(
  node: t.Function | t.ArrowFunctionExpression,
  parent?: t.Node
): string {
  // Function declarations
  if (t.isFunctionDeclaration(node) && node.id) {
    return node.id.name;
  }

  // Check parent context for arrow functions and function expressions
  if (parent) {
    // Variable declarations: const MyComponent = () => {}
    if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
      return parent.id.name;
    }

    // Property assignments: obj.MyComponent = () => {}
    if (t.isAssignmentExpression(parent) && t.isMemberExpression(parent.left)) {
      const property = parent.left.property;
      if (t.isIdentifier(property)) {
        return property.name;
      }
    }

    // Object method: { MyComponent() {} }
    if (t.isObjectMethod(parent) && t.isIdentifier(parent.key)) {
      return parent.key.name;
    }

    // Object property: { MyComponent: () => {} }
    if (t.isObjectProperty(parent) && t.isIdentifier(parent.key)) {
      return parent.key.name;
    }
  }

  return "";
}
