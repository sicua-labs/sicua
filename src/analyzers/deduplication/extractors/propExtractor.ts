import ts from "typescript";
import { PropSignature } from "../../../types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";

/**
 * Extracts prop types from a component node
 * @param node Component AST node
 * @param sourceFile Source file containing the component
 * @returns Array of prop signatures
 */
export function extractPropTypes(
  node: ts.Node,
  sourceFile: ts.SourceFile
): PropSignature[] {
  const props: PropSignature[] = [];

  // Handle arrow functions with destructured props
  if (
    ts.isVariableDeclaration(node) &&
    node.initializer &&
    ts.isArrowFunction(node.initializer)
  ) {
    extractPropsFromArrowFunction(node.initializer, props);
  }
  // Handle function declarations
  else if (ts.isFunctionDeclaration(node) && node.parameters.length > 0) {
    const firstParam = node.parameters[0];
    if (ts.isParameter(firstParam)) {
      extractPropsFromParameter(firstParam, props);
    }
  }

  // Also check for interface declarations
  extractPropsFromInterfaces(sourceFile, props);

  return props;
}

/**
 * Extracts props from arrow function parameters
 * @param arrowFunc Arrow function node
 * @param props Props array to populate
 */
function extractPropsFromArrowFunction(
  arrowFunc: ts.ArrowFunction,
  props: PropSignature[]
): void {
  // Get the first parameter
  const firstParam = arrowFunc.parameters[0];

  if (firstParam && ts.isParameter(firstParam)) {
    extractPropsFromParameter(firstParam, props);
  }
}

/**
 * Extracts props from function parameter
 * @param param Parameter node
 * @param props Props array to populate
 */
function extractPropsFromParameter(
  param: ts.ParameterDeclaration,
  props: PropSignature[]
): void {
  // Handle destructured parameter
  if (ts.isObjectBindingPattern(param.name)) {
    const bindingPattern = param.name;

    // Get the type annotation of the parameter
    const typeAnnotation = param.type;
    if (typeAnnotation && ts.isTypeLiteralNode(typeAnnotation)) {
      // Extract props from type literal
      typeAnnotation.members.forEach((member) => {
        if (ts.isPropertySignature(member)) {
          const propName = member.name.getText();
          const propType = member.type?.getText() ?? "any";
          const isOptional = !!member.questionToken;

          props.push({
            name: propName,
            type: propType,
            required: !isOptional,
          });
        }
      });
    }

    // Also check binding elements for default values
    bindingPattern.elements.forEach((element) => {
      if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
        const existingProp = props.find(
          (p) => p.name === element.name.getText()
        );
        if (existingProp && element.initializer) {
          // If there's a default value, mark as optional
          existingProp.required = false;
        } else if (!existingProp && element.initializer) {
          // If prop wasn't found from type but has a binding element, add it
          props.push({
            name: element.name.getText(),
            type: element.initializer.getText(),
            required: false,
          });
        }
      }
    });
  }
}

/**
 * Extracts props from interface declarations
 * @param sourceFile Source file to search
 * @param props Props array to populate
 */
function extractPropsFromInterfaces(
  sourceFile: ts.SourceFile,
  props: PropSignature[]
): void {
  ASTUtils.findNodes(sourceFile, ts.isInterfaceDeclaration).forEach(
    (interfaceDecl) => {
      if (interfaceDecl.name.text.includes("Props")) {
        interfaceDecl.members.forEach((member) => {
          if (ts.isPropertySignature(member)) {
            props.push({
              name: member.name.getText(),
              type: member.type?.getText() ?? "any",
              required: !member.questionToken,
            });
          }
        });
      }
    }
  );
}

/**
 * Finds the default value for a prop in a component
 * @param propName Name of the prop
 * @param componentNode Component AST node
 * @returns Default value string if found
 */
export function findPropDefaultValue(
  propName: string,
  componentNode: ts.VariableDeclaration | ts.FunctionDeclaration
): string | undefined {
  if (
    ts.isVariableDeclaration(componentNode) &&
    componentNode.initializer &&
    ts.isArrowFunction(componentNode.initializer)
  ) {
    const param = componentNode.initializer.parameters[0];
    if (
      param &&
      ts.isParameter(param) &&
      ts.isObjectBindingPattern(param.name)
    ) {
      const element = param.name.elements.find(
        (el) =>
          ts.isBindingElement(el) &&
          ts.isIdentifier(el.name) &&
          el.name.text === propName &&
          el.initializer
      );
      if (element && ts.isBindingElement(element) && element.initializer) {
        return element.initializer.getText();
      }
    }
  } else if (
    ts.isFunctionDeclaration(componentNode) &&
    componentNode.parameters.length > 0
  ) {
    const param = componentNode.parameters[0];
    if (ts.isParameter(param) && ts.isObjectBindingPattern(param.name)) {
      const element = param.name.elements.find(
        (el) =>
          ts.isBindingElement(el) &&
          ts.isIdentifier(el.name) &&
          el.name.text === propName &&
          el.initializer
      );
      if (element && ts.isBindingElement(element) && element.initializer) {
        return element.initializer.getText();
      }
    }
  }
  return undefined;
}
