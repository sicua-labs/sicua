import ts from "typescript";
import { ComponentRelation } from "../../../types";
import { EnhancedComponentRelation } from "../types/deduplication.types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { extractPropTypes } from "./propExtractor";
import { extractJSXStructure } from "./jsxExtractor";

/**
 * Enhances component information with detailed AST analysis
 * @param component Original component relation
 * @param sourceFile TypeScript source file
 * @returns Enhanced component with additional information
 */
export function enhanceComponentInfo(
  component: ComponentRelation,
  sourceFile: ts.SourceFile
): EnhancedComponentRelation {
  try {
    // Find component node in the source file
    const componentNode = findComponentNode(component.name, sourceFile);

    if (!componentNode) {
      return {
        ...component,
        sourceFile,
      };
    }

    // Extract props and JSX structure
    const props = extractPropTypes(componentNode, sourceFile);
    const jsxStructure = extractJSXStructure(componentNode, sourceFile);

    return {
      ...component,
      props,
      jsxStructure,
      sourceFile,
      componentNode,
    };
  } catch (error) {
    console.warn(`Error enhancing component ${component.name}:`, error);
    return {
      ...component,
      sourceFile,
    };
  }
}

/**
 * Finds the component node in the source file
 * @param componentName Name of the component to find
 * @param sourceFile Source file to search
 * @returns Component node if found
 */
function findComponentNode(
  componentName: string,
  sourceFile: ts.SourceFile
): ts.VariableDeclaration | ts.FunctionDeclaration | undefined {
  // Look for both variable declarations and function declarations
  return ASTUtils.findNodes(
    sourceFile,
    (node): node is ts.VariableDeclaration | ts.FunctionDeclaration =>
      (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) &&
      (node.name?.getText() === componentName ||
        node.name?.getText() === `${componentName}`)
  )[0];
}

/**
 * Creates source files from components
 * @param components Array of component relations
 * @returns Map of file paths to source files
 */
export function createSourceFiles(
  components: ComponentRelation[]
): Map<string, ts.SourceFile> {
  return new Map(
    components
      .filter(
        (c): c is ComponentRelation & { content: string } =>
          Boolean(c.content) &&
          Boolean(c.fullPath) &&
          !c.fullPath.endsWith(".d.ts")
      )
      .map((c) => [
        c.fullPath,
        ts.createSourceFile(
          c.fullPath,
          c.content,
          ts.ScriptTarget.Latest,
          true
        ),
      ])
  );
}
