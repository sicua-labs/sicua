import ts from "typescript";
import { StoreDefinition } from "../../types";

export class StoreAnalysisUtils {
  /**
   * Detects store initialization patterns across different libraries
   */
  static detectStoreInitialization(
    node: ts.CallExpression
  ): {
    type: StoreDefinition["type"] | null;
    name: string | null;
    initializerNode: ts.Node | null;
  } {
    // Check function name for common patterns
    const functionName = this.getStoreFunctionName(node);
    if (!functionName) return { type: null, name: null, initializerNode: null };

    // Redux patterns
    if (
      functionName === "configureStore" ||
      functionName === "createStore" ||
      functionName === "legacy_createStore"
    ) {
      return {
        type: "redux",
        name: this.getStoreDeclarationName(node) || "store",
        initializerNode: node.arguments[0],
      };
    }

    // Zustand patterns
    if (functionName === "create" || functionName === "createStore") {
      return {
        type: "zustand",
        name: this.getStoreDeclarationName(node) || "zustandStore",
        initializerNode: node.arguments[0],
      };
    }

    // Jotai patterns
    if (functionName === "atom" || functionName === "atomWithStorage") {
      return {
        type: "jotai",
        name: this.getStoreDeclarationName(node) || "atom",
        initializerNode: node.arguments[0],
      };
    }

    // Recoil patterns
    if (
      functionName === "atom" ||
      functionName === "atomFamily" ||
      functionName === "selector" ||
      functionName === "selectorFamily"
    ) {
      return {
        type: "recoil",
        name: this.getStoreDeclarationName(node) || "recoilState",
        initializerNode: node.arguments[0],
      };
    }

    return { type: null, name: null, initializerNode: null };
  }

  /**
   * Analyzes hook usage patterns across different state management libraries
   */
  static analyzeHookUsage(node: ts.CallExpression): {
    type: "read" | "write" | "both" | null;
    hookType: StoreDefinition["type"] | null;
    accessor: ts.Node | null;
  } {
    const hookName = this.getHookName(node);
    if (!hookName) return { type: null, hookType: null, accessor: null };

    // Redux hooks
    if (hookName === "useSelector") {
      return { type: "read", hookType: "redux", accessor: node.arguments[0] };
    }
    if (hookName === "useDispatch") {
      return { type: "write", hookType: "redux", accessor: null };
    }

    // Zustand hooks (useStore)
    if (this.isZustandHook(hookName)) {
      return {
        type: "both",
        hookType: "zustand",
        accessor: node.arguments[0],
      };
    }

    // Recoil hooks
    if (hookName === "useRecoilValue") {
      return { type: "read", hookType: "recoil", accessor: node.arguments[0] };
    }
    if (hookName === "useSetRecoilState") {
      return { type: "write", hookType: "recoil", accessor: node.arguments[0] };
    }
    if (hookName === "useRecoilState") {
      return { type: "both", hookType: "recoil", accessor: node.arguments[0] };
    }

    // Jotai hooks
    if (hookName === "useAtomValue") {
      return { type: "read", hookType: "jotai", accessor: node.arguments[0] };
    }
    if (hookName === "useSetAtom") {
      return { type: "write", hookType: "jotai", accessor: node.arguments[0] };
    }
    if (hookName === "useAtom") {
      return { type: "both", hookType: "jotai", accessor: node.arguments[0] };
    }

    return { type: null, hookType: null, accessor: null };
  }

  /**
   * Analyzes state update patterns across different libraries
   */
  static analyzeStateUpdate(
    node: ts.Node
  ): {
    type: "direct" | "functional" | "action" | null;
    updatePattern: string | null;
    affectedProperties: string[];
  } {
    // Direct assignment
    if (ts.isObjectLiteralExpression(node)) {
      return {
        type: "direct",
        updatePattern: node.getText(),
        affectedProperties: this.extractAffectedProperties(node),
      };
    }

    // Functional update
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      return {
        type: "functional",
        updatePattern: this.extractUpdatePattern(node),
        affectedProperties: this.findModifiedProperties(node),
      };
    }

    // Action-based update (Redux-style)
    if (
      ts.isCallExpression(node) &&
      this.isActionDispatch(node)
    ) {
      return {
        type: "action",
        updatePattern: this.extractActionPattern(node),
        affectedProperties: this.findActionAffectedProperties(node),
      };
    }

    return { type: null, updatePattern: null, affectedProperties: [] };
  }

  /**
   * Determines if a hook follows common store hook naming patterns
   */
  static isStoreHook(hookName: string, storeName: string): boolean {
    const normalizedHookName = hookName.toLowerCase();
    const normalizedStoreName = storeName.toLowerCase();
    
    return (
      normalizedHookName === `use${normalizedStoreName}` ||
      normalizedHookName === `use${normalizedStoreName}store` ||
      normalizedHookName === normalizedStoreName ||
      normalizedHookName.startsWith("use") &&
        normalizedHookName.includes(normalizedStoreName.replace("store", ""))
    );
  }

  // Private helper methods
  private static getStoreFunctionName(node: ts.CallExpression): string | null {
    if (ts.isIdentifier(node.expression)) {
      return node.expression.text;
    }
    if (
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.name)
    ) {
      return node.expression.name.text;
    }
    return null;
  }

  private static getStoreDeclarationName(node: ts.Node): string | null {
    if (node.parent && ts.isVariableDeclaration(node.parent)) {
      return node.parent.name.getText();
    }
    return null;
  }

  private static getHookName(node: ts.CallExpression): string | null {
    return ts.isIdentifier(node.expression) ? node.expression.text : null;
  }

  private static isZustandHook(hookName: string): boolean {
    return /^use[A-Z].*Store$/.test(hookName) || /^use[A-Z].*$/.test(hookName);
  }

  private static extractAffectedProperties(
    node: ts.ObjectLiteralExpression
  ): string[] {
    return node.properties
      .filter(ts.isPropertyAssignment)
      .map((prop) => prop.name.getText());
  }

  private static extractUpdatePattern(
    node: ts.FunctionExpression | ts.ArrowFunction
  ): string | null {
    if (ts.isBlock(node.body)) {
      const returnStatement = node.body.statements.find(ts.isReturnStatement);
      return returnStatement?.expression?.getText() || null;
    }
    return node.body.getText();
  }

  private static findModifiedProperties(node: ts.Node): string[] {
    const properties: Set<string> = new Set();

    const visit = (n: ts.Node) => {
      if (
        ts.isPropertyAssignment(n) &&
        n.parent &&
        ts.isObjectLiteralExpression(n.parent)
      ) {
        properties.add(n.name.getText());
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return Array.from(properties);
  }

  private static isActionDispatch(node: ts.CallExpression): boolean {
    return (
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "dispatch" || node.expression.text === "send")
    );
  }

  private static extractActionPattern(node: ts.CallExpression): string | null {
    const arg = node.arguments[0];
    if (arg) {
      return arg.getText();
    }
    return null;
  }

  private static findActionAffectedProperties(
    node: ts.CallExpression
  ): string[] {
    const arg = node.arguments[0];
    if (!arg) return [];

    if (ts.isObjectLiteralExpression(arg)) {
      return this.extractAffectedProperties(arg);
    }

    if (ts.isIdentifier(arg)) {
      // Try to find the action creator definition
      const definition = this.findActionCreatorDefinition(arg);
      if (definition) {
        return this.findModifiedProperties(definition);
      }
    }

    return [];
  }

  private static findActionCreatorDefinition(identifier: ts.Identifier): ts.Node | null {
    // This is a simplified version. In a real implementation,
    // you'd need to traverse the AST to find the actual definition
    return null;
  }
}