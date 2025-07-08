import {
  ContextualSummariesConfig,
  ContextualSummary,
  FileRelationship,
} from "./contextualSummaries.types";

export interface AnalysisProgress {
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  stage: AnalysisStage;
  startTime: number;
  estimatedCompletion?: number;
}

export interface AnalysisOptions {
  config: ContextualSummariesConfig;
  parallelProcessing: boolean;
  maxConcurrency: number;
  progressCallback?: (progress: AnalysisProgress) => void;
  errorCallback?: (error: AnalysisError) => void;
  includeMetadata: boolean;
  generateRelationships: boolean;
  optimizePrompts: boolean;
}

export interface AnalysisError {
  filePath: string;
  stage: AnalysisStage;
  error: Error;
  severity: "warning" | "error" | "critical";
  recoverable: boolean;
}

export interface ProcessingStats {
  filesAnalyzed: number;
  errorsEncountered: number;
  averageProcessingTime: number;
  totalTokensGenerated: number;
  compressionRatio: number;
  qualityMetrics: QualityMetrics;
}

export interface QualityMetrics {
  averagePromptQuality: number;
  contextualRelevance: number;
  informationDensity: number;
  tokenEfficiency: number;
}

export interface AnalysisCache {
  fileHashes: Map<string, string>;
  cachedSummaries: Map<string, ContextualSummary>;
  relationshipCache: Map<string, FileRelationship[]>;
  lastAnalysisTime: number;
}

export type AnalysisStage =
  | "initialization"
  | "file-scanning"
  | "dependency-extraction"
  | "function-analysis"
  | "type-analysis"
  | "component-analysis"
  | "business-logic-analysis"
  | "semantic-analysis"
  | "summary-generation"
  | "relationship-analysis"
  | "optimization"
  | "finalization";
