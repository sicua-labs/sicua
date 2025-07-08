import ts from "typescript";
import {
  ComplexTypeInfo,
  TypeSimplificationSuggestion,
  TypeDuplication,
  UnifiedTypeInfo,
} from "../../../types";

/**
 * Internal types used by the type analyzer module
 */

/**
 * Interface for the structural signature of a type
 */
export interface TypeSignature {
  kind: ts.SyntaxKind;
  properties: Map<string, string>;
  methods: Map<string, string>;
  extends: string[];
  signature: string; // A hash or fingerprint of the type structure
}

/**
 * Interface for collected type information
 */
export interface TypeDefinition {
  name: string;
  filePath: string;
  node: ts.Node;
  signature: TypeSignature;
  usages: Set<string>; // Files that use this type
  location: {
    line: number;
    column: number;
  };
}

/**
 * Type for registry of collected types
 */
export type TypeRegistry = Map<string, TypeDefinition>;

/**
 * Map of signatures to type IDs for finding duplicates
 */
export type SignatureToTypesMap = Map<string, string[]>;

/**
 * Type for tracking directory-based type organization
 */
export interface DirectoryTypes {
  interfaces: string[];
  types: string[];
  enums: string[];
  classes: string[];
}

/**
 * Type for mapping directories to their types
 */
export type TypesByDirectoryMap = Record<string, DirectoryTypes>;

/**
 * Types related to component analysis
 */
export interface ComponentTypeInfo {
  name: string;
  hasPropsType: boolean;
  propsTypeName?: string;
  filePath: string;
}

/**
 * File filtering criteria for type analysis
 */
export interface TypeFileFilter {
  includeTests?: boolean;
  includeDts?: boolean;
  includeNodeModules?: boolean;
  fileNamePattern?: RegExp;
}

/**
 * Configuration options for type analysis
 */
export interface TypeAnalysisOptions {
  /**
   * Types of analysis to perform
   */
  analyzeDuplicates?: boolean;
  analyzeComplexTypes?: boolean;
  analyzeComponentProps?: boolean;
  analyzeUsage?: boolean;
  generateUnifiedTypes?: boolean;

  /**
   * File filtering options
   */
  fileFilter?: TypeFileFilter;

  /**
   * Performance options
   */
  maxFilesToAnalyze?: number;
  maxTypesToAnalyze?: number;
  batchSize?: number;

  /**
   * Output options
   */
  maxReportedIssues?: number;
  maxDuplicateSuggestions?: number;
  maxUnifiedTypeSuggestions?: number;
}

/**
 * Type duplication group
 */
export interface DuplicateTypeGroup {
  primaryType: TypeDefinition;
  duplicates: TypeDefinition[];
  matchScore: number;
}

/**
 * Similar types group for unified type generation
 */
export interface SimilarTypesGroup {
  types: TypeDefinition[];
  similarityScore: number;
}
