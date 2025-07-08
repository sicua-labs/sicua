import * as path from "path";
import ts from "typescript";
import {
  AnalysisCache,
  ProcessingStats,
  AnalysisStage,
  AnalysisProgress,
  AnalysisError,
  AnalysisOptions,
  QualityMetrics,
} from "./types/main.types";
import { BusinessLogicExtractor } from "./extractors/BusinessLogicExtractor";
import { ComponentExtractor } from "./extractors/ComponentExtractor";
import { FunctionExtractor } from "./extractors/FunctionExtractor";
import { ImportExtractor } from "./extractors/ImportExtractor";
import { TypeExtractor } from "./extractors/TypeExtractor";
import { SummaryBuilder } from "./utils/summaryBuilder";
import {
  AnalysisStatistics,
  ContextualSummariesAnalysisResult,
  ContextualSummary,
  FileContextType,
  FileRelationship,
  ProjectContext,
  PromptTemplate,
} from "./types/contextualSummaries.types";
import { determineFileContextType } from "./utils/contextUtils";
import { SemanticAnalyzer } from "./utils/semanticAnalysis";
import { PromptPersonalization } from "./types/summaryBuilder.types";
import { ScanResult } from "../../types";

export class ContextualSummariesAnalyzer {
  private scanResult: ScanResult;
  private srcDir: string;
  private typeChecker?: ts.TypeChecker;
  private options: AnalysisOptions;
  private cache: AnalysisCache;
  private stats: ProcessingStats;
  private summaryBuilder: SummaryBuilder;

  constructor(
    scanResult: ScanResult,
    srcDir: string,
    typeChecker?: ts.TypeChecker
  ) {
    this.scanResult = scanResult;
    this.srcDir = srcDir;
    this.typeChecker = typeChecker;
    this.options = this.getDefaultOptions();
    this.cache = this.initializeCache();
    this.stats = this.initializeStats();
    this.summaryBuilder = new SummaryBuilder(this.options.config);
  }

  /**
   * Main analysis method that orchestrates the entire contextual summaries generation process
   */
  async analyze(
    options?: Partial<AnalysisOptions>
  ): Promise<ContextualSummariesAnalysisResult> {
    // Merge options
    this.options = { ...this.options, ...options };
    this.summaryBuilder = new SummaryBuilder(this.options.config);

    const startTime = Date.now();
    this.stats.filesAnalyzed = 0;
    this.stats.errorsEncountered = 0;

    try {
      // Initialize analysis
      this.reportProgress("initialization", "", 0, 0);

      // Get relevant files for analysis
      const relevantFiles = this.filterRelevantFiles();
      const totalFiles = relevantFiles.length;

      if (totalFiles === 0) {
        return this.createEmptyResult();
      }

      // Analyze files
      const summaries = await this.analyzeFiles(relevantFiles, totalFiles);

      // Generate project context
      this.reportProgress(
        "relationship-analysis",
        "Analyzing project relationships",
        totalFiles,
        totalFiles
      );
      const projectContext = this.generateProjectContext(summaries);

      // Generate file relationships
      const relationships = this.options.generateRelationships
        ? await this.generateFileRelationships(summaries)
        : [];

      // Calculate final statistics
      const statistics = this.calculateFinalStatistics(summaries);

      // Generate prompt templates
      const promptTemplates = this.generatePromptTemplates(summaries);

      // Finalize
      this.reportProgress(
        "finalization",
        "Finalizing analysis",
        totalFiles,
        totalFiles
      );
      const processingTime = Date.now() - startTime;
      this.stats.averageProcessingTime =
        processingTime / Math.max(totalFiles, 1);

      return {
        summaries,
        projectContext,
        relationships,
        statistics,
        promptTemplates,
      };
    } catch (error) {
      this.handleCriticalError(error as Error);
      throw error;
    }
  }

  /**
   * Analyzes files in parallel or sequential based on configuration
   */
  private async analyzeFiles(
    filePaths: string[],
    totalFiles: number
  ): Promise<ContextualSummary[]> {
    const summaries: ContextualSummary[] = [];

    if (this.options.parallelProcessing) {
      const batches = this.createBatches(
        filePaths,
        this.options.maxConcurrency
      );

      for (const batch of batches) {
        const batchPromises = batch.map((filePath) =>
          this.analyzeFile(filePath, summaries.length, totalFiles)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            summaries.push(result.value);
          } else if (result.status === "rejected") {
            this.handleFileError(
              batch[index],
              "semantic-analysis",
              result.reason
            );
          }
        });
      }
    } else {
      // Sequential processing
      for (let i = 0; i < filePaths.length; i++) {
        try {
          const summary = await this.analyzeFile(filePaths[i], i, totalFiles);
          if (summary) {
            summaries.push(summary);
          }
        } catch (error) {
          this.handleFileError(
            filePaths[i],
            "semantic-analysis",
            error as Error
          );
        }
      }
    }

    return summaries;
  }

  /**
   * Analyzes a single file and generates its contextual summary
   */
  private async analyzeFile(
    filePath: string,
    currentIndex: number,
    totalFiles: number
  ): Promise<ContextualSummary | null> {
    const fileName = path.basename(filePath);

    try {
      // Check cache first
      if (this.isCachedAndValid(filePath)) {
        const cached = this.cache.cachedSummaries.get(filePath);
        if (cached) {
          this.stats.filesAnalyzed++;
          return cached;
        }
      }

      // Get source file and content
      const sourceFile = this.scanResult.sourceFiles.get(filePath);
      const content = this.scanResult.fileContents.get(filePath);

      if (!sourceFile || !content) {
        this.handleFileError(
          filePath,
          "file-scanning",
          new Error("Source file or content not found")
        );
        return null;
      }

      // Determine file type
      const fileType = determineFileContextType(filePath, content, sourceFile);

      // Skip non-relevant files
      if (!this.isRelevantFileType(fileType)) {
        return null;
      }

      // Report progress
      this.reportProgress(
        "dependency-extraction",
        fileName,
        currentIndex,
        totalFiles
      );

      // Extract dependencies
      const importExtractor = new ImportExtractor(this.srcDir);
      const dependencyContext = importExtractor.extractDependencies(
        sourceFile,
        filePath
      );

      // Report progress
      this.reportProgress(
        "function-analysis",
        fileName,
        currentIndex,
        totalFiles
      );

      // Extract functions
      const functionExtractor = new FunctionExtractor(sourceFile, content);
      const functionContext = functionExtractor.extractFunctionContext();

      // Report progress
      this.reportProgress("type-analysis", fileName, currentIndex, totalFiles);

      // Extract types
      const typeExtractor = new TypeExtractor(this.typeChecker);
      const typeContext = typeExtractor.extractTypeContext(sourceFile);

      // Report progress
      this.reportProgress(
        "component-analysis",
        fileName,
        currentIndex,
        totalFiles
      );

      // Extract components (if applicable)
      const componentExtractor = new ComponentExtractor(
        sourceFile,
        content,
        filePath,
        this.srcDir,
        this.typeChecker
      );
      const componentContext = componentExtractor.extractComponentContext();

      // Report progress
      this.reportProgress(
        "business-logic-analysis",
        fileName,
        currentIndex,
        totalFiles
      );

      // Extract business logic
      const businessLogicExtractor = new BusinessLogicExtractor(
        sourceFile,
        content,
        filePath,
        this.srcDir,
        this.typeChecker
      );
      const businessLogic =
        businessLogicExtractor.extractBusinessLogicDefinition();

      // Report progress
      this.reportProgress(
        "semantic-analysis",
        fileName,
        currentIndex,
        totalFiles
      );

      // Perform semantic analysis
      const semanticAnalysis = SemanticAnalyzer.analyzeSemantics(
        fileType,
        functionContext,
        componentContext,
        typeContext,
        businessLogic,
        dependencyContext,
        filePath,
        content
      );

      // Report progress
      this.reportProgress(
        "summary-generation",
        fileName,
        currentIndex,
        totalFiles
      );

      // Generate contextual summary
      const summary = this.summaryBuilder.buildContextualSummary(
        filePath,
        fileType,
        functionContext,
        componentContext,
        typeContext,
        businessLogic,
        dependencyContext,
        semanticAnalysis,
        this.options.includeMetadata
          ? this.generateMetadata(filePath)
          : undefined
      );

      // Cache the result
      this.cacheResult(filePath, summary);

      // Update statistics
      this.updateProcessingStats(summary);

      this.stats.filesAnalyzed++;
      return summary;
    } catch (error) {
      this.handleFileError(filePath, "semantic-analysis", error as Error);
      return null;
    }
  }

  /**
   * Generates project-level context from all summaries
   */
  private generateProjectContext(
    summaries: ContextualSummary[]
  ): ProjectContext {
    const architectureTypes = summaries.map((s) =>
      this.inferArchitectureType(s)
    );
    const mainArchitecture = this.getMostCommonValue(architectureTypes);

    const allPatterns = summaries.flatMap((s) =>
      s.usagePatterns.map((p) => p.pattern)
    );
    const mainPatterns = this.getTopValues(allPatterns, 10);

    const techStack = summaries.flatMap((s) =>
      s.dependencies.external.map((dep) => dep.name)
    );
    const technicalStack = this.getTopValues(techStack, 15);

    const complexities = summaries.map((s) => s.complexity);
    const avgComplexity = this.calculateAverageComplexity(complexities);

    const modules = this.identifyModules(summaries);

    return {
      architecture: {
        type: this.inferProjectType(summaries),
        structure: this.inferProjectStructure(summaries),
        modules,
      },
      mainPatterns,
      technicalStack,
      complexity: avgComplexity,
    };
  }

  /**
   * Generates relationships between files
   */
  private async generateFileRelationships(
    summaries: ContextualSummary[]
  ): Promise<FileRelationship[]> {
    const relationships: FileRelationship[] = [];

    for (const summary of summaries) {
      // Import relationships
      summary.dependencies.internal.forEach((internal) => {
        const targetSummary = summaries.find(
          (s) =>
            s.filePath.includes(internal.path) ||
            internal.path.includes(s.fileName)
        );

        if (targetSummary) {
          relationships.push({
            source: summary.filePath,
            target: targetSummary.filePath,
            relationship: "imports",
            strength: this.calculateRelationshipStrength(internal.relationship),
            context: `${summary.fileName} imports from ${targetSummary.fileName}`, // Add context
          });
        }
      });

      // Export relationships (reverse lookup)
      const exportingSummaries = summaries.filter((s) =>
        s.dependencies.internal.some(
          (dep) =>
            dep.path.includes(summary.fileName) ||
            summary.filePath.includes(dep.path)
        )
      );

      exportingSummaries.forEach((exportingSummary) => {
        if (exportingSummary.filePath !== summary.filePath) {
          relationships.push({
            source: summary.filePath,
            target: exportingSummary.filePath,
            relationship: "extends",
            strength: "medium",
            context: `${summary.fileName} extends functionality from ${exportingSummary.fileName}`, // Add context
          });
        }
      });

      // Similar purpose relationships
      const similarSummaries = summaries.filter(
        (s) =>
          s.filePath !== summary.filePath &&
          s.purpose
            .toLowerCase()
            .includes(summary.purpose.toLowerCase().split(" ")[0])
      );

      similarSummaries.slice(0, 3).forEach((similarSummary) => {
        relationships.push({
          source: summary.filePath,
          target: similarSummary.filePath,
          relationship: "uses",
          strength: "weak",
          context: `${summary.fileName} has similar purpose to ${similarSummary.fileName}`, // Add context
        });
      });
    }

    return this.deduplicateRelationships(relationships);
  }

  /**
   * Calculates final analysis statistics
   */
  private calculateFinalStatistics(
    summaries: ContextualSummary[]
  ): AnalysisStatistics {
    const totalFiles = summaries.length;
    const complexities = summaries.map((s) => s.complexity);
    const averageComplexity = this.calculateAverageComplexity(complexities);

    const tokenStats = summaries.reduce(
      (acc, summary) => ({
        original: acc.original + summary.prompt.tokens.originalSize,
        reduced: acc.reduced + summary.prompt.tokens.approximate,
      }),
      { original: 0, reduced: 0 }
    );

    const reductionPercentage =
      tokenStats.original > 0
        ? ((tokenStats.original - tokenStats.reduced) / tokenStats.original) *
          100
        : 0;

    const averageCompressionRatio =
      summaries.length > 0
        ? summaries.reduce(
            (sum, s) => sum + s.prompt.tokens.compressionRatio,
            0
          ) / summaries.length
        : 1;

    // Pattern distribution analysis
    const allPatterns = summaries.flatMap((s) =>
      s.usagePatterns.map((p) => p.pattern)
    );
    const patternCounts = allPatterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const patternDistribution = Object.entries(patternCounts).reduce(
      (acc, [pattern, count]) => {
        acc[pattern] = {
          count,
          percentage: (count / totalFiles) * 100,
        };
        return acc;
      },
      {} as { [key: string]: { count: number; percentage: number } }
    );

    return {
      totalFiles,
      averageComplexity,
      tokenReduction: {
        originalTokens: tokenStats.original,
        reducedTokens: tokenStats.reduced,
        reductionPercentage,
        averageCompressionRatio,
      },
      patternDistribution,
    };
  }

  /**
   * Generates reusable prompt templates from analysis
   */
  private generatePromptTemplates(
    summaries: ContextualSummary[]
  ): PromptTemplate[] {
    const templates: PromptTemplate[] = [];

    // Group summaries by file type and complexity
    const groups = this.groupSummariesForTemplates(summaries);

    Object.entries(groups).forEach(([key, groupSummaries]) => {
      const [fileType, complexity] = key.split("-");

      if (groupSummaries.length >= 3) {
        // Only create templates with sufficient examples
        const template = this.createPromptTemplate(
          fileType as FileContextType,
          complexity as any,
          groupSummaries
        );
        templates.push(template);
      }
    });

    return templates;
  }

  /**
   * Creates a prompt template from a group of similar summaries
   */
  private createPromptTemplate(
    fileType: FileContextType,
    complexity: string,
    summaries: ContextualSummary[]
  ): PromptTemplate {
    const commonStructure = this.extractCommonStructure(summaries);
    const variableFields = this.identifyVariableFields(summaries);

    return {
      name: `${fileType}-${complexity}`,
      purpose: `Template for ${fileType} files with ${complexity} complexity`,
      template: this.buildTemplateString(commonStructure, variableFields),
      variables: variableFields,
      applicableFileTypes: [fileType],
    };
  }

  // Helper methods for analysis

  private filterRelevantFiles(): string[] {
    return Array.from(this.scanResult.sourceFiles.keys()).filter((filePath) => {
      const metadata = this.scanResult.fileMetadata.get(filePath);
      if (!metadata) return false;

      // Skip test files if not configured to include them
      if (metadata.isTest && !this.shouldIncludeTestFiles()) {
        return false;
      }

      // Include files with meaningful content
      return (
        metadata.hasReactImport ||
        metadata.hasJSX ||
        metadata.hasTranslations ||
        metadata.hasTypeDefinitions ||
        this.hasSignificantContent(filePath)
      );
    });
  }

  private hasSignificantContent(filePath: string): boolean {
    const content = this.scanResult.fileContents.get(filePath);
    if (!content) return false;

    // File must have meaningful content (not just imports/exports)
    const meaningfulLines = content.split("\n").filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        !trimmed.startsWith("import ") &&
        !trimmed.startsWith("export ") &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("/*") &&
        trimmed !== "{" &&
        trimmed !== "}"
      );
    });

    return meaningfulLines.length > 5; // At least 5 meaningful lines
  }

  private shouldIncludeTestFiles(): boolean {
    return (
      this.options.config.customPatterns?.some((pattern) =>
        pattern.name.toLowerCase().includes("test")
      ) || false
    );
  }

  private isRelevantFileType(fileType: FileContextType): boolean {
    const relevantTypes: FileContextType[] = [
      "react-component",
      "react-hook",
      "utility",
      "type-definition",
      "api-route",
      "service",
      "business-logic",
    ];

    return relevantTypes.includes(fileType);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private reportProgress(
    stage: AnalysisStage,
    currentFile: string,
    filesProcessed: number,
    totalFiles: number
  ): void {
    if (this.options.progressCallback) {
      const progress: AnalysisProgress = {
        currentFile,
        filesProcessed,
        totalFiles,
        stage,
        startTime: Date.now(),
        estimatedCompletion: this.estimateCompletion(
          filesProcessed,
          totalFiles
        ),
      };

      this.options.progressCallback(progress);
    }
  }

  private estimateCompletion(
    filesProcessed: number,
    totalFiles: number
  ): number | undefined {
    if (filesProcessed === 0 || this.stats.averageProcessingTime === 0) {
      return undefined;
    }

    const remainingFiles = totalFiles - filesProcessed;
    const estimatedRemainingTime =
      remainingFiles * this.stats.averageProcessingTime;

    return Date.now() + estimatedRemainingTime;
  }

  private handleFileError(
    filePath: string,
    stage: AnalysisStage,
    error: Error
  ): void {
    this.stats.errorsEncountered++;

    const analysisError: AnalysisError = {
      filePath,
      stage,
      error,
      severity: this.determineSeverity(error),
      recoverable: this.isRecoverableError(error),
    };

    if (this.options.errorCallback) {
      this.options.errorCallback(analysisError);
    }
  }

  private handleCriticalError(error: Error): void {
    const criticalError: AnalysisError = {
      filePath: "unknown",
      stage: "initialization",
      error,
      severity: "critical",
      recoverable: false,
    };

    if (this.options.errorCallback) {
      this.options.errorCallback(criticalError);
    }
  }

  private determineSeverity(error: Error): "warning" | "error" | "critical" {
    if (
      error.message.includes("ENOENT") ||
      error.message.includes("not found")
    ) {
      return "warning";
    }
    if (error.message.includes("syntax") || error.message.includes("parse")) {
      return "error";
    }
    return "error";
  }

  private isRecoverableError(error: Error): boolean {
    return (
      !error.message.includes("critical") &&
      !error.message.includes("fatal") &&
      !error.message.includes("out of memory")
    );
  }

  private isCachedAndValid(filePath: string): boolean {
    // Simple cache validation based on file existence
    return (
      this.cache.cachedSummaries.has(filePath) &&
      this.scanResult.fileContents.has(filePath)
    );
  }

  private cacheResult(filePath: string, summary: ContextualSummary): void {
    this.cache.cachedSummaries.set(filePath, summary);
    // In a real implementation, you might also cache the file hash
  }

  private updateProcessingStats(summary: ContextualSummary): void {
    this.stats.totalTokensGenerated += summary.prompt.tokens.approximate;
    this.stats.compressionRatio =
      (this.stats.compressionRatio * this.stats.filesAnalyzed +
        summary.prompt.tokens.compressionRatio) /
      (this.stats.filesAnalyzed + 1);
  }

  private generateMetadata(filePath: string): any {
    return {
      fileSize: this.scanResult.fileContents.get(filePath)?.length || 0,
      lastModified: new Date().toISOString(),
      projectContext: {
        name: path.basename(this.srcDir),
        framework: "React", // Could be detected
        architecture: "component-based",
      },
    };
  }

  private inferArchitectureType(summary: ContextualSummary): string {
    if (summary.fileType === "react-component") return "component-based";
    if (summary.fileType === "api-route") return "layered";
    if (summary.fileType === "service") return "service-oriented";
    return "modular";
  }

  private inferProjectType(
    summaries: ContextualSummary[]
  ): "spa" | "ssr" | "static" | "library" | "api" | "mixed" {
    const hasComponents = summaries.some(
      (s) => s.fileType === "react-component"
    );
    const hasApiRoutes = summaries.some((s) => s.fileType === "api-route");
    const hasPages = summaries.some((s) =>
      s.purpose.toLowerCase().includes("page")
    );

    if (hasComponents && hasApiRoutes) return "mixed";
    if (hasComponents && hasPages) return "spa";
    if (hasApiRoutes) return "api";
    if (hasComponents) return "library";
    return "static";
  }

  private inferProjectStructure(
    summaries: ContextualSummary[]
  ): "feature-based" | "layer-based" | "atomic" | "mixed" {
    const paths = summaries.map((s) => s.filePath);

    const hasFeatureFolders = paths.some(
      (p) => p.includes("/features/") || p.includes("/modules/")
    );

    const hasLayerFolders = paths.some(
      (p) =>
        p.includes("/components/") &&
        p.includes("/services/") &&
        p.includes("/utils/")
    );

    const hasAtomicStructure = paths.some(
      (p) =>
        p.includes("/atoms/") ||
        p.includes("/molecules/") ||
        p.includes("/organisms/")
    );

    if (hasFeatureFolders) return "feature-based";
    if (hasAtomicStructure) return "atomic";
    if (hasLayerFolders) return "layer-based";
    return "mixed";
  }

  private identifyModules(summaries: ContextualSummary[]): any[] {
    // Group files by directory
    const moduleGroups = summaries.reduce((groups, summary) => {
      const dir = path.dirname(summary.filePath);
      if (!groups[dir]) {
        groups[dir] = [];
      }
      groups[dir].push(summary);
      return groups;
    }, {} as { [key: string]: ContextualSummary[] });

    return Object.entries(moduleGroups)
      .filter(([_, files]) => files.length > 1) // Only modules with multiple files
      .map(([dir, files]) => ({
        name: path.basename(dir),
        purpose: this.inferModulePurpose(files),
        files: files.map((f) => f.filePath),
        dependencies: this.extractModuleDependencies(files),
      }));
  }

  private inferModulePurpose(files: ContextualSummary[]): string {
    const purposes = files.map((f) => f.purpose.toLowerCase());
    const commonWords = this.getCommonWords(purposes);
    return commonWords.join(" ") || "General module";
  }

  private extractModuleDependencies(files: ContextualSummary[]): string[] {
    const allDeps = files.flatMap((f) =>
      f.dependencies.external.map((dep) => dep.name)
    );
    return [...new Set(allDeps)].slice(0, 10); // Top 10 unique dependencies
  }

  private calculateRelationshipStrength(
    relationship: string
  ): "weak" | "medium" | "strong" {
    switch (relationship) {
      case "parent-child":
        return "strong";
      case "utility-consumer":
        return "medium";
      case "type-provider":
        return "medium";
      case "service-consumer":
        return "strong";
      default:
        return "weak";
    }
  }

  private deduplicateRelationships(
    relationships: FileRelationship[]
  ): FileRelationship[] {
    const seen = new Set<string>();
    return relationships.filter((rel) => {
      const key = `${rel.source}-${rel.target}-${rel.relationship}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateAverageComplexity(complexities: any[]): any {
    const scores = complexities.map((c) => {
      switch (c) {
        case "very-high":
          return 5;
        case "high":
          return 4;
        case "medium":
          return 3;
        case "low":
          return 2;
        default:
          return 1;
      }
    });

    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (avg >= 4.5) return "very-high";
    if (avg >= 3.5) return "high";
    if (avg >= 2.5) return "medium";
    return "low";
  }

  private getMostCommonValue<T>(values: T[]): T {
    const counts = values.reduce((acc, val) => {
      acc.set(val, (acc.get(val) || 0) + 1);
      return acc;
    }, new Map<T, number>());

    return [...counts.entries()].reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  private getTopValues<T>(values: T[], limit: number): T[] {
    const counts = values.reduce((acc, val) => {
      acc.set(val, (acc.get(val) || 0) + 1);
      return acc;
    }, new Map<T, number>());

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value]) => value);
  }

  private getCommonWords(texts: string[]): string[] {
    const wordCounts = new Map<string, number>();

    texts.forEach((text) => {
      const words = text
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3); // Filter short words

      words.forEach((word) => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    return [...wordCounts.entries()]
      .filter(([_, count]) => count > 1) // Only words that appear multiple times
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  private groupSummariesForTemplates(summaries: ContextualSummary[]): {
    [key: string]: ContextualSummary[];
  } {
    return summaries.reduce((groups, summary) => {
      const key = `${summary.fileType}-${summary.complexity}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(summary);
      return groups;
    }, {} as { [key: string]: ContextualSummary[] });
  }

  private extractCommonStructure(summaries: ContextualSummary[]): any {
    // Extract common structural elements from prompt structures
    const structures = summaries.map((s) => s.prompt.structure);

    const commonElements = {
      header: this.findCommonHeaderPattern(structures),
      keyPoints: this.findCommonKeyPointPatterns(structures),
      sections: this.findCommonSections(structures),
    };

    return commonElements;
  }

  private findCommonHeaderPattern(structures: any[]): string {
    const headers = structures.map((s) => s.header).filter((h) => h);
    if (headers.length === 0) return "";

    // Find common prefix/suffix patterns
    const words = headers.map((h) => h.split(" "));
    const commonStartWords = this.findCommonPrefix(words);
    const commonEndWords = this.findCommonSuffix(words);

    return [...commonStartWords, "...", ...commonEndWords].join(" ");
  }

  private findCommonKeyPointPatterns(structures: any[]): string[] {
    const allKeyPoints = structures.flatMap((s) => s.keyPoints || []);
    const patterns = this.extractPatterns(allKeyPoints);
    return patterns.slice(0, 5); // Top 5 patterns
  }

  private findCommonSections(structures: any[]): string[] {
    const allSections = structures.map((s) => Object.keys(s)).flat();
    return this.getTopValues(allSections, 8);
  }

  private findCommonPrefix(wordArrays: string[][]): string[] {
    if (wordArrays.length === 0) return [];

    const minLength = Math.min(...wordArrays.map((arr) => arr.length));
    const commonPrefix: string[] = [];

    for (let i = 0; i < minLength; i++) {
      const word = wordArrays[0][i];
      if (wordArrays.every((arr) => arr[i] === word)) {
        commonPrefix.push(word);
      } else {
        break;
      }
    }

    return commonPrefix;
  }

  private findCommonSuffix(wordArrays: string[][]): string[] {
    if (wordArrays.length === 0) return [];

    const reversedArrays = wordArrays.map((arr) => [...arr].reverse());
    const commonSuffix = this.findCommonPrefix(reversedArrays);
    return commonSuffix.reverse();
  }

  private extractPatterns(texts: string[]): string[] {
    // Simple pattern extraction based on common phrases
    const patterns: Set<string> = new Set();

    texts.forEach((text) => {
      // Extract patterns like "X complexity", "Exports X", etc.
      const complexityMatch = text.match(/(\w+)\s+complexity/);
      if (complexityMatch) patterns.add("{complexity} complexity");

      const exportsMatch = text.match(/Exports\s+(\d+)/);
      if (exportsMatch) patterns.add("Exports {count}");

      const usesMatch = text.match(/Uses\s+(\d+)/);
      if (usesMatch) patterns.add("Uses {count}");
    });

    return Array.from(patterns);
  }

  private identifyVariableFields(summaries: ContextualSummary[]): string[] {
    const variables: Set<string> = new Set();

    summaries.forEach((summary) => {
      variables.add("fileName");
      variables.add("purpose");
      variables.add("complexity");
      variables.add("fileType");

      if (summary.dependencies.external.length > 0) {
        variables.add("externalDependencies");
      }

      if (summary.businessLogic.operations.length > 0) {
        variables.add("businessOperations");
      }

      if (summary.technicalContext) {
        variables.add("technicalDetails");
      }
    });

    return Array.from(variables);
  }

  private buildTemplateString(
    commonStructure: any,
    variables: string[]
  ): string {
    const templateParts: string[] = [];

    // Header template
    if (commonStructure.header) {
      templateParts.push(commonStructure.header);
    }

    // Key points template
    if (commonStructure.keyPoints && commonStructure.keyPoints.length > 0) {
      templateParts.push("**Key Points:**");
      commonStructure.keyPoints.forEach((pattern: string) => {
        templateParts.push(`• ${pattern}`);
      });
    }

    // Dynamic sections based on variables
    if (variables.includes("businessOperations")) {
      templateParts.push("**Business Operations:** {businessOperations}");
    }

    if (variables.includes("technicalDetails")) {
      templateParts.push("**Technical Details:** {technicalDetails}");
    }

    if (variables.includes("externalDependencies")) {
      templateParts.push("**Dependencies:** {externalDependencies}");
    }

    return templateParts.join("\n\n");
  }

  private createEmptyResult(): ContextualSummariesAnalysisResult {
    return {
      summaries: [],
      projectContext: {
        architecture: {
          type: "static",
          structure: "flat",
          modules: [],
        },
        mainPatterns: [],
        technicalStack: [],
        complexity: "low",
      },
      relationships: [],
      statistics: {
        totalFiles: 0,
        averageComplexity: "low",
        tokenReduction: {
          originalTokens: 0,
          reducedTokens: 0,
          reductionPercentage: 0,
          averageCompressionRatio: 1,
        },
        patternDistribution: {},
      },
      promptTemplates: [],
    };
  }

  private getDefaultOptions(): AnalysisOptions {
    return {
      config: {
        maxPromptLength: 1000,
        includeCodeExamples: false,
        prioritizeBusinessLogic: true,
        includePerformanceNotes: true,
        templatePreference: "detailed",
        customPatterns: [],
      },
      parallelProcessing: true,
      maxConcurrency: 4,
      includeMetadata: true,
      generateRelationships: true,
      optimizePrompts: true,
    };
  }

  private initializeCache(): AnalysisCache {
    return {
      fileHashes: new Map(),
      cachedSummaries: new Map(),
      relationshipCache: new Map(),
      lastAnalysisTime: 0,
    };
  }

  private initializeStats(): ProcessingStats {
    return {
      filesAnalyzed: 0,
      errorsEncountered: 0,
      averageProcessingTime: 0,
      totalTokensGenerated: 0,
      compressionRatio: 1,
      qualityMetrics: {
        averagePromptQuality: 0,
        contextualRelevance: 0,
        informationDensity: 0,
        tokenEfficiency: 0,
      },
    };
  }

  /**
   * Public methods for advanced usage
   */

  /**
   * Generates a single contextual summary for a specific file
   */
  async analyzeSingleFile(
    filePath: string,
    options?: Partial<AnalysisOptions>
  ): Promise<ContextualSummary | null> {
    const mergedOptions = { ...this.options, ...options };
    this.options = mergedOptions;

    return this.analyzeFile(filePath, 0, 1);
  }

  /**
   * Regenerates summaries for files that have changed
   */
  async analyzeChangedFiles(
    changedFiles: string[],
    options?: Partial<AnalysisOptions>
  ): Promise<ContextualSummary[]> {
    const mergedOptions = { ...this.options, ...options };
    this.options = mergedOptions;

    const summaries: ContextualSummary[] = [];

    for (let i = 0; i < changedFiles.length; i++) {
      const summary = await this.analyzeFile(
        changedFiles[i],
        i,
        changedFiles.length
      );
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  /**
   * Updates project context after adding new files
   */
  updateProjectContext(
    existingSummaries: ContextualSummary[],
    newSummaries: ContextualSummary[]
  ): ProjectContext {
    const allSummaries = [...existingSummaries, ...newSummaries];
    return this.generateProjectContext(allSummaries);
  }

  /**
   * Generates specialized summaries for specific use cases
   */
  async generateSpecializedSummaries(
    filePaths: string[],
    personalization: PromptPersonalization,
    options?: Partial<AnalysisOptions>
  ): Promise<ContextualSummary[]> {
    const mergedOptions = { ...this.options, ...options };
    this.options = mergedOptions;

    const summaries: ContextualSummary[] = [];

    for (let i = 0; i < filePaths.length; i++) {
      const baseSummary = await this.analyzeFile(
        filePaths[i],
        i,
        filePaths.length
      );

      if (baseSummary) {
        // Generate adaptive prompt
        const adaptivePrompt = this.summaryBuilder.generateAdaptivePrompt(
          baseSummary,
          personalization
        );

        const specializedSummary: ContextualSummary = {
          ...baseSummary,
          prompt: adaptivePrompt,
        };

        summaries.push(specializedSummary);
      }
    }

    return summaries;
  }

  /**
   * Validates and optimizes existing summaries
   */
  optimizeSummaries(
    summaries: ContextualSummary[],
    constraints?: { maxTokens?: number; targetAudience?: string }
  ): ContextualSummary[] {
    return summaries.map((summary) => {
      let optimizedPrompt = summary.prompt;

      // Apply token constraints if specified
      if (
        constraints?.maxTokens &&
        summary.prompt.tokens.approximate > constraints.maxTokens
      ) {
        // Re-generate with constraints
        optimizedPrompt = this.summaryBuilder.generateAdaptivePrompt(
          summary,
          this.getPersonalizationForAudience(
            constraints.targetAudience || "ai-assistant"
          ),
          { maxTokens: constraints.maxTokens }
        );
      }

      return {
        ...summary,
        prompt: optimizedPrompt,
      };
    });
  }

  /**
   * Generates quality metrics for summaries
   */
  calculateQualityMetrics(summaries: ContextualSummary[]): QualityMetrics {
    if (summaries.length === 0) {
      return {
        averagePromptQuality: 0,
        contextualRelevance: 0,
        informationDensity: 0,
        tokenEfficiency: 0,
      };
    }

    // Calculate average prompt quality based on various factors
    const qualityScores = summaries.map((summary) => {
      let score = 0;

      // Completeness score (has all important sections)
      if (summary.prompt.structure.header) score += 20;
      if (summary.prompt.structure.keyPoints.length > 0) score += 20;
      if (summary.prompt.structure.dependencies) score += 15;
      if (summary.prompt.structure.exports) score += 15;
      if (summary.businessLogic.operations.length > 0) score += 15;
      if (summary.technicalContext) score += 15;

      return Math.min(100, score);
    });

    const averagePromptQuality =
      qualityScores.reduce((sum, score) => sum + score, 0) /
      qualityScores.length;

    // Calculate contextual relevance (how well the summary matches the file content)
    const relevanceScores = summaries.map((summary) => {
      const purposeRelevance = summary.purpose.length > 10 ? 100 : 50;
      const dependencyRelevance =
        summary.dependencies.external.length > 0 ? 100 : 80;
      const complexityRelevance = summary.complexity !== "low" ? 100 : 90;

      return (purposeRelevance + dependencyRelevance + complexityRelevance) / 3;
    });

    const contextualRelevance =
      relevanceScores.reduce((sum, score) => sum + score, 0) /
      relevanceScores.length;

    // Calculate information density (information per token)
    const densityScores = summaries.map((summary) => {
      const infoCount =
        summary.keyFeatures.length +
        summary.dependencies.external.length +
        summary.usagePatterns.length;

      const tokens = summary.prompt.tokens.approximate;
      return tokens > 0 ? (infoCount / tokens) * 1000 : 0; // Scale up for readability
    });

    const informationDensity =
      densityScores.reduce((sum, score) => sum + score, 0) /
      densityScores.length;

    // Calculate token efficiency (compression ratio quality)
    const efficiencyScores = summaries.map((summary) => {
      const compressionRatio = summary.prompt.tokens.compressionRatio;
      // Good compression is around 0.6-0.8, perfect efficiency would preserve info while compressing
      return compressionRatio > 0.3 && compressionRatio < 0.9 ? 100 : 70;
    });

    const tokenEfficiency =
      efficiencyScores.reduce((sum, score) => sum + score, 0) /
      efficiencyScores.length;

    return {
      averagePromptQuality,
      contextualRelevance,
      informationDensity,
      tokenEfficiency,
    };
  }

  /**
   * Exports summaries in various formats
   */
  exportSummaries(
    summaries: ContextualSummary[],
    format: "json" | "markdown" | "csv" | "xml"
  ): string {
    switch (format) {
      case "json":
        return JSON.stringify(summaries, null, 2);

      case "markdown":
        return this.exportToMarkdown(summaries);

      case "csv":
        return this.exportToCSV(summaries);

      case "xml":
        return this.exportToXML(summaries);

      default:
        return JSON.stringify(summaries, null, 2);
    }
  }

  private exportToMarkdown(summaries: ContextualSummary[]): string {
    const sections = summaries.map((summary) => {
      return `# ${summary.fileName}

**Purpose:** ${summary.purpose}
**Complexity:** ${summary.complexity}
**File Type:** ${summary.fileType}

## Key Features
${summary.keyFeatures.map((feature) => `- ${feature}`).join("\n")}

## Dependencies
**External:** ${summary.dependencies.external.map((dep) => dep.name).join(", ")}
**Internal:** ${summary.dependencies.internal.length} files

## Generated Summary
${summary.prompt.summary}

---
`;
    });

    return sections.join("\n");
  }

  private exportToCSV(summaries: ContextualSummary[]): string {
    const headers =
      "FilePath,FileName,Purpose,Complexity,FileType,KeyFeatures,ExternalDeps,TokenCount";
    const rows = summaries.map((summary) => {
      const keyFeatures = summary.keyFeatures.join(";");
      const externalDeps = summary.dependencies.external
        .map((dep) => dep.name)
        .join(";");

      return `"${summary.filePath}","${summary.fileName}","${summary.purpose}","${summary.complexity}","${summary.fileType}","${keyFeatures}","${externalDeps}",${summary.prompt.tokens.approximate}`;
    });

    return [headers, ...rows].join("\n");
  }

  private exportToXML(summaries: ContextualSummary[]): string {
    const xmlSummaries = summaries.map((summary) => {
      return `  <summary>
    <filePath>${this.escapeXml(summary.filePath)}</filePath>
    <fileName>${this.escapeXml(summary.fileName)}</fileName>
    <purpose>${this.escapeXml(summary.purpose)}</purpose>
    <complexity>${summary.complexity}</complexity>
    <fileType>${summary.fileType}</fileType>
    <keyFeatures>
      ${summary.keyFeatures
        .map((feature) => `<feature>${this.escapeXml(feature)}</feature>`)
        .join("\n      ")}
    </keyFeatures>
    <dependencies>
      <external>
        ${summary.dependencies.external
          .map(
            (dep) =>
              `<dependency name="${this.escapeXml(dep.name)}" purpose="${
                dep.purpose
              }" />`
          )
          .join("\n        ")}
      </external>
      <internal count="${summary.dependencies.internal.length}" />
    </dependencies>
    <tokens>
      <approximate>${summary.prompt.tokens.approximate}</approximate>
      <original>${summary.prompt.tokens.originalSize}</original>
      <compression>${summary.prompt.tokens.compressionRatio}</compression>
    </tokens>
    <generatedSummary>${this.escapeXml(
      summary.prompt.summary
    )}</generatedSummary>
  </summary>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<contextualSummaries>
${xmlSummaries.join("\n")}
</contextualSummaries>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private getPersonalizationForAudience(
    audience: string
  ): PromptPersonalization {
    const basePersonalization: PromptPersonalization = {
      targetAudience: "ai-assistant",
      experienceLevel: "intermediate",
      context: "general",
      domain: "fullstack",
    };

    switch (audience) {
      case "business-analyst":
        return {
          ...basePersonalization,
          targetAudience: "business-analyst",
          context: "documentation",
        };

      case "developer":
        return {
          ...basePersonalization,
          targetAudience: "developer",
          context: "code-review",
        };

      case "architect":
        return {
          ...basePersonalization,
          targetAudience: "architect",
          experienceLevel: "expert",
          context: "refactoring",
        };

      default:
        return basePersonalization;
    }
  }

  /**
   * Gets current analysis statistics
   */
  getAnalysisStatistics(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Clears the analysis cache
   */
  clearCache(): void {
    this.cache = this.initializeCache();
  }

  /**
   * Gets cached summaries count
   */
  getCacheSize(): number {
    return this.cache.cachedSummaries.size;
  }
}
