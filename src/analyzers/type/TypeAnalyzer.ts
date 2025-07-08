import ts from "typescript";
import { ScanResult, TypeAnalysisResult } from "../../types";
import { TypeAnalysisOptions, SimilarTypesGroup } from "./types/internalTypes";
import { TypeCollector } from "./analyzers/typeCollector";
import { ComponentTypeAnalyzer } from "./analyzers/componentTypeAnalyzer";
import { ComplexTypeAnalyzer } from "./analyzers/complexTypeAnalyzer";
import { TypeUsageAnalyzer } from "./analyzers/typeUsageAnalyzer";
import { DuplicateTypeAnalyzer } from "./analyzers/duplicateTypeAnalyzer";
import { TypeStatisticsAnalyzer } from "./analyzers/typeStatisticsAnalyzer";
import { TypeSimilarityUtils } from "./utils/typeSimilarityUtils";
import { UnifiedTypeGenerator } from "./generators/unifiedTypeGenerator";

/**
 * Main analyzer for TypeScript types in a project
 */
export class TypeAnalyzer {
  private scanResult: ScanResult;
  private typeChecker: ts.TypeChecker;
  private options: TypeAnalysisOptions;

  constructor(
    scanResult: ScanResult,
    typeChecker: ts.TypeChecker,
    options: TypeAnalysisOptions = {}
  ) {
    this.scanResult = scanResult;
    this.typeChecker = typeChecker;
    this.options = {
      analyzeDuplicates: true,
      analyzeComplexTypes: true,
      analyzeComponentProps: true,
      analyzeUsage: true,
      generateUnifiedTypes: true,
      maxFilesToAnalyze: 1000,
      maxTypesToAnalyze: 5000,
      batchSize: 50,
      maxReportedIssues: 100,
      maxDuplicateSuggestions: 20,
      maxUnifiedTypeSuggestions: 10,
      ...options,
    };
  }

  /**
   * Run the type analysis
   */
  async analyze(): Promise<TypeAnalysisResult> {
    // Initialize the result
    const result: TypeAnalysisResult = {
      interfacesCount: 0,
      typesCount: 0,
      componentsWithPropTypes: [],
      componentsWithoutPropTypes: [],
      regularFunctionsWithoutReturnType: 0,
      suggestedImprovements: [],
      anyUsageCount: 0,
      broadUnionTypesCount: 0,
      complexTypes: [],
      typeSimplificationSuggestions: [],
      duplicatedTypes: [],
      unifiedTypesSuggestions: [],
      typesByDirectory: {},
      typesWithoutNamespace: [],
    };

    // Step 1: Collect all types
    const typeCollector = new TypeCollector(this.scanResult);
    const typeData = await typeCollector.collectAllTypes();
    const { typeRegistry, signatureToTypes, typesByDirectory } = typeData;

    // Step 2: Analyze component types and props
    if (this.options.analyzeComponentProps) {
      const componentAnalyzer = new ComponentTypeAnalyzer(this.scanResult);
      const componentAnalysis = await componentAnalyzer.analyzeComponentTypes();

      result.componentsWithPropTypes =
        componentAnalysis.componentsWithPropTypes || [];
      result.componentsWithoutPropTypes =
        componentAnalysis.componentsWithoutPropTypes || [];
      result.regularFunctionsWithoutReturnType =
        componentAnalysis.regularFunctionsWithoutReturnType || 0;
      result.suggestedImprovements.push(
        ...(componentAnalysis.suggestedImprovements || [])
      );
    }

    // Step 3: Analyze type usage
    if (this.options.analyzeUsage) {
      const typeUsageAnalyzer = new TypeUsageAnalyzer(
        this.scanResult,
        typeRegistry
      );
      const relevantFiles = Array.from(
        this.scanResult.sourceFiles.keys()
      ).slice(0, this.options.maxFilesToAnalyze);

      const usageResult = await typeUsageAnalyzer.analyzeTypeUsages(
        relevantFiles
      );
      const typesWithoutNamespace =
        typeUsageAnalyzer.identifyTypesWithoutNamespace();

      result.anyUsageCount = usageResult.anyUsageCount;
      result.suggestedImprovements.push(...usageResult.suggestedImprovements);
      result.typesWithoutNamespace = typesWithoutNamespace;
    }

    // Step 4: Analyze duplicate types
    if (this.options.analyzeDuplicates) {
      const duplicateAnalyzer = new DuplicateTypeAnalyzer(
        typeRegistry,
        signatureToTypes
      );
      result.duplicatedTypes = duplicateAnalyzer.detectTypeDuplications(
        this.options.maxDuplicateSuggestions
      );
    }

    // Step 5: Generate unified type suggestions
    if (this.options.generateUnifiedTypes) {
      // Get the most frequently used types
      const typeCandidates = Array.from(typeRegistry.values())
        .filter(
          (t: any) =>
            t.usages.size > 1 ||
            t.name.includes("Props") ||
            t.name.includes("State")
        )
        .slice(0, 100);

      // Find similar types and generate groups
      const similarTypesGroups: SimilarTypesGroup[] =
        TypeSimilarityUtils.groupSimilarTypes(typeCandidates).map(
          (group: any) => ({
            types: group.types,
            similarityScore: group.similarity,
          })
        );

      // Generate unified type suggestions
      result.unifiedTypesSuggestions =
        UnifiedTypeGenerator.generateAllUnifiedTypes(
          similarTypesGroups,
          this.options.maxUnifiedTypeSuggestions
        );
    }

    // Step 6: Analyze complex types
    if (this.options.analyzeComplexTypes) {
      const complexResults = await this.analyzeComplexTypes();
      result.complexTypes = complexResults.complexTypes;
      result.typeSimplificationSuggestions =
        complexResults.typeSimplificationSuggestions;
      result.broadUnionTypesCount = complexResults.broadUnionTypesCount;
    }

    // Step 7: Calculate type statistics
    const typeStatisticsAnalyzer = new TypeStatisticsAnalyzer(typesByDirectory);
    const statistics = typeStatisticsAnalyzer.calculateTypeStatistics();

    result.interfacesCount = statistics.interfacesCount;
    result.typesCount = statistics.typesCount;
    result.typesByDirectory = typesByDirectory;

    return result;
  }

  /**
   * Analyze complex types
   */
  private async analyzeComplexTypes(): Promise<{
    complexTypes: any[];
    typeSimplificationSuggestions: any[];
    broadUnionTypesCount: number;
  }> {
    const complexTypeAnalyzer = new ComplexTypeAnalyzer(
      this.options.maxReportedIssues || 100
    );
    const filePaths = Array.from(this.scanResult.sourceFiles.keys());
    const batchSize = this.options.batchSize || 50;

    // Process files in batches
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (filePath) => {
          const sourceFile = this.scanResult.sourceFiles.get(filePath);
          if (sourceFile) {
            this.visitNodesForComplexTypes(
              sourceFile,
              filePath,
              complexTypeAnalyzer
            );
          }
        })
      );
    }

    return complexTypeAnalyzer.getResults();
  }

  /**
   * Visit nodes to find and analyze complex types
   */
  private visitNodesForComplexTypes(
    sourceFile: ts.SourceFile,
    filePath: string,
    complexTypeAnalyzer: ComplexTypeAnalyzer,
    context: string = ""
  ): void {
    const visit = (node: ts.Node, currentContext: string = ""): void => {
      // Process potential complex types
      if (ts.isTypeNode(node)) {
        complexTypeAnalyzer.analyzeComplexType(node, filePath, currentContext);
      }

      // Extract context for better reporting
      let newContext = currentContext;

      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        newContext = node.name.text;
      } else if (ts.isPropertySignature(node) && ts.isIdentifier(node.name)) {
        newContext = currentContext
          ? `${currentContext}.${node.name.text}`
          : node.name.text;
      } else if (ts.isMethodSignature(node) && ts.isIdentifier(node.name)) {
        newContext = currentContext
          ? `${currentContext}.${node.name.text}()`
          : `${node.name.text}()`;
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        newContext = `${node.name.text}()`;
      } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
        newContext = currentContext
          ? `${currentContext}(${node.name.text})`
          : `param:${node.name.text}`;
      }

      // Only visit certain node types to save time
      if (
        ts.isTypeNode(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isMethodSignature(node) ||
        ts.isPropertySignature(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isSourceFile(node)
      ) {
        ts.forEachChild(node, (child) => visit(child, newContext));
      }
    };

    visit(sourceFile, context);
  }
}
