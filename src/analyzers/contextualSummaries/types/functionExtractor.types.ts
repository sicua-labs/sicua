import { ExportType, UsagePatternType } from "./contextualSummaries.types";

export interface FunctionDefinition {
  name: string;
  kind: FunctionKind;
  signature: FunctionSignature;
  complexity: FunctionComplexity;
  patterns: UsagePatternType[];
  reactSpecific?: ReactFunctionInfo;
  async: boolean;
  pure: boolean;
  sideEffects: SideEffect[];
  dependencies: FunctionDependency[];
  isExported: boolean;
  exportType?: ExportType;
  description?: string;
  location: CodeLocation;
}

export interface FunctionSignature {
  parameters: FunctionParameter[];
  returnType: string;
  generics: string[];
  overloads: string[];
}

export interface FunctionParameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
  destructured: boolean;
  restParameter: boolean;
}

export interface FunctionComplexity {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  nestingDepth: number;
  level: "low" | "medium" | "high" | "very-high";
}

export interface ReactFunctionInfo {
  isComponent: boolean;
  isHook: boolean;
  hooksUsed: string[];
  jsxComplexity: number;
  propTypes?: string[];
  stateUsage: StateUsageInfo;
  effectUsage: EffectUsageInfo;
}

export interface StateUsageInfo {
  hasState: boolean;
  stateVariables: string[];
  reducers: string[];
  contextUsage: string[];
}

export interface EffectUsageInfo {
  effects: EffectInfo[];
  cleanupFunctions: number;
  dependencies: string[][];
}

export interface EffectInfo {
  type: "useEffect" | "useLayoutEffect" | "useMemo" | "useCallback";
  dependencies: string[];
  hasCleanup: boolean;
}

export interface SideEffect {
  type:
    | "api-call"
    | "dom-manipulation"
    | "storage"
    | "console"
    | "external-service"
    | "file-system";
  description: string;
  location: CodeLocation;
}

export interface FunctionDependency {
  name: string;
  type: "function-call" | "variable-access" | "import";
  source?: string;
}

export interface CodeLocation {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export type FunctionKind =
  | "function-declaration"
  | "function-expression"
  | "arrow-function"
  | "method"
  | "constructor"
  | "getter"
  | "setter";

export interface FunctionContext {
  functions: FunctionDefinition[];
  callGraph: FunctionCall[];
  complexity: FunctionComplexityMetrics;
  patterns: PatternAnalysis;
}

export interface FunctionCall {
  caller: string;
  callee: string;
  location: CodeLocation;
  isConditional: boolean;
  isInLoop: boolean;
}

export interface FunctionComplexityMetrics {
  totalFunctions: number;
  averageComplexity: number;
  highComplexityCount: number;
  maxNestingDepth: number;
  totalLinesOfCode: number;
}

export interface PatternAnalysis {
  functionalPatterns: string[];
  reactPatterns: string[];
  asyncPatterns: string[];
  errorHandlingPatterns: string[];
}
