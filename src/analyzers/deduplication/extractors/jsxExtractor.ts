import ts from "typescript";
import { JSXStructure, PropSignature } from "../../../types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";

/**
 * Extracts JSX structure from a component node
 * @param node Component AST node
 * @param sourceFile Source file containing the component
 * @returns JSX structure or undefined if none found
 */
export function extractJSXStructure(
  node: ts.Node,
  sourceFile: ts.SourceFile
): JSXStructure | undefined {
  // Find all JSX elements in the component
  const jsxElements = [
    ...ASTUtils.findNodes(sourceFile, ts.isJsxElement),
    ...ASTUtils.findNodes(sourceFile, ts.isJsxSelfClosingElement),
  ];

  if (!jsxElements.length) return undefined;

  // Find the root JSX element that's within this component's scope
  const rootJSX = findRootJSXElement(jsxElements, node);
  if (!rootJSX) return undefined;

  return parseJSXElement(rootJSX);
}

/**
 * Finds the root JSX element for a component
 * @param jsxElements All JSX elements in the source file
 * @param componentNode Component node
 * @returns Root JSX element or undefined
 */
function findRootJSXElement(
  jsxElements: (ts.JsxElement | ts.JsxSelfClosingElement)[],
  componentNode: ts.Node
): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
  // Find JSX element that's within the component's scope but not nested in other JSX
  return jsxElements.find((element) => {
    // Check if the element is within the component's scope
    let current: ts.Node | undefined = element;
    let foundInComponent = false;
    let nestedInOtherJSX = false;

    while (current) {
      if (current === componentNode) {
        foundInComponent = true;
        break;
      }

      // Check if this JSX is nested in another JSX
      if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
        if (current !== element) {
          nestedInOtherJSX = true;
          break;
        }
      }

      current = current.parent;
    }

    return foundInComponent && !nestedInOtherJSX;
  });
}

/**
 * Parses a JSX element into a JSX structure
 * @param element JSX element to parse
 * @returns Parsed JSX structure
 */
export function parseJSXElement(
  element: ts.JsxElement | ts.JsxSelfClosingElement
): JSXStructure {
  if (ts.isJsxSelfClosingElement(element)) {
    return {
      tagName: element.tagName.getText(),
      props: extractJSXProps(element.attributes),
      children: [],
    };
  }

  return {
    tagName: element.openingElement.tagName.getText(),
    props: extractJSXProps(element.openingElement.attributes),
    children: element.children
      .filter(
        (child): child is ts.JsxElement | ts.JsxSelfClosingElement =>
          ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)
      )
      .map((child) => parseJSXElement(child)),
  };
}

/**
 * Extracts props from JSX attributes
 * @param attributes JSX attributes object
 * @returns Array of prop signatures
 */
export function extractJSXProps(attributes: ts.JsxAttributes): PropSignature[] {
  return attributes.properties.filter(ts.isJsxAttribute).map((attr) => ({
    name: attr.name.getText(),
    type: attr.initializer?.getText() ?? "true",
    required: true, // Assuming all present JSX props are required
  }));
}

/**
 * Checks if a JSX element has a particular className
 * @param element JSX element to check
 * @param className Class name to search for
 * @returns True if element has the class
 */
export function hasClassName(
  element: ts.JsxElement | ts.JsxSelfClosingElement,
  className: string
): boolean {
  const attributes = ts.isJsxElement(element)
    ? element.openingElement.attributes
    : element.attributes;

  for (const attr of attributes.properties) {
    if (ts.isJsxAttribute(attr) && attr.name.getText() === "className") {
      if (attr.initializer && attr.initializer.getText().includes(className)) {
        return true;
      }
    }
  }

  return false;
}
