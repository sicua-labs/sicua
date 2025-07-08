/**
 * Shared type definitions for data flow analysis extensions
 */

import ts from "typescript";
import { ScanResult } from "../../../types";

export interface DataFlowNode {
  /** Unique identifier for this node */
  id: string;
  /** Variable/property name */
  name: string;
  /** File path where this node exists */
  filePath: string;
  /** Line and column location */
  location: { line: number; column: number };
  /** Type of node (input, processing, output) */
  nodeType: "input" | "processing" | "output";
  /** What makes this node sensitive/risky */
  riskIndicators: string[];
  /** Code snippet for context */
  codeSnippet: string;
  /** Function context where this occurs */
  functionContext?: string;
  /** Component context (for React) */
  componentContext?: string;
  /** AST node reference for further analysis */
  astNode: ts.Node;
  /** Source file reference */
  sourceFile: ts.SourceFile;
  /** Confidence score for this node (0-10) */
  confidence: number;
  /** Additional metadata specific to extension that found this node */
  metadata?: Record<string, unknown>;
}

export interface DataFlowEdge {
  /** Unique identifier for this edge */
  id: string;
  /** Source node */
  from: string; // DataFlowNode.id
  /** Target node */
  to: string; // DataFlowNode.id
  /** Type of connection */
  edgeType: "direct" | "indirect" | "conditional" | "async" | "cross-file";
  /** Confidence that this edge represents real data flow (0-10) */
  confidence: number;
  /** File path where this connection occurs */
  filePath: string;
  /** Code snippet showing the connection */
  codeSnippet: string;
  /** Additional context about the connection */
  connectionContext?: string;
  /** Metadata specific to the extension that created this edge */
  metadata?: Record<string, unknown>;
}

export interface DataFlowPath {
  /** Unique identifier for this flow path */
  id: string;
  /** Nodes in the path (ordered from input to output) */
  nodes: DataFlowNode[];
  /** Edges connecting the nodes */
  edges: DataFlowEdge[];
  /** Overall risk score for this path (0-10) */
  riskScore: number;
  /** Confidence that this represents a real vulnerability (0-10) */
  confidence: number;
  /** Files involved in this path */
  involvedFiles: string[];
  /** Tags categorizing this path */
  tags: string[];
  /** Whether this path crosses file boundaries */
  isCrossFile: boolean;
  /** Whether this path involves async operations */
  hasAsyncFlow: boolean;
}

export interface DataFlowGraph {
  /** All nodes in the graph */
  nodes: Map<string, DataFlowNode>;
  /** All edges in the graph */
  edges: Map<string, DataFlowEdge>;
  /** High-risk paths found in the graph */
  vulnerablePaths: DataFlowPath[];
  /** Statistics about the graph */
  stats: {
    totalNodes: number;
    totalEdges: number;
    inputNodes: number;
    outputNodes: number;
    processingNodes: number;
    crossFileConnections: number;
  };
}

export interface ExtensionContext {
  /** The scan result being analyzed */
  scanResult: ScanResult;
  /** Current data flow graph being built */
  dataFlowGraph: DataFlowGraph;
  /** Other extensions that have already run */
  completedExtensions: string[];
  /** Configuration for this analysis */
  config: DataFlowConfig;
}

export interface DataFlowConfig {
  /** Maximum depth for cross-file tracking */
  maxTrackingDepth: number;
  /** Minimum confidence threshold for including nodes */
  minNodeConfidence: number;
  /** Minimum confidence threshold for including edges */
  minEdgeConfidence: number;
  /** Whether to track React-specific patterns */
  enableReactTracking: boolean;
  /** Whether to track async patterns */
  enableAsyncTracking: boolean;
  /** Whether to track cross-file flows */
  enableCrossFileTracking: boolean;
  /** File patterns to exclude from analysis */
  excludePatterns: string[];
  /** Maximum number of nodes per path */
  maxPathLength: number;
}

export interface ExtensionResult {
  /** Name of the extension that produced this result */
  extensionName: string;
  /** Nodes discovered by this extension */
  nodes: DataFlowNode[];
  /** Edges discovered by this extension */
  edges: DataFlowEdge[];
  /** High-confidence paths found by this extension */
  paths: DataFlowPath[];
  /** Performance metrics */
  metrics: {
    filesAnalyzed: number;
    nodesFound: number;
    edgesFound: number;
    executionTimeMs: number;
  };
  /** Any warnings or issues encountered */
  warnings: string[];
}

export interface DataFlowAnalysisResult {
  /** Final data flow graph */
  graph: DataFlowGraph;
  /** Results from each extension */
  extensionResults: ExtensionResult[];
  /** Overall analysis metrics */
  overallMetrics: {
    totalExecutionTimeMs: number;
    totalFilesAnalyzed: number;
    totalVulnerablePaths: number;
    highConfidencePaths: number;
    crossFilePaths: number;
  };
  /** Configuration used for this analysis */
  config: DataFlowConfig;
}

// Utility types for pattern matching
export type SensitivityLevel = "critical" | "high" | "medium" | "low" | "none";

export interface SensitivityInfo {
  level: SensitivityLevel;
  indicators: string[];
  confidence: number;
  reason: string;
}

export interface NodePattern {
  /** Pattern identifier */
  id: string;
  /** Human readable name */
  name: string;
  /** Function to test if a node matches this pattern */
  matcher: (node: ts.Node, sourceFile: ts.SourceFile) => boolean;
  /** Function to extract data from matching node */
  extractor: (
    node: ts.Node,
    sourceFile: ts.SourceFile
  ) => Partial<DataFlowNode>;
  /** Node type this pattern produces */
  nodeType: "input" | "processing" | "output";
  /** Risk indicators this pattern detects */
  riskIndicators: string[];
  /** Base confidence for nodes found by this pattern */
  baseConfidence: number;
}

export interface EdgePattern {
  /** Pattern identifier */
  id: string;
  /** Human readable name */
  name: string;
  /** Function to test if nodes are connected by this pattern */
  matcher: (
    fromNode: DataFlowNode,
    toNode: DataFlowNode,
    context: ExtensionContext
  ) => boolean;
  /** Function to create edge from matching nodes */
  creator: (
    fromNode: DataFlowNode,
    toNode: DataFlowNode,
    context: ExtensionContext
  ) => Partial<DataFlowEdge>;
  /** Edge type this pattern produces */
  edgeType: "direct" | "indirect" | "conditional" | "async" | "cross-file";
  /** Base confidence for edges found by this pattern */
  baseConfidence: number;
}
