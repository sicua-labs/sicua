import ts from "typescript";
import { HalsteadMetrics } from "../types/complexity.types";

export function calculateHalsteadMetrics(node: ts.Node): HalsteadMetrics {
  const operators = new Set<string>();
  const operands = new Set<string>();
  let totalOperators = 0;
  let totalOperands = 0;

  const visitor = (node: ts.Node) => {
    switch (node.kind) {
      // Binary operators
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpr = node as ts.BinaryExpression;
        operators.add(binaryExpr.operatorToken.getText());
        totalOperators++;
        break;

      // Unary operators
      case ts.SyntaxKind.PrefixUnaryExpression:
      case ts.SyntaxKind.PostfixUnaryExpression:
        const unaryExpr = node as
          | ts.PrefixUnaryExpression
          | ts.PostfixUnaryExpression;
        operators.add(
          ts.tokenToString(unaryExpr.operator) || unaryExpr.operator.toString()
        );
        totalOperators++;
        break;

      // Assignment operators
      case ts.SyntaxKind.VariableDeclaration:
        if ((node as ts.VariableDeclaration).initializer) {
          operators.add("=");
          totalOperators++;
        }
        break;

      // Function calls (function name as operator)
      case ts.SyntaxKind.CallExpression:
        const callExpr = node as ts.CallExpression;
        if (ts.isIdentifier(callExpr.expression)) {
          operators.add(callExpr.expression.text);
          totalOperators++;
        } else if (ts.isPropertyAccessExpression(callExpr.expression)) {
          operators.add(callExpr.expression.name.text);
          totalOperators++;
        }
        break;

      // Property access operators
      case ts.SyntaxKind.PropertyAccessExpression:
        operators.add(".");
        totalOperators++;
        break;

      // Array access operators
      case ts.SyntaxKind.ElementAccessExpression:
        operators.add("[]");
        totalOperators++;
        break;

      // Control flow operators
      case ts.SyntaxKind.IfStatement:
        operators.add("if");
        totalOperators++;
        break;

      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
        operators.add("for");
        totalOperators++;
        break;

      case ts.SyntaxKind.WhileStatement:
        operators.add("while");
        totalOperators++;
        break;

      case ts.SyntaxKind.DoStatement:
        operators.add("do");
        totalOperators++;
        break;

      case ts.SyntaxKind.SwitchStatement:
        operators.add("switch");
        totalOperators++;
        break;

      case ts.SyntaxKind.CaseClause:
        operators.add("case");
        totalOperators++;
        break;

      case ts.SyntaxKind.TryStatement:
        operators.add("try");
        totalOperators++;
        break;

      case ts.SyntaxKind.CatchClause:
        operators.add("catch");
        totalOperators++;
        break;

      case ts.SyntaxKind.ReturnStatement:
        operators.add("return");
        totalOperators++;
        break;

      // Modern JavaScript operators
      case ts.SyntaxKind.ConditionalExpression:
        operators.add("?:");
        totalOperators++;
        break;

      case ts.SyntaxKind.TemplateExpression:
        operators.add("`");
        totalOperators++;
        break;

      case ts.SyntaxKind.SpreadElement:
        operators.add("...");
        totalOperators++;
        break;

      // Identifiers (variables, parameters, etc.)
      case ts.SyntaxKind.Identifier:
        const identifier = node as ts.Identifier;
        // Only count as operand if it's not part of a declaration
        const parent = identifier.parent;
        if (!ts.isVariableDeclaration(parent) || parent.name !== identifier) {
          operands.add(identifier.text);
          totalOperands++;
        }
        break;

      // Literals
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NumericLiteral:
      case ts.SyntaxKind.TrueKeyword:
      case ts.SyntaxKind.FalseKeyword:
      case ts.SyntaxKind.NullKeyword:
      case ts.SyntaxKind.UndefinedKeyword:
        operands.add(node.getText());
        totalOperands++;
        break;

      // Template literals
      case ts.SyntaxKind.TemplateHead:
      case ts.SyntaxKind.TemplateMiddle:
      case ts.SyntaxKind.TemplateTail:
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        operands.add(node.getText());
        totalOperands++;
        break;

      // JSX specific
      case ts.SyntaxKind.JsxElement:
      case ts.SyntaxKind.JsxSelfClosingElement:
        operators.add("jsx");
        totalOperators++;
        break;
    }

    ts.forEachChild(node, visitor);
  };

  visitor(node);

  return {
    n1: operators.size,
    n2: operands.size,
    N1: totalOperators,
    N2: totalOperands,
  };
}

export function computeMaintainabilityIndex(
  halsteadVolume: number,
  cyclomaticComplexity: number,
  linesOfCode: number
): number {
  // Prevent division by zero and invalid calculations
  if (linesOfCode === 0) return 100;
  if (halsteadVolume <= 0) halsteadVolume = 1;
  if (cyclomaticComplexity <= 0) cyclomaticComplexity = 1;

  // Standard maintainability index formula
  let maintainabilityIndex =
    171 -
    5.2 * Math.log(halsteadVolume) -
    0.23 * cyclomaticComplexity -
    16.2 * Math.log(linesOfCode);

  // Normalize to 0-100 scale and ensure reasonable bounds
  maintainabilityIndex = (maintainabilityIndex * 100) / 171;

  return Math.max(
    0,
    Math.min(100, Math.round(maintainabilityIndex * 100) / 100)
  );
}

export function calculateFunctionComplexity(node: ts.Node): number {
  let complexity = 1; // Base complexity

  const incrementComplexity = (node: ts.Node) => {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ConditionalExpression:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
        complexity++;
        break;

      case ts.SyntaxKind.BinaryExpression:
        const binaryExpr = node as ts.BinaryExpression;
        if (
          binaryExpr.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken ||
          binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++;
        }
        break;

      // Additional complexity for modern patterns
      case ts.SyntaxKind.QuestionDotToken:
      case ts.SyntaxKind.QuestionQuestionToken:
        complexity++;
        break;

      // JSX conditional patterns
      case ts.SyntaxKind.JsxExpression:
        const jsxExpression = node as ts.JsxExpression;
        if (jsxExpression.expression) {
          if (
            ts.isBinaryExpression(jsxExpression.expression) &&
            jsxExpression.expression.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken
          ) {
            complexity++;
          } else if (ts.isConditionalExpression(jsxExpression.expression)) {
            complexity++;
          }
        }
        break;
    }

    ts.forEachChild(node, incrementComplexity);
  };

  incrementComplexity(node);
  return complexity;
}
