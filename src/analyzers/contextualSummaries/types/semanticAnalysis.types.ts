import { ComplexityLevel } from "./contextualSummaries.types";

export interface SemanticAnalysisResult {
  fileSemantics: FileSemantics;
  architecturalPatterns: ArchitecturalPatternAnalysis;
  codeQuality: CodeQualityAnalysis;
  designPatterns: DesignPatternAnalysis;
  relationshipAnalysis: RelationshipAnalysis;
  contextualInsights: ContextualInsight[];
  recommendations: Recommendation[];
  riskFactors: RiskFactor[];
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface FileSemantics {
  primaryPurpose: string;
  secondaryPurposes: string[];
  domainConcepts: DomainConcept[];
  technicalConcepts: TechnicalConcept[];
  businessValue: BusinessValue;
  complexity: SemanticComplexity;
  maintainability: MaintainabilityMetrics;
  cohesion: CohesionAnalysis;
  coupling: CouplingAnalysis;
}

export interface ArchitecturalPatternAnalysis {
  layerIdentification: LayerInfo;
  separationOfConcerns: SeparationAnalysis;
  designPrinciples: DesignPrincipleAdherence;
  codeSmells: CodeSmell[];
  architecturalDebt: ArchitecturalDebt[];
}

export interface CodeQualityAnalysis {
  readability: ReadabilityMetrics;
  testability: TestabilityMetrics;
  performance: PerformanceMetrics;
  security: SecurityMetrics;
  maintainability: MaintainabilityScore;
  reliability: ReliabilityMetrics;
  overallQualityScore: number;
}

export interface DesignPatternAnalysis {
  detectedPatterns: DetectedPattern[];
  missingPatterns: MissingPatternOpportunity[];
  patternMisuse: PatternMisuseWarning[];
  patternEvolution: PatternEvolutionSuggestion[];
}

export interface RelationshipAnalysis {
  dependencyStrength: DependencyStrengthAnalysis;
  coupling: CouplingMetrics;
  cohesion: CohesionMetrics;
  fanIn: number;
  fanOut: number;
  instability: number;
  abstractness: number;
  distance: number;
}

export interface ContextualInsight {
  type: InsightType;
  category: InsightCategory;
  priority: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string[];
  impact: ImpactAnalysis;
  actionable: boolean;
  effort: "low" | "medium" | "high";
}

export interface Recommendation {
  type: RecommendationType;
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  rationale: string;
  benefits: string[];
  implementation: ImplementationGuidance;
  riskLevel: "low" | "medium" | "high";
  estimatedEffort: EffortEstimate;
}

export interface RiskFactor {
  type: RiskType;
  severity: "low" | "medium" | "high" | "critical";
  probability: "low" | "medium" | "high";
  impact: string;
  description: string;
  mitigation: MitigationStrategy;
  indicators: string[];
}

export interface OptimizationOpportunity {
  type: OptimizationType;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  description: string;
  currentState: string;
  proposedState: string;
  benefits: OptimizationBenefit[];
  prerequisites: string[];
  metrics: OptimizationMetrics;
}

export interface DomainConcept {
  name: string;
  type: "entity" | "value-object" | "service" | "aggregate" | "repository";
  confidence: number;
  context: string;
  relationships: ConceptRelationship[];
}

export interface TechnicalConcept {
  name: string;
  type: "framework" | "library" | "pattern" | "architecture" | "tool";
  usage: TechnicalUsage;
  effectiveness: number;
  alternatives: AlternativeOption[];
}

export interface BusinessValue {
  userImpact: "low" | "medium" | "high";
  businessCriticality: "low" | "medium" | "high" | "critical";
  frequencyOfUse: "rarely" | "occasionally" | "frequently" | "constantly";
  revenueImpact: "none" | "indirect" | "direct" | "critical";
  complianceRelevance: boolean;
}

export interface SemanticComplexity {
  conceptualComplexity: number;
  interactionComplexity: number;
  dataComplexity: number;
  algorithmicComplexity: number;
  overallComplexity: ComplexityLevel;
  complexityTrends: ComplexityTrend[];
}

export interface LayerInfo {
  identifiedLayer: ApplicationLayer;
  layerPurity: number;
  crossLayerDependencies: CrossLayerDependency[];
  layerViolations: LayerViolation[];
}

export interface SeparationAnalysis {
  concerns: IdentifiedConcern[];
  separation: SeparationQuality;
  violations: SeparationViolation[];
  improvements: SeparationImprovement[];
}

export interface DesignPrincipleAdherence {
  solid: SOLIDAnalysis;
  dry: DRYAnalysis;
  kiss: KISSAnalysis;
  yagni: YAGNIAnalysis;
  overallAdherence: number;
}

export interface CodeSmell {
  type: CodeSmellType;
  severity: "low" | "medium" | "high";
  description: string;
  location: string;
  refactoringStrategy: RefactoringStrategy;
  urgency: "low" | "medium" | "high";
}

export interface ArchitecturalDebt {
  type: DebtType;
  principal: number;
  interest: number;
  totalCost: number;
  payoffStrategy: PayoffStrategy;
  timeToPayoff: string;
}

export interface DetectedPattern {
  name: string;
  type: PatternType;
  confidence: number;
  implementation: PatternImplementation;
  effectiveness: PatternEffectiveness;
  variants: PatternVariant[];
}

export interface MissingPatternOpportunity {
  pattern: string;
  benefit: string;
  applicability: number;
  implementationComplexity: "low" | "medium" | "high";
  expectedImpact: ExpectedImpact;
}

export interface PatternMisuseWarning {
  pattern: string;
  issue: string;
  severity: "low" | "medium" | "high";
  correction: string;
  consequences: string[];
}

export interface DependencyStrengthAnalysis {
  strongDependencies: StrongDependency[];
  weakDependencies: WeakDependency[];
  circularDependencies: CircularDependency[];
  dependencyHealth: DependencyHealth;
}

// Type definitions for enums and unions
export type InsightType =
  | "architecture"
  | "performance"
  | "maintainability"
  | "security"
  | "business-logic"
  | "design-pattern"
  | "code-quality"
  | "dependency";

export type InsightCategory =
  | "opportunity"
  | "risk"
  | "improvement"
  | "warning"
  | "optimization"
  | "best-practice";

export type RecommendationType =
  | "refactoring"
  | "architecture"
  | "performance"
  | "security"
  | "maintainability"
  | "testing"
  | "documentation"
  | "dependency";

export type RiskType =
  | "technical-debt"
  | "security-vulnerability"
  | "performance-bottleneck"
  | "maintainability-issue"
  | "dependency-risk"
  | "compliance-risk"
  | "business-continuity";

export type OptimizationType =
  | "performance"
  | "memory"
  | "bundle-size"
  | "runtime"
  | "maintainability"
  | "testability"
  | "security"
  | "accessibility";

export type ApplicationLayer =
  | "presentation"
  | "business"
  | "data"
  | "infrastructure"
  | "domain"
  | "application"
  | "utility"
  | "cross-cutting";

export type CodeSmellType =
  | "long-method"
  | "large-class"
  | "duplicate-code"
  | "dead-code"
  | "shotgun-surgery"
  | "feature-envy"
  | "data-clumps"
  | "primitive-obsession";

export type PatternType =
  | "creational"
  | "structural"
  | "behavioral"
  | "architectural"
  | "concurrency"
  | "enterprise"
  | "react"
  | "functional";

export type DebtType =
  | "code-debt"
  | "design-debt"
  | "architecture-debt"
  | "test-debt"
  | "documentation-debt"
  | "infrastructure-debt";

// Additional complex interfaces
export interface ImpactAnalysis {
  scope: "local" | "module" | "application" | "system";
  stakeholders: string[];
  timeframe: "immediate" | "short-term" | "medium-term" | "long-term";
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface ImplementationGuidance {
  steps: ImplementationStep[];
  prerequisites: string[];
  constraints: string[];
  alternatives: string[];
  successCriteria: string[];
}

export interface EffortEstimate {
  timeInHours: number;
  complexity: "simple" | "moderate" | "complex" | "very-complex";
  skillLevel: "junior" | "intermediate" | "senior" | "expert";
  dependencies: string[];
}

export interface MitigationStrategy {
  approach: "prevention" | "detection" | "response" | "recovery";
  actions: MitigationAction[];
  timeline: string;
  cost: "low" | "medium" | "high";
  effectiveness: number;
}

export interface TechnicalUsage {
  frequency: "rare" | "occasional" | "frequent" | "extensive";
  depth: "surface" | "moderate" | "deep" | "expert";
  appropriateness: number;
  mastery: number;
}

export interface AlternativeOption {
  name: string;
  advantages: string[];
  disadvantages: string[];
  migrationPath: string;
  feasibility: number;
}

export interface ComplexityTrend {
  metric: string;
  direction: "increasing" | "stable" | "decreasing";
  rate: number;
  projection: string;
}

export interface SOLIDAnalysis {
  singleResponsibility: ComplianceScore;
  openClosed: ComplianceScore;
  liskovSubstitution: ComplianceScore;
  interfaceSegregation: ComplianceScore;
  dependencyInversion: ComplianceScore;
}

export interface ComplianceScore {
  score: number;
  violations: string[];
  recommendations: string[];
}

export interface DRYAnalysis {
  duplicationLevel: number;
  duplicatedConcepts: DuplicatedConcept[];
  consolidationOpportunities: ConsolidationOpportunity[];
}

export interface DuplicatedConcept {
  concept: string;
  instances: string[];
  similarity: number;
  consolidationComplexity: "low" | "medium" | "high";
}

export interface ConsolidationOpportunity {
  description: string;
  effort: "low" | "medium" | "high";
  benefit: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high";
}

// Additional interface definitions needed for the implementation
export interface ConceptRelationship {
  type: "inheritance" | "composition" | "association" | "dependency";
  target: string;
  strength: "weak" | "medium" | "strong";
}

export interface MaintainabilityMetrics {
  score: number;
  factors: MaintainabilityFactor[];
  trends: string[];
  projections: string[];
}

export interface MaintainabilityFactor {
  name: string;
  impact: number;
  description: string;
}

export interface CohesionAnalysis {
  score: number;
  type:
    | "functional"
    | "sequential"
    | "logical"
    | "procedural"
    | "temporal"
    | "communicational";
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface CouplingAnalysis {
  score: number;
  type: "loose" | "medium" | "tight";
  dependencies: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface ReadabilityMetrics {
  score: number;
}

export interface TestabilityMetrics {
  score: number;
}

export interface PerformanceMetrics {
  score: number;
}

export interface SecurityMetrics {
  score: number;
  vulnerabilities: SecurityVulnerability[];
  complianceLevel: "none" | "basic" | "standard" | "strict";
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface MaintainabilityScore {
  score: number;
  factors: MaintainabilityFactor[];
  codeSmells: number;
  technicalDebt: number;
}

export interface ReliabilityMetrics {
  score: number;
  errorHandling: number;
  testCoverage: number;
  faultTolerance: number;
}

export interface SecurityVulnerability {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  location: string;
}

export interface ImplementationStep {
  order: number;
  description: string;
  estimatedTime: string;
}

export interface MitigationAction {
  description: string;
  timeline: string;
  responsible: string;
}

export interface OptimizationBenefit {
  type: string;
  value: string;
  quantifiable: boolean;
}

export interface OptimizationMetrics {
  baseline: { [key: string]: string };
  target: { [key: string]: string };
  measurement: string;
}

export interface CrossLayerDependency {
  from: ApplicationLayer;
  to: ApplicationLayer;
  type: "acceptable" | "violation";
  description: string;
}

export interface LayerViolation {
  description: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
}

export interface IdentifiedConcern {
  name: string;
  type: "business" | "technical" | "infrastructure";
  separation: "good" | "poor" | "mixed";
}

export interface SeparationQuality {
  score: number;
  level: "excellent" | "good" | "fair" | "poor";
}

export interface SeparationViolation {
  concern1: string;
  concern2: string;
  description: string;
  impact: "low" | "medium" | "high";
}

export interface SeparationImprovement {
  description: string;
  effort: "low" | "medium" | "high";
  benefit: "low" | "medium" | "high";
}

export interface KISSAnalysis {
  score: number;
  complexityViolations: string[];
  simplificationOpportunities: string[];
}

export interface YAGNIAnalysis {
  score: number;
  overEngineering: string[];
  unnecessaryFeatures: string[];
}

export interface RefactoringStrategy {
  approach:
    | "extract-method"
    | "extract-class"
    | "inline"
    | "move-method"
    | "rename";
  steps: string[];
  effort: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
}

export interface PayoffStrategy {
  approach: "incremental" | "big-bang" | "gradual";
  timeline: string;
  resources: string[];
  milestones: string[];
}

export interface PatternImplementation {
  quality: "poor" | "adequate" | "good" | "excellent";
  completeness: number;
  adherence: number;
  documentation: boolean;
}

export interface PatternEffectiveness {
  score: number;
  benefits: string[];
  drawbacks: string[];
  appropriateness: number;
}

export interface PatternVariant {
  name: string;
  description: string;
  usage: "rare" | "occasional" | "common";
}

export interface ExpectedImpact {
  maintainability: number;
  performance: number;
  testability: number;
  reusability: number;
}

export interface PatternEvolutionSuggestion {
  currentPattern: string;
  suggestedPattern: string;
  rationale: string;
  migrationPath: string[];
  benefits: string[];
  risks: string[];
}

export interface StrongDependency {
  from: string;
  to: string;
  type: "inheritance" | "composition" | "tight-coupling";
  strength: number;
  reason: string;
}

export interface WeakDependency {
  from: string;
  to: string;
  type: "interface" | "event" | "loose-coupling";
  strength: number;
  reason: string;
}

export interface CircularDependency {
  cycle: string[];
  severity: "low" | "medium" | "high";
  breakingPoint: string;
  resolution: string;
}

export interface DependencyHealth {
  score: number;
  issues: string[];
  strengths: string[];
  recommendations: string[];
}

export interface CouplingMetrics {
  afferentCoupling: number;
  efferentCoupling: number;
  instability: number;
  coupling: "loose" | "medium" | "tight";
}

export interface CohesionMetrics {
  cohesionLevel: number;
  cohesionType: "functional" | "sequential" | "logical";
  score: number;
}
