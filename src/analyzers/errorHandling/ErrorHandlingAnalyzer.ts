import ts from "typescript";
import { ComponentRelation, IConfigManager, ScanResult } from "../../types";
import {
  ErrorHandlingCompleteAnalysis,
  ErrorHandlingAnalysisResult,
} from "../../types/errorHandling.types";
import { FunctionAnalyzer } from "./analyzers/functionAnalyzer";
import { SerializationUtils } from "./utils/serializationUtils";
import { LibraryUsage } from "./types/internalTypes";
import { ComponentAnalyzer } from "./analyzers/componentAnalyzer";
import { generateComponentId } from "../../utils/common/analysisUtils";
import { ConfigManager } from "../../core/configManager";
import path from "path";

/**
 * Enhanced main analyzer for error handling in React applications with dynamic project structure support
 */
export class ErrorHandlingAnalyzer {
  private program: ts.Program | null = null;
  private sourceFiles: Map<string, ts.SourceFile> = new Map();
  private components: ComponentRelation[];
  private typeChecker: ts.TypeChecker | null = null;
  private config: IConfigManager;
  private scanResult: ScanResult;

  /**
   * Create a new ErrorHandlingAnalyzer with enhanced project structure integration
   *
   * @param files - Array of file paths to analyze
   * @param components - Component relations to analyze
   * @param config - Enhanced config manager with project structure info
   * @param scanResult - Complete scan result with all project data
   * @param program - Optional pre-built TypeScript program from projectAnalyzer
   * @param typeChecker - Optional pre-built type checker from projectAnalyzer
   */
  constructor(
    files: string[],
    components: ComponentRelation[],
    config?: IConfigManager,
    scanResult?: ScanResult,
    program?: ts.Program,
    typeChecker?: ts.TypeChecker
  ) {
    this.components = components;
    this.config = config || new ConfigManager(process.cwd());
    this.scanResult = scanResult || this.createFallbackScanResult(files);

    // Use provided TypeScript program or create a new one
    if (program && typeChecker) {
      this.program = program;
      this.typeChecker = typeChecker;
      this.sourceFiles = new Map(
        files
          .map((filePath) => [filePath, program.getSourceFile(filePath)])
          .filter(([, sourceFile]) => sourceFile !== undefined) as [
          string,
          ts.SourceFile
        ][]
      );
    } else {
      this.initializeTypeScriptProgram(files);
    }
  }

  /**
   * Initialize TypeScript program with enhanced configuration detection
   */
  private initializeTypeScriptProgram(files: string[]): void {
    try {
      let compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        allowJs: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true,
        incremental: false,
      };

      // Enhanced TypeScript config detection
      const possibleTsConfigPaths = [
        path.join(this.config.projectPath, "tsconfig.json"),
        path.join(this.config.srcDir, "tsconfig.json"),
      ];

      // Try to load existing TypeScript configuration
      for (const configPath of possibleTsConfigPaths) {
        try {
          const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
          if (!configFile.error) {
            const parsedConfig = ts.parseJsonConfigFileContent(
              configFile.config,
              ts.sys,
              path.dirname(configPath)
            );

            if (!parsedConfig.errors.length) {
              compilerOptions = { ...compilerOptions, ...parsedConfig.options };
              break;
            }
          }
        } catch (error) {
          // Continue to next config path
        }
      }

      // Create TypeScript program
      this.program = ts.createProgram(files, compilerOptions);
      this.typeChecker = this.program.getTypeChecker();

      // Create source files map
      this.sourceFiles = new Map(
        files
          .map((filePath) => [filePath, this.program!.getSourceFile(filePath)])
          .filter(([, sourceFile]) => sourceFile !== undefined) as [
          string,
          ts.SourceFile
        ][]
      );
    } catch (error) {
      // Fallback: create minimal program
      this.program = ts.createProgram(files, {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        allowJs: true,
        noEmit: true,
      });
      this.typeChecker = this.program.getTypeChecker();
      this.sourceFiles = new Map(
        files
          .map((filePath) => [filePath, this.program!.getSourceFile(filePath)])
          .filter(([, sourceFile]) => sourceFile !== undefined) as [
          string,
          ts.SourceFile
        ][]
      );
    }
  }

  /**
   * Create fallback scan result if not provided
   */
  private createFallbackScanResult(files: string[]): ScanResult {
    return {
      filePaths: files,
      sourceFiles: new Map(),
      fileContents: new Map(),
      fileMetadata: new Map(),
      securityFiles: [],
      configFiles: [],
      environmentFiles: [],
      apiRoutes: [],
      middlewareFiles: [],
      packageInfo: [],
      securityScanMetadata: {
        scanTimestamp: Date.now(),
        scanDuration: 0,
        filesScanned: files.length,
        securityIssuesFound: 0,
        riskLevel: "low",
        coveragePercentage: 0,
      },
    };
  }

  /**
   * Analyze error handling across all components and functions with enhanced project structure awareness
   */
  public analyze(): ErrorHandlingCompleteAnalysis {
    if (!this.typeChecker) {
      throw new Error(
        "TypeScript type checker is not available for error handling analysis"
      );
    }

    // Initialize analysis results
    const results = new Map<string, ErrorHandlingAnalysisResult>();
    let totalErrorBoundaries = 0;
    let totalTryCatch = 0;
    let totalFunctionsWithErrorHandling = 0;
    let totalFunctionsNeedingErrorHandling = 0;
    const functionsWithMissingErrorHandling: string[] = [];
    const riskBreakdown = { high: 0, medium: 0, low: 0 };

    // Analyze all source files for functions first with enhanced context
    this.sourceFiles.forEach((sourceFile, filePath) => {
      const functionAnalyzer = new FunctionAnalyzer(
        sourceFile,
        this.typeChecker!,
        this.config,
        this.scanResult
      );
      const functionErrorHandling = functionAnalyzer.analyzeFunctions();

      functionErrorHandling.forEach((func) => {
        if (func.hasErrorHandling) {
          totalFunctionsWithErrorHandling++;
        }

        if (func.riskAnalysis.shouldHaveErrorHandling) {
          totalFunctionsNeedingErrorHandling++;

          if (!func.hasErrorHandling) {
            functionsWithMissingErrorHandling.push(
              `${func.functionName} (${filePath}:${func.location.line})`
            );
          }

          // Categorize risk with enhanced scoring
          if (func.riskAnalysis.riskScore >= 5) riskBreakdown.high++;
          else if (func.riskAnalysis.riskScore >= 3) riskBreakdown.medium++;
          else riskBreakdown.low++;
        }
      });
    });

    // Analyze components with enhanced project structure awareness
    for (const component of this.components) {
      const sourceFile = this.sourceFiles.get(component.fullPath);
      if (!sourceFile) continue;

      const componentAnalyzer = new ComponentAnalyzer(
        component,
        sourceFile,
        this.typeChecker!,
        this.config,
        this.scanResult
      );

      const result = componentAnalyzer.analyzeComponent();
      const significantResult =
        componentAnalyzer.getSignificantAnalysis(result);

      // Only include significant results
      if (significantResult) {
        results.set(generateComponentId(component), significantResult);
        totalErrorBoundaries += significantResult.errorBoundaries.length;
        totalTryCatch += significantResult.tryCatchBlocks.length;
      }
    }

    const componentsWithErrorHandling = results.size;

    const analysis: ErrorHandlingCompleteAnalysis = {
      componentResults: Object.fromEntries(results),
      summary: {
        totalComponents: this.components.length,
        componentsWithErrorHandling,
        errorHandlingCoverage:
          (componentsWithErrorHandling / this.components.length) * 100,
        totalErrorBoundaries,
        totalTryCatch,
        totalFunctionsWithErrorHandling,
        libraryUsage: this.collectLibraryUsage(results),
        functionErrorHandlingGaps: {
          totalFunctionsNeedingErrorHandling,
          functionsWithMissingErrorHandling,
          riskBreakdown,
        },
      },
    };

    // Add project-specific insights
    this.addProjectSpecificInsights(analysis);

    // Verify the result is serializable
    SerializationUtils.verifySerializable(analysis);

    return analysis;
  }

  /**
   * Add project-specific insights based on detected structure
   */
  private addProjectSpecificInsights(
    analysis: ErrorHandlingCompleteAnalysis
  ): void {
    const projectStructure = this.config.getProjectStructure();

    if (projectStructure?.projectType === "nextjs") {
      // Add Next.js specific insights
      const nextjsInsights = this.analyzeNextJsSpecificPatterns();

      // Add insights to summary (extend the type if needed)
      if (analysis.summary && typeof analysis.summary === "object") {
        (analysis.summary as any).nextjsInsights = nextjsInsights;
      }
    }
  }

  /**
   * Analyze Next.js specific error handling patterns
   */
  private analyzeNextJsSpecificPatterns(): any {
    const projectStructure = this.config.getProjectStructure();
    const insights = {
      routerType: projectStructure?.routerType,
      hasErrorPages: false,
      hasGlobalErrorBoundary: false,
      apiRouteErrorHandling: 0,
      serverComponentErrors: 0,
    };

    // Check for Next.js specific error handling patterns
    this.components.forEach((component) => {
      const fileName = path.basename(
        component.fullPath,
        path.extname(component.fullPath)
      );

      // Check for error pages
      if (
        fileName === "error" ||
        fileName === "_error" ||
        fileName === "404" ||
        fileName === "500"
      ) {
        insights.hasErrorPages = true;
      }

      // Check for global error boundary in app router
      if (fileName === "global-error" || fileName === "layout") {
        insights.hasGlobalErrorBoundary = true;
      }

      // Count API route error handling
      if (component.fullPath.includes("/api/")) {
        insights.apiRouteErrorHandling++;
      }
    });

    return insights;
  }

  /**
   * Collect library usage statistics from error boundaries with enhanced detection
   */
  private collectLibraryUsage(
    results: Map<string, ErrorHandlingAnalysisResult>
  ): Record<string, number> {
    const usage: LibraryUsage = {};

    results.forEach((result) => {
      result.errorBoundaries.forEach((boundary) => {
        const libName = boundary.library.name;
        usage[libName] = (usage[libName] || 0) + 1;
      });
    });

    return usage;
  }

  /**
   * Get project structure information
   */
  public getProjectStructure() {
    return this.config.getProjectStructure();
  }

  /**
   * Get configuration manager
   */
  public getConfig(): IConfigManager {
    return this.config;
  }

  /**
   * Get scan result data
   */
  public getScanResult(): ScanResult {
    return this.scanResult;
  }
}
