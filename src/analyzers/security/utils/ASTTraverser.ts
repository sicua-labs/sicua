/**
 * AST traversal utilities for security vulnerability detection
 */

import ts from "typescript";
import {
  ASTPattern,
  ASTNodeConditions,
  PatternMatch,
} from "../types/pattern.types";
import {
  DEV_CONTEXT_PATTERNS,
  TEST_FILE_INDICATORS,
  UI_PATTERNS,
} from "../constants/general.constants";
import { SECURITY_PATTERNS } from "../constants/security.constants";

export class ASTTraverser {
  /**
   * Find all nodes of a specific kind in a source file
   */
  static findNodesByKind<T extends ts.Node>(
    sourceFile: ts.SourceFile,
    kind: ts.SyntaxKind,
    predicate?: (node: T) => boolean
  ): T[] {
    const results: T[] = [];

    function visit(node: ts.Node) {
      if (node.kind === kind) {
        const typedNode = node as T;
        if (!predicate || predicate(typedNode)) {
          results.push(typedNode);
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return results;
  }

  static findNodesByKindInNode<T extends ts.Node>(
    node: ts.Node,
    kind: ts.SyntaxKind,
    predicate?: (node: T) => boolean
  ): T[] {
    const results: T[] = [];

    function visit(currentNode: ts.Node) {
      if (currentNode.kind === kind) {
        const typedNode = currentNode as T;
        if (!predicate || predicate(typedNode)) {
          results.push(typedNode);
        }
      }
      ts.forEachChild(currentNode, visit);
    }

    visit(node);
    return results;
  }

  /**
   * Find the nearest parent node that matches a given predicate
   */
  static findNearestParent<T extends ts.Node>(
    node: ts.Node,
    predicate: (node: ts.Node) => node is T
  ): T | undefined {
    let current = node.parent;

    while (current) {
      if (predicate(current)) {
        return current;
      }
      current = current.parent;
    }

    return undefined;
  }

  /**
   * Find nodes matching AST pattern conditions
   */
  static findNodesMatchingPattern(
    sourceFile: ts.SourceFile,
    pattern: ASTPattern
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const targetKind = this.getNodeKindFromType(pattern.nodeType);

    if (!targetKind) {
      return matches;
    }

    const self = this;
    function visit(node: ts.Node) {
      if (node.kind === targetKind) {
        if (
          !pattern.conditions ||
          self.matchesConditions(node, pattern.conditions)
        ) {
          const location = self.getNodeLocation(node, sourceFile);
          const nodeText = self.getNodeText(node, sourceFile);

          matches.push({
            match: nodeText,
            startIndex: node.getStart(sourceFile),
            endIndex: node.getEnd(),
            line: location.line,
            column: location.column,
            context: self.getNodeContext(node, sourceFile),
          });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return matches;
  }

  /**
   * Check if a node matches the specified conditions
   */
  private static matchesConditions(
    node: ts.Node,
    conditions: ASTNodeConditions
  ): boolean {
    // Check parent type condition
    if (conditions.parentType && node.parent) {
      const expectedParentKind = this.getNodeKindFromType(
        conditions.parentType
      );
      if (expectedParentKind && node.parent.kind !== expectedParentKind) {
        return false;
      }
    }

    // Check child node condition
    if (conditions.hasChild) {
      const expectedChildKind = this.getNodeKindFromType(conditions.hasChild);
      if (expectedChildKind) {
        let hasExpectedChild = false;
        ts.forEachChild(node, (child) => {
          if (child.kind === expectedChildKind) {
            hasExpectedChild = true;
          }
        });
        if (!hasExpectedChild) {
          return false;
        }
      }
    }

    // Check property conditions
    if (conditions.properties) {
      for (const [prop, expectedValue] of Object.entries(
        conditions.properties
      )) {
        const actualValue = (node as any)[prop];
        if (actualValue !== expectedValue) {
          return false;
        }
      }
    }

    // Check custom validator
    if (conditions.customValidator) {
      return conditions.customValidator(node);
    }

    return true;
  }

  /**
   * Get TypeScript SyntaxKind from string type
   */
  private static getNodeKindFromType(
    nodeType: string
  ): ts.SyntaxKind | undefined {
    const kindMap: Record<string, ts.SyntaxKind> = {
      CallExpression: ts.SyntaxKind.CallExpression,
      MemberExpression: ts.SyntaxKind.PropertyAccessExpression,
      StringLiteral: ts.SyntaxKind.StringLiteral,
      Identifier: ts.SyntaxKind.Identifier,
      PropertyAccessExpression: ts.SyntaxKind.PropertyAccessExpression,
      VariableDeclaration: ts.SyntaxKind.VariableDeclaration,
      JSXElement: ts.SyntaxKind.JsxElement,
      JSXAttribute: ts.SyntaxKind.JsxAttribute,
    };

    return kindMap[nodeType];
  }

  /**
   * Get the line and column position of a node
   */
  static getNodeLocation(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): { line: number; column: number } {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile)
    );
    return { line: line + 1, column: character + 1 };
  }

  /**
   * Get the text content of a node
   */
  static getNodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
    return node.getText(sourceFile);
  }

  /**
   * Get surrounding context for a node
   */
  static getNodeContext(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    contextLines: number = 3
  ): string {
    const startPos = node.getStart(sourceFile);
    const fullText = sourceFile.getFullText();

    const startLocation = sourceFile.getLineAndCharacterOfPosition(startPos);
    const lines = fullText.split("\n");

    const startLine = Math.max(0, startLocation.line - contextLines);
    const endLine = Math.min(
      lines.length - 1,
      startLocation.line + contextLines
    );

    return lines.slice(startLine, endLine + 1).join("\n");
  }

  /**
   * Find all call expressions with a specific function name
   */
  static findCallExpressions(
    sourceFile: ts.SourceFile,
    functionName: string
  ): ts.CallExpression[] {
    return this.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        if (ts.isIdentifier(node.expression)) {
          return node.expression.text === functionName;
        }
        if (ts.isPropertyAccessExpression(node.expression)) {
          return (
            ts.isIdentifier(node.expression.name) &&
            node.expression.name.text === functionName
          );
        }
        return false;
      }
    );
  }

  /**
   * Find all string literals containing a specific pattern
   */
  static findStringLiteralsWithPattern(
    sourceFile: ts.SourceFile,
    pattern: RegExp
  ): ts.StringLiteral[] {
    return this.findNodesByKind<ts.StringLiteral>(
      sourceFile,
      ts.SyntaxKind.StringLiteral,
      (node) => pattern.test(node.text)
    );
  }

  /**
   * Find all property access expressions (e.g., obj.prop)
   */
  static findPropertyAccess(
    sourceFile: ts.SourceFile,
    objectName?: string,
    propertyName?: string
  ): ts.PropertyAccessExpression[] {
    return this.findNodesByKind<ts.PropertyAccessExpression>(
      sourceFile,
      ts.SyntaxKind.PropertyAccessExpression,
      (node) => {
        let matches = true;

        if (objectName && ts.isIdentifier(node.expression)) {
          matches = matches && node.expression.text === objectName;
        }

        if (propertyName && ts.isIdentifier(node.name)) {
          matches = matches && node.name.text === propertyName;
        }

        return matches;
      }
    );
  }

  /**
   * Find all JSX elements with specific tag names
   */
  static findJSXElements(
    sourceFile: ts.SourceFile,
    tagName?: string
  ): (ts.JsxElement | ts.JsxSelfClosingElement)[] {
    const results: (ts.JsxElement | ts.JsxSelfClosingElement)[] = [];

    // Find JsxElement nodes
    const jsxElements = this.findNodesByKind<ts.JsxElement>(
      sourceFile,
      ts.SyntaxKind.JsxElement,
      tagName
        ? (node) => {
            const openingElement = node.openingElement;
            if (ts.isIdentifier(openingElement.tagName)) {
              return openingElement.tagName.text === tagName;
            }
            return false;
          }
        : undefined
    );

    // Find JsxSelfClosingElement nodes
    const jsxSelfClosing = this.findNodesByKind<ts.JsxSelfClosingElement>(
      sourceFile,
      ts.SyntaxKind.JsxSelfClosingElement,
      tagName
        ? (node) => {
            if (ts.isIdentifier(node.tagName)) {
              return node.tagName.text === tagName;
            }
            return false;
          }
        : undefined
    );

    return [...jsxElements, ...jsxSelfClosing];
  }

  /**
   * Check if a node is inside a specific function
   */
  static isNodeInFunction(node: ts.Node, functionName: string): boolean {
    let parent = node.parent;

    while (parent) {
      if (
        ts.isFunctionDeclaration(parent) &&
        parent.name?.text === functionName
      ) {
        return true;
      }
      if (
        ts.isVariableDeclaration(parent) &&
        ts.isIdentifier(parent.name) &&
        parent.name.text === functionName &&
        parent.initializer &&
        (ts.isFunctionExpression(parent.initializer) ||
          ts.isArrowFunction(parent.initializer))
      ) {
        return true;
      }
      parent = parent.parent;
    }

    return false;
  }

  /**
   * Extract string value from various node types
   */
  static extractStringValue(node: ts.Node): string | null {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    if (ts.isTemplateExpression(node)) {
      // For template expressions, try to extract static parts
      let result = node.head.text;
      for (const span of node.templateSpans) {
        if (
          ts.isStringLiteral(span.literal) ||
          ts.isNoSubstitutionTemplateLiteral(span.literal)
        ) {
          result += span.getText();
        } else {
          return null; // Can't extract if it has dynamic parts
        }
      }
      return result;
    }
    return null;
  }

  /**
   * Check if a node is within a specific type of function context
   */
  static isInFunctionWithPattern(node: ts.Node, patterns: RegExp[]): boolean {
    let current = node.parent;

    while (current) {
      let functionName: string | undefined;

      if (ts.isFunctionDeclaration(current) && current.name) {
        functionName = current.name.text;
      } else if (
        ts.isMethodDeclaration(current) &&
        ts.isIdentifier(current.name)
      ) {
        functionName = current.name.text;
      } else if (
        ts.isVariableDeclaration(current) &&
        ts.isIdentifier(current.name) &&
        current.initializer &&
        (ts.isFunctionExpression(current.initializer) ||
          ts.isArrowFunction(current.initializer))
      ) {
        functionName = current.name.text;
      }

      if (functionName) {
        const lowerName = functionName.toLowerCase();
        if (patterns.some((pattern) => pattern.test(lowerName))) {
          return true;
        }
      }

      current = current.parent;
    }

    return false;
  }

  /**
   * Get variable assignment context for better analysis
   */
  static getVariableAssignmentContext(node: ts.Node): {
    variableName?: string;
    isInFunction?: string;
    assignmentType:
      | "declaration"
      | "assignment"
      | "property"
      | "parameter"
      | "none";
  } {
    let current = node.parent;

    while (current) {
      // Variable declaration
      if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
        return {
          variableName: current.name.text,
          assignmentType: "declaration",
          isInFunction: this.findNearestFunctionName(current),
        };
      }

      // Assignment expression
      if (
        ts.isBinaryExpression(current) &&
        current.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(current.left)
      ) {
        return {
          variableName: current.left.text,
          assignmentType: "assignment",
          isInFunction: this.findNearestFunctionName(current),
        };
      }

      // Property assignment
      if (ts.isPropertyAssignment(current) && ts.isIdentifier(current.name)) {
        return {
          variableName: current.name.text,
          assignmentType: "property",
          isInFunction: this.findNearestFunctionName(current),
        };
      }

      // Function parameter
      if (ts.isParameter(current) && ts.isIdentifier(current.name)) {
        return {
          variableName: current.name.text,
          assignmentType: "parameter",
          isInFunction: this.findNearestFunctionName(current),
        };
      }

      current = current.parent;
    }

    return { assignmentType: "none" };
  }

  /**
   * Find the nearest function name for context
   */
  private static findNearestFunctionName(node: ts.Node): string | undefined {
    let current = node.parent;

    while (current) {
      if (ts.isFunctionDeclaration(current) && current.name) {
        return current.name.text;
      }
      if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
        return current.name.text;
      }
      if (
        ts.isVariableDeclaration(current) &&
        ts.isIdentifier(current.name) &&
        current.initializer &&
        (ts.isFunctionExpression(current.initializer) ||
          ts.isArrowFunction(current.initializer))
      ) {
        return current.name.text;
      }
      current = current.parent;
    }

    return undefined;
  }

  /**
   * Check if a node is in a test or development context
   */
  static isInTestOrDevContext(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): boolean {
    const filePath = sourceFile.fileName;

    // Check file path indicators

    if (
      TEST_FILE_INDICATORS.some((indicator) => filePath.includes(indicator))
    ) {
      return true;
    }

    // Check surrounding context
    const context = this.getNodeContext(node, sourceFile, 5);
    const lowerContext = context.toLowerCase();

    return DEV_CONTEXT_PATTERNS.some((pattern) => pattern.test(lowerContext));
  }

  /**
   * Enhanced context extraction with better semantic understanding
   */
  static getSemanticContext(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): {
    isUIContext: boolean;
    isSecurityContext: boolean;
    isTestContext: boolean;
    functionContext?: string;
    variableContext?: string;
  } {
    const context = this.getNodeContext(node, sourceFile, 3);
    const lowerContext = context.toLowerCase();

    const variableAssignment = this.getVariableAssignmentContext(node);
    const functionName = this.findNearestFunctionName(node);

    return {
      isUIContext: UI_PATTERNS.some((pattern) => pattern.test(lowerContext)),
      isSecurityContext: SECURITY_PATTERNS.some((pattern) =>
        pattern.test(lowerContext)
      ),
      isTestContext: this.isInTestOrDevContext(node, sourceFile),
      functionContext: functionName,
      variableContext: variableAssignment.variableName,
    };
  }
}
