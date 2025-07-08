import fs from "fs";
import path from "path";
import {
  TranslationFile,
  TranslationKey,
} from "../../../types/translation.types";
import { TranslationDebugInfo } from "../types/translation.additional";

/**
 * Creates a logger function for translation analysis
 * @param projectPath The project path for saving logs
 * @param debugMode Whether debug mode is enabled
 * @returns Object with log function and utility methods
 */
export function createLogger(projectPath: string, debugMode: boolean = false) {
  const debugLogs: string[] = [];

  /**
   * Logs a debug message with optional additional data
   * @param message The message to log
   * @param additionalData Optional additional data
   */
  const log = (message: string, ...additionalData: any[]): void => {
    if (!debugMode) return;

    debugLogs.push(message);

    // Log additional data if provided
    if (additionalData && additionalData.length > 0) {
      const additionalString = additionalData
        .map((data) =>
          typeof data === "object" ? JSON.stringify(data) : String(data)
        )
        .join(" ");
      debugLogs.push(additionalString);
    }

    // Also log to console for immediate feedback
    console.log(message);
    if (additionalData.length > 0) {
      console.log(...additionalData);
    }
  };

  /**
   * Saves debug logs to a file
   */
  const saveDebugLogs = (): void => {
    if (!debugMode || debugLogs.length === 0) return;

    try {
      const debugFilePath = path.join(
        projectPath,
        "translation-analyzer-debug.log"
      );
      fs.writeFileSync(debugFilePath, debugLogs.join("\n"), "utf8");
      console.log(`Debug logs saved to ${debugFilePath}`);
    } catch (error) {
      console.error("Error saving debug logs:", error);
    }
  };

  /**
   * Gets the current debug logs
   * @returns Array of debug log entries
   */
  const getLogs = (): string[] => {
    return [...debugLogs];
  };

  return {
    log,
    saveDebugLogs,
    getLogs,
  };
}

/**
 * Writes a detailed debug file with analysis information
 * @param projectPath Project path
 * @param translationFiles Translation files found
 * @param translationKeys Translation keys found
 * @param sourceFiles Source files analyzed
 * @param mainTranslationFile Main translation file
 * @param logs Debug logs
 */
export function writeDetailedDebugFile(
  projectPath: string,
  translationFiles: TranslationFile[],
  translationKeys: TranslationKey[],
  sourceFiles: Map<string, any>,
  mainTranslationFile: TranslationFile | null,
  logs: string[]
): void {
  try {
    const debugInfo: TranslationDebugInfo = {
      translationFiles: translationFiles.map((file) => ({
        path: file.path,
        size: file.size,
        isMainFile: file === mainTranslationFile,
      })),
      foundKeys: translationKeys.map((key) => ({
        fullKey: key.fullKey,
        namespace: key.namespace,
        key: key.key,
        componentName: key.componentName,
        filePath: key.filePath,
        location: key.location,
        contextCode: key.contextCode,
      })),
      sourceFilesSample: Array.from(sourceFiles.keys()).slice(0, 5),
      logs,
    };

    const debugFilePath = path.join(
      projectPath,
      "translation-analyzer-details.json"
    );
    fs.writeFileSync(debugFilePath, JSON.stringify(debugInfo, null, 2), "utf8");
    console.log(`Detailed debug info saved to ${debugFilePath}`);
  } catch (error) {
    console.error(`Error writing detailed debug file: ${error}`);
  }
}

/**
 * Validates translation analysis results for debugging
 * @param translationKeys Translation keys found
 * @param translationFiles Translation files found
 * @returns Validation messages
 */
export function validateResults(
  translationKeys: TranslationKey[],
  translationFiles: TranslationFile[]
): string[] {
  const validationMessages: string[] = [];

  // Check if any translation keys were found
  if (translationKeys.length === 0) {
    validationMessages.push(
      "WARNING: No translation keys found in code. This may indicate an issue with the analysis or that the project doesn't use the supported translation libraries."
    );
  }

  // Check if any translation files were found
  if (translationFiles.length === 0) {
    validationMessages.push(
      "WARNING: No translation files found. Make sure the translation files are in one of the expected locations or adjust the search paths."
    );
  }

  // Check for keys that might not be valid
  const suspiciousKeys = translationKeys.filter(
    (k) =>
      k.fullKey.includes(" ") ||
      k.fullKey.length > 100 ||
      k.fullKey.includes("'") ||
      k.fullKey.includes('"')
  );

  if (suspiciousKeys.length > 0) {
    validationMessages.push(
      `WARNING: Found ${suspiciousKeys.length} potentially suspicious translation keys that may not be valid.`
    );
    validationMessages.push(
      "Examples: " +
        suspiciousKeys
          .slice(0, 3)
          .map((k) => k.fullKey)
          .join(", ")
    );
  }

  return validationMessages;
}

/**
 * Formats a TranslationKey for log output
 * @param key The translation key
 * @returns Formatted string representation
 */
export function formatTranslationKeyForLog(key: TranslationKey): string {
  return `${key.fullKey} (${key.componentName} @ ${key.filePath}:${key.location.line})`;
}
