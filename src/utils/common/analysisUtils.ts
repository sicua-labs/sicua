import ts from "typescript";
import * as path from "path";
import {
  FallbackElement,
  ErrorBoundary,
  ErrorBoundaryLibraryInfo,
} from "../../types/errorHandling.types";
import { REACT_OPERATIONS } from "../../constants/reactOperations";
import { ComponentRelation } from "../../types";

export function isNodeCommented(
  sourceFile: ts.SourceFile,
  node: ts.Node
): boolean {
  const nodeStart = node.getFullStart();
  const nodeEnd = node.getEnd();
  const sourceText = sourceFile.getFullText();
  const textBeforeNode = sourceText.substring(0, nodeStart);
  const lastNewLineIndex = textBeforeNode.lastIndexOf("\n");
  const lineStart = lastNewLineIndex === -1 ? 0 : lastNewLineIndex + 1;

  if (textBeforeNode.substring(lineStart).trim().startsWith("//")) {
    return true;
  }

  const textAroundNode = sourceText.substring(
    Math.max(0, nodeStart - 2),
    nodeEnd + 2
  );
  if (textAroundNode.startsWith("/*") && textAroundNode.endsWith("*/")) {
    return true;
  }

  return false;
}

export function isLikelyFrontendFunction(
  fileName: string,
  functionName: string
): boolean {
  const frontendIndicators = [
    "component",
    "page",
    "view",
    "screen",
    "reducer",
    "action",
    "store",
    "context",
    "hook",
    "provider",
    "render",
    "styles",
  ];

  const lowerFileName = fileName.toLowerCase();
  const lowerFunctionName = functionName.toLowerCase();

  return frontendIndicators.some(
    (indicator) =>
      lowerFileName.includes(indicator) || lowerFunctionName.includes(indicator)
  );
}

export function isLikelyEventHandler(functionName: string): boolean {
  const eventHandlerPrefixes = ["handle", "on"];
  const lowerFunctionName = functionName.toLowerCase();
  return eventHandlerPrefixes.some((prefix) =>
    lowerFunctionName.startsWith(prefix)
  );
}

export function extractDependencies(node: ts.Node): string[] {
  const dependencies: string[] = [];

  function visit(n: ts.Node) {
    if (ts.isIdentifier(n) && !ts.isPropertyAccessExpression(n.parent)) {
      dependencies.push(n.getText());
    }
    ts.forEachChild(n, visit);
  }

  visit(node);
  return Array.from(new Set(dependencies));
}

export function extractCalledFunctions(node: ts.Node): string[] {
  const calledFunctions: string[] = [];

  function visit(n: ts.Node) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      calledFunctions.push(n.expression.getText());
    }
    ts.forEachChild(n, visit);
  }

  visit(node);
  return Array.from(new Set(calledFunctions));
}

export function hasJsxReturn(node: ts.Node): boolean {
  if (
    ts.isJsxElement(node) ||
    ts.isJsxFragment(node) ||
    ts.isJsxSelfClosingElement(node)
  ) {
    return true;
  }
  if (ts.isReturnStatement(node) && node.expression) {
    return hasJsxReturn(node.expression);
  }
  return node.getChildren().some((child) => hasJsxReturn(child));
}

export function safeNodeText(node: ts.Node | undefined): string {
  if (!node) return "";
  try {
    return node.getText();
  } catch {
    return "";
  }
}

// Helper function to safely serialize JSX elements
export function serializeJsxElement(
  node: ts.JsxElement | ts.JsxSelfClosingElement
): string {
  try {
    return node.getText();
  } catch {
    return "";
  }
}

export interface SerializableFallbackElement
  extends Omit<FallbackElement, "element" | "condition"> {
  element: string;
  condition?: string;
}

export interface SerializableErrorBoundary
  extends Omit<ErrorBoundary, "library"> {
  library: Omit<ErrorBoundaryLibraryInfo, "features"> & {
    features: string[];
  };
}

export const replacer = (key: string, value: any) => {
  if (value instanceof Set) {
    return Array.from(value);
  }
  // Handle TypeScript nodes
  if (key === "element" && value && typeof value.getText === "function") {
    return value.getText();
  }
  if (key === "condition" && value && typeof value.getText === "function") {
    return value.getText();
  }
  return value;
};

export function isSimpleSetter(node: ts.Node): boolean {
  if (!ts.isArrowFunction(node)) {
    return false;
  }

  try {
    // Check if it's a simple setter pattern: (value) => set({ prop: value })
    const body = node.body;
    if (ts.isCallExpression(body)) {
      const callee = body.expression;
      if (ts.isIdentifier(callee) && callee.text === "set") {
        return true;
      }
    }

    // Check if it's a block with a single set statement
    if (ts.isBlock(body) && body.statements.length === 1) {
      const statement = body.statements[0];
      if (ts.isExpressionStatement(statement)) {
        const expr = statement.expression;
        if (ts.isCallExpression(expr)) {
          const callee = expr.expression;
          if (ts.isIdentifier(callee) && callee.text === "set") {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.warn("Error in isSimpleSetter:", error);
    return false;
  }
}

export function usesReactHooks(node: ts.Node): boolean {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const hookNames = [
      "useState",
      "useEffect",
      "useContext",
      "useReducer",
      "useCallback",
      "useMemo",
      "useRef",
    ];
    if (hookNames.includes(node.expression.text)) {
      return true;
    }
  }
  return node.getChildren().some((child) => usesReactHooks(child));
}

export function usesFrontendAPIs(node: ts.Node): boolean {
  if (ts.isPropertyAccessExpression(node)) {
    const frontendAPIs = [
      "localStorage",
      "sessionStorage",
      "document",
      "window",
      "navigator",
      "history",
      "location",
    ];
    if (frontendAPIs.includes(node.expression.getText())) {
      return true;
    }
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const frontendFunctions = [
      "alert",
      "confirm",
      "prompt",
      "setTimeout",
      "setInterval",
      "requestAnimationFrame",
    ];
    if (frontendFunctions.includes(node.expression.text)) {
      return true;
    }
  }
  return node.getChildren().some((child) => usesFrontendAPIs(child));
}

export function usesThisKeyword(node: ts.Node): boolean {
  if (node.kind === ts.SyntaxKind.ThisKeyword) {
    return true;
  }
  return node.getChildren().some((child) => usesThisKeyword(child));
}

export function hasReactSpecificOperations(node: ts.Node): boolean {
  try {
    const nodeText = node.getText().toLowerCase();

    // Early return for simple setters
    if (isSimpleSetter(node)) {
      return true;
    }

    // Get all identifiers in the node
    const identifiers: string[] = [];
    const collectIdentifiers = (n: ts.Node) => {
      if (ts.isIdentifier(n)) {
        identifiers.push(n.text.toLowerCase());
      }
      ts.forEachChild(n, collectIdentifiers);
    };
    collectIdentifiers(node);

    return REACT_OPERATIONS.some(
      (op) => identifiers.includes(op) || nodeText.includes(op)
    );
  } catch (error) {
    console.warn("Error in hasReactSpecificOperations:", error);
    // Default to false if we can't determine
    return false;
  }
}

export function hasReducerPattern(node: ts.Node): boolean {
  let hasSwitchOrIfOnActionType = false;

  const checkActionType = (expr: ts.Node): boolean => {
    if (ts.isPropertyAccessExpression(expr)) {
      return (
        expr.name.text === "type" && expr.expression.getText() === "action"
      );
    }
    return false;
  };

  ts.forEachChild(node, (child) => {
    if (ts.isSwitchStatement(child) && checkActionType(child.expression)) {
      hasSwitchOrIfOnActionType = true;
    }
    if (
      ts.isIfStatement(child) &&
      child.expression &&
      checkActionType(child.expression)
    ) {
      hasSwitchOrIfOnActionType = true;
    }
  });

  return hasSwitchOrIfOnActionType;
}

export function hasStateSpreadPattern(node: ts.Node): boolean {
  let hasSpreadOperator = false;
  let spreadsState = false;

  const visitor = (n: ts.Node) => {
    if (ts.isSpreadElement(n)) {
      hasSpreadOperator = true;
      if (n.expression.getText() === "state") {
        spreadsState = true;
      }
    }
    if (!spreadsState) {
      ts.forEachChild(n, visitor);
    }
  };

  ts.forEachChild(node, visitor);

  return hasSpreadOperator && spreadsState;
}

/**
 * Generate unique component ID combining file path and component name
 */
export function generateComponentId(component: ComponentRelation): string {
  const fileName = path.basename(
    component.fullPath,
    path.extname(component.fullPath)
  );
  return `${fileName}#${component.name}`;
}
