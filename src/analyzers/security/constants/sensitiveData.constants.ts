/**
 * Constants for sensitive data detection across security analyzers
 */

// General sensitive data keywords for multiple detectors
export const SENSITIVE_DATA_KEYWORDS = [
  // Authentication & Authorization
  "password",
  "passwd",
  "pwd",
  "passphrase",
  "passcode",
  "token",
  "jwt",
  "access_token",
  "refresh_token",
  "bearer_token",
  "auth",
  "authentication",
  "authorization",
  "oauth",
  "session",
  "sessionid",
  "session_token",
  "session_key",

  // Secrets & Keys
  "secret",
  "key",
  "private_key",
  "public_key",
  "api_key",
  "client_secret",
  "client_id",
  "webhook_secret",
  "signing_key",
  "encryption_key",
  "decryption_key",
  "master_key",

  // Personal Information (PII)
  "ssn",
  "social_security",
  "social_security_number",
  "credit_card",
  "creditcard",
  "card_number",
  "cc_number",
  "cvv",
  "cvc",
  "pin",
  "account_number",
  "routing_number",
  "license_number",
  "passport",
  "visa",
  "mastercard",

  // Sensitive Business Data
  "salary",
  "income",
  "wage",
  "financial",
  "billing",
  "medical",
  "health",
  "diagnosis",
  "treatment",
  "patient",
  "confidential",
  "classified",
  "restricted",
  "internal",
];

// Console logging specific sensitive keywords
export const CONSOLE_SENSITIVE_KEYWORDS = [
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "auth",
  "api_key",
  "apikey",
  "private_key",
  "privatekey",
  "jwt",
  "session",
  "cookie",
  "credit_card",
  "creditcard",
  "ssn",
  "private",
  "confidential",
  "sensitive",
];

// Hardcoded secret specific sensitive variable names
export const SENSITIVE_VARIABLE_NAMES = [
  // Authentication variables
  "password",
  "passwd",
  "pwd",
  "passphrase",
  "token",
  "jwt",
  "access_token",
  "refresh_token",
  "auth",
  "authentication",
  "authorization",
  "session",
  "sessionid",
  "session_token",

  // API and service keys
  "api_key",
  "apikey",
  "private_key",
  "privatekey",
  "client_secret",
  "client_id",
  "webhook_secret",
  "encryption_key",
  "decryption_key",
  "signing_key",

  // Database and connection strings
  "database_url",
  "db_url",
  "connection_string",
  "db_password",
  "db_user",
  "db_host",

  // Service-specific secrets
  "stripe_secret",
  "paypal_secret",
  "aws_secret",
  "github_secret",
  "google_secret",
  "facebook_secret",
];

// SecurityContext sensitive patterns
export const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /credit[_-]?card/i,
  /ssn/i,
  /social[_-]?security/i,
  /personal[_-]?data/i,
  /pii/i,
  /encrypt/i,
  /decrypt/i,
  /hash/i,
  /bcrypt/i,
  /jwt/i,
];

// High sensitivity data (immediate red flags)
export const HIGH_SENSITIVITY_KEYWORDS = [
  "password",
  "secret",
  "private_key",
  "ssn",
  "credit_card",
  "cvv",
  "passport",
  "license_number",
];

// Medium sensitivity data (requires context)
export const MEDIUM_SENSITIVITY_KEYWORDS = [
  "token",
  "auth",
  "session",
  "api_key",
  "client_secret",
  "jwt",
  "oauth",
  "webhook",
  "signing_key",
];

// Low sensitivity data (context dependent)
export const LOW_SENSITIVITY_KEYWORDS = [
  "user",
  "email",
  "phone",
  "address",
  "name",
  "id",
  "identifier",
  "reference",
  "code",
];

// Explicit sensitive keywords (high confidence detection)
export const EXPLICIT_SENSITIVE_KEYWORDS = [
  "password",
  "secret",
  "token",
  "private_key",
  "api_key",
  "client_secret",
  "jwt",
  "session_token",
  "access_token",
];

// Potential sensitive keywords (medium confidence detection)
export const POTENTIAL_SENSITIVE_KEYWORDS = [
  "auth",
  "session",
  "cookie",
  "jwt",
  "api",
  "client",
  "user",
  "credential",
  "login",
];

// Environment variable sensitive keywords
export const ENV_SENSITIVE_KEYWORDS = [
  "SECRET",
  "PASSWORD",
  "KEY",
  "TOKEN",
  "PRIVATE",
  "CREDENTIAL",
  "AUTH",
  "API_KEY",
  "WEBHOOK",
];

// Client storage high sensitivity (never store client-side)
export const CLIENT_HIGH_SENSITIVITY = [
  "password",
  "secret",
  "private_key",
  "ssn",
  "credit_card",
];

// Client storage explicit sensitive (obvious sensitive data)
export const CLIENT_EXPLICIT_SENSITIVE = [
  "password",
  "secret",
  "token",
  "private_key",
];

export const NON_SENSITIVE_TERMS = [
  "filter",
  "filters",
  "search",
  "sort",
  "preference",
  "preferences",
  "setting",
  "settings",
  "theme",
  "language",
  "locale",
  "timezone",
  "accessibility",
  "ui",
  "display",
  "view",
  "layout",
  "sidebar",
];
