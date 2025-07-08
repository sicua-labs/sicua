import ts from "typescript";
import { FunctionFilter as CommonFunctionFilter } from "../../../utils/common/functionFilter";
import { ErrorHandler } from "../utils/errorHandler";

/**
 * Filter configuration options
 */
interface FilterConfig {
  enableCommonFilter: boolean;
  enableFrameworkSpecificFilters: boolean;
  enableCustomFilters: boolean;
  enableNodeSizeFilters: boolean;
  minFunctionSize: number;
  maxFunctionSize: number;
  excludeTestFiles: boolean;
  excludeNodeModules: boolean;
  customExcludePatterns: string[];
  customIncludePatterns: string[];
}

/**
 * Filter result with reasoning
 */
interface FilterResult {
  shouldInclude: boolean;
  reason: string;
  confidence: number;
  appliedFilters: string[];
}

/**
 * Extended filter class for determining which functions to include in analysis
 * Wraps the common FunctionFilter class and adds analyzer-specific extensions
 */
export class FunctionFilter {
  private commonFilter: CommonFunctionFilter;
  private errorHandler: ErrorHandler;
  private config: FilterConfig;

  constructor(errorHandler?: ErrorHandler, config: Partial<FilterConfig> = {}) {
    this.commonFilter = new CommonFunctionFilter();
    this.errorHandler = errorHandler || new ErrorHandler({ logErrors: false });
    this.config = {
      enableCommonFilter: true,
      enableFrameworkSpecificFilters: true,
      enableCustomFilters: true,
      enableNodeSizeFilters: true,
      minFunctionSize: 10,
      maxFunctionSize: 10000,
      excludeTestFiles: true,
      excludeNodeModules: true,
      customExcludePatterns: [],
      customIncludePatterns: [],
      ...config,
    };
  }

  /**
   * Enhanced function inclusion check with detailed filtering
   * @param node The function AST node
   * @param functionName The name of the function
   * @param filePath Optional file path for context
   * @returns boolean indicating whether the function should be included
   */
  shouldIncludeFunction(
    node: ts.Node,
    functionName: string,
    filePath?: string
  ): boolean {
    const result = this.shouldIncludeFunctionDetailed(
      node,
      functionName,
      filePath
    );
    return result.shouldInclude;
  }

  /**
   * Detailed function inclusion check with reasoning
   * @param node The function AST node
   * @param functionName The name of the function
   * @param filePath Optional file path for context
   * @returns Detailed filter result
   */
  shouldIncludeFunctionDetailed(
    node: ts.Node,
    functionName: string,
    filePath?: string
  ): FilterResult {
    const appliedFilters: string[] = [];
    let confidence = 1.0;

    try {
      // Quick validation filters
      const validationResult = this.applyValidationFilters(
        node,
        functionName,
        filePath
      );
      appliedFilters.push(...validationResult.appliedFilters);
      if (!validationResult.shouldInclude) {
        return {
          shouldInclude: false,
          reason: validationResult.reason,
          confidence: validationResult.confidence,
          appliedFilters,
        };
      }

      // File-level filters
      if (filePath) {
        const fileResult = this.applyFileFilters(filePath);
        appliedFilters.push(...fileResult.appliedFilters);
        if (!fileResult.shouldInclude) {
          return {
            shouldInclude: false,
            reason: fileResult.reason,
            confidence: fileResult.confidence,
            appliedFilters,
          };
        }
        confidence *= fileResult.confidence;
      }

      // Common filter (existing logic)
      if (this.config.enableCommonFilter) {
        const commonResult = this.applyCommonFilter(node, functionName);
        appliedFilters.push(...commonResult.appliedFilters);
        if (!commonResult.shouldInclude) {
          return {
            shouldInclude: false,
            reason: commonResult.reason,
            confidence: commonResult.confidence,
            appliedFilters,
          };
        }
        confidence *= commonResult.confidence;
      }

      // Framework-specific filters
      if (this.config.enableFrameworkSpecificFilters) {
        const frameworkResult = this.applyFrameworkFilters(node, functionName);
        appliedFilters.push(...frameworkResult.appliedFilters);
        if (!frameworkResult.shouldInclude) {
          return {
            shouldInclude: false,
            reason: frameworkResult.reason,
            confidence: frameworkResult.confidence,
            appliedFilters,
          };
        }
        confidence *= frameworkResult.confidence;
      }

      // Node size filters
      if (this.config.enableNodeSizeFilters) {
        const sizeResult = this.applyNodeSizeFilters(node, functionName);
        appliedFilters.push(...sizeResult.appliedFilters);
        if (!sizeResult.shouldInclude) {
          return {
            shouldInclude: false,
            reason: sizeResult.reason,
            confidence: sizeResult.confidence,
            appliedFilters,
          };
        }
        confidence *= sizeResult.confidence;
      }

      // Custom filters
      if (this.config.enableCustomFilters) {
        const customResult = this.applyCustomFilters(
          node,
          functionName,
          filePath
        );
        appliedFilters.push(...customResult.appliedFilters);
        if (!customResult.shouldInclude) {
          return {
            shouldInclude: false,
            reason: customResult.reason,
            confidence: customResult.confidence,
            appliedFilters,
          };
        }
        confidence *= customResult.confidence;
      }

      return {
        shouldInclude: true,
        reason: "Passed all filters",
        confidence,
        appliedFilters,
      };
    } catch (error) {
      this.errorHandler.handleFileError(
        filePath || "unknown",
        `function filtering for ${functionName}`,
        error
      );

      return {
        shouldInclude: false,
        reason: "Error during filtering",
        confidence: 0.0,
        appliedFilters: [...appliedFilters, "error_filter"],
      };
    }
  }

  /**
   * Applies basic validation filters
   */
  private applyValidationFilters(
    node: ts.Node,
    functionName: string,
    filePath?: string
  ): FilterResult {
    // Check for valid node
    if (!node) {
      return {
        shouldInclude: false,
        reason: "Invalid node",
        confidence: 1.0,
        appliedFilters: ["null_node_filter"],
      };
    }

    // Check for valid function name
    if (!functionName || functionName.trim() === "") {
      return {
        shouldInclude: false,
        reason: "Invalid function name",
        confidence: 1.0,
        appliedFilters: ["invalid_name_filter"],
      };
    }

    // Check for very obvious exclusions
    if (
      functionName === "Anonymous Function" ||
      functionName === "ErrorFunction"
    ) {
      return {
        shouldInclude: false,
        reason: "Fallback function name",
        confidence: 0.9,
        appliedFilters: ["fallback_name_filter"],
      };
    }

    return {
      shouldInclude: true,
      reason: "Passed validation",
      confidence: 1.0,
      appliedFilters: ["validation_filter"],
    };
  }

  /**
   * Applies file-level filters
   */
  private applyFileFilters(filePath: string): FilterResult {
    const appliedFilters: string[] = [];

    // Test file exclusion
    if (this.config.excludeTestFiles && this.isTestFile(filePath)) {
      return {
        shouldInclude: false,
        reason: "Test file excluded",
        confidence: 1.0,
        appliedFilters: ["test_file_filter"],
      };
    }
    appliedFilters.push("test_file_filter");

    // Node modules exclusion
    if (this.config.excludeNodeModules && this.isNodeModulesFile(filePath)) {
      return {
        shouldInclude: false,
        reason: "Node modules file excluded",
        confidence: 1.0,
        appliedFilters: ["node_modules_filter"],
      };
    }
    appliedFilters.push("node_modules_filter");

    return {
      shouldInclude: true,
      reason: "Passed file filters",
      confidence: 1.0,
      appliedFilters,
    };
  }

  /**
   * Applies common filter logic with error handling
   */
  private applyCommonFilter(node: ts.Node, functionName: string): FilterResult {
    return this.errorHandler.safeExecute(
      () => {
        const shouldInclude = this.commonFilter.shouldIncludeFunction(
          node,
          functionName
        );
        return {
          shouldInclude,
          reason: shouldInclude
            ? "Passed common filter"
            : "Excluded by common filter",
          confidence: 0.9,
          appliedFilters: ["common_filter"],
        };
      },
      {
        shouldInclude: false,
        reason: "Error in common filter",
        confidence: 0.0,
        appliedFilters: ["common_filter_error"],
      },
      "common filter application"
    );
  }

  /**
   * Applies framework-specific filters
   */
  private applyFrameworkFilters(
    node: ts.Node,
    functionName: string
  ): FilterResult {
    const appliedFilters: string[] = [];

    // Next.js specific filters
    if (this.isNextJSApiFunction(node, functionName)) {
      return {
        shouldInclude: false,
        reason: "Next.js API route function",
        confidence: 0.95,
        appliedFilters: ["nextjs_api_filter"],
      };
    }
    appliedFilters.push("nextjs_api_filter");

    // Next.js page functions
    if (this.isNextJSPageFunction(node, functionName)) {
      return {
        shouldInclude: false,
        reason: "Next.js page function",
        confidence: 0.9,
        appliedFilters: ["nextjs_page_filter"],
      };
    }
    appliedFilters.push("nextjs_page_filter");

    // Jest/testing framework functions
    if (this.isTestFrameworkFunction(node, functionName)) {
      return {
        shouldInclude: false,
        reason: "Test framework function",
        confidence: 0.95,
        appliedFilters: ["test_framework_filter"],
      };
    }
    appliedFilters.push("test_framework_filter");

    // Storybook functions
    if (this.isStorybookFunction(node, functionName)) {
      return {
        shouldInclude: false,
        reason: "Storybook function",
        confidence: 0.9,
        appliedFilters: ["storybook_filter"],
      };
    }
    appliedFilters.push("storybook_filter");

    return {
      shouldInclude: true,
      reason: "Passed framework filters",
      confidence: 1.0,
      appliedFilters,
    };
  }

  /**
   * Applies node size filters
   */
  private applyNodeSizeFilters(
    node: ts.Node,
    functionName: string
  ): FilterResult {
    const nodeText = node.getText();
    const nodeSize = nodeText.length;

    if (nodeSize < this.config.minFunctionSize) {
      return {
        shouldInclude: false,
        reason: `Function too small (${nodeSize} chars, min: ${this.config.minFunctionSize})`,
        confidence: 0.8,
        appliedFilters: ["min_size_filter"],
      };
    }

    if (nodeSize > this.config.maxFunctionSize) {
      return {
        shouldInclude: false,
        reason: `Function too large (${nodeSize} chars, max: ${this.config.maxFunctionSize})`,
        confidence: 0.9,
        appliedFilters: ["max_size_filter"],
      };
    }

    return {
      shouldInclude: true,
      reason: "Passed size filters",
      confidence: 1.0,
      appliedFilters: ["size_filter"],
    };
  }

  /**
   * Applies custom user-defined filters
   */
  private applyCustomFilters(
    node: ts.Node,
    functionName: string,
    filePath?: string
  ): FilterResult {
    const appliedFilters: string[] = [];

    // Custom exclude patterns
    for (const pattern of this.config.customExcludePatterns) {
      if (
        this.matchesPattern(functionName, pattern) ||
        (filePath && this.matchesPattern(filePath, pattern))
      ) {
        return {
          shouldInclude: false,
          reason: `Matched exclude pattern: ${pattern}`,
          confidence: 0.85,
          appliedFilters: ["custom_exclude_filter"],
        };
      }
    }
    appliedFilters.push("custom_exclude_filter");

    // Custom include patterns (if specified, function must match at least one)
    if (this.config.customIncludePatterns.length > 0) {
      let matchesIncludePattern = false;
      for (const pattern of this.config.customIncludePatterns) {
        if (
          this.matchesPattern(functionName, pattern) ||
          (filePath && this.matchesPattern(filePath, pattern))
        ) {
          matchesIncludePattern = true;
          break;
        }
      }

      if (!matchesIncludePattern) {
        return {
          shouldInclude: false,
          reason: "Does not match any include pattern",
          confidence: 0.8,
          appliedFilters: ["custom_include_filter"],
        };
      }
    }
    appliedFilters.push("custom_include_filter");

    return {
      shouldInclude: true,
      reason: "Passed custom filters",
      confidence: 1.0,
      appliedFilters,
    };
  }

  /**
   * Checks if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    return (
      lowerPath.includes(".test.") ||
      lowerPath.includes(".spec.") ||
      lowerPath.includes("__tests__") ||
      lowerPath.includes("/test/") ||
      lowerPath.includes("/tests/")
    );
  }

  /**
   * Checks if file is in node_modules
   */
  private isNodeModulesFile(filePath: string): boolean {
    return filePath.includes("node_modules");
  }

  /**
   * Checks if function is a Next.js API route function
   */
  private isNextJSApiFunction(node: ts.Node, functionName: string): boolean {
    // Check for default export in pages/api directory
    if (functionName.includes("Default") || functionName === "handler") {
      const sourceFile = node.getSourceFile();
      const filePath = sourceFile.fileName.toLowerCase();
      return (
        filePath.includes("/pages/api/") || filePath.includes("\\pages\\api\\")
      );
    }
    return false;
  }

  /**
   * Checks if function is a Next.js page function
   */
  private isNextJSPageFunction(node: ts.Node, functionName: string): boolean {
    const nextJSPageFunctions = [
      "getServerSideProps",
      "getStaticProps",
      "getStaticPaths",
      "getInitialProps",
    ];
    return nextJSPageFunctions.includes(functionName);
  }

  /**
   * Checks if function is a test framework function
   */
  private isTestFrameworkFunction(
    node: ts.Node,
    functionName: string
  ): boolean {
    const testFunctions = [
      "describe",
      "it",
      "test",
      "expect",
      "beforeEach",
      "afterEach",
      "beforeAll",
      "afterAll",
      "jest",
      "mock",
      "spy",
    ];
    return testFunctions.some((testFn) =>
      functionName.toLowerCase().includes(testFn.toLowerCase())
    );
  }

  /**
   * Checks if function is a Storybook function
   */
  private isStorybookFunction(node: ts.Node, functionName: string): boolean {
    return (
      functionName.toLowerCase().includes("story") ||
      functionName.toLowerCase().includes("stories") ||
      (functionName === "default" &&
        node.getSourceFile().fileName.includes(".stories."))
    );
  }

  /**
   * Matches a string against a pattern (supports wildcards)
   */
  private matchesPattern(text: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");

    try {
      const regex = new RegExp(`^${regexPattern}$`, "i");
      return regex.test(text);
    } catch (error) {
      // If pattern is invalid, do literal comparison
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  /**
   * Updates filter configuration
   */
  updateConfig(newConfig: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current filter configuration
   */
  getConfig(): FilterConfig {
    return { ...this.config };
  }

  /**
   * Gets filter statistics
   */
  getFilterStats(): {
    totalFiltersApplied: number;
    filtersByType: Record<string, number>;
    averageConfidence: number;
  } {
    // This would need to be implemented with usage tracking
    // For now, return placeholder
    return {
      totalFiltersApplied: 0,
      filtersByType: {},
      averageConfidence: 1.0,
    };
  }

  /**
   * Additional analyzer-specific filter logic can be added here as needed
   */
}
