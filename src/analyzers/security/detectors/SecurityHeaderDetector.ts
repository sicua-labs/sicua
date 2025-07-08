/**
 * Detector for missing security headers in Next.js configuration
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { AnalysisContext } from "../types/analysis.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import {
  DEPLOYMENT_CONFIGS,
  NEXTJS_INDICATORS,
} from "../constants/general.constants";

export class SecurityHeaderDetector extends BaseDetector {
  private static readonly SECURITY_HEADER_PATTERNS: PatternDefinition[] = [
    {
      id: "next-config-file",
      name: "Next.js configuration file",
      description:
        "Next.js configuration file detected - checking for security headers",
      pattern: {
        type: "regex",
        expression: /next\.config\.(js|ts|mjs)$/g, // Already correct, but ensure the filter includes all
      },
      vulnerabilityType: "missing-security-headers",
      severity: "medium",
      confidence: "high",
      fileTypes: [".js", ".ts", ".mjs"], // Add .ts and .mjs
      enabled: true,
    },
  ];

  private static readonly REQUIRED_SECURITY_HEADERS = {
    "X-Frame-Options": {
      name: "X-Frame-Options",
      description:
        "Prevents clickjacking attacks by controlling frame embedding",
      recommendedValue: "DENY",
      alternativeValues: ["SAMEORIGIN"],
      severity: "medium" as const,
    },
    "X-Content-Type-Options": {
      name: "X-Content-Type-Options",
      description: "Prevents MIME type sniffing attacks",
      recommendedValue: "nosniff",
      alternativeValues: [],
      severity: "medium" as const,
    },
    "Referrer-Policy": {
      name: "Referrer-Policy",
      description: "Controls referrer information sent in requests",
      recommendedValue: "strict-origin-when-cross-origin",
      alternativeValues: ["no-referrer", "same-origin", "strict-origin"],
      severity: "medium" as const,
    },
    "X-XSS-Protection": {
      name: "X-XSS-Protection",
      description: "Enables XSS filtering in older browsers",
      recommendedValue: "1; mode=block",
      alternativeValues: ["0"],
      severity: "low" as const,
    },
    "Strict-Transport-Security": {
      name: "Strict-Transport-Security",
      description: "Enforces HTTPS connections",
      recommendedValue: "max-age=31536000; includeSubDomains",
      alternativeValues: ["max-age=31536000"],
      severity: "high" as const,
    },
    "Content-Security-Policy": {
      name: "Content-Security-Policy",
      description: "Prevents XSS and other injection attacks",
      recommendedValue: "default-src 'self'",
      alternativeValues: [],
      severity: "high" as const,
    },
    "Permissions-Policy": {
      name: "Permissions-Policy",
      description: "Controls browser feature permissions",
      recommendedValue: "camera=(), microphone=(), geolocation=()",
      alternativeValues: [],
      severity: "low" as const,
    },
  };

  constructor() {
    super(
      "SecurityHeaderDetector",
      "missing-security-headers",
      "medium",
      SecurityHeaderDetector.SECURITY_HEADER_PATTERNS
    );
  }

  async detect(
  scanResult: ScanResult,
  context: AnalysisContext
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];

  // DEBUG: Look for any config-related files
  const allConfigFiles = scanResult.filePaths.filter((filePath) =>
    filePath.includes('next.config')
  );
  console.log(`[SecurityHeaderDetector] Files containing 'next.config':`, allConfigFiles);

  // DEBUG: Check a few sample file paths to understand the structure
  const samplePaths = scanResult.filePaths.slice(0, 5);
  console.log(`[SecurityHeaderDetector] Sample file paths:`, samplePaths);

  // DEBUG: Check if we can find any .ts files at root level
  const rootTsFiles = scanResult.filePaths.filter((filePath) => {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1].endsWith('.ts') && !normalized.includes('/');
  });
  console.log(`[SecurityHeaderDetector] Root .ts files:`, rootTsFiles);

  // Look specifically for Next.js config files
  const configFiles = scanResult.filePaths.filter((filePath) =>
    /next\.config\.(js|ts|mjs)$/.test(filePath)
  );

  // DEBUG: Log what we found
  console.log(`[SecurityHeaderDetector] Found ${configFiles.length} config files:`, configFiles);
  console.log(`[SecurityHeaderDetector] Total files scanned: ${scanResult.filePaths.length}`);
  
  if (configFiles.length === 0) {
    // Check if this is actually a Next.js project before flagging
    const hasNextJsIndicators = this.isNextJsProject(scanResult);
    console.log(`[SecurityHeaderDetector] Is Next.js project: ${hasNextJsIndicators}`);

    if (hasNextJsIndicators) {
      vulnerabilities.push(
        this.createMissingConfigVulnerability(context.projectPath)
      );
    }
    return vulnerabilities;
  }

  for (const configPath of configFiles) {
    console.log(`[SecurityHeaderDetector] Analyzing config: ${configPath}`);
    const content = scanResult.fileContents.get(configPath);
    if (!content) {
      console.log(`[SecurityHeaderDetector] No content found for: ${configPath}`);
      continue;
    }

    // Analyze the config file for security headers
    const configAnalysis = this.analyzeNextConfigFile(configPath, scanResult);
    vulnerabilities.push(...configAnalysis);
  }

  return vulnerabilities;
}

  /**
   * Check if this is actually a Next.js project
   */
  private isNextJsProject(scanResult: ScanResult): boolean {
    // Check for package.json with Next.js dependency
    const packageJsonPath = scanResult.filePaths.find(
      (path) => path.endsWith("package.json") && !path.includes("node_modules")
    );

    if (packageJsonPath) {
      const packageContent = scanResult.fileContents.get(packageJsonPath);
      if (packageContent && packageContent.includes('"next"')) {
        return true;
      }
    }

    // Check for Next.js specific files/directories
    return scanResult.filePaths.some((path) =>
      NEXTJS_INDICATORS.some((indicator) => path.includes(indicator))
    );
  }

  /**
   * Check if security headers might be configured elsewhere (e.g., CDN, reverse proxy)
   */
  private hasAlternativeSecurityConfig(scanResult: ScanResult): boolean {
    // Check for deployment config files that might handle security headers

    return scanResult.filePaths.some((path) =>
      DEPLOYMENT_CONFIGS.some((config) => path.includes(config))
    );
  }

  /**
   * Analyze Next.js config file for security headers
   */
  private analyzeNextConfigFile(
    filePath: string,
    scanResult: ScanResult
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Parse the config file
    const sourceFile = scanResult.sourceFiles.get(filePath);
    if (!sourceFile) {
      return vulnerabilities;
    }

    // Check if security headers might be configured elsewhere
    const hasAlternativeConfig = this.hasAlternativeSecurityConfig(scanResult);

    // Find security headers configuration
    const headersConfig = this.findHeadersConfiguration(sourceFile);
    const missingHeaders = this.identifyMissingSecurityHeaders(headersConfig);
    const insecureHeaders = this.identifyInsecureHeaders(headersConfig);

    // Create vulnerabilities for missing headers (with reduced severity if alternative config exists)
    for (const missingHeader of missingHeaders) {
      const vulnerability = this.createMissingHeaderVulnerability(
        filePath,
        missingHeader
      );

      // Reduce severity if headers might be configured elsewhere
      if (hasAlternativeConfig) {
        vulnerability.severity = "low";
        vulnerability.metadata = {
          ...vulnerability.metadata,
          note: "Security headers might be configured at infrastructure level",
        };
      }

      vulnerabilities.push(vulnerability);
    }

    // Create vulnerabilities for insecure headers
    for (const insecureHeader of insecureHeaders) {
      const vulnerability = this.createInsecureHeaderVulnerability(
        filePath,
        insecureHeader
      );
      vulnerabilities.push(vulnerability);
    }

    return vulnerabilities;
  }

  /**
   * Find headers configuration in Next.js config
   */
  private findHeadersConfiguration(
    sourceFile: ts.SourceFile
  ): SecurityHeaderConfig | null {
    const configObject = this.findNextConfigObject(sourceFile);
    if (!configObject) return null;

    // Look for headers property
    const headersProperty = this.findPropertyInObject(configObject, "headers");
    if (!headersProperty) return null;

    return this.parseHeadersConfiguration(headersProperty, sourceFile);
  }

  /**
   * Find the main Next.js config object
   */
  private findNextConfigObject(
    sourceFile: ts.SourceFile
  ): ts.ObjectLiteralExpression | null {
    // Look for module.exports = {...} or export default {...}
    const exportAssignments = ASTTraverser.findNodesByKind<ts.BinaryExpression>(
      sourceFile,
      ts.SyntaxKind.BinaryExpression,
      (node) => {
        return (
          ts.isPropertyAccessExpression(node.left) &&
          ts.isIdentifier(node.left.expression) &&
          node.left.expression.text === "module" &&
          ts.isIdentifier(node.left.name) &&
          node.left.name.text === "exports"
        );
      }
    );

    for (const assignment of exportAssignments) {
      if (ts.isObjectLiteralExpression(assignment.right)) {
        return assignment.right;
      }
    }

    // Look for export default
    const exportDefaults = ASTTraverser.findNodesByKind<ts.ExportAssignment>(
      sourceFile,
      ts.SyntaxKind.ExportAssignment
    );

    for (const exportDefault of exportDefaults) {
      if (ts.isObjectLiteralExpression(exportDefault.expression)) {
        return exportDefault.expression;
      }
    }

    return null;
  }

  /**
   * Find a property in an object literal
   */
  private findPropertyInObject(
    obj: ts.ObjectLiteralExpression,
    propertyName: string
  ): ts.PropertyAssignment | null {
    for (const prop of obj.properties) {
      if (
        ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === propertyName
      ) {
        return prop;
      }
    }
    return null;
  }

  /**
   * Parse headers configuration
   */
  private parseHeadersConfiguration(
    headersProperty: ts.PropertyAssignment,
    sourceFile: ts.SourceFile
  ): SecurityHeaderConfig {
    const config: SecurityHeaderConfig = {
      configuredHeaders: new Map(),
      hasHeadersFunction: false,
      location: ASTTraverser.getNodeLocation(headersProperty, sourceFile),
    };

    // Check if headers is a function
    if (
      ts.isFunctionExpression(headersProperty.initializer) ||
      ts.isArrowFunction(headersProperty.initializer)
    ) {
      config.hasHeadersFunction = true;
      // Analyze function body for header configurations
      this.analyzeHeadersFunction(
        headersProperty.initializer,
        config,
        sourceFile
      );
    } else if (ts.isArrayLiteralExpression(headersProperty.initializer)) {
      // Direct array of header configurations
      this.analyzeHeadersArray(headersProperty.initializer, config, sourceFile);
    }

    return config;
  }

  /**
   * Analyze headers function
   */
  private analyzeHeadersFunction(
    func: ts.FunctionExpression | ts.ArrowFunction,
    config: SecurityHeaderConfig,
    sourceFile: ts.SourceFile
  ): void {
    // Look for return statements with header arrays within this specific function
    const returnStatements =
      ASTTraverser.findNodesByKindInNode<ts.ReturnStatement>(
        func,
        ts.SyntaxKind.ReturnStatement
      );

    for (const returnStmt of returnStatements) {
      if (
        returnStmt.expression &&
        ts.isArrayLiteralExpression(returnStmt.expression)
      ) {
        this.analyzeHeadersArray(returnStmt.expression, config, sourceFile);
      }
    }
  }

  /**
   * Analyze headers array
   */
  private analyzeHeadersArray(
    array: ts.ArrayLiteralExpression,
    config: SecurityHeaderConfig,
    sourceFile: ts.SourceFile
  ): void {
    for (const element of array.elements) {
      if (ts.isObjectLiteralExpression(element)) {
        this.analyzeHeaderObject(element, config, sourceFile);
      }
    }
  }

  /**
   * Analyze individual header object
   */
  private analyzeHeaderObject(
    obj: ts.ObjectLiteralExpression,
    config: SecurityHeaderConfig,
    sourceFile: ts.SourceFile
  ): void {
    const headersProperty = this.findPropertyInObject(obj, "headers");
    if (
      !headersProperty ||
      !ts.isArrayLiteralExpression(headersProperty.initializer)
    ) {
      return;
    }

    for (const headerElement of headersProperty.initializer.elements) {
      if (ts.isObjectLiteralExpression(headerElement)) {
        const keyProp = this.findPropertyInObject(headerElement, "key");
        const valueProp = this.findPropertyInObject(headerElement, "value");

        if (
          keyProp &&
          valueProp &&
          ts.isStringLiteral(keyProp.initializer) &&
          ts.isStringLiteral(valueProp.initializer)
        ) {
          const headerName = keyProp.initializer.text;
          const headerValue = valueProp.initializer.text;

          config.configuredHeaders.set(headerName, {
            value: headerValue,
            location: ASTTraverser.getNodeLocation(headerElement, sourceFile),
          });
        }
      }
    }
  }

  /**
   * Identify missing security headers
   */
  private identifyMissingSecurityHeaders(
    config: SecurityHeaderConfig | null
  ): MissingSecurityHeader[] {
    const missing: MissingSecurityHeader[] = [];

    for (const [headerName, headerInfo] of Object.entries(
      SecurityHeaderDetector.REQUIRED_SECURITY_HEADERS
    )) {
      const isConfigured =
        config?.configuredHeaders.has(headerName) ||
        config?.configuredHeaders.has(headerName.toLowerCase());

      if (!isConfigured) {
        missing.push({
          headerName,
          headerInfo,
          severity: headerInfo.severity,
        });
      }
    }

    return missing;
  }

  /**
   * Fixed identifyInsecureHeaders function with proper type safety
   */

  private identifyInsecureHeaders(
    config: SecurityHeaderConfig | null
  ): InsecureSecurityHeader[] {
    const insecure: InsecureSecurityHeader[] = [];

    if (!config) return insecure;

    for (const [headerName, configuredHeader] of config.configuredHeaders) {
      const requiredHeader =
        SecurityHeaderDetector.REQUIRED_SECURITY_HEADERS[
          headerName as keyof typeof SecurityHeaderDetector.REQUIRED_SECURITY_HEADERS
        ];
      if (!requiredHeader) continue;

      const isSecure = this.isHeaderValueSecure(
        configuredHeader.value,
        requiredHeader.recommendedValue,
        requiredHeader.alternativeValues
      );

      if (!isSecure) {
        insecure.push({
          headerName,
          currentValue: configuredHeader.value,
          recommendedValue: requiredHeader.recommendedValue,
          location: configuredHeader.location,
          severity: requiredHeader.severity,
        });
      }
    }

    return insecure;
  }

  /**
   * Check if header value is secure
   */
  private isHeaderValueSecure(
    currentValue: string,
    recommendedValue: string,
    alternativeValues: string[]
  ): boolean {
    if (currentValue === recommendedValue) return true;
    return alternativeValues.includes(currentValue);
  }

  /**
   * Create vulnerability for missing Next.js config file
   */
  private createMissingConfigVulnerability(projectPath: string): Vulnerability {
    return this.createVulnerability(
      projectPath,
      { line: 1, column: 1 },
      {
        code: "// Missing next.config.js file",
        surroundingContext: "Next.js project root directory",
      },
      "Next.js project missing security headers configuration - create next.config.js with security headers",
      "medium",
      "high",
      {
        missingFile: "next.config.js",
        recommendation:
          "Create next.config.js with security headers configuration",
        requiredHeaders: Object.keys(
          SecurityHeaderDetector.REQUIRED_SECURITY_HEADERS
        ),
        severity: "medium", // Reduced from previous implementation
      }
    );
  }

  /**
   * Create vulnerability for missing security header
   */
  private createMissingHeaderVulnerability(
    filePath: string,
    missingHeader: MissingSecurityHeader
  ): Vulnerability {
    // Adjust severity based on header importance
    const adjustedSeverity =
      missingHeader.headerInfo.severity === "high" ? "medium" : "low";

    return this.createVulnerability(
      filePath,
      { line: 1, column: 1 },
      {
        code: `// Missing ${missingHeader.headerName} header`,
        surroundingContext: "Next.js configuration file",
      },
      `Missing security header: ${missingHeader.headerName} - ${missingHeader.headerInfo.description}`,
      adjustedSeverity,
      "medium",
      {
        headerName: missingHeader.headerName,
        description: missingHeader.headerInfo.description,
        recommendedValue: missingHeader.headerInfo.recommendedValue,
        headerType: "missing",
      }
    );
  }

  /**
   * Create vulnerability for insecure security header
   */
  private createInsecureHeaderVulnerability(
    filePath: string,
    insecureHeader: InsecureSecurityHeader
  ): Vulnerability {
    return this.createVulnerability(
      filePath,
      insecureHeader.location,
      {
        code: `${insecureHeader.headerName}: ${insecureHeader.currentValue}`,
        surroundingContext: "Next.js headers configuration",
      },
      `Insecure ${insecureHeader.headerName} header value - current: "${insecureHeader.currentValue}", recommended: "${insecureHeader.recommendedValue}"`,
      insecureHeader.severity,
      "high",
      {
        headerName: insecureHeader.headerName,
        currentValue: insecureHeader.currentValue,
        recommendedValue: insecureHeader.recommendedValue,
        headerType: "insecure",
      }
    );
  }
}

// Helper interfaces
interface SecurityHeaderConfig {
  configuredHeaders: Map<string, ConfiguredHeader>;
  hasHeadersFunction: boolean;
  location: { line: number; column: number };
}

interface ConfiguredHeader {
  value: string;
  location: { line: number; column: number };
}

interface MissingSecurityHeader {
  headerName: string;
  headerInfo: {
    name: string;
    description: string;
    recommendedValue: string;
    severity: "high" | "medium" | "low";
  };
  severity: "high" | "medium" | "low";
}

interface InsecureSecurityHeader {
  headerName: string;
  currentValue: string;
  recommendedValue: string;
  location: { line: number; column: number };
  severity: "high" | "medium" | "low";
}
