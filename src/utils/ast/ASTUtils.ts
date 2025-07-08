import ts from "typescript";
import { isReactComponent } from "./reactSpecific";

export class ASTUtils {
  /**
   * Gets the name of a function-like declaration
   */
  /* static getFunctionName(node: ts.Node | ts.FunctionDeclaration | ts.ArrowFunction): string {} */
  static getFunctionName(
    node: ts.Node | ts.FunctionDeclaration | ts.ArrowFunction
  ): string {
    // Function declaration
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    // Variable declaration (includes arrow functions)
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    // Method declaration
    else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    // Arrow function cases
    if (ts.isArrowFunction(node)) {
      let parent = node.parent;

      // Handle variable declarations
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }

      // Handle property assignments
      if (ts.isPropertyAssignment(parent) && parent.name) {
        if (ts.isIdentifier(parent.name)) {
          return parent.name.text;
        }
        if (ts.isStringLiteral(parent.name)) {
          return parent.name.text;
        }
      }

      // Handle binary expressions (e.g., this.handler = () => {})
      if (ts.isBinaryExpression(parent) && parent.left) {
        if (ts.isPropertyAccessExpression(parent.left)) {
          return parent.left.name.text;
        }
        if (ts.isIdentifier(parent.left)) {
          return parent.left.text;
        }
      }

      // Handle export default arrow function
      if (ts.isExportAssignment(parent) && parent.expression === node) {
        const sourceFile = node.getSourceFile();
        const fileName = sourceFile.fileName;
        const baseName = fileName.split("/").pop()?.split(".")[0];
        return baseName || "DefaultExport";
      }

      // Handle object literal method shorthand
      if (ts.isShorthandPropertyAssignment(parent)) {
        return parent.name.text;
      }
    }
    // Function expression
    else if (ts.isFunctionExpression(node) && node.name) {
      return node.name.text;
    }
    // Property assignment (e.g., exports.Component = ...)
    else if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    // Binary expression (e.g., module.exports = ...)
    else if (
      ts.isBinaryExpression(node) &&
      ts.isPropertyAccessExpression(node.left)
    ) {
      return node.left.name.text;
    }
    // Named exports (e.g., export const MyComponent = ...)
    else if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      const elements = node.exportClause.elements;
      if (elements.length === 1 && ts.isExportSpecifier(elements[0])) {
        return elements[0].name.text;
      }
    }
    // Export assignment (e.g., export = MyComponent)
    else if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
      return node.expression.text;
    }
    // Variable declaration within export declaration
    else if (ts.isVariableStatement(node)) {
      const declarations = node.declarationList.declarations;
      if (declarations.length === 1 && ts.isIdentifier(declarations[0].name)) {
        return declarations[0].name.text;
      }
    }
    // Handle nested function declarations in namespace/module
    else if (ts.isModuleDeclaration(node)) {
      const body = node.body;
      if (body && ts.isModuleBlock(body)) {
        for (const statement of body.statements) {
          const name = this.getFunctionName(statement);
          if (name) return name;
        }
      }
    }

    return "Anonymous Function";
  }

  /**
   * Finds all nodes matching a specific predicate across all source files
   */
  static findNodesInFiles<T extends ts.Node>(
    sourceFiles: Map<string, ts.SourceFile>,
    predicate: (node: ts.Node) => node is T
  ): Map<string, T[]> {
    const results = new Map<string, T[]>();

    sourceFiles.forEach((sourceFile, filePath) => {
      const fileResults: T[] = [];
      function visit(node: ts.Node) {
        if (predicate(node)) {
          fileResults.push(node);
        }
        ts.forEachChild(node, visit);
      }
      visit(sourceFile);
      if (fileResults.length > 0) {
        results.set(filePath, fileResults);
      }
    });

    return results;
  }

  /**
   * Finds all nodes matching a predicate in a single file
   */
  static findNodes<T extends ts.Node>(
    sourceFile: ts.SourceFile,
    predicate: (node: ts.Node) => node is T
  ): T[] {
    const results: T[] = [];

    function visit(node: ts.Node) {
      if (predicate(node)) {
        results.push(node);
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return results;
  }

  /**
   * Gets the location info for a node with source file context
   */
  static getNodeLocation(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): { line: number; column: number } {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );
    return { line, column: character };
  }

  /**
   * Gets the source file for a node
   */
  static getSourceFileForNode(
    node: ts.Node,
    sourceFiles: Map<string, ts.SourceFile>
  ): ts.SourceFile | undefined {
    const fileName = node.getSourceFile()?.fileName;
    return fileName ? sourceFiles.get(fileName) : undefined;
  }

  /**
   * Builds a path to a node from its ancestors
   */
  static getNodePath(node: ts.Node): ts.Node[] {
    const path: ts.Node[] = [];
    let current: ts.Node | undefined = node;

    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    return path;
  }

  /**
   * Gets the nearest parent matching a predicate
   */
  static findNearestParent<T extends ts.Node>(
    node: ts.Node,
    predicate: (node: ts.Node) => node is T
  ): T | undefined {
    let current: ts.Node | undefined = node.parent;

    while (current) {
      if (predicate(current)) {
        return current;
      }
      current = current.parent;
    }

    return undefined;
  }

  /**
   * Finds all references to an identifier across all files
   */
  static findReferencesInFiles(
    sourceFiles: Map<string, ts.SourceFile>,
    identifier: string
  ): Map<string, ts.Identifier[]> {
    const results = new Map<string, ts.Identifier[]>();

    sourceFiles.forEach((sourceFile, filePath) => {
      const fileResults = this.findReferences(sourceFile, identifier);
      if (fileResults.length > 0) {
        results.set(filePath, fileResults);
      }
    });

    return results;
  }

  /**
   * Finds all references to an identifier in a single file
   */
  static findReferences(
    sourceFile: ts.SourceFile,
    identifier: string
  ): ts.Identifier[] {
    return this.findNodes(sourceFile, ts.isIdentifier).filter(
      (id) => id.text === identifier
    );
  }

  /**
   * Gets all containing conditions for a node
   */
  /* static findContainingConditions(node: ts.Node): string[] {
    const conditions: string[] = [];
    let current: ts.Node | undefined = node;

    while (current) {
      if (ts.isIfStatement(current)) {
        conditions.push(current.expression.getText());
      } else if (ts.isConditionalExpression(current)) {
        conditions.push(current.condition.getText());
      } else if (
        ts.isBinaryExpression(current) &&
        (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          current.operatorToken.kind === ts.SyntaxKind.BarBarToken)
      ) {
        conditions.push(current.getText());
      }
      current = current.parent;
    }

    return conditions;
  } */
  static findContainingConditions(node: ts.Node): string[] {
    const conditions: string[] = [];
    let current: ts.Node | undefined = node;

    while (current) {
      // If statement conditions
      if (ts.isIfStatement(current)) {
        conditions.push(current.expression.getText());
      }
      // Ternary expressions
      else if (ts.isConditionalExpression(current)) {
        conditions.push(current.condition.getText());
      }
      // Logical expressions (&& and ||)
      else if (ts.isBinaryExpression(current)) {
        if (
          current.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken ||
          current.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        ) {
          conditions.push(current.getText());
        }
      }
      // JSX conditional rendering
      else if (
        ts.isJsxElement(current) ||
        ts.isJsxSelfClosingElement(current)
      ) {
        const conditionalAttrs = this.findJsxConditionalAttributes(current);
        conditions.push(...conditionalAttrs);
      }
      // Handle switch statements
      else if (ts.isCaseClause(current) || ts.isDefaultClause(current)) {
        const switchStmt = current.parent.parent;
        if (ts.isSwitchStatement(switchStmt)) {
          conditions.push(
            `${switchStmt.expression.getText()} === ${current.getText()}`
          );
        }
      }

      current = current.parent;
    }

    return [...new Set(conditions)]; // Remove duplicates
  }

  private static findJsxConditionalAttributes(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): string[] {
    const conditions: string[] = [];

    // Get attributes based on node type
    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes
      : node.attributes;

    // Process JSX attributes
    attributes.properties.forEach((prop) => {
      if (ts.isJsxAttribute(prop)) {
        // Handle conditional rendering props
        if (
          prop.name.getText() === "hidden" ||
          prop.name.getText() === "disabled" ||
          prop.name.getText() === "show" ||
          prop.name.getText() === "when" ||
          prop.name.getText() === "if"
        ) {
          if (
            prop.initializer &&
            ts.isJsxExpression(prop.initializer) &&
            prop.initializer.expression
          ) {
            conditions.push(prop.initializer.expression.getText());
          }
        }

        // Handle render props with conditions
        if (prop.name.getText().startsWith("render") && prop.initializer) {
          if (
            ts.isJsxExpression(prop.initializer) &&
            prop.initializer.expression
          ) {
            const expression = prop.initializer.expression;
            if (
              ts.isArrowFunction(expression) ||
              ts.isFunctionExpression(expression)
            ) {
              // Look for conditions within the render prop function
              this.findConditionsInFunction(expression).forEach((cond) =>
                conditions.push(cond)
              );
            }
          }
        }
      }
    });

    return conditions;
  }

  private static findConditionsInFunction(
    node: ts.ArrowFunction | ts.FunctionExpression
  ): string[] {
    const conditions: string[] = [];

    const visitor = (node: ts.Node) => {
      if (ts.isIfStatement(node)) {
        conditions.push(node.expression.getText());
      } else if (ts.isConditionalExpression(node)) {
        conditions.push(node.condition.getText());
      } else if (
        ts.isBinaryExpression(node) &&
        (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
      ) {
        conditions.push(node.getText());
      }
      ts.forEachChild(node, visitor);
    };

    ts.forEachChild(node, visitor);
    return conditions;
  }

  /**
   * Gets all identifiers used in a node
   */
  static findIdentifiersInFiles(
    sourceFiles: Map<string, ts.SourceFile>
  ): Map<string, ts.Identifier[]> {
    const results = new Map<string, ts.Identifier[]>();

    sourceFiles.forEach((sourceFile, filePath) => {
      const fileResults = this.findNodes(sourceFile, ts.isIdentifier);
      if (fileResults.length > 0) {
        results.set(filePath, fileResults);
      }
    });

    return results;
  }

  /**
   * Gets the containing function-like declaration
   */
  static getContainingFunction(
    node: ts.Node
  ): ts.FunctionLikeDeclaration | undefined {
    return this.findNearestParent(node, (n): n is ts.FunctionLikeDeclaration =>
      ts.isFunctionLike(n)
    );
  }

  /**
   * Gets the containing block scope
   */
  static getContainingBlock(node: ts.Node): ts.Block | undefined {
    return this.findNearestParent(node, ts.isBlock);
  }

  /**
   * Checks if a node represents a pure expression
   */
  static isPure(node: ts.Expression): boolean {
    if (ts.isLiteralExpression(node)) return true;
    if (ts.isIdentifier(node)) return true;
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.every((e) => ts.isExpression(e) && this.isPure(e));
    }
    if (ts.isObjectLiteralExpression(node)) {
      return node.properties.every(
        (p) => ts.isPropertyAssignment(p) && this.isPure(p.initializer)
      );
    }
    return false;
  }

  /**
   * Finds nodes across multiple files with source file context
   */
  static findNodesWithContext<T extends ts.Node>(
    sourceFiles: Map<string, ts.SourceFile>,
    predicate: (node: ts.Node) => node is T
  ): Array<{ node: T; sourceFile: ts.SourceFile; filePath: string }> {
    const results: Array<{
      node: T;
      sourceFile: ts.SourceFile;
      filePath: string;
    }> = [];

    sourceFiles.forEach((sourceFile, filePath) => {
      function visit(node: ts.Node) {
        if (predicate(node)) {
          results.push({ node, sourceFile, filePath });
        }
        ts.forEachChild(node, visit);
      }
      visit(sourceFile);
    });

    return results;
  }

  static isErrorCreation(node: ts.Node): boolean {
    if (ts.isNewExpression(node)) {
      const className = node.expression.getText();
      return className.includes("Error");
    }
    return false;
  }

  static isPromiseRejection(node: ts.Node): boolean {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      return name === "reject" || name === "Promise.reject";
    }
    return false;
  }

  static isInsideCatchClause(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (ts.isCatchClause(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  static isCustomErrorClass(node: ts.Node): node is ts.ClassDeclaration {
    if (ts.isClassDeclaration(node)) {
      const heritage = node.heritageClauses?.some((clause) =>
        clause.types.some((type) => type.expression.getText().includes("Error"))
      );
      return !!heritage;
    }
    return false;
  }

  static getCustomErrorClassName(
    node: ts.ClassDeclaration
  ): string | undefined {
    return node.name?.text;
  }

  static getFunctionNameFromNode(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    if (ts.isArrowFunction(node)) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
    }
    return "anonymous";
  }

  static safeGetNodeText(node: ts.Node | undefined): string {
    try {
      return node?.getText() ?? "";
    } catch {
      return "";
    }
  }

  static safeIsArrayBindingPattern(
    node: ts.Node | undefined
  ): node is ts.ArrayBindingPattern {
    try {
      return !!node && ts.isArrayBindingPattern(node);
    } catch {
      return false;
    }
  }

  static isTestFile(node: ts.Node): boolean {
    const sourceFile = node.getSourceFile();
    const fileName = sourceFile.fileName.toLowerCase();
    return (
      fileName.includes(".test.") ||
      fileName.includes(".spec.") ||
      fileName.includes("__tests__")
    );
  }

  static isHook(node: ts.Node): node is ts.CallExpression {
    return (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text.startsWith("use") &&
      node.expression.text !== "useState" &&
      node.expression.text !== "useEffect"
    );
  }

  static getHookName(node: ts.CallExpression): string {
    if (ts.isIdentifier(node.expression)) {
      return node.expression.text;
    }
    return "anonymous-hook";
  }

  static isAnalyzableFunction(
    node: ts.Node,
    typeChecker: ts.TypeChecker // Add typeChecker parameter
  ): node is ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction {
    return (
      (ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node)) &&
      !isReactComponent(node, typeChecker) && // Pass typeChecker
      !this.isTestFile(node)
    );
  }

  static isEventHandler(node: ts.Node): boolean {
    return (
      (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      (node.name.text.startsWith("handle") || node.name.text.startsWith("on"))
    );
  }

  static isPromiseRelated(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText();
      return (
        text.includes("Promise") ||
        text.includes("fetch") ||
        text.includes("axios") ||
        text.includes("request") ||
        text.includes("query")
      );
    }
    return false;
  }
}
