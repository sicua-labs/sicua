import ts from "typescript";

/**
 * Configuration options for body parsing
 */
interface BodyParsingOptions {
  normalizeWhitespace: boolean;
  removeComments: boolean;
  maxLength: number | null;
  includeLocation: boolean;
}

/**
 * Parsed function body information
 */
interface ParsedFunctionBody {
  body: string;
  isEmpty: boolean;
  isExpression: boolean;
  hasReturnStatements: boolean;
  lineCount: number;
  characterCount: number;
  location?: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
}

/**
 * Utility class for parsing and normalizing function bodies
 */
export class FunctionBodyParser {
  private defaultOptions: BodyParsingOptions = {
    normalizeWhitespace: true,
    removeComments: false,
    maxLength: null,
    includeLocation: false,
  };

  /**
   * Extracts function body as a string (for backward compatibility)
   * @param node The function-like declaration
   * @param options Optional parsing configuration
   * @returns Cleaned function body string
   */
  extractBody(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    options: Partial<BodyParsingOptions> = {}
  ): string {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const parsed = this.extractBodyDetailed(node, mergedOptions);
    return parsed.body;
  }

  /**
   * Extracts detailed function body information
   * @param node The function-like declaration
   * @param options Optional parsing configuration
   * @returns Detailed function body information
   */
  extractBodyDetailed(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    options: Partial<BodyParsingOptions> = {}
  ): ParsedFunctionBody {
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      if (!node.body) {
        return this.createEmptyBody();
      }

      // Handle arrow functions with expression bodies
      if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
        return this.parseExpressionBody(node.body, mergedOptions);
      }

      // Handle block statements
      if (ts.isBlock(node.body)) {
        return this.parseBlockBody(node.body, mergedOptions);
      }

      // Fallback for other body types
      return this.parseGenericBody(node.body, mergedOptions);
    } catch (error) {
      return this.createErrorBody();
    }
  }

  /**
   * Checks if a function has an empty body
   */
  isEmpty(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    if (!node.body) {
      return true;
    }

    if (ts.isBlock(node.body)) {
      return node.body.statements.length === 0;
    }

    // Expression body is never empty
    return false;
  }

  /**
   * Checks if function body is just an expression (arrow function)
   */
  isExpressionBody(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    return (
      ts.isArrowFunction(node) &&
      node.body !== undefined &&
      !ts.isBlock(node.body)
    );
  }

  /**
   * Counts return statements in a function body
   */
  countReturnStatements(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): number {
    if (!node.body) {
      return 0;
    }

    // Expression body has implicit return
    if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
      return 1;
    }

    if (ts.isBlock(node.body)) {
      return this.countReturnsInBlock(node.body);
    }

    return 0;
  }

  /**
   * Gets the complexity score of a function body
   */
  getBodyComplexity(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): number {
    if (!node.body) {
      return 0;
    }

    let complexity = 1; // Base complexity

    if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
      // Expression body - add complexity based on expression type
      complexity += this.getExpressionComplexity(node.body);
    } else if (ts.isBlock(node.body)) {
      // Block body - traverse and count complexity
      complexity += this.getBlockComplexity(node.body);
    }

    return complexity;
  }

  /**
   * Parses expression body (arrow function without braces)
   */
  private parseExpressionBody(
    expression: ts.Expression,
    options: BodyParsingOptions
  ): ParsedFunctionBody {
    const rawText = expression.getText();
    const processedBody = this.processBodyText(rawText, options);

    return {
      body: processedBody,
      isEmpty: false,
      isExpression: true,
      hasReturnStatements: true, // Expression body has implicit return
      lineCount: this.countLines(processedBody),
      characterCount: processedBody.length,
      location: options.includeLocation
        ? this.getLocation(expression)
        : undefined,
    };
  }

  /**
   * Parses block body (function with braces)
   */
  private parseBlockBody(
    block: ts.Block,
    options: BodyParsingOptions
  ): ParsedFunctionBody {
    const rawText = block.getText();
    const processedBody = this.processBodyText(rawText, options);

    return {
      body: processedBody,
      isEmpty: block.statements.length === 0,
      isExpression: false,
      hasReturnStatements: this.countReturnsInBlock(block) > 0,
      lineCount: this.countLines(processedBody),
      characterCount: processedBody.length,
      location: options.includeLocation ? this.getLocation(block) : undefined,
    };
  }

  /**
   * Parses generic body types
   */
  private parseGenericBody(
    body: ts.Node,
    options: BodyParsingOptions
  ): ParsedFunctionBody {
    const rawText = body.getText();
    const processedBody = this.processBodyText(rawText, options);

    return {
      body: processedBody,
      isEmpty: rawText.trim().length === 0,
      isExpression: false,
      hasReturnStatements: false,
      lineCount: this.countLines(processedBody),
      characterCount: processedBody.length,
      location: options.includeLocation ? this.getLocation(body) : undefined,
    };
  }

  /**
   * Processes raw body text according to options
   */
  private processBodyText(text: string, options: BodyParsingOptions): string {
    let processed = text;

    // Remove comments if requested
    if (options.removeComments) {
      processed = this.removeComments(processed);
    }

    // Normalize whitespace if requested
    if (options.normalizeWhitespace) {
      processed = this.normalizeWhitespace(processed);
    }

    // Truncate if max length specified
    if (options.maxLength && processed.length > options.maxLength) {
      processed = processed.substring(0, options.maxLength) + "...";
    }

    return processed.trim();
  }

  /**
   * Normalizes whitespace in code while preserving indentation
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\t/g, "  ") // Convert tabs to spaces
      .replace(/[ \t]+$/gm, "") // Remove trailing whitespace from each line
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive empty lines to max 2
      .trim();
  }

  /**
   * Removes comments from code (basic implementation)
   */
  private removeComments(text: string): string {
    // Remove single-line comments
    text = text.replace(/\/\/.*$/gm, "");
    // Remove multi-line comments
    text = text.replace(/\/\*[\s\S]*?\*\//g, "");
    return text;
  }

  /**
   * Counts lines in text
   */
  private countLines(text: string): number {
    return text.split("\n").length;
  }

  /**
   * Gets location information for a node
   */
  private getLocation(node: ts.Node): {
    start: number;
    end: number;
    line: number;
    column: number;
  } {
    const sourceFile = node.getSourceFile();
    const start = node.getStart();
    const end = node.getEnd();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);

    return {
      start,
      end,
      line: line + 1, // Convert to 1-based
      column: character + 1, // Convert to 1-based
    };
  }

  /**
   * Counts return statements in a block
   */
  private countReturnsInBlock(block: ts.Block): number {
    let count = 0;

    const visit = (node: ts.Node): void => {
      if (ts.isReturnStatement(node)) {
        count++;
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(block, visit);
    return count;
  }

  /**
   * Gets complexity score for an expression
   */
  private getExpressionComplexity(expression: ts.Expression): number {
    let complexity = 0;

    const visit = (node: ts.Node): void => {
      if (ts.isConditionalExpression(node)) {
        complexity += 1;
      } else if (ts.isBinaryExpression(node)) {
        if (
          node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          node.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity += 1;
        }
      } else if (ts.isCallExpression(node)) {
        complexity += 0.5;
      }
      ts.forEachChild(node, visit);
    };

    visit(expression);
    return Math.round(complexity * 10) / 10;
  }

  /**
   * Gets complexity score for a block
   */
  private getBlockComplexity(block: ts.Block): number {
    let complexity = 0;

    const visit = (node: ts.Node): void => {
      if (
        ts.isIfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isSwitchStatement(node) ||
        ts.isCaseClause(node) ||
        ts.isTryStatement(node) ||
        ts.isCatchClause(node)
      ) {
        complexity += 1;
      } else if (ts.isConditionalExpression(node)) {
        complexity += 1;
      } else if (ts.isBinaryExpression(node)) {
        if (
          node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          node.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity += 1;
        }
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(block, visit);
    return complexity;
  }

  /**
   * Creates empty body result
   */
  private createEmptyBody(): ParsedFunctionBody {
    return {
      body: "",
      isEmpty: true,
      isExpression: false,
      hasReturnStatements: false,
      lineCount: 0,
      characterCount: 0,
    };
  }

  /**
   * Creates error fallback body result
   */
  private createErrorBody(): ParsedFunctionBody {
    return {
      body: "// Error parsing function body",
      isEmpty: false,
      isExpression: false,
      hasReturnStatements: false,
      lineCount: 1,
      characterCount: 30,
    };
  }
}
