import ts from "typescript";

/**
 * Validation severity levels
 */
enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * Validation issue categories
 */
enum ValidationCategory {
  REQUIRED_FIELD = "required_field",
  TYPE_MISMATCH = "type_mismatch",
  FORMAT_INVALID = "format_invalid",
  DATA_QUALITY = "data_quality",
  CONSISTENCY = "consistency",
  COMPLETENESS = "completeness",
}

/**
 * Individual validation issue
 */
interface ValidationIssue {
  category: ValidationCategory;
  severity: ValidationSeverity;
  field: string;
  message: string;
  value: unknown;
  suggestion?: string;
}

/**
 * Validation result for a single function data object
 */
interface FunctionDataValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100, quality score
  warnings: number;
  errors: number;
}

/**
 * Batch validation result
 */
interface BatchValidationResult {
  totalFunctions: number;
  validFunctions: number;
  invalidFunctions: number;
  overallScore: number;
  issuesByCategory: Record<ValidationCategory, number>;
  issuesBySeverity: Record<ValidationSeverity, number>;
  functionResults: Map<string, FunctionDataValidationResult>;
}

/**
 * Validation configuration
 */
interface ValidationConfig {
  strictMode: boolean;
  allowEmptyBodies: boolean;
  allowUnknownTypes: boolean;
  maxParameterCount: number;
  maxBodyLength: number;
  requireReturnType: boolean;
  validateTypeNames: boolean;
  checkNameConventions: boolean;
}

/**
 * Function data interface for validation (matches the existing interface)
 */
interface FunctionData {
  componentName: string;
  functionName: string;
  params: string[];
  returnType: string;
  body: string;
  dependencies: string[];
  calledFunctions: string[];
  isAsync: boolean;
}

/**
 * Utility class for validating extracted function data
 */
export class DataValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      strictMode: false,
      allowEmptyBodies: true,
      allowUnknownTypes: true,
      maxParameterCount: 20,
      maxBodyLength: 50000,
      requireReturnType: false,
      validateTypeNames: true,
      checkNameConventions: true,
      ...config,
    };
  }

  /**
   * Validates a single function data object
   * @param functionData The function data to validate
   * @returns Validation result
   */
  validateFunctionData(
    functionData: FunctionData
  ): FunctionDataValidationResult {
    const issues: ValidationIssue[] = [];

    try {
      // Validate required fields
      this.validateRequiredFields(functionData, issues);

      // Validate field types
      this.validateFieldTypes(functionData, issues);

      // Validate data formats
      this.validateDataFormats(functionData, issues);

      // Validate data quality
      this.validateDataQuality(functionData, issues);

      // Validate consistency
      this.validateConsistency(functionData, issues);

      // Calculate scores
      const errors = issues.filter(
        (issue) => issue.severity === ValidationSeverity.ERROR
      ).length;
      const warnings = issues.filter(
        (issue) => issue.severity === ValidationSeverity.WARNING
      ).length;
      const score = this.calculateQualityScore(functionData, issues);

      return {
        isValid: errors === 0,
        issues,
        score,
        warnings,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [
          {
            category: ValidationCategory.TYPE_MISMATCH,
            severity: ValidationSeverity.ERROR,
            field: "validation",
            message: `Validation failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            value: functionData,
          },
        ],
        score: 0,
        warnings: 0,
        errors: 1,
      };
    }
  }

  /**
   * Validates a batch of function data objects
   * @param functionDataList Array of function data to validate
   * @returns Batch validation result
   */
  validateBatch(functionDataList: FunctionData[]): BatchValidationResult {
    const functionResults = new Map<string, FunctionDataValidationResult>();
    let totalScore = 0;
    let validCount = 0;

    const issuesByCategory: Record<ValidationCategory, number> = {
      [ValidationCategory.REQUIRED_FIELD]: 0,
      [ValidationCategory.TYPE_MISMATCH]: 0,
      [ValidationCategory.FORMAT_INVALID]: 0,
      [ValidationCategory.DATA_QUALITY]: 0,
      [ValidationCategory.CONSISTENCY]: 0,
      [ValidationCategory.COMPLETENESS]: 0,
    };

    const issuesBySeverity: Record<ValidationSeverity, number> = {
      [ValidationSeverity.ERROR]: 0,
      [ValidationSeverity.WARNING]: 0,
      [ValidationSeverity.INFO]: 0,
    };

    functionDataList.forEach((functionData, index) => {
      const key =
        `${functionData.componentName}.${functionData.functionName}` ||
        `function_${index}`;
      const result = this.validateFunctionData(functionData);

      functionResults.set(key, result);
      totalScore += result.score;

      if (result.isValid) {
        validCount++;
      }

      // Aggregate issue counts
      result.issues.forEach((issue) => {
        issuesByCategory[issue.category]++;
        issuesBySeverity[issue.severity]++;
      });
    });

    return {
      totalFunctions: functionDataList.length,
      validFunctions: validCount,
      invalidFunctions: functionDataList.length - validCount,
      overallScore:
        functionDataList.length > 0 ? totalScore / functionDataList.length : 0,
      issuesByCategory,
      issuesBySeverity,
      functionResults,
    };
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(
    functionData: FunctionData,
    issues: ValidationIssue[]
  ): void {
    const requiredFields: (keyof FunctionData)[] = [
      "componentName",
      "functionName",
      "params",
      "returnType",
      "body",
      "dependencies",
      "calledFunctions",
      "isAsync",
    ];

    requiredFields.forEach((field) => {
      const value = functionData[field];

      if (value === undefined || value === null) {
        issues.push({
          category: ValidationCategory.REQUIRED_FIELD,
          severity: ValidationSeverity.ERROR,
          field,
          message: `Required field '${field}' is missing`,
          value,
          suggestion: `Ensure '${field}' is properly extracted during analysis`,
        });
      }
    });
  }

  /**
   * Validates field types
   */
  private validateFieldTypes(
    functionData: FunctionData,
    issues: ValidationIssue[]
  ): void {
    // Component name validation
    if (typeof functionData.componentName !== "string") {
      issues.push({
        category: ValidationCategory.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        field: "componentName",
        message: "Component name must be a string",
        value: functionData.componentName,
        suggestion: "Check component name extraction logic",
      });
    }

    // Function name validation
    if (typeof functionData.functionName !== "string") {
      issues.push({
        category: ValidationCategory.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        field: "functionName",
        message: "Function name must be a string",
        value: functionData.functionName,
        suggestion: "Check function name resolution logic",
      });
    }

    // Parameters validation
    if (!Array.isArray(functionData.params)) {
      issues.push({
        category: ValidationCategory.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        field: "params",
        message: "Parameters must be an array",
        value: functionData.params,
        suggestion: "Ensure parameter extraction returns an array",
      });
    } else {
      functionData.params.forEach((param, index) => {
        if (typeof param !== "string") {
          issues.push({
            category: ValidationCategory.TYPE_MISMATCH,
            severity: ValidationSeverity.WARNING,
            field: `params[${index}]`,
            message: `Parameter at index ${index} must be a string`,
            value: param,
            suggestion: "Check parameter parsing logic",
          });
        }
      });
    }

    // Return type validation
    if (typeof functionData.returnType !== "string") {
      issues.push({
        category: ValidationCategory.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        field: "returnType",
        message: "Return type must be a string",
        value: functionData.returnType,
        suggestion: "Check return type resolution logic",
      });
    }

    // Body validation
    if (typeof functionData.body !== "string") {
      issues.push({
        category: ValidationCategory.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        field: "body",
        message: "Function body must be a string",
        value: functionData.body,
        suggestion: "Check body extraction logic",
      });
    }

    // Dependencies validation
    if (!Array.isArray(functionData.dependencies)) {
      issues.push({
        category: ValidationCategory.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        field: "dependencies",
        message: "Dependencies must be an array",
        value: functionData.dependencies,
        suggestion: "Ensure dependency extraction returns an array",
      });
    }

    // Called functions validation
    if (!Array.isArray(functionData.calledFunctions)) {
      issues.push({
        category: ValidationCategory.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        field: "calledFunctions",
        message: "Called functions must be an array",
        value: functionData.calledFunctions,
        suggestion: "Ensure called function extraction returns an array",
      });
    }

    // isAsync validation
    if (typeof functionData.isAsync !== "boolean") {
      issues.push({
        category: ValidationCategory.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        field: "isAsync",
        message: "isAsync must be a boolean",
        value: functionData.isAsync,
        suggestion: "Check async detection logic",
      });
    }
  }

  /**
   * Validates data formats
   */
  private validateDataFormats(
    functionData: FunctionData,
    issues: ValidationIssue[]
  ): void {
    // Component name format
    if (
      functionData.componentName &&
      typeof functionData.componentName === "string"
    ) {
      if (functionData.componentName.trim() === "") {
        issues.push({
          category: ValidationCategory.FORMAT_INVALID,
          severity: ValidationSeverity.WARNING,
          field: "componentName",
          message: "Component name is empty",
          value: functionData.componentName,
          suggestion: "Ensure component name is properly extracted",
        });
      }
    }

    // Function name format
    if (
      functionData.functionName &&
      typeof functionData.functionName === "string"
    ) {
      if (functionData.functionName.trim() === "") {
        issues.push({
          category: ValidationCategory.FORMAT_INVALID,
          severity: ValidationSeverity.ERROR,
          field: "functionName",
          message: "Function name is empty",
          value: functionData.functionName,
        });
      }

      if (
        this.config.checkNameConventions &&
        !this.isValidJavaScriptIdentifier(functionData.functionName)
      ) {
        issues.push({
          category: ValidationCategory.FORMAT_INVALID,
          severity: ValidationSeverity.WARNING,
          field: "functionName",
          message: "Function name is not a valid JavaScript identifier",
          value: functionData.functionName,
          suggestion: "Consider normalizing function names",
        });
      }
    }

    // Return type format
    if (
      functionData.returnType &&
      typeof functionData.returnType === "string"
    ) {
      if (
        this.config.requireReturnType &&
        functionData.returnType === "unknown"
      ) {
        issues.push({
          category: ValidationCategory.FORMAT_INVALID,
          severity: ValidationSeverity.WARNING,
          field: "returnType",
          message: "Return type is unknown",
          value: functionData.returnType,
          suggestion: "Improve type resolution or enable type checker",
        });
      }

      if (
        !this.config.allowUnknownTypes &&
        functionData.returnType === "unknown"
      ) {
        issues.push({
          category: ValidationCategory.FORMAT_INVALID,
          severity: ValidationSeverity.ERROR,
          field: "returnType",
          message: "Unknown return types not allowed in strict mode",
          value: functionData.returnType,
        });
      }
    }

    // Body format
    if (functionData.body && typeof functionData.body === "string") {
      if (!this.config.allowEmptyBodies && functionData.body.trim() === "") {
        issues.push({
          category: ValidationCategory.FORMAT_INVALID,
          severity: ValidationSeverity.WARNING,
          field: "body",
          message: "Function body is empty",
          value: functionData.body,
          suggestion: "Check if empty bodies should be excluded",
        });
      }

      if (functionData.body.length > this.config.maxBodyLength) {
        issues.push({
          category: ValidationCategory.FORMAT_INVALID,
          severity: ValidationSeverity.WARNING,
          field: "body",
          message: `Function body exceeds maximum length (${functionData.body.length} > ${this.config.maxBodyLength})`,
          value: functionData.body.length,
          suggestion: "Consider splitting large functions or increasing limit",
        });
      }
    }

    // Parameters format
    if (Array.isArray(functionData.params)) {
      if (functionData.params.length > this.config.maxParameterCount) {
        issues.push({
          category: ValidationCategory.FORMAT_INVALID,
          severity: ValidationSeverity.WARNING,
          field: "params",
          message: `Too many parameters (${functionData.params.length} > ${this.config.maxParameterCount})`,
          value: functionData.params.length,
          suggestion: "Consider refactoring functions with many parameters",
        });
      }
    }
  }

  /**
   * Validates data quality
   */
  private validateDataQuality(
    functionData: FunctionData,
    issues: ValidationIssue[]
  ): void {
    // Check for placeholder/fallback values
    const placeholderPatterns = [
      "Anonymous Function",
      "Unknown Function",
      "ErrorFunction",
      "Fallback",
      "DefaultExport",
      "// Error parsing",
    ];

    placeholderPatterns.forEach((pattern) => {
      if (functionData.functionName?.includes(pattern)) {
        issues.push({
          category: ValidationCategory.DATA_QUALITY,
          severity: ValidationSeverity.WARNING,
          field: "functionName",
          message: `Function name appears to be a placeholder: ${pattern}`,
          value: functionData.functionName,
          suggestion: "Improve function name resolution",
        });
      }

      if (functionData.body?.includes(pattern)) {
        issues.push({
          category: ValidationCategory.DATA_QUALITY,
          severity: ValidationSeverity.INFO,
          field: "body",
          message: `Function body contains placeholder text: ${pattern}`,
          value: pattern,
          suggestion: "Check body extraction logic",
        });
      }
    });

    // Check for suspicious patterns
    if (
      functionData.dependencies &&
      functionData.dependencies.length === 0 &&
      functionData.calledFunctions &&
      functionData.calledFunctions.length === 0 &&
      functionData.body &&
      functionData.body.length > 100
    ) {
      issues.push({
        category: ValidationCategory.DATA_QUALITY,
        severity: ValidationSeverity.INFO,
        field: "dependencies",
        message:
          "Large function with no detected dependencies or called functions",
        value: functionData.body.length,
        suggestion: "Verify dependency and function call extraction",
      });
    }
  }

  /**
   * Validates internal consistency
   */
  private validateConsistency(
    functionData: FunctionData,
    issues: ValidationIssue[]
  ): void {
    // Async consistency
    if (
      functionData.isAsync &&
      functionData.returnType &&
      !functionData.returnType.toLowerCase().includes("promise") &&
      functionData.returnType !== "unknown"
    ) {
      issues.push({
        category: ValidationCategory.CONSISTENCY,
        severity: ValidationSeverity.WARNING,
        field: "isAsync",
        message:
          "Function marked as async but return type does not indicate Promise",
        value: {
          isAsync: functionData.isAsync,
          returnType: functionData.returnType,
        },
        suggestion: "Verify async detection logic",
      });
    }

    // Body and parameters consistency
    if (Array.isArray(functionData.params) && functionData.body) {
      const bodyText = functionData.body.toLowerCase();
      functionData.params.forEach((param) => {
        const paramName = this.extractParameterName(param);
        if (
          paramName &&
          paramName.length > 2 &&
          !bodyText.includes(paramName.toLowerCase())
        ) {
          issues.push({
            category: ValidationCategory.CONSISTENCY,
            severity: ValidationSeverity.INFO,
            field: "params",
            message: `Parameter '${paramName}' not found in function body`,
            value: paramName,
            suggestion:
              "Parameter might be unused or body extraction incomplete",
          });
        }
      });
    }
  }

  /**
   * Calculates quality score (0-100)
   */
  private calculateQualityScore(
    functionData: FunctionData,
    issues: ValidationIssue[]
  ): number {
    let score = 100;

    // Deduct points for issues
    issues.forEach((issue) => {
      switch (issue.severity) {
        case ValidationSeverity.ERROR:
          score -= 20;
          break;
        case ValidationSeverity.WARNING:
          score -= 10;
          break;
        case ValidationSeverity.INFO:
          score -= 2;
          break;
      }
    });

    // Bonus points for completeness
    if (functionData.returnType && functionData.returnType !== "unknown") {
      score += 5;
    }

    if (
      Array.isArray(functionData.dependencies) &&
      functionData.dependencies.length > 0
    ) {
      score += 3;
    }

    if (
      Array.isArray(functionData.calledFunctions) &&
      functionData.calledFunctions.length > 0
    ) {
      score += 3;
    }

    if (
      functionData.body &&
      functionData.body.trim().length > 0 &&
      !functionData.body.includes("Error parsing")
    ) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Checks if a string is a valid JavaScript identifier
   */
  private isValidJavaScriptIdentifier(name: string): boolean {
    const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return identifierRegex.test(name) && !this.isReservedWord(name);
  }

  /**
   * Checks if a string is a JavaScript reserved word
   */
  private isReservedWord(word: string): boolean {
    const reservedWords = [
      "break",
      "case",
      "catch",
      "class",
      "const",
      "continue",
      "debugger",
      "default",
      "delete",
      "do",
      "else",
      "export",
      "extends",
      "finally",
      "for",
      "function",
      "if",
      "import",
      "in",
      "instanceof",
      "new",
      "return",
      "super",
      "switch",
      "this",
      "throw",
      "try",
      "typeof",
      "var",
      "void",
      "while",
      "with",
      "yield",
    ];
    return reservedWords.includes(word.toLowerCase());
  }

  /**
   * Extracts parameter name from parameter string
   */
  private extractParameterName(param: string): string {
    // Handle destructuring, types, defaults, etc.
    const cleaned = param.trim();

    // Simple case: just identifier
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(cleaned)) {
      return cleaned;
    }

    // Extract from destructuring or typed parameters
    const match = cleaned.match(/^(?:\.\.\.)?([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    return match ? match[1] : "";
  }

  /**
   * Updates validation configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current validation configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}
