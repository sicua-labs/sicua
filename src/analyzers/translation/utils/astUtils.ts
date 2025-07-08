import ts from "typescript";
import path from "path";
import {
  TranslationHook,
  TranslationCall,
} from "../types/translation.additional";
import { TranslationKey } from "../../../types/translation.types";
import { ASTUtils as CommonASTUtils } from "../../../utils/ast/ASTUtils";

/**
 * Finds all translation hooks in a source file
 * @param sourceFile TypeScript source file
 * @param filePath Path to the source file
 * @returns Array of translation hooks found in the file
 */
export function findTranslationHooksInFile(
  sourceFile: ts.SourceFile,
  filePath: string
): TranslationHook[] {
  const result: TranslationHook[] = [];

  // Visit all nodes in the source file
  const visitNode = (node: ts.Node) => {
    // Look for variable declarations like: const t = useTranslations("Namespace")
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const call = node.initializer;
      const expression = call.expression;

      // Check if it's a useTranslations call
      if (
        ts.isIdentifier(expression) &&
        /^useTranslation[s]?$/.test(expression.text)
      ) {
        let varName: string | undefined;
        let namespace: string | undefined;

        // Get the variable name
        if (ts.isIdentifier(node.name)) {
          varName = node.name.text;
        } else if (ts.isObjectBindingPattern(node.name)) {
          // Handle destructuring: const { t } = useTranslations()
          for (const element of node.name.elements) {
            if (
              ts.isBindingElement(element) &&
              element.name &&
              ts.isIdentifier(element.name)
            ) {
              varName = element.name.text;
              break;
            }
          }
        }

        // Get the namespace
        if (call.arguments.length > 0) {
          const arg = call.arguments[0];
          if (ts.isStringLiteral(arg)) {
            namespace = arg.text;
          }
        }

        if (varName) {
          const componentName = getComponentNameForNode(node, sourceFile);
          result.push({
            varName,
            namespace,
            node,
            componentName,
          });
        }
      }
    }

    ts.forEachChild(node, visitNode);
  };

  visitNode(sourceFile);
  return result;
}

/**
 * Finds all translation calls for a specific hook
 * @param sourceFile TypeScript source file
 * @param hookName The variable name used for translations
 * @returns Array of translation calls
 */
export function findTranslationCalls(
  sourceFile: ts.SourceFile,
  hookName: string
): TranslationCall[] {
  const translations: TranslationCall[] = [];

  // Visit all nodes to find translation function calls
  const visitNode = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      // Direct call: t("key")
      if (ts.isIdentifier(expression) && expression.text === hookName) {
        if (node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            translations.push({
              key: arg.text,
              node,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visitNode);
  };

  visitNode(sourceFile);
  return translations;
}

/**
 * Gets the enclosing component name for a node
 * @param node AST node
 * @param sourceFile Source file containing the node
 * @returns The component name
 */
export function getComponentNameForNode(
  node: ts.Node,
  sourceFile: ts.SourceFile
): string {
  // Try to find the nearest function or class declaration
  let current: ts.Node | undefined = node;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current)
    ) {
      // For function declaration, use the name
      if (ts.isFunctionDeclaration(current) && current.name) {
        return current.name.text;
      }

      // For variable declaration with arrow function, use variable name
      if (
        current.parent &&
        ts.isVariableDeclaration(current.parent) &&
        current.parent.name
      ) {
        if (ts.isIdentifier(current.parent.name)) {
          return current.parent.name.text;
        }
      }
    }

    // For class component
    if (ts.isClassDeclaration(current) && current.name) {
      return current.name.text;
    }

    current = current.parent;
  }

  // If no component name found, use the file name
  return path.basename(sourceFile.fileName, path.extname(sourceFile.fileName));
}

/**
 * Analyzes the usage context of a translation call
 * @param node The call expression node
 * @param componentName The component name
 * @returns The usage context object
 */
export function analyzeUsageContext(
  node: ts.Node,
  componentName: string
): {
  isInJSX: boolean;
  isInConditional: boolean;
  parentComponent: string | undefined;
  isInEventHandler: boolean;
  renderCount: number;
} {
  let isInJSX = false;
  let isInConditional = false;
  let parentComponent: string | undefined = undefined;
  let isInEventHandler = false;
  let renderCount = 0;

  // Find parent JSX
  let current: ts.Node | undefined = node;
  while (current) {
    // Check if in JSX
    if (
      ts.isJsxElement(current) ||
      ts.isJsxAttribute(current) ||
      ts.isJsxExpression(current)
    ) {
      isInJSX = true;
    }

    // Check if in conditional
    if (
      ts.isIfStatement(current) ||
      ts.isConditionalExpression(current) ||
      (ts.isBinaryExpression(current) &&
        (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          current.operatorToken.kind === ts.SyntaxKind.BarBarToken))
    ) {
      isInConditional = true;
    }

    // Check if in event handler
    if (
      ts.isMethodDeclaration(current) &&
      current.name &&
      ts.isIdentifier(current.name) &&
      (current.name.text.startsWith("handle") ||
        current.name.text.startsWith("on"))
    ) {
      isInEventHandler = true;
    }

    // Check if in a different component than the current one
    if (
      (ts.isFunctionDeclaration(current) ||
        ts.isArrowFunction(current) ||
        ts.isFunctionExpression(current)) &&
      current.parent &&
      ts.isVariableDeclaration(current.parent) &&
      current.parent.name &&
      ts.isIdentifier(current.parent.name) &&
      current.parent.name.text !== componentName
    ) {
      parentComponent = current.parent.name.text;
    }

    // Check for render-related method
    if (
      ts.isMethodDeclaration(current) &&
      current.name &&
      ts.isIdentifier(current.name) &&
      current.name.text === "render"
    ) {
      renderCount++;
    }

    current = current.parent;
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
 * Processes a translation key and creates a TranslationKey object
 * @param keyText The translation key text
 * @param namespace The namespace if available
 * @param componentName The component name
 * @param call The call expression node
 * @param sourceFile The source file
 * @param filePath The file path
 * @returns TranslationKey object
 */
export function processTranslationKey(
  keyText: string,
  namespace: string | undefined,
  componentName: string,
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  filePath: string
): TranslationKey {
  const location = CommonASTUtils.getNodeLocation(call, sourceFile);

  // Handle both namespace.key and key formats
  let fullKey: string;
  let keyNamespace = namespace;
  let keyName = keyText;

  if (keyText.includes(".") && !namespace) {
    // Format: t("namespace.key")
    const parts = keyText.split(".");
    keyNamespace = parts[0];
    keyName = parts.slice(1).join(".");
    fullKey = keyText;
  } else if (namespace) {
    // Format: const t = useTranslations("namespace"); t("key")
    fullKey = `${namespace}.${keyText}`;
  } else {
    // No namespace provided
    fullKey = keyText;
  }

  // Get context code
  const contextCode = getContextCode(call, sourceFile);

  // Analyze usage context
  const usageContext = analyzeUsageContext(call, componentName);

  return {
    key: keyName,
    namespace: keyNamespace,
    fullKey,
    location,
    componentName,
    filePath,
    contextCode,
    usageContext,
  };
}

/**
 * Gets context code for a node (line before, current line, line after)
 * @param node The AST node
 * @param sourceFile The source file
 * @returns Object with before, line, and after text
 */
export function getContextCode(
  node: ts.Node,
  sourceFile: ts.SourceFile
): { before: string; line: string; after: string } {
  // Get the line number (0-based from TS API)
  const { line } = CommonASTUtils.getNodeLocation(node, sourceFile);

  // Convert to 1-based for display but access array with 0-based index
  const lineIndex = line; // line is already 0-based from TypeScript API

  const fileLines = sourceFile.text.split("\n");
  const beforeLine = lineIndex > 0 ? fileLines[lineIndex - 1].trim() : "";
  const currentLine = fileLines[lineIndex].trim();
  const afterLine =
    lineIndex + 1 < fileLines.length ? fileLines[lineIndex + 1].trim() : "";

  return {
    before: beforeLine,
    line: currentLine,
    after: afterLine,
  };
}

/**
 * Creates a source file from content
 * @param filePath File path
 * @param content File content
 * @returns TypeScript source file
 */
export function createSourceFile(
  filePath: string,
  content: string
): ts.SourceFile {
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
}

/**
 * Determines if a file is a TypeScript/JavaScript file
 * @param filePath File path
 * @returns Boolean indicating if it's a TS/JS file
 */
export function isTypeScriptFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".js", ".jsx", ".ts", ".tsx"].includes(ext);
}
