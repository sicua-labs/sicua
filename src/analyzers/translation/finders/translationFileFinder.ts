import path from "path";
import fs from "fs";
import { TranslationFile } from "../../../types/translation.types";
import { TranslationFileContext } from "../types/translation.additional";
import { readJsonFile } from "../../../utils/common/pathUtils";
import { isLikelyTranslationFile } from "../utils/translationFileUtils";

/**
 * Finds and analyzes translation files in a project
 */
export class TranslationFileFinder {
  private context: TranslationFileContext;
  private translationFiles: TranslationFile[] = [];
  private mainTranslationFile: TranslationFile | null = null;

  /**
   * Creates a new translation file finder
   * @param context Translation file context
   */
  constructor(context: TranslationFileContext) {
    this.context = context;
  }

  /**
   * Finds all translation files in the project
   * @returns Promise resolving when files are found
   */
  async findAllTranslationFiles(): Promise<void> {
    this.translationFiles = await this.findTranslationFiles();

    if (this.translationFiles.length > 0) {
      this.mainTranslationFile = this.determineMainTranslationFile();
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
   * Gets the main translation file (largest one)
   * @returns Main translation file or null if none found
   */
  getMainTranslationFile(): TranslationFile | null {
    return this.mainTranslationFile;
  }

  /**
   * Finds translation files in common locations
   */
  private async findTranslationFiles(): Promise<TranslationFile[]> {
    const translationFiles: TranslationFile[] = [];
    const { projectPath } = this.context;

    // Check common locations for translation files
    const possibleLocations = [
      "messages", // next-intl
      "locales", // next-i18next
      "translations", // common folder name
      "i18n/locales", // i18next
      "src/locales", // common location in src
      "public/locales", // another common location
    ];

    for (const location of possibleLocations) {
      const dirPath = path.join(projectPath, location);

      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        continue;
      }

      // Search for translation files
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
   * Finds translation files in a directory
   * @param dirPath Directory path
   * @returns Promise that resolves to an array of translation files
   */
  private async findFilesInDirectory(
    dirPath: string
  ): Promise<TranslationFile[]> {
    const translationFiles: TranslationFile[] = [];

    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // Recursively check subdirectories
          const nestedFiles = await this.findFilesInDirectory(filePath);
          translationFiles.push(...nestedFiles);
        } else if (file.endsWith(".json")) {
          // Process JSON files
          try {
            const content = await readJsonFile(filePath);

            // Check if this looks like a translation file
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
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * Determines the main translation file (largest one)
   * @returns The largest translation file or null if none found
   */
  private determineMainTranslationFile(): TranslationFile | null {
    if (this.translationFiles.length === 0) return null;

    return this.translationFiles.reduce(
      (largest, current) => (current.size > largest.size ? current : largest),
      this.translationFiles[0]
    );
  }

  /**
   * Analyzes a translation file structure
   * @param file Translation file to analyze
   * @returns Analysis information about the file
   */
  analyzeTranslationFile(file: TranslationFile): {
    keysCount: number;
    nestedLevels: number;
    languageCode: string | null;
    format: "flat" | "nested";
  } {
    const fileName = path.basename(file.path);
    let languageCode: string | null = null;

    // Try to extract language code from filename
    const localeMatch = fileName.match(/^([a-z]{2}(-[A-Z]{2})?)\.json$/);
    if (localeMatch) {
      languageCode = localeMatch[1];
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

    return {
      keysCount: file.size,
      nestedLevels,
      languageCode,
      format,
    };
  }

  /**
   * Gets information about the translation file format
   * @returns Information about translation file format
   */
  detectTranslationLibrary(): {
    library: "next-intl" | "i18next" | "react-intl" | "unknown";
    format: "flat" | "nested";
    multiLanguage: boolean;
  } {
    if (this.translationFiles.length === 0) {
      return { library: "unknown", format: "flat", multiLanguage: false };
    }

    // Check file paths and structure to guess the library
    const paths = this.translationFiles.map((f) => f.path);
    let library: "next-intl" | "i18next" | "react-intl" | "unknown" = "unknown";
    let multiLanguage = this.translationFiles.length > 1;

    // Check if any path contains specific library patterns
    if (paths.some((p) => p.includes("/messages/"))) {
      library = "next-intl";
    } else if (
      paths.some(
        (p) => p.includes("/locales/") && p.includes("/translation.json")
      )
    ) {
      library = "i18next";
    } else if (
      paths.some((p) => p.includes("/lang/") || p.includes("/translations/"))
    ) {
      library = "react-intl";
    }

    // Determine format based on main file
    const format = this.mainTranslationFile
      ? this.analyzeTranslationFile(this.mainTranslationFile).format
      : "flat";

    return { library, format, multiLanguage };
  }
}
