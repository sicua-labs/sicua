import ts from "typescript";
import { STATE_PATTERNS } from "../../constants/statePatterns";

export class StateAnalysisUtils {
  /**
   * Finds state references within a selector function
   */
  static findStatesInSelector(node: ts.Node): string[] {
    const states: Set<string> = new Set();

    const visit = (n: ts.Node) => {
      if (ts.isPropertyAccessExpression(n)) {
        const statePath = this.buildStatePath(n);
        if (statePath && this.isStateAccess(statePath)) {
          states.add(statePath);
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return Array.from(states);
  }

  /**
   * Extracts action type from various action patterns
   */
  static extractActionType(
    node: ts.Node,
    findActionCreator?: (name: string) => ts.Node | undefined
  ): string | undefined {
    // Handle object literals (e.g., { type: 'ACTION_TYPE' })
    if (ts.isObjectLiteralExpression(node)) {
      const typeProperty = node.properties.find(
        (prop): prop is ts.PropertyAssignment =>
          ts.isPropertyAssignment(prop) &&
          (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) &&
          (prop.name.getText() === "type" || prop.name.getText() === '"type"')
      );

      if (typeProperty) {
        return this.extractTypeFromInitializer(typeProperty.initializer);
      }
    }

    // Handle call expressions (action creators)
    else if (ts.isCallExpression(node)) {
      // Direct string literal type argument
      if (node.typeArguments?.length === 1) {
        const typeArg = node.typeArguments[0];
        if (
          ts.isLiteralTypeNode(typeArg) &&
          ts.isStringLiteral(typeArg.literal)
        ) {
          return typeArg.literal.text;
        }
      }

      // Handle various action creator patterns
      const expression = node.expression;

      // Named action creator: createAction('ACTION_TYPE')
      if (ts.isIdentifier(expression) && findActionCreator) {
        const actionCreator = findActionCreator(expression.text);
        if (actionCreator) {
          return this.extractActionType(actionCreator, findActionCreator);
        }
      }

      // Direct createAction call with string literal
      else if (
        ts.isIdentifier(expression) &&
        ["createAction", "action"].includes(expression.text) &&
        node.arguments.length > 0
      ) {
        const firstArg = node.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          return firstArg.text;
        }
      }
    }

    // Handle string literals and template literals
    else if (ts.isStringLiteral(node)) {
      return node.text;
    } else if (ts.isTemplateExpression(node)) {
      // Handle template literals with static content
      if (node.templateSpans.length === 0) {
        return node.head.text;
      }
    }

    // Handle type aliases and const declarations
    else if (
      ts.isTypeAliasDeclaration(node) &&
      ts.isLiteralTypeNode(node.type)
    ) {
      if (ts.isStringLiteral(node.type.literal)) {
        return node.type.literal.text;
      }
    } else if (ts.isVariableDeclaration(node) && node.initializer) {
      return this.extractTypeFromInitializer(node.initializer);
    }

    return undefined;
  }

  private static extractTypeFromInitializer(
    initializer: ts.Expression
  ): string | undefined {
    // Handle string literals
    if (ts.isStringLiteral(initializer)) {
      return initializer.text;
    }

    // Handle template literals
    else if (ts.isTemplateExpression(initializer)) {
      if (initializer.templateSpans.length === 0) {
        return initializer.head.text;
      }
    }

    // Handle property access (e.g., ActionTypes.UPDATE)
    else if (ts.isPropertyAccessExpression(initializer)) {
      const symbol = ts.isIdentifier(initializer.name)
        ? initializer.name.text
        : undefined;
      if (symbol) {
        return symbol;
      }
    }

    // Handle as expressions
    else if (ts.isAsExpression(initializer)) {
      return this.extractTypeFromInitializer(initializer.expression);
    }

    return undefined;
  }

  // Helper to check if a node is likely an action type
  static isActionType(node: ts.Node): boolean {
    return this.extractActionType(node) !== undefined;
  }

  // Helper to get full action type including namespace if present
  static getFullActionType(node: ts.Node): string | undefined {
    const type = this.extractActionType(node);
    if (!type) return undefined;

    // Handle namespaced actions
    if (ts.isPropertyAccessExpression(node)) {
      const namespace = node.expression.getText();
      return `${namespace}.${type}`;
    }

    return type;
  }

  static buildStatePath(node: ts.PropertyAccessExpression): string {
    const parts: string[] = [];
    let current: ts.Node = node;

    while (ts.isPropertyAccessExpression(current)) {
      parts.unshift(current.name.text);
      current = current.expression;
    }

    if (ts.isIdentifier(current)) {
      parts.unshift(current.text);
    }

    return parts.join(".");
  }

  /* private static isStateAccess(path: string): boolean {
    return path.startsWith("state.") || this.isKnownStatePattern(path);
  } */

  static isStateAccess(
    path: string,
    storeDefinitions?: Map<string, any>
  ): boolean {
    const pathLower = path.toLowerCase();

    // Check common patterns
    if (STATE_PATTERNS.PREFIXES.has(path)) {
      return true;
    }

    // Check store definitions if available
    if (storeDefinitions?.size) {
      const rootPath = path.split('.')[0];
      if (storeDefinitions.has(rootPath)) {
        return true;
      }

      // Check if path includes any known state keys
      for (const store of storeDefinitions.values()) {
        if (store.initialState && 
            Object.keys(store.initialState).some(key => path.includes(key))) {
          return true;
        }
      }
    }

    // Check boolean state patterns
    if (STATE_PATTERNS.BOOLEAN_PREFIXES.has(pathLower.split(/[._]/)[0])) {
      return true;
    }

    // Check for state-related terms
    return STATE_PATTERNS.STATE_TERMS.has(pathLower);
  }

  private static isKnownStatePattern(path: string): boolean {
    // Add common state access patterns here
    const statePatterns = [
      /^(state|store)\./,
      /^(get|select)/,
      /Store$/,
      /State$/,
    ];
    return statePatterns.some((pattern) => pattern.test(path));
  }
}
