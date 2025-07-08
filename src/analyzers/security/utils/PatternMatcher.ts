/**
 * Pattern matching utilities for security vulnerability detection
 */

import {
  DetectionPattern,
  PatternMatch,
  RegexPattern,
  StringPattern,
  ContextPattern,
  PatternMatchResult,
  PatternDefinition,
} from "../types/pattern.types";

export class PatternMatcher {
  private static readonly DEFAULT_CONTEXT_LINES = 3;
  private static readonly MAX_MATCHES_PER_PATTERN = 1000;

  /**
   * Find all matches for a given pattern in content
   */
  static findMatches(
    pattern: DetectionPattern,
    content: string
  ): PatternMatch[] {
    switch (pattern.type) {
      case "regex":
        return this.findRegexMatches(pattern, content);
      case "string":
        return this.findStringMatches(pattern, content);
      case "context":
        return this.findContextMatches(pattern, content);
      default:
        return [];
    }
  }

  /**
   * Find regex pattern matches
   */
  private static findRegexMatches(
    pattern: RegexPattern,
    content: string
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const regex = new RegExp(
      pattern.expression.source,
      pattern.flags || pattern.expression.flags
    );

    let match: RegExpExecArray | null;
    let matchCount = 0;
    const maxMatches = pattern.maxMatches || this.MAX_MATCHES_PER_PATTERN;

    while ((match = regex.exec(content)) !== null && matchCount < maxMatches) {
      const location = this.getLocationFromIndex(content, match.index);
      const context = this.extractContext(
        content,
        match.index,
        match[0].length
      );

      matches.push({
        match: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        line: location.line,
        column: location.column,
        groups: match.slice(1),
        context,
      });

      matchCount++;

      // Prevent infinite loops with global regex
      if (!regex.global) break;
    }

    return matches;
  }

  /**
   * Find string pattern matches
   */
  private static findStringMatches(
    pattern: StringPattern,
    content: string
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const searchValue = pattern.caseSensitive
      ? pattern.value
      : pattern.value.toLowerCase();
    const searchContent = pattern.caseSensitive
      ? content
      : content.toLowerCase();

    let startIndex = 0;
    let foundIndex: number;

    while (
      (foundIndex = searchContent.indexOf(searchValue, startIndex)) !== -1
    ) {
      // Check whole word constraint if specified
      if (
        pattern.wholeWord &&
        !this.isWholeWordMatch(content, foundIndex, pattern.value.length)
      ) {
        startIndex = foundIndex + 1;
        continue;
      }

      const location = this.getLocationFromIndex(content, foundIndex);
      const context = this.extractContext(
        content,
        foundIndex,
        pattern.value.length
      );

      matches.push({
        match: content.substring(foundIndex, foundIndex + pattern.value.length),
        startIndex: foundIndex,
        endIndex: foundIndex + pattern.value.length,
        line: location.line,
        column: location.column,
        context,
      });

      startIndex = foundIndex + pattern.value.length;
    }

    return matches;
  }

  /**
   * Find context-based pattern matches
   */
  private static findContextMatches(
    pattern: ContextPattern,
    content: string
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const lines = content.split("\n");
    const contextScope = pattern.contextScope || this.DEFAULT_CONTEXT_LINES;

    // Find all required patterns first
    const requiredMatches = pattern.requiredPatterns
      .map((reqPattern) => this.findMatches(reqPattern, content))
      .flat();

    // For each required match, check if context conditions are met
    for (const reqMatch of requiredMatches) {
      const lineIndex = reqMatch.line - 1;
      const startLine = Math.max(0, lineIndex - contextScope);
      const endLine = Math.min(lines.length - 1, lineIndex + contextScope);

      const contextLines = lines.slice(startLine, endLine + 1);
      const contextContent = contextLines.join("\n");

      // Check if any excluded patterns are present in context
      let hasExcludedPattern = false;
      if (pattern.excludedPatterns) {
        for (const excludedPattern of pattern.excludedPatterns) {
          const excludedMatches = this.findMatches(
            excludedPattern,
            contextContent
          );
          if (excludedMatches.length > 0) {
            hasExcludedPattern = true;
            break;
          }
        }
      }

      // Add match if no excluded patterns found
      if (!hasExcludedPattern) {
        matches.push({
          ...reqMatch,
          context: contextContent,
        });
      }
    }

    return matches;
  }

  /**
   * Check if a string match represents a whole word
   */
  private static isWholeWordMatch(
    content: string,
    startIndex: number,
    length: number
  ): boolean {
    const wordRegex = /\w/;

    // Check character before match
    if (startIndex > 0) {
      const charBefore = content[startIndex - 1];
      if (wordRegex.test(charBefore)) {
        return false;
      }
    }

    // Check character after match
    const endIndex = startIndex + length;
    if (endIndex < content.length) {
      const charAfter = content[endIndex];
      if (wordRegex.test(charAfter)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get line and column from character index
   */
  private static getLocationFromIndex(
    content: string,
    index: number
  ): { line: number; column: number } {
    const beforeMatch = content.substring(0, index);
    const lines = beforeMatch.split("\n");

    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  /**
   * Extract surrounding context for a match
   */
  private static extractContext(
    content: string,
    startIndex: number,
    contextLines: number = this.DEFAULT_CONTEXT_LINES
  ): string {
    const lines = content.split("\n");
    const location = this.getLocationFromIndex(content, startIndex);
    const lineIndex = location.line - 1;

    const startLine = Math.max(0, lineIndex - contextLines);
    const endLine = Math.min(lines.length - 1, lineIndex + contextLines);

    return lines.slice(startLine, endLine + 1).join("\n");
  }

  /**
   * Apply a pattern definition to content and return results
   */
  static applyPattern(
    patternDef: PatternDefinition,
    content: string,
    filePath: string
  ): PatternMatchResult {
    const matches = this.findMatches(patternDef.pattern, content);

    return {
      pattern: patternDef,
      matches,
      filePath,
      requiresValidation:
        patternDef.pattern.type === "context" ||
        matches.some((m) => m.groups && m.groups.length > 0),
    };
  }

  /**
   * Calculate entropy of a string (useful for secret detection)
   */
  static calculateEntropy(str: string): number {
    const frequencies: Record<string, number> = {};

    // Count character frequencies
    for (const char of str) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    const length = str.length;

    for (const count of Object.values(frequencies)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Check if a string looks like a potential secret based on entropy and patterns
   */
  static isPotentialSecret(
    str: string,
    minEntropy: number = 4.5,
    minLength: number = 16
  ): boolean {
    if (str.length < minLength) {
      return false;
    }

    const entropy = this.calculateEntropy(str);
    if (entropy < minEntropy) {
      return false;
    }

    // Additional heuristics for secret-like strings
    const hasNumbers = /\d/.test(str);
    const hasLetters = /[a-zA-Z]/.test(str);
    const hasSpecialChars = /[^a-zA-Z0-9]/.test(str);

    // Likely a secret if it has mixed character types
    return (hasNumbers && hasLetters) || hasSpecialChars;
  }
}
