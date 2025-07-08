/**
 * Main security analyzer that orchestrates all security vulnerability detectors
 */

import {
  SecurityAnalysisResult,
  AnalysisContext,
} from "./types/analysis.types";
import { Vulnerability } from "./types/vulnerability.types";
import { VulnerabilityAggregator } from "./utils/VulnerabilityAggregator";

// Critical Severity Detectors
import { HardcodedSecretDetector } from "./detectors/HardcodedSecretDetector";
import { DangerousEvalDetector } from "./detectors/DangerousEvalDetector";
import { UnsafeHTMLDetector } from "./detectors/UnsafeHTMLDetector";
import { ConsoleLoggingDetector } from "./detectors/ConsoleLoggingDetector";
import { SqlInjectionDetector } from "./detectors/SqlInjectionDetector";

// High Severity Detectors
import { InsecureRandomDetector } from "./detectors/InsecureRandomDetector";
import { MixedContentDetector } from "./detectors/MixedContentDetector";
import { EnvironmentExposureDetector } from "./detectors/EnvironmentExposureDetector";
import { DebugCodeDetector } from "./detectors/DebugCodeDetector";

// Medium Severity Detectors
import { SecurityHeaderDetector } from "./detectors/SecurityHeaderDetector";
import { InsecureCookieDetector } from "./detectors/InsecureCookieDetector";
import { ClientStorageDetector } from "./detectors/ClientStorageDetector";
import { UnvalidatedRedirectDetector } from "./detectors/UnvalidatedRedirectDetector";
import { ScanResult } from "../../types";
import { RedosPatternDetector } from "./detectors/RedosPatternDetector";
import { ServerOnlyImportsDetector } from "./detectors/ServerOnlyImportsDetector";
import { ReactAntiPatternDetector } from "./detectors/ReactAntiPatternDetector";

export class SecurityAnalyzer {
  async analyze(
    scanResult: ScanResult,
    context: AnalysisContext
  ): Promise<SecurityAnalysisResult> {
    const allVulnerabilities: Vulnerability[] = [];

    // Initialize all detectors
    const detectors = [
      // Critical Severity
      new HardcodedSecretDetector(),
      new DangerousEvalDetector(),
      new UnsafeHTMLDetector(),
      new ConsoleLoggingDetector(),
      new ReactAntiPatternDetector(),
      new SqlInjectionDetector(),

      // High Severity
      new InsecureRandomDetector(),
      new MixedContentDetector(),
      new EnvironmentExposureDetector(),
      new DebugCodeDetector(),
      new RedosPatternDetector(),
      new ServerOnlyImportsDetector(),

      // Medium Severity
      new SecurityHeaderDetector(),
      new InsecureCookieDetector(),
      new ClientStorageDetector(),
      new UnvalidatedRedirectDetector(),
    ];

    // Run each detector
    for (const detector of detectors) {
      try {
        const vulnerabilities = await detector.detect(scanResult, context);
        allVulnerabilities.push(...vulnerabilities);
      } catch (error) {
        console.error(
          `Error running detector ${detector.constructor.name}:`,
          error
        );
        // Continue with other detectors
      }
    }

    // Aggregate results and enhance with project data
    const result = VulnerabilityAggregator.aggregateResults(allVulnerabilities);
    this.enhanceProjectAnalysis(result, scanResult);

    return result;
  }

  /**
   * Enhance project analysis with scan result data
   */
  private enhanceProjectAnalysis(
    result: SecurityAnalysisResult,
    scanResult: ScanResult
  ): void {
    // API route security
    const apiRouteVulns = result.vulnerabilities.filter(
      (v) => v.filePath.includes("/api/") || v.filePath.includes("/pages/api/")
    );

    result.projectAnalysis.apiRouteSecurity = {
      totalRoutes: scanResult.apiRoutes.length,
      vulnerableRoutes: apiRouteVulns.length,
      authenticatedRoutes: scanResult.apiRoutes.filter(
        (route) => route.authenticationRequired
      ).length,
      validatedRoutes: scanResult.apiRoutes.filter(
        (route) => route.validationPresent
      ).length,
    };

    // Configuration security
    const configVulns = result.vulnerabilities.filter(
      (v) =>
        v.type === "missing-security-headers" ||
        v.type === "environment-exposure"
    );

    result.projectAnalysis.configurationSecurity = {
      securityHeadersConfigured: !configVulns.some(
        (v) => v.type === "missing-security-headers"
      ),
      envVarsSecure: !configVulns.some(
        (v) => v.type === "environment-exposure"
      ),
      missingConfigurations: configVulns.map((v) => v.description),
    };

    // Dependency security
    result.projectAnalysis.dependencySecurity = {
      totalDependencies: scanResult.packageInfo.length,
      vulnerableDependencies: result.vulnerabilities.filter(
        (v) => v.type === "insecure-random" || v.type === "dangerous-eval"
      ).length,
      outdatedDependencies: 0,
    };
  }
}
