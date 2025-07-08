/**
 * Constants for client-side storage and cookie-related detection
 */

// Browser storage APIs
export const STORAGE_APIS = [
  // Primary browser storage
  "localStorage",
  "sessionStorage",
  "indexedDB",

  // Legacy storage
  "openDatabase",
  "webkitStorageInfo",
  "globalStorage",

  // Memory storage
  "memoryStorage",
  "volatileStorage",

  // Cache APIs
  "caches",
  "CacheStorage",
  "Cache",
];

// Client-side storage libraries
export const STORAGE_LIBRARIES = [
  // Popular storage libraries
  "localforage",
  "dexie",
  "idb",
  "level",
  "levelup",
  "leveldown",
  "pouchdb",
  "lovefield",
  "ydn-db",
  "jsstore",
  "websql",

  // Framework-specific storage
  "redux-persist",
  "vuex-persistedstate",
  "zustand",
  "@ionic/storage",
  "@capacitor/storage",
  "expo-secure-store",

  // Specialized storage
  "store2",
  "amplify-js",
  "aws-amplify",
  "firebase",
  "gun",
  "rxdb",
  "minimongo",
  "lokijs",
  "nedb",

  // Encryption-enabled storage
  "secure-ls",
  "crypto-js",
  "sjcl",
  "node-forge",
];

// Cookie manipulation libraries
export const COOKIE_LIBRARIES = [
  // Pure cookie libraries
  "js-cookie",
  "cookie",
  "cookies-next",
  "react-cookie",
  "universal-cookie",
  "cookie-parser",
  "tough-cookie",

  // Framework cookie utilities
  "next-cookies",
  "nookies",
  "vue-cookies",
  "angular-cookies",
  "@nuxtjs/cookies",
  "svelte-cookies",
  "solid-js-cookie",

  // Server-side cookie handling
  "express-session",
  "cookie-session",
  "koa-session",
  "fastify-cookie",
  "hapi-auth-cookie",
  "restify-cookies",

  // Advanced cookie features
  "cookie-signature",
  "keygrip",
  "secure-cookie",
];

// Secure cookie attributes
export const SECURE_COOKIE_ATTRIBUTES = {
  secure: {
    name: "Secure",
    description: "Ensures cookie is only sent over HTTPS",
    required: true,
    values: ["Secure", "secure"],
  },
  httpOnly: {
    name: "HttpOnly",
    description: "Prevents client-side JavaScript access to cookie",
    required: true,
    values: ["HttpOnly", "httpOnly", "httponly"],
  },
  sameSite: {
    name: "SameSite",
    description: "Prevents CSRF attacks",
    required: true,
    values: ["Strict", "Lax", "None", "strict", "lax", "none"],
  },
  domain: {
    name: "Domain",
    description: "Restricts cookie to specific domain",
    required: false,
    values: [],
  },
  path: {
    name: "Path",
    description: "Restricts cookie to specific path",
    required: false,
    values: ["/"],
  },
  expires: {
    name: "Expires",
    description: "Sets cookie expiration date",
    required: false,
    values: [],
  },
  maxAge: {
    name: "Max-Age",
    description: "Sets cookie max age in seconds",
    required: false,
    values: [],
  },
};

// Storage operation methods
export const STORAGE_METHODS = [
  // Standard storage methods
  "setItem",
  "getItem",
  "removeItem",
  "clear",
  "key",

  // Library-specific methods
  "set",
  "get",
  "del",
  "delete",
  "remove",
  "has",
  "keys",
  "put",
  "add",
  "update",
  "find",
  "findOne",
  "query",

  // Bulk operations
  "setItems",
  "getItems",
  "removeItems",
  "bulkSet",
  "bulkGet",
  "multiSet",
  "multiGet",
  "batch",
  "transaction",

  // Advanced operations
  "iterate",
  "forEach",
  "length",
  "size",
  "count",
];

// Cookie operation methods
export const COOKIE_METHODS = [
  // Setting cookies
  "set",
  "setItem",
  "setCookie",
  "create",
  "write",

  // Getting cookies
  "get",
  "getItem",
  "getCookie",
  "read",
  "load",

  // Removing cookies
  "remove",
  "removeItem",
  "removeCookie",
  "delete",
  "unset",

  // Cookie utilities
  "getAll",
  "getJSON",
  "withConverter",
  "withAttributes",
];

// Storage security patterns
export const STORAGE_SECURITY_PATTERNS = [
  // Encryption indicators
  /encrypt/i,
  /decrypt/i,
  /cipher/i,
  /crypto/i,
  /secure/i,
  /aes/i,
  /rsa/i,
  /des/i,
  /blowfish/i,
  /hash/i,

  // Compression indicators
  /compress/i,
  /decompress/i,
  /gzip/i,
  /lz/i,
  /deflate/i,

  // Serialization indicators
  /serialize/i,
  /deserialize/i,
  /stringify/i,
  /parse/i,
  /encode/i,
  /decode/i,
  /base64/i,
  /hex/i,
  /binary/i,

  // Security headers
  /content-security-policy/i,
  /x-frame-options/i,
  /x-content-type/i,
];

// Insecure storage patterns
export const INSECURE_STORAGE_PATTERNS = [
  // Plain text storage
  /localStorage\.setItem.*password/i,
  /sessionStorage\.setItem.*token/i,
  /document\.cookie.*secret/i,

  // Unencrypted sensitive data
  /setItem.*api[_-]?key/i,
  /setItem.*private[_-]?key/i,
  /setItem.*credit[_-]?card/i,

  // Temporary storage misuse
  /localStorage.*temp/i,
  /sessionStorage.*permanent/i,
  /cookie.*session.*localStorage/i,
];

// Storage capacity and limits
export const STORAGE_LIMITS = {
  localStorage: {
    typical: "5-10MB",
    varies: true,
    persistent: true,
  },
  sessionStorage: {
    typical: "5-10MB",
    varies: true,
    persistent: false,
  },
  indexedDB: {
    typical: "50MB-unlimited",
    varies: true,
    persistent: true,
  },
  webSQL: {
    typical: "5MB",
    varies: false,
    persistent: true,
    deprecated: true,
  },
  cookies: {
    typical: "4KB per cookie",
    varies: false,
    persistent: true,
    limit: "~20 cookies per domain",
  },
};

// Storage best practices indicators
export const STORAGE_BEST_PRACTICES = [
  // Encryption usage
  "encrypt",
  "crypto",
  "secure",
  "hash",
  "salt",

  // Data validation
  "validate",
  "sanitize",
  "check",
  "verify",
  "confirm",

  // Expiration handling
  "expire",
  "ttl",
  "timeout",
  "cleanup",
  "purge",

  // Error handling
  "try",
  "catch",
  "error",
  "fallback",
  "retry",
];

// Cookie security flags patterns
export const COOKIE_SECURITY_FLAGS = [
  // Required security flags
  /[Ss]ecure/,
  /[Hh]ttp[Oo]nly/,
  /[Ss]ame[Ss]ite/,

  // Flag values
  /[Ss]ame[Ss]ite\s*=\s*[Ss]trict/,
  /[Ss]ame[Ss]ite\s*=\s*[Ll]ax/,
  /[Ss]ame[Ss]ite\s*=\s*[Nn]one/,

  // Domain and path restrictions
  /[Dd]omain\s*=/,
  /[Pp]ath\s*=/,

  // Expiration settings
  /[Ee]xpires\s*=/,
  /[Mm]ax-[Aa]ge\s*=/,
];

export const UI_STATE_TERMS = [
  "filter",
  "search",
  "sort",
  "preference",
  "setting",
  "theme",
  "language",
  "locale",
  "layout",
  "sidebar",
  "accessibility",
  "expanded",
  "selected",
  "tab",
];

export const UI_STATE_PATTERNS = [
  "filter",
  "filters",
  "search",
  "sort",
  "sorting",
  "preference",
  "preferences",
  "setting",
  "settings",
  "theme",
  "language",
  "locale",
  "timezone",
  "layout",
  "sidebar",
  "view",
  "display",
  "ui",
  "accessibility",
  "expanded",
  "collapsed",
  "selected",
  "active",
  "tab",
  "tabs",
  "page",
  "pagination",
  "size",
];
