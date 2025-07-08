import ts from "typescript";

/**
 * Represents a cached source file
 */
export interface SourceFileCache {
  filePath: string;
  sourceFile: ts.SourceFile;
}

/**
 * Represents extracted function metadata during analysis
 */
export interface ExtractedFunction {
  name: string;
  node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction;
  params: string[];
  returnType: string;
  body: string;
  isAsync: boolean;
}

/**
 * Classification result for a function
 */
export interface FunctionClassification {
  isReactComponent: boolean;
  usesReactHooks: boolean;
  hasReactSpecificOperations: boolean;
  usesFrontendAPIs: boolean;
  usesThisKeyword: boolean;
  isReducerOrStateManagement: boolean;
}

/**
 * Function extraction context
 */
export interface FunctionExtractionContext {
  componentName: string;
  sourceFile: ts.SourceFile;
}
