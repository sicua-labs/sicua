import {
  ComponentRelation,
  ComponentSimilarity,
  JSXStructure,
  PropSignature,
} from "../../../types";
import ts from "typescript";

/**
 * Extended component information with AST details
 */
export interface EnhancedComponentRelation extends ComponentRelation {
  sourceFile?: ts.SourceFile;
  componentNode?: ts.VariableDeclaration | ts.FunctionDeclaration;
}

/**
 * Context for component comparison operations
 */
export interface ComparisonContext {
  sourceFiles: Map<string, ts.SourceFile>;
}

/**
 * Result of a component comparison
 */
export interface ComparisonResult {
  componentPaths: string[];
  commonProps: PropSignature[];
  commonStructure: JSXStructure[];
  similarityScore: number;
  propsScore: number;
  structureScore: number;
  childComponentScore: number;
  styleScore: number;
}

/**
 * Information about a component's structure complexity
 */
export interface StructureComplexityInfo {
  totalNodes: number;
  maxDepth: number;
  componentCount: number;
  complexity: number;
}

/**
 * Flattened representation of JSX structure for comparison
 */
export interface FlattenedJSXNode {
  tagName: string;
  depth: number;
  path: string;
  className?: string;
  props: { name: string; value: string }[];
}

/**
 * Class name analysis for style comparison
 */
export interface ClassNameAnalysis {
  all: Set<string>;
  byComponent: Map<string, Set<string>>;
  common: string[];
}

/**
 * Component grouping information
 */
export interface ComponentGroup {
  componentPaths: Set<string>;
  similarities: ComparisonResult[];
}

/**
 * Component type categorization
 */
export enum ComponentType {
  Page = "page",
  Component = "component",
  Layout = "layout",
  Feature = "feature",
  Other = "other",
}

/**
 * Configuration for similarity comparison thresholds
 */
export interface SimilarityThresholds {
  nameDistanceThreshold: number;
  minSimilarityScore: number;
  minStructureComplexity: number;
  minComplexityRatio: number;
}

/**
 * Balanced similarity thresholds - not too strict, not too lenient
 */
export const DEFAULT_SIMILARITY_THRESHOLDS: SimilarityThresholds = {
  nameDistanceThreshold: 0.7,
  minSimilarityScore: 0.8, // Raised from 0.7 to 0.8
  minStructureComplexity: 3, // Raised from 2 to 3
  minComplexityRatio: 0.7, // Raised from 0.6 to 0.7
};

/**
 * Common UI patterns that should be weighted less in similarity calculation
 */
export const COMMON_UI_PATTERNS = [
  "Alert",
  "AlertTitle",
  "AlertDescription",
  "AlertCircle",
  "Card",
  "CardHeader",
  "CardTitle",
  "CardContent",
  "Button",
  "Input",
  "Label",
  "div",
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "Separator",
  "Badge",
];

// Internal interfaces for component grouping
export interface GroupData {
  componentPaths: Set<string>;
  similarities: ComponentSimilarity[];
}
