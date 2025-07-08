/**
 * Constants for security-specific patterns, contexts, and alternatives
 */

// Security contexts for random number generation
export const SECURITY_CONTEXTS = [
  // Token and ID generation
  "token",
  "id",
  "uuid",
  "guid",
  "nonce",
  "salt",
  "challenge",
  "csrf",
  "xsrf",
  "anti_forgery",
  "state",
  "code_verifier",

  // Authentication and session
  "session",
  "auth",
  "login",
  "password",
  "secret",
  "passphrase",
  "otp",
  "totp",
  "verification",
  "confirm",
  "activate",

  // Cryptographic operations
  "key",
  "encrypt",
  "decrypt",
  "hash",
  "hmac",
  "signature",
  "crypto",
  "cipher",
  "iv",
  "vector",
  "entropy",
  "random",

  // Security features
  "csrf",
  "otp",
  "verification",
  "challenge",
  "proof",
  "captcha",
  "rate_limit",
  "throttle",
  "lockout",
];

// UI/Visual contexts where Math.random() is acceptable
export const UI_VISUAL_CONTEXTS = [
  // Layout and positioning
  "position",
  "layout",
  "coordinate",
  "x",
  "y",
  "width",
  "height",
  "size",
  "offset",
  "margin",
  "padding",
  "spacing",
  "gap",

  // Animation and effects
  "animation",
  "transition",
  "effect",
  "duration",
  "delay",
  "easing",
  "timing",
  "frame",
  "fps",
  "opacity",
  "fade",
  "slide",
  "bounce",

  // Graph and visualization
  "graph",
  "node",
  "edge",
  "vertex",
  "cluster",
  "force",
  "spring",
  "simulation",
  "physics",
  "particle",
  "scatter",
  "jitter",
  "noise",

  // UI components
  "skeleton",
  "placeholder",
  "demo",
  "example",
  "mock",
  "test",
  "sample",
  "preview",
  "illustration",
  "decoration",

  // Color and styling
  "color",
  "hue",
  "saturation",
  "brightness",
  "gradient",
  "theme",
  "style",
  "appearance",
];

// Function names that indicate UI/visual usage
export const UI_FUNCTION_PATTERNS = [
  /layout/i,
  /position/i,
  /render/i,
  /draw/i,
  /paint/i,
  /animate/i,
  /transition/i,
  /effect/i,
  /style/i,
  /theme/i,
  /skeleton/i,
  /placeholder/i,
  /demo/i,
  /mock/i,
  /example/i,
  /illustration/i,
  /decoration/i,
  /visual/i,
  /graph/i,
  /chart/i,
  /plot/i,
  /cluster/i,
  /force/i,
  /simulation/i,
  /physics/i,
];

// Secure alternatives for random generation
export const SECURE_RANDOM_ALTERNATIVES = [
  // Node.js crypto module
  "crypto.randomBytes",
  "crypto.randomInt",
  "crypto.randomUUID",
  "crypto.getRandomValues",
  "crypto.webcrypto.getRandomValues",

  // Browser crypto APIs
  "window.crypto.getRandomValues",
  "self.crypto.getRandomValues",
  "globalThis.crypto.getRandomValues",

  // UUID libraries
  "uuid.v4",
  "uuid.v1",
  "uuid.v6",
  "uuid.v7",
  "crypto.randomUUID",
  "nanoid",
  "shortid",

  // Crypto libraries
  "randomBytes",
  "randomInt",
  "randomFill",
  "randomFillSync",
  "sodium.randombytes_buf",
  "tweetnacl.randomBytes",
];

// HTML sanitization libraries
export const SANITIZATION_LIBRARIES = [
  // Primary sanitization libraries
  "DOMPurify",
  "dompurify",
  "@types/dompurify",
  "sanitize-html",
  "xss",
  "js-xss",
  "@types/sanitize-html",
  "isomorphic-dompurify",
  "html-sanitizer",

  // Framework-specific sanitizers
  "angular",
  "@angular/platform-browser",
  "angular2-sanitizer",
  "vue-dompurify-html",
  "react-html-parser",

  // Server-side sanitizers
  "helmet",
  "express-validator",
  "validator",
  "bleach",
  "html5lib",
  "lxml",
];

// Sanitization function patterns
export const SANITIZATION_PATTERNS = [
  // DOMPurify methods
  /DOMPurify\.(sanitize|clean)/,
  /dompurify\.(sanitize|clean)/,

  // Generic sanitization patterns
  /sanitize\s*\(/,
  /clean\s*\(/,
  /purify\s*\(/,
  /escape\s*\(/,
  /xss\s*\(/,

  // HTML encoding/escaping
  /htmlEncode\s*\(/,
  /htmlEscape\s*\(/,
  /encodeHTML\s*\(/,
  /escapeHtml\s*\(/,

  // Framework sanitization
  /bypassSecurityTrust/,
  /trustAsHtml/,
  /sanitizer\./,
];

// Standard XML namespaces (safe HTTP URLs)
export const SAFE_XML_NAMESPACES = [
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xhtml",
  "http://www.w3.org/1999/xlink",
  "http://www.w3.org/2001/XMLSchema",
  "http://www.w3.org/2001/XMLSchema-instance",
  "http://www.w3.org/XML/1998/namespace",
  "http://schemas.xmlsoap.org/soap/envelope/",
  "http://schemas.microsoft.com/winfx/2006/xaml",
  "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
];

// Proper development environment gating patterns
export const DEVELOPMENT_GATING_PATTERNS = [
  /process\.env\.NODE_ENV\s*===?\s*["']development["']/,
  /process\.env\.NODE_ENV\s*!==?\s*["']production["']/,
  /\{\s*process\.env\.NODE_ENV\s*===?\s*["']development["']\s*&&/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*["']development["']/,
  /process\.env\.NODE_ENV\s*===?\s*["']development["']\s*\?\s*/,
  /NODE_ENV\s*===?\s*['"]development['"]/,
  /isDevelopment/i,
  /isDevMode/i,
  /isDev\s*&&/,
  /__DEV__/,
  /import\.meta\.env\.DEV/,
  /import\.meta\.env\.MODE\s*===?\s*['"]development['"]/,
];

// Authentication patterns
export const AUTH_PATTERNS = [
  /login/i,
  /logout/i,
  /signin/i,
  /signout/i,
  /authenticate/i,
  /session/i,
  /cookie/i,
  /token/i,
  /jwt/i,
  /oauth/i,
  /passport/i,
  /clerk/i,
  /nextauth/i,
  /auth0/i,
  /firebase.*auth/i,
  /supabase.*auth/i,
  /aws.*cognito/i,
];

// Authorization patterns
export const AUTHORIZATION_PATTERNS = [
  /authorize/i,
  /permission/i,
  /role/i,
  /access/i,
  /acl/i,
  /rbac/i,
  /guard/i,
  /protect/i,
  /secure/i,
  /admin/i,
  /canAccess/i,
  /hasPermission/i,
  /isAllowed/i,
  /checkRole/i,
];

// Data processing security patterns
export const DATA_PROCESSING_PATTERNS = [
  /JSON\.parse/i,
  /JSON\.stringify/i,
  /serialize/i,
  /deserialize/i,
  /validate/i,
  /sanitize/i,
  /transform/i,
  /filter/i,
  /escape/i,
  /encode/i,
  /decode/i,
  /hash/i,
  /encrypt/i,
  /decrypt/i,
];

// External communication patterns
export const EXTERNAL_COMM_PATTERNS = [
  /fetch/i,
  /axios/i,
  /http/i,
  /api/i,
  /request/i,
  /ajax/i,
  /webhook/i,
  /graphql/i,
  /rest/i,
  /grpc/i,
  /soap/i,
  /ws:/i,
  /wss:/i,
  /socket/i,
  /sse/i,
  /eventSource/i,
];

// Configuration security patterns
export const CONFIG_PATTERNS = [
  /config/i,
  /settings/i,
  /environment/i,
  /env/i,
  /dotenv/i,
  /secret/i,
  /key/i,
  /credential/i,
  /token/i,
  /password/i,
  /database/i,
  /redis/i,
  /mongodb/i,
  /postgres/i,
  /mysql/i,
];

// Client-side security patterns
export const CLIENT_SIDE_PATTERNS = [
  /window\./i,
  /document\./i,
  /localStorage/i,
  /sessionStorage/i,
  /location\./i,
  /navigator\./i,
  /history\./i,
  /cookie/i,
  /eval\(/i,
  /innerHTML/i,
  /outerHTML/i,
  /insertAdjacentHTML/i,
];

// Server-side security patterns
export const SERVER_SIDE_PATTERNS = [
  /process\./i,
  /require\(/i,
  /import.*node:/i,
  /fs\./i,
  /path\./i,
  /os\./i,
  /crypto\./i,
  /buffer\./i,
  /stream\./i,
  /http\./i,
  /express/i,
  /fastify/i,
  /koa/i,
  /nest/i,
  /next/i,
];

// Security function names
export const SECURITY_FUNCTIONS = [
  // Cryptographic functions
  "generateToken",
  "createToken",
  "generateKey",
  "createKey",
  "generateNonce",
  "createNonce",
  "generateSalt",
  "createSalt",
  "generateHash",
  "createHash",
  "generateSignature",
  "createSignature",

  // Authentication functions
  "authenticate",
  "login",
  "signin",
  "authorize",
  "verify",
  "validateUser",
  "checkCredentials",
  "verifyToken",
  "refreshToken",

  // Session management
  "createSession",
  "generateSessionId",
  "validateSession",
  "refreshSession",
  "destroySession",
  "cleanupSessions",

  // Security utilities
  "sanitizeInput",
  "validateInput",
  "escapeHtml",
  "encodeData",
  "decodeData",
  "hashPassword",
  "verifyPassword",
  "generateOTP",

  // CSRF protection
  "generateCSRFToken",
  "validateCSRFToken",
  "checkCSRF",
  "antiCSRF",
];

// Cryptographic algorithms and methods
export const CRYPTO_ALGORITHMS = [
  // Symmetric encryption
  "AES",
  "AES-256",
  "AES-128",
  "DES",
  "3DES",
  "Blowfish",
  "ChaCha20",
  "Salsa20",
  "RC4",
  "RC6",

  // Asymmetric encryption
  "RSA",
  "ECC",
  "ECDSA",
  "ECDH",
  "DH",
  "DSA",
  "ElGamal",

  // Hash functions
  "SHA-1",
  "SHA-256",
  "SHA-512",
  "MD5",
  "Blake2",
  "Keccak",
  "bcrypt",
  "scrypt",
  "PBKDF2",
  "Argon2",

  // Message authentication
  "HMAC",
  "CMAC",
  "GCM",
  "CCM",
  "Poly1305",
];

// Known security vulnerabilities patterns
export const VULNERABILITY_PATTERNS = [
  // Injection attacks
  /sql.*injection/i,
  /xss/i,
  /cross.*site.*scripting/i,
  /command.*injection/i,
  /code.*injection/i,
  /ldap.*injection/i,

  // Authentication bypasses
  /auth.*bypass/i,
  /authentication.*bypass/i,
  /login.*bypass/i,
  /session.*fixation/i,
  /privilege.*escalation/i,

  // Data exposure
  /information.*disclosure/i,
  /data.*exposure/i,
  /sensitive.*data/i,
  /directory.*traversal/i,
  /path.*traversal/i,
  /file.*inclusion/i,

  // Cryptographic issues
  /weak.*crypto/i,
  /insecure.*random/i,
  /broken.*crypto/i,
  /hash.*collision/i,
  /timing.*attack/i,
];

export const SERVER_DATA_INDICATORS = [
  "data.",
  "response.",
  "result.",
  "payload.",
  "createdResourceId",
  "id",
  "userId",
  "projectId",
  "session.",
  "auth.",
  "user.",
  "account.",
];

export const ARRAY_METHODS = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "concat",
];

export const ARRAY_INDICATORS = [
  "array",
  "list",
  "items",
  "collection",
  "paths",
  "routes",
  "results",
  "data",
  "entries",
  "records",
  "elements",
  "truepaths",
  "falsepaths",
  "completepaths",
  "vulnerabilities",
];

export const DATA_MANIPULATION_PATTERNS = [
  "pathdata",
  "nodedata",
  "edgedata",
  "graphdata",
  "itemdata",
  "resultdata",
  "processeddata",
  "calculateddata",
  "generateddata",
  "transformeddata",
];

export const SECURITY_PATTERNS = [
  /auth/,
  /login/,
  /token/,
  /secret/,
  /crypto/,
  /hash/,
  /encrypt/,
  /verify/,
  /validate/,
  /sanitize/,
  /secure/,
];
