import { ErrorHandlingLocation } from "./errorHandling.types";

export interface TranslationKey {
  key: string;
  namespace?: string;
  fullKey: string; // combined namespace.key or just key if no namespace
  location: ErrorHandlingLocation;
  componentName: string;
  filePath: string;
  contextCode: {
    before: string;
    line: string;
    after: string;
  };
  usageContext: {
    isInJSX: boolean;
    isInConditional: boolean;
    parentComponent: string | undefined;
    isInEventHandler: boolean;
    renderCount: number;
  };
}

export interface TranslationFile {
  path: string;
  content: Record<string, any>; // Nested structure of translation objects
  size: number; // File size in bytes or number of entries
}

export interface MissingTranslation {
  key: TranslationKey;
  suggestedFiles: string[]; // Files where this translation should be added
}

export interface DuplicateTranslation {
  value: string;
  keys: {
    fullKey: string;
    filePath: string;
  }[];
  usages: {
    componentName: string;
    filePath: string;
    location: ErrorHandlingLocation;
    contextCode: {
      before: string;
      line: string;
      after: string;
    };
  }[];
}

export interface TranslationAnalysisResult {
  missingTranslations: MissingTranslation[];
  duplicateTranslations: DuplicateTranslation[];
  translationFilesCoverage: {
    filePath: string;
    totalKeys: number;
    unusedKeys: string[];
    missingKeys: string[];
  }[];
  statistics: {
    totalTranslationKeysUsed: number;
    totalMissingTranslations: number;
    totalDuplicateValues: number;
    filesWithMostMissingTranslations: {
      filePath: string;
      count: number;
    }[];
  };
}
