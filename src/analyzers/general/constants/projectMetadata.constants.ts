/**
 * Constants for Project Metadata Detection
 */

/**
 * Framework and runtime packages with their detection keys
 */
export const FRAMEWORK_PACKAGES = [
  {
    key: "react",
    packageNames: ["react", "react-dom"],
  },
  {
    key: "nextjs",
    packageNames: ["next", "@next/core"],
  },
  {
    key: "typescript",
    packageNames: ["typescript"],
  },
] as const;

/**
 * Development tools categorized by functionality
 */
export const DEVELOPMENT_TOOLS = {
  buildTools: [
    "webpack",
    "rollup",
    "esbuild",
    "swc",
    "@swc/core",
    "turbo",
    "turborepo",
  ],
  linting: [
    "eslint",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    "prettier",
    "@next/eslint-config-next",
  ],
  testing: [
    "jest",
    "@jest/core",
    "vitest",
    "@vitest/ui",
    "cypress",
    "@cypress/react",
    "playwright",
    "@playwright/test",
    "@testing-library/react",
    "@testing-library/jest-dom",
    "@testing-library/user-event",
    "react-test-renderer",
  ],
  bundlers: ["vite", "@vitejs/plugin-react", "parcel"],
} as const;

/**
 * UI and styling related packages
 */
export const UI_STYLING_PACKAGES = {
  cssFrameworks: [
    "tailwindcss",
    "@tailwindcss/typography",
    "@tailwindcss/forms",
    "bootstrap",
    "bulma",
    "foundation-sites",
  ],
  uiLibraries: [
    "@mui/material",
    "@mui/x-data-grid",
    "@mui/lab",
    "antd",
    "@ant-design/icons",
    "@chakra-ui/react",
    "@chakra-ui/icons",
    "@mantine/core",
    "@mantine/hooks",
    "@headlessui/react",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "react-bootstrap",
    "semantic-ui-react",
    "grommet",
    "evergreen-ui",
  ],
  iconLibraries: [
    "lucide-react",
    "react-icons",
    "@heroicons/react",
    "@phosphor-icons/react",
    "react-feather",
    "@tabler/icons-react",
  ],
} as const;

/**
 * State management libraries
 */
export const STATE_MANAGEMENT_PACKAGES = [
  "@reduxjs/toolkit",
  "redux",
  "react-redux",
  "zustand",
  "jotai",
  "recoil",
  "@tanstack/react-query",
  "react-query",
  "swr",
  "valtio",
  "mobx",
  "mobx-react-lite",
  "xstate",
  "@xstate/react",
] as const;

/**
 * Configuration files to detect by category
 */
export const CONFIG_FILES = {
  nextConfig: ["next.config.js", "next.config.mjs", "next.config.ts"],
  tsConfig: ["tsconfig.json"],
  eslintConfig: [
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.json",
    ".eslintrc.yml",
    ".eslintrc.yaml",
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.ts",
  ],
  prettierConfig: [
    ".prettierrc",
    ".prettierrc.js",
    ".prettierrc.json",
    ".prettierrc.yml",
    ".prettierrc.yaml",
    "prettier.config.js",
    "prettier.config.mjs",
  ],
  jestConfig: [
    "jest.config.js",
    "jest.config.ts",
    "jest.config.mjs",
    "jest.config.json",
  ],
  vitestConfig: ["vitest.config.js", "vitest.config.ts", "vitest.config.mjs"],
  playwrightConfig: ["playwright.config.js", "playwright.config.ts"],
  cypressConfig: ["cypress.config.js", "cypress.config.ts"],
} as const;
