/**
 * Detector for insecure cookie patterns and configurations
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import { COOKIE_LIBRARIES } from "../constants/storage.constants";
import {
  FRAMEWORK_UI_PATTERNS,
  UI_COOKIE_STATE_PATTERNS,
} from "../constants/general.constants";

export class InsecureCookieDetector extends BaseDetector {
  private static readonly COOKIE_PATTERNS: PatternDefinition[] = [
    {
      id: "document-cookie-assignment",
      name: "document.cookie assignment",
      description:
        "document.cookie assignment detected - verify secure cookie attributes",
      pattern: {
        type: "regex",
        expression: /document\.cookie\s*=/g,
      },
      vulnerabilityType: "insecure-cookie",
      severity: "medium",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "cookie-without-secure",
      name: "Cookie without Secure flag",
      description:
        "Cookie set without Secure flag - should be used in HTTPS context",
      pattern: {
        type: "regex",
        expression: /document\.cookie\s*=\s*[^;]*(?!.*[Ss]ecure)/g,
      },
      vulnerabilityType: "insecure-cookie",
      severity: "medium",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "cookie-without-httponly",
      name: "Cookie without HttpOnly flag",
      description:
        "Cookie set without HttpOnly flag - vulnerable to XSS attacks",
      pattern: {
        type: "regex",
        expression: /document\.cookie\s*=\s*[^;]*(?!.*[Hh]ttp[Oo]nly)/g,
      },
      vulnerabilityType: "insecure-cookie",
      severity: "medium",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "cookie-without-samesite",
      name: "Cookie without SameSite flag",
      description:
        "Cookie set without SameSite flag - vulnerable to CSRF attacks",
      pattern: {
        type: "regex",
        expression: /document\.cookie\s*=\s*[^;]*(?!.*[Ss]ame[Ss]ite)/g,
      },
      vulnerabilityType: "insecure-cookie",
      severity: "medium",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "InsecureCookieDetector",
      "insecure-cookie",
      "medium",
      InsecureCookieDetector.COOKIE_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Filter relevant files
    // TODO: MOVE TO CONSTANTS
    const relevantFiles = this.filterRelevantFiles(
      scanResult,
      [".ts", ".tsx", ".js", ".jsx"],
      [
        "node_modules",
        "dist",
        "build",
        ".git",
        "coverage",
        "__tests__",
        ".test.",
        ".spec.",
      ]
    );

    for (const filePath of relevantFiles) {
      const content = scanResult.fileContents.get(filePath);
      if (!content) continue;

      // Check if file uses cookie libraries
      const cookieLibraries = this.detectCookieLibraries(content);

      // Apply pattern matching for document.cookie usage
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateCookieMatch(match)
        );

      // Apply AST-based analysis
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForInsecureCookies(sf, fp, cookieLibraries)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Adjust confidence based on file context
      const fileContext = this.getFileContext(filePath, content);
      for (const vuln of patternVulnerabilities) {
        // Higher confidence for client-side files
        if (fileContext.isClientSide) {
          vuln.confidence = "high";
        }

        // Add library information if detected
        if (cookieLibraries.length > 0) {
          vuln.metadata = {
            ...vuln.metadata,
            cookieLibraries,
            note: "Cookie libraries detected - verify their security configuration",
          };
        }

        vuln.confidence = this.adjustConfidenceBasedOnContext(
          vuln,
          fileContext
        );

        if (this.validateVulnerability(vuln)) {
          vulnerabilities.push(vuln);
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect cookie libraries used in the file
   */
  private detectCookieLibraries(content: string): string[] {
    const foundLibraries: string[] = [];

    for (const lib of COOKIE_LIBRARIES) {
      if (content.includes(lib)) {
        foundLibraries.push(lib);
      }
    }

    return foundLibraries;
  }

  /**
   * Validate if a cookie pattern match is problematic
   */
  private validateCookieMatch(matchResult: any): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    // Check if it's in a comment
    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    // Check if it's in test code
    if (this.isInTestContext(match.context || "")) {
      return false;
    }

    return true;
  }

  /**
   * Check if cookie usage is for non-sensitive UI state
   */
  private isUIStateCookie(cookieString: string, context: string): boolean {
    const lowerCookie = cookieString.toLowerCase();
    const lowerContext = context.toLowerCase();

    // Check cookie name/content for UI state indicators
    const isUIStateCookie = UI_COOKIE_STATE_PATTERNS.some(
      (pattern) =>
        lowerCookie.includes(pattern) || lowerContext.includes(pattern)
    );

    // Check if it's a framework UI state cookie

    const isFrameworkUI = FRAMEWORK_UI_PATTERNS.some((pattern) =>
      lowerCookie.includes(pattern)
    );

    return isUIStateCookie || isFrameworkUI;
  }

  /**
   * AST-based analysis for insecure cookie usage
   */
  private analyzeASTForInsecureCookies(
    sourceFile: ts.SourceFile,
    filePath: string,
    cookieLibraries: string[]
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find document.cookie assignments
    const cookieAssignments = this.findDocumentCookieAssignments(sourceFile);
    for (const assignment of cookieAssignments) {
      const cookieVuln = this.analyzeCookieAssignment(
        assignment,
        sourceFile,
        filePath
      );
      if (cookieVuln) {
        vulnerabilities.push(cookieVuln);
      }
    }

    // Find cookie library usage
    const cookieLibraryCalls = this.findCookieLibraryCalls(
      sourceFile,
      cookieLibraries
    );
    for (const libCall of cookieLibraryCalls) {
      const libVuln = this.analyzeCookieLibraryCall(
        libCall,
        sourceFile,
        filePath
      );
      if (libVuln) {
        vulnerabilities.push(libVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find document.cookie assignments
   */
  private findDocumentCookieAssignments(
    sourceFile: ts.SourceFile
  ): ts.BinaryExpression[] {
    return ASTTraverser.findNodesByKind<ts.BinaryExpression>(
      sourceFile,
      ts.SyntaxKind.BinaryExpression,
      (node) => {
        return (
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isPropertyAccessExpression(node.left) &&
          ts.isIdentifier(node.left.expression) &&
          node.left.expression.text === "document" &&
          ts.isIdentifier(node.left.name) &&
          node.left.name.text === "cookie"
        );
      }
    );
  }

  /**
   * Find cookie library function calls
   */
  private findCookieLibraryCalls(
    sourceFile: ts.SourceFile,
    cookieLibraries: string[]
  ): ts.CallExpression[] {
    if (cookieLibraries.length === 0) return [];

    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        // Look for library.set() or library() calls
        if (ts.isPropertyAccessExpression(node.expression)) {
          const obj = node.expression.expression;
          const method = node.expression.name;

          if (ts.isIdentifier(obj) && ts.isIdentifier(method)) {
            return (
              cookieLibraries.some(
                (lib) =>
                  obj.text.includes(lib.replace("-", "")) ||
                  obj.text.toLowerCase().includes("cookie")
              ) &&
              (method.text === "set" || method.text === "setItem")
            );
          }
        }

        return false;
      }
    );
  }

  /**
   * Analyze document.cookie assignment
   */
  private analyzeCookieAssignment(
    assignment: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(assignment, sourceFile);
    const context = ASTTraverser.getNodeContext(assignment, sourceFile);
    const code = ASTTraverser.getNodeText(assignment, sourceFile);

    // Extract cookie string
    const cookieString = this.extractCookieString(assignment.right);
    if (!cookieString) return null;

    // Check if it's UI state cookie (should have lower severity)
    const isUIState = this.isUIStateCookie(cookieString, context);

    // Analyze cookie security
    const securityAnalysis = this.analyzeCookieSecurity(cookieString);

    if (securityAnalysis.issues.length === 0) {
      return null;
    }

    // If it's UI state, reduce severity unless it has serious security issues
    const severity = isUIState ? "low" : "medium";
    const confidence = isUIState ? "low" : "medium";

    const issueDescription = securityAnalysis.issues.join(", ");

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
        functionName: this.extractFunctionFromAST(assignment),
      },
      `Cookie configuration detected: ${issueDescription}${
        isUIState ? " (UI state cookie)" : ""
      }`,
      severity,
      confidence,
      {
        cookieString,
        securityIssues: securityAnalysis.issues,
        missingAttributes: securityAnalysis.missingAttributes,
        recommendations: securityAnalysis.recommendations,
        isUIState: isUIState,
        detectionMethod: "document-cookie-analysis",
      }
    );
  }

  /**
   * Analyze cookie library call
   */
  private analyzeCookieLibraryCall(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(callExpr, sourceFile);
    const context = ASTTraverser.getNodeContext(callExpr, sourceFile);
    const code = ASTTraverser.getNodeText(callExpr, sourceFile);

    // Analyze the options object (usually the third argument)
    const optionsAnalysis = this.analyzeCookieOptions(callExpr);

    if (!optionsAnalysis || optionsAnalysis.issues.length === 0) {
      return null;
    }

    const issueDescription = optionsAnalysis.issues.join(", ");

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
        functionName: this.extractFunctionFromAST(callExpr),
      },
      `Insecure cookie library configuration: ${issueDescription}`,
      "medium",
      "medium",
      {
        libraryCall: true,
        securityIssues: optionsAnalysis.issues,
        missingAttributes: optionsAnalysis.missingAttributes,
        recommendations: optionsAnalysis.recommendations,
        detectionMethod: "cookie-library-analysis",
      }
    );
  }

  /**
   * Extract cookie string from assignment
   */
  private extractCookieString(expr: ts.Expression): string | null {
    if (ts.isStringLiteral(expr)) {
      return expr.text;
    }
    if (ts.isTemplateExpression(expr)) {
      // Try to extract static parts
      return expr.head.text;
    }
    return null;
  }

  /**
   * Analyze cookie security attributes
   */
  private analyzeCookieSecurity(cookieString: string): CookieSecurityAnalysis {
    const analysis: CookieSecurityAnalysis = {
      issues: [],
      missingAttributes: [],
      recommendations: [],
    };

    const lowerCookie = cookieString.toLowerCase();

    // Check if this appears to be a UI state cookie
    const isUIState = this.isUIStateCookie(cookieString, "");

    // For UI state cookies, be less strict about security attributes
    if (isUIState) {
      // Only flag critical missing attributes for UI cookies
      if (!lowerCookie.includes("samesite")) {
        analysis.issues.push("missing SameSite flag");
        analysis.missingAttributes.push("SameSite");
        analysis.recommendations.push(
          "Add 'SameSite=Lax' to prevent CSRF attacks"
        );
      }
      return analysis;
    }

    // For potentially sensitive cookies, check all security attributes
    if (!lowerCookie.includes("secure")) {
      analysis.issues.push("missing Secure flag");
      analysis.missingAttributes.push("Secure");
      analysis.recommendations.push(
        "Add 'Secure' flag to ensure cookie is only sent over HTTPS"
      );
    }

    if (!lowerCookie.includes("httponly")) {
      analysis.issues.push("missing HttpOnly flag");
      analysis.missingAttributes.push("HttpOnly");
      analysis.recommendations.push(
        "Add 'HttpOnly' flag to prevent XSS attacks"
      );
    }

    if (!lowerCookie.includes("samesite")) {
      analysis.issues.push("missing SameSite flag");
      analysis.missingAttributes.push("SameSite");
      analysis.recommendations.push(
        "Add 'SameSite=Strict' or 'SameSite=Lax' to prevent CSRF attacks"
      );
    }

    return analysis;
  }

  /**
   * Analyze cookie options object from library calls
   */
  private analyzeCookieOptions(
    callExpr: ts.CallExpression
  ): CookieSecurityAnalysis | null {
    // Usually options are in the third argument for cookie.set(name, value, options)
    if (callExpr.arguments.length < 3) {
      return {
        issues: ["no security options provided"],
        missingAttributes: ["Secure", "HttpOnly", "SameSite"],
        recommendations: [
          "Provide security options object with Secure, HttpOnly, and SameSite attributes",
        ],
      };
    }

    const optionsArg = callExpr.arguments[2];
    if (!ts.isObjectLiteralExpression(optionsArg)) {
      return null;
    }

    const analysis: CookieSecurityAnalysis = {
      issues: [],
      missingAttributes: [],
      recommendations: [],
    };

    const optionProperties = new Set<string>();
    for (const prop of optionsArg.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        optionProperties.add(prop.name.text.toLowerCase());
      }
    }

    // Check for required attributes
    if (!optionProperties.has("secure")) {
      analysis.issues.push("missing secure option");
      analysis.missingAttributes.push("secure");
      analysis.recommendations.push("Add 'secure: true' option");
    }

    if (!optionProperties.has("httponly")) {
      analysis.issues.push("missing httpOnly option");
      analysis.missingAttributes.push("httpOnly");
      analysis.recommendations.push("Add 'httpOnly: true' option");
    }

    if (!optionProperties.has("samesite")) {
      analysis.issues.push("missing sameSite option");
      analysis.missingAttributes.push("sameSite");
      analysis.recommendations.push(
        "Add 'sameSite: \"Strict\"' or 'sameSite: \"Lax\"' option"
      );
    }

    return analysis;
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

// Helper interfaces
interface CookieSecurityAnalysis {
  issues: string[];
  missingAttributes: string[];
  recommendations: string[];
}
