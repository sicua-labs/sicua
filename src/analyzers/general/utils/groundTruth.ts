/**
 * Ground truth verification for line counting accuracy
 * This creates test cases with KNOWN correct answers to verify which method is right
 */

import { countLines } from "./lineCounter";
import {
  simpleLineCount,
  regexLineCount,
  detailedLineCount,
} from "./lineCounterVer";

interface GroundTruthTest {
  name: string;
  content: string;
  expected: {
    totalLines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };
  explanation: string;
}

/**
 * Test cases with manually verified correct answers
 */
const GROUND_TRUTH_TESTS: GroundTruthTest[] = [
  {
    name: "Simple case",
    content: `const x = 1;
// This is a comment
const y = 2;`,
    expected: {
      totalLines: 3,
      codeLines: 2,
      commentLines: 1,
      blankLines: 0,
    },
    explanation: "2 code lines, 1 comment line, 0 blank lines",
  },

  {
    name: "Mixed line (code + comment)",
    content: `const x = 1; // Inline comment
const y = 2;`,
    expected: {
      totalLines: 2,
      codeLines: 2, // This should count as CODE, not comment
      commentLines: 0, // The comment is part of the code line
      blankLines: 0,
    },
    explanation: "Mixed lines should count as CODE lines, not comment lines",
  },

  {
    name: "Block comment",
    content: `/*
 * Multi-line comment
 * Another line
 */
const x = 1;`,
    expected: {
      totalLines: 5,
      codeLines: 1,
      commentLines: 4,
      blankLines: 0,
    },
    explanation: "4 comment lines, 1 code line",
  },

  {
    name: "JSDoc (should be excluded)",
    content: `/**
 * JSDoc comment - should NOT count as comment
 * @param x parameter
 */
const func = (x) => x;`,
    expected: {
      totalLines: 5,
      codeLines: 1,
      commentLines: 0, // JSDoc should be excluded
      blankLines: 4, // JSDoc lines count as blank/ignored
    },
    explanation: "JSDoc should be excluded per requirements",
  },

  {
    name: "Blank lines",
    content: `const x = 1;

const y = 2;

`,
    expected: {
      totalLines: 5,
      codeLines: 2,
      commentLines: 0,
      blankLines: 3,
    },
    explanation: "2 code lines, 3 blank lines",
  },

  {
    name: "Complex mixed",
    content: `const obj = { // Start object
  prop: 'value', // Property comment
  
  /* Block comment */
  other: 42
}; // End object`,
    expected: {
      totalLines: 6,
      codeLines: 4, // Lines with actual code (even if they have comments)
      commentLines: 1, // Only the pure block comment line
      blankLines: 1,
    },
    explanation:
      "Mixed lines should count as code, pure comment lines as comments",
  },
];

/**
 * Run ground truth verification
 */
export function verifyLineCounterAccuracy(): {
  results: {
    original: { correct: number; total: number; accuracy: number };
    simple: { correct: number; total: number; accuracy: number };
    regex: { correct: number; total: number; accuracy: number };
    detailed: { correct: number; total: number; accuracy: number };
  };
  failures: Array<{
    testName: string;
    expected: any;
    results: {
      original: any;
      simple: any;
      regex: any;
      detailed: any;
    };
  }>;
} {
  const results = {
    original: { correct: 0, total: GROUND_TRUTH_TESTS.length, accuracy: 0 },
    simple: { correct: 0, total: GROUND_TRUTH_TESTS.length, accuracy: 0 },
    regex: { correct: 0, total: GROUND_TRUTH_TESTS.length, accuracy: 0 },
    detailed: { correct: 0, total: GROUND_TRUTH_TESTS.length, accuracy: 0 },
  };

  const failures: Array<{
    testName: string;
    expected: any;
    results: any;
  }> = [];

  GROUND_TRUTH_TESTS.forEach((test) => {
    // Run all counting methods silently
    const original = countLines(test.content);
    const simple = simpleLineCount(test.content);
    const regex = regexLineCount(test.content);
    const detailed = detailedLineCount(test.content);

    const testResults = { original, simple, regex, detailed };

    // Check each method against expected results
    const checkMethod = (
      methodName: "original" | "simple" | "regex" | "detailed",
      result: any
    ) => {
      const matches =
        result.totalLines === test.expected.totalLines &&
        result.codeLines === test.expected.codeLines &&
        result.commentLines === test.expected.commentLines &&
        result.blankLines === test.expected.blankLines;

      if (matches) {
        results[methodName].correct++;
      }

      return matches;
    };

    const originalCorrect = checkMethod("original", original);
    const simpleCorrect = checkMethod("simple", simple);
    const regexCorrect = checkMethod("regex", regex);
    const detailedCorrect = checkMethod("detailed", detailed);

    // If any method failed, record the failure
    if (
      !originalCorrect ||
      !simpleCorrect ||
      !regexCorrect ||
      !detailedCorrect
    ) {
      failures.push({
        testName: test.name,
        expected: test.expected,
        results: testResults,
      });
    }
  });

  // Calculate accuracies
  Object.keys(results).forEach((method) => {
    const methodResults = results[method as keyof typeof results];
    methodResults.accuracy = Math.round(
      (methodResults.correct / methodResults.total) * 100
    );
  });

  // Only log summary
  console.log("📊 Ground Truth Verification Results:");
  console.log(
    `   Original method: ${results.original.accuracy}% (${results.original.correct}/${results.original.total})`
  );
  console.log(
    `   Simple method:   ${results.simple.accuracy}% (${results.simple.correct}/${results.simple.total})`
  );
  console.log(
    `   Regex method:    ${results.regex.accuracy}% (${results.regex.correct}/${results.regex.total})`
  );
  console.log(
    `   Detailed method: ${results.detailed.accuracy}% (${results.detailed.correct}/${results.detailed.total})`
  );

  if (failures.length > 0) {
    console.log(
      `❌ ${failures.length} test case(s) failed. Failed tests: ${failures
        .map((f) => f.testName)
        .join(", ")}`
    );
  } else {
    console.log(`✅ All methods passed all ground truth tests!`);
  }

  return { results, failures };
}

/**
 * Identify which counting method is most accurate
 */
export function findMostAccurateMethod(): string {
  const verification = verifyLineCounterAccuracy();
  const accuracies = verification.results;

  let bestMethod = "original";
  let bestAccuracy = accuracies.original.accuracy;

  Object.entries(accuracies).forEach(([method, stats]) => {
    if (stats.accuracy > bestAccuracy) {
      bestMethod = method;
      bestAccuracy = stats.accuracy;
    }
  });

  console.log(
    `🏆 Most accurate method: ${bestMethod} (${bestAccuracy}% accuracy)`
  );

  if (bestAccuracy < 100) {
    console.log(
      "⚠️  No method achieved 100% accuracy - line counter needs fixes!"
    );
  }

  return bestMethod;
}

/**
 * Quick test to see which methods agree with ground truth
 */
export function quickGroundTruthTest(): {
  mostAccurate: string;
  allAccuracies: { [key: string]: number };
  needsFixes: boolean;
} {
  const verification = verifyLineCounterAccuracy();
  const accuracies = Object.fromEntries(
    Object.entries(verification.results).map(([method, stats]) => [
      method,
      stats.accuracy,
    ])
  );

  const mostAccurate = findMostAccurateMethod();
  const needsFixes = Math.max(...Object.values(accuracies)) < 100;

  return {
    mostAccurate,
    allAccuracies: accuracies,
    needsFixes,
  };
}
