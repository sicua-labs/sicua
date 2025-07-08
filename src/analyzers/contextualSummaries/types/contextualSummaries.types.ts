/**
 * Core types for contextual summaries analysis
 */

export interface ContextualSummary {
  filePath: string;
  fileName: string;
  fileType: FileContextType;
  purpose: string;
  complexity: ComplexityLevel;
  keyFeatures: string[];
  dependencies: DependencyContext;
  exports: ExportContext;
  businessLogic: BusinessLogicContext;
  technicalContext: TechnicalContext;
  usagePatterns: UsagePattern[];
  prompt: GeneratedPrompt;
}

export interface DependencyContext {
  external: ExternalDependency[];
  internal: InternalDependency[];
  reactSpecific: ReactDependency[];
  utilityImports: string[];
}

export interface ExternalDependency {
  name: string;
  purpose: DependencyPurpose;
  criticality: "high" | "medium" | "low";
}

export interface InternalDependency {
  path: string;
  relationship: DependencyRelationship;
  usageType: "component" | "utility" | "type" | "constant" | "hook";
}

export interface ReactDependency {
  hooks: string[];
  components: string[];
  patterns: ReactPattern[];
}

export interface ExportContext {
  primary: PrimaryExport;
  secondary: SecondaryExport[];
  reexports: string[];
}

export interface PrimaryExport {
  name: string;
  type: ExportType;
  signature?: string;
  purpose: string;
}

export interface SecondaryExport {
  name: string;
  type: ExportType;
  relationship: "helper" | "type" | "constant" | "utility";
}

export interface BusinessLogicContext {
  domain: string;
  operations: BusinessOperation[];
  dataFlow: DataFlowPattern[];
  sideEffects: SideEffect[];
}

export interface BusinessOperation {
  name: string;
  purpose: string;
  complexity: ComplexityLevel;
  inputs: string[];
  outputs: string[];
}

export interface DataFlowPattern {
  pattern:
    | "state-management"
    | "data-fetching"
    | "event-handling"
    | "side-effect"
    | "computation";
  description: string;
  triggers: string[];
}

export interface SideEffect {
  type:
    | "api-call"
    | "dom-manipulation"
    | "storage"
    | "navigation"
    | "external-service";
  description: string;
  conditions: string[];
}

export interface TechnicalContext {
  language: "typescript" | "javascript";
  framework: FrameworkContext;
  patterns: TechnicalPattern[];
  performance: PerformanceContext;
}

export interface FrameworkContext {
  type: "react" | "next" | "node" | "utility";
  version?: string;
  specificFeatures: string[];
}

export interface TechnicalPattern {
  pattern:
    | "hoc"
    | "render-props"
    | "custom-hook"
    | "context"
    | "reducer"
    | "middleware"
    | "decorator";
  implementation: string;
}

export interface PerformanceContext {
  optimizations: string[];
  potentialIssues: string[];
  memoization: boolean;
  lazyLoading: boolean;
}

export interface UsagePattern {
  pattern: UsagePatternType;
  frequency: "high" | "medium" | "low";
  context: string;
  examples: string[];
}

export interface GeneratedPrompt {
  summary: string;
  structure: PromptStructure;
  context: PromptContext[];
  tokens: TokenEstimate;
}

export interface PromptStructure {
  header: string;
  keyPoints: string[];
  dependencies: string;
  exports: string;
  footer?: string;
}

export interface PromptContext {
  section: PromptSection;
  content: string;
  priority: "high" | "medium" | "low";
}

export interface TokenEstimate {
  approximate: number;
  compressionRatio: number;
  originalSize: number;
}

/**
 * Analysis result for the entire project
 */
export interface ContextualSummariesAnalysisResult {
  summaries: ContextualSummary[];
  projectContext: ProjectContext;
  relationships: FileRelationship[];
  statistics: AnalysisStatistics;
  promptTemplates: PromptTemplate[];
}

export interface ProjectContext {
  architecture: ProjectArchitecture;
  mainPatterns: string[];
  technicalStack: string[];
  complexity: ComplexityLevel;
}

export interface ProjectArchitecture {
  type: "spa" | "ssr" | "static" | "library" | "api" | "mixed";
  structure: "feature-based" | "layer-based" | "atomic" | "mixed" | "flat";
  modules: ModuleContext[];
}

export interface ModuleContext {
  name: string;
  purpose: string;
  files: string[];
  dependencies: string[];
}

export interface FileRelationship {
  source: string;
  target: string;
  relationship: RelationshipType;
  strength: "strong" | "medium" | "weak";
  context: string;
}

export interface AnalysisStatistics {
  totalFiles: number;
  averageComplexity: ComplexityLevel;
  tokenReduction: TokenReductionStats;
  patternDistribution: PatternDistribution;
}

export interface TokenReductionStats {
  originalTokens: number;
  reducedTokens: number;
  reductionPercentage: number;
  averageCompressionRatio: number;
}

export interface PatternDistribution {
  [key: string]: {
    count: number;
    percentage: number;
  };
}

export interface PromptTemplate {
  name: string;
  purpose: string;
  template: string;
  variables: string[];
  applicableFileTypes: FileContextType[];
}

/**
 * Enums and union types
 */
export type FileContextType =
  | "react-component"
  | "react-hook"
  | "utility"
  | "type-definition"
  | "api-route"
  | "middleware"
  | "config"
  | "test"
  | "style"
  | "constant"
  | "service"
  | "business-logic";

export type ComplexityLevel = "low" | "medium" | "high" | "very-high";

export type DependencyPurpose =
  | "ui-library"
  | "state-management"
  | "routing"
  | "data-fetching"
  | "styling"
  | "utility"
  | "testing"
  | "build-tool"
  | "validation"
  | "date-time"
  | "animation"
  | "form-handling";

export type DependencyRelationship =
  | "parent-child"
  | "sibling"
  | "utility-consumer"
  | "type-provider"
  | "service-consumer"
  | "config-consumer";

export type ReactPattern =
  | "functional-component"
  | "class-component"
  | "custom-hook"
  | "context-provider"
  | "context-consumer"
  | "hoc"
  | "render-props"
  | "compound-component"
  | "controlled-component"
  | "uncontrolled-component";

export type ExportType =
  | "default-function"
  | "default-class"
  | "default-object"
  | "named-function"
  | "named-class"
  | "named-object"
  | "named-type"
  | "named-interface"
  | "named-enum"
  | "named-constant";

export type UsagePatternType =
  | "data-transformation"
  | "event-handling"
  | "state-management"
  | "api-integration"
  | "ui-composition"
  | "validation"
  | "error-handling"
  | "performance-optimization"
  | "business-logic"
  | "utility-function";

export type PromptSection =
  | "overview"
  | "structure"
  | "dependencies"
  | "exports"
  | "business-logic"
  | "technical-details"
  | "usage-examples"
  | "relationships";

export type RelationshipType =
  | "imports"
  | "extends"
  | "implements"
  | "uses"
  | "configures"
  | "tests"
  | "styles"
  | "provides-data"
  | "consumes-data";

/**
 * Configuration for contextual summaries analysis
 */
export interface ContextualSummariesConfig {
  maxPromptLength: number;
  includeCodeExamples: boolean;
  prioritizeBusinessLogic: boolean;
  includePerformanceNotes: boolean;
  templatePreference: "concise" | "detailed" | "technical" | "business";
  customPatterns: CustomPattern[];
}

export interface CustomPattern {
  name: string;
  matcher: RegExp | string;
  description: string;
  category: string;
}
