import {
  TranslationKey,
  MissingTranslation,
  TranslationFile,
} from "../../../types/translation.types";

/**
 * Analyzer that detects missing translations by comparing keys found in code
 * with what's available in translation files
 */
export class MissingTranslationAnalyzer {
  /**
   * Detects missing translations by comparing keys in code with translation files
   * @param translationKeys Keys found in code
   * @param translationFiles Translation files to check against
   * @param mainTranslationFile Main translation file if available
   * @returns Array of missing translations
   */
  detectMissingTranslations(
    translationKeys: TranslationKey[],
    translationFiles: TranslationFile[],
  ): MissingTranslation[] {
    if (translationFiles.length === 0) return [];

    const missingTranslations: MissingTranslation[] = [];
    const filesById = new Map<string, TranslationFile>();

    // Index files for faster lookup
    translationFiles.forEach((file) => {
      filesById.set(file.path, file);
    });

    // For each key found in code, check if it exists in each translation file
    for (const translationKey of translationKeys) {
      const missingInFiles: string[] = [];

      // Check if the key exists in each translation file
      for (const file of translationFiles) {
        if (
          !this.translationExistsInObject(translationKey.fullKey, file.content)
        ) {
          missingInFiles.push(file.path);
        }
      }

      // If the key is missing in any file, add it to the results
      if (missingInFiles.length > 0) {
        missingTranslations.push({
          key: translationKey,
          suggestedFiles: missingInFiles,
        });
      }
    }

    return missingTranslations;
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
   * Suggests which file a missing translation should be added to
   * @param key Translation key
   * @param translationFiles Available translation files
   * @returns The best file path to add the translation to
   */
  suggestFileForTranslation(
    key: TranslationKey,
    translationFiles: TranslationFile[]
  ): string {
    if (translationFiles.length === 0) return "";

    // If there's only one file, that's the one
    if (translationFiles.length === 1) {
      return translationFiles[0].path;
    }

    // Try to find a file with a namespace matching the key's namespace
    if (key.namespace) {
      for (const file of translationFiles) {
        const fileName = file.path.split("/").pop()?.split(".")[0];
        if (
          fileName &&
          fileName.toLowerCase() === key.namespace.toLowerCase()
        ) {
          return file.path;
        }
      }
    }

    // Use the largest file as default
    return translationFiles.reduce(
      (largest, current) => (current.size > largest.size ? current : largest),
      translationFiles[0]
    ).path;
  }
}
