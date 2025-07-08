/**
 * Constants for debug, console, and development detection
 */

// Console methods used for logging (some are debug-specific)
export const CONSOLE_METHODS = [
  // Standard logging methods
  "log",
  "info",
  "warn",
  "error",

  // Debug-specific methods
  "debug",
  "trace",
  "assert",
  "count",
  "countReset",

  // Grouping methods
  "group",
  "groupCollapsed",
  "groupEnd",

  // Timing methods
  "time",
  "timeEnd",
  "timeLog",
  "timeStamp",

  // Profiling methods (should be removed in production)
  "profile",
  "profileEnd",
  "timeline",
  "timelineEnd",

  // Table and formatting
  "table",
  "dir",
  "dirxml",
  "clear",
];

// Debug-specific console methods (higher severity)
export const DEBUG_CONSOLE_METHODS = [
  "debug",
  "trace",
  "group",
  "groupCollapsed",
  "groupEnd",
  "time",
  "timeEnd",
  "timeLog",
  "profile",
  "profileEnd",
  "timeline",
  "timelineEnd",
  "count",
  "countReset",
  "table",
  "dir",
  "dirxml",
];

// Placeholder patterns for hardcoded secrets detection
export const PLACEHOLDER_PATTERNS = [
  // Generic placeholders
  /^(your|my|test|example|demo|sample)/i,
  /^(xxx+|yyy+|zzz+)/i,
  /^(123+|abc+|test)/i,
  /placeholder/i,
  /example/i,
  /^[a-z]+$/i, // All lowercase might be placeholder

  // Specific placeholder formats
  /^<.*>$/, // <your-api-key>
  /^\[.*\]$/, // [your-secret]
  /^\{.*\}$/, // {api-key}
  /^TODO/i,
  /^FIXME/i,
  /^CHANGE/i,
  /^REPLACE/i,

  // Common placeholder values
  /^(enter|insert|add|put).*here/i,
  /^(your|my).*(key|token|secret|password)/i,
  /^(api|secret|token|key).*(here|value|goes)/i,
];

// Development and debug flag patterns
export const DEBUG_FLAG_PATTERNS = [
  // Boolean debug flags
  /(?:debug|DEBUG|isDebug|debugMode|isDev|devMode)\s*[:=]\s*true/g,
  /(?:DEVELOPMENT|DEV_MODE|DEBUG_MODE)\s*[:=]\s*true/g,

  // String debug flags
  /NODE_ENV\s*[:=]\s*['"]development['"]/g,
  /ENVIRONMENT\s*[:=]\s*['"]dev['"]/g,

  // Function calls
  /setDebug\s*\(\s*true\s*\)/g,
  /enableDebug\s*\(\s*\)/g,
  /debug\s*\(\s*true\s*\)/g,
];

// Code comment patterns that indicate debug/temp code
export const DEBUG_COMMENT_PATTERNS = [
  // TODO and FIXME comments
  /\/\/\s*TODO/i,
  /\/\/\s*FIXME/i,
  /\/\/\s*HACK/i,
  /\/\/\s*XXX/i,
  /\/\/\s*BUG/i,

  // Temporary code indicators
  /\/\/\s*temp/i,
  /\/\/\s*temporary/i,
  /\/\/\s*remove/i,
  /\/\/\s*delete/i,
  /\/\/\s*test/i,

  // Debug indicators
  /\/\/\s*debug/i,
  /\/\/\s*testing/i,
  /\/\/\s*for.*debug/i,

  // Block comments
  /\/\*\s*TODO/i,
  /\/\*\s*FIXME/i,
  /\/\*\s*DEBUG/i,
  /\/\*\s*TEMP/i,
];

// Development environment checking patterns (proper gating)
export const ENV_GATING_PATTERNS = [
  // Process environment checks
  /if\s*\(\s*process\.env\.NODE_ENV\s*[!=]==?\s*['"]production['"]/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]development['"]/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]test['"]/,

  // Custom environment flags
  /if\s*\(\s*process\.env\.DEBUG\s*[&|]/,
  /if\s*\(\s*process\.env\.DEV_MODE\s*[&|]/,
  /if\s*\(\s*process\.env\.DEVELOPMENT\s*[&|]/,

  // Runtime development checks
  /if\s*\(\s*isDev\s*[&|]/,
  /if\s*\(\s*isDebug\s*[&|]/,
  /if\s*\(\s*debugMode\s*[&|]/,
  /if\s*\(\s*__DEV__\s*[&|]/,

  // Negated production checks
  /if\s*\(\s*!\s*isProduction/,
  /if\s*\(\s*!\s*isProd/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*!==?\s*['"]production['"]/,
];

// Debugging library patterns
export const DEBUG_LIBRARY_PATTERNS = [
  // Popular debug libraries
  /require\(['"`]debug['"`]\)/,
  /import.*debug.*from\s*['"`]debug['"`]/,
  /console-log-level/,
  /loglevel/,
  /winston/,
  /bunyan/,
  /pino/,

  // Browser debugging tools
  /eruda/,
  /vconsole/,
  /firebug/,
  /debug\.js/,

  // React debugging
  /react-devtools/,
  /why-did-you-render/,
  /react-hot-loader/,

  // Development middleware
  /webpack-dev-middleware/,
  /webpack-hot-middleware/,
  /browser-sync/,
];

// Production debugging indicators (should be removed)
export const PRODUCTION_DEBUG_INDICATORS = [
  // Console methods that shouldn't be in production
  "console.debug",
  "console.trace",
  "console.group",
  "console.time",
  "console.profile",
  "console.assert",

  // Debug flags set to true
  "debug: true",
  "DEBUG: true",
  "isDebug: true",
  "debugMode: true",
  "isDev: true",
  "devMode: true",

  // Development-only libraries
  "react-hot-loader",
  "webpack-dev-server",
  "nodemon",
  "browser-sync",
  "live-reload",
  "hot-reload",
];

// Debugging utility functions that indicate debug code
export const DEBUG_UTILITY_FUNCTIONS = [
  // Custom debug functions
  "debugLog",
  "debugInfo",
  "debugWarn",
  "debugError",
  "logDebug",
  "debug",
  "trace",
  "dump",
  "inspect",

  // Development helpers
  "devLog",
  "devInfo",
  "developmentLog",
  "testLog",
  "tempLog",
  "temporaryLog",
  "removeMe",
  "deleteMe",

  // Profiling functions
  "startTimer",
  "endTimer",
  "measurePerformance",
  "benchmark",
  "profile",
  "monitor",
  "watch",

  // State inspection
  "dumpState",
  "printState",
  "logState",
  "showState",
  "debugState",
  "inspectProps",
  "logProps",
];

// Test environment indicators
export const TEST_ENVIRONMENT_INDICATORS = [
  // Test frameworks
  "jest",
  "mocha",
  "jasmine",
  "vitest",
  "ava",
  "tape",
  "cypress",
  "playwright",
  "puppeteer",
  "selenium",

  // Test utilities
  "enzyme",
  "testing-library",
  "@testing-library",
  "sinon",
  "chai",
  "expect",
  "should",
  "supertest",

  // Test globals
  "describe",
  "it",
  "test",
  "beforeEach",
  "afterEach",
  "beforeAll",
  "afterAll",
  "suite",
  "setup",
  "teardown",

  // Test file patterns
  ".test.",
  ".spec.",
  "__tests__",
  "__mocks__",
  "/test/",
  "/tests/",
  "/spec/",
  "test-utils",
];

// Development server and build tool indicators
export const DEV_TOOL_INDICATORS = [
  // Development servers
  "webpack-dev-server",
  "vite",
  "parcel",
  "rollup",
  "create-react-app",
  "next dev",
  "nuxt dev",
  "svelte-kit dev",

  // Build tools
  "webpack",
  "esbuild",
  "swc",
  "babel",
  "typescript",
  "postcss",
  "sass",
  "less",
  "stylus",

  // Development middleware
  "cors",
  "morgan",
  "helmet",
  "compression",
  "body-parser",
  "cookie-parser",
  "express-session",

  // Hot reloading
  "hot-reload",
  "live-reload",
  "fast-refresh",
  "hmr",
  "hot-module-replacement",
];
