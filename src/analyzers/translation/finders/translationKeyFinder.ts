import ts from "typescript";
import { TranslationKey } from "../../../types/translation.types";
import {
  FileAnalysisResult,
  TranslationHook,
  TranslationCall,
} from "../types/translation.additional";
import {
  findTranslationHooksInFile,
  findTranslationCalls,
  processTranslationKey,
  isTypeScriptFile,
} from "../utils/astUtils";
import { ContextExtractor } from "../extractors/contextExtractor";

/**
 * Finds translation keys used in source code with enhanced context
 */
export class TranslationKeyFinder {
  private translationKeys: TranslationKey[] = [];
  private analyzedFiles: Set<string> = new Set();
  private contextExtractor: ContextExtractor;

  constructor() {
    this.contextExtractor = new ContextExtractor();
  }

  /**
   * Finds all translation keys in source files
   * @param sourceFiles Map of source files to analyze
   * @returns Promise resolving when analysis is complete
   */
  async findAllTranslationKeys(
    sourceFiles: Map<string, ts.SourceFile>
  ): Promise<void> {
    // Analyze each source file
    for (const [filePath, sourceFile] of sourceFiles.entries()) {
      // Skip files that we've already analyzed
      if (this.analyzedFiles.has(filePath)) {
        continue;
      }

      // Skip non-TypeScript/JavaScript files
      if (!isTypeScriptFile(filePath)) {
        continue;
      }

      const results = this.analyzeSourceFile(sourceFile, filePath);

      // Add the keys to our collection
      this.translationKeys.push(...results.translationKeys);

      // Mark as analyzed
      this.analyzedFiles.add(filePath);
    }
  }

  /**
   * Gets the collected translation keys
   * @returns Array of translation keys
   */
  getTranslationKeys(): TranslationKey[] {
    return this.translationKeys;
  }

  /**
   * Analyzes a source file for translation hooks and calls
   * @param sourceFile Source file to analyze
   * @param filePath Path to the source file
   * @returns Analysis results with hooks and keys
   */
  private analyzeSourceFile(
    sourceFile: ts.SourceFile,
    filePath: string
  ): { hooks: TranslationHook[]; translationKeys: TranslationKey[] } {
    // Find all translation hooks in the file (e.g., useTranslations)
    const hooks = findTranslationHooksInFile(sourceFile, filePath);

    // Process each hook to find translation keys
    const foundKeys: TranslationKey[] = [];

    for (const hook of hooks) {
      const translationCalls = this.processTranslationHook(
        hook,
        sourceFile,
        filePath
      );

      // Add the keys to our result
      foundKeys.push(...translationCalls);
    }

    return {
      hooks,
      translationKeys: foundKeys,
    };
  }

  /**
   * Processes a translation hook to find translation keys
   * @param hook Translation hook to process
   * @param sourceFile Source file
   * @param filePath File path
   * @returns Array of translation keys
   */
  private processTranslationHook(
    hook: TranslationHook,
    sourceFile: ts.SourceFile,
    filePath: string
  ): TranslationKey[] {
    const { varName, namespace, componentName } = hook;

    // Find all translation calls using this hook
    const translationCalls = findTranslationCalls(sourceFile, varName);

    // Process each translation call
    return translationCalls.map((call) =>
      this.processTranslationCall(
        call,
        namespace,
        componentName,
        sourceFile,
        filePath
      )
    );
  }

  /**
   * Processes a translation call to create a translation key with usage context
   * @param call Translation call
   * @param namespace Optional namespace
   * @param componentName Component name
   * @param sourceFile Source file
   * @param filePath File path
   * @returns Translation key with usage context
   */
  private processTranslationCall(
    call: TranslationCall,
    namespace: string | undefined,
    componentName: string,
    sourceFile: ts.SourceFile,
    filePath: string
  ): TranslationKey {
    const { keyText, callNode } = { keyText: call.key, callNode: call.node };

    // Create the basic translation key
    const basicKey = processTranslationKey(
      keyText,
      namespace,
      componentName,
      callNode,
      sourceFile,
      filePath
    );

    // Enhance it with additional context
    return this.contextExtractor.enhanceKeyWithContext(basicKey, sourceFile);
  }

  /**
   * Groups translation keys by file path
   * @returns Map of file paths to arrays of translation keys
   */
  groupKeysByFile(): Map<string, TranslationKey[]> {
    const keysByFile = new Map<string, TranslationKey[]>();

    for (const key of this.translationKeys) {
      const existing = keysByFile.get(key.filePath) || [];
      existing.push(key);
      keysByFile.set(key.filePath, existing);
    }

    return keysByFile;
  }

  /**
   * Finds files with the most translation keys
   * @param limit Maximum number of files to return
   * @returns Array of files sorted by key count
   */
  findFilesWithMostKeys(limit: number = 10): Array<{
    filePath: string;
    keyCount: number;
    keys: TranslationKey[];
  }> {
    const keysByFile = this.groupKeysByFile();

    return Array.from(keysByFile.entries())
      .map(([filePath, keys]) => ({
        filePath,
        keyCount: keys.length,
        keys,
      }))
      .sort((a, b) => b.keyCount - a.keyCount)
      .slice(0, limit);
  }

  /**
   * Finds translation keys in JSX context
   * @returns Array of keys used in JSX
   */
  findKeysInJSX(): TranslationKey[] {
    return this.translationKeys.filter((key) => key.usageContext.isInJSX);
  }

  /**
   * Finds translation keys in conditional rendering
   * @returns Array of keys used in conditional rendering
   */
  findKeysInConditionals(): TranslationKey[] {
    return this.translationKeys.filter(
      (key) => key.usageContext.isInConditional
    );
  }

  /**
   * Finds translation keys in event handlers
   * @returns Array of keys used in event handlers
   */
  findKeysInEventHandlers(): TranslationKey[] {
    return this.translationKeys.filter(
      (key) => key.usageContext.isInEventHandler
    );
  }

  /**
   * Groups translation keys by component
   * @returns Map of component names to arrays of translation keys
   */
  groupKeysByComponent(): Map<string, TranslationKey[]> {
    const keysByComponent = new Map<string, TranslationKey[]>();

    for (const key of this.translationKeys) {
      // Use the parent component from context if available
      const componentName =
        key.usageContext.parentComponent || key.componentName;
      const existing = keysByComponent.get(componentName) || [];
      existing.push(key);
      keysByComponent.set(componentName, existing);
    }

    return keysByComponent;
  }
}
