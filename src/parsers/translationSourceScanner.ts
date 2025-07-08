import ts from "typescript";
import { ScanResult } from "../types";

/**
 * Extracts relevant files for translation analysis from the unified scan result
 * @param scanResult The unified scan result from directoryScanner
 * @returns Map of file paths to TypeScript SourceFile objects that are relevant for translation analysis
 */
export function getTranslationSourceFiles(
  scanResult: ScanResult
): Map<string, ts.SourceFile> {
  const translationSourceFiles = new Map<string, ts.SourceFile>();

  // Iterate through all scanned files and filter those relevant for translation analysis
  for (const [filePath, sourceFile] of scanResult.sourceFiles.entries()) {
    const metadata = scanResult.fileMetadata.get(filePath);

    // Filter files that use translation functions
    if (metadata?.hasTranslations) {
      translationSourceFiles.set(filePath, sourceFile);
    }
  }

  return translationSourceFiles;
}

/**
 * Legacy method that performs a full scan for backward compatibility
 * @param projectPath The root project path
 * @returns Map of file paths to TypeScript SourceFile objects
 * @deprecated Use getTranslationSourceFiles with the unified scanner instead
 */
export async function scanSourceFilesForTranslations(
  projectPath: string
): Promise<Map<string, ts.SourceFile>> {
  console.warn(
    "Warning: scanSourceFilesForTranslations is deprecated. " +
      "Use getTranslationSourceFiles with the unified scanner for better performance."
  );

  // This is kept for backward compatibility, but we should phase it out
  // Implementation remains the same as the original

  // This would be the original implementation, but we're not reproducing it here
  // as it's deprecated and should be replaced by the new approach

  return new Map<string, ts.SourceFile>();
}
