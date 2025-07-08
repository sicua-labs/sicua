/**
 * Utility for detecting magic numbers in TypeScript/JavaScript code
 */

import ts from "typescript";
import * as path from "path";
import { MagicNumber } from "../types/generalAnalyzer.types";
import {
  COMMON_NUMBERS,
  CSS_PROPERTIES,
  CONSTANT_PATTERNS,
  UI_PROPS,
  UI_FUNCTIONS,
  ANIMATION_PATTERNS,
  CHART_PROPS,
  ALGORITHM_CONSTANTS,
  CONTEXT_PATTERNS,
  BUSINESS_DATA_PATTERNS,
  LAYOUT_CALCULATION_PATTERNS,
  COLOR_CONSTANTS,
} from "../constants";

/**
 * Detects magic numbers in a TypeScript source file
 * @param sourceFile The TypeScript source file
 * @param filePath The full path to the file
 * @param getContextCode Function to get context lines around a node
 * @returns Array of detected magic numbers
 */
export function detectMagicNumbers(
  sourceFile: ts.SourceFile,
  filePath: string,
  getContextCode: (
    node: ts.Node,
    sourceFile: ts.SourceFile
  ) => { before: string; line: string; after: string }
): MagicNumber[] {
  const magicNumbers: MagicNumber[] = [];
  const fileName = path.basename(filePath);

  function visit(node: ts.Node): void {
    // Check if the node is a numeric literal
    if (ts.isNumericLiteral(node)) {
      const value = parseFloat(node.text);

      // Skip common numbers, algorithm constants, and color constants
      if (
        COMMON_NUMBERS.has(value) ||
        ALGORITHM_CONSTANTS.has(value) ||
        COLOR_CONSTANTS.has(value)
      ) {
        ts.forEachChild(node, visit);
        return;
      }

      // Skip numbers in specific contexts that are likely not magic numbers
      if (isInAcceptableContext(node, sourceFile)) {
        ts.forEachChild(node, visit);
        return;
      }

      // Get line number (1-based for display)
      const lineNumber =
        sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      // Get context around the magic number
      const context = getContextCode(node, sourceFile);

      magicNumbers.push({
        value,
        line: lineNumber,
        fileName,
        filePath,
        context: {
          before: context.before,
          current: context.line,
          after: context.after,
        },
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return magicNumbers;
}

/**
 * Checks if a numeric literal is in an acceptable context where it's likely not a magic number
 * @param node The numeric literal node
 * @param sourceFile The source file for additional context
 * @returns True if the number is in an acceptable context
 */
function isInAcceptableContext(
  node: ts.NumericLiteral,
  sourceFile: ts.SourceFile
): boolean {
  const parent = node.parent;

  if (!parent) {
    return false;
  }

  // Array index access: arr[0], arr[1]
  if (
    ts.isElementAccessExpression(parent) &&
    parent.argumentExpression === node
  ) {
    return true;
  }

  // Array literal with simple indices: [1, 2, 3]
  if (ts.isArrayLiteralExpression(parent)) {
    return true;
  }

  // Property access with numeric key: obj[123]
  if (ts.isComputedPropertyName(parent)) {
    return true;
  }

  // Enum values
  if (ts.isEnumMember(parent)) {
    return true;
  }

  // Version numbers in strings or template literals (parent context)
  if (ts.isTemplateSpan(parent) || ts.isStringLiteral(parent)) {
    return true;
  }

  // Default parameter values with small numbers
  if (ts.isParameter(parent) && parseFloat(node.text) <= 10) {
    return true;
  }

  // Port numbers (typically 3000-9999 range for development)
  const value = parseFloat(node.text);
  if (value >= 3000 && value <= 9999) {
    return true;
  }

  // CSS-related values - check if in a property assignment that looks like CSS
  if (ts.isPropertyAssignment(parent)) {
    const propertyName = getPropertyName(parent);
    if (propertyName && CSS_PROPERTIES.has(propertyName)) {
      return true;
    }
  }

  // Object literal values that might be CSS or business data
  if (
    ts.isPropertyAssignment(parent) &&
    ts.isObjectLiteralExpression(parent.parent)
  ) {
    const propertyName = getPropertyName(parent);
    if (
      propertyName &&
      (CSS_PROPERTIES.has(propertyName) ||
        BUSINESS_DATA_PATTERNS.some((pattern) => pattern.test(propertyName)) ||
        LAYOUT_CALCULATION_PATTERNS.some((pattern) =>
          pattern.test(propertyName)
        ))
    ) {
      return true;
    }
  }

  // Constant declarations (const, let with descriptive names)
  if (ts.isVariableDeclaration(parent)) {
    const variableName = parent.name;
    if (ts.isIdentifier(variableName)) {
      // Check if it's a constant-style name
      const name = variableName.text;
      if (isConstantStyleName(name)) {
        return true;
      }
    }
  }

  // Variable declarations with const keyword
  if (
    ts.isVariableDeclaration(parent) &&
    parent.parent &&
    ts.isVariableDeclarationList(parent.parent)
  ) {
    const declarationList = parent.parent;
    if (declarationList.flags & ts.NodeFlags.Const) {
      return true;
    }
  }

  // JSX attribute values (React component props)
  if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)) {
    const attributeName = parent.parent.name;
    if (ts.isIdentifier(attributeName)) {
      const propName = attributeName.text;
      if (
        UI_PROPS.has(propName) ||
        CHART_PROPS.has(propName) ||
        ANIMATION_PATTERNS.some((pattern) => pattern.test(propName))
      ) {
        return true;
      }
    }
  }

  // Array constructor for UI repetition: Array(n)
  if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression)) {
    if (parent.expression.text === "Array") {
      return true;
    }
  }

  // Function call arguments that are likely UI-related
  if (ts.isCallExpression(parent)) {
    const functionName = getFunctionName(parent);
    if (functionName && isUIRelatedFunction(functionName)) {
      return true;
    }
  }

  // Check for animation/motion context
  if (isInAnimationContext(node)) {
    return true;
  }

  // Check context patterns in the surrounding code
  if (hasAcceptableContext(node, sourceFile)) {
    return true;
  }

  // Check for default parameter values
  if (isDefaultParameterValue(node)) {
    return true;
  }

  return false;
}

/**
 * Gets the property name from a property assignment
 * @param propertyAssignment The property assignment node
 * @returns The property name as string or null
 */
function getPropertyName(
  propertyAssignment: ts.PropertyAssignment
): string | null {
  const name = propertyAssignment.name;

  if (ts.isIdentifier(name)) {
    return name.text;
  }

  if (ts.isStringLiteral(name)) {
    return name.text;
  }

  return null;
}

/**
 * Checks if a variable name follows constant naming conventions
 * @param name The variable name to check
 * @returns True if it looks like a constant name
 */
function isConstantStyleName(name: string): boolean {
  return CONSTANT_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Gets the function name from a call expression
 * @param callExpression The call expression node
 * @returns The function name or null
 */
function getFunctionName(callExpression: ts.CallExpression): string | null {
  const expression = callExpression.expression;

  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    // Handle both obj.method() and Math.sin() patterns
    if (
      ts.isIdentifier(expression.expression) &&
      ts.isIdentifier(expression.name)
    ) {
      return `${expression.expression.text}.${expression.name.text}`;
    }
    if (ts.isIdentifier(expression.name)) {
      return expression.name.text;
    }
  }

  return null;
}

/**
 * Checks if a function name is UI-related
 * @param functionName The function name to check
 * @returns True if it's likely a UI-related function
 */
function isUIRelatedFunction(functionName: string): boolean {
  return UI_FUNCTIONS.has(functionName);
}

/**
 * Checks if a numeric literal is in an animation/motion context
 * @param node The numeric literal node
 * @returns True if it's in an animation context
 */
function isInAnimationContext(node: ts.NumericLiteral): boolean {
  let currentNode: ts.Node = node;

  // Walk up the AST to find animation-related contexts
  while (currentNode.parent) {
    currentNode = currentNode.parent;

    // Check for object literals with animation properties
    if (ts.isObjectLiteralExpression(currentNode)) {
      const properties = currentNode.properties;
      return properties.some((prop) => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          const propName = prop.name.text;
          return ANIMATION_PATTERNS.some((pattern) => pattern.test(propName));
        }
        return false;
      });
    }

    // Check for function calls with animation-related names
    if (ts.isCallExpression(currentNode)) {
      const functionName = getFunctionName(currentNode);
      if (
        functionName &&
        (functionName.includes("animate") ||
          functionName.includes("transition") ||
          functionName.includes("motion") ||
          functionName.includes("spring"))
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if the context around the number suggests it's not a magic number
 * @param node The numeric literal node
 * @param sourceFile The source file for context
 * @returns True if context suggests it's acceptable
 */
function hasAcceptableContext(
  node: ts.NumericLiteral,
  sourceFile: ts.SourceFile
): boolean {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const fileLines = sourceFile.text.split("\n");
  const currentLine = fileLines[line] || "";

  // Check if the line matches any context patterns
  return CONTEXT_PATTERNS.some((pattern) => pattern.test(currentLine));
}

/**
 * Checks if a numeric literal is a default parameter value
 * @param node The numeric literal node
 * @returns True if it's a default parameter assignment
 */
function isDefaultParameterValue(node: ts.NumericLiteral): boolean {
  const parent = node.parent;

  // Check for function parameter defaults: function(param = 123)
  if (ts.isParameter(parent) && parent.initializer === node) {
    return true;
  }

  // Check for destructuring defaults: { prop = 123 }
  if (ts.isBindingElement(parent) && parent.initializer === node) {
    return true;
  }

  // Check for property assignment with equals (default props)
  if (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    return true;
  }

  return false;
}
