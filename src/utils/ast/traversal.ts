import ts from "typescript";
import { isReactComponent } from "./reactSpecific";

/**
 * Traverses AST nodes depth-first
 */
export function traverseAST(
  node: ts.Node,
  callback: (node: ts.Node) => void
): void {
  callback(node);
  ts.forEachChild(node, (child) => traverseAST(child, callback));
}

/**
 * Visits each child of a node
 */
export function visitEachChild(
  node: ts.Node,
  visitor: (node: ts.Node) => void
): void {
  ts.forEachChild(node, visitor);
}

/**
 * Walks all descendant nodes
 */
export function walkDescendants(
  node: ts.Node,
  predicate?: (node: ts.Node) => boolean
): ts.Node[] {
  const results: ts.Node[] = [];

  const walk = (current: ts.Node) => {
    if (!predicate || predicate(current)) {
      results.push(current);
    }
    ts.forEachChild(current, walk);
  };

  ts.forEachChild(node, walk);
  return results;
}

/**
 * Traverses with context information
 */
export function traverseWithContext<T>(
  node: ts.Node,
  visitor: (node: ts.Node, context: T) => void,
  context: T
): void {
  visitor(node, context);
  ts.forEachChild(node, (child) =>
    traverseWithContext(child, visitor, context)
  );
}

/**
 * Visits nodes of specific kind
 */
export function visitNodesOfKind<T extends ts.Node>(
  node: ts.Node,
  kind: ts.SyntaxKind,
  visitor: (node: T) => void
): void {
  if (node.kind === kind) {
    visitor(node as T);
  }
  ts.forEachChild(node, (child) => visitNodesOfKind(child, kind, visitor));
}

/**
 * Traverses depth-first with early exit
 */
export function traverseDepthFirst(
  node: ts.Node,
  visitor: (node: ts.Node) => boolean | void
): boolean {
  const shouldContinue = visitor(node);
  if (shouldContinue === false) {
    return false;
  }

  let continueTraversal = true;
  ts.forEachChild(node, (child) => {
    if (continueTraversal) {
      continueTraversal = traverseDepthFirst(child, visitor) !== false;
    }
  });

  return continueTraversal;
}

/**
 * Traverses breadth-first
 */
export function traverseBreadthFirst(
  node: ts.Node,
  visitor: (node: ts.Node) => void
): void {
  const queue: ts.Node[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    visitor(current);
    ts.forEachChild(current, (child) => queue.push(child));
  }
}

/**
 * Visits with callback and collects results
 */
export function visitWithCallback<T>(
  node: ts.Node,
  callback: (node: ts.Node) => T | undefined
): T[] {
  const results: T[] = [];

  const visit = (current: ts.Node) => {
    const result = callback(current);
    if (result !== undefined) {
      results.push(result);
    }
    ts.forEachChild(current, visit);
  };

  visit(node);
  return results;
}

/**
 * Builds a path to a node from its ancestors
 */
export function getNodePath(node: ts.Node): ts.Node[] {
  const path: ts.Node[] = [];
  let current: ts.Node | undefined = node;

  while (current) {
    path.unshift(current);
    current = current.parent;
  }

  return path;
}

/**
 * Gets the containing function-like declaration
 */
export function getContainingFunction(
  node: ts.Node
): ts.FunctionLikeDeclaration | undefined {
  return findNearestParent(node, (n): n is ts.FunctionLikeDeclaration =>
    ts.isFunctionLike(n)
  );
}

/**
 * Gets the containing block scope
 */
export function getContainingBlock(node: ts.Node): ts.Block | undefined {
  return findNearestParent(node, ts.isBlock);
}

/**
 * Gets the source file for a node
 */
export function getSourceFileForNode(
  node: ts.Node,
  sourceFiles: Map<string, ts.SourceFile>
): ts.SourceFile | undefined {
  const fileName = node.getSourceFile()?.fileName;
  return fileName ? sourceFiles.get(fileName) : undefined;
}

/**
 * Gets the parent of a specific kind
 */
export function getParentOfKind<T extends ts.Node>(
  node: ts.Node,
  kind: ts.SyntaxKind
): T | undefined {
  let current: ts.Node | undefined = node.parent;

  while (current) {
    if (current.kind === kind) {
      return current as T;
    }
    current = current.parent;
  }

  return undefined;
}

/**
 * Gets ancestor at a specific level
 */
export function getAncestor(node: ts.Node, level: number): ts.Node | undefined {
  let current: ts.Node | undefined = node;
  let currentLevel = 0;

  while (current && currentLevel < level) {
    current = current.parent;
    currentLevel++;
  }

  return current;
}

/**
 * Navigates to the root node (SourceFile)
 */
export function navigateToRoot(node: ts.Node): ts.SourceFile {
  let current: ts.Node = node;

  while (current.parent) {
    current = current.parent;
  }

  return current as ts.SourceFile;
}

/**
 * Finds sibling nodes
 */
export function findSiblings(node: ts.Node): ts.Node[] {
  const parent = node.parent;
  if (!parent) return [];

  const siblings: ts.Node[] = [];

  ts.forEachChild(parent, (child) => {
    if (child !== node) {
      siblings.push(child);
    }
  });

  return siblings;
}

/**
 * Finds all nodes matching a predicate in a single file
 */
export function findNodes<T extends ts.Node>(
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
 * Finds all nodes matching a specific predicate across all source files
 */
export function findNodesInFiles<T extends ts.Node>(
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
 * Gets the nearest parent matching a predicate
 */
export function findNearestParent<T extends ts.Node>(
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
 * Finds all references to an identifier in a single file
 */
export function findReferences(
  sourceFile: ts.SourceFile,
  identifier: string
): ts.Identifier[] {
  return findNodes(sourceFile, ts.isIdentifier).filter(
    (id) => id.text === identifier
  );
}

/**
 * Finds all references to an identifier across all files
 */
export function findReferencesInFiles(
  sourceFiles: Map<string, ts.SourceFile>,
  identifier: string
): Map<string, ts.Identifier[]> {
  const results = new Map<string, ts.Identifier[]>();

  sourceFiles.forEach((sourceFile, filePath) => {
    const fileResults = findReferences(sourceFile, identifier);
    if (fileResults.length > 0) {
      results.set(filePath, fileResults);
    }
  });

  return results;
}

/**
 * Finds nodes across multiple files with source file context
 */
export function findNodesWithContext<T extends ts.Node>(
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

/**
 * Finds a component node in the source file by name
 */
export function findComponentNode(
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
      result = findComponentNode(child, componentName, typeChecker);
    }
  });
  return result;
}

/**
 * Gets all identifiers used in a node
 */
export function findIdentifiersInFiles(
  sourceFiles: Map<string, ts.SourceFile>
): Map<string, ts.Identifier[]> {
  const results = new Map<string, ts.Identifier[]>();

  sourceFiles.forEach((sourceFile, filePath) => {
    const fileResults = findNodes(sourceFile, ts.isIdentifier);
    if (fileResults.length > 0) {
      results.set(filePath, fileResults);
    }
  });

  return results;
}
