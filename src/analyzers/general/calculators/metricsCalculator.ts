/**
 * Utility for calculating aggregated metrics from individual file analysis
 */

import {
  LineMetrics,
  CodeMetrics,
  MagicNumber,
} from "../types/generalAnalyzer.types";

/**
 * Aggregates line metrics from multiple files
 * @param fileMetrics Array of line metrics from individual files
 * @returns Aggregated line metrics
 */
export function aggregateLineMetrics(fileMetrics: LineMetrics[]): LineMetrics {
  return fileMetrics.reduce(
    (total, current) => ({
      totalLines: total.totalLines + current.totalLines,
      codeLines: total.codeLines + current.codeLines,
      commentLines: total.commentLines + current.commentLines,
      blankLines: total.blankLines + current.blankLines,
    }),
    {
      totalLines: 0,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
    }
  );
}

/**
 * Calculates the code-to-comment ratio from aggregated metrics
 * @param lineMetrics The aggregated line metrics
 * @returns The ratio of code lines to comment lines
 */
export function calculateCodeToCommentRatio(lineMetrics: LineMetrics): number {
  if (lineMetrics.commentLines === 0) {
    return lineMetrics.codeLines > 0 ? Infinity : 0;
  }

  return Number((lineMetrics.codeLines / lineMetrics.commentLines).toFixed(2));
}

/**
 * Aggregates magic numbers from multiple files
 * @param fileMagicNumbers Array of magic number arrays from individual files
 * @returns Flattened array of all magic numbers
 */
export function aggregateMagicNumbers(
  fileMagicNumbers: MagicNumber[][]
): MagicNumber[] {
  return fileMagicNumbers.flat();
}

/**
 * Builds the complete code metrics object
 * @param lineMetrics Aggregated line metrics
 * @param magicNumbers All detected magic numbers
 * @returns Complete code metrics object
 */
export function buildCodeMetrics(
  lineMetrics: LineMetrics,
  magicNumbers: MagicNumber[]
): CodeMetrics {
  return {
    lineMetrics,
    codeToCommentRatio: calculateCodeToCommentRatio(lineMetrics),
    magicNumbers,
    totalMagicNumbers: magicNumbers.length,
  };
}

/**
 * Validates that line metrics are consistent
 * @param lineMetrics The line metrics to validate
 * @returns True if metrics are valid
 */
export function validateLineMetrics(lineMetrics: LineMetrics): boolean {
  const { totalLines, codeLines, commentLines, blankLines } = lineMetrics;

  // Total should equal sum of parts
  const calculatedTotal = codeLines + commentLines + blankLines;

  // Allow for small discrepancies due to mixed lines (code + comments)
  const tolerance = Math.ceil(totalLines * 0.01); // 1% tolerance

  return Math.abs(totalLines - calculatedTotal) <= tolerance;
}
