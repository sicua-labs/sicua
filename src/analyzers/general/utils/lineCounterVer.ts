/**
 * Verification script for line counter accuracy
 * This provides multiple counting methods to cross-validate results
 */

import { countLines } from "./lineCounter";
import { LineMetrics } from "../types/generalAnalyzer.types";

/**
 * Simple line-by-line counter for verification
 */
export function simpleLineCount(content: string): LineMetrics {
  const lines = content.split("\n");
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      blankLines++;
    } else if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*")
    ) {
      commentLines++;
    } else {
      codeLines++;
    }
  }

  return {
    totalLines: lines.length,
    codeLines,
    commentLines,
    blankLines,
  };
}

/**
 * Regex-based counter for comparison
 */
export function regexLineCount(content: string): LineMetrics {
  const lines = content.split("\n");
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;

  const commentRegex = /^\s*(\/\/|\/\*|\*)/;
  const blankRegex = /^\s*$/;

  for (const line of lines) {
    if (blankRegex.test(line)) {
      blankLines++;
    } else if (commentRegex.test(line)) {
      commentLines++;
    } else {
      codeLines++;
    }
  }

  return {
    totalLines: lines.length,
    codeLines,
    commentLines,
    blankLines,
  };
}

/**
 * Manual counting method that handles edge cases more carefully
 */
export function detailedLineCount(content: string): LineMetrics & {
  mixedLines: number;
  details: string[];
} {
  const lines = content.split("\n");
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let mixedLines = 0;
  const details: string[] = [];

  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    let lineType = "unknown";

    // Handle blank lines
    if (trimmed === "") {
      blankLines++;
      lineType = "blank";
    } else {
      // Check for block comment boundaries
      const hasBlockStart = trimmed.includes("/*");
      const hasBlockEnd = trimmed.includes("*/");

      if (hasBlockStart && !inBlockComment) {
        inBlockComment = true;
      }

      if (inBlockComment) {
        commentLines++;
        lineType = "block-comment";

        if (hasBlockEnd) {
          inBlockComment = false;
        }
      } else if (trimmed.startsWith("//")) {
        commentLines++;
        lineType = "line-comment";
      } else {
        // Check for mixed lines (code + comments)
        const commentIndex = trimmed.indexOf("//");
        if (commentIndex > 0) {
          const beforeComment = trimmed.substring(0, commentIndex).trim();
          if (beforeComment.length > 0) {
            mixedLines++;
            codeLines++;
            lineType = "mixed";
          } else {
            commentLines++;
            lineType = "line-comment";
          }
        } else {
          codeLines++;
          lineType = "code";
        }
      }
    }

    // Store details for the first 20 lines for debugging
    if (i < 20) {
      details.push(`Line ${i + 1}: "${line}" -> ${lineType}`);
    }
  }

  return {
    totalLines: lines.length,
    codeLines,
    commentLines,
    blankLines,
    mixedLines,
    details,
  };
}

/**
 * Compare all counting methods and report discrepancies
 */
export function verifyLineCount(
  content: string,
  filePath?: string
): {
  allMatch: boolean;
  results: {
    original: LineMetrics;
    simple: LineMetrics;
    regex: LineMetrics;
    detailed: LineMetrics & { mixedLines: number; details: string[] };
  };
  discrepancies: string[];
} {
  const original = countLines(content);
  const simple = simpleLineCount(content);
  const regex = regexLineCount(content);
  const detailed = detailedLineCount(content);

  const results = { original, simple, regex, detailed };
  const discrepancies: string[] = [];

  // Compare total lines (should always match)
  const totals = [
    original.totalLines,
    simple.totalLines,
    regex.totalLines,
    detailed.totalLines,
  ];
  if (new Set(totals).size > 1) {
    discrepancies.push(`Total lines mismatch: ${totals.join(", ")}`);
  }

  // Compare code lines
  const codeCounts = [
    original.codeLines,
    simple.codeLines,
    regex.codeLines,
    detailed.codeLines,
  ];
  if (new Set(codeCounts).size > 1) {
    discrepancies.push(`Code lines mismatch: ${codeCounts.join(", ")}`);
  }

  // Compare comment lines
  const commentCounts = [
    original.commentLines,
    simple.commentLines,
    regex.commentLines,
    detailed.commentLines,
  ];
  if (new Set(commentCounts).size > 1) {
    discrepancies.push(`Comment lines mismatch: ${commentCounts.join(", ")}`);
  }

  // Compare blank lines
  const blankCounts = [
    original.blankLines,
    simple.blankLines,
    regex.blankLines,
    detailed.blankLines,
  ];
  if (new Set(blankCounts).size > 1) {
    discrepancies.push(`Blank lines mismatch: ${blankCounts.join(", ")}`);
  }

  // Check sum consistency
  const checkSum = (metrics: LineMetrics, label: string) => {
    const sum = metrics.codeLines + metrics.commentLines + metrics.blankLines;
    const tolerance = Math.ceil(metrics.totalLines * 0.01); // 1% tolerance for mixed lines

    if (Math.abs(metrics.totalLines - sum) > tolerance) {
      discrepancies.push(
        `${label}: Sum mismatch - Total: ${
          metrics.totalLines
        }, Sum: ${sum}, Diff: ${metrics.totalLines - sum}`
      );
    }
  };

  checkSum(original, "Original");
  checkSum(simple, "Simple");
  checkSum(regex, "Regex");

  const allMatch = discrepancies.length === 0;

  return {
    allMatch,
    results,
    discrepancies,
  };
}

/**
 * Lightweight verification that only returns accuracy percentage
 */
export function getLineCountAccuracy(content: string): boolean {
  const verification = verifyLineCount(content);
  return verification.allMatch;
}

/**
 * Batch accuracy checker for GeneralAnalyzer integration
 */
export class LineCountAccuracyTracker {
  private totalFiles = 0;
  private accurateFiles = 0;

  /**
   * Check a single file and update accuracy stats
   */
  checkFile(content: string, filePath?: string): boolean {
    this.totalFiles++;
    const isAccurate = getLineCountAccuracy(content);
    if (isAccurate) {
      this.accurateFiles++;
    }
    return isAccurate;
  }

  /**
   * Get current accuracy percentage
   */
  getAccuracy(): number {
    if (this.totalFiles === 0) return 100;
    return Math.round((this.accurateFiles / this.totalFiles) * 100);
  }

  /**
   * Get summary stats
   */
  getSummary(): {
    accuracy: number;
    accurateFiles: number;
    totalFiles: number;
    discrepancyFiles: number;
  } {
    return {
      accuracy: this.getAccuracy(),
      accurateFiles: this.accurateFiles,
      totalFiles: this.totalFiles,
      discrepancyFiles: this.totalFiles - this.accurateFiles,
    };
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.totalFiles = 0;
    this.accurateFiles = 0;
  }
}

/**
 * Run verification across multiple files and generate a summary report
 */
export function batchVerifyLineCount(
  files: { content: string; path: string }[],
  outputPath?: string
): {
  summary: {
    totalFiles: number;
    matchingFiles: number;
    discrepancyFiles: number;
    successRate: number;
  };
  discrepancies: Array<{
    filePath: string;
    issues: string[];
    results: {
      original: LineMetrics;
      simple: LineMetrics;
      regex: LineMetrics;
    };
  }>;
} {
  const discrepancies: Array<{
    filePath: string;
    issues: string[];
    results: {
      original: LineMetrics;
      simple: LineMetrics;
      regex: LineMetrics;
    };
  }> = [];

  let matchingFiles = 0;

  for (const file of files) {
    const verification = verifyLineCount(file.content, file.path);

    if (verification.allMatch) {
      matchingFiles++;
    } else {
      discrepancies.push({
        filePath: file.path,
        issues: verification.discrepancies,
        results: {
          original: verification.results.original,
          simple: verification.results.simple,
          regex: verification.results.regex,
        },
      });
    }
  }

  const summary = {
    totalFiles: files.length,
    matchingFiles,
    discrepancyFiles: discrepancies.length,
    successRate: Math.round((matchingFiles / files.length) * 100),
  };

  const report = {
    summary,
    discrepancies,
    generatedAt: new Date().toISOString(),
  };

  // Output to JSON file if path provided
  if (outputPath && typeof require !== "undefined") {
    try {
      const fs = require("fs");
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`📄 Verification report written to ${outputPath}`);
    } catch (error) {
      console.error(`Failed to write report to ${outputPath}:`, error);
    }
  }

  // Log concise summary
  console.log(`📊 Line Count Verification Summary:`);
  console.log(`   Files processed: ${summary.totalFiles}`);
  console.log(
    `   Matching: ${summary.matchingFiles} (${summary.successRate}%)`
  );
  console.log(`   Discrepancies: ${summary.discrepancyFiles}`);

  if (discrepancies.length > 0) {
    console.log(`\n⚠️  Files with discrepancies:`);
    discrepancies.slice(0, 5).forEach((disc) => {
      console.log(`   ${disc.filePath}: ${disc.issues.length} issue(s)`);
    });
    if (discrepancies.length > 5) {
      console.log(`   ... and ${discrepancies.length - 5} more`);
    }
  }

  return { summary, discrepancies };
}

/**
 * Test the line counter with various edge cases - silent version
 */
export function testLineCounterEdgeCases(): {
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; issues?: string[] }>;
} {
  const testCases = [
    {
      name: "Basic case",
      content: `// Comment
const x = 1;

/* Block comment */
const y = 2; // Inline comment`,
    },
    {
      name: "Mixed lines",
      content: `const a = 1; // Comment
const b = 2; /* inline block */
/* 
 * Multi-line
 * block comment
 */`,
    },
    {
      name: "Empty file",
      content: "",
    },
    {
      name: "Only comments",
      content: `// Comment 1
// Comment 2
/* Block */`,
    },
    {
      name: "Only blank lines",
      content: `


`,
    },
    {
      name: "Complex mixed",
      content: `const obj = { // Object start
  prop: 'value', // Property
  /* block */ another: 42
}; // End`,
    },
  ];

  const results: Array<{ name: string; passed: boolean; issues?: string[] }> =
    [];
  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase) => {
    const verification = verifyLineCount(testCase.content);

    if (verification.allMatch) {
      results.push({ name: testCase.name, passed: true });
      passed++;
    } else {
      results.push({
        name: testCase.name,
        passed: false,
        issues: verification.discrepancies,
      });
      failed++;
    }
  });

  return { passed, failed, results };
}

/**
 * Simple debug function for a single file - minimal output
 */
export function debugLineCount(content: string, fileName?: string): void {
  const verification = verifyLineCount(content, fileName);

  console.log(`📄 ${fileName || "File"} line count:`);
  console.log(`   Total: ${verification.results.original.totalLines}`);
  console.log(`   Code: ${verification.results.original.codeLines}`);
  console.log(`   Comments: ${verification.results.original.commentLines}`);
  console.log(`   Blank: ${verification.results.original.blankLines}`);

  if (!verification.allMatch) {
    console.log(`   ⚠️  Issues: ${verification.discrepancies.join(", ")}`);
  } else {
    console.log(`   ✅ Verified`);
  }
}
