import ts from "typescript";
import path from "path";
import {
  TranslationHook,
  TranslationCall,
} from "../types/translation.additional";
import { TranslationKey } from "../../../types/translation.types";
import { ASTUtils as CommonASTUtils } from "../../../utils/ast/ASTUtils";

/**
 * React-i18next specific translation call with additional context
 */
export interface ReactI18nextCall extends TranslationCall {
  /** Namespace from options object if present */
  namespaceFromOptions?: string;
  /** Default value from options if present */
  defaultValue?: string;
  /** Whether the key uses namespace prefix (namespace:key) */
  hasNamespacePrefix: boolean;
}

/**
 * Finds all react-i18next translation hooks in a source file
 * @param sourceFile TypeScript source file
 * @param filePath Path to the source file
 * @returns Array of translation hooks found in the file
 */
export function findReactI18nextHooksInFile(
  sourceFile: ts.SourceFile,
  filePath: string
): TranslationHook[] {
  const result: TranslationHook[] = [];

  // Use CommonASTUtils to find all variable declarations
  const variableDeclarations = CommonASTUtils.findNodes(
    sourceFile,
    (node): node is ts.VariableDeclaration => ts.isVariableDeclaration(node)
  );

  for (const node of variableDeclarations) {
    if (node.initializer && ts.isCallExpression(node.initializer)) {
      const call = node.initializer;
      const expression = call.expression;

      // Check if it's a useTranslation call (singular)
      if (ts.isIdentifier(expression) && expression.text === "useTranslation") {
        let varName: string | undefined;
        let namespace: string | undefined;

        // Get the variable name from destructuring: const { t } = useTranslation()
        if (ts.isObjectBindingPattern(node.name)) {
          for (const element of node.name.elements) {
            if (
              ts.isBindingElement(element) &&
              element.name &&
              ts.isIdentifier(element.name) &&
              element.name.text === "t"
            ) {
              varName = element.name.text;
              break;
            }
          }
        }
        // Direct assignment: const t = useTranslation() (less common but possible)
        else if (ts.isIdentifier(node.name)) {
          varName = node.name.text;
        }

        // Get the namespace from the first argument
        if (call.arguments.length > 0) {
          const arg = call.arguments[0];
          if (ts.isStringLiteral(arg)) {
            namespace = arg.text;
          }
          // Handle array of namespaces: useTranslation(['ns1', 'ns2'])
          else if (
            ts.isArrayLiteralExpression(arg) &&
            arg.elements.length > 0
          ) {
            const firstElement = arg.elements[0];
            if (ts.isStringLiteral(firstElement)) {
              namespace = firstElement.text;
            }
          }
        }

        if (varName) {
          const componentName = CommonASTUtils.getFunctionNameFromNode(
            CommonASTUtils.getContainingFunction(node) || node
          );
          result.push({
            varName,
            namespace,
            node,
            componentName,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Finds all react-i18next translation calls for a specific hook
 * @param sourceFile TypeScript source file
 * @param hookName The variable name used for translations (usually 't')
 * @returns Array of react-i18next translation calls
 */
export function findReactI18nextCalls(
  sourceFile: ts.SourceFile,
  hookName: string
): ReactI18nextCall[] {
  const translations: ReactI18nextCall[] = [];

  // Use CommonASTUtils to find all call expressions
  const callExpressions = CommonASTUtils.findNodes(
    sourceFile,
    (node): node is ts.CallExpression => ts.isCallExpression(node)
  );

  for (const node of callExpressions) {
    const expression = node.expression;

    // Direct call: t("key") or t("namespace:key")
    if (ts.isIdentifier(expression) && expression.text === hookName) {
      if (node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          const key = firstArg.text;
          let namespaceFromOptions: string | undefined;
          let defaultValue: string | undefined;
          const hasNamespacePrefix = key.includes(":");

          // Check for options object as second parameter
          if (node.arguments.length > 1) {
            const secondArg = node.arguments[1];
            if (ts.isObjectLiteralExpression(secondArg)) {
              // Look for 'ns' property for namespace
              const nsProperty = secondArg.properties.find(
                (prop) =>
                  ts.isPropertyAssignment(prop) &&
                  ts.isIdentifier(prop.name) &&
                  prop.name.text === "ns" &&
                  ts.isStringLiteral(prop.initializer)
              );
              if (
                nsProperty &&
                ts.isPropertyAssignment(nsProperty) &&
                ts.isStringLiteral(nsProperty.initializer)
              ) {
                namespaceFromOptions = nsProperty.initializer.text;
              }

              // Look for 'defaultValue' property
              const defaultValueProperty = secondArg.properties.find(
                (prop) =>
                  ts.isPropertyAssignment(prop) &&
                  ts.isIdentifier(prop.name) &&
                  prop.name.text === "defaultValue" &&
                  ts.isStringLiteral(prop.initializer)
              );
              if (
                defaultValueProperty &&
                ts.isPropertyAssignment(defaultValueProperty) &&
                ts.isStringLiteral(defaultValueProperty.initializer)
              ) {
                defaultValue = defaultValueProperty.initializer.text;
              }
            }
          }

          translations.push({
            key,
            node,
            namespaceFromOptions,
            defaultValue,
            hasNamespacePrefix,
          });
        }
      }
    }
  }

  return translations;
}

/**
 * Processes a react-i18next translation key and creates a TranslationKey object
 * @param call React-i18next call information
 * @param hookNamespace Namespace from the hook declaration
 * @param componentName The component name
 * @param sourceFile The source file
 * @param filePath The file path
 * @returns TranslationKey object
 */
export function processReactI18nextKey(
  call: ReactI18nextCall,
  hookNamespace: string | undefined,
  componentName: string,
  sourceFile: ts.SourceFile,
  filePath: string
): TranslationKey {
  const location = CommonASTUtils.getNodeLocation(call.node, sourceFile);

  let finalNamespace: string | undefined;
  let keyName: string;
  let fullKey: string;

  // Determine namespace priority: options.ns > namespace:key > hook namespace
  if (call.namespaceFromOptions) {
    finalNamespace = call.namespaceFromOptions;
    keyName = call.key;
    fullKey = `${finalNamespace}.${keyName}`;
  } else if (call.hasNamespacePrefix) {
    const parts = call.key.split(":");
    finalNamespace = parts[0];
    keyName = parts.slice(1).join(":");
    fullKey = `${finalNamespace}.${keyName}`;
  } else if (hookNamespace) {
    finalNamespace = hookNamespace;
    keyName = call.key;
    fullKey = `${finalNamespace}.${keyName}`;
  } else {
    // No namespace, use default 'translation' namespace (react-i18next default)
    finalNamespace = "translation";
    keyName = call.key;
    fullKey = `${finalNamespace}.${keyName}`;
  }

  // Get context code using common utilities
  const contextCode = getContextCode(call.node, sourceFile);

  // Analyze usage context
  const usageContext = analyzeReactI18nextUsageContext(
    call.node,
    componentName
  );

  return {
    key: keyName,
    namespace: finalNamespace,
    fullKey,
    location,
    componentName,
    filePath,
    contextCode,
    usageContext,
  };
}

/**
 * Analyzes the usage context of a react-i18next translation call
 * @param node The call expression node
 * @param componentName The component name
 * @returns The usage context object
 */
export function analyzeReactI18nextUsageContext(
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

  // Use CommonASTUtils to get the node path
  const nodePath = CommonASTUtils.getNodePath(node);

  for (const ancestor of nodePath) {
    // Check if in JSX
    if (
      ts.isJsxElement(ancestor) ||
      ts.isJsxAttribute(ancestor) ||
      ts.isJsxExpression(ancestor)
    ) {
      isInJSX = true;
    }

    // Check conditional expressions using CommonASTUtils
    const conditions = CommonASTUtils.findContainingConditions(node);
    if (conditions.length > 0) {
      isInConditional = true;
    }

    // Check if in event handler (JSX attributes starting with 'on')
    if (
      ts.isJsxAttribute(ancestor) &&
      ancestor.name.getText().startsWith("on")
    ) {
      isInEventHandler = true;
    }

    // Check if in a different component than the current one
    const containingFunction = CommonASTUtils.getContainingFunction(ancestor);
    if (containingFunction) {
      const functionName =
        CommonASTUtils.getFunctionNameFromNode(containingFunction);
      if (functionName !== componentName && functionName !== "anonymous") {
        parentComponent = functionName;
      }
    }

    // Check for render-related method
    if (
      ts.isMethodDeclaration(ancestor) &&
      ancestor.name &&
      ts.isIdentifier(ancestor.name) &&
      ancestor.name.text === "render"
    ) {
      renderCount++;
    }
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
 * Gets context code for a node (line before, current line, line after)
 * @param node The AST node
 * @param sourceFile The source file
 * @returns Object with before, line, and after text
 */
export function getContextCode(
  node: ts.Node,
  sourceFile: ts.SourceFile
): { before: string; line: string; after: string } {
  const { line } = CommonASTUtils.getNodeLocation(node, sourceFile);
  const lineIndex = line;

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
