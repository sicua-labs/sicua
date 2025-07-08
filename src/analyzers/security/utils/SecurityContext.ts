/**
 * Security context analysis utilities for vulnerability detection
 */

import * as path from "path";

export type FileContext =
  | "api-route"
  | "middleware"
  | "component"
  | "config"
  | "environment"
  | "utility"
  | "test"
  | "unknown";

export type SecurityRiskContext =
  | "authentication"
  | "authorization"
  | "data-processing"
  | "external-communication"
  | "configuration"
  | "client-side"
  | "server-side"
  | "none";

export interface FileContextInfo {
  /** The type of file based on location and content */
  fileType: FileContext;
  /** Security risk areas this file is involved in */
  riskContexts: SecurityRiskContext[];
  /** Whether this file handles sensitive data */
  handlesSensitiveData: boolean;
  /** Whether this file is client-side accessible */
  isClientSide: boolean;
  /** Whether this file has network access */
  hasNetworkAccess: boolean;
  /** Authentication libraries used */
  authLibraries: string[];
  /** Environment variables accessed */
  envVariables: string[];
}

export class SecurityContext {
  /**
   * Determine the context of a file for security analysis
   */
  static analyzeFileContext(
    filePath: string,
    content: string
  ): FileContextInfo {
    const fileType = this.determineFileType(filePath, content);
    const riskContexts = this.identifyRiskContexts(content, fileType);
    const handlesSensitiveData = this.detectsSensitiveDataHandling(content);
    const isClientSide = this.isClientSideFile(filePath, fileType);
    const hasNetworkAccess = this.detectsNetworkAccess(content);
    const authLibraries = this.extractAuthLibraries(content);
    const envVariables = this.extractEnvironmentVariables(content);

    return {
      fileType,
      riskContexts,
      handlesSensitiveData,
      isClientSide,
      hasNetworkAccess,
      authLibraries,
      envVariables,
    };
  }

  /**
   * Determine the type of file based on path and content
   */
  private static determineFileType(
    filePath: string,
    content: string
  ): FileContext {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, "/");
    const fileName = path.basename(filePath);

    // API routes
    if (
      normalizedPath.includes("/api/") ||
      normalizedPath.includes("/pages/api/")
    ) {
      return "api-route";
    }

    // Middleware
    if (
      fileName === "middleware.ts" ||
      fileName === "middleware.js" ||
      normalizedPath.includes("/middleware/")
    ) {
      return "middleware";
    }

    // Configuration files
    if (this.isConfigFile(fileName)) {
      return "config";
    }

    // Environment files
    if (fileName.startsWith(".env")) {
      return "environment";
    }

    // Test files
    if (this.isTestFile(filePath)) {
      return "test";
    }

    // React components
    if (this.isReactComponent(content, filePath)) {
      return "component";
    }

    // Utility files
    if (
      normalizedPath.includes("/utils/") ||
      normalizedPath.includes("/lib/") ||
      normalizedPath.includes("/helpers/")
    ) {
      return "utility";
    }

    return "unknown";
  }

  /**
   * Identify security risk contexts for the file
   */
  private static identifyRiskContexts(
    content: string,
    fileType: FileContext
  ): SecurityRiskContext[] {
    const contexts: SecurityRiskContext[] = [];

    // Authentication patterns
    if (this.hasAuthPatterns(content)) {
      contexts.push("authentication");
    }

    // Authorization patterns
    if (this.hasAuthorizationPatterns(content)) {
      contexts.push("authorization");
    }

    // Data processing patterns
    if (this.hasDataProcessingPatterns(content)) {
      contexts.push("data-processing");
    }

    // External communication patterns
    if (this.hasExternalCommunicationPatterns(content)) {
      contexts.push("external-communication");
    }

    // Configuration management
    if (fileType === "config" || this.hasConfigPatterns(content)) {
      contexts.push("configuration");
    }

    // Client vs server side
    if (this.hasClientSidePatterns(content)) {
      contexts.push("client-side");
    }

    if (this.hasServerSidePatterns(content)) {
      contexts.push("server-side");
    }

    return contexts.length > 0 ? contexts : ["none"];
  }

  /**
   * Check if content suggests sensitive data handling
   */
  private static detectsSensitiveDataHandling(content: string): boolean {
    // TODO: MOVE TO CONSTANTS
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /private[_-]?key/i,
      /credit[_-]?card/i,
      /ssn/i,
      /social[_-]?security/i,
      /personal[_-]?data/i,
      /pii/i,
      /encrypt/i,
      /decrypt/i,
      /hash/i,
      /bcrypt/i,
      /jwt/i,
    ];

    return sensitivePatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Determine if file is client-side accessible
   */
  private static isClientSideFile(
    filePath: string,
    fileType: FileContext
  ): boolean {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, "/");

    // Client-side file locations
    if (
      normalizedPath.includes("/components/") ||
      normalizedPath.includes("/pages/") ||
      normalizedPath.includes("/app/") ||
      normalizedPath.includes("/src/") ||
      normalizedPath.includes("/public/")
    ) {
      return true;
    }

    // File types that are typically client-side
    if (fileType === "component") {
      return true;
    }

    // Server-side only locations
    if (
      normalizedPath.includes("/api/") ||
      normalizedPath.includes("/server/") ||
      fileType === "middleware" ||
      fileType === "config"
    ) {
      return false;
    }

    return true; // Default to client-side for unknown files
  }

  /**
   * Check if content indicates network access
   */
  private static detectsNetworkAccess(content: string): boolean {
    // TODO: MOVE TO CONSTANTS
    const networkPatterns = [
      /fetch\s*\(/,
      /axios\./,
      /http\./,
      /https\./,
      /XMLHttpRequest/,
      /websocket/i,
      /socket\.io/,
      /request\s*\(/,
      /got\s*\(/,
      /superagent/,
      /node-fetch/,
    ];

    return networkPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Extract authentication libraries used
   */
  private static extractAuthLibraries(content: string): string[] {
    const authLibraries: string[] = [];
    // TODO: MOVE TO CONSTANTS
    const authPatterns = [
      { pattern: /next-auth/i, name: "next-auth" },
      { pattern: /\@auth0/i, name: "auth0" },
      { pattern: /clerk/i, name: "clerk" },
      { pattern: /passport/i, name: "passport" },
      { pattern: /jsonwebtoken/i, name: "jsonwebtoken" },
      { pattern: /jwt-decode/i, name: "jwt-decode" },
      { pattern: /bcrypt/i, name: "bcrypt" },
      { pattern: /argon2/i, name: "argon2" },
      { pattern: /scrypt/i, name: "scrypt" },
      { pattern: /firebase.*auth/i, name: "firebase-auth" },
      { pattern: /supabase.*auth/i, name: "supabase-auth" },
    ];

    for (const { pattern, name } of authPatterns) {
      if (pattern.test(content)) {
        authLibraries.push(name);
      }
    }

    return authLibraries;
  }

  /**
   * Extract environment variables accessed in the file
   */
  private static extractEnvironmentVariables(content: string): string[] {
    const envVars: string[] = [];
    const envPattern = /process\.env\.(\w+)/g;
    let match;

    while ((match = envPattern.exec(content)) !== null) {
      if (!envVars.includes(match[1])) {
        envVars.push(match[1]);
      }
    }

    return envVars;
  }

  /**
   * Helper methods for pattern detection
   */
  private static isConfigFile(fileName: string): boolean {
    // TODO: MOVE TO CONSTANTS
    const configFiles = [
      "next.config.js",
      "next.config.ts",
      "tailwind.config.js",
      "tailwind.config.ts",
      "webpack.config.js",
      "webpack.config.ts",
      "vite.config.js",
      "vite.config.ts",
      "tsconfig.json",
      "package.json",
      ".eslintrc.js",
      ".eslintrc.json",
      "babel.config.js",
      "jest.config.js",
    ];
    return configFiles.includes(fileName);
  }

  private static isTestFile(filePath: string): boolean {
    return (
      /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath) ||
      filePath.includes("__tests__") ||
      filePath.includes("/test/") ||
      filePath.includes("/tests/")
    );
  }

  private static isReactComponent(content: string, filePath: string): boolean {
    const hasReactImport =
      /import\s+.*React.*from\s+['"]react['"]/.test(content) ||
      /from\s+['"]react['"]/.test(content);
    const hasJSX = /<[A-Z]/.test(content) || /jsx/i.test(content);
    const isComponentFile = /\.(tsx|jsx)$/.test(filePath);

    return (hasReactImport && hasJSX) || isComponentFile;
  }

  private static hasAuthPatterns(content: string): boolean {
    return /login|logout|signin|signout|authenticate|session|cookie|token|jwt/i.test(
      content
    );
  }

  private static hasAuthorizationPatterns(content: string): boolean {
    return /authorize|permission|role|access|acl|rbac|guard|protect/i.test(
      content
    );
  }

  private static hasDataProcessingPatterns(content: string): boolean {
    return /JSON\.parse|JSON\.stringify|serialize|deserialize|validate|sanitize|transform/i.test(
      content
    );
  }

  private static hasExternalCommunicationPatterns(content: string): boolean {
    return /fetch|axios|http|api|request|webhook|graphql|rest/i.test(content);
  }

  private static hasConfigPatterns(content: string): boolean {
    return /config|settings|environment|env|dotenv/i.test(content);
  }

  private static hasClientSidePatterns(content: string): boolean {
    return /window\.|document\.|localStorage|sessionStorage|location\.|navigator\./i.test(
      content
    );
  }

  private static hasServerSidePatterns(content: string): boolean {
    return /process\.|require\(|import.*node:|fs\.|path\.|os\./i.test(content);
  }
}
