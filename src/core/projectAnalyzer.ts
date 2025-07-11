// General Imports
import { ConfigManager } from "./configManager";
import { ProgressTracker } from "./progressTracker";
import * as fs from "fs/promises";
import ts from "typescript";

// Parsers Imports
import { scanDirectory } from "../parsers/directoryScanner";
import { getTranslationSourceFiles } from "../parsers/translationSourceScanner";
import { parseFiles } from "../parsers/fileParser";

// Utils & Types Imports
import { replacer } from "../utils/common/analysisUtils";
import { ContentProcessor } from "../utils/common/contentProcessor";
import { ErrorHandlingCompleteAnalysis } from "../types/errorHandling.types";
import {
  ComponentRelation,
  AnalysisResult,
  ProcessedComponentRelation,
  ProcessedContent,
  ScanResult,
} from "../types";

// Analyzers imports
import { ComponentAnalyzer } from "../analyzers/component/ComponentAnalyzer";
import { FunctionAnalyzer } from "../analyzers/function/FunctionAnalyzer";
import { TypeAnalyzer } from "../analyzers/type/TypeAnalyzer";
import { ComplexityAnalyzer } from "../analyzers/complexity/ComplexityAnalyzer";
import { DeduplicationAnalyzer } from "../analyzers/deduplication/DeduplicationAnalyzer";
import { ErrorHandlingAnalyzer } from "../analyzers/errorHandling/ErrorHandlingAnalyzer";
import { SEOAnalyzer } from "../analyzers/seo/SeoAnalyzer";
import { TranslationAnalyzer } from "../analyzers/translation/TranslationAnalyzer";
import { SecurityAnalyzer } from "../analyzers/security/SecurityAnalyzer";

// Graph generators
import { generateGraphData } from "../generators/graphGenerator";
import { generateStructureGraphData } from "../generators/structureGraphGenerator";
import { ComponentFlowAnalyzer } from "../analyzers/componentFlow/ComponentFlowAnalyzer";
import { GeneralAnalyzer } from "../analyzers/general/GeneralAnalyzer";
import { ComponentScoringAnalyzer } from "../analyzers/scoring/ComponentScoringAnalyzer";
import { AccessibilityAnalyzer } from "../analyzers/accessibility/AccessibilityAnalyzer";
import path from "path";
import { ComponentLookupService } from "./componentLookupService";
import { PathResolver } from "../parsers/pathResolver";

export class ProjectAnalyzer {
  private config: ConfigManager;
  private progressTracker: ProgressTracker;
  private contentProcessor: ContentProcessor;
  private scanResult: ScanResult | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private program: ts.Program | null = null;

  constructor(projectPath: string) {
    this.config = new ConfigManager(projectPath);
    this.contentProcessor = new ContentProcessor();
    this.progressTracker = new ProgressTracker([
      "Loading configuration",
      "🔍 Detecting project structure...",
      "📁 Scanning project directory...",
      "📝 Parsing component files...",
      "📊 Analyzing general metrics...",
      "🔗 Analyzing component dependencies...",
      "⚡ Analyzing functions...",
      "🎯 Analyzing TypeScript types...",
      "🧮 Calculating complexity metrics...",
      "🕸️ Generating component dependency graph...",
      "🏗️ Generating file structure graph...",
      "🔄 Detecting component duplications...",
      "⚠️ Analyzing error handling patterns...",
      "🔎 Analyzing SEO implementation...",
      "🌐 Analyzing translation coverage...",
      "🌊 Analyzing component flow patterns...",
      "🔍 Analyzing accessibility compliance...",
      "🔒 Analyzing security vulnerabilities...",
      "🏆 Calculating component scores...",
      "💾 Writing analysis results...",
    ]);
  }

  getProjectPath(): string {
    return this.config.projectPath;
  }

  async analyze(): Promise<void> {
    try {
      // Load configuration with dynamic project structure detection
      await this.config.loadConfig();
      this.progressTracker.start();
      this.progressTracker.incrementProgress(); // Loading configuration

      // Validate configuration and show warnings if any
      const warnings = this.config.validateConfig();
      if (warnings.length > 0) {
        console.warn("⚠️  Configuration warnings:");
        warnings.forEach((warning) => console.warn(`   ${warning}`));
      }

      this.progressTracker.incrementProgress(); // Detecting project structure

      // Perform unified scanning of the project with enhanced structure detection
      this.scanResult = await scanDirectory(
        this.config.projectPath,
        this.config
      );
      this.progressTracker.incrementProgress(); // Scanning project directory

      // Initialize TypeScript program and type checker with dynamic paths
      this.initializeTypeScriptProgram();

      // Filter parseable files but keep all for security analysis
      const parseableScanResult: ScanResult = this.createParseableScanResult();

      // Parse components using the enhanced scan result
      const components: ComponentRelation[] = await parseFiles(
        parseableScanResult,
        this.config.srcDir,
        this.config
      );
      this.progressTracker.incrementProgress(); // Parsing component files

      // Initialize optimized services once for all analyzers
      const componentLookupService = new ComponentLookupService(components);
      const pathResolver = new PathResolver(this.config, this.scanResult!);

      // General Analysis
      const generalAnalyzer = new GeneralAnalyzer(this.scanResult!);
      const generalAnalysis = await generalAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing general metrics

      // Dependency analysis with optimized services
      const componentAnalyzer = new ComponentAnalyzer(
        components,
        this.config,
        componentLookupService,
        pathResolver
      );
      const advancedAnalysis = await componentAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing component dependencies

      // Function analysis
      const functionAnalyzer = new FunctionAnalyzer(components);
      const functionAnalysis = await functionAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing functions

      // Type analysis using the enhanced type analyzer
      const typeAnalyzer = new TypeAnalyzer(this.scanResult, this.typeChecker!);
      const typeAnalysis = await typeAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing TypeScript types

      // Complexity analysis
      const complexityAnalyzer = new ComplexityAnalyzer(
        components,
        componentLookupService,
        pathResolver,
        this.scanResult
      );
      const complexityAnalysis = await complexityAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Calculating complexity metrics

      // Graph generation for components
      const componentGraphGenerator = generateGraphData(
        components,
        this.config
      );
      this.progressTracker.incrementProgress(); // Generating component dependency graph

      // Graph generation for file structure with enhanced metadata
      const structureGraphGenerator = generateStructureGraphData(
        this.scanResult!,
        this.config
      );
      this.progressTracker.incrementProgress(); // Generating file structure graph

      // Ensure all component details are loaded
      components.forEach((component) =>
        componentGraphGenerator.loadComponentDetails(component.name)
      );

      // Deduplication analysis
      const analyzer = new DeduplicationAnalyzer(components, this.scanResult);
      const similarities = await analyzer.analyzeComponents(components);

      // Filter significant matches
      const significantMatches = similarities.filter(
        (s) => s.similarityScore > 0.7
      );
      this.progressTracker.incrementProgress(); // Detecting component duplications

      // Error handling analysis
      const errorHandlingAnalyzer = new ErrorHandlingAnalyzer(
        this.scanResult.filePaths,
        components
      );
      const errorHandlingAnalysis: ErrorHandlingCompleteAnalysis =
        errorHandlingAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing error handling patterns

      // SEO analysis
      const seoAnalyzer = new SEOAnalyzer(components);
      const seoAnalysis = await seoAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing SEO implementation

      // Translation analysis
      const translationSourceFiles = getTranslationSourceFiles(this.scanResult);
      const translationAnalyzer = new TranslationAnalyzer(
        this.config.projectPath,
        translationSourceFiles
      );
      const translationAnalysis = await translationAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing translation coverage

      // Component flow analysis with enhanced path handling
      const componentFlowAnalyzer = new ComponentFlowAnalyzer(
        this.config.projectPath,
        this.config.srcDir,
        components,
        componentLookupService,
        pathResolver,
        this.scanResult
      );
      const componentFlowAnalysis = await componentFlowAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing component flow patterns

      const accessibilityAnalyzer = new AccessibilityAnalyzer(
        this.scanResult,
        components
      );
      const accessibilityAnalysis = await accessibilityAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing accessibility compliance

      // Security analysis with comprehensive scan result
      const securityAnalyzer = new SecurityAnalyzer();
      const securityAnalysis = await securityAnalyzer.analyze(this.scanResult, {
        projectPath: this.config.projectPath,
        sourcePath: this.config.srcDir,
        filesToAnalyze: this.scanResult.filePaths,
      });
      this.progressTracker.incrementProgress(); // Analyzing security vulnerabilities

      // Component scoring
      const componentScoringAnalyzer = new ComponentScoringAnalyzer();
      const topComponents =
        await componentScoringAnalyzer.calculateTopScoringComponents(
          components,
          {
            generalAnalysis,
            dependencyAnalysis: advancedAnalysis,
            errorHandlingAnalysis,
            complexityAnalysis,
            typeAnalysis,
            seoAnalysis,
            translationAnalysis,
            componentFlowAnalysis,
            deduplicationAnalysis: significantMatches,
          },
          20 // Top 20 components
        );
      this.progressTracker.incrementProgress(); // Calculating component scores

      // Build the final analysis result
      const analysisResult: AnalysisResult = {
        generalAnalysis,
        componentDependencyGraph: componentGraphGenerator.getSigmaData(),
        fileStructureGraph: structureGraphGenerator.getStructureData(),
        advancedAnalysis,
        functionAnalysis,
        typeAnalysis,
        complexityAnalysis,
        deduplicationAnalysis: significantMatches,
        errorHandlingAnalysis,
        seoAnalysis,
        translationAnalysis,
        componentFlowAnalysis,
        accessibilityAnalysis,
        securityAnalysis,
        topScoringComponents: topComponents,
      };

      // Write output file
      await fs.writeFile(
        this.config.outputFileName,
        JSON.stringify(analysisResult, replacer, 2)
      );
      this.progressTracker.incrementProgress(); // Processing and writing output

      this.progressTracker.complete();

      // Show any configuration warnings again at the end
      if (warnings.length > 0) {
        console.log(
          `\n⚠️  ${warnings.length} configuration warning(s) - see above for details`
        );
      }
    } catch (error) {
      console.error("\n❌ An error occurred during analysis:", error);

      // Provide helpful error context
      if (error instanceof Error) {
        if (
          error.message.includes("ENOENT") ||
          error.message.includes("does not exist")
        ) {
          console.error(
            "💡 This might be a path or file access issue. Please check:"
          );
          console.error("   - The project path exists and is accessible");
          console.error("   - You have read permissions for the directory");
          console.error("   - The detected source directory is correct");
        }

        if (error.message.includes("package.json")) {
          console.error("💡 Package.json issue detected. Please ensure:");
          console.error("   - package.json exists in the project root");
          console.error("   - The file contains valid JSON");
          console.error(
            "   - You're running the analyzer from the correct directory"
          );
        }
      }

      throw error;
    }
  }

  /**
   * Create a filtered scan result for parseable files while keeping security data intact
   */
  private createParseableScanResult(): ScanResult {
    const parseableExtensions = [".ts", ".tsx", ".js", ".jsx"];

    const parseableFiles = this.scanResult!.filePaths.filter((filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      return parseableExtensions.includes(ext);
    });

    return {
      ...this.scanResult!,
      filePaths: parseableFiles,
      // Filter the sourceFiles and fileContents maps to parseable files only
      sourceFiles: new Map(
        Array.from(this.scanResult!.sourceFiles.entries()).filter(
          ([filePath]) => {
            const ext = path.extname(filePath).toLowerCase();
            return parseableExtensions.includes(ext);
          }
        )
      ),
      fileContents: new Map(
        Array.from(this.scanResult!.fileContents.entries()).filter(
          ([filePath]) => {
            const ext = path.extname(filePath).toLowerCase();
            return parseableExtensions.includes(ext);
          }
        )
      ),
      fileMetadata: new Map(
        Array.from(this.scanResult!.fileMetadata.entries()).filter(
          ([filePath]) => {
            const ext = path.extname(filePath).toLowerCase();
            return parseableExtensions.includes(ext);
          }
        )
      ),
    };
  }

  /**
   * Initialize TypeScript program and type checker for static analysis with enhanced path handling
   */
  private initializeTypeScriptProgram(): void {
    if (!this.scanResult) {
      throw new Error("Scan result is not available");
    }

    try {
      // Look for tsconfig.json in project root or source directory
      const possibleTsConfigPaths = [
        path.join(this.config.projectPath, "tsconfig.json"),
        path.join(this.config.srcDir, "tsconfig.json"),
      ];

      let tsConfigPath: string | undefined;
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

      // Try to find and parse tsconfig.json
      for (const configPath of possibleTsConfigPaths) {
        try {
          const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
          if (!configFile.error) {
            tsConfigPath = configPath;
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
          // Continue to next possible config path
        }
      }

      if (!tsConfigPath) {
        console.log(
          "📄 No tsconfig.json found, using default TypeScript configuration"
        );
      }

      // Create program with all source files
      this.program = ts.createProgram(
        Array.from(this.scanResult.sourceFiles.keys()),
        compilerOptions
      );
      this.typeChecker = this.program.getTypeChecker();
    } catch (error) {
      console.warn("⚠️  Failed to initialize TypeScript program:", error);
      console.log(
        "🔧 Continuing with basic analysis (some type features may be limited)"
      );

      // Create a minimal program as fallback
      this.program = ts.createProgram(
        Array.from(this.scanResult.sourceFiles.keys()),
        {
          target: ts.ScriptTarget.Latest,
          module: ts.ModuleKind.ESNext,
          allowJs: true,
          noEmit: true,
        }
      );
      this.typeChecker = this.program.getTypeChecker();
    }
  }
}
