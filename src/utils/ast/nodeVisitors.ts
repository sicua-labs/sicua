import ts from "typescript";

export interface VisitorContext {
  sourceFile: ts.SourceFile;
  typeChecker?: ts.TypeChecker;
}

export type NodeVisitor<T> = (
  node: ts.Node,
  context: VisitorContext
) => T | undefined;
export type NodePredicate = (node: ts.Node) => boolean;

export class NodeVisitors {
  /**
   * Creates a visitor that collects nodes matching a predicate
   */
  static createCollector<T extends ts.Node>(
    predicate: (node: ts.Node) => node is T
  ): NodeVisitor<T[]> {
    return (root: ts.Node) => {
      const results: T[] = [];

      function visit(node: ts.Node) {
        if (predicate(node)) {
          results.push(node);
        }
        ts.forEachChild(node, visit);
      }

      visit(root);
      return results;
    };
  }

  /**
   * Creates a visitor that transforms nodes
   */
  static createTransformer<T extends ts.Node>(
    predicate: (node: ts.Node) => node is T,
    transformer: (node: T) => ts.Node
  ): ts.TransformerFactory<ts.Node> {
    return (context: ts.TransformationContext) => {
      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        if (predicate(node)) {
          return transformer(node);
        }
        return ts.visitEachChild(node, visitor, context);
      };
      return (node: ts.Node): ts.Node => {
        const result = ts.visitNode(node, visitor);
        return result || node; // Ensure we always return a Node
      };
    };
  }

  /**
   * Creates a visitor that analyzes dependencies between nodes
   */
  static createDependencyAnalyzer(
    sourceFile: ts.SourceFile
  ): NodeVisitor<Map<string, Set<string>>> {
    const dependencies = new Map<string, Set<string>>();

    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) {
        const symbol = node.text;
        if (!dependencies.has(symbol)) {
          dependencies.set(symbol, new Set());
        }

        // Find references in parent nodes
        let parent = node.parent;
        while (parent) {
          if (ts.isIdentifier(parent)) {
            dependencies.get(symbol)?.add(parent.text);
          }
          parent = parent.parent;
        }
      }
      ts.forEachChild(node, visit);
    };

    return (root: ts.Node) => {
      visit(root);
      return dependencies;
    };
  }

  /**
   * Creates a visitor that builds a control flow graph
   */
  static createControlFlowAnalyzer(
    context: VisitorContext
  ): NodeVisitor<Map<ts.Node, Set<ts.Node>>> {
    const flows = new Map<ts.Node, Set<ts.Node>>();

    const addControlFlow = (from: ts.Node, to: ts.Node): void => {
      if (!flows.has(from)) {
        flows.set(from, new Set());
      }
      flows.get(from)!.add(to);
    };

    const visit = (node: ts.Node): void => {
      if (ts.isIfStatement(node)) {
        addControlFlow(node, node.thenStatement);
        if (node.elseStatement) {
          addControlFlow(node, node.elseStatement);
        }
      }

      if (ts.isWhileStatement(node) || ts.isForStatement(node)) {
        addControlFlow(node, node.statement);
      }

      ts.forEachChild(node, visit);
    };

    return (root: ts.Node) => {
      visit(root);
      return flows;
    };
  }

  /**
   * Helper to add control flow edges
   */
  private static addControlFlow(
    flows: Map<ts.Node, Set<ts.Node>>,
    from: ts.Node,
    to: ts.Node
  ) {
    if (!flows.has(from)) {
      flows.set(from, new Set());
    }
    flows.get(from)!.add(to);
  }

  /**
   * Creates a visitor that analyzes scopes
   */
  static createScopeAnalyzer(
    context: VisitorContext
  ): NodeVisitor<Map<ts.Node, Set<string>>> {
    const scopes = new Map<ts.Node, Set<string>>();

    return (root: ts.Node) => {
      function visit(node: ts.Node) {
        if (ts.isBlock(node) || ts.isFunctionLike(node)) {
          const scope = new Set<string>();
          scopes.set(node, scope);

          // Collect declarations in this scope
          ts.forEachChild(node, (child) => {
            if (
              ts.isVariableDeclaration(child) &&
              ts.isIdentifier(child.name)
            ) {
              scope.add(child.name.text);
            }
          });
        }
        ts.forEachChild(node, visit);
      }

      visit(root);
      return scopes;
    };
  }
}
