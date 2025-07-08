import path from "path";
import fs from "fs";
import { TranslationFile } from "../../../types/translation.types";
import { TranslationFileContext } from "../types/translation.additional";
import { readJsonFile } from "../../../utils/common/pathUtils";
import { isLikelyTranslationFile } from "../utils/translationFileUtils";

/**
 * Finds and analyzes react-i18next translation files in a project
 */
export class ReactI18nextFileFinder {
  private context: TranslationFileContext;
  private translationFiles: TranslationFile[] = [];
  private mainTranslationFile: TranslationFile | null = null;
  private namespaceFiles: Map<string, TranslationFile[]> = new Map();

  /**
   * Creates a new react-i18next translation file finder
   * @param context Translation file context
   */
  constructor(context: TranslationFileContext) {
    this.context = context;
  }

  /**
   * Finds all react-i18next translation files in the project
   * @returns Promise resolving when files are found
   */
  async findAllTranslationFiles(): Promise<void> {
    this.translationFiles = await this.findReactI18nextFiles();

    if (this.translationFiles.length > 0) {
      this.mainTranslationFile = this.determineMainTranslationFile();
      this.organizeFilesByNamespace();
    }
  }

  /**
   * Gets the discovered translation files
   * @returns Array of translation files
   */
  getTranslationFiles(): TranslationFile[] {
    return this.translationFiles;
  }

  /**
   * Gets the main translation file (largest one or main namespace)
   * @returns Main translation file or null if none found
   */
  getMainTranslationFile(): TranslationFile | null {
    return this.mainTranslationFile;
  }

  /**
   * Gets translation files organized by namespace
   * @returns Map of namespace to translation files
   */
  getNamespaceFiles(): Map<string, TranslationFile[]> {
    return this.namespaceFiles;
  }

  /**
   * Gets files for a specific namespace
   * @param namespace Namespace to get files for
   * @returns Array of translation files for the namespace
   */
  getFilesForNamespace(namespace: string): TranslationFile[] {
    return this.namespaceFiles.get(namespace) || [];
  }

  /**
   * Finds react-i18next translation files in common locations
   */
  private async findReactI18nextFiles(): Promise<TranslationFile[]> {
    const translationFiles: TranslationFile[] = [];
    const { projectPath } = this.context;

    // React-i18next common locations
    const possibleLocations = [
      "locales", // Standard react-i18next location
      "public/locales", // Common Next.js location
      "src/locales", // Alternative src location
      "assets/locales", // Create React App style
      "translations", // Generic translations folder
      "i18n", // Alternative i18n folder
    ];

    for (const location of possibleLocations) {
      const dirPath = path.join(projectPath, location);

      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        continue;
      }

      // Search for translation files in this location
      const foundFiles = await this.findFilesInDirectory(dirPath);
      translationFiles.push(...foundFiles);

      // If we found files in one location, don't check others
      if (foundFiles.length > 0) {
        break;
      }
    }

    return translationFiles;
  }

  /**
   * Finds translation files in a directory (react-i18next structure)
   * @param dirPath Directory path
   * @returns Promise that resolves to an array of translation files
   */
  private async findFilesInDirectory(
    dirPath: string
  ): Promise<TranslationFile[]> {
    const translationFiles: TranslationFile[] = [];

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Check if this is a language directory (e.g., 'en', 'fr', 'de')
          if (this.isLanguageDirectory(item)) {
            const languageFiles = await this.findLanguageFiles(itemPath, item);
            translationFiles.push(...languageFiles);
          } else {
            // Recursively check subdirectories
            const nestedFiles = await this.findFilesInDirectory(itemPath);
            translationFiles.push(...nestedFiles);
          }
        } else if (item.endsWith(".json")) {
          // Direct JSON files in the locales directory
          try {
            const content = await readJsonFile(itemPath);

            if (isLikelyTranslationFile(content)) {
              const size = this.countTranslationEntries(content);

              translationFiles.push({
                path: itemPath,
                content,
                size,
              });
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return translationFiles;
  }

  /**
   * Finds translation files within a language directory
   * @param languagePath Path to the language directory
   * @param languageCode Language code (e.g., 'en', 'fr')
   * @returns Promise that resolves to an array of translation files
   */
  private async findLanguageFiles(
    languagePath: string,
    languageCode: string
  ): Promise<TranslationFile[]> {
    const translationFiles: TranslationFile[] = [];

    try {
      const files = fs.readdirSync(languagePath);

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(languagePath, file);

          try {
            const content = await readJsonFile(filePath);

            if (isLikelyTranslationFile(content)) {
              const size = this.countTranslationEntries(content);

              translationFiles.push({
                path: filePath,
                content,
                size,
              });
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return translationFiles;
  }

  /**
   * Determines if a directory name represents a language code
   * @param dirName Directory name
   * @returns Boolean indicating if it's a language directory
   */
  private isLanguageDirectory(dirName: string): boolean {
    // Common language code patterns
    const languagePatterns = [
      /^[a-z]{2}$/, // Two letter codes: en, fr, de
      /^[a-z]{2}-[A-Z]{2}$/, // Locale codes: en-US, fr-FR
      /^[a-z]{2}_[A-Z]{2}$/, // Alternative locale: en_US, fr_FR
    ];

    return languagePatterns.some((pattern) => pattern.test(dirName));
  }

  /**
   * Organizes translation files by namespace
   */
  private organizeFilesByNamespace(): void {
    this.namespaceFiles.clear();

    for (const file of this.translationFiles) {
      const namespace = this.extractNamespaceFromFile(file);
      const existing = this.namespaceFiles.get(namespace) || [];
      existing.push(file);
      this.namespaceFiles.set(namespace, existing);
    }
  }

  /**
   * Extracts namespace from file path
   * @param file Translation file
   * @returns Namespace string
   */
  private extractNamespaceFromFile(file: TranslationFile): string {
    const fileName = path.basename(file.path, ".json");

    // If filename is a language code, check parent directory structure
    if (this.isLanguageDirectory(fileName)) {
      // This might be a file named after language code, look at parent
      const parentDir = path.basename(path.dirname(file.path));
      if (!this.isLanguageDirectory(parentDir)) {
        return parentDir;
      }
      return "translation"; // Default namespace
    }

    // Check if filename contains language code prefix (e.g., en.json, fr.json)
    const languageMatch = fileName.match(/^([a-z]{2}(-[A-Z]{2})?)$/);
    if (languageMatch) {
      return "translation"; // Default namespace for language files
    }

    // Check for namespace files (e.g., common.json, forms.json)
    const namespaceMatch = fileName.match(/^([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (namespaceMatch) {
      const potentialNamespace = namespaceMatch[1];

      // Skip language codes as namespaces
      if (!this.isLanguageDirectory(potentialNamespace)) {
        return potentialNamespace;
      }
    }

    return "translation"; // Default namespace
  }

  /**
   * Counts the number of translation entries in a file (recursive)
   * @param obj Translation object
   * @param prefix Optional prefix for recursive calls
   * @returns Number of translations
   */
  private countTranslationEntries(
    obj: Record<string, any>,
    prefix = ""
  ): number {
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        count += this.countTranslationEntries(value, fullKey);
      } else if (typeof value === "string") {
        count++;
      }
    }
    return count;
  }

  /**
   * Determines the main translation file
   * @returns The main translation file or null if none found
   */
  private determineMainTranslationFile(): TranslationFile | null {
    if (this.translationFiles.length === 0) return null;

    // Priority: 'translation' namespace > largest file
    const translationNamespaceFiles =
      this.namespaceFiles.get("translation") || [];

    if (translationNamespaceFiles.length > 0) {
      // Return the largest file in the translation namespace
      return translationNamespaceFiles.reduce(
        (largest, current) => (current.size > largest.size ? current : largest),
        translationNamespaceFiles[0]
      );
    }

    // Fallback to largest file overall
    return this.translationFiles.reduce(
      (largest, current) => (current.size > largest.size ? current : largest),
      this.translationFiles[0]
    );
  }

  /**
   * Analyzes the translation file structure for react-i18next
   * @param file Translation file to analyze
   * @returns Analysis information about the file
   */
  analyzeReactI18nextFile(file: TranslationFile): {
    keysCount: number;
    nestedLevels: number;
    languageCode: string | null;
    namespace: string;
    format: "flat" | "nested";
    hasPlurals: boolean;
    hasInterpolation: boolean;
  } {
    const namespace = this.extractNamespaceFromFile(file);

    // Try to extract language code from path
    let languageCode: string | null = null;
    const pathParts = file.path.split(path.sep);

    for (const part of pathParts) {
      if (this.isLanguageDirectory(part)) {
        languageCode = part;
        break;
      }
    }

    // Calculate max nesting depth
    const calculateNestingDepth = (
      obj: Record<string, any>,
      currentDepth = 0
    ): number => {
      let maxDepth = currentDepth;

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "object" && value !== null) {
          const depth = calculateNestingDepth(value, currentDepth + 1);
          maxDepth = Math.max(maxDepth, depth);
        }
      }

      return maxDepth;
    };

    const nestedLevels = calculateNestingDepth(file.content);
    const format = nestedLevels > 0 ? "nested" : "flat";

    // Check for react-i18next specific features
    const hasPlurals = this.checkForPlurals(file.content);
    const hasInterpolation = this.checkForInterpolation(file.content);

    return {
      keysCount: file.size,
      nestedLevels,
      languageCode,
      namespace,
      format,
      hasPlurals,
      hasInterpolation,
    };
  }

  /**
   * Checks if the translation file contains pluralization keys
   * @param content Translation content
   * @returns Boolean indicating if plurals are present
   */
  private checkForPlurals(content: Record<string, any>): boolean {
    const checkObject = (obj: Record<string, any>): boolean => {
      for (const [key, value] of Object.entries(obj)) {
        // Check for react-i18next plural keys
        if (
          key.endsWith("_zero") ||
          key.endsWith("_one") ||
          key.endsWith("_two") ||
          key.endsWith("_few") ||
          key.endsWith("_many") ||
          key.endsWith("_other")
        ) {
          return true;
        }

        if (typeof value === "object" && value !== null) {
          if (checkObject(value)) return true;
        }
      }
      return false;
    };

    return checkObject(content);
  }

  /**
   * Checks if the translation file contains interpolation
   * @param content Translation content
   * @returns Boolean indicating if interpolation is present
   */
  private checkForInterpolation(content: Record<string, any>): boolean {
    const checkValue = (value: any): boolean => {
      if (typeof value === "string") {
        // Check for react-i18next interpolation patterns
        return /\{\{[^}]+\}\}/.test(value) || /\$t\([^)]+\)/.test(value);
      }

      if (typeof value === "object" && value !== null) {
        return Object.values(value).some(checkValue);
      }

      return false;
    };

    return checkValue(content);
  }

  /**
   * Gets information about the react-i18next setup
   * @returns Information about react-i18next configuration
   */
  detectReactI18nextSetup(): {
    structure: "namespace-based" | "language-based" | "mixed";
    languages: string[];
    namespaces: string[];
    hasPlurals: boolean;
    hasInterpolation: boolean;
  } {
    const languages = new Set<string>();
    const namespaces = new Set<string>();
    let hasPlurals = false;
    let hasInterpolation = false;

    for (const file of this.translationFiles) {
      const analysis = this.analyzeReactI18nextFile(file);

      if (analysis.languageCode) {
        languages.add(analysis.languageCode);
      }

      namespaces.add(analysis.namespace);

      if (analysis.hasPlurals) {
        hasPlurals = true;
      }

      if (analysis.hasInterpolation) {
        hasInterpolation = true;
      }
    }

    // Determine structure type
    let structure: "namespace-based" | "language-based" | "mixed";

    if (namespaces.size > 1 && languages.size > 1) {
      structure = "mixed";
    } else if (namespaces.size > 1) {
      structure = "namespace-based";
    } else {
      structure = "language-based";
    }

    return {
      structure,
      languages: Array.from(languages),
      namespaces: Array.from(namespaces),
      hasPlurals,
      hasInterpolation,
    };
  }
}
