/**
 * Types for TypeScript type analysis
 */

export interface ComplexTypeInfo {
  fileName: string;
  context: string;
  typeKind: string;
  typeText: string;
}

export interface TypeSimplificationSuggestion {
  fileName: string;
  context: string;
  typeKind: string;
  typeCount: number;
  suggestion: string;
}

/**
 * Information about a duplicated type and its suggested replacement
 */
export interface TypeDuplication {
  // The primary/canonical type that should be kept
  primaryType: {
    name: string;
    filePath: string;
    location: {
      line: number;
      column: number;
    };
  };
  // Duplicate types that could be removed/replaced
  duplicates: Array<{
    name: string;
    filePath: string;
    location: {
      line: number;
      column: number;
    };
    matchScore: number; // 0-1 indicating how similar the type is to the primary
  }>;
  // Suggested replacement strategy
  suggestion: string;
  // How types should be imported
  importStrategy?: string;
}

/**
 * Information about a suggested unified type
 */
export interface UnifiedTypeInfo {
  possibleName: string;
  baseTypes: string[];
  properties: Record<string, string>;
  usedIn: string[];
  suggestedLocation: string;
}

/**
 * Enhanced TypeAnalysisResult with new fields for type duplication detection
 * and unified type suggestions
 */
export interface TypeAnalysisResult {
  // Original fields
  interfacesCount: number;
  typesCount: number;
  componentsWithPropTypes: string[];
  componentsWithoutPropTypes: string[];
  regularFunctionsWithoutReturnType: number;
  suggestedImprovements: string[];
  anyUsageCount: number;
  broadUnionTypesCount: number;
  complexTypes: ComplexTypeInfo[];
  typeSimplificationSuggestions: TypeSimplificationSuggestion[];

  // New fields for enhanced analysis
  duplicatedTypes: TypeDuplication[];
  unifiedTypesSuggestions: UnifiedTypeInfo[];
  typesByDirectory: Record<
    string,
    {
      interfaces: string[];
      types: string[];
      enums: string[];
      classes: string[];
    }
  >;
  typesWithoutNamespace: string[];
}
