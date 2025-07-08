import ts from "typescript";

export interface ErrorHandlingLocation {
  line: number;
  column: number;
}

export interface ErrorStateUpdate {
  stateName: string;
  setter: string;
  value: string;
}

export interface ErrorStateUsage {
  inRender: boolean;
  inEffects: boolean;
  inEvents: boolean;
  setterLocations: ErrorHandlingLocation[];
}

export interface ErrorState {
  name: string;
  setter: string;
  location: ErrorHandlingLocation;
  initialValue: any;
  usage: ErrorStateUsage;
}

export interface TryCatchBlock {
  location: ErrorHandlingLocation;
  scope: "render" | "event" | "effect" | "other";
  hasFallbackRender: boolean;
  errorStateUpdates: ErrorStateUpdate[];
  hasErrorLogging: boolean;
}

export interface ErrorBoundary {
  library: ErrorBoundaryLibraryInfo;
  props: Record<string, any>;
  location: ErrorHandlingLocation;
}

export interface ErrorBoundaryLibraryInfo {
  name: string;
  source: string;
  type: "official" | "community" | "custom";
  features: Set<string>;
  importPath: string;
}

export interface FallbackElement {
  element: ts.JsxElement | ts.JsxSelfClosingElement;
  condition?: ts.Expression;
  relatedErrorStates: string[];
  location: ErrorHandlingLocation;
}

export interface ErrorPattern {
  type:
    | "conditional-render"
    | "error-logging"
    | "state-update"
    | "throw"
    | "error-creation"
    | "promise-rejection"
    | "async-handling";
  location: ErrorHandlingLocation;
  relatedStates: string[];
  pattern: string;
}

export interface ErrorHandlingAnalysisResult {
  errorBoundaries: ErrorBoundary[];
  tryCatchBlocks: TryCatchBlock[];
  errorStates: ErrorState[];
  fallbackElements: FallbackElement[];
  errorPatterns: ErrorPattern[];
  functionErrorHandling: FunctionErrorHandling[];
}

export interface FunctionRiskAnalysis {
  shouldHaveErrorHandling: boolean;
  riskIndicators: {
    hasAsyncOperations: boolean;
    hasFileOperations: boolean;
    hasNetworkCalls: boolean;
    hasDataParsing: boolean;
    hasExternalAPICalls: boolean;
    hasDatabaseOperations: boolean;
    hasStateUpdates: boolean;
    hasComplexCalculations: boolean;
    hasThirdPartyLibraryCalls: boolean;
    hasDataTransformations: boolean;
  };
  riskScore: number;
}

export interface FunctionErrorHandling {
  functionName: string;
  location: ErrorHandlingLocation;
  tryCatchBlocks: TryCatchBlock[];
  errorHandlingPatterns: ErrorPattern[];
  errorPropagation: {
    throws: boolean;
    rethrows: boolean;
    asyncHandling: boolean;
    customErrorClasses: string[];
  };
  errorTypes: Set<string>;
  riskAnalysis: FunctionRiskAnalysis; // Add this field
  hasErrorHandling: boolean; // Add this field
}

export interface ErrorHandlingCompleteAnalysis {
  componentResults: { [key: string]: ErrorHandlingAnalysisResult };
  summary: {
    totalComponents: number;
    componentsWithErrorHandling: number;
    errorHandlingCoverage: number;
    totalErrorBoundaries: number;
    totalTryCatch: number;
    libraryUsage: { [key: string]: number };
    totalFunctionsWithErrorHandling: number;
    functionErrorHandlingGaps: {
      // Add this field
      totalFunctionsNeedingErrorHandling: number;
      functionsWithMissingErrorHandling: string[];
      riskBreakdown: {
        high: number;
        medium: number;
        low: number;
      };
    };
  };
}
