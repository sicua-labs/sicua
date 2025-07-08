import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { readFileContent } from "../utils/fileReader";
import { createSourceFile } from "../../translation/utils/astUtils";
import { isReactComponent } from "../../../utils/ast/reactSpecific";
import { generateComponentId } from "../../../utils/common/analysisUtils";

export async function calculateCyclomaticComplexity(
  components: ComponentRelation[]
): Promise<{
  [key: string]: number;
}> {
  const cyclomaticComplexity: { [key: string]: number } = {};

  // Group components by file path for efficient processing
  const componentsByFile = new Map<string, ComponentRelation[]>();
  components.forEach((component) => {
    if (!componentsByFile.has(component.fullPath)) {
      componentsByFile.set(component.fullPath, []);
    }
    componentsByFile.get(component.fullPath)!.push(component);
  });

  // Process each file once and calculate complexity for each component
  for (const [filePath, fileComponents] of componentsByFile) {
    const content = await readFileContent(filePath);
    const sourceFile = createSourceFile(filePath, content);

    // Find all component nodes in the file
    const componentNodes = findComponentNodes(sourceFile, fileComponents);

    // Calculate complexity for each component
    fileComponents.forEach((component) => {
      const componentId = generateComponentId(component);
      const componentNode = componentNodes.get(component.name);

      if (componentNode) {
        cyclomaticComplexity[componentId] =
          calculateNodeCyclomaticComplexity(componentNode);
      } else {
        // Fallback: if we can't find the specific component, assign base complexity
        cyclomaticComplexity[componentId] = 1;
      }
    });
  }

  return cyclomaticComplexity;
}

/**
 * Find component nodes in the source file
 */
function findComponentNodes(
  sourceFile: ts.SourceFile,
  components: ComponentRelation[]
): Map<string, ts.Node> {
  const componentNodes = new Map<string, ts.Node>();
  const componentNames = new Set(components.map((c) => c.name));

  function visit(node: ts.Node): void {
    // Check for function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionName = node.name.text;
      if (componentNames.has(functionName) && isReactComponent(node)) {
        componentNodes.set(functionName, node);
      }
    }

    // Check for variable declarations (const ComponentName = ...)
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const varName = node.name.text;
      if (componentNames.has(varName) && node.initializer) {
        if (
          (ts.isArrowFunction(node.initializer) ||
            ts.isFunctionExpression(node.initializer)) &&
          isReactComponent(node.initializer)
        ) {
          componentNodes.set(varName, node.initializer);
        }
      }
    }

    // Check for exported function declarations
    if (
      ts.isExportAssignment(node) &&
      ts.isFunctionDeclaration(node.expression)
    ) {
      const func = node.expression;
      if (
        func.name &&
        componentNames.has(func.name.text) &&
        isReactComponent(func)
      ) {
        componentNodes.set(func.name.text, func);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return componentNodes;
}

function calculateNodeCyclomaticComplexity(node: ts.Node): number {
  let complexity = 1; // Base complexity for linear flow

  function incrementComplexity(currentNode: ts.Node): void {
    switch (currentNode.kind) {
      // Decision points that create branching
      case ts.SyntaxKind.IfStatement:
        complexity++;
        break;

      case ts.SyntaxKind.ConditionalExpression:
        complexity++;
        break;

      // Loop constructs
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
        complexity++;
        break;

      // Switch case clauses (each case is a decision point)
      case ts.SyntaxKind.CaseClause:
        complexity++;
        break;

      // Exception handling
      case ts.SyntaxKind.CatchClause:
        complexity++;
        break;

      // Logical operators that create short-circuit evaluation
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpression = currentNode as ts.BinaryExpression;
        if (
          binaryExpression.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken ||
          binaryExpression.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++;
        }
        break;

      // Function expressions and arrow functions (separate complexity domains)
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
        // Only calculate nested function complexity if it's not the root component
        if (currentNode !== node) {
          const functionComplexity = calculateFunctionComplexity(
            currentNode as ts.FunctionExpression | ts.ArrowFunction
          );
          complexity += functionComplexity;
          return; // Don't traverse children as they're handled above
        }
        break;

      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
        // Only calculate nested function complexity if it's not the root component
        if (currentNode !== node) {
          const methodComplexity = calculateFunctionComplexity(
            currentNode as ts.FunctionDeclaration | ts.MethodDeclaration
          );
          complexity += methodComplexity;
          return; // Don't traverse children as they're handled above
        }
        break;

      // JSX conditional rendering patterns
      case ts.SyntaxKind.JsxExpression:
        const jsxExpression = currentNode as ts.JsxExpression;
        if (jsxExpression.expression) {
          // Handle JSX conditional patterns: {condition && <Component />}
          if (
            ts.isBinaryExpression(jsxExpression.expression) &&
            jsxExpression.expression.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken
          ) {
            complexity++;
          }
          // Handle JSX ternary patterns: {condition ? <A /> : <B />}
          else if (ts.isConditionalExpression(jsxExpression.expression)) {
            complexity++;
          }
        }
        break;

      // Optional chaining can create branching logic
      case ts.SyntaxKind.QuestionDotToken:
        complexity++;
        break;

      // Nullish coalescing creates a decision point
      case ts.SyntaxKind.QuestionQuestionToken:
        complexity++;
        break;
    }

    // Continue traversing children
    ts.forEachChild(currentNode, incrementComplexity);
  }

  ts.forEachChild(node, incrementComplexity);
  return complexity;
}

function calculateFunctionComplexity(
  functionNode:
    | ts.FunctionExpression
    | ts.ArrowFunction
    | ts.FunctionDeclaration
    | ts.MethodDeclaration
): number {
  let functionComplexity = 1; // Base complexity for the function

  function incrementFunctionComplexity(node: ts.Node): void {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
        functionComplexity++;
        break;

      case ts.SyntaxKind.ConditionalExpression:
        functionComplexity++;
        break;

      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
        functionComplexity++;
        break;

      case ts.SyntaxKind.CaseClause:
        functionComplexity++;
        break;

      case ts.SyntaxKind.CatchClause:
        functionComplexity++;
        break;

      case ts.SyntaxKind.BinaryExpression:
        const binaryExpression = node as ts.BinaryExpression;
        if (
          binaryExpression.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken ||
          binaryExpression.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          functionComplexity++;
        }
        break;

      case ts.SyntaxKind.JsxExpression:
        const jsxExpression = node as ts.JsxExpression;
        if (jsxExpression.expression) {
          if (
            ts.isBinaryExpression(jsxExpression.expression) &&
            jsxExpression.expression.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken
          ) {
            functionComplexity++;
          } else if (ts.isConditionalExpression(jsxExpression.expression)) {
            functionComplexity++;
          }
        }
        break;

      case ts.SyntaxKind.QuestionDotToken:
      case ts.SyntaxKind.QuestionQuestionToken:
        functionComplexity++;
        break;

      // Nested functions don't add to parent complexity in cyclomatic complexity
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
        return; // Don't traverse nested functions
    }

    ts.forEachChild(node, incrementFunctionComplexity);
  }

  // Get the function body and traverse it
  if ("body" in functionNode && functionNode.body) {
    if (ts.isBlock(functionNode.body)) {
      // Function with block body
      ts.forEachChild(functionNode.body, incrementFunctionComplexity);
    } else {
      // Arrow function with expression body
      incrementFunctionComplexity(functionNode.body);
    }
  }

  return functionComplexity;
}
