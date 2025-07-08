import {
  TranslationKey,
  TranslationFile,
} from "../../../types/translation.types";

/**
 * Analyzer that evaluates translation coverage across files
 */
export class CoverageAnalyzer {
  /**
   * Analyzes coverage of translation files (unused and missing keys)
   * @param translationKeys Keys found in code
   * @param translationFiles Translation files to analyze
   * @returns Coverage analysis for each file
   */
  analyzeTranslationFilesCoverage(
    translationKeys: TranslationKey[],
    translationFiles: TranslationFile[]
  ): {
    filePath: string;
    totalKeys: number;
    unusedKeys: string[];
    missingKeys: string[];
  }[] {
    if (translationFiles.length === 0) return [];

    const result: {
      filePath: string;
      totalKeys: number;
      unusedKeys: string[];
      missingKeys: string[];
    }[] = [];

    // Get all translation keys used in code
    const usedKeys = new Set(translationKeys.map((k) => k.fullKey));

    for (const file of translationFiles) {
      const allKeys: string[] = [];
      this.extractKeysFromTranslations(file.content, "", allKeys);

      const unusedKeys = allKeys.filter((key) => !usedKeys.has(key));
      const missingKeys = Array.from(usedKeys).filter(
        (key) => !this.translationExistsInObject(key, file.content)
      );

      result.push({
        filePath: file.path,
        totalKeys: allKeys.length,
        unusedKeys,
        missingKeys,
      });
    }

    return result;
  }

  /**
   * Extracts all keys from a translation object
   * @param obj Translation object
   * @param prefix Current key prefix
   * @param result Array to populate with keys
   */
  private extractKeysFromTranslations(
    obj: Record<string, any>,
    prefix: string,
    result: string[]
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "object" && value !== null) {
        this.extractKeysFromTranslations(value, fullKey, result);
      } else if (typeof value === "string") {
        result.push(fullKey);
      }
    }
  }

  /**
   * Checks if a translation key exists in the translation object
   * @param fullKey Full dot-notation key
   * @param translations Translation object
   * @returns Boolean indicating if the key exists
   */
  private translationExistsInObject(
    fullKey: string,
    translations: Record<string, any>
  ): boolean {
    const parts = fullKey.split(".");
    let current = translations;

    for (const part of parts) {
      if (!current || typeof current !== "object" || !(part in current)) {
        return false;
      }
      current = current[part];
    }

    return typeof current === "string";
  }

  /**
   * Calculates overall coverage statistics
   * @param coverageResults Coverage results for each file
   * @returns Coverage statistics
   */
  calculateCoverageStatistics(
    coverageResults: {
      filePath: string;
      totalKeys: number;
      unusedKeys: string[];
      missingKeys: string[];
    }[]
  ): {
    totalKeys: number;
    totalUnusedKeys: number;
    totalMissingKeys: number;
    coveragePercentage: number;
  } {
    let totalKeys = 0;
    let totalUnusedKeys = 0;
    let totalMissingKeys = 0;

    for (const result of coverageResults) {
      totalKeys += result.totalKeys;
      totalUnusedKeys += result.unusedKeys.length;
      totalMissingKeys += result.missingKeys.length;
    }

    // Calculate coverage percentage
    const usedKeys = totalKeys - totalUnusedKeys;
    const coveragePercentage =
      totalKeys > 0 ? Math.round((usedKeys / totalKeys) * 100) : 0;

    return {
      totalKeys,
      totalUnusedKeys,
      totalMissingKeys,
      coveragePercentage,
    };
  }

  /**
   * Analyzes key distribution across translation files
   * @param translationFiles Translation files to analyze
   * @returns Analysis of key distribution
   */
  analyzeKeyDistribution(translationFiles: TranslationFile[]): {
    averageKeysPerFile: number;
    filesBySize: {
      filePath: string;
      keyCount: number;
    }[];
    keysDistribution: {
      range: string;
      count: number;
    }[];
  } {
    if (translationFiles.length === 0) {
      return {
        averageKeysPerFile: 0,
        filesBySize: [],
        keysDistribution: [],
      };
    }

    // Calculate sizes
    const fileSizes = translationFiles.map((file) => ({
      filePath: file.path,
      keyCount: file.size,
    }));

    // Sort by size
    const filesBySize = [...fileSizes].sort((a, b) => b.keyCount - a.keyCount);

    // Calculate average
    const totalKeys = fileSizes.reduce((sum, file) => sum + file.keyCount, 0);
    const averageKeysPerFile = totalKeys / fileSizes.length;

    // Calculate distribution
    const ranges = [
      { min: 0, max: 10, label: "0-10" },
      { min: 11, max: 50, label: "11-50" },
      { min: 51, max: 100, label: "51-100" },
      { min: 101, max: 500, label: "101-500" },
      { min: 501, max: Infinity, label: "500+" },
    ];

    const keysDistribution = ranges
      .map((range) => {
        const count = fileSizes.filter(
          (file) => file.keyCount >= range.min && file.keyCount <= range.max
        ).length;

        return {
          range: range.label,
          count,
        };
      })
      .filter((item) => item.count > 0);

    return {
      averageKeysPerFile,
      filesBySize,
      keysDistribution,
    };
  }
}
