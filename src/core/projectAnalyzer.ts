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
      "🔍 Scanning project directory...",
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
      await this.config.loadConfig();
      this.progressTracker.start();
      this.progressTracker.incrementProgress(); // Loading configuration

      // Perform unified scanning of the project
      this.scanResult = await scanDirectory(
        this.config.projectPath,
        this.config
      );
      this.progressTracker.incrementProgress(); // Scanning project directory

      // Initialize TypeScript program and type checker
      this.initializeTypeScriptProgram();

      const parseableScanResult: ScanResult = {
        ...this.scanResult,
        filePaths: this.scanResult.filePaths.filter((filePath) => {
          const ext = path.extname(filePath).toLowerCase();
          const parseableExtensions = [".ts", ".tsx", ".js", ".jsx"];
          return parseableExtensions.includes(ext);
        }),
        // Also filter the sourceFiles and fileContents maps
        sourceFiles: new Map(
          Array.from(this.scanResult.sourceFiles.entries()).filter(
            ([filePath]) => {
              const ext = path.extname(filePath).toLowerCase();
              const parseableExtensions = [".ts", ".tsx", ".js", ".jsx"];
              return parseableExtensions.includes(ext);
            }
          )
        ),
        fileContents: new Map(
          Array.from(this.scanResult.fileContents.entries()).filter(
            ([filePath]) => {
              const ext = path.extname(filePath).toLowerCase();
              const parseableExtensions = [".ts", ".tsx", ".js", ".jsx"];
              return parseableExtensions.includes(ext);
            }
          )
        ),
        fileMetadata: new Map(
          Array.from(this.scanResult.fileMetadata.entries()).filter(
            ([filePath]) => {
              const ext = path.extname(filePath).toLowerCase();
              const parseableExtensions = [".ts", ".tsx", ".js", ".jsx"];
              return parseableExtensions.includes(ext);
            }
          )
        ),
      };

      // Parse components using the scan result
      const components: ComponentRelation[] = await parseFiles(
        this.scanResult,
        this.config.srcDir,
        this.config
      );
      this.progressTracker.incrementProgress(); // Parsing component files

      // General Analysis
      const generalAnalyzer = new GeneralAnalyzer(this.scanResult!);
      const generalAnalysis = await generalAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing general metrics

      // Dependency analysis
      const componentAnalyzer = new ComponentAnalyzer(components, this.config);
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
      const complexityAnalyzer = new ComplexityAnalyzer(components);
      const complexityAnalysis = await complexityAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Calculating complexity metrics

      // Graph generation for components
      const componentGraphGenerator = generateGraphData(
        components,
        this.config
      );
      this.progressTracker.incrementProgress(); // Generating component dependency graph

      // Graph generation for file structure
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
      const analyzer = new DeduplicationAnalyzer(components);
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

      // Component flow analysis
      const componentFlowAnalyzer = new ComponentFlowAnalyzer(
        this.config.projectPath,
        this.config.srcDir,
        components
      );
      const componentFlowAnalysis = await componentFlowAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing component flow patterns

      const accessibilityAnalyzer = new AccessibilityAnalyzer(components);
      const accessibilityAnalysis = await accessibilityAnalyzer.analyze();
      this.progressTracker.incrementProgress(); // Analyzing accessibility compliance

      // Security analysis
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

      // Process components and build final result
      const processedComponents: ProcessedComponentRelation[] = components.map(
        (component) => {
          if (!component.content) return { ...component, content: undefined };
          const processed = this.contentProcessor.processComponent(component);
          return {
            ...component,
            content: JSON.parse(processed.content!) as ProcessedContent,
          };
        }
      );

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

      console.log("\n✅ Analysis Complete!");
      console.log(`📁 Analyzed ${this.scanResult.filePaths.length} files`);
      console.log(`⚛️ Found ${components.length} components`);
      console.log(
        `🔒 Found ${securityAnalysis.vulnerabilities.length} security vulnerabilities`
      );
      console.log(`💾 Results saved to: ${this.config.outputFileName}`);
    } catch (error) {
      console.error("An error occurred during analysis:", error);
      throw error;
    }
  }

  /**
   * Initialize TypeScript program and type checker for static analysis
   */
  private initializeTypeScriptProgram(): void {
    if (!this.scanResult) {
      throw new Error("Scan result is not available");
    }

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
      incremental: false,
    };

    // Create program with all source files
    this.program = ts.createProgram(
      Array.from(this.scanResult.sourceFiles.keys()),
      compilerOptions
    );
    this.typeChecker = this.program.getTypeChecker();
  }
}
