import {
  FileContextType,
  PromptSection,
  ComplexityLevel,
} from "./contextualSummaries.types";

export interface SummaryTemplate {
  name: string;
  fileTypes: FileContextType[];
  structure: TemplateStructure;
  style: PromptStyle;
  maxTokens: number;
  priority: SectionPriority;
}

export interface TemplateStructure {
  header: HeaderTemplate;
  sections: SectionTemplate[];
  footer: FooterTemplate;
  connectors: PromptConnector[];
}

export interface HeaderTemplate {
  format: string;
  includeFileInfo: boolean;
  includeComplexity: boolean;
  includePurpose: boolean;
}

export interface SectionTemplate {
  id: PromptSection;
  title: string;
  format: SectionFormat;
  required: boolean;
  maxTokens: number;
  priority: number;
  conditions: SectionCondition[];
}

export interface FooterTemplate {
  format: string;
  includeRecommendations: boolean;
  includeRelatedFiles: boolean;
  includeNextSteps: boolean;
}

export interface PromptConnector {
  between: [PromptSection, PromptSection];
  text: string;
  conditional: boolean;
}

export interface SectionPriority {
  high: PromptSection[];
  medium: PromptSection[];
  low: PromptSection[];
}

export interface SectionCondition {
  type:
    | "has-content"
    | "complexity-level"
    | "file-type"
    | "business-domain"
    | "custom";
  value: string | ComplexityLevel | FileContextType;
  operator: "equals" | "contains" | "greater-than" | "less-than";
}

export interface PromptOptimization {
  compressionLevel: "none" | "light" | "moderate" | "aggressive";
  preserveKeyInfo: boolean;
  removeRedundancy: boolean;
  abbreviateNames: boolean;
  useShortcuts: boolean;
}

export interface ContextualMetadata {
  fileSize: number;
  lastModified: string;
  gitInfo?: GitMetadata;
  projectContext?: ProjectMetadata;
  relatedFiles?: RelatedFileInfo[];
}

export interface GitMetadata {
  branch: string;
  lastCommit: string;
  author: string;
  changeFrequency: "low" | "medium" | "high";
}

export interface ProjectMetadata {
  name: string;
  framework: string;
  architecture: string;
  conventions: string[];
}

export interface RelatedFileInfo {
  path: string;
  relationship: "imports" | "exports-to" | "tests" | "similar-purpose";
  relevance: number;
}

export type PromptStyle =
  | "concise"
  | "detailed"
  | "technical"
  | "business"
  | "educational"
  | "documentation";

export type SectionFormat =
  | "paragraph"
  | "bullet-points"
  | "code-snippet"
  | "table"
  | "numbered-list"
  | "key-value"
  | "narrative";

export interface PromptPersonalization {
  targetAudience:
    | "developer"
    | "architect"
    | "business-analyst"
    | "ai-assistant"
    | "documentation";
  experienceLevel: "junior" | "intermediate" | "senior" | "expert";
  context:
    | "code-review"
    | "refactoring"
    | "learning"
    | "documentation"
    | "debugging"
    | "general";
  domain: "frontend" | "backend" | "fullstack" | "devops" | "data" | "general";
}

export interface AdaptivePromptFeatures {
  dynamicLength: boolean;
  contextAwareness: boolean;
  intelligentFiltering: boolean;
  relevanceScoring: boolean;
  semanticClustering: boolean;
}

// Additional type definitions
export interface PromptConstraints {
  maxTokens?: number;
  maxSections?: number;
  requiredSections?: PromptSection[];
  excludedSections?: PromptSection[];
}

export type SpecializedUseCase =
  | "code-review"
  | "documentation"
  | "refactoring"
  | "learning"
  | "debugging"
  | "api-reference";

export interface SpecializationOptions {
  includeExamples?: boolean;
  detailLevel?: "brief" | "standard" | "comprehensive";
  focusAreas?: string[];
  excludeAreas?: string[];
}
