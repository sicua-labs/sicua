import fg from "fast-glob";
import * as fs from "fs";
import * as path from "path";
import ts from "typescript";
import {
  type ConfigManager,
  FileCacheMetadata,
  SecurityFileInfo,
  ConfigFileInfo,
  EnvironmentFileInfo,
  APIRouteInfo,
  MiddlewareInfo,
  PackageInfo,
  SecurityFileType,
  SecurityPatternType,
  ConfigFileType,
  PackageSecurityCategory,
  ScanResult,
  SecurityPattern,
} from "../types";

/**
 * Process file metadata with security analysis
 */
function processFileMetadata(
  content: string,
  filePath: string
): FileCacheMetadata {
  const componentCount = countComponents(content);
  const securityPatterns = detectSecurityPatterns(content);

  return {
    hasReactImport:
      content.includes("import React") ||
      content.includes('from "react"') ||
      content.includes("from 'react'"),
    hasJSX:
      content.includes("<") &&
      (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")),
    hasTranslations:
      content.includes("useTranslation") || content.includes("useTranslations"),
    hasTypeDefinitions:
      content.includes("interface ") ||
      content.includes("type ") ||
      content.includes("enum "),
    isTest:
      filePath.includes(".test.") ||
      filePath.includes(".spec.") ||
      filePath.includes("__tests__"),
    componentCount,
    lastAnalyzed: Date.now(),

    // Security-related metadata
    hasSecurityPatterns: securityPatterns.hasSecurityPatterns,
    hasAuthenticationCode: securityPatterns.hasAuthenticationCode,
    hasAPIRoutes: securityPatterns.hasAPIRoutes,
    hasEnvironmentVariables: securityPatterns.hasEnvironmentVariables,
    hasCryptographicOperations: securityPatterns.hasCryptographicOperations,
    hasFileOperations: securityPatterns.hasFileOperations,
    hasDatabaseOperations: securityPatterns.hasDatabaseOperations,
    hasExternalAPICalls: securityPatterns.hasExternalAPICalls,
    securityRiskLevel: securityPatterns.securityRiskLevel,
  };
}

/**
 * Detect security-relevant patterns in file content
 */
function detectSecurityPatterns(content: string) {
  const patterns = {
    hasSecurityPatterns: false,
    hasAuthenticationCode: false,
    hasAPIRoutes: false,
    hasEnvironmentVariables: false,
    hasCryptographicOperations: false,
    hasFileOperations: false,
    hasDatabaseOperations: false,
    hasExternalAPICalls: false,
    securityRiskLevel: "none" as "high" | "medium" | "low" | "none",
  };

  const securityKeywords = {
    auth: [
      "auth",
      "login",
      "logout",
      "session",
      "token",
      "jwt",
      "oauth",
      "passport",
      "clerk",
      "nextauth",
    ],
    crypto: [
      "crypto",
      "encrypt",
      "decrypt",
      "hash",
      "bcrypt",
      "scrypt",
      "pbkdf2",
      "aes",
      "rsa",
    ],
    database: [
      "prisma",
      "mongoose",
      "sequelize",
      "knex",
      "sql",
      "query",
      "database",
    ],
    fileOps: ["fs.", "readFile", "writeFile", "path.join", "path.resolve"],
    apiCalls: ["fetch(", "axios", "request(", "http.", "https."],
    env: ["process.env", "dotenv", ".env"],
    dangerous: [
      "eval(",
      "dangerouslySetInnerHTML",
      "innerHTML",
      "document.write",
    ],
  };

  const lowerContent = content.toLowerCase();

  // Check authentication patterns
  if (securityKeywords.auth.some((keyword) => lowerContent.includes(keyword))) {
    patterns.hasAuthenticationCode = true;
    patterns.hasSecurityPatterns = true;
  }

  // Check cryptographic operations
  if (
    securityKeywords.crypto.some((keyword) => lowerContent.includes(keyword))
  ) {
    patterns.hasCryptographicOperations = true;
    patterns.hasSecurityPatterns = true;
  }

  // Check database operations
  if (
    securityKeywords.database.some((keyword) => lowerContent.includes(keyword))
  ) {
    patterns.hasDatabaseOperations = true;
    patterns.hasSecurityPatterns = true;
  }

  // Check file operations
  if (securityKeywords.fileOps.some((keyword) => content.includes(keyword))) {
    patterns.hasFileOperations = true;
    patterns.hasSecurityPatterns = true;
  }

  // Check external API calls
  if (securityKeywords.apiCalls.some((keyword) => content.includes(keyword))) {
    patterns.hasExternalAPICalls = true;
    patterns.hasSecurityPatterns = true;
  }

  // Check environment variables
  if (securityKeywords.env.some((keyword) => content.includes(keyword))) {
    patterns.hasEnvironmentVariables = true;
    patterns.hasSecurityPatterns = true;
  }

  // Check API routes
  if (
    content.includes("export") &&
    (content.includes("GET") ||
      content.includes("POST") ||
      content.includes("PUT") ||
      content.includes("DELETE"))
  ) {
    patterns.hasAPIRoutes = true;
    patterns.hasSecurityPatterns = true;
  }

  // Determine risk level
  const highRiskPatterns = securityKeywords.dangerous.some((keyword) =>
    content.includes(keyword)
  );
  const mediumRiskCount = [
    patterns.hasAuthenticationCode,
    patterns.hasCryptographicOperations,
    patterns.hasAPIRoutes,
    patterns.hasDatabaseOperations,
  ].filter(Boolean).length;

  if (highRiskPatterns) {
    patterns.securityRiskLevel = "high";
  } else if (mediumRiskCount >= 2) {
    patterns.securityRiskLevel = "medium";
  } else if (patterns.hasSecurityPatterns) {
    patterns.securityRiskLevel = "low";
  }

  return patterns;
}

/**
 * Determine security file type based on file path and content
 */
function determineSecurityFileType(
  filePath: string,
  content: string
): SecurityFileType {
  const fileName = path.basename(filePath);
  const dirPath = path.dirname(filePath);

  // API routes
  if (dirPath.includes("/api/") || dirPath.includes("\\api\\")) {
    return "api_route";
  }

  // Middleware
  if (
    fileName.includes("middleware") ||
    fileName === "middleware.ts" ||
    fileName === "middleware.js"
  ) {
    return "middleware";
  }

  // Configuration files
  if (
    [
      "next.config.js",
      "next.config.ts",
      "tailwind.config.js",
      "eslint.config.js",
    ].includes(fileName)
  ) {
    return "config";
  }

  // Environment files
  if (fileName.startsWith(".env")) {
    return "environment";
  }

  // Auth-related files
  if (
    content.includes("auth") ||
    content.includes("login") ||
    content.includes("session")
  ) {
    return "provider";
  }

  // Utility files
  if (
    fileName.includes("util") ||
    fileName.includes("helper") ||
    dirPath.includes("utils") ||
    dirPath.includes("helpers")
  ) {
    return "utility";
  }

  // Hooks
  if (
    fileName.startsWith("use") &&
    (fileName.endsWith(".ts") || fileName.endsWith(".tsx"))
  ) {
    return "hook";
  }

  // Services
  if (fileName.includes("service") || dirPath.includes("services")) {
    return "service";
  }

  // Constants
  if (fileName.includes("constant") || dirPath.includes("constants")) {
    return "constant";
  }

  // Test files
  if (
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    dirPath.includes("__tests__")
  ) {
    return "test";
  }

  // Component files (default for React files)
  if (fileName.endsWith(".tsx") || fileName.endsWith(".jsx")) {
    return "component";
  }

  // Type definitions
  if (fileName.endsWith(".d.ts") || fileName.includes("types")) {
    return "type_definition";
  }

  return "utility";
}

/**
 * Analyze file for security patterns
 */
function analyzeSecurityPatterns(content: string, filePath: string) {
  const patterns: SecurityPattern[] = [];
  const lines = content.split("\n");

  // Common security patterns to detect
  const securityChecks = [
    {
      pattern: /(?:password|secret|key|token)\s*[:=]\s*["'][\w\-+/=]{8,}["']/gi,
      type: "hardcoded_secret" as SecurityPatternType,
      severity: "critical" as const,
    },
    {
      pattern: /eval\s*\(/gi,
      type: "dangerous_function" as SecurityPatternType,
      severity: "high" as const,
    },
    {
      pattern: /dangerouslySetInnerHTML/gi,
      type: "unsafe_html" as SecurityPatternType,
      severity: "medium" as const,
    },
    {
      pattern: /Math\.random\(\)/gi,
      type: "weak_crypto" as SecurityPatternType,
      severity: "medium" as const,
    },
    {
      pattern: /localStorage\.(setItem|getItem)/gi,
      type: "insecure_storage" as SecurityPatternType,
      severity: "low" as const,
    },
    {
      pattern: /console\.(log|warn|error)/gi,
      type: "info_disclosure" as SecurityPatternType,
      severity: "low" as const,
    },
  ];

  securityChecks.forEach((check) => {
    let match;
    while ((match = check.pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split("\n").length;
      const lineContent = lines[lineNumber - 1] || "";

      patterns.push({
        patternType: check.type,
        pattern: match[0],
        lineNumber,
        context: lineContent.trim(),
        severity: check.severity,
        confidence: "high" as const,
      });
    }
  });

  return patterns;
}

/**
 * Simple component counter for metadata
 */
function countComponents(content: string): number {
  const componentPatterns = [
    /export\s+default\s+function\s+[A-Z]/g,
    /export\s+function\s+[A-Z]/g,
    /const\s+[A-Z][a-zA-Z]*\s*=\s*\(/g,
    /function\s+[A-Z][a-zA-Z]*\s*\(/g,
  ];

  let count = 0;
  componentPatterns.forEach((pattern) => {
    const matches = content.match(pattern);
    if (matches) count += matches.length;
  });

  return Math.max(1, count);
}

/**
 * Main directory scan with complete security analysis
 */
export async function scanDirectory(
  dir: string,
  config: ConfigManager
): Promise<ScanResult> {
  const scanStartTime = Date.now();

  // FIXED: Ensure root-level files are captured with explicit patterns
  const rootConfigPatterns = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "tailwind.config.ts",
    "tailwind.config.js",
    "tailwind.config.mjs",
    "package.json",
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    "tsconfig.json",
    "eslint.config.ts",
    "eslint.config.js",
    ".eslintrc.js",
    ".eslintrc.json",
    "middleware.ts",
    "middleware.js",
    "instrumentation.ts",
    "instrumentation.js",
  ];

  // Source file patterns
  const sourcePatterns = config.fileExtensions?.map((ext) => `**/*${ext}`) || [
    "**/*.{ts,tsx,js,jsx}",
  ];

  // Deep source patterns for modern Next.js structure
  const deepSourcePatterns = [
    "src/**/*.{ts,tsx,js,jsx}",
    "app/**/*.{ts,tsx,js,jsx}",
    "pages/**/*.{ts,tsx,js,jsx}",
    "components/**/*.{ts,tsx,js,jsx}",
    "hooks/**/*.{ts,tsx,js,jsx}",
    "lib/**/*.{ts,tsx,js,jsx}",
    "utils/**/*.{ts,tsx,js,jsx}",
    "context/**/*.{ts,tsx,js,jsx}",
    "contexts/**/*.{ts,tsx,js,jsx}",
    "store/**/*.{ts,tsx,js,jsx}",
    "styles/**/*.{ts,tsx,js,jsx,css,scss}",
    "constants/**/*.{ts,tsx,js,jsx}",
    "types/**/*.{ts,tsx,js,jsx}",
    "schemas/**/*.{ts,tsx,js,jsx}",
  ];

  // Security-relevant patterns
  const securityPatterns = [
    "**/api/**/*.{ts,js}",
    "**/auth/**/*.{ts,tsx,js,jsx}",
    "**/config/**/*.{ts,js}",
    "**/security/**/*.{ts,tsx,js,jsx}",
    "**/*auth*.{ts,tsx,js,jsx}",
    "**/*middleware*.{ts,js}",
    "**/*config*.{ts,js}",
  ];

  // FIXED: Run root patterns separately to ensure they're found
  console.log(`📁 Scanning for root config files in: ${dir}`);

  const rootFiles = await fg(rootConfigPatterns, {
    cwd: dir,
    absolute: true,
    onlyFiles: true,
    dot: true, // Include .env files
    followSymbolicLinks: false,
  });

  console.log(
    `🔧 Root scan found: ${rootFiles.map((f) => path.basename(f)).join(", ")}`
  );

  // Scan for source and other files
  const sourceFiles = await fg(
    [...sourcePatterns, ...deepSourcePatterns, ...securityPatterns],
    {
      cwd: dir,
      absolute: true,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/.nyc_output/**",
        "**/out/**",
      ],
      followSymbolicLinks: false,
      concurrency: 6,
      onlyFiles: true,
    }
  );

  // Combine and deduplicate
  const allFiles = [...new Set([...rootFiles, ...sourceFiles])];

  console.log(`📁 Total files found: ${allFiles.length}`);
  console.log(
    `🔧 Root config files: ${rootFiles.map((f) => path.basename(f)).join(", ")}`
  );

  // Perform complete scan
  const scanResult = await performFullScan(allFiles, dir);

  // Calculate scan duration
  const scanDuration = Date.now() - scanStartTime;
  scanResult.securityScanMetadata.scanDuration = scanDuration;

  return scanResult;
}

/**
 * Perform complete directory scan with security analysis
 */
async function performFullScan(
  filePaths: string[],
  projectDir: string
): Promise<ScanResult> {
  const sourceFiles = new Map<string, ts.SourceFile>();
  const fileContents = new Map<string, string>();
  const fileMetadata = new Map<string, FileCacheMetadata>();
  const securityFiles: SecurityFileInfo[] = [];
  const configFiles: ConfigFileInfo[] = [];
  const environmentFiles: EnvironmentFileInfo[] = [];
  const apiRoutes: APIRouteInfo[] = [];
  const middlewareFiles: MiddlewareInfo[] = [];
  const packageInfo: PackageInfo[] = [];

  // ADDITION: Separate parseable and config files
  const parseableExtensions = [".ts", ".tsx", ".js", ".jsx"];
  const parseableFiles = filePaths.filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return parseableExtensions.includes(ext);
  });

  const configOnlyFiles = filePaths.filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return !parseableExtensions.includes(ext);
  });

  const batchSize = 50;

  // MODIFICATION: Only process parseable files for AST/content parsing
  for (let i = 0; i < parseableFiles.length; i += batchSize) {
    const batch = parseableFiles.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (filePath) => {
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          fileContents.set(filePath, content);

          // Create TypeScript source file
          const sourceFile = ts.createSourceFile(
            filePath,
            content,
            ts.ScriptTarget.Latest,
            true
          );
          sourceFiles.set(filePath, sourceFile);

          // Extract metadata
          const metadata = processFileMetadata(content, filePath);
          fileMetadata.set(filePath, metadata);

          // Security analysis for parseable files
          if (metadata.hasSecurityPatterns) {
            const fileType = determineSecurityFileType(filePath, content);
            const patterns = analyzeSecurityPatterns(content, filePath);

            const securityFile: SecurityFileInfo = {
              filePath,
              fileType,
              securityRelevance: (metadata.securityRiskLevel === "none"
                ? "low"
                : metadata.securityRiskLevel) as
                | "critical"
                | "high"
                | "medium"
                | "low",
              scanTimestamp: Date.now(),
              patterns,
              metadata: {
                hasSecrets: patterns.some(
                  (p) => p.patternType === "hardcoded_secret"
                ),
                hasAuthCode: metadata.hasAuthenticationCode || false,
                hasValidation:
                  content.includes("validate") || content.includes("schema"),
                hasCrypto: metadata.hasCryptographicOperations || false,
                hasFileOps: metadata.hasFileOperations || false,
                hasNetworkOps: metadata.hasExternalAPICalls || false,
                hasEval: patterns.some(
                  (p) => p.patternType === "dangerous_function"
                ),
                hasDangerousHTML: patterns.some(
                  (p) => p.patternType === "unsafe_html"
                ),
                packageDependencies: extractPackageDependencies(content),
                environmentAccess: extractEnvironmentAccess(content),
                externalConnections: extractExternalConnections(content),
              },
            };

            securityFiles.push(securityFile);

            // Categorize specific file types
            if (fileType === "api_route") {
              apiRoutes.push(analyzeAPIRoute(filePath, content));
            } else if (fileType === "middleware") {
              middlewareFiles.push(analyzeMiddleware(filePath, content));
            }
          }
        } catch (error) {
          console.error(`❌ Error processing file ${filePath}:`, error);
        }
      })
    );
  }

  // ADDITION: Process config files separately (no AST parsing)
  for (const filePath of configOnlyFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      const fileName = path.basename(filePath);

      // Handle config files
      if (
        fileName.startsWith("next.config") ||
        fileName === "package.json" ||
        fileName.includes("config")
      ) {
        configFiles.push(analyzeConfigFile(filePath, content));
      }

      // Handle environment files
      if (fileName.startsWith(".env")) {
        environmentFiles.push(analyzeEnvironmentFile(filePath, content));
      }
    } catch (error) {
      console.error(`❌ Error processing config file ${filePath}:`, error);
    }
  }

  // Analyze package.json for security information (keep existing logic)
  try {
    const packageJsonPath = path.join(projectDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageContent = fs.readFileSync(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageContent);
      packageInfo.push(...analyzePackageJson(packageJson, packageJsonPath));
    }
  } catch (error) {
    console.warn("Could not analyze package.json:", error);
  }

  return {
    filePaths: parseableFiles, // CHANGE: Only return parseable files for downstream processing
    sourceFiles,
    fileContents,
    fileMetadata,
    securityFiles,
    configFiles,
    environmentFiles,
    apiRoutes,
    middlewareFiles,
    packageInfo,
    securityScanMetadata: {
      scanTimestamp: Date.now(),
      scanDuration: 0, // Will be set by caller
      filesScanned: filePaths.length, // Total files scanned (including config)
      securityIssuesFound: securityFiles.reduce(
        (total, file) => total + file.patterns.length,
        0
      ),
      riskLevel: calculateOverallRiskLevel(securityFiles),
      coveragePercentage: (securityFiles.length / filePaths.length) * 100,
    },
  };
}

/**
 * Helper functions for security analysis
 */
function extractPackageDependencies(content: string): string[] {
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  const dependencies = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const packageName = match[1];
    if (!packageName.startsWith(".") && !packageName.startsWith("/")) {
      dependencies.push(packageName);
    }
  }

  return [...new Set(dependencies)];
}

function extractEnvironmentAccess(content: string): string[] {
  const envRegex = /process\.env\.(\w+)/g;
  const variables = [];
  let match;

  while ((match = envRegex.exec(content)) !== null) {
    variables.push(match[1]);
  }

  return [...new Set(variables)];
}

function extractExternalConnections(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s'"]+/g;
  const urls = [];
  let match;

  while ((match = urlRegex.exec(content)) !== null) {
    urls.push(match[0]);
  }

  return [...new Set(urls)];
}

function analyzeAPIRoute(filePath: string, content: string): APIRouteInfo {
  return {
    filePath,
    route: extractRouteFromPath(filePath),
    method: extractHTTPMethods(content),
    handlerFunctions: extractHandlerFunctions(content),
    middleware: [],
    authenticationRequired:
      content.includes("auth") || content.includes("token"),
    validationPresent:
      content.includes("validate") || content.includes("schema"),
    inputSources: extractInputSources(content),
    databaseAccess:
      content.includes("prisma") ||
      content.includes("db.") ||
      content.includes("query"),
    externalAPICalls: content.includes("fetch") || content.includes("axios"),
    securityHeaders: [],
    errorHandling:
      content.includes("try") && content.includes("catch") ? ["try-catch"] : [],
    scanTimestamp: Date.now(),
  };
}

function analyzeMiddleware(filePath: string, content: string): MiddlewareInfo {
  return {
    filePath,
    middlewareType: determineMiddlewareType(content),
    appliesTo: [],
    securityFunctions: extractSecurityFunctions(content),
    configurationOptions: {},
    dependencies: extractPackageDependencies(content),
    scanTimestamp: Date.now(),
  };
}

function analyzeConfigFile(filePath: string, content: string): ConfigFileInfo {
  return {
    filePath,
    configType: determineConfigFileType(filePath),
    parsedConfig: {},
    securitySettings: [],
    missingSecuritySettings: [],
    scanTimestamp: Date.now(),
  };
}

function analyzeEnvironmentFile(
  filePath: string,
  content: string
): EnvironmentFileInfo {
  const lines = content.split("\n");
  const variables = lines
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const [name] = line.split("=");
      return {
        name: name.trim(),
        isSensitive: isSensitiveVariable(name.trim()),
        usageLocations: [],
        exposureRisk: "server" as const,
      };
    });

  return {
    filePath,
    envType: determineEnvType(filePath),
    variables,
    securityIssues: [],
    scanTimestamp: Date.now(),
  };
}

function analyzePackageJson(packageJson: any, filePath: string): PackageInfo[] {
  const packages: PackageInfo[] = [];
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const [name, version] of Object.entries(dependencies)) {
    packages.push({
      name,
      version: version as string,
      securityCategory: categorizePackage(name),
      vulnerabilities: [],
      usageLocations: [],
      configurationFiles: [],
      securityFeatures: [],
      riskAssessment: {
        overallRisk: "low",
        riskFactors: [],
        mitigations: [],
        recommendedActions: [],
      },
    });
  }

  return packages;
}

/**
 * Helper functions for analysis
 */
function calculateOverallRiskLevel(
  securityFiles: SecurityFileInfo[]
): "critical" | "high" | "medium" | "low" {
  const hasCritical = securityFiles.some((f) =>
    f.patterns.some((p) => p.severity === "critical")
  );
  const hasHigh = securityFiles.some((f) =>
    f.patterns.some((p) => p.severity === "high")
  );
  const hasMedium = securityFiles.some((f) =>
    f.patterns.some((p) => p.severity === "medium")
  );

  if (hasCritical) return "critical";
  if (hasHigh) return "high";
  if (hasMedium) return "medium";
  return "low";
}

function extractRouteFromPath(filePath: string): string {
  const apiIndex = filePath.indexOf("/api/");
  if (apiIndex !== -1) {
    return filePath.substring(apiIndex + 4).replace(/\.(ts|js|tsx|jsx)$/, "");
  }
  return "";
}

function extractHTTPMethods(content: string): string[] {
  const methods = [];
  if (
    content.includes("export async function GET") ||
    content.includes("export function GET")
  )
    methods.push("GET");
  if (
    content.includes("export async function POST") ||
    content.includes("export function POST")
  )
    methods.push("POST");
  if (
    content.includes("export async function PUT") ||
    content.includes("export function PUT")
  )
    methods.push("PUT");
  if (
    content.includes("export async function DELETE") ||
    content.includes("export function DELETE")
  )
    methods.push("DELETE");
  if (
    content.includes("export async function PATCH") ||
    content.includes("export function PATCH")
  )
    methods.push("PATCH");
  return methods;
}

function extractHandlerFunctions(content: string): string[] {
  const handlerRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  const handlers = [];
  let match;

  while ((match = handlerRegex.exec(content)) !== null) {
    handlers.push(match[1]);
  }

  return handlers;
}

function extractInputSources(content: string): string[] {
  const sources = [];
  if (content.includes("request.body") || content.includes("req.body"))
    sources.push("body");
  if (content.includes("request.query") || content.includes("req.query"))
    sources.push("query");
  if (content.includes("request.params") || content.includes("req.params"))
    sources.push("params");
  if (content.includes("request.headers") || content.includes("req.headers"))
    sources.push("headers");
  if (content.includes("request.cookies") || content.includes("req.cookies"))
    sources.push("cookies");
  return sources;
}

function determineMiddlewareType(
  content: string
): "auth" | "cors" | "security" | "logging" | "validation" | "custom" {
  if (content.includes("auth") || content.includes("login")) return "auth";
  if (content.includes("cors")) return "cors";
  if (content.includes("helmet") || content.includes("security"))
    return "security";
  if (content.includes("log")) return "logging";
  if (content.includes("validate")) return "validation";
  return "custom";
}

function extractSecurityFunctions(content: string): string[] {
  const securityFunctions = [];
  if (content.includes("authenticate")) securityFunctions.push("authenticate");
  if (content.includes("authorize")) securityFunctions.push("authorize");
  if (content.includes("validate")) securityFunctions.push("validate");
  if (content.includes("sanitize")) securityFunctions.push("sanitize");
  if (content.includes("rateLimit")) securityFunctions.push("rateLimit");
  return securityFunctions;
}

function determineConfigFileType(filePath: string): ConfigFileType {
  const fileName = path.basename(filePath);
  if (fileName.startsWith("next.config")) return "next_config";
  if (fileName === "package.json") return "package_json";
  if (fileName.startsWith("tsconfig")) return "tsconfig";
  if (fileName.includes("eslint")) return "eslint_config";
  if (fileName.startsWith(".env")) return "env_config";
  if (fileName.includes("docker")) return "docker_config";
  if (fileName.includes("vercel")) return "vercel_config";
  if (fileName.includes("webpack")) return "webpack_config";
  if (fileName.includes("babel")) return "babel_config";
  if (fileName.includes("tailwind")) return "tailwind_config";
  if (fileName.includes("jest")) return "jest_config";
  return "next_config";
}

function determineEnvType(
  filePath: string
): "development" | "production" | "test" | "unknown" {
  const fileName = path.basename(filePath);
  if (fileName.includes(".dev") || fileName.includes(".development"))
    return "development";
  if (fileName.includes(".prod") || fileName.includes(".production"))
    return "production";
  if (fileName.includes(".test")) return "test";
  return "unknown";
}

function isSensitiveVariable(name: string): boolean {
  const sensitivePatterns = [
    "password",
    "secret",
    "key",
    "token",
    "api_key",
    "private",
    "auth",
  ];
  return sensitivePatterns.some((pattern) =>
    name.toLowerCase().includes(pattern)
  );
}

function categorizePackage(packageName: string): PackageSecurityCategory {
  const authPackages = [
    "next-auth",
    "@auth0/auth0-react",
    "clerk",
    "passport",
    "jsonwebtoken",
  ];
  const cryptoPackages = ["bcrypt", "crypto-js", "node-forge", "jose"];
  const validationPackages = ["zod", "joi", "yup", "ajv"];
  const databasePackages = ["prisma", "mongoose", "sequelize", "typeorm"];
  const paymentPackages = ["stripe", "@stripe/stripe-js", "paypal"];

  if (authPackages.some((pkg) => packageName.includes(pkg)))
    return "authentication";
  if (cryptoPackages.some((pkg) => packageName.includes(pkg)))
    return "cryptography";
  if (validationPackages.some((pkg) => packageName.includes(pkg)))
    return "validation";
  if (databasePackages.some((pkg) => packageName.includes(pkg)))
    return "database";
  if (paymentPackages.some((pkg) => packageName.includes(pkg)))
    return "payment";

  return "unknown";
}

/**
 * Get file paths only, for compatibility with existing code that needs just paths
 */
export async function getFilePaths(
  dir: string,
  config: ConfigManager
): Promise<string[]> {
  const scanResult = await scanDirectory(dir, config);
  return scanResult.filePaths;
}
