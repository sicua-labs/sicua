import ts from "typescript";
import {
  TranslationAnalysisResult,
  TranslationKey,
} from "../../../types/translation.types";
import { ReactI18nextFileFinder } from "./fileFinder";
import { ReactI18nextKeyFinder } from "./keyFinder";
import { MissingTranslationAnalyzer } from "../analyzers/missingTranslationAnalyzer";
import { DuplicateTranslationAnalyzer } from "../analyzers/duplicateTranslationAnalyzer";
import { CoverageAnalyzer } from "../analyzers/coverageAnalyzer";
import { TranslationFileContext } from "../types/translation.additional";

/**
 * Analyzer for detecting react-i18next translation issues in a React project
 */
export class ReactI18nextAnalyzer {
  private sourceFiles: Map<string, ts.SourceFile>;
  private context: TranslationFileContext;

  // Component analyzers
  private fileFinder: ReactI18nextFileFinder;
  private keyFinder: ReactI18nextKeyFinder;
  private missingTranslationAnalyzer: MissingTranslationAnalyzer;
  private duplicateTranslationAnalyzer: DuplicateTranslationAnalyzer;
  private coverageAnalyzer: CoverageAnalyzer;

  /**
   * Constructor for the react-i18next analyzer
   * @param projectPath Path to the project root
   * @param sourceFiles Map of source files to analyze
   */
  constructor(projectPath: string, sourceFiles: Map<string, ts.SourceFile>) {
    this.sourceFiles = sourceFiles;

    // Create context object
    this.context = {
      projectPath,
      debugMode: false,
      log: () => {}, // No-op logger
    };

    // Initialize analyzers
    this.fileFinder = new ReactI18nextFileFinder(this.context);
    this.keyFinder = new ReactI18nextKeyFinder();
    this.missingTranslationAnalyzer = new MissingTranslationAnalyzer();
    this.duplicateTranslationAnalyzer = new DuplicateTranslationAnalyzer();
    this.coverageAnalyzer = new CoverageAnalyzer();
  }

  /**
   * Main analysis method for react-i18next
   * @returns Promise that resolves to analysis results
   */
  async analyze(): Promise<TranslationAnalysisResult> {
    // Step 1: Find react-i18next translation files
    await this.fileFinder.findAllTranslationFiles();
    const translationFiles = this.fileFinder.getTranslationFiles();
    const mainTranslationFile = this.fileFinder.getMainTranslationFile();

    // Step 2: Find react-i18next translation keys in code
    await this.keyFinder.findAllTranslationKeys(this.sourceFiles);
    const translationKeys = this.keyFinder.getTranslationKeys();

    // Step 3: Analyze missing translations
    const missingTranslations =
      this.missingTranslationAnalyzer.detectMissingTranslations(
        translationKeys,
        translationFiles
      );

    // Step 4: Analyze duplicate translations (per namespace)
    const duplicateTranslations = await this.analyzeDuplicateTranslations(
      translationKeys,
      translationFiles
    );

    // Step 5: Analyze translation file coverage
    const translationFilesCoverage =
      this.coverageAnalyzer.analyzeTranslationFilesCoverage(
        translationKeys,
        translationFiles
      );

    // Step 6: Generate react-i18next specific statistics
    const statistics = this.generateReactI18nextStatistics(
      translationKeys,
      missingTranslations,
      duplicateTranslations
    );

    return {
      missingTranslations,
      duplicateTranslations,
      translationFilesCoverage,
      statistics,
    };
  }

  /**
   * Analyzes duplicate translations across react-i18next namespaces
   * @param translationKeys Translation keys found in code
   * @param translationFiles Translation files to analyze
   * @returns Array of duplicate translations
   */
  private async analyzeDuplicateTranslations(
    translationKeys: TranslationKey[],
    translationFiles: any[]
  ): Promise<any[]> {
    const allDuplicates: any[] = [];

    // Analyze duplicates per namespace/file
    for (const file of translationFiles) {
      const duplicatesInFile =
        this.duplicateTranslationAnalyzer.detectDuplicateTranslations(
          translationKeys,
          file
        );
      allDuplicates.push(...duplicatesInFile);
    }

    // Additional react-i18next specific duplicate analysis
    const crossNamespaceDuplicates =
      this.findCrossNamespaceDuplicates(translationFiles);
    allDuplicates.push(...crossNamespaceDuplicates);

    return allDuplicates;
  }

  /**
   * Finds duplicate translations across different namespaces
   * @param translationFiles Translation files to analyze
   * @returns Array of cross-namespace duplicates
   */
  private findCrossNamespaceDuplicates(translationFiles: any[]): any[] {
    const crossNamespaceDuplicates: any[] = [];
    const namespaceFiles = this.fileFinder.getNamespaceFiles();

    // Group all translation values across namespaces
    const valueToNamespaceMap = new Map<
      string,
      Array<{ namespace: string; key: string; filePath: string }>
    >();

    for (const [namespace, files] of namespaceFiles.entries()) {
      for (const file of files) {
        this.flattenTranslationsWithNamespace(
          file.content,
          "",
          namespace,
          file.path,
          valueToNamespaceMap
        );
      }
    }

    // Find values that appear in multiple namespaces
    for (const [value, occurrences] of valueToNamespaceMap.entries()) {
      if (
        occurrences.length > 1 &&
        this.isSignificantTextForDuplication(value)
      ) {
        const uniqueNamespaces = new Set(
          occurrences.map((occ) => occ.namespace)
        );

        if (uniqueNamespaces.size > 1) {
          crossNamespaceDuplicates.push({
            value,
            keys: occurrences.map((occ) => ({
              fullKey: `${occ.namespace}.${occ.key}`,
              filePath: occ.filePath,
            })),
            usages: [], // Would need to cross-reference with translation keys
            type: "cross-namespace",
          });
        }
      }
    }

    return crossNamespaceDuplicates;
  }

  /**
   * Flattens translations with namespace information
   * @param obj Translation object
   * @param prefix Current key prefix
   * @param namespace Namespace name
   * @param filePath File path
   * @param valueMap Map to populate with values and their locations
   */
  private flattenTranslationsWithNamespace(
    obj: Record<string, any>,
    prefix: string,
    namespace: string,
    filePath: string,
    valueMap: Map<
      string,
      Array<{ namespace: string; key: string; filePath: string }>
    >
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "object" && value !== null) {
        this.flattenTranslationsWithNamespace(
          value,
          fullKey,
          namespace,
          filePath,
          valueMap
        );
      } else if (typeof value === "string") {
        const existing = valueMap.get(value) || [];
        existing.push({ namespace, key: fullKey, filePath });
        valueMap.set(value, existing);
      }
    }
  }

  /**
   * Checks if text is significant enough to warn about duplication
   * @param value The text value to check
   * @returns Boolean indicating if the text is significant
   */
  private isSignificantTextForDuplication(value: string): boolean {
    // Ignore very short strings
    if (value.length < 5) return false;

    // Ignore common short words/values
    const lowered = value.toLowerCase();
    if (
      [
        "yes",
        "no",
        "true",
        "false",
        "ok",
        "cancel",
        "save",
        "edit",
        "delete",
      ].includes(lowered)
    )
      return false;

    // Ignore strings that are just numbers
    if (/^\d+$/.test(value)) return false;

    // Ignore react-i18next interpolation-only strings
    if (/^\{\{[^}]+\}\}$/.test(value)) return false;

    return true;
  }

  /**
   * Generate react-i18next specific statistics
   * @param translationKeys Translation keys found
   * @param missingTranslations Missing translations
   * @param duplicateTranslations Duplicate translations
   * @returns Statistics object
   */
  private generateReactI18nextStatistics(
    translationKeys: TranslationKey[],
    missingTranslations: any[],
    duplicateTranslations: any[]
  ): TranslationAnalysisResult["statistics"] & {
    namespacesUsed: number;
    keysPerNamespace: Record<string, number>;
    crossNamespaceDuplicates: number;
    interpolationUsage: number;
    pluralizationUsage: number;
  } {
    // Get basic usage statistics
    const usageStats = this.keyFinder.getUsageStatistics();

    // Calculate namespace-specific statistics
    const keysByNamespace = this.keyFinder.groupKeysByNamespace();
    const keysPerNamespace: Record<string, number> = {};

    for (const [namespace, keys] of keysByNamespace.entries()) {
      keysPerNamespace[namespace] = keys.length;
    }

    // Count cross-namespace duplicates
    const crossNamespaceDuplicates = duplicateTranslations.filter(
      (dup) => dup.type === "cross-namespace"
    ).length;

    // Analyze react-i18next specific features
    const interpolationUsage = this.countInterpolationUsage(translationKeys);
    const pluralizationUsage = this.countPluralizationUsage();

    // Group missing translations by file (from base statistics)
    const filesMissingCount: Record<string, any[]> = {};
    for (const translation of missingTranslations) {
      const filePath = translation.key.filePath;
      if (!filesMissingCount[filePath]) {
        filesMissingCount[filePath] = [];
      }
      filesMissingCount[filePath].push(translation);
    }

    const filesWithMostMissingTranslations = Object.entries(filesMissingCount)
      .map(([filePath, translations]) => ({
        filePath,
        count: translations.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalTranslationKeysUsed: usageStats.totalKeys,
      totalMissingTranslations: missingTranslations.length,
      totalDuplicateValues: duplicateTranslations.length,
      filesWithMostMissingTranslations,
      namespacesUsed: usageStats.namespacesUsed,
      keysPerNamespace,
      crossNamespaceDuplicates,
      interpolationUsage,
      pluralizationUsage,
    };
  }

  /**
   * Counts usage of interpolation in translation keys
   * @param translationKeys Translation keys to analyze
   * @returns Number of keys using interpolation
   */
  private countInterpolationUsage(translationKeys: TranslationKey[]): number {
    // This would require analyzing the actual usage context or translation values
    // For now, return 0 as placeholder - could be enhanced to detect interpolation patterns
    return 0;
  }

  /**
   * Counts usage of pluralization in translation files
   * @returns Number of plural keys found
   */
  private countPluralizationUsage(): number {
    const translationFiles = this.fileFinder.getTranslationFiles();
    let pluralCount = 0;

    for (const file of translationFiles) {
      const analysis = this.fileFinder.analyzeReactI18nextFile(file);
      if (analysis.hasPlurals) {
        pluralCount += this.countPluralKeys(file.content);
      }
    }

    return pluralCount;
  }

  /**
   * Counts plural keys in a translation object
   * @param obj Translation object
   * @returns Number of plural keys
   */
  private countPluralKeys(obj: Record<string, any>): number {
    let count = 0;

    const countInObject = (object: Record<string, any>): void => {
      for (const [key, value] of Object.entries(object)) {
        // Check for react-i18next plural suffixes
        if (
          key.endsWith("_zero") ||
          key.endsWith("_one") ||
          key.endsWith("_two") ||
          key.endsWith("_few") ||
          key.endsWith("_many") ||
          key.endsWith("_other")
        ) {
          count++;
        }

        if (typeof value === "object" && value !== null) {
          countInObject(value);
        }
      }
    };

    countInObject(obj);
    return count;
  }

  /**
   * Gets react-i18next specific analysis information
   * @returns React-i18next setup information
   */
  getReactI18nextInfo(): {
    setup: ReturnType<ReactI18nextFileFinder["detectReactI18nextSetup"]>;
    keyStatistics: ReturnType<ReactI18nextKeyFinder["getUsageStatistics"]>;
    namespaceAnalysis: {
      componentName: string;
      namespaces: string[];
      keyCount: number;
    }[];
  } {
    const setup = this.fileFinder.detectReactI18nextSetup();
    const keyStatistics = this.keyFinder.getUsageStatistics();
    const namespaceAnalysis =
      this.keyFinder.findComponentsWithMultipleNamespaces();

    return {
      setup,
      keyStatistics,
      namespaceAnalysis,
    };
  }
}
