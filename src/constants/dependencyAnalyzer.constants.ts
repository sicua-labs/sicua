// dependency-analyzer.constants.ts

/**
 * Consolidated configuration files array for dependency analysis
 * Combines both glob patterns and specific file names
 */
export const CONFIG_FILES: string[] = [
  // Build tools
  "webpack.config.{js,ts}",
  "vite.config.{js,ts}",
  "rollup.config.{js,ts}",
  "esbuild.config.{js,ts}",
  "parcel.config.{js,json}",
  "snowpack.config.{js,json}",
  "module.config.{js,ts}",

  // Next.js
  "next.config.{js,ts}",

  // CSS frameworks and tools
  "tailwind.config.{js,ts}",
  "postcss.config.{js,ts}",
  "stylelint.config.{js,json,ts}",

  // Babel
  "babel.config.{js,ts,json}",
  ".babelrc.{js,json}",
  ".babelrc",

  // Testing frameworks
  "jest.config.{js,ts}",
  "vitest.config.{js,ts}",
  "playwright.config.{js,ts}",
  "cypress.config.{js,ts}",
  "karma.conf.{js,ts}",
  "protractor.conf.{js,ts}",

  // Linting and formatting
  ".eslintrc.{js,json,cjs}",
  ".eslintrc",
  "eslint.config.{js,ts}",
  "prettier.config.{js,ts}",
  ".prettierrc.{js,json}",
  ".prettierrc",

  // TypeScript
  "tsconfig.json",
  "tsconfig.*.json",
  "jsconfig.json",

  // Storybook
  ".storybook/*.{js,ts}",
  ".storybook/main.{js,ts}",
  "storybook.config.{js,ts}",

  // Framework configs
  "astro.config.{js,ts}",
  "svelte.config.{js,ts}",
  "nuxt.config.{js,ts}",
  "remix.config.{js,ts}",
  "vue.config.{js,ts}",
  "quasar.config.{js,ts}",

  // Mobile frameworks
  "capacitor.config.{js,ts,json}",
  "ionic.config.json",
  "metro.config.{js,ts}",
  "expo.json",
  "app.json",

  // Angular
  "angular.json",
  ".angular-cli.json",

  // Workbox
  "workbox-config.{js,ts}",

  // Serverless
  "serverless.{yml,yaml}",

  // Package management and workspaces
  "package.json",
  "pnpm-workspace.yaml",
  "lerna.json",
  "turbo.json",
  "nx.json",
  "workspace.json",

  // Environment and runtime
  ".env*",
  "nodemon.json",
  "pm2.config.{js,ts}",

  // Documentation
  "docusaurus.config.{js,ts}",
  "components.json", // shadcn/ui

  // API Documentation
  "swagger.{json,yaml}",
  "openapi.{json,yaml}",

  // Docker
  "Dockerfile*",
  "docker-compose*.{yml,yaml}",

  // CI/CD
  ".github/workflows/*.{yml,yaml}",
  ".gitlab-ci.{yml,yaml}",
  "azure-pipelines.{yml,yaml}",
  "bitbucket-pipelines.{yml,yaml}",
  "jenkins.config.js",

  // Dependency management
  ".nvmrc",
  ".node-version",
  "yarn.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
] as const;

// Define the packages
export const SPECIAL_PACKAGES_ARRAY = [
  // UI Component Libraries with Special Installation
  "@shadcn/ui", // Components copied into project
  "tailwindcss-animate", // Used in tailwind config

  // CSS-only Packages (no direct imports)
  "@tailwindcss/typography",
  "@tailwindcss/forms",
  "@tailwindcss/aspect-ratio",
  "@tailwindcss/container-queries",
  "tailwindcss-gradients",
  "daisyui",
  "autoprefixer", // Used by PostCSS
  "normalize.css", // Often imported in global CSS
  "reset-css", // Often imported in global CSS

  // Font Packages
  "@fontsource/inter", // Used in CSS or config
  "@next/font", // Used via Next.js config

  // PostCSS Plugins (used in config)
  "postcss-preset-env",
  "postcss-nested",
  "postcss-import",
  "postcss-flexbugs-fixes",

  // Babel Presets and Plugins (used in config)
  "@babel/preset-env",
  "@babel/preset-react",
  "@babel/preset-typescript",
  "@babel/runtime",

  // ESLint Configs (used in config)
  "eslint-config-next",
  "eslint-config-prettier",
  "eslint-config-airbnb",
  "eslint-config-turbo",

  // Webpack Loaders (used in config)
  "babel-loader",
  "style-loader",
  "css-loader",
  "file-loader",
  "url-loader",

  // Type Enhancement Packages
  "@types/node", // Ambient types
  "@types/webpack-env", // Ambient types
  "@types/react/next", // Next.js types

  // Polyfills (often bundled)
  "core-js",
  "regenerator-runtime",

  // Build Enhancement
  "tslib", // TypeScript helpers
  "browserslist", // Used in package.json or config

  // Next.js Special Packages
  "@next/bundle-analyzer",
  "@next/mdx",
  "next-sitemap",
  "next-pwa",

  // Vite Plugins (used in config)
  "@vitejs/plugin-react",
  "@vitejs/plugin-vue",
  "vite-tsconfig-paths",

  // React Special Packages
  "@testing-library/react", // Often used implicitly by test setup
  "react-refresh", // Used by dev server

  // Meta-frameworks Enhancements
  "@nuxtjs/robots",
  "@nuxtjs/sitemap",
  "@sveltejs/adapter-auto",

  // Database Type Generators
  "prisma", // CLI and type generation
  "@prisma/client", // Auto-generated

  // GraphQL Type Generation
  "@graphql-codegen/cli",
  "@graphql-codegen/typescript",

  // Path Aliases
  "module-alias", // Used in startup
  "tsconfig-paths", // Used in startup

  // Environment and Config
  "dotenv-expand", // Used by build tools
  "cross-env", // Used in npm scripts

  // Build Optimization
  "terser", // Used by bundlers
  "cssnano", // Used by PostCSS

  // Storybook Addons (used in config)
  "@storybook/addon-essentials",
  "@storybook/addon-links",
  "@storybook/addon-docs",

  // Test Setup Packages
  "jsdom", // Used by test environment
  "identity-obj-proxy", // Used by Jest config

  // Monorepo Tools
  "@changesets/cli", // Used via CLI
  "turborepo", // Used via CLI

  // PWA Packages
  "workbox-webpack-plugin",
  "workbox-window",

  // Security and Headers
  "helmet", // Often used in Express setup
  "cors", // Often used in Express setup

  // Build Time Packages
  "sharp", // Used by Next.js Image
  "svgr", // Used by build process
] as const;

export const DEV_TOOL_PACKAGES_ARRAY = [
  // Build Tools & Bundlers
  "vite",
  "webpack",
  "rollup",
  "esbuild",
  "turbopack",
  "parcel",
  "@vitejs/plugin-react",
  "@vitejs/plugin-vue",
  "@vitejs/plugin-react-swc",

  // Transpilers & Compilers
  "typescript",
  "babel",
  "@babel/core",
  "@babel/preset-env",
  "@babel/preset-react",
  "@babel/preset-typescript",
  "swc",
  "@swc/core",
  "tsup",

  // Testing
  "jest",
  "vitest",
  "@testing-library/react",
  "@testing-library/vue",
  "@testing-library/jest-dom",
  "@testing-library/user-event",
  "cypress",
  "@cypress/vite-dev-server",
  "playwright",
  "@playwright/test",

  // Linting & Formatting
  "eslint",
  "prettier",
  "@typescript-eslint/parser",
  "@typescript-eslint/eslint-plugin",
  "eslint-config-prettier",
  "eslint-plugin-react",
  "eslint-plugin-react-hooks",
  "eslint-plugin-jsx-a11y",
  "eslint-plugin-import",
  "stylelint",
  "stylelint-config-standard",

  // Type Definitions
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "@types/jest",
  "@types/express",

  // CSS & Style Processing
  "postcss",
  "autoprefixer",
  "tailwindcss",
  "sass",
  "less",
  "stylus",
  "cssnano",

  // Development Servers & Watchers
  "nodemon",
  "concurrently",
  "live-server",
  "http-server",

  // Documentation
  "storybook",
  "@storybook/react",
  "@storybook/builder-vite",
  "typedoc",
  "docsify",
  "docusaurus",

  // Monorepo Tools
  "turbo",
  "nx",
  "lerna",

  // Build Optimization
  "terser",
  "compression-webpack-plugin",

  // Code Generation & Templates
  "plop",
  "hygen",
  "yeoman-generator",

  // Git Hooks & Commit Tools
  "husky",
  "lint-staged",
  "commitlint",
  "@commitlint/cli",
  "@commitlint/config-conventional",

  // Package Management
  "@microsoft/rush",
  "npm-check-updates",
  "depcheck",

  // Environment Management
  "cross-env",
  "dotenv-cli",

  // Performance & Bundle Analysis
  "webpack-bundle-analyzer",
  "vite-bundle-visualizer",
  "source-map-explorer",

  // Release & Versioning
  "semantic-release",
  "standard-version",
  "release-it",

  // Asset Optimization
  "imagemin",
  "svgo",

  // UI Development Tools
  "@shadcn/ui",
  "storybook-addon-designs",

  // Mock Services
  "msw",
  "json-server",

  // Compatibility
  "core-js",
  "browserslist",

  // CI Tools
  "gh-pages",
  "firebase-tools",
  "vercel",
  "netlify-cli",

  // Debugging
  "debug",
  "why-did-you-render",
  "react-devtools",

  // Security
  "snyk",
  "npm-audit-fix",

  // Internationalization Tools
  "i18next-parser",

  // API Documentation
  "swagger-jsdoc",
  "swagger-ui-express",

  // Performance Testing
  "lighthouse",
  "web-vitals",
] as const;

// Create Sets that accept strings
export const SPECIAL_PACKAGES: ReadonlySet<string> = new Set(
  SPECIAL_PACKAGES_ARRAY
);
export const DEV_TOOL_PACKAGES: ReadonlySet<string> = new Set(
  DEV_TOOL_PACKAGES_ARRAY
);

// Export types if you need them elsewhere
export type ConfigFile = (typeof CONFIG_FILES)[number];
export type SpecialPackage = (typeof SPECIAL_PACKAGES_ARRAY)[number];
export type DevToolPackage = (typeof DEV_TOOL_PACKAGES_ARRAY)[number];

// Type guard functions if you need to check if a string is a specific package type
export const isSpecialPackage = (pkg: string): pkg is SpecialPackage =>
  SPECIAL_PACKAGES.has(pkg);

export const isDevToolPackage = (pkg: string): pkg is DevToolPackage =>
  DEV_TOOL_PACKAGES.has(pkg);
