import ts from "typescript";
import { TranslationKey } from "../../../types/translation.types";

/**
 * Represents a discovered translation hook in source code
 */
export interface TranslationHook {
  /** The variable name used for the translation function (e.g., 't' in 't("key")') */
  varName: string;

  /** Optional namespace used when creating the hook (e.g., 'common' in useTranslations("common")) */
  namespace?: string;

  /** The AST node where the hook is defined */
  node: ts.Node;

  /** The component name where this hook is used */
  componentName: string;
}

/**
 * Represents a translation call in the source code
 */
export interface TranslationCall {
  /** The translation key being accessed */
  key: string;

  /** The AST node of the call expression */
  node: ts.CallExpression;
}

/**
 * Represents a flattened translation key-value pair
 */
export interface FlattenedTranslation {
  /** The full dot-notation key of the translation */
  fullKey: string;

  /** The translation value */
  value: string;

  /** The file path where this translation is defined */
  filePath: string;
}

/**
 * Debug information for translation analysis
 */
export interface TranslationDebugInfo {
  /** Information about found translation files */
  translationFiles: {
    path: string;
    size: number;
    isMainFile: boolean;
  }[];

  /** The translation keys found in the source code */
  foundKeys: {
    fullKey: string;
    namespace?: string;
    key: string;
    componentName: string;
    filePath: string;
    location: { line: number; column: number };
    contextCode: {
      before: string;
      line: string;
      after: string;
    };
  }[];

  /** Sample of source files analyzed */
  sourceFilesSample: string[];

  /** Detailed logs from the analysis process */
  logs: string[];
}

/**
 * Context for translation file operations
 */
export interface TranslationFileContext {
  /** Base project path */
  projectPath: string;

  /** Whether debug mode is enabled */
  debugMode: boolean;

  /** Function for logging debug information */
  log: (message: string, ...additionalData: any[]) => void;
}

/**
 * Context for translation key operations
 */
export interface TranslationKeyContext extends TranslationFileContext {
  /** Map of variable names to their namespaces used in translation hooks */
  translationHooks: Map<string, string | undefined>;
}

/**
 * Result of a full file scan with hooks and translations
 */
export interface FileAnalysisResult {
  /** Translation hooks found in the file */
  hooks: TranslationHook[];

  /** Translation keys found in the file */
  translationKeys: TranslationKey[];
}
