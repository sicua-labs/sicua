import ts from "typescript";
import { ComponentRelation } from "../../types";
import {
  ErrorHandlingCompleteAnalysis,
  ErrorHandlingAnalysisResult,
  FunctionErrorHandling,
} from "../../types/errorHandling.types";
import { FunctionAnalyzer } from "./analyzers/functionAnalyzer";
import { SerializationUtils } from "./utils/serializationUtils";
import { ValidationUtils } from "./utils/validationUtils";
import { LibraryUsage } from "./types/internalTypes";
import { ComponentAnalyzer } from "./analyzers/componentAnalyzer";
import { generateComponentId } from "../../utils/common/analysisUtils";

/**
 * Main analyzer for error handling in React applications
 */
export class ErrorHandlingAnalyzer {
  private program: ts.Program;
  private sourceFiles: Map<string, ts.SourceFile>;
  private components: ComponentRelation[];
  private typeChecker: ts.TypeChecker;

  /**
   * Create a new ErrorHandlingAnalyzer
   *
   * @param files - Array of file paths to analyze
   * @param components - Component relations to analyze
   */
  constructor(files: string[], components: ComponentRelation[]) {
    this.program = ts.createProgram(files, {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
    });

    this.typeChecker = this.program.getTypeChecker();
    this.components = components;
    this.sourceFiles = new Map(
      files.map((filePath) => [filePath, this.program.getSourceFile(filePath)!])
    );
  }

  /**
   * Analyze error handling across all components and functions
   */
  public analyze(): ErrorHandlingCompleteAnalysis {
    // Initialize analysis results
    const results = new Map<string, ErrorHandlingAnalysisResult>();
    let totalErrorBoundaries = 0;
    let totalTryCatch = 0;
    let totalFunctionsWithErrorHandling = 0;
    let totalFunctionsNeedingErrorHandling = 0;
    const functionsWithMissingErrorHandling: string[] = [];
    const riskBreakdown = { high: 0, medium: 0, low: 0 };

    // Analyze all source files for functions first
    this.sourceFiles.forEach((sourceFile, filePath) => {
      const functionAnalyzer = new FunctionAnalyzer(
        sourceFile,
        this.typeChecker
      );
      const functionErrorHandling = functionAnalyzer.analyzeFunctions();

      functionErrorHandling.forEach((func) => {
        if (func.hasErrorHandling) {
          totalFunctionsWithErrorHandling++;
        }

        if (func.riskAnalysis.shouldHaveErrorHandling) {
          totalFunctionsNeedingErrorHandling++;

          if (!func.hasErrorHandling) {
            functionsWithMissingErrorHandling.push(
              `${func.functionName} (${filePath}:${func.location.line})`
            );
          }

          // Categorize risk
          if (func.riskAnalysis.riskScore >= 5) riskBreakdown.high++;
          else if (func.riskAnalysis.riskScore >= 3) riskBreakdown.medium++;
          else riskBreakdown.low++;
        }
      });
    });

    // Analyze components
    for (const component of this.components) {
      const sourceFile = this.sourceFiles.get(component.fullPath);
      if (!sourceFile) continue;

      const componentAnalyzer = new ComponentAnalyzer(
        component,
        sourceFile,
        this.typeChecker
      );

      const result = componentAnalyzer.analyzeComponent();
      const significantResult =
        componentAnalyzer.getSignificantAnalysis(result);

      // Only include significant results
      if (significantResult) {
        results.set(generateComponentId(component), significantResult);
        totalErrorBoundaries += significantResult.errorBoundaries.length;
        totalTryCatch += significantResult.tryCatchBlocks.length;
      }
    }

    const componentsWithErrorHandling = results.size;

    const analysis: ErrorHandlingCompleteAnalysis = {
      componentResults: Object.fromEntries(results),
      summary: {
        totalComponents: this.components.length,
        componentsWithErrorHandling,
        errorHandlingCoverage:
          (componentsWithErrorHandling / this.components.length) * 100,
        totalErrorBoundaries,
        totalTryCatch,
        totalFunctionsWithErrorHandling,
        libraryUsage: this.collectLibraryUsage(results),
        functionErrorHandlingGaps: {
          totalFunctionsNeedingErrorHandling,
          functionsWithMissingErrorHandling,
          riskBreakdown,
        },
      },
    };

    // Verify the result is serializable
    SerializationUtils.verifySerializable(analysis);

    return analysis;
  }

  /**
   * Collect library usage statistics from error boundaries
   */
  private collectLibraryUsage(
    results: Map<string, ErrorHandlingAnalysisResult>
  ): Record<string, number> {
    const usage: LibraryUsage = {};

    results.forEach((result) => {
      result.errorBoundaries.forEach((boundary) => {
        const libName = boundary.library.name;
        usage[libName] = (usage[libName] || 0) + 1;
      });
    });

    return usage;
  }
}
