/**
 * Utility for counting different types of lines in source code
 */

import { LineMetrics } from "../types/generalAnalyzer.types";

/**
 * Counts lines of code, comments, and blank lines in file content
 * @param content The file content as a string
 * @returns LineMetrics object with counts
 */
export function countLines(content: string): LineMetrics {
  const lines = content.split("\n");
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;

  let inBlockComment = false;
  let inJSDocComment = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Count blank lines
    if (trimmedLine === "") {
      blankLines++;
      continue;
    }

    // Check for JSDoc comment start/end (should be excluded)
    if (trimmedLine.includes("/**")) {
      inJSDocComment = true;
      blankLines++; // JSDoc lines count as blank/ignored
      continue;
    }

    // Check if we're in a JSDoc comment
    if (inJSDocComment) {
      blankLines++; // JSDoc lines count as blank/ignored
      if (trimmedLine.includes("*/")) {
        inJSDocComment = false;
      }
      continue;
    }

    // Check for regular block comment start/end (but not JSDoc)
    if (trimmedLine.includes("/*") && !trimmedLine.includes("/**")) {
      inBlockComment = true;
    }

    // Check if we're in a regular block comment
    if (inBlockComment) {
      commentLines++;
      if (trimmedLine.includes("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    // Check for single-line comments
    if (trimmedLine.startsWith("//")) {
      commentLines++;
      continue;
    }

    // Check for lines that have both code and comments
    const commentIndex = trimmedLine.indexOf("//");
    if (commentIndex > 0) {
      // Line has code before the comment
      const codeBeforeComment = trimmedLine.substring(0, commentIndex).trim();
      if (codeBeforeComment.length > 0) {
        codeLines++;
      } else {
        commentLines++;
      }
      continue;
    }

    // If we reach here, it's a code line
    codeLines++;
  }

  const totalLines = lines.length;

  return {
    totalLines,
    codeLines,
    commentLines,
    blankLines,
  };
}

/**
 * Calculates the code-to-comment ratio
 * @param lineMetrics The line metrics to calculate ratio from
 * @returns The ratio of code lines to comment lines (0 if no comments)
 */
export function calculateCodeToCommentRatio(lineMetrics: LineMetrics): number {
  if (lineMetrics.commentLines === 0) {
    return lineMetrics.codeLines > 0 ? Infinity : 0;
  }

  return Number((lineMetrics.codeLines / lineMetrics.commentLines).toFixed(2));
}
