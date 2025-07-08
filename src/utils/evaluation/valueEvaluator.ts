import ts from "typescript";

export class ValueEvaluator {
  /**
   * Evaluates an expression to get its value
   */
  static evaluateExpression(node: ts.Expression): any {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }

    if (ts.isNumericLiteral(node)) {
      return Number(node.text);
    }

    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    }

    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    }

    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return null;
    }

    if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
      return undefined;
    }

    if (ts.isArrayLiteralExpression(node)) {
      return node.elements
        .filter(ts.isExpression)
        .map((element) => this.evaluateExpression(element));
    }

    if (ts.isObjectLiteralExpression(node)) {
      const obj: Record<string, any> = {};
      node.properties.forEach((prop) => {
        if (ts.isPropertyAssignment(prop)) {
          const name = prop.name.getText();
          obj[name] = this.evaluateExpression(prop.initializer);
        }
      });
      return obj;
    }

    if (ts.isBinaryExpression(node)) {
      return this.evaluateBinaryExpression(node);
    }

    if (ts.isPrefixUnaryExpression(node)) {
      return this.evaluatePrefixUnaryExpression(node);
    }

    // For expressions we can't evaluate statically
    return undefined;
  }

  /**
   * Evaluates a binary expression
   */
  private static evaluateBinaryExpression(node: ts.BinaryExpression): any {
    const left = this.evaluateExpression(node.left);
    const right = this.evaluateExpression(node.right);

    // Only evaluate if both operands could be evaluated
    if (left === undefined || right === undefined) {
      return undefined;
    }

    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        return left + right;
      case ts.SyntaxKind.MinusToken:
        return left - right;
      case ts.SyntaxKind.AsteriskToken:
        return left * right;
      case ts.SyntaxKind.SlashToken:
        return left / right;
      case ts.SyntaxKind.PercentToken:
        return left % right;
      case ts.SyntaxKind.AmpersandAmpersandToken:
        return left && right;
      case ts.SyntaxKind.BarBarToken:
        return left || right;
      case ts.SyntaxKind.EqualsEqualsToken:
        return left == right;
      case ts.SyntaxKind.EqualsEqualsEqualsToken:
        return left === right;
      case ts.SyntaxKind.ExclamationEqualsToken:
        return left != right;
      case ts.SyntaxKind.ExclamationEqualsEqualsToken:
        return left !== right;
      case ts.SyntaxKind.LessThanToken:
        return left < right;
      case ts.SyntaxKind.LessThanEqualsToken:
        return left <= right;
      case ts.SyntaxKind.GreaterThanToken:
        return left > right;
      case ts.SyntaxKind.GreaterThanEqualsToken:
        return left >= right;
      default:
        return undefined;
    }
  }

  /**
   * Evaluates a prefix unary expression
   */
  private static evaluatePrefixUnaryExpression(
    node: ts.PrefixUnaryExpression
  ): any {
    const operand = this.evaluateExpression(node.operand);
    if (operand === undefined) return undefined;

    switch (node.operator) {
      case ts.SyntaxKind.PlusToken:
        return +operand;
      case ts.SyntaxKind.MinusToken:
        return -operand;
      case ts.SyntaxKind.ExclamationToken:
        return !operand;
      case ts.SyntaxKind.TildeToken:
        return ~operand;
      default:
        return undefined;
    }
  }

  /**
   * Gets initial value from a variable declaration
   */
  static getInitialValue(node: ts.VariableDeclaration): any {
    if (node.initializer && ts.isExpression(node.initializer)) {
      return this.evaluateExpression(node.initializer);
    }
    return undefined;
  }

  /**
   * Gets default value from a parameter declaration
   */
  static getDefaultParameterValue(node: ts.ParameterDeclaration): any {
    if (node.initializer && ts.isExpression(node.initializer)) {
      return this.evaluateExpression(node.initializer);
    }
    return undefined;
  }

  /**
   * Gets enum member value
   */
  static getEnumMemberValue(node: ts.EnumMember): number | string | undefined {
    if (node.initializer && ts.isExpression(node.initializer)) {
      return this.evaluateExpression(node.initializer);
    }
    return undefined;
  }
}
