import {
  TranslationKey,
  DuplicateTranslation,
  TranslationFile,
} from "../../../types/translation.types";

/**
 * Analyzer that detects duplicate translation values across different keys
 */
export class DuplicateTranslationAnalyzer {
  /**
   * Detects duplicate translations by analyzing translation files
   * @param translationKeys Keys found in code
   * @param translationFile Translation file to analyze
   * @returns Array of duplicate translations
   */
  detectDuplicateTranslations(
    translationKeys: TranslationKey[],
    translationFile: TranslationFile
  ): DuplicateTranslation[] {
    const valueToKeysMap = new Map<
      string,
      { fullKey: string; filePath: string }[]
    >();

    // Flatten the translation object and group by value
    this.flattenTranslations(
      translationFile.content,
      "",
      translationFile.path,
      valueToKeysMap
    );

    const duplicateTranslations: DuplicateTranslation[] = [];

    // Find duplicates
    for (const [value, keys] of valueToKeysMap.entries()) {
      if (keys.length > 1 && this.isSignificantText(value)) {
        // Find usages of these duplicate keys in code
        const usages = this.findKeyUsagesInCode(
          keys.map((k) => k.fullKey),
          translationKeys
        );

        if (usages.length > 0) {
          duplicateTranslations.push({
            value,
            keys,
            usages,
          });
        }
      }
    }

    return duplicateTranslations;
  }

  /**
   * Checks if text is significant enough to warn about duplication
   * @param value The text to check
   * @returns Boolean indicating if the text is significant
   */
  private isSignificantText(value: string): boolean {
    // Ignore very short strings
    if (value.length < 5) return false;

    // Ignore common short words/values
    const lowered = value.toLowerCase();
    if (["yes", "no", "true", "false", "ok", "cancel"].includes(lowered))
      return false;

    // Ignore strings that are just numbers
    if (/^\d+$/.test(value)) return false;

    return true;
  }

  /**
   * Flattens a nested translation object and groups by value
   * @param obj Translation object
   * @param prefix Current key prefix
   * @param filePath File path
   * @param valueToKeysMap Map to populate with values and their keys
   */
  private flattenTranslations(
    obj: Record<string, any>,
    prefix: string,
    filePath: string,
    valueToKeysMap: Map<string, { fullKey: string; filePath: string }[]>
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "object" && value !== null) {
        this.flattenTranslations(value, fullKey, filePath, valueToKeysMap);
      } else if (typeof value === "string") {
        const existing = valueToKeysMap.get(value) || [];
        existing.push({ fullKey, filePath });
        valueToKeysMap.set(value, existing);
      }
    }
  }

  /**
   * Find usages of translation keys in the code
   * @param keys Keys to find usages of
   * @param translationKeys All translation keys found in code
   * @returns Array of key usages
   */
  private findKeyUsagesInCode(
    keys: string[],
    translationKeys: TranslationKey[]
  ): {
    componentName: string;
    filePath: string;
    location: { line: number; column: number };
    contextCode: { before: string; line: string; after: string };
  }[] {
    const usages: {
      componentName: string;
      filePath: string;
      location: { line: number; column: number };
      contextCode: { before: string; line: string; after: string };
    }[] = [];

    for (const translationKey of translationKeys) {
      if (keys.includes(translationKey.fullKey)) {
        usages.push({
          componentName: translationKey.componentName,
          filePath: translationKey.filePath,
          location: translationKey.location,
          contextCode: translationKey.contextCode,
        });
      }
    }

    return usages;
  }

  /**
   * Groups duplicate translations by value
   * @param duplicates Array of duplicate translations
   * @returns Map of values to arrays of duplicate translations
   */
  groupDuplicatesByValue(
    duplicates: DuplicateTranslation[]
  ): Map<string, DuplicateTranslation[]> {
    const groupedDuplicates = new Map<string, DuplicateTranslation[]>();

    for (const duplicate of duplicates) {
      // Use the first 20 chars as key to group similar values
      const valueKey = duplicate.value.substring(0, 20);
      const existing = groupedDuplicates.get(valueKey) || [];
      existing.push(duplicate);
      groupedDuplicates.set(valueKey, existing);
    }

    return groupedDuplicates;
  }
}
