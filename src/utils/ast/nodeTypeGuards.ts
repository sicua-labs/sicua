import ts from "typescript";

export class NodeTypeGuards {
  /**
   * Checks if node is a component declaration
   */
  static isComponentDeclaration(
    node: ts.Node
  ): node is ts.FunctionDeclaration | ts.ClassDeclaration {
    return (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      !!node.name &&
      /^[A-Z]/.test(node.name.text)
    );
  }

  /**
   * Checks if node is a hook call
   */
  static isHookCall(node: ts.Node): node is ts.CallExpression {
    return (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text.startsWith("use")
    );
  }

  /**
   * Checks if node is a JSX component
   */
  static isJsxComponent(
    node: ts.Node
  ): node is ts.JsxElement | ts.JsxSelfClosingElement {
    return (
      (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
      this.hasCapitalizedName(node)
    );
  }

  /**
   * Checks if node is an event handler
   */
  static isEventHandler(
    node: ts.Node
  ): node is ts.MethodDeclaration | ts.PropertyDeclaration {
    return (
      (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) &&
      !!node.name &&
      (node.name.getText().startsWith("handle") ||
        node.name.getText().startsWith("on"))
    );
  }

  /**
   * Checks if node is a state declaration
   */
  static isStateDeclaration(node: ts.Node): node is ts.VariableDeclaration {
    if (!ts.isVariableDeclaration(node)) return false;
    if (!node.initializer) return false;
    if (!ts.isArrayBindingPattern(node.name)) return false;

    return (
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "useState"
    );
  }

  /**
   * Checks if node is an effect declaration
   */
  static isEffectCall(node: ts.Node): node is ts.CallExpression {
    return (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "useEffect" ||
        node.expression.text === "useLayoutEffect")
    );
  }

  /**
   * Checks if node is a memo declaration
   */
  static isMemoCall(node: ts.Node): node is ts.CallExpression {
    return (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "useMemo" ||
        node.expression.text === "useCallback")
    );
  }

  /**
   * Helper to check if JSX element has capitalized name
   */
  private static hasCapitalizedName(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): boolean {
    const tagName = ts.isJsxElement(node)
      ? node.openingElement.tagName
      : node.tagName;

    return ts.isIdentifier(tagName) && /^[A-Z]/.test(tagName.text);
  }

  /**
   * Checks if node is a type reference
   */
  static isTypeReference(node: ts.Node): node is ts.TypeReferenceNode {
    return ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName);
  }

  /**
   *  Checks if node is an async function
   */
  static isAsyncFunction(node: ts.Node): node is ts.FunctionLikeDeclaration {
    if (!ts.isFunctionLike(node)) return false;

    // Handle different types of function-like declarations
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    ) {
      return (
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ??
        false
      );
    }

    return false;
  }
}
