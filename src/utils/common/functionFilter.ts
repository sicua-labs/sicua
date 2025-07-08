import ts from "typescript";
import { NodeTypeGuards } from "../ast/nodeTypeGuards";

export class FunctionFilter {
  /**
   * Configuration for function filtering
   */
  private config = {
    // Minimum size thresholds
    minLines: 5,
    minStatements: 3,

    // Complexity indicators
    minCyclomaticComplexity: 2,

    // Function characteristics
    excludedPrefixes: ["get", "set", "handle", "on"],
    excludedSuffixes: ["Handler", "Listener", "Callback"],

    // Size limits
    maxBodyLength: 2000, // characters

    // Patterns that indicate business logic
    businessLogicPatterns: [
      /calculate/i,
      /process/i,
      /validate/i,
      /transform/i,
      /convert/i,
      /analyze/i,
      /format/i,
      /normalize/i,
      /aggregate/i,
      /compute/i,
    ],
  };

  /**
   * Determines if a function should be included in the analysis
   */
  public shouldIncludeFunction(node: ts.Node, functionName: string): boolean {
    // Skip functions with excluded prefixes/suffixes
    if (this.hasExcludedNaming(functionName)) {
      return false;
    }

    if (NodeTypeGuards.isJsxComponent(node)) {
      return false;
    }

    // Get function body text
    const body = this.getFunctionBody(node);
    if (!body) return false;

    // Check minimum size requirements
    if (!this.meetsMinimumSize(body)) {
      return false;
    }

    // Check maximum size limit
    if (body.length > this.config.maxBodyLength) {
      return false;
    }

    // Calculate cyclomatic complexity
    if (!this.hasSignificantComplexity(node)) {
      return false;
    }

    // Check for business logic patterns
    if (this.hasBusinessLogicPatterns(functionName, body)) {
      return true;
    }

    // Check for data processing indicators
    if (this.hasDataProcessingIndicators(body)) {
      return true;
    }

    return false;
  }

  private hasExcludedNaming(functionName: string): boolean {
    const lowerName = functionName.toLowerCase();
    return (
      this.config.excludedPrefixes.some((prefix) =>
        lowerName.startsWith(prefix)
      ) ||
      this.config.excludedSuffixes.some((suffix) =>
        functionName.endsWith(suffix)
      )
    );
  }

  private getFunctionBody(node: ts.Node): string | null {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isArrowFunction(node)
    ) {
      return node.body?.getText() || null;
    }
    return null;
  }

  private meetsMinimumSize(body: string): boolean {
    const lines = body.split("\n").filter((line) => line.trim().length > 0);
    const statements = body.split(";").filter((stmt) => stmt.trim().length > 0);

    return (
      lines.length >= this.config.minLines &&
      statements.length >= this.config.minStatements
    );
  }

  private hasSignificantComplexity(node: ts.Node): boolean {
    let complexity = 1;

    function countComplexity(n: ts.Node) {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
          complexity++;
          break;
        case ts.SyntaxKind.BinaryExpression:
          const binExpr = n as ts.BinaryExpression;
          if (
            binExpr.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken ||
            binExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ) {
            complexity++;
          }
          break;
      }
      ts.forEachChild(n, countComplexity);
    }

    countComplexity(node);
    return complexity >= this.config.minCyclomaticComplexity;
  }

  private hasBusinessLogicPatterns(
    functionName: string,
    body: string
  ): boolean {
    return this.config.businessLogicPatterns.some(
      (pattern) => pattern.test(functionName) || pattern.test(body)
    );
  }

  private hasDataProcessingIndicators(body: string): boolean {
    // Check for array methods that indicate data processing
    const dataProcessingMethods = [
      ".map(",
      ".filter(",
      ".reduce(",
      ".sort(",
      ".some(",
      ".every(",
      ".find(",
    ];

    // Check for mathematical operations
    const mathOperations = ["Math.", "Number(", "parseInt(", "parseFloat("];

    // Check for data transformation indicators
    const dataTransformations = [
      "JSON.parse(",
      "JSON.stringify(",
      "Object.keys(",
      "Object.values(",
      "Object.entries(",
    ];

    return (
      dataProcessingMethods.some((method) => body.includes(method)) ||
      mathOperations.some((op) => body.includes(op)) ||
      dataTransformations.some((transform) => body.includes(transform))
    );
  }
}
