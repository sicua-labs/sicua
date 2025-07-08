/**
 * Detector for server-only imports in client-side code
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { ConfidenceLevel, Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";

export class ServerOnlyImportsDetector extends BaseDetector {
  private static readonly SERVER_IMPORT_PATTERNS: PatternDefinition[] = [
    {
      id: "nodejs-builtin-import",
      name: "Node.js built-in module import",
      description:
        "Node.js built-in module imported in client-side code - this will fail at runtime",
      pattern: {
        type: "regex",
        expression:
          /import.*['"](?:fs|path|os|crypto|buffer|stream|http|https|net|url|util|child_process|cluster|dgram|dns|events|readline|repl|tls|vm|zlib|worker_threads)['"]|require\(['"](?:fs|path|os|crypto|buffer|stream|http|https|net|url|util|child_process|cluster|dgram|dns|events|readline|repl|tls|vm|zlib|worker_threads)['"]\)/g,
      },
      vulnerabilityType: "server-only-import",
      severity: "high",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "database-import-client",
      name: "Database library import in client code",
      description:
        "Database library imported in client-side code - credentials may be exposed",
      pattern: {
        type: "regex",
        expression:
          /import.*['"](?:mysql|postgres|pg|mongodb|mongoose|prisma|sequelize|typeorm|knex)['"]|require\(['"](?:mysql|postgres|pg|mongodb|mongoose|prisma|sequelize|typeorm|knex)['"]\)/g,
      },
      vulnerabilityType: "server-only-import",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  // Node.js built-in modules that should never be used in client code
  private static readonly NODEJS_BUILTINS = [
    "fs",
    "path",
    "os",
    "crypto",
    "buffer",
    "stream",
    "http",
    "https",
    "net",
    "url",
    "util",
    "child_process",
    "cluster",
    "dgram",
    "dns",
    "events",
    "readline",
    "repl",
    "tls",
    "vm",
    "zlib",
    "worker_threads",
    "perf_hooks",
    "inspector",
    "async_hooks",
    "trace_events",
    "v8",
    "domain",
    "punycode",
    "querystring",
    "string_decoder",
    "timers",
  ];

  // Server-side libraries that expose sensitive functionality
  private static readonly SERVER_ONLY_LIBRARIES = [
    // Databases
    "mysql",
    "mysql2",
    "postgres",
    "pg",
    "mongodb",
    "mongoose",
    "prisma",
    "sequelize",
    "typeorm",
    "knex",
    "sqlite",
    "sqlite3",
    "redis",
    "ioredis",
    "cassandra-driver",
    "neo4j-driver",

    // Authentication server libraries
    "bcrypt",
    "bcryptjs",
    "argon2",
    "scrypt",
    "pbkdf2",
    "jsonwebtoken",
    "passport",
    "passport-local",
    "passport-jwt",
    "express-session",

    // Server frameworks/middleware
    "express",
    "koa",
    "fastify",
    "hapi",
    "restify",
    "connect",
    "cors",
    "helmet",
    "morgan",
    "compression",
    "cookie-parser",

    // File/System operations
    "multer",
    "formidable",
    "archiver",
    "tar",
    "yauzl",
    "yazl",
    "chokidar",
    "nodemon",
    "pm2",
    "forever",

    // Process/System utilities
    "shelljs",
    "execa",
    "cross-spawn",
    "which",
    "find-up",
    "graceful-fs",
    "rimraf",
    "mkdirp",
    "glob",
    "minimatch",

    // Cryptography (server-side)
    "node-forge",
    "crypto-js",
    "tweetnacl",
    "sodium-native",

    // Email/SMS
    "nodemailer",
    "sendgrid",
    "mailgun",
    "twilio",

    // Payment processing
    "stripe",
    "paypal-rest-sdk",
    "braintree",

    // AWS/Cloud services (server SDKs)
    "aws-sdk",
    "@aws-sdk",
    "google-cloud",
    "azure",

    // Development/Build tools
    "webpack",
    "rollup",
    "vite",
    "esbuild",
    "babel",
    "typescript",
    "eslint",
    "prettier",
    "jest",
    "mocha",
    "chai",
    "sinon",
  ];

  // Libraries that might be server-only depending on usage
  private static readonly POTENTIALLY_SERVER_ONLY = [
    "axios", // Can be client or server, but check context
    "node-fetch", // Server-only fetch polyfill
    "undici", // Server-side HTTP client
    "got", // Server-side HTTP client
    "superagent", // Can be both, but often server
    "request", // Deprecated, but server-only
    "dotenv", // Environment variables (server-only)
    "config", // Configuration management
    "winston",
    "bunyan",
    "pino", // Server-side logging
  ];

  constructor() {
    super(
      "ServerOnlyImportsDetector",
      "server-only-import",
      "high",
      ServerOnlyImportsDetector.SERVER_IMPORT_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter for client-side files only
    const clientFiles = this.filterClientSideFiles(scanResult);

    for (const filePath of clientFiles) {
      const content = scanResult.fileContents.get(filePath);
      if (!content) continue;

      // Apply AST-based analysis for comprehensive detection
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForServerImports(sf, fp)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Apply pattern matching as backup
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateServerImportMatch(match, filePath)
        );

      // Process pattern vulnerabilities
      for (const vuln of patternVulnerabilities) {
        if (this.validateVulnerability(vuln)) {
          vulnerabilities.push(vuln);
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Filter files to only include client-side files
   */
  private filterClientSideFiles(scanResult: ScanResult): string[] {
    return scanResult.filePaths.filter((filePath) => {
      const normalizedPath = filePath.replace(/\\/g, "/");

      // Exclude server-side file locations
      const serverPaths = [
        "/api/",
        "/pages/api/",
        "/app/api/",
        "/server/",
        "/lib/server/",
        "/utils/server/",
        "middleware.ts",
        "middleware.js",
        "/prisma/",
        "/database/",
        "/db/",
        "next.config",
        ".env",
      ];

      if (
        serverPaths.some((serverPath) => normalizedPath.includes(serverPath))
      ) {
        return false;
      }

      // Include client-side file locations
      const clientPaths = [
        "/components/",
        "/pages/",
        "/app/",
        "/src/",
        "/hooks/",
        "/utils/",
        "/lib/",
      ];

      // Only process supported file extensions
      const supportedExtensions = [".ts", ".tsx", ".js", ".jsx"];
      if (!supportedExtensions.some((ext) => filePath.endsWith(ext))) {
        return false;
      }

      // Include if it's in a client path or not specifically server
      return (
        clientPaths.some((clientPath) => normalizedPath.includes(clientPath)) ||
        !serverPaths.some((serverPath) => normalizedPath.includes(serverPath))
      );
    });
  }

  /**
   * Validate if a server import pattern match is actually problematic
   */
  private validateServerImportMatch(
    matchResult: any,
    filePath: string
  ): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Check if it's in a type-only import (TypeScript)
    if (match.context && match.context.includes("import type")) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for server-only imports
   */
  private analyzeASTForServerImports(
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find import declarations
    const importDeclarations = this.findImportDeclarations(sourceFile);
    for (const importDecl of importDeclarations) {
      const importVuln = this.analyzeImportDeclaration(
        importDecl,
        sourceFile,
        filePath
      );
      if (importVuln) {
        vulnerabilities.push(importVuln);
      }
    }

    // Find require calls
    const requireCalls = this.findRequireCalls(sourceFile);
    for (const requireCall of requireCalls) {
      const requireVuln = this.analyzeRequireCall(
        requireCall,
        sourceFile,
        filePath
      );
      if (requireVuln) {
        vulnerabilities.push(requireVuln);
      }
    }

    // Find dynamic imports
    const dynamicImports = this.findDynamicImports(sourceFile);
    for (const dynamicImport of dynamicImports) {
      const dynamicVuln = this.analyzeDynamicImport(
        dynamicImport,
        sourceFile,
        filePath
      );
      if (dynamicVuln) {
        vulnerabilities.push(dynamicVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find import declarations
   */
  private findImportDeclarations(
    sourceFile: ts.SourceFile
  ): ts.ImportDeclaration[] {
    return ASTTraverser.findNodesByKind<ts.ImportDeclaration>(
      sourceFile,
      ts.SyntaxKind.ImportDeclaration
    );
  }

  /**
   * Find require() calls
   */
  private findRequireCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        return (
          ts.isIdentifier(node.expression) && node.expression.text === "require"
        );
      }
    );
  }

  /**
   * Find dynamic import() calls
   */
  private findDynamicImports(sourceFile: ts.SourceFile): ts.CallExpression[] {
    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        return node.expression.kind === ts.SyntaxKind.ImportKeyword;
      }
    );
  }

  /**
   * Analyze import declaration for server-only modules
   */
  private analyzeImportDeclaration(
    importDecl: ts.ImportDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
      return null;
    }

    const moduleName = importDecl.moduleSpecifier.text;

    // Skip type-only imports
    if (importDecl.importClause?.isTypeOnly) {
      return null;
    }

    // Skip TypeScript AST type imports in type definition files - ADD THIS CHECK
    if (this.isTypeDefinitionFile(filePath) && moduleName === "typescript") {
      return null;
    }

    const serverImportAnalysis = this.analyzeModuleForServerOnly(moduleName);

    if (!serverImportAnalysis) return null;

    const location = ASTTraverser.getNodeLocation(importDecl, sourceFile);
    const context = ASTTraverser.getNodeContext(importDecl, sourceFile);
    const code = ASTTraverser.getNodeText(importDecl, sourceFile);

    return this.createVulnerability(
      filePath,
      {
        line: location.line,
        column: location.column,
        endLine: location.line,
        endColumn: location.column + code.length,
      },
      {
        code,
        surroundingContext: context,
        functionName: this.extractFunctionFromAST(importDecl),
        componentName: this.extractComponentName(filePath),
      },
      serverImportAnalysis.description,
      serverImportAnalysis.severity,
      serverImportAnalysis.confidence,
      {
        moduleName,
        importType: "import-declaration",
        category: serverImportAnalysis.category,
        recommendations: serverImportAnalysis.recommendations,
        detectionMethod: "import-declaration-analysis",
      }
    );
  }

  /**
   * Analyze require call for server-only modules
   */
  private analyzeRequireCall(
    requireCall: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (requireCall.arguments.length === 0) return null;

    const firstArg = requireCall.arguments[0];
    if (!ts.isStringLiteral(firstArg)) return null;

    const moduleName = firstArg.text;
    const serverImportAnalysis = this.analyzeModuleForServerOnly(moduleName);

    if (!serverImportAnalysis) return null;

    const location = ASTTraverser.getNodeLocation(requireCall, sourceFile);
    const context = ASTTraverser.getNodeContext(requireCall, sourceFile);
    const code = ASTTraverser.getNodeText(requireCall, sourceFile);

    return this.createVulnerability(
      filePath,
      {
        line: location.line,
        column: location.column,
        endLine: location.line,
        endColumn: location.column + code.length,
      },
      {
        code,
        surroundingContext: context,
        functionName: this.extractFunctionFromAST(requireCall),
        componentName: this.extractComponentName(filePath),
      },
      serverImportAnalysis.description,
      serverImportAnalysis.severity,
      serverImportAnalysis.confidence,
      {
        moduleName,
        importType: "require-call",
        category: serverImportAnalysis.category,
        recommendations: serverImportAnalysis.recommendations,
        detectionMethod: "require-call-analysis",
      }
    );
  }

  /**
   * Analyze dynamic import for server-only modules
   */
  private analyzeDynamicImport(
    dynamicImport: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (dynamicImport.arguments.length === 0) return null;

    const firstArg = dynamicImport.arguments[0];
    if (!ts.isStringLiteral(firstArg)) return null;

    const moduleName = firstArg.text;
    const serverImportAnalysis = this.analyzeModuleForServerOnly(moduleName);

    if (!serverImportAnalysis) return null;

    const location = ASTTraverser.getNodeLocation(dynamicImport, sourceFile);
    const context = ASTTraverser.getNodeContext(dynamicImport, sourceFile);
    const code = ASTTraverser.getNodeText(dynamicImport, sourceFile);

    return this.createVulnerability(
      filePath,
      {
        line: location.line,
        column: location.column,
        endLine: location.line,
        endColumn: location.column + code.length,
      },
      {
        code,
        surroundingContext: context,
        functionName: this.extractFunctionFromAST(dynamicImport),
        componentName: this.extractComponentName(filePath),
      },
      serverImportAnalysis.description,
      serverImportAnalysis.severity,
      serverImportAnalysis.confidence,
      {
        moduleName,
        importType: "dynamic-import",
        category: serverImportAnalysis.category,
        recommendations: serverImportAnalysis.recommendations,
        detectionMethod: "dynamic-import-analysis",
      }
    );
  }

  /**
   * Analyze module name to determine if it's server-only
   */
  private analyzeModuleForServerOnly(moduleName: string): {
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    confidence: ConfidenceLevel;
    category: string;
    recommendations: string[];
  } | null {
    // Check Node.js built-ins
    if (ServerOnlyImportsDetector.NODEJS_BUILTINS.includes(moduleName)) {
      return {
        description: `Node.js built-in module '${moduleName}' imported in client code - this will fail at runtime`,
        severity: "high",
        confidence: "high",
        category: "nodejs-builtin",
        recommendations: [
          "Remove this import from client-side code",
          "Move functionality to server-side API route",
          "Use browser-compatible alternatives if available",
          "Consider using a polyfill or web API equivalent",
        ],
      };
    }

    // Check server-only libraries
    const isServerOnlyLib =
      ServerOnlyImportsDetector.SERVER_ONLY_LIBRARIES.some(
        (lib) => moduleName === lib || moduleName.startsWith(`${lib}/`)
      );

    if (isServerOnlyLib) {
      const isCritical = this.isCriticalServerLibrary(moduleName);

      return {
        description: `Server-only library '${moduleName}' imported in client code - ${
          isCritical
            ? "may expose sensitive functionality"
            : "will fail at runtime"
        }`,
        severity: isCritical ? "critical" : "high",
        confidence: "high",
        category: isCritical
          ? "sensitive-server-library"
          : "server-only-library",
        recommendations: [
          "Move this functionality to server-side code",
          "Create API endpoint for client-server communication",
          "Use client-compatible alternatives if needed",
          ...(isCritical
            ? ["Ensure no credentials or sensitive data are exposed"]
            : []),
        ],
      };
    }

    // Check potentially server-only libraries
    const isPotentiallyServerOnly =
      ServerOnlyImportsDetector.POTENTIALLY_SERVER_ONLY.some(
        (lib) => moduleName === lib || moduleName.startsWith(`${lib}/`)
      );

    if (isPotentiallyServerOnly) {
      return {
        description: `Potentially server-only library '${moduleName}' imported in client code - verify this is intended`,
        severity: "medium",
        confidence: "medium",
        category: "potentially-server-only",
        recommendations: [
          "Verify this library works in browser environment",
          "Consider using browser-specific alternatives",
          "Ensure no server-only features are being used",
          "Test thoroughly in browser environment",
        ],
      };
    }

    return null;
  }

  /**
   * Check if a library contains critical/sensitive functionality
   */
  private isCriticalServerLibrary(moduleName: string): boolean {
    const criticalLibraries = [
      "bcrypt",
      "bcryptjs",
      "argon2",
      "scrypt",
      "pbkdf2",
      "jsonwebtoken",
      "passport",
      "express-session",
      "mysql",
      "postgres",
      "mongodb",
      "prisma",
      "sequelize",
      "stripe",
      "paypal-rest-sdk",
      "braintree",
      "nodemailer",
      "sendgrid",
      "twilio",
      "aws-sdk",
      "@aws-sdk",
    ];

    return criticalLibraries.some(
      (lib) => moduleName === lib || moduleName.startsWith(`${lib}/`)
    );
  }

  private isTypeDefinitionFile(filePath: string): boolean {
    const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/");

    return (
      // Type definition files
      normalizedPath.includes(".types.") ||
      normalizedPath.endsWith("types.ts") ||
      normalizedPath.endsWith("types.tsx") ||
      normalizedPath.endsWith(".d.ts") ||
      // Type directories
      normalizedPath.includes("/types/") ||
      normalizedPath.includes("/type/") ||
      normalizedPath.includes("/@types/") ||
      // Interface files
      normalizedPath.includes(".interface.") ||
      normalizedPath.includes("/interfaces/") ||
      // Schema/model files (often contain type imports)
      normalizedPath.includes(".schema.") ||
      normalizedPath.includes("/schemas/") ||
      normalizedPath.includes("/models/") ||
      // Configuration type files
      normalizedPath.includes("config.types.") ||
      normalizedPath.includes("constants.types.")
    );
  }

  /**
   * Extract function name from AST node context
   */
  private extractFunctionFromAST(node: ts.Node): string | undefined {
    let current = node.parent;

    while (current) {
      if (ts.isFunctionDeclaration(current) && current.name) {
        return current.name.text;
      }
      if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
        return current.name.text;
      }
      if (
        ts.isVariableDeclaration(current) &&
        ts.isIdentifier(current.name) &&
        current.initializer &&
        (ts.isFunctionExpression(current.initializer) ||
          ts.isArrowFunction(current.initializer))
      ) {
        return current.name.text;
      }
      current = current.parent;
    }

    return undefined;
  }
}
