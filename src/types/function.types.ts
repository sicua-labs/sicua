/**
 * Types for function analysis
 */

export interface FunctionData {
  componentName: string;
  functionName: string;
  params: string[];
  returnType: string;
  body: string;
  dependencies: string[];
  calledFunctions: string[];
  isAsync: boolean;
}
