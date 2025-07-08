import ts from "typescript";
import { TranslationKey } from "../../../types/translation.types";
import { getContextCode } from "../utils/astUtils";

/**
 * Extracts enhanced context information for translation keys
 */
export class ContextExtractor {
  /**
   * Extracts code context for a call expression
   * @param call The call expression node
   * @param sourceFile The source file
   * @returns Code context object
   */
  extractContextForCall(
    call: ts.CallExpression,
    sourceFile: ts.SourceFile
  ): { before: string; line: string; after: string } {
    return getContextCode(call, sourceFile);
  }

  /**
   * Enhances a translation key with additional context information
   * @param key Translation key to enhance
   * @param sourceFile Source file containing the key
   * @returns Enhanced translation key with usage context
   */
  enhanceKeyWithContext(
    key: TranslationKey,
    sourceFile: ts.SourceFile
  ): TranslationKey {
    // Make sure we have context code
    const contextCode =
      key.contextCode ||
      this.extractCodeLinesAround(sourceFile, key.location.line);

    // Extract additional usage context
    const usageContext = this.extractUsageContext(key, sourceFile);

    // Return the enhanced key
    return {
      ...key,
      contextCode,
      usageContext,
    };
  }

  /**
   * Extracts code lines around a specific line
   * @param sourceFile Source file
   * @param lineNumber Line number (1-based)
   * @returns Object with before, current, and after lines
   */
  private extractCodeLinesAround(
    sourceFile: ts.SourceFile,
    lineNumber: number
  ): { before: string; line: string; after: string } {
    const fileLines = sourceFile.text.split("\n");

    // Transform from 0-based (TypeScript API) to 1-based (our line numbers)
    // Since we're already receiving a 1-based line number, we don't need to adjust it
    const lineIndex = lineNumber - 1; // Convert to 0-based index for array access

    const beforeLine = lineIndex > 0 ? fileLines[lineIndex - 1].trim() : "";
    const currentLine = fileLines[lineIndex].trim();
    const afterLine =
      lineIndex < fileLines.length - 1 ? fileLines[lineIndex + 1].trim() : "";

    return {
      before: beforeLine,
      line: currentLine,
      after: afterLine,
    };
  }

  /**
   * Extracts detailed usage context for a translation key
   * @param translationKey Translation key
   * @param sourceFile Source file
   * @returns Enhanced usage context information
   */
  extractUsageContext(
    translationKey: TranslationKey,
    sourceFile: ts.SourceFile
  ): {
    isInJSX: boolean;
    isInConditional: boolean;
    parentComponent: string | undefined;
    isInEventHandler: boolean;
    renderCount: number;
  } {
    let isInJSX = false;
    let isInConditional = false;
    let isInEventHandler = false;
    let parentComponent: string | undefined;
    let renderCount = 0;

    // Find the call expression for this key
    const callNode = this.findCallNode(translationKey, sourceFile);

    if (callNode) {
      // Analyze the call node's context
      const context = this.analyzeNodeContext(callNode, sourceFile);
      isInJSX = context.isInJSX;
      isInConditional = context.isInConditional;
      isInEventHandler = context.isInEventHandler;
      parentComponent = context.parentComponent;
      renderCount = context.renderCount;
    }

    return {
      isInJSX,
      isInConditional,
      parentComponent,
      isInEventHandler,
      renderCount,
    };
  }

  /**
   * Finds the call expression node for a translation key
   * @param translationKey Translation key
   * @param sourceFile Source file
   * @returns Call expression node if found
   */
  private findCallNode(
    translationKey: TranslationKey,
    sourceFile: ts.SourceFile
  ): ts.CallExpression | undefined {
    const findNode = (node: ts.Node): ts.CallExpression | undefined => {
      if (ts.isCallExpression(node)) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          sourceFile,
          node.getStart()
        );

        // Check if this is the node for our translation key
        // Compare both line and column position for accuracy
        if (
          line + 1 === translationKey.location.line &&
          character + 1 === translationKey.location.column &&
          ts.isIdentifier(node.expression) &&
          node.arguments.length > 0 &&
          ts.isStringLiteral(node.arguments[0]) &&
          node.arguments[0].text === translationKey.key
        ) {
          return node;
        }
      }

      for (const child of node.getChildren(sourceFile)) {
        const result = findNode(child);
        if (result) return result;
      }

      return undefined;
    };

    return findNode(sourceFile);
  }

  /**
   * Analyzes the context of a node
   * @param node Node to analyze
   * @param sourceFile Source file
   * @returns Context analysis
   */
  private analyzeNodeContext(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): {
    isInJSX: boolean;
    isInConditional: boolean;
    parentComponent: string | undefined;
    isInEventHandler: boolean;
    renderCount: number;
  } {
    let isInJSX = false;
    let isInConditional = false;
    let isInEventHandler = false;
    let parentComponent: string | undefined;
    let renderCount = 0;

    // Check if the node is inside JSX
    let parent: ts.Node | undefined = node.parent;
    while (parent) {
      // Check for JSX
      if (ts.isJsxExpression(parent)) {
        isInJSX = true;
      }

      // Check for conditional rendering
      if (
        ts.isConditionalExpression(parent) ||
        ts.isIfStatement(parent) ||
        (ts.isBinaryExpression(parent) &&
          (parent.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken ||
            parent.operatorToken.kind === ts.SyntaxKind.BarBarToken))
      ) {
        isInConditional = true;
      }

      // Check for event handlers
      if (ts.isJsxAttribute(parent) && parent.name.getText().startsWith("on")) {
        isInEventHandler = true;
      }

      // Count render function occurrences - Fixed version
      if (
        ts.isMethodDeclaration(parent) &&
        ts.isIdentifier(parent.name) &&
        parent.name.text === "render"
      ) {
        renderCount++;
      } else if (
        ts.isFunctionDeclaration(parent) &&
        parent.name &&
        parent.name.text === "render"
      ) {
        renderCount++;
      } else if (
        ts.isVariableDeclaration(parent) &&
        ts.isIdentifier(parent.name) &&
        parent.name.text === "render"
      ) {
        renderCount++;
      }

      // Find parent component function
      if (
        (ts.isFunctionDeclaration(parent) ||
          ts.isArrowFunction(parent) ||
          ts.isFunctionExpression(parent)) &&
        !parentComponent
      ) {
        // For function declaration, get the name
        if (ts.isFunctionDeclaration(parent) && parent.name) {
          parentComponent = parent.name.text;
        }
        // For variable declaration with arrow function, get variable name
        else if (parent.parent && ts.isVariableDeclaration(parent.parent)) {
          if (ts.isIdentifier(parent.parent.name)) {
            parentComponent = parent.parent.name.text;
          }
        }
      }

      parent = parent.parent;
    }

    return {
      isInJSX,
      isInConditional,
      parentComponent,
      isInEventHandler,
      renderCount,
    };
  }
}
