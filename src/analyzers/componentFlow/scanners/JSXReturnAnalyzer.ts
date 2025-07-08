import * as t from "@babel/types";
import traverse, { NodePath } from "@babel/traverse";
import { ConditionalParser } from "../parsers/ConditionalParser";
import {
  JSXReturnStatement,
  ComponentFlowConfig,
  HTMLElementReference,
} from "../types";
import {
  extractComponentReferencesFromNode,
  extractHTMLElementReferencesFromNode,
  getCodePosition,
  nodeContainsJSX,
} from "../utils";
import {
  containsJSX,
  isReactComponentBabel,
} from "../../../utils/ast/reactSpecific";

/**
 * Analyzer for JSX return statements and their conditional rendering patterns
 */
export class JSXReturnAnalyzer {
  private conditionalParser: ConditionalParser;
  private config: ComponentFlowConfig;

  constructor(config?: ComponentFlowConfig) {
    this.config = config || {
      maxDepth: 10,
      includeExternalComponents: true,
      excludePatterns: [],
      onlyAnalyzeRoutes: [],
      includeHtmlElements: false,
      htmlElementFilter: {
        includeAll: false,
        includeTags: [],
        excludeTags: [],
        captureTextContent: false,
        maxTextLength: 100,
      },
    };

    this.conditionalParser = new ConditionalParser(this.config);
  }

  /**
   * Analyzes all return statements in an AST for JSX content and conditional patterns
   */
  analyzeAST(ast: t.File, sourceCode: string): JSXReturnStatement[] {
    const returnStatements: JSXReturnStatement[] = [];

    traverse(ast, {
      // Look for function components (function declarations and arrow functions)
      FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => {
        // Only analyze React components (functions that return JSX)
        if (isReactComponentBabel(path.node)) {
          const functionReturns = this.analyzeFunctionNode(
            path.node,
            sourceCode
          );
          returnStatements.push(...functionReturns);
        }
      },

      // Arrow function expressions assigned to variables (const Component = () => {})
      VariableDeclarator: (path: NodePath<t.VariableDeclarator>) => {
        if (t.isArrowFunctionExpression(path.node.init)) {
          if (isReactComponentBabel(path.node.init)) {
            const functionReturns = this.analyzeFunctionNode(
              path.node.init,
              sourceCode
            );
            returnStatements.push(...functionReturns);
          }
        }
      },

      // Export default arrow functions
      ExportDefaultDeclaration: (
        path: NodePath<t.ExportDefaultDeclaration>
      ) => {
        if (t.isArrowFunctionExpression(path.node.declaration)) {
          const functionReturns = this.analyzeFunctionNode(
            path.node.declaration,
            sourceCode
          );
          returnStatements.push(...functionReturns);
        } else if (t.isFunctionExpression(path.node.declaration)) {
          const functionReturns = this.analyzeFunctionNode(
            path.node.declaration,
            sourceCode
          );
          returnStatements.push(...functionReturns);
        }
      },
    });

    return returnStatements;
  }

  /**
   * NEW: Analyzes a specific component node for JSX content and conditional patterns
   */
  analyzeComponentNode(
    componentNode: t.Node,
    sourceCode: string
  ): JSXReturnStatement[] {
    const returnStatements: JSXReturnStatement[] = [];

    // Check if it's a function-like node
    if (
      t.isFunctionDeclaration(componentNode) ||
      t.isArrowFunctionExpression(componentNode) ||
      t.isFunctionExpression(componentNode)
    ) {
      const functionReturns = this.analyzeFunctionNode(
        componentNode,
        sourceCode
      );
      returnStatements.push(...functionReturns);
    } else {
      // If it's not a function node, traverse it to find function declarations within
      traverse(
        componentNode,
        {
          FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => {
            if (isReactComponentBabel(path.node)) {
              const functionReturns = this.analyzeFunctionNode(
                path.node,
                sourceCode
              );
              returnStatements.push(...functionReturns);
            }
          },

          ArrowFunctionExpression: (
            path: NodePath<t.ArrowFunctionExpression>
          ) => {
            if (isReactComponentBabel(path.node)) {
              const functionReturns = this.analyzeFunctionNode(
                path.node,
                sourceCode
              );
              returnStatements.push(...functionReturns);
            }
          },

          FunctionExpression: (path: NodePath<t.FunctionExpression>) => {
            if (isReactComponentBabel(path.node)) {
              const functionReturns = this.analyzeFunctionNode(
                path.node,
                sourceCode
              );
              returnStatements.push(...functionReturns);
            }
          },
        },
        undefined,
        {}
      );
    }

    return returnStatements;
  }

  /**
   * Recursively checks if a statement contains a JSX return
   */
  private statementContainsJSXReturn(statement: t.Statement): boolean {
    if (t.isReturnStatement(statement) && statement.argument) {
      return nodeContainsJSX(statement.argument);
    } else if (t.isIfStatement(statement)) {
      return (
        this.statementContainsJSXReturn(statement.consequent) ||
        (statement.alternate
          ? this.statementContainsJSXReturn(statement.alternate)
          : false)
      );
    } else if (t.isBlockStatement(statement)) {
      return statement.body.some((stmt) =>
        this.statementContainsJSXReturn(stmt)
      );
    }
    return false;
  }

  /**
   * Analyzes a single function for JSX return patterns
   */
  analyzeFunctionNode(
    functionNode: t.Function | t.ArrowFunctionExpression,
    sourceCode: string
  ): JSXReturnStatement[] {
    const returnStatements: JSXReturnStatement[] = [];

    if (
      t.isArrowFunctionExpression(functionNode) &&
      !t.isBlockStatement(functionNode.body)
    ) {
      // Handle implicit return
      const implicitReturn = this.analyzeImplicitReturn(
        functionNode.body,
        sourceCode
      );
      if (implicitReturn) {
        returnStatements.push(implicitReturn);
      }
    } else if (functionNode.body && t.isBlockStatement(functionNode.body)) {
      // Analyze all statements in the function body
      returnStatements.push(
        ...this.analyzeBlockStatement(functionNode.body, sourceCode)
      );
    }

    return returnStatements;
  }

  /**
   * Analyzes a block statement for JSX returns and conditional patterns
   */
  private analyzeBlockStatement(
    block: t.BlockStatement,
    sourceCode: string
  ): JSXReturnStatement[] {
    const returnStatements: JSXReturnStatement[] = [];

    for (const statement of block.body) {
      if (t.isReturnStatement(statement)) {
        const analyzed = this.analyzeReturnStatement(statement, sourceCode);
        if (analyzed) {
          returnStatements.push(analyzed);
        }
      } else if (t.isIfStatement(statement)) {
        // Handle if/else statements
        const conditionalReturns = this.analyzeConditionalReturns(
          statement,
          sourceCode
        );
        returnStatements.push(...conditionalReturns);
      } else if (t.isSwitchStatement(statement)) {
        // Handle switch statements
        const switchReturns = this.analyzeSwitchStatement(
          statement,
          sourceCode
        );
        returnStatements.push(...switchReturns);
      } else if (t.isBlockStatement(statement)) {
        // Handle nested blocks
        returnStatements.push(
          ...this.analyzeBlockStatement(statement, sourceCode)
        );
      }
    }

    return returnStatements;
  }

  /**
   * Analyzes switch statements for conditional returns
   */
  private analyzeSwitchStatement(
    switchStatement: t.SwitchStatement,
    sourceCode: string
  ): JSXReturnStatement[] {
    const returnStatements: JSXReturnStatement[] = [];

    for (const caseClause of switchStatement.cases) {
      for (const statement of caseClause.consequent) {
        if (t.isReturnStatement(statement)) {
          const analyzed = this.analyzeReturnStatement(statement, sourceCode);
          if (analyzed) {
            returnStatements.push(analyzed);
          }
        } else if (t.isBlockStatement(statement)) {
          returnStatements.push(
            ...this.analyzeBlockStatement(statement, sourceCode)
          );
        }
      }
    }

    return returnStatements;
  }

  /**
   * Analyzes a return statement for JSX and conditional patterns - ENHANCED
   */
  private analyzeReturnStatement(
    returnStatement: t.ReturnStatement,
    sourceCode: string
  ): JSXReturnStatement | null {
    if (!returnStatement.argument || !containsJSX(returnStatement)) {
      return null;
    }

    // Analyze conditional patterns (already enhanced in ConditionalParser)
    const conditionalPatterns = this.conditionalParser.analyzeExpression(
      returnStatement.argument,
      sourceCode
    );

    // Extract component references (components only)
    const componentReferences = extractComponentReferencesFromNode(
      returnStatement.argument,
      sourceCode
    );

    // NEW: Extract HTML element references if enabled
    let htmlElementReferences: HTMLElementReference[] = [];
    if (this.config.includeHtmlElements) {
      const filter = this.config.htmlElementFilter;
      htmlElementReferences = extractHTMLElementReferencesFromNode(
        returnStatement.argument,
        sourceCode,
        filter.includeTags,
        filter.excludeTags,
        filter.includeAll
      );
    }

    return {
      hasConditional: conditionalPatterns.length > 0,
      conditionalPatterns,
      componentReferences,
      htmlElementReferences, // NEW: Include HTML elements
      position: getCodePosition(returnStatement),
    };
  }

  /**
   * Analyzes implicit returns in arrow functions - ENHANCED
   */
  private analyzeImplicitReturn(
    expression: t.Expression,
    sourceCode: string
  ): JSXReturnStatement | null {
    if (!nodeContainsJSX(expression)) {
      return null;
    }

    // Analyze conditional patterns (already enhanced in ConditionalParser)
    const conditionalPatterns = this.conditionalParser.analyzeExpression(
      expression,
      sourceCode
    );

    // Extract component references (components only)
    const componentReferences = extractComponentReferencesFromNode(
      expression,
      sourceCode
    );

    // NEW: Extract HTML element references if enabled
    let htmlElementReferences: HTMLElementReference[] = [];
    if (this.config.includeHtmlElements) {
      const filter = this.config.htmlElementFilter;
      htmlElementReferences = extractHTMLElementReferencesFromNode(
        expression,
        sourceCode,
        filter.includeTags,
        filter.excludeTags,
        filter.includeAll
      );
    }

    return {
      hasConditional: conditionalPatterns.length > 0,
      conditionalPatterns,
      componentReferences,
      htmlElementReferences, // NEW: Include HTML elements
      position: getCodePosition(expression),
    };
  }

  /**
   * Analyzes conditional return statements within if/else blocks
   */
  private analyzeConditionalReturns(
    ifStatement: t.IfStatement,
    sourceCode: string
  ): JSXReturnStatement[] {
    const returnStatements: JSXReturnStatement[] = [];

    // Analyze consequent (if block)
    const consequentReturns = this.extractReturnsFromStatement(
      ifStatement.consequent,
      sourceCode
    );
    returnStatements.push(...consequentReturns);

    // Analyze alternate (else block)
    if (ifStatement.alternate) {
      const alternateReturns = this.extractReturnsFromStatement(
        ifStatement.alternate,
        sourceCode
      );
      returnStatements.push(...alternateReturns);
    }

    return returnStatements;
  }

  /**
   * Extracts return statements from various statement types
   */
  private extractReturnsFromStatement(
    statement: t.Statement,
    sourceCode: string
  ): JSXReturnStatement[] {
    const returnStatements: JSXReturnStatement[] = [];

    if (t.isReturnStatement(statement)) {
      const analyzed = this.analyzeReturnStatement(statement, sourceCode);
      if (analyzed) {
        returnStatements.push(analyzed);
      }
    } else if (t.isBlockStatement(statement)) {
      returnStatements.push(
        ...this.analyzeBlockStatement(statement, sourceCode)
      );
    } else if (t.isIfStatement(statement)) {
      returnStatements.push(
        ...this.analyzeConditionalReturns(statement, sourceCode)
      );
    } else if (t.isSwitchStatement(statement)) {
      returnStatements.push(
        ...this.analyzeSwitchStatement(statement, sourceCode)
      );
    }

    return returnStatements;
  }

  /**
   * NEW: Updates configuration for HTML element tracking
   */
  updateConfig(config: ComponentFlowConfig): void {
    this.config = config;
    this.conditionalParser = new ConditionalParser(this.config);
  }

  /**
   * NEW: Gets current configuration
   */
  getConfig(): ComponentFlowConfig {
    return { ...this.config };
  }

  /**
   * NEW: Enables HTML element tracking
   */
  enableHtmlElementTracking(): void {
    this.config.includeHtmlElements = true;
    this.conditionalParser = new ConditionalParser(this.config);
  }

  /**
   * NEW: Disables HTML element tracking
   */
  disableHtmlElementTracking(): void {
    this.config.includeHtmlElements = false;
    this.conditionalParser = new ConditionalParser(this.config);
  }

  /**
   * NEW: Analyzes a specific JSX expression for both components and HTML elements
   */
  analyzeJSXExpression(
    expression: t.Expression,
    sourceCode: string
  ): {
    components: Array<{
      name: string;
      isJSXElement: boolean;
      props: any[];
      position: any;
    }>;
    htmlElements: Array<{
      tagName: string;
      props: any[];
      hasChildren: boolean;
      textContent?: string;
      position: any;
    }>;
    hasConditional: boolean;
    conditionalPatterns: any[];
  } {
    const componentReferences = extractComponentReferencesFromNode(
      expression,
      sourceCode
    );

    let htmlElementReferences: HTMLElementReference[] = [];
    if (this.config.includeHtmlElements) {
      const filter = this.config.htmlElementFilter;
      htmlElementReferences = extractHTMLElementReferencesFromNode(
        expression,
        sourceCode,
        filter.includeTags,
        filter.excludeTags,
        filter.includeAll
      );
    }

    const conditionalPatterns = this.conditionalParser.analyzeExpression(
      expression,
      sourceCode
    );

    return {
      components: componentReferences,
      htmlElements: htmlElementReferences,
      hasConditional: conditionalPatterns.length > 0,
      conditionalPatterns,
    };
  }

  /**
   * NEW: Gets analysis statistics
   */
  getAnalysisStats(returnStatements: JSXReturnStatement[]): {
    totalReturns: number;
    conditionalReturns: number;
    totalComponents: number;
    totalHtmlElements: number;
    totalConditionalPatterns: number;
  } {
    const totalReturns = returnStatements.length;
    const conditionalReturns = returnStatements.filter(
      (stmt) => stmt.hasConditional
    ).length;

    let totalComponents = 0;
    let totalHtmlElements = 0;
    let totalConditionalPatterns = 0;

    for (const statement of returnStatements) {
      totalComponents += statement.componentReferences.length;
      totalHtmlElements += statement.htmlElementReferences.length;
      totalConditionalPatterns += statement.conditionalPatterns.length;
    }

    return {
      totalReturns,
      conditionalReturns,
      totalComponents,
      totalHtmlElements,
      totalConditionalPatterns,
    };
  }
}
