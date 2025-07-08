import * as path from "path";
import ts from "typescript";
import {
  FileContextType,
  ComplexityLevel,
  DependencyPurpose,
  ReactPattern,
  ExportType,
} from "../types";

/**
 * Determines the file context type based on file path, content, and AST
 */
export function determineFileContextType(
  filePath: string,
  content: string,
  sourceFile: ts.SourceFile
): FileContextType {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);

  // Test files
  if (
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    filePath.includes("__tests__")
  ) {
    return "test";
  }

  // Style files
  if ([".css", ".scss", ".less", ".module.css"].includes(ext)) {
    return "style";
  }

  // Config files
  if (
    fileName.includes("config") ||
    fileName.includes("Config") ||
    ["next.config.js", "webpack.config.js", "tailwind.config.js"].includes(
      fileName
    )
  ) {
    return "config";
  }

  // API routes (Next.js pattern)
  if (filePath.includes("/api/") || filePath.includes("\\api\\")) {
    return "api-route";
  }

  // Middleware
  if (fileName.includes("middleware") || fileName.includes("Middleware")) {
    return "middleware";
  }

  // Constants
  if (
    fileName.includes("constant") ||
    fileName.includes("Constant") ||
    fileName.toLowerCase().includes("enum")
  ) {
    return "constant";
  }

  // Type definitions
  if (
    fileName.includes(".types.") ||
    fileName.includes(".d.ts") ||
    hasOnlyTypeDefinitions(sourceFile)
  ) {
    return "type-definition";
  }

  // **FIXED: Check React components BEFORE hooks**
  // React components (check FIRST)
  if (hasReactComponentPattern(content, sourceFile, fileName)) {
    return "react-component";
  }

  // **FIXED: More specific React hook detection**
  // React hooks (check AFTER components, with better detection)
  if (isCustomHookFile(fileName, content, sourceFile)) {
    return "react-hook";
  }

  // Services
  if (
    fileName.includes("service") ||
    fileName.includes("Service") ||
    (fileName.includes("api") && !filePath.includes("/api/"))
  ) {
    return "service";
  }

  // Business logic (enhanced detection)
  if (isBusinessLogicFile(fileName, content)) {
    return "business-logic";
  }

  // Default to utility
  return "utility";
}

/**
 * **FIXED: Enhanced React component detection**
 * Checks if file has React component patterns with better logic
 */
function hasReactComponentPattern(
  content: string,
  sourceFile: ts.SourceFile,
  fileName: string
): boolean {
  // Strong indicators of React component
  const componentIndicators = [
    // File name patterns
    fileName.match(/^[A-Z][a-zA-Z]*\.(tsx|jsx)$/), // PascalCase .tsx/.jsx files

    // JSX usage
    content.includes("<") && content.includes("/>"),
    content.includes("return (") && content.includes("<"),
    content.includes("return <"),

    // React imports with component usage
    (content.includes("import React") || content.includes("from 'react'")) &&
      (content.includes("export default") ||
        content.includes("export const") ||
        content.includes("export function")),

    // Component-specific patterns
    content.includes("props:") && content.includes("React.FC"),
    content.includes("interface") && content.includes("Props"),

    // JSX elements
    /<[A-Z][a-zA-Z]*/.test(content), // JSX components like <MyComponent>

    // React patterns
    content.includes("children") && content.includes("React"),
  ];

  // Must have at least 2 strong indicators
  const indicatorCount = componentIndicators.filter(Boolean).length;

  // Additional check: file exports something that looks like a component
  const hasComponentExport = hasComponentExportPattern(content, fileName);

  return indicatorCount >= 2 || hasComponentExport;
}

/**
 * **NEW: Better custom hook detection**
 * Only files that export custom hooks should be classified as react-hook
 */
function isCustomHookFile(
  fileName: string,
  content: string,
  sourceFile: ts.SourceFile
): boolean {
  // File name starts with "use" and is PascalCase
  const hasHookFileName = fileName.match(/^use[A-Z][a-zA-Z]*\.(ts|tsx)$/);

  // Exports a function that starts with "use"
  const exportsHook =
    /export\s+(default\s+)?(?:function\s+|const\s+)use[A-Z][a-zA-Z]*/.test(
      content
    );

  // Contains React hook calls but is NOT a component
  const usesReactHooks =
    /use(State|Effect|Context|Reducer|Memo|Callback|Ref)/.test(content);
  const isNotComponent = !hasReactComponentPattern(
    content,
    sourceFile,
    fileName
  );

  // Must either have hook filename OR export a hook function
  // AND use React hooks AND not be a component
  return (hasHookFileName || exportsHook) && usesReactHooks && isNotComponent;
}

/**
 * **NEW: Detect business logic files**
 */
function isBusinessLogicFile(fileName: string, content: string): boolean {
  const businessPatterns = [
    fileName.toLowerCase().includes("logic"),
    fileName.toLowerCase().includes("service"),
    fileName.toLowerCase().includes("controller"),
    fileName.toLowerCase().includes("handler"),
    fileName.toLowerCase().includes("processor"),
    fileName.toLowerCase().includes("manager"),
    content.includes("business") && content.includes("logic"),
    content.includes("calculate") && content.includes("process"),
    content.includes("validate") && content.includes("rules"),
  ];

  return businessPatterns.filter(Boolean).length >= 2;
}

/**
 * **NEW: Check if file exports a component**
 */
function hasComponentExportPattern(content: string, fileName: string): boolean {
  const componentName = fileName.replace(/\.(tsx?|jsx?)$/, "");

  // Check for default export of component
  const defaultExportPatterns = [
    `export default ${componentName}`,
    `export default function ${componentName}`,
    `export { ${componentName} }`,
    `export { default as ${componentName} }`,
  ];

  return defaultExportPatterns.some((pattern) => content.includes(pattern));
}

/**
 * Calculates complexity level based on various metrics
 */
export function calculateComplexityLevel(
  sourceFile: ts.SourceFile,
  content: string
): ComplexityLevel {
  let complexityScore = 0;

  // Line count factor
  const lineCount = content.split("\n").length;
  if (lineCount > 200) complexityScore += 3;
  else if (lineCount > 100) complexityScore += 2;
  else if (lineCount > 50) complexityScore += 1;

  // Function count
  const functionCount = countFunctions(sourceFile);
  if (functionCount > 10) complexityScore += 2;
  else if (functionCount > 5) complexityScore += 1;

  // Import count
  const importCount = countImports(sourceFile);
  if (importCount > 15) complexityScore += 2;
  else if (importCount > 8) complexityScore += 1;

  // Nested complexity patterns
  if (content.includes("useEffect") && content.includes("useState"))
    complexityScore += 1;
  if (content.includes("useContext") || content.includes("useReducer"))
    complexityScore += 1;
  if (content.includes("async") && content.includes("await"))
    complexityScore += 1;
  if (content.includes("try") && content.includes("catch"))
    complexityScore += 1;

  // JSX complexity
  const jsxElementCount = (content.match(/<[A-Z]/g) || []).length;
  if (jsxElementCount > 20) complexityScore += 2;
  else if (jsxElementCount > 10) complexityScore += 1;

  // Return complexity level
  if (complexityScore >= 8) return "very-high";
  if (complexityScore >= 5) return "high";
  if (complexityScore >= 2) return "medium";
  return "low";
}

/**
 * Determines dependency purpose based on package name
 */
export function getDependencyPurpose(packageName: string): DependencyPurpose {
  const purposeMap: Record<string, DependencyPurpose> = {
    // UI Libraries
    "@mui/material": "ui-library",
    antd: "ui-library",
    "react-bootstrap": "ui-library",
    "chakra-ui": "ui-library",

    // State Management
    redux: "state-management",
    zustand: "state-management",
    recoil: "state-management",
    mobx: "state-management",

    // Routing
    "react-router": "routing",
    "next/router": "routing",
    "@reach/router": "routing",

    // Data Fetching
    axios: "data-fetching",
    swr: "data-fetching",
    "react-query": "data-fetching",
    "@tanstack/react-query": "data-fetching",

    // Styling
    "styled-components": "styling",
    emotion: "styling",
    tailwindcss: "styling",

    // Utilities
    lodash: "utility",
    ramda: "utility",
    uuid: "utility",

    // Validation
    yup: "validation",
    joi: "validation",
    zod: "validation",

    // Date/Time
    dayjs: "date-time",
    moment: "date-time",
    "date-fns": "date-time",

    // Animation
    "framer-motion": "animation",
    "react-spring": "animation",

    // Form Handling
    "react-hook-form": "form-handling",
    formik: "form-handling",
  };

  // Direct match
  if (purposeMap[packageName]) {
    return purposeMap[packageName];
  }

  // Pattern matching
  if (packageName.includes("react") && packageName.includes("form"))
    return "form-handling";
  if (packageName.includes("test") || packageName.includes("jest"))
    return "testing";
  if (packageName.includes("webpack") || packageName.includes("babel"))
    return "build-tool";
  if (packageName.includes("style") || packageName.includes("css"))
    return "styling";

  return "utility";
}

/**
 * Identifies React patterns in the source file
 */
export function identifyReactPatterns(
  sourceFile: ts.SourceFile,
  content: string
): ReactPattern[] {
  const patterns: ReactPattern[] = [];

  // Check for functional components
  if (
    (content.includes("function ") && content.includes("return (")) ||
    (content.includes("const ") && content.includes("=> ("))
  ) {
    patterns.push("functional-component");
  }

  // Check for class components
  if (content.includes("class ") && content.includes("extends Component")) {
    patterns.push("class-component");
  }

  // Check for custom hooks
  if (content.includes("function use") || content.includes("const use")) {
    patterns.push("custom-hook");
  }

  // Check for context patterns
  if (
    content.includes("createContext") ||
    content.includes("React.createContext")
  ) {
    patterns.push("context-provider");
  }
  if (content.includes("useContext")) {
    patterns.push("context-consumer");
  }

  // Check for HOC pattern
  if (
    content.includes("withComponent") ||
    content.includes("compose(") ||
    /return\s+function\s*\([^)]*\)\s*{/.test(content)
  ) {
    patterns.push("hoc");
  }

  // Check for render props
  if (content.includes("children(") || content.includes("render(")) {
    patterns.push("render-props");
  }

  // Check for controlled/uncontrolled patterns
  if (content.includes("value=") && content.includes("onChange=")) {
    patterns.push("controlled-component");
  }
  if (content.includes("defaultValue=") || content.includes("ref=")) {
    patterns.push("uncontrolled-component");
  }

  return patterns;
}

/**
 * Determines export type from AST node
 */
export function getExportType(node: ts.Node): ExportType {
  if (ts.isExportAssignment(node)) {
    if (
      ts.isFunctionExpression(node.expression) ||
      ts.isArrowFunction(node.expression)
    ) {
      return "default-function";
    }
    if (ts.isClassExpression(node.expression)) {
      return "default-class";
    }
    return "default-object";
  }

  if (ts.isExportDeclaration(node)) {
    // Handle named exports
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      // This is a re-export, need more context
      return "named-object";
    }
  }

  if (ts.isFunctionDeclaration(node)) {
    return "named-function";
  }

  if (ts.isClassDeclaration(node)) {
    return "named-class";
  }

  if (ts.isInterfaceDeclaration(node)) {
    return "named-interface";
  }

  if (ts.isTypeAliasDeclaration(node)) {
    return "named-type";
  }

  if (ts.isEnumDeclaration(node)) {
    return "named-enum";
  }

  if (ts.isVariableStatement(node)) {
    return "named-constant";
  }

  return "named-object";
}

/**
 * Estimates token count for a given text
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token for code
  return Math.ceil(text.length / 4);
}

/**
 * Sanitizes file path for display
 */
export function sanitizeFilePath(filePath: string, srcDir: string): string {
  return path.relative(srcDir, filePath).replace(/\\/g, "/");
}

/**
 * Checks if file contains only type definitions
 */
function hasOnlyTypeDefinitions(sourceFile: ts.SourceFile): boolean {
  let hasNonTypeDeclaration = false;

  ts.forEachChild(sourceFile, (node) => {
    if (
      !ts.isInterfaceDeclaration(node) &&
      !ts.isTypeAliasDeclaration(node) &&
      !ts.isEnumDeclaration(node) &&
      !ts.isImportDeclaration(node) &&
      !ts.isExportDeclaration(node)
    ) {
      hasNonTypeDeclaration = true;
    }
  });

  return !hasNonTypeDeclaration;
}

/**
 * Counts functions in source file
 */
function countFunctions(sourceFile: ts.SourceFile): number {
  let count = 0;

  function visit(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      count++;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return count;
}

/**
 * Counts imports in source file
 */
function countImports(sourceFile: ts.SourceFile): number {
  let count = 0;

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      count++;
    }
  });

  return count;
}
