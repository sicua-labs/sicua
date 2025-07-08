import ts from "typescript";

export interface HalsteadMetrics {
  n1: number; // Number of distinct operators
  n2: number; // Number of distinct operands
  N1: number; // Total number of operators
  N2: number; // Total number of operands
}

export interface MetricsCalculationInput {
  content: string;
  filePath: string;
  sourceFile: ts.SourceFile;
}
