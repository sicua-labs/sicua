import ts from "typescript";
import { TranslationKey } from "../../../types/translation.types";
import {
  TranslationHook,
  FileAnalysisResult,
} from "../types/translation.additional";
import {
  findReactI18nextHooksInFile,
  findReactI18nextCalls,
  processReactI18nextKey,
  isTypeScriptFile,
  ReactI18nextCall,
} from "./astUtils";
import { ContextExtractor } from "../extractors/contextExtractor";

/**
 * Finds react-i18next translation keys used in source code with enhanced context
 */
export class ReactI18nextKeyFinder {
  private translationKeys: TranslationKey[] = [];
  private analyzedFiles: Set<string> = new Set();
  private contextExtractor: ContextExtractor;

  constructor() {
    this.contextExtractor = new ContextExtractor();
  }

  /**
   * Finds all react-i18next translation keys in source files
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
   * Analyzes a source file for react-i18next hooks and calls
   * @param sourceFile Source file to analyze
   * @param filePath Path to the source file
   * @returns Analysis results with hooks and keys
   */
  private analyzeSourceFile(
    sourceFile: ts.SourceFile,
    filePath: string
  ): { hooks: TranslationHook[]; translationKeys: TranslationKey[] } {
    // Find all react-i18next hooks in the file (e.g., useTranslation)
    const hooks = findReactI18nextHooksInFile(sourceFile, filePath);

    // Process each hook to find translation keys
    const foundKeys: TranslationKey[] = [];

    for (const hook of hooks) {
      const translationCalls = this.processReactI18nextHook(
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
   * Processes a react-i18next hook to find translation keys
   * @param hook React-i18next hook to process
   * @param sourceFile Source file
   * @param filePath File path
   * @returns Array of translation keys
   */
  private processReactI18nextHook(
    hook: TranslationHook,
    sourceFile: ts.SourceFile,
    filePath: string
  ): TranslationKey[] {
    const { varName, namespace, componentName } = hook;

    // Find all translation calls using this hook
    const translationCalls = findReactI18nextCalls(sourceFile, varName);

    // Process each translation call
    return translationCalls.map((call) =>
      this.processReactI18nextCall(
        call,
        namespace,
        componentName,
        sourceFile,
        filePath
      )
    );
  }

  /**
   * Processes a react-i18next translation call to create a translation key with usage context
   * @param call React-i18next translation call
   * @param hookNamespace Optional namespace from hook
   * @param componentName Component name
   * @param sourceFile Source file
   * @param filePath File path
   * @returns Translation key with usage context
   */
  private processReactI18nextCall(
    call: ReactI18nextCall,
    hookNamespace: string | undefined,
    componentName: string,
    sourceFile: ts.SourceFile,
    filePath: string
  ): TranslationKey {
    // Create the basic translation key
    const basicKey = processReactI18nextKey(
      call,
      hookNamespace,
      componentName,
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
   * Groups translation keys by namespace
   * @returns Map of namespaces to arrays of translation keys
   */
  groupKeysByNamespace(): Map<string, TranslationKey[]> {
    const keysByNamespace = new Map<string, TranslationKey[]>();

    for (const key of this.translationKeys) {
      const namespace = key.namespace || "translation"; // Default namespace for react-i18next
      const existing = keysByNamespace.get(namespace) || [];
      existing.push(key);
      keysByNamespace.set(namespace, existing);
    }

    return keysByNamespace;
  }

  /**
   * Finds keys that use namespace prefix pattern (namespace:key)
   * @returns Array of keys using namespace prefix
   */
  findKeysWithNamespacePrefix(): TranslationKey[] {
    return this.translationKeys.filter((key) => {
      // Check if the original key contained a colon (indicating namespace:key pattern)
      return key.key !== key.fullKey.split(".").pop();
    });
  }

  /**
   * Finds keys that use namespace from options object
   * @returns Array of keys using options namespace
   */
  findKeysWithOptionsNamespace(): TranslationKey[] {
    // This would require storing additional metadata about how the namespace was determined
    // For now, we'll identify them by checking if they have a namespace but don't use prefix pattern
    return this.translationKeys.filter((key) => {
      const hasNamespace = key.namespace && key.namespace !== "translation";
      const usesPrefix = key.key !== key.fullKey.split(".").pop();
      return hasNamespace && !usesPrefix;
    });
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
    return this.translationKeys.filter((key) => key.usageContext?.isInJSX);
  }

  /**
   * Finds translation keys in conditional rendering
   * @returns Array of keys used in conditional rendering
   */
  findKeysInConditionals(): TranslationKey[] {
    return this.translationKeys.filter(
      (key) => key.usageContext?.isInConditional
    );
  }

  /**
   * Finds translation keys in event handlers
   * @returns Array of keys used in event handlers
   */
  findKeysInEventHandlers(): TranslationKey[] {
    return this.translationKeys.filter(
      (key) => key.usageContext?.isInEventHandler
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
        key.usageContext?.parentComponent || key.componentName;
      const existing = keysByComponent.get(componentName) || [];
      existing.push(key);
      keysByComponent.set(componentName, existing);
    }

    return keysByComponent;
  }

  /**
   * Finds components that use multiple namespaces
   * @returns Array of components with multiple namespaces
   */
  findComponentsWithMultipleNamespaces(): Array<{
    componentName: string;
    namespaces: string[];
    keyCount: number;
  }> {
    const componentMap = this.groupKeysByComponent();
    const result: Array<{
      componentName: string;
      namespaces: string[];
      keyCount: number;
    }> = [];

    for (const [componentName, keys] of componentMap.entries()) {
      const namespaces = Array.from(
        new Set(keys.map((key) => key.namespace || "translation"))
      );

      if (namespaces.length > 1) {
        result.push({
          componentName,
          namespaces,
          keyCount: keys.length,
        });
      }
    }

    return result.sort((a, b) => b.namespaces.length - a.namespaces.length);
  }

  /**
   * Gets statistics about key usage patterns
   * @returns Object with usage statistics
   */
  getUsageStatistics(): {
    totalKeys: number;
    uniqueKeys: number;
    namespacesUsed: number;
    filesAnalyzed: number;
    componentsAnalyzed: number;
    jsxUsage: number;
    conditionalUsage: number;
    eventHandlerUsage: number;
  } {
    const uniqueKeys = new Set(this.translationKeys.map((key) => key.fullKey));
    const namespaces = new Set(
      this.translationKeys.map((key) => key.namespace || "translation")
    );
    const components = new Set(
      this.translationKeys.map((key) => key.componentName)
    );

    return {
      totalKeys: this.translationKeys.length,
      uniqueKeys: uniqueKeys.size,
      namespacesUsed: namespaces.size,
      filesAnalyzed: this.analyzedFiles.size,
      componentsAnalyzed: components.size,
      jsxUsage: this.findKeysInJSX().length,
      conditionalUsage: this.findKeysInConditionals().length,
      eventHandlerUsage: this.findKeysInEventHandlers().length,
    };
  }
}
