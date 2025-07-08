/**
 * Analysis result type definitions for security analysis
 */

import {
  Vulnerability,
  VulnerabilityType,
  SeverityLevel,
} from "./vulnerability.types";

export type SecurityRiskLevel = "critical" | "high" | "medium" | "low" | "none";

export interface SecurityMetrics {
  /** Overall risk assessment */
  overallRisk: SecurityRiskLevel;
  /** Security score (0-100, higher is better) */
  securityScore: number;
  /** Total files analyzed */
  totalFiles: number;
  /** Files with vulnerabilities */
  vulnerableFiles: number;
  /** Files without vulnerabilities */
  cleanFiles: number;
  /** Total vulnerabilities by severity */
  vulnerabilitiesBySeverity: Record<SeverityLevel, number>;
  /** Most common vulnerability type */
  mostCommonVulnerability: VulnerabilityType | null;
}

export interface ProjectStructureAnalysis {
  /** Analysis of API routes security */
  apiRouteSecurity: {
    /** Total API routes found */
    totalRoutes: number;
    /** Routes with security issues */
    vulnerableRoutes: number;
    /** Routes with authentication */
    authenticatedRoutes: number;
    /** Routes with input validation */
    validatedRoutes: number;
  };
  /** Analysis of configuration files */
  configurationSecurity: {
    /** Security headers configured */
    securityHeadersConfigured: boolean;
    /** Environment variables properly managed */
    envVarsSecure: boolean;
    /** Missing security configurations */
    missingConfigurations: string[];
  };
  /** Analysis of dependency security */
  dependencySecurity: {
    /** Total dependencies */
    totalDependencies: number;
    /** Dependencies with known vulnerabilities */
    vulnerableDependencies: number;
    /** Outdated dependencies */
    outdatedDependencies: number;
  };
}

export interface SecurityAnalysisResult {
  /** All vulnerabilities found in the project */
  vulnerabilities: Vulnerability[];

  /** Security metrics and scoring */
  metrics: SecurityMetrics;

  /** Project structure security analysis */
  projectAnalysis: ProjectStructureAnalysis;
}

export interface AnalysisContext {
  /** Project root path */
  projectPath: string;

  /** Source directory path */
  sourcePath: string;

  /** Files being analyzed */
  filesToAnalyze: string[];
}
