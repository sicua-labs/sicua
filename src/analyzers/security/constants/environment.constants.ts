/**
 * Constants for environment variables and development-related detection
 */

// Server-only environment variables that should never be in client code
export const SERVER_ONLY_ENV_VARS = [
  // Database credentials and connection strings
  "DATABASE_URL",
  "DB_HOST",
  "DB_PASSWORD",
  "DB_USER",
  "DB_NAME",
  "DB_PORT",
  "MONGODB_URI",
  "MONGO_URL",
  "POSTGRES_URL",
  "POSTGRESQL_URL",
  "MYSQL_URL",
  "MYSQL_HOST",
  "MYSQL_PASSWORD",
  "MYSQL_USER",
  "REDIS_URL",
  "REDIS_HOST",
  "REDIS_PASSWORD",
  "REDIS_PORT",
  "ELASTICSEARCH_URL",
  "CASSANDRA_HOST",
  "DYNAMODB_REGION",

  // API secrets and private keys
  "SECRET_KEY",
  "JWT_SECRET",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "PRIVATE_KEY",
  "RSA_PRIVATE_KEY",
  "API_SECRET",
  "WEBHOOK_SECRET",
  "SIGNING_SECRET",
  "MASTER_KEY",
  "CIPHER_KEY",

  // Third-party service secrets
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PAYPAL_SECRET",
  "PAYPAL_CLIENT_SECRET",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "GITHUB_SECRET",
  "GITHUB_WEBHOOK_SECRET",
  "GITHUB_PRIVATE_KEY",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "FACEBOOK_APP_SECRET",
  "TWITTER_CONSUMER_SECRET",
  "LINKEDIN_CLIENT_SECRET",
  "SLACK_SIGNING_SECRET",
  "DISCORD_BOT_TOKEN",
  "TELEGRAM_BOT_TOKEN",

  // Authentication provider secrets
  "AUTH0_CLIENT_SECRET",
  "AUTH0_DOMAIN",
  "AUTH0_AUDIENCE",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "CLERK_SECRET_KEY",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
  "OKTA_CLIENT_SECRET",
  "COGNITO_USER_POOL_ID",

  // Email service credentials
  "SMTP_PASSWORD",
  "SMTP_USER",
  "SMTP_HOST",
  "SENDGRID_API_KEY",
  "MAILGUN_API_KEY",
  "MAILGUN_DOMAIN",
  "POSTMARK_API_TOKEN",
  "SES_ACCESS_KEY",
  "SES_SECRET_KEY",

  // Cloud service credentials
  "AZURE_CLIENT_SECRET",
  "AZURE_TENANT_ID",
  "AZURE_SUBSCRIPTION_ID",
  "GCP_PRIVATE_KEY",
  "GCP_CLIENT_EMAIL",
  "GCP_PROJECT_ID",
  "DIGITALOCEAN_ACCESS_TOKEN",
  "HEROKU_API_KEY",
  "VERCEL_TOKEN",

  // Storage and CDN secrets
  "S3_SECRET_KEY",
  "CLOUDINARY_API_SECRET",
  "UPLOADCARE_SECRET_KEY",
  "CLOUDFLARE_API_TOKEN",
  "FASTLY_API_TOKEN",

  // Analytics and monitoring secrets
  "SENTRY_DSN",
  "BUGSNAG_API_KEY",
  "DATADOG_API_KEY",
  "NEW_RELIC_LICENSE_KEY",
  "AMPLITUDE_SECRET_KEY",

  // Server configuration
  "PORT",
  "HOST",
  "NODE_ENV",
  "ENVIRONMENT",
  "SSL_CERT",
  "SSL_KEY",
  "TLS_CERT",
  "TLS_KEY",
];

// Client-safe environment variables (safe for client exposure)
export const CLIENT_SAFE_ENV_VARS = [
  // Next.js public variables
  "NEXT_PUBLIC_",

  // Common client-safe prefixes
  "PUBLIC_",
  "REACT_APP_",
  "VITE_",
  "EXPO_PUBLIC_",
  "NUXT_PUBLIC_",
  "GATSBY_",
  "VUE_APP_",

  // Safe application configuration
  "APP_NAME",
  "APP_VERSION",
  "APP_TITLE",
  "APP_DESCRIPTION",
  "BUILD_ID",
  "BUILD_VERSION",
  "BUILD_TIME",
  "COMMIT_SHA",

  // Safe API endpoints (public)
  "PUBLIC_API_URL",
  "PUBLIC_API_ENDPOINT",
  "PUBLIC_GRAPHQL_ENDPOINT",

  // Safe service identifiers (public keys/IDs)
  "PUBLIC_STRIPE_KEY",
  "PUBLIC_PAYPAL_CLIENT_ID",
  "PUBLIC_GOOGLE_MAPS_API_KEY",
  "PUBLIC_GOOGLE_ANALYTICS_ID",
  "PUBLIC_FIREBASE_CONFIG",
  "PUBLIC_AUTH0_DOMAIN",
  "PUBLIC_AUTH0_CLIENT_ID",

  // Safe feature flags
  "FEATURE_",
  "ENABLE_",
  "DISABLE_",
  "SHOW_",
  "HIDE_",
];

// Development and debug flags
export const DEVELOPMENT_FLAGS = [
  "isDev",
  "isDebug",
  "debugMode",
  "devMode",
  "developmentMode",
  "DEBUG",
  "DEVELOPMENT",
  "DEV_MODE",
  "DEBUG_MODE",
  "__DEV__",
  "__DEBUG__",
  "__DEVELOPMENT__",
  "NODE_ENV",
  "ENVIRONMENT",
  "ENV",
  "STAGE",
  "isProduction",
  "isProd",
  "prodMode",
  "productionMode",
  "isTest",
  "testMode",
  "isStaging",
  "stagingMode",
  "LOG_LEVEL",
  "VERBOSE",
  "TRACE_ENABLED",
];

// Environment gating patterns (proper development checks)
export const ENV_GATING_PATTERNS = [
  // Node environment checks
  /if\s*\(\s*process\.env\.NODE_ENV\s*[!=]==?\s*['"]production['"]/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]development['"]/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]test['"]/,

  // Custom development flags
  /if\s*\(\s*process\.env\.DEBUG\s*[&|]/,
  /if\s*\(\s*process\.env\.DEV_MODE\s*[&|]/,
  /if\s*\(\s*process\.env\.DEVELOPMENT\s*[&|]/,

  // Runtime development checks
  /if\s*\(\s*isDev\s*[&|]/,
  /if\s*\(\s*isDebug\s*[&|]/,
  /if\s*\(\s*debugMode\s*[&|]/,
  /if\s*\(\s*__DEV__\s*[&|]/,
  /if\s*\(\s*!isProduction\s*[&|]/,
  /if\s*\(\s*!isProd\s*[&|]/,

  // Negated production checks
  /if\s*\(\s*!\s*isProduction/,
  /if\s*\(\s*!\s*isProd/,
  /if\s*\(\s*process\.env\.NODE_ENV\s*!==?\s*['"]production['"]/,
];

// Common development/staging domains and hosts
export const DEV_ENVIRONMENT_INDICATORS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "dev",
  "development",
  "staging",
  "test",
  "local",
  "preview",
  "beta",
  "alpha",
  "canary",
  "experimental",
  ".dev",
  ".local",
  ".test",
  ".staging",
  ".preview",
];

// Production environment indicators
export const PROD_ENVIRONMENT_INDICATORS = [
  "production",
  "prod",
  "live",
  "release",
  ".com",
  ".org",
  ".net",
  ".io",
  ".app",
  "api.",
  "www.",
  "app.",
  "admin.",
];
