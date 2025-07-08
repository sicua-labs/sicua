import ts from "typescript";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { isReactComponent } from "../../../utils/ast/reactSpecific";

/**
 * Utility functions for finding and analyzing nodes in the TypeScript AST
 */
export class NodeUtils {
  /**
   * Finds a component node in the source file by name
   */
  public static findComponentNode(
    node: ts.Node,
    componentName: string,
    typeChecker: ts.TypeChecker
  ): ts.Node | undefined {
    if (ts.isFunctionDeclaration(node)) {
      // Function declaration component
      if (
        node.name &&
        node.name.text === componentName &&
        isReactComponent(node, typeChecker)
      ) {
        return node;
      }
    } else if (ts.isVariableDeclaration(node)) {
      // Variable declaration (including arrow functions)
      if (ts.isIdentifier(node.name) && node.name.text === componentName) {
        if (node.initializer) {
          if (
            ts.isArrowFunction(node.initializer) ||
            ts.isFunctionExpression(node.initializer)
          ) {
            return node.initializer;
          }
        }
        return node;
      }
    } else if (ts.isExportAssignment(node)) {
      // Export default
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === componentName
      ) {
        return node.expression;
      }
    }

    let result: ts.Node | undefined;
    ts.forEachChild(node, (child) => {
      if (!result) {
        result = NodeUtils.findComponentNode(child, componentName, typeChecker);
      }
    });
    return result;
  }

  /**
   * Extracts state names from an array binding pattern (useState)
   */
  public static extractStateNames(
    declaration: ts.VariableDeclaration
  ): [string, string] {
    try {
      if (!ASTUtils.safeIsArrayBindingPattern(declaration.name)) {
        return ["", ""];
      }

      const elements = declaration.name.elements;
      if (elements.length < 2) return ["", ""];

      const getName = (element: ts.ArrayBindingElement): string => {
        try {
          if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
            return ASTUtils.safeGetNodeText(element.name);
          }
        } catch {
          // Handle any potential errors in accessing node properties
        }
        return "";
      };

      return [getName(elements[0]), getName(elements[1])];
    } catch {
      return ["", ""];
    }
  }

  /**
   * Determines the scope of a node (render, effect, event, or other)
   */
  public static determineScope(
    node: ts.Node
  ): "render" | "effect" | "event" | "other" {
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isJsxElement(current)) return "render";
      if (
        ts.isCallExpression(current) &&
        ts.isIdentifier(current.expression) &&
        current.expression.text.startsWith("use")
      )
        return "effect";
      if (ASTUtils.isEventHandler(current)) return "event";
      current = current.parent;
    }
    return "other";
  }

  /**
   * Finds import statements in a source file
   */
  public static findImports(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];
    ts.forEachChild(sourceFile, (node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        imports.push(node.moduleSpecifier.text);
      }
    });
    return imports;
  }

  /**
   * Finds a conditional expression for a JSX render
   */
  public static findRenderCondition(node: ts.Node): ts.Expression | undefined {
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isConditionalExpression(current)) {
        return current.condition;
      }
      if (ts.isIfStatement(current)) {
        return current.expression;
      }
      if (
        ts.isBinaryExpression(current) &&
        (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          current.operatorToken.kind === ts.SyntaxKind.BarBarToken)
      ) {
        return current;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Finds error states referenced in a condition
   */
  public static findRelatedErrorStates(
    condition: ts.Expression | undefined,
    errorStates: Map<string, any>
  ): string[] {
    if (!condition) return [];

    const relatedStates: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) {
        const name = node.getText();
        if (errorStates.has(name)) {
          relatedStates.push(name);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(condition);
    return [...new Set(relatedStates)];
  }

  /**
   * Checks if a try-catch block contains fallback rendering
   */
  public static detectFallbackRender(catchClause: ts.CatchClause): boolean {
    let hasFallback = false;
    const visit = (node: ts.Node): void => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        hasFallback = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(catchClause);
    return hasFallback;
  }

  /**
   * Checks if a catch clause contains error logging
   */
  public static hasErrorLogging(catchClause: ts.CatchClause): boolean {
    let hasLogging = false;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText();
        if (
          text.includes("console.error") ||
          text.includes("log") ||
          text.includes("report")
        ) {
          hasLogging = true;
          return;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(catchClause);
    return hasLogging;
  }
}
