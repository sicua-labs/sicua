import ts from "typescript";

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Error categories for function analysis
 */
export enum ErrorCategory {
  PARSING = "parsing",
  TYPE_RESOLUTION = "type_resolution",
  AST_TRAVERSAL = "ast_traversal",
  FILE_ACCESS = "file_access",
  FUNCTION_EXTRACTION = "function_extraction",
  CLASSIFICATION = "classification",
  DEPENDENCY_ANALYSIS = "dependency_analysis",
}

/**
 * Structured error information
 */
export interface AnalysisError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  context: string;
  filePath?: string;
  functionName?: string;
  nodeKind?: string;
  stackTrace?: string;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  logErrors: boolean;
  throwOnCritical: boolean;
  maxErrorsPerFile: number;
  includeStackTrace: boolean;
  enableRecovery: boolean;
}

/**
 * Fallback values for when extraction fails
 */
export interface FallbackValues {
  functionName: string;
  returnType: string;
  params: string[];
  body: string;
  dependencies: string[];
  calledFunctions: string[];
  isAsync: boolean;
}

/**
 * Utility class for structured error handling in function analysis
 */
export class ErrorHandler {
  private errors: AnalysisError[] = [];
  private config: ErrorHandlingConfig;
  private readonly defaultFallbacks: FallbackValues = {
    functionName: "Unknown Function",
    returnType: "unknown",
    params: [],
    body: "// Error parsing function body",
    dependencies: [],
    calledFunctions: [],
    isAsync: false,
  };

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = {
      logErrors: true,
      throwOnCritical: false,
      maxErrorsPerFile: 50,
      includeStackTrace: false,
      enableRecovery: true,
      ...config,
    };
  }

  /**
   * Safely executes a function with error handling and fallback
   */
  safeExecute<T>(
    operation: () => T,
    fallbackValue: T,
    context: string,
    category: ErrorCategory = ErrorCategory.PARSING,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    filePath?: string,
    functionName?: string
  ): T {
    try {
      return operation();
    } catch (error) {
      this.handleError(
        error,
        context,
        category,
        severity,
        filePath,
        functionName
      );
      return fallbackValue;
    }
  }

  /**
   * Safely extracts function name with fallback
   */
  safeFunctionName(
    node: ts.Node,
    extractor: (node: ts.Node) => string,
    filePath?: string
  ): string {
    return this.safeExecute(
      () => extractor(node),
      this.defaultFallbacks.functionName,
      "function name extraction",
      ErrorCategory.FUNCTION_EXTRACTION,
      ErrorSeverity.LOW,
      filePath
    );
  }

  /**
   * Safely extracts return type with fallback
   */
  safeReturnType(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    extractor: (
      node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
    ) => string,
    filePath?: string,
    functionName?: string
  ): string {
    return this.safeExecute(
      () => extractor(node),
      this.defaultFallbacks.returnType,
      "return type extraction",
      ErrorCategory.TYPE_RESOLUTION,
      ErrorSeverity.LOW,
      filePath,
      functionName
    );
  }

  /**
   * Safely extracts parameters with fallback
   */
  safeParameters(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    extractor: (
      node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
    ) => string[],
    filePath?: string,
    functionName?: string
  ): string[] {
    return this.safeExecute(
      () => extractor(node),
      this.defaultFallbacks.params,
      "parameter extraction",
      ErrorCategory.FUNCTION_EXTRACTION,
      ErrorSeverity.LOW,
      filePath,
      functionName
    );
  }

  /**
   * Safely extracts function body with fallback
   */
  safeFunctionBody(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    extractor: (
      node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
    ) => string,
    filePath?: string,
    functionName?: string
  ): string {
    return this.safeExecute(
      () => extractor(node),
      this.defaultFallbacks.body,
      "function body extraction",
      ErrorCategory.FUNCTION_EXTRACTION,
      ErrorSeverity.MEDIUM,
      filePath,
      functionName
    );
  }

  /**
   * Safely extracts dependencies with fallback
   */
  safeDependencies(
    node: ts.Node,
    extractor: (node: ts.Node) => string[],
    filePath?: string,
    functionName?: string
  ): string[] {
    return this.safeExecute(
      () => extractor(node),
      this.defaultFallbacks.dependencies,
      "dependency extraction",
      ErrorCategory.DEPENDENCY_ANALYSIS,
      ErrorSeverity.LOW,
      filePath,
      functionName
    );
  }

  /**
   * Safely extracts called functions with fallback
   */
  safeCalledFunctions(
    node: ts.Node,
    extractor: (node: ts.Node) => string[],
    filePath?: string,
    functionName?: string
  ): string[] {
    return this.safeExecute(
      () => extractor(node),
      this.defaultFallbacks.calledFunctions,
      "called functions extraction",
      ErrorCategory.FUNCTION_EXTRACTION,
      ErrorSeverity.LOW,
      filePath,
      functionName
    );
  }

  /**
   * Safely detects async status with fallback
   */
  safeAsyncDetection(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    detector: (
      node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
    ) => boolean,
    filePath?: string,
    functionName?: string
  ): boolean {
    return this.safeExecute(
      () => detector(node),
      this.defaultFallbacks.isAsync,
      "async detection",
      ErrorCategory.FUNCTION_EXTRACTION,
      ErrorSeverity.LOW,
      filePath,
      functionName
    );
  }

  /**
   * Safely performs classification with fallback
   */
  safeClassification<T>(
    node: ts.Node,
    classifier: (node: ts.Node) => T,
    fallbackValue: T,
    filePath?: string,
    functionName?: string
  ): T {
    return this.safeExecute(
      () => classifier(node),
      fallbackValue,
      "function classification",
      ErrorCategory.CLASSIFICATION,
      ErrorSeverity.MEDIUM,
      filePath,
      functionName
    );
  }

  /**
   * Safely traverses AST with error recovery
   */
  safeASTTraversal<T>(
    node: ts.Node,
    traverser: (node: ts.Node) => T,
    fallbackValue: T,
    filePath?: string
  ): T {
    return this.safeExecute(
      () => traverser(node),
      fallbackValue,
      "AST traversal",
      ErrorCategory.AST_TRAVERSAL,
      ErrorSeverity.HIGH,
      filePath
    );
  }

  /**
   * Handles file access errors
   */
  handleFileError(filePath: string, operation: string, error: unknown): void {
    this.handleError(
      error,
      `File ${operation}: ${filePath}`,
      ErrorCategory.FILE_ACCESS,
      ErrorSeverity.HIGH,
      filePath
    );
  }

  /**
   * Core error handling method
   */
  private handleError(
    error: unknown,
    context: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    filePath?: string,
    functionName?: string
  ): void {
    const analysisError: AnalysisError = {
      category,
      severity,
      message: this.extractErrorMessage(error),
      context,
      filePath,
      functionName,
      nodeKind: this.extractNodeKind(error),
      stackTrace: this.config.includeStackTrace
        ? this.extractStackTrace(error)
        : undefined,
      timestamp: new Date(),
      recoverable:
        this.config.enableRecovery && severity !== ErrorSeverity.CRITICAL,
    };

    this.errors.push(analysisError);

    // Log error if configured
    if (this.config.logErrors) {
      this.logError(analysisError);
    }

    // Check if we should throw on critical errors
    if (this.config.throwOnCritical && severity === ErrorSeverity.CRITICAL) {
      throw new Error(`Critical error in ${context}: ${analysisError.message}`);
    }

    // Check if we've exceeded max errors per file
    if (
      filePath &&
      this.getErrorCountForFile(filePath) > this.config.maxErrorsPerFile
    ) {
      console.warn(
        `Max errors exceeded for file: ${filePath}. Some errors may be suppressed.`
      );
    }
  }

  /**
   * Extracts error message from various error types
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object" && "message" in error) {
      return String(error.message);
    }
    return "Unknown error occurred";
  }

  /**
   * Extracts stack trace from error
   */
  private extractStackTrace(error: unknown): string | undefined {
    if (error instanceof Error && error.stack) {
      return error.stack;
    }
    return undefined;
  }

  /**
   * Attempts to extract TypeScript node kind from error context
   */
  private extractNodeKind(error: unknown): string | undefined {
    if (error instanceof Error && error.message.includes("SyntaxKind")) {
      const match = error.message.match(/SyntaxKind\.(\w+)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  }

  /**
   * Logs error with appropriate level
   */
  private logError(error: AnalysisError): void {
    const prefix = `[${error.severity.toUpperCase()}] ${error.category}:`;
    const message = `${prefix} ${error.message} (${error.context})`;
    const location = error.filePath ? ` in ${error.filePath}` : "";
    const functionContext = error.functionName
      ? ` at function ${error.functionName}`
      : "";

    const fullMessage = `${message}${location}${functionContext}`;

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(fullMessage);
        break;
      case ErrorSeverity.HIGH:
        console.error(fullMessage);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(fullMessage);
        break;
      case ErrorSeverity.LOW:
        console.log(fullMessage);
        break;
    }

    if (error.stackTrace && error.severity === ErrorSeverity.CRITICAL) {
      console.error("Stack trace:", error.stackTrace);
    }
  }

  /**
   * Gets error count for a specific file
   */
  private getErrorCountForFile(filePath: string): number {
    return this.errors.filter((error) => error.filePath === filePath).length;
  }

  /**
   * Gets all errors
   */
  getErrors(): AnalysisError[] {
    return [...this.errors];
  }

  /**
   * Gets errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AnalysisError[] {
    return this.errors.filter((error) => error.category === category);
  }

  /**
   * Gets errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AnalysisError[] {
    return this.errors.filter((error) => error.severity === severity);
  }

  /**
   * Gets errors for a specific file
   */
  getErrorsForFile(filePath: string): AnalysisError[] {
    return this.errors.filter((error) => error.filePath === filePath);
  }

  /**
   * Clears all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Gets error summary statistics
   */
  getErrorSummary(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    filesWithErrors: number;
  } {
    const bySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = this.getErrorsBySeverity(severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const byCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = this.getErrorsByCategory(category).length;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const filesWithErrors = new Set(
      this.errors
        .filter((error) => error.filePath)
        .map((error) => error.filePath)
    ).size;

    return {
      total: this.errors.length,
      bySeverity,
      byCategory,
      filesWithErrors,
    };
  }

  /**
   * Checks if analysis can continue based on error state
   */
  canContinueAnalysis(): boolean {
    const criticalErrors = this.getErrorsBySeverity(
      ErrorSeverity.CRITICAL
    ).length;
    const highErrors = this.getErrorsBySeverity(ErrorSeverity.HIGH).length;

    return criticalErrors === 0 && highErrors < 10; // Configurable threshold
  }
}
