/**
 * Types for complexity analysis
 */

// Complexity analysis types
export interface ComplexityAnalysisResult {
  componentComplexity: { [key: string]: number };
  couplingDegree: { [key: string]: number };
  cyclomaticComplexity: { [key: string]: number };
  maintainabilityIndex: { [key: string]: number };
  cognitiveComplexity: { [key: string]: number };
}
