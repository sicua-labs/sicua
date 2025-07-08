import * as path from "path";
import * as fs from "fs";

/**
 * Helper class to distinguish between internal project components and external node_modules dependencies
 */
export class NodeModuleDetector {
  private projectRoot: string;
  private srcDirectory: string;
  private packageJsonDependencies: Set<string>;

  constructor(projectRoot: string, srcDirectory: string) {
    this.projectRoot = projectRoot;
    this.srcDirectory = srcDirectory;
    this.packageJsonDependencies = new Set();
    this.loadDependencies();
  }

  /**
   * Determines if a component import is external (from node_modules) or internal - FIXED VERSION
   */
  isExternalComponent(importPath: string, currentFilePath: string): boolean {
    // Relative imports are always internal
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      return false;
    }

    // Handle path aliases like @/components/ui/card - these are INTERNAL
    if (importPath.startsWith("@/")) {
      return false; // Path aliases are internal project components
    }

    // Check for Next.js built-in components (external)
    if (this.isNextJSBuiltIn(importPath)) {
      return true;
    }

    // Check for React built-in imports (external)
    if (this.isReactBuiltInImport(importPath)) {
      return true;
    }

    // Absolute imports starting with @ (but not @/) are likely scoped packages (external)
    if (importPath.startsWith("@") && !importPath.startsWith("@/")) {
      return this.isPackageDependency(importPath);
    }

    // If import doesn't contain any path separators, it's likely a bare package name (external)
    if (!importPath.includes("/")) {
      return this.isPackageDependency(importPath);
    }

    // Check if it's a known package dependency first
    if (this.isPackageDependency(importPath)) {
      return true;
    }

    // Check if the resolved path points to node_modules
    const resolvedPath = this.resolveImportPath(importPath, currentFilePath);
    if (resolvedPath && resolvedPath.includes("node_modules")) {
      return true;
    }

    // If we can resolve it to a file within our project, it's internal
    if (resolvedPath && this.isWithinProjectSource(resolvedPath)) {
      return false;
    }

    // If it looks like an internal path pattern but we can't resolve it, assume internal
    if (this.looksLikeInternalPath(importPath)) {
      return false;
    }

    // Default to external if we can't determine
    return true;
  }

  /**
   * Checks if import path looks like an internal project path - UPDATED
   */
  private looksLikeInternalPath(importPath: string): boolean {
    // Common internal path patterns
    const internalPatterns = [
      /^components\//,
      /^src\//,
      /^app\//,
      /^lib\//,
      /^utils\//,
      /^hooks\//,
      /^pages\//,
      /^styles\//,
      /^types\//,
      /^constants\//,
      /^@\//, // Path aliases are internal
    ];

    return internalPatterns.some((pattern) => pattern.test(importPath));
  }

  /**
   * Checks if an import is a Next.js built-in component - NEW METHOD
   */
  private isNextJSBuiltIn(importPath: string): boolean {
    const nextJSBuiltIns = [
      "next/link",
      "next/image",
      "next/head",
      "next/script",
      "next/router",
      "next/navigation",
      "next/app",
      "next/document",
      "next/error",
      "next/font",
      "next/headers",
      "next/cookies",
      "next/cache",
      "next/server",
    ];

    return nextJSBuiltIns.some(
      (builtin) =>
        importPath === builtin || importPath.startsWith(builtin + "/")
    );
  }

  /**
   * Checks if an import is a React built-in import - NEW METHOD
   */
  private isReactBuiltInImport(importPath: string): boolean {
    const reactBuiltIns = [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom/client",
      "react-dom/server",
    ];

    return reactBuiltIns.some(
      (builtin) =>
        importPath === builtin || importPath.startsWith(builtin + "/")
    );
  }

  /**
   * Extracts the package name from an import path
   */
  getPackageName(importPath: string): string {
    // Handle scoped packages (@org/package)
    if (importPath.startsWith("@") && !importPath.startsWith("@/")) {
      const parts = importPath.split("/");
      return parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0];
    }

    // Handle regular packages
    return importPath.split("/")[0];
  }

  /**
   * Checks if a component reference is a native HTML element
   */
  isNativeHTMLElement(componentName: string): boolean {
    const htmlElements = new Set([
      "div",
      "span",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "a",
      "img",
      "button",
      "input",
      "form",
      "label",
      "select",
      "option",
      "textarea",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "ul",
      "ol",
      "li",
      "nav",
      "header",
      "footer",
      "main",
      "section",
      "article",
      "aside",
      "figure",
      "figcaption",
      "video",
      "audio",
      "canvas",
      "svg",
      "path",
      "circle",
      "rect",
      "line",
      "polygon",
      "iframe",
      "embed",
      "object",
      "pre",
      "code",
      "blockquote",
      "hr",
      "br",
      "strong",
      "em",
      "small",
      "mark",
      "del",
      "ins",
      "sub",
      "sup",
    ]);

    return htmlElements.has(componentName.toLowerCase());
  }

  /**
   * Checks if a component reference is a React built-in (Fragment, Suspense, etc.) - UPDATED
   */
  isReactBuiltIn(componentName: string): boolean {
    const reactBuiltIns = new Set([
      "Fragment",
      "Suspense",
      "StrictMode",
      "Profiler",
      "React.Fragment",
      "React.Suspense",
      "React.StrictMode",
      "React.Profiler",
      "ErrorBoundary", // Note: This is not actually a React built-in, removing it
      "Transition",
      "SuspenseList",
      "ConcurrentMode",
      "unstable_ConcurrentMode",
    ]);

    return reactBuiltIns.has(componentName);
  }

  /**
   * Determines if an import should be considered internal to the project
   */
  isInternalImport(importPath: string, currentFilePath: string): boolean {
    // Skip native HTML elements and React built-ins
    if (
      this.isNativeHTMLElement(importPath) ||
      this.isReactBuiltIn(importPath)
    ) {
      return false;
    }

    return !this.isExternalComponent(importPath, currentFilePath);
  }

  /**
   * Resolves the full file path for an internal component
   */
  resolveInternalComponentPath(
    importPath: string,
    currentFilePath: string
  ): string | null {
    if (this.isExternalComponent(importPath, currentFilePath)) {
      return null;
    }

    const resolvedPath = this.resolveImportPath(importPath, currentFilePath);
    if (resolvedPath && this.isWithinProjectSource(resolvedPath)) {
      return resolvedPath;
    }

    return null;
  }

  /**
   * Gets real external dependencies from import paths - NEW METHOD
   */
  getRealExternalDependencies(importPaths: string[]): string[] {
    const externalDeps = new Set<string>();

    for (const importPath of importPaths) {
      if (this.isExternalComponent(importPath, "")) {
        const packageName = this.getPackageName(importPath);
        externalDeps.add(packageName);
      }
    }

    return Array.from(externalDeps);
  }

  /**
   * Private method to load dependencies from package.json
   */
  private loadDependencies(): void {
    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      const peerDependencies = packageJson.peerDependencies || {};

      Object.keys(dependencies).forEach((dep) =>
        this.packageJsonDependencies.add(dep)
      );
      Object.keys(devDependencies).forEach((dep) =>
        this.packageJsonDependencies.add(dep)
      );
      Object.keys(peerDependencies).forEach((dep) =>
        this.packageJsonDependencies.add(dep)
      );

      // Add known external packages that might not be in package.json
      const knownExternals = [
        "react",
        "react-dom",
        "next",
        "@types/react",
        "@types/react-dom",
        "@types/node",
        "typescript",
      ];

      knownExternals.forEach((dep) => this.packageJsonDependencies.add(dep));
    } catch (error) {
      console.warn("Could not load package.json dependencies:", error);
    }
  }

  /**
   * Private method to check if a package is listed in dependencies
   */
  private isPackageDependency(importPath: string): boolean {
    const packageName = this.getPackageName(importPath);
    return this.packageJsonDependencies.has(packageName);
  }

  /**
   * Private method to resolve import paths - ENHANCED
   */
  private resolveImportPath(
    importPath: string,
    currentFilePath: string
  ): string | null {
    try {
      // Handle relative imports
      if (importPath.startsWith("./") || importPath.startsWith("../")) {
        const currentDir = path.dirname(currentFilePath);
        const resolvedPath = path.resolve(currentDir, importPath);

        // Try different extensions
        const extensions = [
          ".tsx",
          ".ts",
          ".jsx",
          ".js",
          "/index.tsx",
          "/index.ts",
          "/index.jsx",
          "/index.js",
        ];
        for (const ext of extensions) {
          const fullPath = resolvedPath + ext;
          if (fs.existsSync(fullPath)) {
            return fullPath;
          }
        }
      }

      // Handle path aliases (@/...) - these are INTERNAL
      if (importPath.startsWith("@/")) {
        const aliasPath = importPath.replace("@/", "");

        // Try both src directory and project root
        const possibleBases = [
          this.srcDirectory,
          path.join(this.projectRoot, "src"),
          this.projectRoot,
        ];

        for (const base of possibleBases) {
          const srcBasedPath = path.join(base, aliasPath);
          const extensions = [
            ".tsx",
            ".ts",
            ".jsx",
            ".js",
            "/index.tsx",
            "/index.ts",
            "/index.jsx",
            "/index.js",
          ];

          for (const ext of extensions) {
            const fullPath = srcBasedPath + ext;
            if (fs.existsSync(fullPath)) {
              return fullPath;
            }
          }
        }
      }

      // Handle absolute imports from src (without @/) - treat as internal
      if (!importPath.startsWith("@") && !importPath.includes("node_modules")) {
        const possibleBases = [
          this.srcDirectory,
          path.join(this.projectRoot, "src"),
          this.projectRoot,
        ];

        for (const base of possibleBases) {
          const srcBasedPath = path.join(base, importPath);
          const extensions = [
            ".tsx",
            ".ts",
            ".jsx",
            ".js",
            "/index.tsx",
            "/index.ts",
            "/index.jsx",
            "/index.js",
          ];

          for (const ext of extensions) {
            const fullPath = srcBasedPath + ext;
            if (fs.existsSync(fullPath)) {
              return fullPath;
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Private method to check if a path is within the project source directory
   */
  private isWithinProjectSource(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    const normalizedSrc = path.normalize(this.srcDirectory);
    const normalizedProject = path.normalize(this.projectRoot);

    return (
      normalizedPath.startsWith(normalizedSrc) ||
      (normalizedPath.startsWith(normalizedProject) &&
        !normalizedPath.includes("node_modules"))
    );
  }
}
