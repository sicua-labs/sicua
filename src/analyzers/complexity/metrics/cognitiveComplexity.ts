import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { readFileContent } from "../utils/fileReader";
import { createSourceFile } from "../../translation/utils/astUtils";
import { isReactComponent } from "../../../utils/ast/reactSpecific";
import { generateComponentId } from "../../../utils/common/analysisUtils";

export async function calculateCognitiveComplexity(
  components: ComponentRelation[]
): Promise<{
  [key: string]: number;
}> {
  const cognitiveComplexity: { [key: string]: number } = {};

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
        cognitiveComplexity[componentId] =
          calculateNodeCognitiveComplexity(componentNode);
      } else {
        // Fallback: if we can't find the specific component, assign 0 complexity
        cognitiveComplexity[componentId] = 0;
      }
    });
  }

  return cognitiveComplexity;
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

function calculateNodeCognitiveComplexity(node: ts.Node): number {
  let totalComplexity = 0;

  function calculateComplexity(
    currentNode: ts.Node,
    nestingLevel: number = 0
  ): number {
    let nodeComplexity = 0;

    switch (currentNode.kind) {
      // Control flow structures that increase nesting
      case ts.SyntaxKind.IfStatement:
        nodeComplexity += 1 + nestingLevel;
        const ifStatement = currentNode as ts.IfStatement;

        // Process condition
        nodeComplexity += calculateComplexity(
          ifStatement.expression,
          nestingLevel
        );

        // Process then statement with increased nesting
        nodeComplexity += calculateComplexity(
          ifStatement.thenStatement,
          nestingLevel + 1
        );

        // Process else statement with same nesting level as if
        if (ifStatement.elseStatement) {
          // Don't add complexity for else clause itself, but check if it's an else-if
          if (ts.isIfStatement(ifStatement.elseStatement)) {
            nodeComplexity += calculateComplexity(
              ifStatement.elseStatement,
              nestingLevel
            );
          } else {
            nodeComplexity += calculateComplexity(
              ifStatement.elseStatement,
              nestingLevel + 1
            );
          }
        }
        break;

      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
        nodeComplexity += 1 + nestingLevel;
        // Process children with increased nesting
        ts.forEachChild(currentNode, (child) => {
          nodeComplexity += calculateComplexity(child, nestingLevel + 1);
        });
        break;

      // Switch statements add complexity for the switch itself plus each case
      case ts.SyntaxKind.SwitchStatement:
        nodeComplexity += 1 + nestingLevel;
        const switchStatement = currentNode as ts.SwitchStatement;

        // Process switch expression
        nodeComplexity += calculateComplexity(
          switchStatement.expression,
          nestingLevel
        );

        // Process case clauses with increased nesting
        switchStatement.caseBlock.clauses.forEach((clause) => {
          if (ts.isCaseClause(clause)) {
            nodeComplexity += 1 + nestingLevel; // Each case adds complexity
          }
          // Process statements in the case with increased nesting
          clause.statements.forEach((statement) => {
            nodeComplexity += calculateComplexity(statement, nestingLevel + 1);
          });
        });
        break;

      // Try-catch blocks
      case ts.SyntaxKind.TryStatement:
        const tryStatement = currentNode as ts.TryStatement;

        // Process try block with same nesting
        nodeComplexity += calculateComplexity(
          tryStatement.tryBlock,
          nestingLevel
        );

        // Catch clause adds complexity
        if (tryStatement.catchClause) {
          nodeComplexity += 1 + nestingLevel;
          nodeComplexity += calculateComplexity(
            tryStatement.catchClause.block,
            nestingLevel + 1
          );
        }

        // Finally block doesn't add complexity but process its contents
        if (tryStatement.finallyBlock) {
          nodeComplexity += calculateComplexity(
            tryStatement.finallyBlock,
            nestingLevel
          );
        }
        break;

      // Ternary expressions
      case ts.SyntaxKind.ConditionalExpression:
        nodeComplexity += 1 + nestingLevel;
        const conditionalExpression = currentNode as ts.ConditionalExpression;

        // Process all parts with increased nesting for true/false expressions
        nodeComplexity += calculateComplexity(
          conditionalExpression.condition,
          nestingLevel
        );
        nodeComplexity += calculateComplexity(
          conditionalExpression.whenTrue,
          nestingLevel + 1
        );
        nodeComplexity += calculateComplexity(
          conditionalExpression.whenFalse,
          nestingLevel + 1
        );
        break;

      // Logical expressions (&&, ||)
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpression = currentNode as ts.BinaryExpression;
        if (
          binaryExpression.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken ||
          binaryExpression.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          nodeComplexity += 1 + nestingLevel;
        }

        // Process both operands
        nodeComplexity += calculateComplexity(
          binaryExpression.left,
          nestingLevel
        );
        nodeComplexity += calculateComplexity(
          binaryExpression.right,
          nestingLevel
        );
        break;

      // Function expressions and arrow functions create new scope but don't increase nesting
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
        // For nested functions within components, reset nesting level
        ts.forEachChild(currentNode, (child) => {
          nodeComplexity += calculateComplexity(child, 0);
        });
        break;

      // Don't process other function declarations as separate scopes within components
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
        // Only process if this is not the root component function
        if (currentNode !== node) {
          ts.forEachChild(currentNode, (child) => {
            nodeComplexity += calculateComplexity(child, 0);
          });
        } else {
          // This is the component function itself, process normally
          ts.forEachChild(currentNode, (child) => {
            nodeComplexity += calculateComplexity(child, nestingLevel);
          });
        }
        break;

      // JSX conditional rendering adds complexity
      case ts.SyntaxKind.JsxExpression:
        const jsxExpression = currentNode as ts.JsxExpression;
        if (jsxExpression.expression) {
          // Check for conditional patterns in JSX
          if (
            ts.isBinaryExpression(jsxExpression.expression) &&
            jsxExpression.expression.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken
          ) {
            nodeComplexity += 1 + nestingLevel;
          } else if (ts.isConditionalExpression(jsxExpression.expression)) {
            nodeComplexity += 1 + nestingLevel;
          }
          nodeComplexity += calculateComplexity(
            jsxExpression.expression,
            nestingLevel
          );
        }
        break;

      // Optional chaining and nullish coalescing add slight complexity
      case ts.SyntaxKind.QuestionQuestionToken:
        nodeComplexity += 1;
        ts.forEachChild(currentNode, (child) => {
          nodeComplexity += calculateComplexity(child, nestingLevel);
        });
        break;

      default:
        // Process all children with current nesting level
        ts.forEachChild(currentNode, (child) => {
          nodeComplexity += calculateComplexity(child, nestingLevel);
        });
    }

    return nodeComplexity;
  }

  totalComplexity = calculateComplexity(node);
  return totalComplexity;
}
