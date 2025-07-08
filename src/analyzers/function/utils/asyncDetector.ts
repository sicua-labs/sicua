import ts from "typescript";

/**
 * Detailed async analysis result
 */
interface AsyncAnalysis {
  isAsync: boolean;
  hasExplicitAsync: boolean;
  returnsPromise: boolean;
  hasAwaitExpressions: boolean;
  hasPromiseCreation: boolean;
  hasPromiseChaining: boolean;
  hasThenCatch: boolean;
  asyncPatterns: string[];
  awaitCount: number;
  promiseMethodsUsed: string[];
}

/**
 * Utility class for detecting async patterns in functions
 */
export class AsyncDetector {
  private typeChecker?: ts.TypeChecker;

  constructor(typeChecker?: ts.TypeChecker) {
    this.typeChecker = typeChecker;
  }

  /**
   * Determines if a function is async (for backward compatibility)
   * @param node The function-like declaration
   * @returns Boolean indicating if the function is async
   */
  isAsync(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    return this.analyzeAsync(node).isAsync;
  }

  /**
   * Performs detailed async analysis
   * @param node The function-like declaration
   * @returns Detailed async analysis result
   */
  analyzeAsync(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): AsyncAnalysis {
    const analysis: AsyncAnalysis = {
      isAsync: false,
      hasExplicitAsync: false,
      returnsPromise: false,
      hasAwaitExpressions: false,
      hasPromiseCreation: false,
      hasPromiseChaining: false,
      hasThenCatch: false,
      asyncPatterns: [],
      awaitCount: 0,
      promiseMethodsUsed: [],
    };

    try {
      // Check for explicit async modifier
      analysis.hasExplicitAsync = this.hasAsyncModifier(node);

      // Check return type for Promise
      analysis.returnsPromise = this.returnsPromiseType(node);

      // Analyze function body for async patterns
      if (node.body) {
        this.analyzeBodyForAsyncPatterns(node.body, analysis);
      }

      // Determine overall async status
      analysis.isAsync =
        analysis.hasExplicitAsync ||
        analysis.returnsPromise ||
        analysis.hasAwaitExpressions ||
        analysis.hasPromiseCreation ||
        analysis.hasPromiseChaining;

      return analysis;
    } catch (error) {
      // Return safe default on error
      return analysis;
    }
  }

  /**
   * Checks if function has explicit async modifier
   */
  private hasAsyncModifier(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    return !!node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
    );
  }

  /**
   * Checks if function returns a Promise type
   */
  private returnsPromiseType(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    try {
      // Check explicit return type annotation
      if (node.type) {
        const typeText = node.type.getText().toLowerCase();
        return this.isPromiseTypeString(typeText);
      }

      // Use type checker if available for inferred types
      if (this.typeChecker) {
        const signature = this.typeChecker.getSignatureFromDeclaration(node);
        if (signature) {
          const returnType =
            this.typeChecker.getReturnTypeOfSignature(signature);
          const typeString = this.typeChecker
            .typeToString(returnType)
            .toLowerCase();
          return this.isPromiseTypeString(typeString);
        }
      }

      // Fallback: analyze return statements
      return this.hasPromiseReturns(node);
    } catch (error) {
      return false;
    }
  }

  /**
   * Analyzes function body for async patterns
   */
  private analyzeBodyForAsyncPatterns(
    body: ts.Node,
    analysis: AsyncAnalysis
  ): void {
    const visit = (node: ts.Node): void => {
      // Check for await expressions
      if (ts.isAwaitExpression(node)) {
        analysis.hasAwaitExpressions = true;
        analysis.awaitCount++;
        analysis.asyncPatterns.push("await expression");
      }

      // Check for Promise constructor calls
      if (ts.isNewExpression(node) && this.isPromiseConstructor(node)) {
        analysis.hasPromiseCreation = true;
        analysis.asyncPatterns.push("Promise constructor");
      }

      // Check for Promise static methods
      if (ts.isCallExpression(node)) {
        const promiseMethod = this.getPromiseStaticMethod(node);
        if (promiseMethod) {
          analysis.hasPromiseCreation = true;
          analysis.promiseMethodsUsed.push(promiseMethod);
          analysis.asyncPatterns.push(`Promise.${promiseMethod}`);
        }

        // Check for .then/.catch/.finally chaining
        const chainMethod = this.getPromiseChainMethod(node);
        if (chainMethod) {
          analysis.hasPromiseChaining = true;
          analysis.hasThenCatch =
            chainMethod === "then" || chainMethod === "catch";
          analysis.promiseMethodsUsed.push(chainMethod);
          analysis.asyncPatterns.push(`.${chainMethod}() chaining`);
        }

        // Check for common async library calls
        const asyncLibraryCall = this.getAsyncLibraryCall(node);
        if (asyncLibraryCall) {
          analysis.asyncPatterns.push(asyncLibraryCall);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(body);
  }

  /**
   * Checks if a type string represents a Promise
   */
  private isPromiseTypeString(typeString: string): boolean {
    const cleanType = typeString.toLowerCase().trim();
    return (
      cleanType.includes("promise<") ||
      cleanType.startsWith("promise") ||
      cleanType.includes("thenable<") ||
      cleanType.includes("awaitable<") ||
      cleanType.includes("promiselike<")
    );
  }

  /**
   * Checks if function has return statements that return Promises
   */
  private hasPromiseReturns(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    if (!node.body) {
      return false;
    }

    // Handle arrow function expression body
    if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
      return this.isPromiseExpression(node.body);
    }

    // Handle block body
    if (ts.isBlock(node.body)) {
      let hasPromiseReturn = false;

      const visit = (node: ts.Node): void => {
        if (ts.isReturnStatement(node) && node.expression) {
          if (this.isPromiseExpression(node.expression)) {
            hasPromiseReturn = true;
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(node.body);
      return hasPromiseReturn;
    }

    return false;
  }

  /**
   * Checks if an expression creates or returns a Promise
   */
  private isPromiseExpression(expression: ts.Expression): boolean {
    // New Promise()
    if (
      ts.isNewExpression(expression) &&
      this.isPromiseConstructor(expression)
    ) {
      return true;
    }

    // Promise.resolve(), Promise.reject(), etc.
    if (
      ts.isCallExpression(expression) &&
      this.getPromiseStaticMethod(expression)
    ) {
      return true;
    }

    // .then/.catch chaining
    if (
      ts.isCallExpression(expression) &&
      this.getPromiseChainMethod(expression)
    ) {
      return true;
    }

    // fetch(), axios(), etc.
    if (
      ts.isCallExpression(expression) &&
      this.getAsyncLibraryCall(expression)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Checks if a call expression is a Promise constructor
   */
  private isPromiseConstructor(node: ts.NewExpression): boolean {
    if (ts.isIdentifier(node.expression)) {
      return node.expression.text === "Promise";
    }
    return false;
  }

  /**
   * Gets Promise static method name if the call is to Promise static method
   */
  private getPromiseStaticMethod(node: ts.CallExpression): string | null {
    if (ts.isPropertyAccessExpression(node.expression)) {
      const object = node.expression.expression;
      const method = node.expression.name;

      if (
        ts.isIdentifier(object) &&
        object.text === "Promise" &&
        ts.isIdentifier(method)
      ) {
        const methodName = method.text;
        const staticMethods = [
          "resolve",
          "reject",
          "all",
          "allSettled",
          "race",
          "any",
        ];
        return staticMethods.includes(methodName) ? methodName : null;
      }
    }
    return null;
  }

  /**
   * Gets Promise chain method name if the call is promise chaining
   */
  private getPromiseChainMethod(node: ts.CallExpression): string | null {
    if (ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name;

      if (ts.isIdentifier(method)) {
        const methodName = method.text;
        const chainMethods = ["then", "catch", "finally"];
        return chainMethods.includes(methodName) ? methodName : null;
      }
    }
    return null;
  }

  /**
   * Identifies common async library calls
   */
  private getAsyncLibraryCall(node: ts.CallExpression): string | null {
    const callText = node.expression.getText().toLowerCase();

    // Common async patterns
    const asyncPatterns = [
      { pattern: "fetch", name: "fetch API" },
      { pattern: "axios", name: "axios request" },
      { pattern: "request", name: "HTTP request" },
      { pattern: "settimeout", name: "setTimeout" },
      { pattern: "setinterval", name: "setInterval" },
      { pattern: "nexttick", name: "process.nextTick" },
      { pattern: "setimmediate", name: "setImmediate" },
      { pattern: "requestanimationframe", name: "requestAnimationFrame" },
      { pattern: "queryselector", name: "DOM query" },
    ];

    for (const { pattern, name } of asyncPatterns) {
      if (callText.includes(pattern)) {
        return name;
      }
    }

    return null;
  }

  /**
   * Checks if function uses async/await pattern
   */
  hasAsyncAwaitPattern(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    return this.hasAsyncModifier(node) && this.hasAwaitInBody(node);
  }

  /**
   * Checks if function uses Promise pattern (then/catch)
   */
  hasPromisePattern(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    const analysis = this.analyzeAsync(node);
    return analysis.hasPromiseChaining && analysis.hasThenCatch;
  }

  /**
   * Checks if function body contains await expressions
   */
  private hasAwaitInBody(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    if (!node.body) {
      return false;
    }

    let hasAwait = false;

    const visit = (node: ts.Node): void => {
      if (ts.isAwaitExpression(node)) {
        hasAwait = true;
        return;
      }
      ts.forEachChild(node, visit);
    };

    visit(node.body);
    return hasAwait;
  }

  /**
   * Gets async complexity score
   */
  getAsyncComplexity(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): number {
    const analysis = this.analyzeAsync(node);
    let complexity = 0;

    if (analysis.hasExplicitAsync) complexity += 1;
    if (analysis.hasAwaitExpressions) complexity += analysis.awaitCount * 0.5;
    if (analysis.hasPromiseCreation) complexity += 1;
    if (analysis.hasPromiseChaining) complexity += 1;

    return Math.round(complexity * 10) / 10;
  }
}
