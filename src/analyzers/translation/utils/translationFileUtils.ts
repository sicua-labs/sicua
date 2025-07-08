import fs from "fs";
import path from "path";
import { TranslationFile } from "../../../types/translation.types";
import { readJsonFile } from "../../../utils/common/pathUtils";
import { TranslationFileContext } from "../types/translation.additional";

/**
 * Finds all translation files in the project
 * @param context Translation file context
 * @returns Promise that resolves to an array of translation files
 */
export async function findTranslationFiles(
  context: TranslationFileContext
): Promise<TranslationFile[]> {
  const translationFiles: TranslationFile[] = [];
  const { projectPath, log } = context;

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
    log(`Checking for translation directory at: ${dirPath}`);

    if (!fs.existsSync(dirPath)) {
      continue;
    }

    if (!fs.statSync(dirPath).isDirectory()) {
      continue;
    }

    // Search for translation files
    const foundFiles = await findFilesInDirectory(dirPath, context);
    translationFiles.push(...foundFiles);

    // If we found files in one location, don't check others
    if (foundFiles.length > 0) {
      log(`Found ${foundFiles.length} translation files in ${dirPath}`);
      break;
    }
  }

  return translationFiles;
}

/**
 * Finds translation files in a directory
 * @param dirPath Directory path
 * @param context Translation file context
 * @returns Promise that resolves to an array of translation files
 */
async function findFilesInDirectory(
  dirPath: string,
  context: TranslationFileContext
): Promise<TranslationFile[]> {
  const { log } = context;
  const translationFiles: TranslationFile[] = [];

  try {
    const files = fs.readdirSync(dirPath);
    log(`Found ${files.length} files in directory: ${dirPath}`);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recursively check subdirectories
        const nestedFiles = await findFilesInDirectory(filePath, context);
        translationFiles.push(...nestedFiles);
      } else if (file.endsWith(".json")) {
        // Process JSON files
        try {
          log(`Reading translation file: ${filePath}`);
          const content = await readJsonFile(filePath);

          // Check if this looks like a translation file
          if (isLikelyTranslationFile(content)) {
            const size = countTranslationEntries(content);
            log(`Found ${size} translation entries in ${filePath}`);

            translationFiles.push({
              path: filePath,
              content,
              size,
            });
          }
        } catch (error) {
          log(`Error reading translation file ${filePath}: ${error}`);
        }
      }
    }
  } catch (error) {
    log(`Error reading directory ${dirPath}: ${error}`);
  }

  return translationFiles;
}

export function hasNestedStringValues(node: any): boolean {
  if (typeof node === "string") {
    return true;
  }

  if (typeof node === "object" && node !== null) {
    return Object.values(node).some(hasNestedStringValues);
  }

  return false;
}

/**
 * Determines if a JSON object is likely a translation file
 * @param content JSON content
 * @returns Boolean indicating if it looks like a translation file
 */

export function isLikelyTranslationFile(content: Record<string, any>): boolean {
  if (Object.keys(content).length === 0) {
    return false;
  }

  return hasNestedStringValues(content);
}

/**
 * Counts the number of translation entries in a file (recursive)
 * @param obj Translation object
 * @param prefix Optional prefix for recursive calls
 * @returns Number of translations
 */
export function countTranslationEntries(
  obj: Record<string, any>,
  prefix = ""
): number {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      count += countTranslationEntries(value, fullKey);
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Determines the main translation file (largest one)
 * @param translationFiles Array of translation files
 * @returns The largest translation file or null if none found
 */
export function determineMainTranslationFile(
  translationFiles: TranslationFile[]
): TranslationFile | null {
  if (translationFiles.length === 0) return null;

  return translationFiles.reduce(
    (largest, current) => (current.size > largest.size ? current : largest),
    translationFiles[0]
  );
}

/**
 * Checks if a translation key exists in the translation object
 * @param fullKey The full dot-notation key
 * @param translations Translation object
 * @returns Boolean indicating if the key exists
 */
export function translationExistsInObject(
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
 * Extracts all translation keys from a translation object
 * @param obj Translation object
 * @param prefix Optional prefix for recursive calls
 * @param result Array to collect results
 */
export function extractKeysFromTranslations(
  obj: Record<string, any>,
  prefix: string,
  result: string[]
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      extractKeysFromTranslations(value, fullKey, result);
    } else if (typeof value === "string") {
      result.push(fullKey);
    }
  }
}

/**
 * Flattens a nested translation object for comparison
 * @param obj Translation object
 * @param prefix Optional prefix for recursive calls
 * @param filePath File path of the translation file
 * @param valueToKeysMap Map to collect values and their keys
 */
export function flattenTranslations(
  obj: Record<string, any>,
  prefix: string,
  filePath: string,
  valueToKeysMap: Map<string, { fullKey: string; filePath: string }[]>
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      flattenTranslations(value, fullKey, filePath, valueToKeysMap);
    } else if (typeof value === "string") {
      const existing = valueToKeysMap.get(value) || [];
      existing.push({ fullKey, filePath });
      valueToKeysMap.set(value, existing);
    }
  }
}

/**
 * Checks if text is significant enough to warn about duplication
 * @param value The text value to check
 * @returns Boolean indicating if the text is significant
 */
export function isSignificantText(value: string): boolean {
  // Ignore very short strings or non-significant content
  if (value.length < 5) return false;

  // Ignore strings that are just "yes", "no", "true", "false"
  const lowered = value.toLowerCase();
  if (["yes", "no", "true", "false", "ok", "cancel"].includes(lowered))
    return false;

  // Ignore strings that are just numbers
  if (/^\d+$/.test(value)) return false;

  return true;
}
