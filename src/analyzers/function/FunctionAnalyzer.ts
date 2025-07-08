import { from, mergeMap, map, catchError, finalize } from "rxjs";
import { of } from "rxjs";
import { ComponentRelation, FunctionData } from "../../types";
import { SourceFileManager } from "./utils/sourceFileManager";
import { FunctionExtractor } from "./utils/functionExtractor";
import { ErrorHandler } from "./utils/errorHandler";
import { DataValidator } from "./utils/dataValidator";
import ts from "typescript";

/**
 * Analysis configuration
 */
interface AnalysisConfig {
  concurrency: number;
  enableValidation: boolean;
  enableErrorRecovery: boolean;
  skipEmptyFiles: boolean;
  maxRetries: number;
  timeoutMs: number;
  enableDetailedLogging: boolean;
}

/**
 * Analysis statistics
 */
interface AnalysisStatistics {
  totalComponents: number;
  processedComponents: number;
  skippedComponents: number;
  failedComponents: number;
  totalFunctions: number;
  validFunctions: number;
  invalidFunctions: number;
  processingTimeMs: number;
  averageTimePerComponent: number;
  errorSummary: {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    criticalErrors: number;
  };
  validationSummary?: {
    overallScore: number;
    issuesByCategory: Record<string, number>;
    issuesBySeverity: Record<string, number>;
  };
}

/**
 * Component processing result
 */
interface ComponentProcessingResult {
  component: ComponentRelation;
  functions: FunctionData[];
  success: boolean;
  errorMessage?: string;
  processingTimeMs: number;
}

/**
 * Enhanced analyzer for business logic functions within components
 */
export class FunctionAnalyzer {
  private components: ComponentRelation[];
  private sourceFileManager: SourceFileManager;
  private functionExtractor: FunctionExtractor;
  private errorHandler: ErrorHandler;
  private dataValidator: DataValidator;
  private typeChecker?: ts.TypeChecker;
  private config: AnalysisConfig;
  private statistics: AnalysisStatistics;

  constructor(
    components: ComponentRelation[],
    typeChecker?: ts.TypeChecker,
    config: Partial<AnalysisConfig> = {}
  ) {
    this.components = components;
    this.typeChecker = typeChecker;
    this.config = {
      concurrency: 4,
      enableValidation: true,
      enableErrorRecovery: true,
      skipEmptyFiles: true,
      maxRetries: 2,
      timeoutMs: 30000,
      enableDetailedLogging: false,
      ...config,
    };

    // Initialize utilities
    this.sourceFileManager = new SourceFileManager();
    this.errorHandler = new ErrorHandler({
      logErrors: this.config.enableDetailedLogging,
      throwOnCritical: false,
      maxErrorsPerFile: 50,
      includeStackTrace: this.config.enableDetailedLogging,
      enableRecovery: this.config.enableErrorRecovery,
    });
    this.functionExtractor = new FunctionExtractor(typeChecker);
    this.dataValidator = new DataValidator({
      strictMode: false,
      allowEmptyBodies: true,
      allowUnknownTypes: true,
      checkNameConventions: true,
    });

    this.statistics = this.initializeStatistics();
  }

  /**
   * Enhanced analysis with comprehensive error handling and validation
   * @returns Promise resolving to an array of analyzed function data
   */
  async analyze(): Promise<FunctionData[]> {
    const startTime = Date.now();
    const functionDataList: FunctionData[] = [];
    const processingResults: ComponentProcessingResult[] = [];

    try {
      this.logInfo("Starting function analysis...");
      this.logInfo(
        `Processing ${this.components.length} components with concurrency ${this.config.concurrency}`
      );

      // Reset statistics
      this.statistics = this.initializeStatistics();
      this.statistics.totalComponents = this.components.length;

      return new Promise((resolve, reject) => {
        from(this.components)
          .pipe(
            mergeMap(async (component) => {
              return this.processComponent(component);
            }, this.config.concurrency),
            map((result: ComponentProcessingResult) => {
              processingResults.push(result);
              if (result.success) {
                functionDataList.push(...result.functions);
                this.statistics.processedComponents++;
                this.statistics.totalFunctions += result.functions.length;
              } else {
                this.statistics.failedComponents++;
                this.logError(
                  `Failed to process component ${result.component.name}: ${result.errorMessage}`
                );
              }
              return result;
            }),
            catchError((error) => {
              this.logError(`Critical error during analysis: ${error}`);
              this.statistics.errorSummary.criticalErrors++;
              return of(null);
            }),
            finalize(() => {
              this.finalizeAnalysis(
                startTime,
                functionDataList,
                processingResults
              );
            })
          )
          .subscribe({
            complete: () => {
              this.logInfo(
                `Analysis completed. Total functions extracted: ${functionDataList.length}`
              );
              resolve(functionDataList);
            },
            error: (error) => {
              this.logError(`Analysis failed: ${error}`);
              reject(error);
            },
          });
      });
    } catch (error) {
      this.statistics.processingTimeMs = Date.now() - startTime;
      this.logError(`Analysis initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Processes a single component with comprehensive error handling
   */
  private async processComponent(
    component: ComponentRelation
  ): Promise<ComponentProcessingResult> {
    const startTime = Date.now();

    try {
      this.logDebug(
        `Processing component: ${component.name} (${component.fullPath})`
      );

      // Validate component
      if (!this.isValidComponent(component)) {
        this.statistics.skippedComponents++;
        return {
          component,
          functions: [],
          success: false,
          errorMessage: "Invalid component data",
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Check if file should be skipped
      if (
        this.config.skipEmptyFiles &&
        (await this.isEmptyFile(component.fullPath))
      ) {
        this.statistics.skippedComponents++;
        return {
          component,
          functions: [],
          success: true,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Process with retries
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        try {
          const result = await this.processComponentWithTimeout(component);

          // Validate extracted functions if enabled
          if (this.config.enableValidation && result.length > 0) {
            const validationResult = this.dataValidator.validateBatch(result);
            this.updateValidationStatistics(validationResult);

            // Filter out invalid functions if in strict mode
            const validFunctions = this.filterValidFunctions(
              result,
              validationResult
            );
            this.statistics.validFunctions += validFunctions.length;
            this.statistics.invalidFunctions +=
              result.length - validFunctions.length;

            return {
              component,
              functions: validFunctions,
              success: true,
              processingTimeMs: Date.now() - startTime,
            };
          }

          this.statistics.validFunctions += result.length;
          return {
            component,
            functions: result,
            success: true,
            processingTimeMs: Date.now() - startTime,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          this.logWarning(
            `Attempt ${attempt}/${this.config.maxRetries} failed for ${component.name}: ${lastError.message}`
          );

          if (attempt < this.config.maxRetries) {
            // Brief delay before retry
            await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          }
        }
      }

      // All retries failed
      this.errorHandler.handleFileError(
        component.fullPath,
        "component processing",
        lastError || new Error("Unknown error")
      );

      return {
        component,
        functions: [],
        success: false,
        errorMessage: lastError?.message || "Processing failed after retries",
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.errorHandler.handleFileError(
        component.fullPath,
        "component processing setup",
        error
      );

      return {
        component,
        functions: [],
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Processes component with timeout protection
   */
  private async processComponentWithTimeout(
    component: ComponentRelation
  ): Promise<FunctionData[]> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(`Component processing timeout (${this.config.timeoutMs}ms)`)
        );
      }, this.config.timeoutMs);

      try {
        const sourceFile = await this.sourceFileManager.getOrCreateSourceFile(
          component.fullPath
        );
        const functions = this.functionExtractor.extractFunctions({
          componentName: component.name,
          sourceFile,
        });

        clearTimeout(timeoutId);
        resolve(functions);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Validates component data
   */
  private isValidComponent(component: ComponentRelation): boolean {
    return !!(
      component &&
      component.name &&
      component.fullPath &&
      typeof component.name === "string" &&
      typeof component.fullPath === "string" &&
      component.name.trim() !== "" &&
      component.fullPath.trim() !== ""
    );
  }

  /**
   * Checks if file is empty or should be skipped
   */
  private async isEmptyFile(filePath: string): Promise<boolean> {
    try {
      const sourceFile = await this.sourceFileManager.getOrCreateSourceFile(
        filePath
      );
      return sourceFile.text.trim().length === 0;
    } catch (error) {
      // If we can't read the file, consider it "empty" for processing purposes
      return true;
    }
  }

  /**
   * Filters valid functions based on validation results
   */
  private filterValidFunctions(
    functions: FunctionData[],
    validationResult: any
  ): FunctionData[] {
    // In non-strict mode, only filter out functions with critical errors
    return functions.filter((_, index) => {
      const functionKey = `${functions[index].componentName}.${functions[index].functionName}`;
      const functionResult = validationResult.functionResults.get(functionKey);
      return !functionResult || functionResult.errors === 0;
    });
  }

  /**
   * Updates validation statistics
   */
  private updateValidationStatistics(validationResult: any): void {
    if (!this.statistics.validationSummary) {
      this.statistics.validationSummary = {
        overallScore: 0,
        issuesByCategory: {},
        issuesBySeverity: {},
      };
    }

    this.statistics.validationSummary.overallScore =
      (this.statistics.validationSummary.overallScore +
        validationResult.overallScore) /
      2;

    Object.keys(validationResult.issuesByCategory).forEach((category) => {
      this.statistics.validationSummary!.issuesByCategory[category] =
        (this.statistics.validationSummary!.issuesByCategory[category] || 0) +
        validationResult.issuesByCategory[category];
    });

    Object.keys(validationResult.issuesBySeverity).forEach((severity) => {
      this.statistics.validationSummary!.issuesBySeverity[severity] =
        (this.statistics.validationSummary!.issuesBySeverity[severity] || 0) +
        validationResult.issuesBySeverity[severity];
    });
  }

  /**
   * Finalizes analysis and updates statistics
   */
  private finalizeAnalysis(
    startTime: number,
    functionDataList: FunctionData[],
    processingResults: ComponentProcessingResult[]
  ): void {
    this.statistics.processingTimeMs = Date.now() - startTime;
    this.statistics.averageTimePerComponent =
      this.statistics.processedComponents > 0
        ? this.statistics.processingTimeMs / this.statistics.processedComponents
        : 0;

    // Update error statistics
    const extractorStats = this.functionExtractor.getExtractionStats();
    this.statistics.errorSummary = {
      totalErrors: extractorStats.totalErrors,
      errorsByCategory: extractorStats.errorsByCategory,
      criticalErrors: this.statistics.errorSummary.criticalErrors,
    };

    // Log final statistics
    this.logAnalysisResults();

    // Clean up resources
    this.sourceFileManager.clearCache();
    this.functionExtractor.clearErrors();
  }

  /**
   * Initializes statistics object
   */
  private initializeStatistics(): AnalysisStatistics {
    return {
      totalComponents: 0,
      processedComponents: 0,
      skippedComponents: 0,
      failedComponents: 0,
      totalFunctions: 0,
      validFunctions: 0,
      invalidFunctions: 0,
      processingTimeMs: 0,
      averageTimePerComponent: 0,
      errorSummary: {
        totalErrors: 0,
        errorsByCategory: {},
        criticalErrors: 0,
      },
    };
  }

  /**
   * Logs analysis results
   */
  private logAnalysisResults(): void {
    const stats = this.statistics;

    this.logInfo("=== Function Analysis Results ===");
    this.logInfo(
      `Components: ${stats.totalComponents} total, ${stats.processedComponents} processed, ${stats.skippedComponents} skipped, ${stats.failedComponents} failed`
    );
    this.logInfo(
      `Functions: ${stats.totalFunctions} total, ${stats.validFunctions} valid, ${stats.invalidFunctions} invalid`
    );
    this.logInfo(
      `Processing: ${
        stats.processingTimeMs
      }ms total, ${stats.averageTimePerComponent.toFixed(
        1
      )}ms average per component`
    );
    this.logInfo(
      `Errors: ${stats.errorSummary.totalErrors} total, ${stats.errorSummary.criticalErrors} critical`
    );

    if (stats.validationSummary) {
      this.logInfo(
        `Validation: ${stats.validationSummary.overallScore.toFixed(
          1
        )} average quality score`
      );
    }

    if (stats.errorSummary.totalErrors > 0) {
      this.logWarning(
        `Analysis completed with ${stats.errorSummary.totalErrors} errors. Check logs for details.`
      );
    }
  }

  /**
   * Gets detailed analysis statistics
   */
  getStatistics(): AnalysisStatistics {
    return { ...this.statistics };
  }

  /**
   * Gets error details for debugging
   */
  getErrors(): any[] {
    return this.errorHandler.getErrors();
  }

  /**
   * Updates analysis configuration
   */
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Recreate ErrorHandler with new configuration if needed
    if (
      newConfig.enableDetailedLogging !== undefined ||
      newConfig.enableErrorRecovery !== undefined
    ) {
      this.errorHandler = new ErrorHandler({
        logErrors: this.config.enableDetailedLogging,
        throwOnCritical: false,
        maxErrorsPerFile: 50,
        includeStackTrace: this.config.enableDetailedLogging,
        enableRecovery: this.config.enableErrorRecovery,
      });
    }
  }

  /**
   * Gets current configuration
   */
  getConfig(): AnalysisConfig {
    return { ...this.config };
  }

  /**
   * Logging utilities
   */
  private logInfo(message: string): void {
    if (this.config.enableDetailedLogging) {
      console.log(`[FunctionAnalyzer] ${message}`);
    }
  }

  private logWarning(message: string): void {
    console.warn(`[FunctionAnalyzer] ${message}`);
  }

  private logError(message: string): void {
    console.error(`[FunctionAnalyzer] ${message}`);
  }

  private logDebug(message: string): void {
    if (this.config.enableDetailedLogging) {
      console.debug(`[FunctionAnalyzer] ${message}`);
    }
  }

  /**
   * Cleanup method for proper resource management
   */
  dispose(): void {
    this.sourceFileManager.clearCache();
    this.functionExtractor.clearErrors();
    this.errorHandler.clearErrors();
  }
}
