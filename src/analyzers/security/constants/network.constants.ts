/**
 * Constants for network, HTTP, and redirect-related security detection
 */

// HTTP contexts that pose security risks
export const RISKY_HTTP_CONTEXTS = [
  // API and endpoint related
  "api",
  "endpoint",
  "url",
  "uri",
  "link",
  "href",
  "src",
  "source",

  // Request related
  "fetch",
  "request",
  "call",
  "ajax",
  "xhr",
  "http",
  "https",

  // Resource loading
  "script",
  "stylesheet",
  "image",
  "iframe",
  "frame",
  "embed",

  // Form actions
  "action",
  "formAction",
  "method",
  "target",
  "submit",
];

// HTTP contexts that are typically allowed in development
export const ALLOWED_HTTP_CONTEXTS = [
  // Local development
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "local",

  // Development environments
  "dev",
  "development",
  "staging",
  "test",
  "preview",
  "beta",
  "alpha",
  "canary",
  "experimental",

  // Development domains
  ".dev",
  ".local",
  ".test",
  ".localhost",
  ".internal",

  // Development ports
  ":3000",
  ":8000",
  ":8080",
  ":9000",
  ":4200",
  ":5000",
];

// Navigation and redirect methods
export const REDIRECT_METHODS = [
  // Next.js router methods
  "push",
  "replace",
  "back",
  "forward",
  "reload",
  "prefetch",

  // React Router methods
  "navigate",
  "redirect",
  "useNavigate",
  "useHistory",

  // Vue Router methods
  "$router.push",
  "$router.replace",
  "$router.go",

  // Angular Router methods
  "navigate",
  "navigateByUrl",
  "router.navigate",

  // General redirect functions
  "redirect",
  "redirectTo",
  "goto",
  "location",
  "href",

  // Framework-specific
  "router.push",
  "router.replace",
  "history.push",
  "history.replace",
];

// Sources of user input that could be dangerous in redirects
export const USER_INPUT_SOURCES = [
  // URL parameters
  "query",
  "params",
  "searchParams",
  "urlSearchParams",
  "URLSearchParams",

  // Request objects
  "req",
  "request",
  "ctx",
  "context",
  "event",

  // Form data
  "formData",
  "body",
  "payload",
  "data",
  "input",

  // User input
  "userInput",
  "userData",
  "clientData",
  "postData",

  // Query strings
  "search",
  "hash",
  "fragment",
  "queryString",

  // Headers
  "headers",
  "referer",
  "origin",
  "host",
  "referrer",
];

// Validation indicators that suggest proper security measures
export const VALIDATION_INDICATORS = [
  // Validation functions
  "validate",
  "validateUrl",
  "validateRedirect",
  "isValid",
  "sanitize",
  "sanitizeUrl",
  "clean",
  "purify",

  // Whitelist/allowlist patterns
  "whitelist",
  "allowlist",
  "allowed",
  "permitted",
  "safe",
  "safePath",
  "safeUrl",
  "trustedDomains",
  "allowedDomains",

  // URL checking functions
  "checkUrl",
  "verifyUrl",
  "isValidUrl",
  "isSafeUrl",
  "urlValidator",
  "urlChecker",
  "domainCheck",

  // String validation methods
  "includes",
  "startsWith",
  "endsWith",
  "indexOf",
  "match",
  "test",
  "exec",
  "search",
  "charAt",
  "substring",

  // Security checks
  "isInternal",
  "isExternal",
  "isTrusted",
  "isAllowed",
  "hasPermission",
  "canRedirect",
  "authorize",
];

// High-risk input sources (immediate security concern)
export const HIGH_RISK_INPUT_SOURCES = [
  "query",
  "params",
  "searchParams",
  "req",
  "request",
  "headers",
  "referer",
  "origin",
  "body",
  "formData",
];

// Medium-risk input sources (requires context evaluation)
export const MEDIUM_RISK_INPUT_SOURCES = [
  "input",
  "data",
  "payload",
  "userInput",
  "clientData",
  "search",
  "hash",
  "fragment",
  "postData",
];

// Low-risk input sources (generally safer but still worth checking)
export const LOW_RISK_INPUT_SOURCES = [
  "config",
  "settings",
  "constants",
  "env",
  "process.env",
  "localStorage",
  "sessionStorage",
  "cookies",
];

// Network request libraries and methods
export const NETWORK_LIBRARIES = [
  // HTTP clients
  "fetch",
  "axios",
  "got",
  "request",
  "superagent",
  "needle",
  "node-fetch",
  "isomorphic-fetch",
  "cross-fetch",
  "whatwg-fetch",

  // Framework HTTP clients
  "@angular/common/http",
  "vue-resource",
  "$http",
  "$httpClient",
  "nuxt/http",
  "next-connect",
  "micro",
  "express",

  // WebSocket libraries
  "ws",
  "socket.io",
  "sockjs",
  "engine.io",
  "uws",
  "websocket",

  // GraphQL clients
  "apollo-client",
  "relay",
  "graphql-request",
  "urql",
  "swr",
];

// HTTP methods that can cause redirects
export const REDIRECT_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

// URL schemes and protocols
export const URL_SCHEMES = {
  secure: ["https:", "wss:", "ftps:", "sftp:"],
  insecure: ["http:", "ws:", "ftp:", "telnet:"],
  local: ["file:", "blob:", "data:"],
  custom: ["app:", "custom:", "deep-link:"],
};

// Common redirect parameters in URLs
export const REDIRECT_PARAMETERS = [
  "redirect",
  "redirectTo",
  "redirect_uri",
  "redirectUri",
  "returnUrl",
  "return",
  "returnTo",
  "next",
  "continue",
  "goto",
  "url",
  "target",
  "destination",
  "forward",
  "forwardTo",
  "callback",
  "callbackUrl",
];

// Mixed content patterns
export const MIXED_CONTENT_PATTERNS = [
  // Image sources
  /src\s*=\s*['"`]http:\/\/[^'"`\s]+\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)['"`]/gi,

  // Script sources
  /src\s*=\s*['"`]http:\/\/[^'"`\s]+\.js['"`]/gi,

  // Stylesheet links
  /href\s*=\s*['"`]http:\/\/[^'"`\s]+\.css['"`]/gi,

  // Font sources
  /src\s*=\s*['"`]http:\/\/[^'"`\s]+\.(woff|woff2|ttf|otf|eot)['"`]/gi,

  // API calls
  /fetch\s*\(\s*['"`]http:\/\/[^'"`\s]+['"`]/gi,
  /axios\.[a-z]+\s*\(\s*['"`]http:\/\/[^'"`\s]+['"`]/gi,

  // Form actions
  /action\s*=\s*['"`]http:\/\/[^'"`\s]+['"`]/gi,
];

// Network security headers
export const SECURITY_HEADERS = {
  "Content-Security-Policy": {
    description: "Prevents XSS and other injection attacks",
    critical: true,
  },
  "Strict-Transport-Security": {
    description: "Enforces HTTPS connections",
    critical: true,
  },
  "X-Frame-Options": {
    description: "Prevents clickjacking attacks",
    critical: false,
  },
  "X-Content-Type-Options": {
    description: "Prevents MIME type sniffing",
    critical: false,
  },
  "Referrer-Policy": {
    description: "Controls referrer information",
    critical: false,
  },
  "Permissions-Policy": {
    description: "Controls browser feature permissions",
    critical: false,
  },
};

// Dangerous redirect patterns
export const DANGEROUS_REDIRECT_PATTERNS = [
  // Open redirect indicators
  /window\.location\s*=\s*[^;]*(?:query|params|req\.)/gi,
  /location\.href\s*=\s*[^;]*(?:query|params|req\.)/gi,
  /router\.push\s*\([^)]*(?:query|params|req\.)/gi,

  // Unvalidated external redirects
  /redirect\s*\([^)]*https?:\/\//gi,
  /window\.open\s*\([^)]*(?:query|params)/gi,

  // JavaScript navigation with user input
  /document\.location\s*=\s*[^;]*(?:input|user|client)/gi,
];

// Safe redirect patterns (relative URLs, validated domains)
export const SAFE_REDIRECT_PATTERNS = [
  // Relative URLs
  /^\/[^\/\\]/,
  /^\.\.?\//,

  // Same-origin URLs
  /^https?:\/\/[\w.-]+\.example\.com/,
  /^\/\/[\w.-]+\.trusted-domain\.com/,

  // Query parameter validation
  /allowedDomains\.includes/,
  /trustedUrls\.indexOf/,
  /isValidRedirect/,
];

export const REDIRECT_GATING_PATTERNS = [
  /if\s*\(\s*process\.env\.NODE_ENV\s*[!=]==?\s*['"]production['"]/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]development['"]/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]test['"]/,
  /process\.env\.NODE_ENV\s*===?\s*['"]development['"]/, // Add this line
  /process\.env\.NODE_ENV\s*===?\s*['"]production['"]/, // Add this line
  /if\s*\(\s*isDev\s*[&|]/,
  /if\s*\(\s*isDebug\s*[&|]/,
  /if\s*\(\s*debugMode\s*[&|]/,
  /if\s*\(\s*__DEV__\s*[&|]/,
];
