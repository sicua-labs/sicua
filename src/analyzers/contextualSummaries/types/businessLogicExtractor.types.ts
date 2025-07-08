import {
  BusinessOperation,
  DataFlowPattern,
  SideEffect,
} from "./contextualSummaries.types";

export interface BusinessLogicDefinition {
  domain: string;
  operations: BusinessOperation[];
  dataFlow: DataFlowPattern[];
  sideEffects: SideEffect[];
  complexity: BusinessComplexity;
  patterns: BusinessPatterns;
  quality: BusinessQuality;
  dependencies: BusinessDependencies;
  rules: BusinessRule[];
  workflows: WorkflowDefinition[];
  validations: ValidationDefinition[];
  transformations: DataTransformation[];
}

export interface BusinessComplexity {
  operationalComplexity: number;
  dataComplexity: number;
  logicalComplexity: number;
  integrationComplexity: number;
  overallComplexity: "low" | "medium" | "high" | "very-high";
  complexityFactors: ComplexityFactor[];
}

export interface BusinessPatterns {
  architecturalPatterns: ArchitecturalPattern[];
  domainPatterns: DomainPattern[];
  dataPatterns: DataPattern[];
  integrationPatterns: IntegrationPattern[];
  antiPatterns: BusinessAntiPattern[];
}

export interface BusinessQuality {
  maintainability: number;
  testability: number;
  reusability: number;
  reliability: number;
  performance: number;
  security: number;
  overallScore: number;
  qualityIssues: QualityIssue[];
}

export interface BusinessDependencies {
  externalServices: ExternalService[];
  databases: DatabaseDependency[];
  apis: ApiDependency[];
  libraries: LibraryDependency[];
  configurations: ConfigurationDependency[];
  resources: ResourceDependency[];
}

export interface BusinessRule {
  id: string;
  name: string;
  type: BusinessRuleType;
  condition: string;
  action: string;
  priority: "low" | "medium" | "high" | "critical";
  domain: string;
  implementation: RuleImplementation;
  validation: RuleValidation;
}

export interface WorkflowDefinition {
  name: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  conditions: WorkflowCondition[];
  outcomes: WorkflowOutcome[];
  complexity: "simple" | "moderate" | "complex";
  async: boolean;
  errorHandling: ErrorHandlingStrategy[];
}

export interface ValidationDefinition {
  field: string;
  rules: ValidationRule[];
  messages: ValidationMessage[];
  async: boolean;
  dependencies: string[];
  customValidators: CustomValidator[];
}

export interface DataTransformation {
  name: string;
  input: DataStructure;
  output: DataStructure;
  transformationType: TransformationType;
  complexity: "simple" | "moderate" | "complex";
  performance: TransformationPerformance;
  validation: TransformationValidation;
}

export interface ComplexityFactor {
  factor: string;
  impact: number;
  description: string;
  mitigation?: string;
}

export interface ArchitecturalPattern {
  name: string;
  confidence: number;
  evidence: string[];
  benefits: string[];
  drawbacks: string[];
}

export interface DomainPattern {
  name: string;
  domain: string;
  usage: string;
  effectiveness: "low" | "medium" | "high";
}

export interface DataPattern {
  pattern: string;
  usage: DataUsageInfo;
  optimization: string[];
  issues: string[];
}

export interface IntegrationPattern {
  pattern: string;
  services: string[];
  reliability: "low" | "medium" | "high";
  performance: "slow" | "moderate" | "fast";
}

export interface BusinessAntiPattern {
  name: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  impact: string;
  solution: string;
  location: string;
}

export interface QualityIssue {
  type: QualityIssueType;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  location: string;
  suggestion: string;
  impact: string;
}

export interface ExternalService {
  name: string;
  type: ServiceType;
  reliability: "low" | "medium" | "high";
  performance: "slow" | "moderate" | "fast";
  security: "low" | "medium" | "high";
  cost: "low" | "medium" | "high";
  alternatives: string[];
}

export interface DatabaseDependency {
  type: "sql" | "nosql" | "cache" | "search" | "graph";
  operations: DatabaseOperation[];
  performance: DatabasePerformance;
  reliability: "low" | "medium" | "high";
  scalability: "low" | "medium" | "high";
}

export interface ApiDependency {
  endpoint: string;
  method: HttpMethod;
  authentication: AuthenticationType;
  rateLimit?: RateLimit;
  reliability: "low" | "medium" | "high";
  errorHandling: ApiErrorHandling;
}

export interface LibraryDependency {
  name: string;
  purpose: LibraryPurpose;
  version: string;
  security: SecurityInfo;
  maintenance: MaintenanceInfo;
  alternatives: Alternative[];
}

export interface ConfigurationDependency {
  name: string;
  type: ConfigurationType;
  required: boolean;
  sensitive: boolean;
  validation: ConfigValidation;
}

export interface ResourceDependency {
  name: string;
  type: ResourceType;
  size?: string;
  availability: "local" | "remote" | "cdn";
  optimization: ResourceOptimization;
}

export interface RuleImplementation {
  method: "declarative" | "imperative" | "mixed";
  location: string;
  testable: boolean;
  configurable: boolean;
}

export interface RuleValidation {
  hasTests: boolean;
  coverage: number;
  scenarios: TestScenario[];
}

export interface WorkflowStep {
  name: string;
  type: StepType;
  async: boolean;
  dependencies: string[];
  errorHandling: StepErrorHandling;
  compensation?: CompensationAction;
}

export interface WorkflowTrigger {
  type: TriggerType;
  condition: string;
  source: string;
}

export interface WorkflowCondition {
  expression: string;
  variables: string[];
  complex: boolean;
}

export interface WorkflowOutcome {
  type: "success" | "failure" | "partial" | "timeout";
  actions: string[];
  notifications: string[];
}

export interface ErrorHandlingStrategy {
  type: ErrorHandlingType;
  retry: RetryStrategy;
  fallback: FallbackStrategy;
  logging: LoggingStrategy;
}

export interface ValidationRule {
  type: ValidationType;
  parameters: ValidationParameter[];
  async: boolean;
  custom: boolean;
}

export interface ValidationMessage {
  rule: string;
  message: string;
  level: "info" | "warning" | "error";
}

export interface CustomValidator {
  name: string;
  async: boolean;
  dependencies: string[];
  testable: boolean;
}

export interface DataStructure {
  schema: string;
  fields: DataField[];
  relationships: DataRelationship[];
  constraints: DataConstraint[];
}

export interface TransformationPerformance {
  complexity: "O(1)" | "O(n)" | "O(n²)" | "O(log n)" | "unknown";
  memoryUsage: "low" | "medium" | "high";
  optimizable: boolean;
}

export interface TransformationValidation {
  inputValidation: boolean;
  outputValidation: boolean;
  errorHandling: boolean;
  testCoverage: number;
}

// Enums and types
export type BusinessRuleType =
  | "validation"
  | "calculation"
  | "constraint"
  | "workflow"
  | "security"
  | "business-policy";

export type TransformationType =
  | "mapping"
  | "aggregation"
  | "filtering"
  | "sorting"
  | "computation"
  | "normalization";

export type QualityIssueType =
  | "complexity"
  | "coupling"
  | "duplication"
  | "security"
  | "performance"
  | "maintainability";

export type ServiceType =
  | "rest-api"
  | "graphql"
  | "websocket"
  | "message-queue"
  | "database"
  | "cache"
  | "auth"
  | "payment"
  | "notification";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

export type AuthenticationType =
  | "none"
  | "basic"
  | "bearer"
  | "oauth"
  | "api-key"
  | "custom";

export type LibraryPurpose =
  | "utility"
  | "ui"
  | "state-management"
  | "data-fetching"
  | "validation"
  | "testing"
  | "build"
  | "security";

export type ConfigurationType =
  | "environment"
  | "feature-flag"
  | "api-config"
  | "database-config"
  | "security-config"
  | "performance-config";

export type ResourceType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "font"
  | "data"
  | "style"
  | "script";

export type StepType =
  | "action"
  | "decision"
  | "parallel"
  | "sequential"
  | "conditional"
  | "loop";

export type TriggerType =
  | "event"
  | "time"
  | "condition"
  | "manual"
  | "api"
  | "webhook";

export type ErrorHandlingType =
  | "retry"
  | "fallback"
  | "circuit-breaker"
  | "timeout"
  | "bulkhead"
  | "graceful-degradation";

export type ValidationType =
  | "required"
  | "format"
  | "length"
  | "range"
  | "pattern"
  | "custom"
  | "async";

// Additional interfaces for complex types
export interface DataUsageInfo {
  reads: number;
  writes: number;
  transforms: number;
  caching: boolean;
}

export interface DatabaseOperation {
  type: "create" | "read" | "update" | "delete" | "query";
  frequency: "low" | "medium" | "high";
  complexity: "simple" | "moderate" | "complex";
}

export interface DatabasePerformance {
  queryOptimization: boolean;
  indexing: boolean;
  caching: boolean;
  connectionPooling: boolean;
}

export interface RateLimit {
  requests: number;
  period: string;
  strategy: "fixed" | "sliding" | "token-bucket";
}

export interface ApiErrorHandling {
  retries: number;
  timeout: number;
  fallback: boolean;
  circuitBreaker: boolean;
}

export interface SecurityInfo {
  vulnerabilities: SecurityVulnerability[];
  lastAudit: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface MaintenanceInfo {
  lastUpdate: string;
  activelyMaintained: boolean;
  communitySupport: "low" | "medium" | "high";
}

export interface Alternative {
  name: string;
  pros: string[];
  cons: string[];
  migrationEffort: "low" | "medium" | "high";
}

export interface ConfigValidation {
  required: boolean;
  format?: string;
  allowedValues?: string[];
  validation?: string;
}

export interface ResourceOptimization {
  compressed: boolean;
  cached: boolean;
  lazyLoaded: boolean;
  optimized: boolean;
}

export interface TestScenario {
  name: string;
  input: string;
  expectedOutput: string;
  complexity: "simple" | "moderate" | "complex";
}

export interface StepErrorHandling {
  strategy: ErrorHandlingType;
  maxRetries: number;
  timeout: number;
  fallback?: string;
}

export interface CompensationAction {
  action: string;
  automatic: boolean;
  dependencies: string[];
}

export interface RetryStrategy {
  maxAttempts: number;
  backoff: "linear" | "exponential" | "fixed";
  conditions: string[];
}

export interface FallbackStrategy {
  type:
    | "default-value"
    | "cached-value"
    | "alternative-service"
    | "degraded-service";
  implementation: string;
}

export interface LoggingStrategy {
  level: "debug" | "info" | "warn" | "error";
  structured: boolean;
  sensitive: boolean;
}

export interface ValidationParameter {
  name: string;
  value: string;
  type: string;
}

export interface DataField {
  name: string;
  type: string;
  required: boolean;
  validation?: string;
}

export interface DataRelationship {
  type: "one-to-one" | "one-to-many" | "many-to-many";
  target: string;
  cascading: boolean;
}

export interface DataConstraint {
  type: "unique" | "foreign-key" | "check" | "not-null";
  definition: string;
}

export interface SecurityVulnerability {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}
