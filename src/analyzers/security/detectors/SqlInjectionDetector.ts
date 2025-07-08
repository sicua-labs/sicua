/**
 * Detector for SQL injection vulnerabilities
 */

import ts from "typescript";
import { BaseDetector } from "./BaseDetector";
import { ConfidenceLevel, Vulnerability } from "../types/vulnerability.types";
import { PatternDefinition } from "../types/pattern.types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { ScanResult } from "../../../types";
import {
  SQL_LIBRARIES,
  SQL_KEYWORDS,
  SQL_EXECUTION_METHODS,
  DANGEROUS_SQL_PATTERNS,
  SAFE_QUERY_PATTERNS,
  SQL_INJECTION_INPUT_SOURCES,
  SAFE_ORM_METHODS,
  RAW_SQL_METHODS,
  SQL_VARIABLE_NAMES,
  STRING_CONCAT_PATTERNS,
} from "../constants/sql.constants";

export class SqlInjectionDetector extends BaseDetector {
  private static readonly SQL_PATTERNS: PatternDefinition[] = [
    {
      id: "sql-template-literal",
      name: "SQL template literal with variables",
      description:
        "SQL query constructed using template literals with variables - potential SQL injection",
      pattern: {
        type: "regex",
        expression:
          /`[^`]*\$\{[^}]*\}[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|FROM|INTO|VALUES|SET|LIMIT|OFFSET)/gi,
      },
      vulnerabilityType: "sql-injection",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "sql-string-concatenation",
      name: "SQL string concatenation",
      description:
        "SQL query constructed using string concatenation - potential SQL injection",
      pattern: {
        type: "regex",
        expression:
          /['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|FROM|INTO|VALUES|SET|LIMIT|OFFSET)[^'"]*['"]\s*\+/gi,
      },
      vulnerabilityType: "sql-injection",
      severity: "critical",
      confidence: "high",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
    {
      id: "raw-sql-with-variables",
      name: "Raw SQL execution with variables",
      description:
        "Raw SQL execution method with dynamic content - verify parameterization",
      pattern: {
        type: "regex",
        expression:
          /(?:query|execute|exec|raw|sql)\s*\(\s*[^)]*\$\{|(?:query|execute|exec|raw|sql)\s*\(\s*[^)]*\+/gi,
      },
      vulnerabilityType: "sql-injection",
      severity: "high",
      confidence: "medium",
      fileTypes: [".ts", ".tsx", ".js", ".jsx"],
      enabled: true,
    },
  ];

  constructor() {
    super(
      "SqlInjectionDetector",
      "sql-injection",
      "critical",
      SqlInjectionDetector.SQL_PATTERNS
    );
  }

  async detect(scanResult: ScanResult): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

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

      // Only analyze files that actually use SQL libraries or contain SQL patterns
      const sqlLibraries = this.detectSqlLibraries(content);
      const hasSqlContent = this.hasSqlContent(content);

      if (sqlLibraries.length === 0 && !hasSqlContent) {
        continue; // Skip files without SQL relevance
      }

      // Apply pattern matching
      const patternResults = this.applyPatternMatching(content, filePath);
      const patternVulnerabilities =
        this.convertPatternMatchesToVulnerabilities(patternResults, (match) =>
          this.validateSqlMatch(match)
        );

      // Apply AST-based analysis
      const sourceFile = scanResult.sourceFiles.get(filePath);
      if (sourceFile) {
        const astVulnerabilities = this.applyASTAnalysis(
          sourceFile,
          filePath,
          (sf, fp) => this.analyzeASTForSqlInjection(sf, fp, sqlLibraries)
        );
        vulnerabilities.push(...astVulnerabilities);
      }

      // Adjust confidence based on file context
      const fileContext = this.getFileContext(filePath, content);
      for (const vuln of patternVulnerabilities) {
        if (sqlLibraries.length > 0) {
          vuln.metadata = {
            ...vuln.metadata,
            sqlLibraries,
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
   * Detect SQL libraries used in the file
   */
  private detectSqlLibraries(content: string): string[] {
    const foundLibraries: string[] = [];

    for (const lib of SQL_LIBRARIES) {
      if (content.includes(lib)) {
        foundLibraries.push(lib);
      }
    }

    return foundLibraries;
  }

  /**
   * Check if content has SQL-related patterns
   */
  private hasSqlContent(content: string): boolean {
    // Look for SQL keywords in combination with execution patterns
    const sqlKeywordPattern = new RegExp(
      `(?:query|execute|exec|sql)\\s*\\([^)]*(?:${SQL_KEYWORDS.join("|")})`,
      "gi"
    );

    return (
      sqlKeywordPattern.test(content) ||
      content.includes("pool.query") ||
      content.includes("db.query") ||
      content.includes("connection.query")
    );
  }

  /**
   * Validate if a SQL pattern match is problematic
   */
  private validateSqlMatch(matchResult: any): boolean {
    const match = matchResult.matches[0];
    if (!match) return false;

    if (this.isInComment(match.context || "", match.match)) {
      return false;
    }

    if (this.isInTestContext(match.context || "")) {
      return false;
    }

    return true;
  }

  /**
   * AST-based analysis for SQL injection patterns
   */
  private analyzeASTForSqlInjection(
    sourceFile: ts.SourceFile,
    filePath: string,
    sqlLibraries: string[]
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Find SQL execution calls
    const sqlCalls = this.findSqlExecutionCalls(sourceFile);
    for (const sqlCall of sqlCalls) {
      const sqlVuln = this.analyzeSqlCall(sqlCall, sourceFile, filePath);
      if (sqlVuln) {
        vulnerabilities.push(sqlVuln);
      }
    }

    // Find template literals with SQL content
    const templateLiterals = this.findSqlTemplateLiterals(sourceFile);
    for (const template of templateLiterals) {
      const templateVuln = this.analyzeTemplateLiteral(
        template,
        sourceFile,
        filePath
      );
      if (templateVuln) {
        vulnerabilities.push(templateVuln);
      }
    }

    // Find variable assignments with actual SQL content (more selective)
    const sqlVariables = this.findActualSqlVariableAssignments(sourceFile);
    for (const sqlVar of sqlVariables) {
      const varVuln = this.analyzeSqlVariable(sqlVar, sourceFile, filePath);
      if (varVuln) {
        vulnerabilities.push(varVuln);
      }
    }

    return vulnerabilities;
  }

  /**
   * Find SQL execution method calls
   */
  private findSqlExecutionCalls(
    sourceFile: ts.SourceFile
  ): ts.CallExpression[] {
    return ASTTraverser.findNodesByKind<ts.CallExpression>(
      sourceFile,
      ts.SyntaxKind.CallExpression,
      (node) => {
        if (ts.isPropertyAccessExpression(node.expression)) {
          const obj = node.expression.expression;
          const method = node.expression.name;

          if (ts.isIdentifier(method)) {
            // Check for database-specific method calls
            if (
              SQL_EXECUTION_METHODS.includes(method.text) ||
              RAW_SQL_METHODS.includes(method.text)
            ) {
              if (ts.isIdentifier(obj)) {
                // Only flag if object suggests database connection
                const objName = obj.text.toLowerCase();
                return (
                  objName.includes("pool") ||
                  objName.includes("db") ||
                  objName.includes("connection") ||
                  objName.includes("client") ||
                  objName.includes("database")
                );
              }
              return true;
            }
          }
        } else if (ts.isIdentifier(node.expression)) {
          return SQL_EXECUTION_METHODS.includes(node.expression.text);
        }

        return false;
      }
    );
  }

  /**
   * Find template literals that contain SQL keywords
   */
  private findSqlTemplateLiterals(
    sourceFile: ts.SourceFile
  ): ts.TemplateExpression[] {
    return ASTTraverser.findNodesByKind<ts.TemplateExpression>(
      sourceFile,
      ts.SyntaxKind.TemplateExpression,
      (node) => {
        const templateText = ASTTraverser.getNodeText(node, sourceFile);
        const upperText = templateText.toUpperCase();

        // Must contain SQL keywords and variables to be suspicious
        const hasSqlKeywords = SQL_KEYWORDS.some((keyword) =>
          upperText.includes(keyword)
        );
        const hasVariables = templateText.includes("${");

        return hasSqlKeywords && hasVariables;
      }
    );
  }

  /**
   * Find variable assignments that actually contain SQL queries (more selective)
   */
  private findActualSqlVariableAssignments(
    sourceFile: ts.SourceFile
  ): ts.VariableDeclaration[] {
    return ASTTraverser.findNodesByKind<ts.VariableDeclaration>(
      sourceFile,
      ts.SyntaxKind.VariableDeclaration,
      (node) => {
        if (!node.initializer) return false;

        const initText = ASTTraverser.getNodeText(node.initializer, sourceFile);
        const upperInitText = initText.toUpperCase();

        // ADDITION: Skip React components and UI functions
        if (ts.isIdentifier(node.name)) {
          const varName = node.name.text;

          // Skip React components (PascalCase starting with capital)
          if (/^[A-Z][a-zA-Z0-9]*$/.test(varName)) {
            return false;
          }

          // Skip common UI/React function patterns
          const uiFunctionPatterns = [
            "component",
            "hook",
            "render",
            "get",
            "handle",
            "on",
            "use",
            "icon",
            "button",
            "form",
            "input",
            "modal",
            "page",
            "layout",
          ];

          const lowerVarName = varName.toLowerCase();
          if (
            uiFunctionPatterns.some((pattern) => lowerVarName.includes(pattern))
          ) {
            return false;
          }
        }

        // ADDITION: Skip if initializer is clearly a function/component
        if (
          ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer)
        ) {
          return false;
        }

        // Only flag if:
        // 1. Variable name suggests SQL AND initializer contains SQL keywords
        // 2. OR initializer clearly contains SQL query with dynamic content

        let isLikelySql = false;

        // Check if variable name suggests SQL
        if (ts.isIdentifier(node.name)) {
          const varName = node.name.text.toLowerCase();
          const isSqlVariableName = SQL_VARIABLE_NAMES.some((name) =>
            varName.includes(name)
          );

          if (isSqlVariableName) {
            // Variable name suggests SQL, check if content has SQL keywords
            isLikelySql = SQL_KEYWORDS.some((keyword) =>
              upperInitText.includes(keyword)
            );
          }
        }

        // OR check if initializer clearly contains SQL with dynamic content
        if (!isLikelySql) {
          const hasSqlKeywords = SQL_KEYWORDS.slice(0, 6).some(
            (
              keyword // Focus on main keywords
            ) => upperInitText.includes(keyword)
          );
          const hasDynamicContent =
            initText.includes("${") ||
            initText.includes(" + ") ||
            initText.includes(".concat(");

          isLikelySql = hasSqlKeywords && hasDynamicContent;
        }

        return isLikelySql;
      }
    );
  }

  /**
   * Analyze SQL execution call for injection vulnerabilities
   */
  private analyzeSqlCall(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(callExpr, sourceFile);
    const context = ASTTraverser.getNodeContext(callExpr, sourceFile);
    const code = ASTTraverser.getNodeText(callExpr, sourceFile);

    const methodName = this.getSqlMethodName(callExpr);
    if (!methodName) return null;

    // Check if it's a safe ORM method
    if (SAFE_ORM_METHODS.includes(methodName)) {
      return null;
    }

    // Analyze arguments for user input
    const injectionAnalysis = this.analyzeSqlArguments(callExpr, sourceFile);

    if (!injectionAnalysis || injectionAnalysis.userInputSources.length === 0) {
      return null;
    }

    // Check if query uses parameterization
    const hasParameterization = this.hasParameterization(code);
    const confidence = hasParameterization
      ? "low"
      : injectionAnalysis.confidence;

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
      `SQL execution method '${methodName}()' with user input: ${injectionAnalysis.userInputSources.join(
        ", "
      )}`,
      RAW_SQL_METHODS.includes(methodName) ? "critical" : "high",
      confidence,
      {
        method: methodName,
        userInputSources: injectionAnalysis.userInputSources,
        hasParameterization,
        isRawSql: RAW_SQL_METHODS.includes(methodName),
        detectionMethod: "sql-call-analysis",
      }
    );
  }

  /**
   * Analyze template literal for SQL injection
   */
  private analyzeTemplateLiteral(
    template: ts.TemplateExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    const location = ASTTraverser.getNodeLocation(template, sourceFile);
    const context = ASTTraverser.getNodeContext(template, sourceFile);
    const code = ASTTraverser.getNodeText(template, sourceFile);

    // Check if template spans contain user input
    const userInputSources = this.extractUserInputFromTemplate(
      template,
      sourceFile
    );

    if (userInputSources.length === 0) {
      return null;
    }

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
        functionName: this.extractFunctionFromAST(template),
      },
      `SQL template literal with user input: ${userInputSources.join(", ")}`,
      "critical",
      "high",
      {
        userInputSources,
        templateType: "sql-query",
        detectionMethod: "template-literal-analysis",
      }
    );
  }

  /**
   * Analyze SQL variable assignment
   */
  private analyzeSqlVariable(
    varDecl: ts.VariableDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Vulnerability | null {
    if (!varDecl.initializer) return null;

    const location = ASTTraverser.getNodeLocation(varDecl, sourceFile);
    const context = ASTTraverser.getNodeContext(varDecl, sourceFile);
    const code = ASTTraverser.getNodeText(varDecl, sourceFile);

    // Check for string concatenation or template literals with user input
    const hasUnsafeConstruction = this.hasUnsafeStringConstruction(
      varDecl.initializer,
      sourceFile
    );

    if (!hasUnsafeConstruction) {
      return null;
    }

    const varName = ts.isIdentifier(varDecl.name)
      ? varDecl.name.text
      : "unknown";

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
        functionName: this.extractFunctionFromAST(varDecl),
      },
      `SQL query variable '${varName}' constructed unsafely`,
      "high",
      "medium",
      {
        variableName: varName,
        constructionMethod: "string-manipulation",
        detectionMethod: "variable-analysis",
      }
    );
  }

  /**
   * Get SQL method name from call expression
   */
  private getSqlMethodName(callExpr: ts.CallExpression): string | null {
    if (
      ts.isPropertyAccessExpression(callExpr.expression) &&
      ts.isIdentifier(callExpr.expression.name)
    ) {
      return callExpr.expression.name.text;
    } else if (ts.isIdentifier(callExpr.expression)) {
      return callExpr.expression.text;
    }

    return null;
  }

  /**
   * Analyze SQL call arguments for user input
   */
  private analyzeSqlArguments(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile
  ): SqlInjectionAnalysis | null {
    const analysis: SqlInjectionAnalysis = {
      userInputSources: [],
      confidence: "low",
    };

    for (const arg of callExpr.arguments) {
      const inputSources = this.extractUserInputFromExpression(arg, sourceFile);
      analysis.userInputSources.push(...inputSources);
    }

    if (analysis.userInputSources.length > 0) {
      analysis.confidence = this.determineConfidenceLevel(
        analysis.userInputSources
      );
      return analysis;
    }

    return null;
  }

  /**
   * Extract user input sources from expression
   */
  private extractUserInputFromExpression(
    expr: ts.Expression,
    sourceFile: ts.SourceFile
  ): string[] {
    const userInputSources: string[] = [];

    if (ts.isPropertyAccessExpression(expr)) {
      const propAccess = this.getPropertyAccessPath(expr);
      if (
        propAccess &&
        SQL_INJECTION_INPUT_SOURCES.some((source) =>
          propAccess.toLowerCase().includes(source.toLowerCase())
        )
      ) {
        userInputSources.push(propAccess);
      }
    } else if (ts.isIdentifier(expr)) {
      const name = expr.text.toLowerCase();
      if (
        SQL_INJECTION_INPUT_SOURCES.some((source) =>
          name.includes(source.toLowerCase())
        )
      ) {
        userInputSources.push(name);
      }
    } else if (ts.isTemplateExpression(expr)) {
      for (const span of expr.templateSpans) {
        const spanSources = this.extractUserInputFromExpression(
          span.expression,
          sourceFile
        );
        userInputSources.push(...spanSources);
      }
    }

    return userInputSources;
  }

  /**
   * Extract user input from template literal spans
   */
  private extractUserInputFromTemplate(
    template: ts.TemplateExpression,
    sourceFile: ts.SourceFile
  ): string[] {
    const userInputSources: string[] = [];

    for (const span of template.templateSpans) {
      const sources = this.extractUserInputFromExpression(
        span.expression,
        sourceFile
      );
      userInputSources.push(...sources);
    }

    return userInputSources;
  }

  /**
   * Get property access path as string
   */
  private getPropertyAccessPath(
    expr: ts.PropertyAccessExpression
  ): string | null {
    const path: string[] = [];
    let current: ts.Expression = expr;

    while (ts.isPropertyAccessExpression(current)) {
      if (ts.isIdentifier(current.name)) {
        path.unshift(current.name.text);
      }
      current = current.expression;
    }

    if (ts.isIdentifier(current)) {
      path.unshift(current.text);
    }

    return path.length > 0 ? path.join(".") : null;
  }

  /**
   * Check if query uses parameterization
   */
  private hasParameterization(code: string): boolean {
    return SAFE_QUERY_PATTERNS.some((pattern) => pattern.test(code));
  }

  /**
   * Check if expression uses unsafe string construction
   */
  private hasUnsafeStringConstruction(
    expr: ts.Expression,
    sourceFile: ts.SourceFile
  ): boolean {
    const exprText = ASTTraverser.getNodeText(expr, sourceFile);

    // Check for template literals with variables
    if (ts.isTemplateExpression(expr)) {
      return true; // Template expressions with variables are potentially unsafe
    }

    // Check for string concatenation
    return STRING_CONCAT_PATTERNS.some((pattern) => pattern.test(exprText));
  }

  /**
   * Determine confidence level based on input sources
   */
  private determineConfidenceLevel(inputSources: string[]): ConfidenceLevel {
    const hasDirectInput = inputSources.some(
      (source) =>
        source.includes("req.") ||
        source.includes("request.") ||
        source.includes("query") ||
        source.includes("params") ||
        source.includes("body")
    );

    return hasDirectInput ? "high" : "medium";
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

// Helper interface
interface SqlInjectionAnalysis {
  userInputSources: string[];
  confidence: ConfidenceLevel;
}
