import { ComponentRelation, PropSignature } from "../../../types";
import { EnhancedComponentRelation } from "../types/deduplication.types";
import ts from "typescript";
import { ASTUtils } from "../../../utils/ast/ASTUtils";

/**
 * Finds common props between two sets of props
 * @param props1 First set of props
 * @param props2 Second set of props
 * @returns Array of common props
 */
export function findCommonProps(
  props1?: PropSignature[],
  props2?: PropSignature[]
): PropSignature[] {
  if (!props1 || !props2) return [];

  return props1.filter((prop1) =>
    props2.some(
      (prop2) => prop1.name === prop2.name && prop1.type === prop2.type
    )
  );
}

/**
 * Extracts prop types from a component node
 * @param node The component AST node
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

  // Check for interface declarations
  extractPropsFromInterfaces(sourceFile, props);

  return props;
}

/**
 * Extracts props from an arrow function
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
 * Extracts props from a parameter
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
        }
      }
    });
  }
}

/**
 * Extracts props from interface declarations in the source file
 * @param sourceFile The source file
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
 * Finds the default value for a prop
 * @param propName The name of the prop
 * @param components Components to search for default values
 * @returns The default value string if found
 */
export function findPropDefaultValue(
  propName: string,
  components: EnhancedComponentRelation[]
): string | undefined {
  for (const comp of components) {
    const { componentNode, sourceFile } = comp;
    if (!componentNode || !sourceFile) continue;

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
    }
  }
  return undefined;
}

/**
 * Calculates the similarity score for props
 * @param commonProps Common props between components
 * @param components Components being compared
 * @returns Similarity score between 0 and 1
 */
export function calculatePropsSimilarity(
  commonProps: PropSignature[],
  components: ComponentRelation[]
): number {
  // If all components have no props, they're considered similar
  const bothHaveNoProps = components.every(
    (c) => !c.props || c.props.length === 0
  );

  if (bothHaveNoProps) return 1;

  // Find the maximum number of props in any component
  const maxPropCount = Math.max(
    ...components.map((c) => c.props?.length || 0),
    1 // Avoid division by zero
  );

  return commonProps.length / maxPropCount;
}
