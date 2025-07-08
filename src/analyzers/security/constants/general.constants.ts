/**
 * General constants and utilities used across multiple security detectors
 */

// Test context indicators (used by multiple detectors to exclude test code)
export const TEST_INDICATORS = [
  // Test framework functions
  "describe(",
  "it(",
  "test(",
  "expect(",
  "assert(",
  "beforeEach(",
  "afterEach(",
  "beforeAll(",
  "afterAll(",
  "suite(",
  "setup(",
  "teardown(",
  "context(",

  // Test libraries
  "jest.",
  "jasmine.",
  "mocha.",
  "chai.",
  "sinon.",
  "enzyme.",
  "cypress.",
  "playwright.",
  "puppeteer.",

  // Test matchers and assertions
  ".toBe(",
  ".toEqual(",
  ".toHaveBeenCalled(",
  ".toHaveBeenCalledWith(",
  ".toContain(",
  ".toMatch(",
  ".toThrow(",
  ".toBeNull(",
  ".toBeTruthy(",
  ".toBeFalsy(",
  ".toBeUndefined(",

  // Test utilities
  ".mock",
  ".spy",
  ".stub",
  ".fake",
  ".restore",
  "render(",
  "shallow(",
  "mount(",
  "fireEvent.",
  "screen.",
  "userEvent.",
  "waitFor(",
  "act(",

  // Test file indicators
  "__tests__",
  "__mocks__",
  "test-utils",
  "spec-helper",
];

// Configuration file patterns
export const CONFIG_FILES = [
  // Next.js configuration
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",

  // Build tool configurations
  "webpack.config.js",
  "webpack.config.ts",
  "vite.config.js",
  "vite.config.ts",
  "rollup.config.js",
  "rollup.config.ts",

  // TypeScript configuration
  "tsconfig.json",
  "tsconfig.build.json",
  "tsconfig.dev.json",
  "jsconfig.json",

  // Package management
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",

  // Linting and formatting
  ".eslintrc.js",
  ".eslintrc.json",
  ".eslintrc.yaml",
  "prettier.config.js",
  ".prettierrc",
  ".prettierrc.json",

  // CSS frameworks
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "postcss.config.ts",

  // Testing configuration
  "jest.config.js",
  "jest.config.ts",
  "vitest.config.js",
  "cypress.config.js",
  "playwright.config.js",

  // Environment files
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  ".env.staging",
  ".env.example",

  // Docker and deployment
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "vercel.json",
  "netlify.toml",
  ".github/workflows/",

  // Editor configuration
  ".vscode/",
  ".editorconfig",
  ".gitignore",
  ".gitattributes",
];

// Critical HTML/JSX attributes (high security risk)
export const CRITICAL_HTML_ATTRIBUTES = [
  // Script and resource loading
  "src",
  "href",
  "action",
  "formAction",

  // Frame and embedding
  "srcdoc",
  "srcset",
  "data",
  "codebase",

  // Event handlers
  "onclick",
  "onload",
  "onerror",
  "onmouseover",
  "onsubmit",
  "onfocus",
  "onblur",
  "onchange",
];

// High-risk HTML/JSX attributes (medium security risk)
export const HIGH_RISK_HTML_ATTRIBUTES = [
  // Navigation and linking
  "target",
  "rel",
  "download",
  "ping",

  // Form handling
  "method",
  "enctype",
  "autocomplete",

  // Content and styling
  "style",
  "class",
  "id",
  "title",

  // Meta and SEO
  "content",
  "name",
  "property",
  "http-equiv",
];

// File extensions for security analysis
export const SECURITY_FILE_EXTENSIONS = [
  // TypeScript and JavaScript
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",

  // Configuration files
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",

  // Environment files
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",

  // Key and certificate files
  ".pem",
  ".key",
  ".crt",
  ".cert",
  ".p12",
  ".pfx",

  // Database files
  ".sql",
  ".db",
  ".sqlite",
  ".sqlite3",
];

// Comment patterns for different languages
export const COMMENT_PATTERNS = {
  singleLine: [
    /\/\/.*$/gm, // JavaScript, TypeScript, C++, Java
    /#.*$/gm, // Python, Ruby, Bash, YAML
    /--.*$/gm, // SQL, Haskell
    /;.*$/gm, // Assembly, Lisp
  ],
  multiLine: [
    /\/\*[\s\S]*?\*\//g, // JavaScript, TypeScript, C, C++, Java
    /"""[\s\S]*?"""/g, // Python docstrings
    /'''[\s\S]*?'''/g, // Python docstrings
    /<!--[\s\S]*?-->/g, // HTML, XML
  ],
};

// Binary and compiled file extensions (should be excluded)
export const BINARY_FILE_EXTENSIONS = [
  // Executable files
  ".exe",
  ".bin",
  ".app",
  ".deb",
  ".rpm",
  ".msi",

  // Archive files
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".7z",
  ".rar",

  // Image files
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".svg",
  ".ico",
  ".webp",

  // Video and audio
  ".mp4",
  ".avi",
  ".mov",
  ".mp3",
  ".wav",
  ".ogg",

  // Font files
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".eot",

  // Document files
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

// Directory patterns to exclude from security scanning
export const EXCLUDED_DIRECTORIES = [
  // Dependencies
  "node_modules",
  "bower_components",
  "vendor",

  // Build outputs
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "public/build",
  "static/build",
  "assets/build",

  // Version control
  ".git",
  ".svn",
  ".hg",
  ".bzr",

  // IDE and editor
  ".vscode",
  ".idea",
  ".eclipse",
  ".settings",

  // OS generated
  ".DS_Store",
  "Thumbs.db",
  "__MACOSX",

  // Cache directories
  ".cache",
  ".tmp",
  ".temp",
  "tmp",
  "temp",
  ".parcel-cache",
  ".webpack-cache",
  ".eslintcache",

  // Test coverage
  "coverage",
  ".nyc_output",
  ".coverage",

  // Logs
  "logs",
  "*.log",
  "npm-debug.log*",
  "yarn-debug.log*",
];

// Security-related file patterns
export const SECURITY_FILE_PATTERNS = [
  // Environment files
  /\.env(\.[a-z]+)?$/,

  // Key and certificate files
  /\.(key|pem|crt|cert|p12|pfx)$/,

  // Configuration files with secrets
  /secrets?\.(json|yaml|yml)$/,
  /config\.(json|yaml|yml)$/,

  // Database files
  /\.(sql|db|sqlite3?)$/,

  // Backup files
  /\.(bak|backup|old|orig)$/,

  // Temporary files
  /\.(tmp|temp|swp|swo)$/,
  /~$/,
];

// Common vulnerability keywords (for general detection)
export const VULNERABILITY_KEYWORDS = [
  // Injection vulnerabilities
  "injection",
  "xss",
  "csrf",
  "sqli",
  "nosqli",
  "command-injection",
  "code-injection",
  "ldap-injection",

  // Authentication issues
  "auth-bypass",
  "privilege-escalation",
  "session-fixation",
  "weak-auth",
  "broken-auth",
  "insecure-auth",

  // Data exposure
  "information-disclosure",
  "data-exposure",
  "sensitive-data",
  "path-traversal",
  "directory-traversal",
  "file-inclusion",

  // Cryptographic issues
  "weak-crypto",
  "broken-crypto",
  "insecure-random",
  "hash-collision",
  "timing-attack",
  "side-channel",

  // Configuration issues
  "misconfiguration",
  "default-credentials",
  "insecure-defaults",
  "missing-security-headers",
  "cors-misconfiguration",
];

// HTTP status codes related to security
export const SECURITY_HTTP_STATUS_CODES = {
  // Authentication and authorization
  401: "Unauthorized",
  403: "Forbidden",
  407: "Proxy Authentication Required",

  // Security-related client errors
  400: "Bad Request",
  406: "Not Acceptable",
  409: "Conflict",
  410: "Gone",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  429: "Too Many Requests",

  // Security-related server errors
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

// MIME types that may pose security risks
export const RISKY_MIME_TYPES = [
  // Executable content
  "application/javascript",
  "application/x-javascript",
  "text/javascript",
  "application/x-shockwave-flash",
  "application/x-silverlight",

  // Archive formats
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",

  // Document formats with macros
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.ms-word",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Script and code formats
  "text/x-python",
  "text/x-shellscript",
  "application/x-httpd-php",
];

// Character encoding patterns that may indicate obfuscation
export const OBFUSCATION_PATTERNS = [
  // Base64 patterns
  /[A-Za-z0-9+\/]{20,}={0,2}/,

  // Hex encoding
  /\\x[0-9a-fA-F]{2}/,
  /&#x[0-9a-fA-F]+;/,

  // Unicode escapes
  /\\u[0-9a-fA-F]{4}/,
  /\\U[0-9a-fA-F]{8}/,

  // URL encoding
  /%[0-9a-fA-F]{2}/,

  // HTML entities
  /&[a-zA-Z]+;/,
  /&#\d+;/,
];

export const CSS_PATTERNS = [
  "css",
  "color",
  "theme",
  "chart",
  "graph",
  "visual",
  "--color-",
  "rgb(",
  "rgba(",
  "hsl(",
  "hsla(",
  "px",
  "em",
  "rem",
  "%",
  "var(--",
  "oklch(",
  "@media",
];

export const NEXTJS_INDICATORS = [
  "/pages/",
  "/app/",
  "/_app.",
  "/_document.",
  "/api/",
  "next.config",
  ".next/",
];

export const DEPLOYMENT_CONFIGS = [
  "vercel.json",
  "netlify.toml",
  "_headers",
  "_redirects",
  "nginx.conf",
  "apache.conf",
  ".htaccess",
  "cloudflare.json",
];

export const UI_COOKIE_STATE_PATTERNS = [
  "sidebar",
  "theme",
  "language",
  "locale",
  "layout",
  "view",
  "display",
  "preference",
  "setting",
  "ui",
  "collapsed",
  "expanded",
  "selected",
  "tab",
  "page",
  "filter",
  "sort",
  "search",
  "accessibility",
];

export const FRAMEWORK_UI_PATTERNS = [
  "next-",
  "react-",
  "mui-",
  "chakra-",
  "mantine-",
  "antd-",
  "bootstrap-",
  "tailwind-",
];

export const TEST_FILE_INDICATORS = [
  ".test.",
  ".spec.",
  "__tests__",
  "__mocks__",
  "/test/",
  "/tests/",
  "/spec/",
  "/stories/",
  ".stories.",
  ".story.",
];

export const DEV_CONTEXT_PATTERNS = [
  /describe\s*\(/,
  /it\s*\(/,
  /test\s*\(/,
  /expect\s*\(/,
  /jest\./,
  /vitest\./,
  /cypress\./,
  /playwright\./,
  /__dev__/,
  /process\.env\.node_env\s*===?\s*['"]development['"]/,
];

export const UI_PATTERNS = [
  /render/,
  /component/,
  /jsx/,
  /style/,
  /theme/,
  /layout/,
  /position/,
  /animation/,
  /visual/,
  /chart/,
  /graph/,
  /skeleton/,
  /placeholder/,
  /demo/,
  /mock/,
];
