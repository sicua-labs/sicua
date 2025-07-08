import ts from "typescript";
import { ErrorHandlingLocation } from "../../../types/errorHandling.types";

/**
 * Internal types used by the error handling analyzer module
 */

/**
 * Represents an error state entry during analysis
 */
export interface ErrorStateEntry {
  setter: string;
  location: ErrorHandlingLocation;
  initialValue: any;
}

/**
 * Map of error state names to their entry data
 */
export type ErrorStatesMap = Map<string, ErrorStateEntry>;

/**
 * Configuration for error boundary libraries
 */
export interface ErrorBoundaryLibraryConfig {
  componentNames: string[];
  importPaths: string[];
  propPatterns: Record<string, RegExp[]>;
}

/**
 * Result of a node source location lookup
 */
export interface NodeLocation {
  node: ts.Node;
  sourceFile: ts.SourceFile;
  location: ErrorHandlingLocation;
}

/**
 * Represents a library usage count
 */
export interface LibraryUsage {
  [key: string]: number;
}

/**
 * Analysis options for the error handling analyzer
 */
export interface ErrorHandlingAnalysisOptions {
  /**
   * Whether to include all functions or only those with error handling
   */
  includeAllFunctions?: boolean;

  /**
   * Minimum risk score threshold for functions that should have error handling
   */
  riskScoreThreshold?: number;

  /**
   * Whether to analyze error boundaries from specific libraries
   */
  errorBoundaryLibraries?: string[];
}
