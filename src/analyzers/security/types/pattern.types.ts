/**
 * Pattern detection type definitions for security analysis
 */

import {
  VulnerabilityType,
  SeverityLevel,
  ConfidenceLevel,
} from "./vulnerability.types";

export type PatternMatchType = "regex" | "string" | "ast-node" | "context";

export type ASTNodeType =
  | "CallExpression"
  | "MemberExpression"
  | "StringLiteral"
  | "Identifier"
  | "PropertyAccessExpression"
  | "VariableDeclaration"
  | "JSXElement"
  | "JSXAttribute";

export interface PatternMatch {
  /** The matched text/code */
  match: string;
  /** Start position in the content */
  startIndex: number;
  /** End position in the content */
  endIndex: number;
  /** Line number where match was found */
  line: number;
  /** Column number where match was found */
  column: number;
  /** Captured groups from regex match (if applicable) */
  groups?: string[];
  /** Additional context around the match */
  context?: string;
}

export interface RegexPattern {
  /** Pattern type identifier */
  type: "regex";
  /** The regular expression */
  expression: RegExp;
  /** Flags for the regex */
  flags?: string;
  /** Whether to match case-sensitively */
  caseSensitive?: boolean;
  /** Maximum number of matches to find */
  maxMatches?: number;
}

export interface StringPattern {
  /** Pattern type identifier */
  type: "string";
  /** The string to match */
  value: string;
  /** Whether to match case-sensitively */
  caseSensitive?: boolean;
  /** Whether to match whole words only */
  wholeWord?: boolean;
}

export interface ASTPattern {
  /** Pattern type identifier */
  type: "ast-node";
  /** Type of AST node to match */
  nodeType: ASTNodeType;
  /** Additional conditions for the node */
  conditions?: ASTNodeConditions;
}

export interface ContextPattern {
  /** Pattern type identifier */
  type: "context";
  /** Patterns that must be present in the context */
  requiredPatterns: (RegexPattern | StringPattern)[];
  /** Patterns that must not be present in the context */
  excludedPatterns?: (RegexPattern | StringPattern)[];
  /** Context scope (lines before/after to check) */
  contextScope?: number;
}

export type DetectionPattern =
  | RegexPattern
  | StringPattern
  | ASTPattern
  | ContextPattern;

export interface ASTNodeConditions {
  /** Property conditions for the AST node */
  properties?: Record<string, unknown>;
  /** Parent node conditions */
  parentType?: ASTNodeType;
  /** Child node conditions */
  hasChild?: ASTNodeType;
  /** Custom validation function */
  customValidator?: (node: unknown) => boolean;
}

export interface PatternDefinition {
  /** Unique pattern identifier */
  id: string;
  /** Human-readable pattern name */
  name: string;
  /** Pattern description */
  description: string;
  /** The detection pattern */
  pattern: DetectionPattern;
  /** Vulnerability type this pattern detects */
  vulnerabilityType: VulnerabilityType;
  /** Severity of detected vulnerabilities */
  severity: SeverityLevel;
  /** Confidence level of this pattern */
  confidence: ConfidenceLevel;
  /** File types this pattern applies to */
  fileTypes?: string[];
  /** Whether pattern is enabled */
  enabled: boolean;
}

export interface PatternGroup {
  /** Group identifier */
  id: string;
  /** Group name */
  name: string;
  /** Group description */
  description: string;
  /** Patterns in this group */
  patterns: PatternDefinition[];
  /** Group priority (higher = checked first) */
  priority: number;
}

export interface PatternMatchResult {
  /** The pattern that matched */
  pattern: PatternDefinition;
  /** All matches found */
  matches: PatternMatch[];
  /** File path where matches were found */
  filePath: string;
  /** Whether additional validation is needed */
  requiresValidation: boolean;
}

export interface SecretPattern extends PatternDefinition {
  /** Entropy threshold for secret detection */
  entropyThreshold?: number;
  /** Minimum length for potential secrets */
  minLength?: number;
  /** Maximum length for potential secrets */
  maxLength?: number;
  /** Known prefixes for this secret type */
  knownPrefixes?: string[];
  /** Known suffixes for this secret type */
  knownSuffixes?: string[];
}

export interface SecurityHeaderPattern extends PatternDefinition {
  /** Expected header configuration */
  expectedConfig?: Record<string, string | boolean>;
  /** Whether header is required */
  isRequired: boolean;
  /** Default secure values */
  secureDefaults?: Record<string, string>;
}
