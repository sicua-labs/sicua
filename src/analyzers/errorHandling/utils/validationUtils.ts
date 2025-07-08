import {
  ErrorHandlingAnalysisResult,
  FunctionErrorHandling,
} from "../../../types/errorHandling.types";

/**
 * Utilities for validating error handling analysis results
 */
export class ValidationUtils {
  /**
   * Validates the structure of an error handling analysis result
   */
  public static validateErrorHandlingResult(
    result: ErrorHandlingAnalysisResult
  ): boolean {
    try {
      // Validate error boundaries
      result.errorBoundaries.forEach((boundary) => {
        if (!boundary.location || !boundary.library || !boundary.props) {
          throw new Error("Invalid error boundary structure");
        }
      });

      // Validate try-catch blocks
      result.tryCatchBlocks.forEach((block) => {
        if (!block.location || !block.scope) {
          throw new Error("Invalid try-catch block structure");
        }
      });

      // Validate error states
      result.errorStates.forEach((state) => {
        if (!state.name || !state.setter || !state.location || !state.usage) {
          throw new Error("Invalid error state structure");
        }
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if a function error handling analysis is significant enough to include
   */
  public static isSignificantFunctionErrorHandling(
    func: FunctionErrorHandling
  ): boolean {
    const hasErrorHandling =
      func.tryCatchBlocks.length > 0 ||
      func.errorHandlingPatterns.length > 0 ||
      func.errorPropagation.throws ||
      func.errorPropagation.rethrows ||
      func.errorPropagation.asyncHandling ||
      func.errorPropagation.customErrorClasses.length > 0 ||
      func.errorTypes.size > 0;

    // Include in results if it either has error handling or should have it
    return hasErrorHandling || func.riskAnalysis.shouldHaveErrorHandling;
  }

  /**
   * Checks if an error handling result is significant enough to include
   */
  public static isSignificantErrorHandlingResult(
    result: ErrorHandlingAnalysisResult
  ): boolean {
    return (
      result.errorBoundaries.length > 0 ||
      result.tryCatchBlocks.length > 0 ||
      result.errorStates.length > 0 ||
      result.fallbackElements.length > 0 ||
      result.errorPatterns.length > 0 ||
      (result.functionErrorHandling?.some((f) =>
        ValidationUtils.isSignificantFunctionErrorHandling(f)
      ) ??
        false)
    );
  }
}
