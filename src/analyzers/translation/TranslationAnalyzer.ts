import ts from "typescript";
import _ from "lodash";
import {
  TranslationAnalysisResult,
  TranslationKey,
} from "../../types/translation.types";
import { TranslationFileFinder } from "./finders/translationFileFinder";
import { TranslationKeyFinder } from "./finders/translationKeyFinder";
import { MissingTranslationAnalyzer } from "./analyzers/missingTranslationAnalyzer";
import { DuplicateTranslationAnalyzer } from "./analyzers/duplicateTranslationAnalyzer";
import { CoverageAnalyzer } from "./analyzers/coverageAnalyzer";

// Library detection
import { LibraryDetector, TranslationLibrary } from "./utils/libraryDetector";

// React-i18next specific analyzers
import { ReactI18nextAnalyzer } from "./reacti18next/ReactI18nextAnalyzer";

/**
 * Analyzer for detecting translation issues in a React project
 * Supports both next-intl and react-i18next libraries
 */
export class TranslationAnalyzer {
  private sourceFiles: Map<string, ts.SourceFile>;
  private projectPath: string;

  // Library detection
  private libraryDetector: LibraryDetector;

  // Next-intl specific analyzers (original implementation)
  private translationFileFinder: TranslationFileFinder;
  private translationKeyFinder: TranslationKeyFinder;
  private missingTranslationAnalyzer: MissingTranslationAnalyzer;
  private duplicateTranslationAnalyzer: DuplicateTranslationAnalyzer;
  private coverageAnalyzer: CoverageAnalyzer;

  /**
   * Constructor for the translation analyzer
   * @param projectPath Path to the project root
   * @param sourceFiles Map of source files to analyze
   */
  constructor(projectPath: string, sourceFiles: Map<string, ts.SourceFile>) {
    this.projectPath = projectPath;
    this.sourceFiles = sourceFiles;

    // Initialize library detector
    this.libraryDetector = new LibraryDetector();

    // Create context object for next-intl file finder (only component that needs it)
    const context = {
      projectPath,
      debugMode: false,
      log: () => {}, // No-op logger
      translationHooks: new Map(),
    };

    // Initialize next-intl analyzers
    this.translationFileFinder = new TranslationFileFinder(context);
    this.translationKeyFinder = new TranslationKeyFinder();
    this.missingTranslationAnalyzer = new MissingTranslationAnalyzer();
    this.duplicateTranslationAnalyzer = new DuplicateTranslationAnalyzer();
    this.coverageAnalyzer = new CoverageAnalyzer();
  }

  /**
   * Main analysis method with library detection and routing
   * @returns Promise that resolves to analysis results
   */
  async analyze(): Promise<TranslationAnalysisResult> {
    // Step 1: Detect which translation library is being used
    const libraryDetection = this.libraryDetector.detectTranslationLibrary(
      this.sourceFiles
    );

    // Step 2: Route to appropriate analyzer based on detected library
    switch (libraryDetection.library) {
      case TranslationLibrary.NEXT_INTL:
        return this.analyzeNextIntl();

      case TranslationLibrary.REACT_I18NEXT:
        return this.analyzeReactI18next();

      case TranslationLibrary.UNKNOWN:
      default:
        // Fallback to next-intl analysis if library is unknown
        // This maintains backward compatibility
        return this.analyzeNextIntl();
    }
  }

  /**
   * Analyzes projects using next-intl (original implementation)
   * @returns Promise that resolves to analysis results
   */
  private async analyzeNextIntl(): Promise<TranslationAnalysisResult> {
    // Step 1: Find translation files
    await this.translationFileFinder.findAllTranslationFiles();
    const translationFiles = this.translationFileFinder.getTranslationFiles();
    const mainTranslationFile =
      this.translationFileFinder.getMainTranslationFile();

    // Step 2: Find translation keys in code
    await this.translationKeyFinder.findAllTranslationKeys(this.sourceFiles);
    const translationKeys = this.translationKeyFinder.getTranslationKeys();

    // Step 3: Analyze missing translations
    const missingTranslations =
      this.missingTranslationAnalyzer.detectMissingTranslations(
        translationKeys,
        translationFiles
      );

    // Step 4: Analyze duplicate translations
    const duplicateTranslations = mainTranslationFile
      ? this.duplicateTranslationAnalyzer.detectDuplicateTranslations(
          translationKeys,
          mainTranslationFile
        )
      : [];

    // Step 5: Analyze translation file coverage
    const translationFilesCoverage =
      this.coverageAnalyzer.analyzeTranslationFilesCoverage(
        translationKeys,
        translationFiles
      );

    // Step 6: Generate statistics
    const statistics = this.generateNextIntlStatistics(
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
   * Analyzes projects using react-i18next
   * @returns Promise that resolves to analysis results
   */
  private async analyzeReactI18next(): Promise<TranslationAnalysisResult> {
    // Create and use react-i18next specific analyzer
    const reactI18nextAnalyzer = new ReactI18nextAnalyzer(
      this.projectPath,
      this.sourceFiles
    );

    return reactI18nextAnalyzer.analyze();
  }

  /**
   * Generate statistics for next-intl projects (original implementation)
   */
  private generateNextIntlStatistics(
    translationKeys: TranslationKey[],
    missingTranslations: any[],
    duplicateTranslations: any[]
  ): TranslationAnalysisResult["statistics"] {
    // Group missing translations by file
    const filesMissingCount = _.groupBy(
      missingTranslations,
      (translation) => translation.key.filePath
    );

    const filesWithMostMissingTranslations = Object.entries(filesMissingCount)
      .map(([filePath, translations]) => ({
        filePath,
        count: translations.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 files

    return {
      totalTranslationKeysUsed: translationKeys.length,
      totalMissingTranslations: missingTranslations.length,
      totalDuplicateValues: duplicateTranslations.length,
      filesWithMostMissingTranslations,
    };
  }

  /**
   * Gets information about the detected translation library
   * @returns Library detection result
   */
  getLibraryDetectionInfo(): {
    library: TranslationLibrary;
    confidence: number;
    evidence: {
      imports: string[];
      hooks: string[];
      patterns: string[];
    };
  } {
    return this.libraryDetector.detectTranslationLibrary(this.sourceFiles);
  }

  /**
   * Forces analysis using a specific library (for testing or edge cases)
   * @param library Library to use for analysis
   * @returns Promise that resolves to analysis results
   */
  async analyzeWithLibrary(
    library: TranslationLibrary
  ): Promise<TranslationAnalysisResult> {
    switch (library) {
      case TranslationLibrary.NEXT_INTL:
        return this.analyzeNextIntl();

      case TranslationLibrary.REACT_I18NEXT:
        return this.analyzeReactI18next();

      default:
        throw new Error(`Unsupported translation library: ${library}`);
    }
  }

  /**
   * Gets detailed analysis information based on detected library
   * @returns Library-specific analysis information
   */
  async getDetailedAnalysisInfo(): Promise<{
    library: TranslationLibrary;
    confidence: number;
    librarySpecificInfo?: any;
  }> {
    const detection = this.getLibraryDetectionInfo();

    let librarySpecificInfo: any = undefined;

    if (detection.library === TranslationLibrary.REACT_I18NEXT) {
      // Get react-i18next specific information
      const reactI18nextAnalyzer = new ReactI18nextAnalyzer(
        this.projectPath,
        this.sourceFiles
      );

      // Run a minimal analysis to get setup info
      await reactI18nextAnalyzer.analyze();
      librarySpecificInfo = reactI18nextAnalyzer.getReactI18nextInfo();
    } else if (detection.library === TranslationLibrary.NEXT_INTL) {
      // Get next-intl specific information
      await this.translationFileFinder.findAllTranslationFiles();
      await this.translationKeyFinder.findAllTranslationKeys(this.sourceFiles);

      librarySpecificInfo = {
        translationFiles:
          this.translationFileFinder.getTranslationFiles().length,
        mainFile: this.translationFileFinder.getMainTranslationFile()?.path,
        keyStatistics: {
          totalKeys: this.translationKeyFinder.getTranslationKeys().length,
          filesWithKeys: this.translationKeyFinder.groupKeysByFile().size,
          componentsWithKeys:
            this.translationKeyFinder.groupKeysByComponent().size,
        },
      };
    }

    return {
      library: detection.library,
      confidence: detection.confidence,
      librarySpecificInfo,
    };
  }
}
