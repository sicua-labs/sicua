/**
 * Basic component structure types with security analysis extensions
 */

import ts from "typescript";

export interface PropSignature {
  name: string;
  type: string;
  required: boolean;
}

export interface JSXStructure {
  tagName: string;
  props: PropSignature[];
  children: JSXStructure[];
}

export interface ComponentData {
  name: string;
  path: string;
  content: string; // Original component code
}

export interface ProcessedContent {
  d: {
    keywords: Record<string, string>;
    patterns: Record<string, string>;
    attributes: Record<string, string>;
    styles: Record<string, string>;
  };
  i: string[];
  l: string;
  j: string;
}

// Component and relation types
export interface ComponentRelation {
  name: string;
  usedBy: string[];
  directory: string;
  imports: string[];
  exports: string[];
  fullPath: string;
  functions?: string[];
  functionCalls?: { [key: string]: string[] };
  content?: string;
  props?: PropSignature[];
  jsxStructure?: JSXStructure;
}

export interface ProcessedComponentRelation
  extends Omit<ComponentRelation, "content"> {
  content?: ProcessedContent;
}

export interface FileCacheMetadata {
  hasReactImport: boolean;
  hasJSX: boolean;
  hasTranslations: boolean;
  hasTypeDefinitions: boolean;
  isTest: boolean;
  componentCount: number;
  lastAnalyzed: number;
  // Security-related metadata extensions
  hasSecurityPatterns?: boolean;
  hasAuthenticationCode?: boolean;
  hasAPIRoutes?: boolean;
  hasEnvironmentVariables?: boolean;
  hasCryptographicOperations?: boolean;
  hasFileOperations?: boolean;
  hasDatabaseOperations?: boolean;
  hasExternalAPICalls?: boolean;
  securityRiskLevel?: "high" | "medium" | "low" | "none";
}

// Directory-level cache for scanner results
export interface DirectoryCacheEntry {
  hash: string;
  timestamp: number;
  fileHashes: Map<string, string>;
  scanResult: {
    filePaths: string[];
    fileMetadata: Record<string, FileCacheMetadata>;
    // Security scan extensions
    securityRelevantFiles?: string[];
    configurationFiles?: string[];
    environmentFiles?: string[];
  };
}

// Analyzer-specific cache entries
export interface AnalyzerCacheEntry<T = unknown> {
  hash: string;
  timestamp: number;
  configHash?: string; // For invalidation when analysis logic changes
  result: T;
}

// Cache invalidation tracking
export interface CacheDependency {
  filePath: string;
  dependencies: string[]; // Files this file depends on
  dependents: string[]; // Files that depend on this file
}

// Cache configuration
export interface CacheConfig {
  maxAge: number; // Maximum cache age in milliseconds
  maxSize: number; // Maximum number of entries
  enableDependencyTracking: boolean;
  compressionEnabled: boolean;
}

// Utility types for parsing
export type ImportType = "named" | "default" | "namespace" | "sideEffect";

export interface ParsedImport {
  type: ImportType;
  name: string;
  path: string;
}

export interface ParsedExport {
  name: string;
  isDefault: boolean;
}

// Security-specific file information extensions
export interface SecurityFileInfo {
  filePath: string;
  fileType: SecurityFileType;
  securityRelevance: "critical" | "high" | "medium" | "low";
  scanTimestamp: number;
  patterns: SecurityPattern[];
  metadata: SecurityFileMetadata;
}

export interface SecurityPattern {
  patternType: SecurityPatternType;
  pattern: string;
  lineNumber: number;
  columnNumber?: number;
  context: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: "high" | "medium" | "low";
}

export interface SecurityFileMetadata {
  hasSecrets: boolean;
  hasAuthCode: boolean;
  hasValidation: boolean;
  hasCrypto: boolean;
  hasFileOps: boolean;
  hasNetworkOps: boolean;
  hasEval: boolean;
  hasDangerousHTML: boolean;
  packageDependencies: string[];
  environmentAccess: string[];
  externalConnections: string[];
}

export interface ConfigFileInfo {
  filePath: string;
  configType: ConfigFileType;
  parsedConfig: Record<string, unknown>;
  securitySettings: ConfigSecuritySetting[];
  missingSecuritySettings: string[];
  scanTimestamp: number;
}

export interface ConfigSecuritySetting {
  setting: string;
  value: unknown;
  securityImpact: "positive" | "negative" | "neutral";
  recommendation?: string;
}

export interface EnvironmentFileInfo {
  filePath: string;
  envType: "development" | "production" | "test" | "unknown";
  variables: EnvironmentVariable[];
  securityIssues: EnvironmentSecurityIssue[];
  scanTimestamp: number;
}

export interface EnvironmentVariable {
  name: string;
  value?: string; // Only captured if not sensitive
  isSensitive: boolean;
  usageLocations: VariableUsageLocation[];
  exposureRisk: "client" | "server" | "build" | "safe";
}

export interface VariableUsageLocation {
  filePath: string;
  lineNumber: number;
  context:
    | "client_component"
    | "server_component"
    | "api_route"
    | "middleware"
    | "config"
    | "build_script";
  accessMethod: string;
}

export interface EnvironmentSecurityIssue {
  issueType:
    | "exposed_secret"
    | "missing_variable"
    | "weak_default"
    | "client_exposure"
    | "insecure_transmission";
  variableName: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  lineNumber?: number;
}

export interface APIRouteInfo {
  filePath: string;
  route: string;
  method: string[];
  handlerFunctions: string[];
  middleware: string[];
  authenticationRequired: boolean;
  validationPresent: boolean;
  inputSources: string[];
  databaseAccess: boolean;
  externalAPICalls: boolean;
  securityHeaders: string[];
  errorHandling: string[];
  scanTimestamp: number;
}

export interface MiddlewareInfo {
  filePath: string;
  middlewareType:
    | "auth"
    | "cors"
    | "security"
    | "logging"
    | "validation"
    | "custom";
  appliesTo: string[]; // Routes/paths it applies to
  securityFunctions: string[];
  configurationOptions: Record<string, unknown>;
  dependencies: string[];
  scanTimestamp: number;
}

export interface PackageInfo {
  name: string;
  version: string;
  securityCategory: PackageSecurityCategory;
  vulnerabilities: PackageVulnerability[];
  usageLocations: PackageUsageLocation[];
  configurationFiles: string[];
  securityFeatures: string[];
  riskAssessment: PackageRiskAssessment;
}

export interface PackageUsageLocation {
  filePath: string;
  lineNumber: number;
  usageType: "import" | "config" | "api_call" | "component_usage";
  usageContext: string;
  securityImplications: string[];
}

export interface PackageVulnerability {
  vulnerabilityId: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  affectedVersions: string[];
  patchedVersion?: string;
  exploitability: "high" | "medium" | "low";
}

export interface PackageRiskAssessment {
  overallRisk: "critical" | "high" | "medium" | "low";
  riskFactors: string[];
  mitigations: string[];
  recommendedActions: string[];
}

// Type definitions for security analysis
export type SecurityFileType =
  | "component"
  | "api_route"
  | "middleware"
  | "config"
  | "environment"
  | "utility"
  | "hook"
  | "provider"
  | "service"
  | "helper"
  | "constant"
  | "type_definition"
  | "test"
  | "build_script"
  | "package_config";

export type SecurityPatternType =
  | "hardcoded_secret"
  | "dangerous_function"
  | "insecure_storage"
  | "unsafe_html"
  | "weak_crypto"
  | "missing_validation"
  | "auth_bypass"
  | "info_disclosure"
  | "injection_point"
  | "insecure_transport"
  | "weak_session"
  | "csrf_vulnerable"
  | "xss_vulnerable"
  | "path_traversal"
  | "command_injection"
  | "deserialization"
  | "package_misuse";

export type ConfigFileType =
  | "next_config"
  | "package_json"
  | "tsconfig"
  | "eslint_config"
  | "env_config"
  | "docker_config"
  | "vercel_config"
  | "webpack_config"
  | "babel_config"
  | "tailwind_config"
  | "jest_config"
  | "auth_config"
  | "database_config"
  | "api_config";

export type PackageSecurityCategory =
  | "authentication"
  | "authorization"
  | "cryptography"
  | "validation"
  | "sanitization"
  | "payment"
  | "database"
  | "http_client"
  | "file_handling"
  | "state_management"
  | "ui_framework"
  | "testing"
  | "build_tool"
  | "monitoring"
  | "analytics"
  | "unknown";

// Extended scan result interface to include security data
export interface ScanResult {
  // Original scan result properties
  filePaths: string[];
  sourceFiles: Map<string, ts.SourceFile>;
  fileContents: Map<string, string>;
  fileMetadata: Map<string, FileCacheMetadata>;

  // Security analysis extensions
  securityFiles: SecurityFileInfo[];
  configFiles: ConfigFileInfo[];
  environmentFiles: EnvironmentFileInfo[];
  apiRoutes: APIRouteInfo[];
  middlewareFiles: MiddlewareInfo[];
  packageInfo: PackageInfo[];

  // Security metadata
  securityScanMetadata: {
    scanTimestamp: number;
    scanDuration: number;
    filesScanned: number;
    securityIssuesFound: number;
    riskLevel: "critical" | "high" | "medium" | "low";
    coveragePercentage: number;
  };
}
