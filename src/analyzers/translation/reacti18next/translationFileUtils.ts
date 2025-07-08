import fs from "fs";
import path from "path";
import { TranslationFile } from "../../../types/translation.types";
import { readJsonFile } from "../../../utils/common/pathUtils";
import { TranslationFileContext } from "../types/translation.additional";

/**
 * Finds all react-i18next translation files in the project
 * @param context Translation file context
 * @returns Promise that resolves to an array of translation files
 */
export async function findReactI18nextTranslationFiles(
  context: TranslationFileContext
): Promise<TranslationFile[]> {
  const translationFiles: TranslationFile[] = [];
  const { projectPath, log } = context;

  // React-i18next common locations
  const possibleLocations = [
    "locales", // Standard react-i18next location
    "public/locales", // Common Next.js with react-i18next location
    "src/locales", // Alternative src location
    "assets/locales", // Create React App style
    "translations", // Generic translations folder
    "i18n", // Alternative i18n folder
    "src/i18n", // i18n in src
  ];

  for (const location of possibleLocations) {
    const dirPath = path.join(projectPath, location);
    log(`Checking for react-i18next translation directory at: ${dirPath}`);

    if (!fs.existsSync(dirPath)) {
      continue;
    }

    if (!fs.statSync(dirPath).isDirectory()) {
      continue;
    }

    // Search for translation files
    const foundFiles = await findFilesInReactI18nextDirectory(dirPath, context);
    translationFiles.push(...foundFiles);

    // If we found files in one location, don't check others
    if (foundFiles.length > 0) {
      log(
        `Found ${foundFiles.length} react-i18next translation files in ${dirPath}`
      );
      break;
    }
  }

  return translationFiles;
}

/**
 * Finds translation files in a react-i18next directory structure
 * @param dirPath Directory path
 * @param context Translation file context
 * @returns Promise that resolves to an array of translation files
 */
async function findFilesInReactI18nextDirectory(
  dirPath: string,
  context: TranslationFileContext
): Promise<TranslationFile[]> {
  const { log } = context;
  const translationFiles: TranslationFile[] = [];

  try {
    const items = fs.readdirSync(dirPath);
    log(`Found ${items.length} items in directory: ${dirPath}`);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Check if this is a language directory (e.g., 'en', 'fr', 'de')
        if (isReactI18nextLanguageDirectory(item)) {
          log(`Processing language directory: ${itemPath}`);
          const languageFiles = await findLanguageFiles(
            itemPath,
            item,
            context
          );
          translationFiles.push(...languageFiles);
        } else {
          // Recursively check subdirectories
          const nestedFiles = await findFilesInReactI18nextDirectory(
            itemPath,
            context
          );
          translationFiles.push(...nestedFiles);
        }
      } else if (item.endsWith(".json")) {
        // Direct JSON files in the locales directory
        try {
          log(`Reading react-i18next translation file: ${itemPath}`);
          const content = await readJsonFile(itemPath);

          if (isLikelyReactI18nextTranslationFile(content)) {
            const size = countReactI18nextTranslationEntries(content);
            log(`Found ${size} translation entries in ${itemPath}`);

            translationFiles.push({
              path: itemPath,
              content,
              size,
            });
          }
        } catch (error) {
          log(
            `Error reading react-i18next translation file ${itemPath}: ${error}`
          );
        }
      }
    }
  } catch (error) {
    log(`Error reading directory ${dirPath}: ${error}`);
  }

  return translationFiles;
}

/**
 * Finds translation files within a language directory
 * @param languagePath Path to the language directory
 * @param languageCode Language code (e.g., 'en', 'fr')
 * @param context Translation file context
 * @returns Promise that resolves to an array of translation files
 */
async function findLanguageFiles(
  languagePath: string,
  languageCode: string,
  context: TranslationFileContext
): Promise<TranslationFile[]> {
  const { log } = context;
  const translationFiles: TranslationFile[] = [];

  try {
    const files = fs.readdirSync(languagePath);
    log(`Found ${files.length} files in language directory: ${languagePath}`);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(languagePath, file);

        try {
          log(`Reading language file: ${filePath}`);
          const content = await readJsonFile(filePath);

          if (isLikelyReactI18nextTranslationFile(content)) {
            const size = countReactI18nextTranslationEntries(content);
            log(`Found ${size} translation entries in ${filePath}`);

            translationFiles.push({
              path: filePath,
              content,
              size,
            });
          }
        } catch (error) {
          log(`Error reading language file ${filePath}: ${error}`);
        }
      }
    }
  } catch (error) {
    log(`Error reading language directory ${languagePath}: ${error}`);
  }

  return translationFiles;
}

/**
 * Determines if a directory name represents a react-i18next language code
 * @param dirName Directory name
 * @returns Boolean indicating if it's a language directory
 */
export function isReactI18nextLanguageDirectory(dirName: string): boolean {
  // Common language code patterns for react-i18next
  const languagePatterns = [
    /^[a-z]{2}$/, // Two letter codes: en, fr, de
    /^[a-z]{2}-[A-Z]{2}$/, // Locale codes: en-US, fr-FR
    /^[a-z]{2}_[A-Z]{2}$/, // Alternative locale: en_US, fr_FR
    /^[a-z]{3}$/, // Three letter codes: eng, fra
  ];

  return languagePatterns.some((pattern) => pattern.test(dirName));
}

/**
 * Determines if a JSON object is likely a react-i18next translation file
 * @param content JSON content
 * @returns Boolean indicating if it looks like a react-i18next translation file
 */
export function isLikelyReactI18nextTranslationFile(
  content: Record<string, any>
): boolean {
  if (Object.keys(content).length === 0) {
    return false;
  }

  // Check if it has nested string values (basic translation file check)
  if (!hasNestedStringValues(content)) {
    return false;
  }

  // Additional react-i18next specific checks
  if (hasReactI18nextFeatures(content)) {
    return true;
  }

  // Fallback to general translation file check
  return hasTranslationStructure(content);
}

/**
 * Checks if content has react-i18next specific features
 * @param content JSON content
 * @returns Boolean indicating if it has react-i18next features
 */
function hasReactI18nextFeatures(content: Record<string, any>): boolean {
  return hasPluralizationKeys(content) || hasInterpolationPatterns(content);
}

/**
 * Checks for react-i18next pluralization keys
 * @param content JSON content
 * @returns Boolean indicating if pluralization keys are present
 */
function hasPluralizationKeys(content: Record<string, any>): boolean {
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
 * Checks for react-i18next interpolation patterns
 * @param content JSON content
 * @returns Boolean indicating if interpolation patterns are present
 */
function hasInterpolationPatterns(content: Record<string, any>): boolean {
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
 * Checks if content has nested string values
 * @param node JSON node
 * @returns Boolean indicating if it has string values
 */
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
 * Checks if content has a translation-like structure
 * @param content JSON content
 * @returns Boolean indicating if it has translation structure
 */
function hasTranslationStructure(content: Record<string, any>): boolean {
  const keys = Object.keys(content);

  // Should have reasonable number of keys
  if (keys.length === 0 || keys.length > 1000) {
    return false;
  }

  // Check if most values are strings or nested objects with strings
  let stringValues = 0;
  let totalValues = 0;

  const countValues = (obj: Record<string, any>): void => {
    for (const value of Object.values(obj)) {
      totalValues++;

      if (typeof value === "string") {
        stringValues++;
      } else if (typeof value === "object" && value !== null) {
        countValues(value);
      }
    }
  };

  countValues(content);

  // At least 70% should be string values
  return totalValues > 0 && stringValues / totalValues >= 0.7;
}

/**
 * Counts the number of translation entries in a react-i18next file (recursive)
 * @param obj Translation object
 * @param prefix Optional prefix for recursive calls
 * @returns Number of translations
 */
export function countReactI18nextTranslationEntries(
  obj: Record<string, any>,
  prefix = ""
): number {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      count += countReactI18nextTranslationEntries(value, fullKey);
    } else if (typeof value === "string") {
      count++;
    }
  }
  return count;
}

/**
 * Determines the main react-i18next translation file (largest one in translation namespace)
 * @param translationFiles Array of translation files
 * @returns The main translation file or null if none found
 */
export function determineMainReactI18nextTranslationFile(
  translationFiles: TranslationFile[]
): TranslationFile | null {
  if (translationFiles.length === 0) return null;

  // Look for files that are likely the main namespace (translation, common, etc.)
  const mainNamespaceFiles = translationFiles.filter((file) => {
    const fileName = path.basename(file.path, ".json");
    const namespace = extractNamespaceFromReactI18nextFile(file);

    return (
      ["translation", "common", "main", "app"].includes(
        namespace.toLowerCase()
      ) ||
      ["translation", "common", "main", "app"].includes(fileName.toLowerCase())
    );
  });

  if (mainNamespaceFiles.length > 0) {
    // Return the largest file in the main namespace
    return mainNamespaceFiles.reduce(
      (largest, current) => (current.size > largest.size ? current : largest),
      mainNamespaceFiles[0]
    );
  }

  // Fallback to largest file overall
  return translationFiles.reduce(
    (largest, current) => (current.size > largest.size ? current : largest),
    translationFiles[0]
  );
}

/**
 * Extracts namespace from react-i18next file path
 * @param file Translation file
 * @returns Namespace string
 */
export function extractNamespaceFromReactI18nextFile(
  file: TranslationFile
): string {
  const fileName = path.basename(file.path, ".json");

  // If filename is a language code, check parent directory structure
  if (isReactI18nextLanguageDirectory(fileName)) {
    // This might be a file named after language code, look at parent
    const parentDir = path.basename(path.dirname(file.path));
    if (!isReactI18nextLanguageDirectory(parentDir)) {
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
    if (!isReactI18nextLanguageDirectory(potentialNamespace)) {
      return potentialNamespace;
    }
  }

  return "translation"; // Default namespace
}

/**
 * Checks if a translation key exists in the react-i18next translation object
 * @param fullKey The full dot-notation key
 * @param translations Translation object
 * @returns Boolean indicating if the key exists
 */
export function translationExistsInReactI18nextObject(
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
 * Extracts all translation keys from a react-i18next translation object
 * @param obj Translation object
 * @param prefix Optional prefix for recursive calls
 * @param result Array to collect results
 */
export function extractKeysFromReactI18nextTranslations(
  obj: Record<string, any>,
  prefix: string,
  result: string[]
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      extractKeysFromReactI18nextTranslations(value, fullKey, result);
    } else if (typeof value === "string") {
      result.push(fullKey);
    }
  }
}

/**
 * Flattens a nested react-i18next translation object for comparison
 * @param obj Translation object
 * @param prefix Optional prefix for recursive calls
 * @param namespace Namespace of the translation file
 * @param filePath File path of the translation file
 * @param valueToKeysMap Map to collect values and their keys
 */
export function flattenReactI18nextTranslations(
  obj: Record<string, any>,
  prefix: string,
  namespace: string,
  filePath: string,
  valueToKeysMap: Map<
    string,
    Array<{ fullKey: string; filePath: string; namespace: string }>
  >
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      flattenReactI18nextTranslations(
        value,
        fullKey,
        namespace,
        filePath,
        valueToKeysMap
      );
    } else if (typeof value === "string") {
      const existing = valueToKeysMap.get(value) || [];
      existing.push({ fullKey, filePath, namespace });
      valueToKeysMap.set(value, existing);
    }
  }
}

/**
 * Checks if text is significant enough to warn about duplication in react-i18next
 * @param value The text value to check
 * @returns Boolean indicating if the text is significant
 */
export function isSignificantReactI18nextText(value: string): boolean {
  // Ignore very short strings or non-significant content
  if (value.length < 5) return false;

  // Ignore strings that are just "yes", "no", "true", "false", etc.
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
      "submit",
    ].includes(lowered)
  )
    return false;

  // Ignore strings that are just numbers
  if (/^\d+$/.test(value)) return false;

  // Ignore react-i18next interpolation-only strings
  if (/^\{\{[^}]+\}\}$/.test(value)) return false;

  // Ignore $t() function calls
  if (/^\$t\([^)]+\)$/.test(value)) return false;

  return true;
}
