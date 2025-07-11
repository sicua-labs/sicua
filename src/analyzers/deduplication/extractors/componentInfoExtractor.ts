import ts from "typescript";
import { ComponentRelation, ScanResult } from "../../../types";
import { EnhancedComponentRelation } from "../types/deduplication.types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { extractPropTypes } from "./propExtractor";
import { extractJSXStructure } from "./jsxExtractor";

/**
 * Enhances component information with detailed AST analysis
 * @param component Original component relation
 * @param sourceFile TypeScript source file
 * @param scanResult Scan result with file metadata (optional)
 * @returns Component with additional information
 */
export function enhanceComponentInfo(
  component: ComponentRelation,
  sourceFile: ts.SourceFile,
  scanResult?: ScanResult
): EnhancedComponentRelation {
  try {
    const componentNode = findComponentNode(component.name, sourceFile);

    if (!componentNode) {
      return {
        ...component,
        sourceFile,
      };
    }

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
 */
function findComponentNode(
  componentName: string,
  sourceFile: ts.SourceFile
): ts.VariableDeclaration | ts.FunctionDeclaration | undefined {
  return ASTUtils.findNodes(
    sourceFile,
    (node): node is ts.VariableDeclaration | ts.FunctionDeclaration =>
      (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) &&
      (node.name?.getText() === componentName ||
        node.name?.getText() === `${componentName}`)
  )[0];
}

/**
 * Creates source files from components using scan result data
 */
export function createSourceFiles(
  components: ComponentRelation[],
  scanResult?: ScanResult
): Map<string, ts.SourceFile> {
  const sourceFilesMap = new Map<string, ts.SourceFile>();

  const validComponents = components.filter(
    (c): c is ComponentRelation & { fullPath: string } =>
      Boolean(c.fullPath) &&
      !c.fullPath.endsWith(".d.ts") &&
      (Boolean(c.content) || Boolean(scanResult?.fileContents.has(c.fullPath)))
  );

  for (const component of validComponents) {
    try {
      const content = getComponentContent(component, scanResult);

      if (!content) {
        continue;
      }

      const scriptKind = getScriptKind(component.fullPath);
      const sourceFile = ts.createSourceFile(
        component.fullPath,
        content,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );

      sourceFilesMap.set(component.fullPath, sourceFile);
    } catch (error) {
      console.warn(
        `Error creating source file for ${component.fullPath}:`,
        error
      );
    }
  }

  return sourceFilesMap;
}

/**
 * Gets component content from scan result or component
 */
function getComponentContent(
  component: ComponentRelation,
  scanResult?: ScanResult
): string | undefined {
  if (scanResult?.fileContents.has(component.fullPath)) {
    const content = scanResult.fileContents.get(component.fullPath);
    if (content && content.trim()) {
      return content;
    }
  }

  if (component.content && component.content.trim()) {
    return component.content;
  }

  return undefined;
}

/**
 * Determines TypeScript script kind based on file extension
 */
function getScriptKind(filePath: string): ts.ScriptKind {
  const extension = filePath.toLowerCase().split(".").pop();

  switch (extension) {
    case "tsx":
      return ts.ScriptKind.TSX;
    case "jsx":
      return ts.ScriptKind.JSX;
    case "ts":
      return ts.ScriptKind.TS;
    case "js":
      return ts.ScriptKind.JS;
    case "mjs":
      return ts.ScriptKind.External;
    default:
      return ts.ScriptKind.TSX;
  }
}
