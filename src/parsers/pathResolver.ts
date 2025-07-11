import * as path from "path";
import { IConfigManager, ScanResult } from "../types";

export interface ParseContext {
  projectType: "nextjs" | "react";
  routerType?: "app" | "pages";
  sourceDirectory: string;
  projectRoot: string;
}

export interface PathResolutionResult {
  normalizedPath: string;
  isExternal: boolean;
  packageName?: string;
}

/**
 * High-performance path resolution service
 * Centralizes and optimizes all path normalization and resolution logic
 */
export class PathResolver {
  private readonly context: ParseContext;
  private readonly filePathSet: Set<string>;
  private readonly relativePathSet: Set<string>;

  constructor(config: IConfigManager, scanResult: ScanResult) {
    this.context = this.createParseContext(config);
    this.filePathSet = new Set(scanResult.filePaths);
    this.relativePathSet = this.buildRelativePathSet(
      scanResult.filePaths,
      config.projectPath
    );
  }

  /**
   * Normalize file path relative to appropriate base directory
   */
  normalizeFilePath(filePath: string): string {
    // Try to make path relative to source directory first
    if (filePath.startsWith(this.context.sourceDirectory)) {
      const relativePath = path.relative(
        this.context.sourceDirectory,
        filePath
      );
      return relativePath || ".";
    }

    // Fallback to project root
    const relativePath = path.relative(this.context.projectRoot, filePath);
    return relativePath || ".";
  }

  /**
   * Extract directory for component relation
   */
  extractDirectory(filePath: string): string {
    const normalizedPath = this.normalizeFilePath(filePath);
    const directory = path.dirname(normalizedPath);

    // Handle root directory cases
    if (directory === "." || directory === "") {
      return "/";
    }

    return directory;
  }

  /**
   * Resolve import path considering project structure with O(1) lookup
   */
  resolveImportPath(
    importPath: string,
    currentFile: string
  ): PathResolutionResult {
    const cleanPath = importPath.replace(/['"]/g, "").trim();

    // Check if it's external first (most common case)
    if (this.isExternalPackage(cleanPath)) {
      return {
        normalizedPath: cleanPath,
        isExternal: true,
        packageName: this.extractPackageName(cleanPath),
      };
    }

    // Handle internal imports
    if (cleanPath.startsWith(".") || cleanPath.startsWith("/")) {
      try {
        const currentDir = path.dirname(currentFile);
        let resolvedPath: string;

        if (cleanPath.startsWith(".")) {
          // Relative import
          resolvedPath = path.resolve(currentDir, cleanPath);
        } else {
          // Absolute import from project root
          resolvedPath = path.resolve(
            this.context.projectRoot,
            cleanPath.substring(1)
          );
        }

        const normalizedPath = this.normalizeFilePath(resolvedPath);
        return {
          normalizedPath,
          isExternal: false,
        };
      } catch (error) {
        console.warn(
          `Failed to resolve import path: ${importPath} from ${currentFile}`
        );
        return {
          normalizedPath: cleanPath,
          isExternal: false,
        };
      }
    }

    // Default to treating as internal if not clearly external
    return {
      normalizedPath: cleanPath,
      isExternal: false,
    };
  }

  /**
   * Check if import is external package with O(1) performance
   */
  isExternalPackage(importPath: string): boolean {
    const cleanPath = importPath.replace(/['"]/g, "").trim();

    // Definitely internal patterns - return false immediately
    if (
      cleanPath.startsWith("./") ||
      cleanPath.startsWith("../") ||
      cleanPath.startsWith("@/") ||
      cleanPath.startsWith("/") ||
      cleanPath.includes("\\") ||
      cleanPath.startsWith("app/") ||
      cleanPath.startsWith("pages/") ||
      cleanPath.startsWith("components/") ||
      cleanPath.startsWith("lib/") ||
      cleanPath.startsWith("utils/") ||
      cleanPath.startsWith("hooks/") ||
      cleanPath.startsWith("types/") ||
      cleanPath.startsWith("src/") ||
      cleanPath.startsWith("styles/") ||
      cleanPath.endsWith(".css") ||
      cleanPath.endsWith(".scss") ||
      cleanPath.endsWith(".sass") ||
      cleanPath.endsWith(".less") ||
      cleanPath.endsWith(".module.css") ||
      cleanPath.includes(".types") ||
      cleanPath.includes(".schema")
    ) {
      return false;
    }

    // Check against precomputed relative paths set - O(1) lookup
    const pathVariations = this.generatePathVariations(cleanPath);
    for (const variation of pathVariations) {
      if (this.relativePathSet.has(variation)) {
        return false; // It's internal
      }
    }

    // Check if it's a known npm package pattern
    return this.isValidPackagePattern(cleanPath);
  }

  /**
   * Extract package name from import path
   */
  extractPackageName(importPath: string): string {
    const cleanPath = importPath.replace(/['"]/g, "").trim();

    // Scoped package (e.g., @react/types)
    if (cleanPath.startsWith("@")) {
      const parts = cleanPath.split("/");
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return parts[0];
    }

    // Regular package (e.g., react, lodash/get)
    const firstPart = cleanPath.split("/")[0];
    return firstPart;
  }

  /**
   * Enhanced component detection based on project structure
   */
  shouldTreatAsComponent(filePath: string): boolean {
    const fileName = path.basename(filePath, path.extname(filePath));
    const normalizedPath = this.normalizeFilePath(filePath);

    // Next.js specific component detection
    if (this.context.projectType === "nextjs") {
      // App router specific files
      if (this.context.routerType === "app") {
        const appRouterFiles = [
          "layout",
          "page",
          "loading",
          "error",
          "not-found",
          "template",
          "default",
        ];
        if (appRouterFiles.includes(fileName.toLowerCase())) {
          return true;
        }
      }

      // Pages router specific files
      if (this.context.routerType === "pages") {
        const pagesRouterFiles = ["_app", "_document", "_error", "404", "500"];
        if (pagesRouterFiles.includes(fileName)) {
          return true;
        }
      }
    }

    // General component detection
    const isReactFile = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
    const isComponentName = /^[A-Z]/.test(fileName); // Starts with capital letter
    const isInComponentsDir = normalizedPath.includes("component");

    return isReactFile && (isComponentName || isInComponentsDir);
  }

  /**
   * Create parse context from config
   */
  private createParseContext(config: IConfigManager): ParseContext {
    const projectStructure = config.getProjectStructure();

    return {
      projectType: projectStructure?.projectType || "react",
      routerType: projectStructure?.routerType,
      sourceDirectory: config.srcDir,
      projectRoot: config.projectPath,
    };
  }

  /**
   * Build set of relative paths for O(1) lookup
   */
  private buildRelativePathSet(
    filePaths: string[],
    projectRoot: string
  ): Set<string> {
    const relativePathSet = new Set<string>();

    for (const filePath of filePaths) {
      const relativePath = path
        .relative(projectRoot, filePath)
        .replace(/\\/g, "/");

      // Add all variations that might be used in imports
      const variations = this.generatePathVariations(relativePath);
      for (const variation of variations) {
        relativePathSet.add(variation);
      }
    }

    return relativePathSet;
  }

  /**
   * Generate path variations for import matching
   */
  private generatePathVariations(basePath: string): string[] {
    const variations = [basePath];

    // Add with different extensions
    const withoutExt = basePath.replace(/\.(ts|tsx|js|jsx)$/, "");
    variations.push(withoutExt);
    variations.push(`${withoutExt}.ts`);
    variations.push(`${withoutExt}.tsx`);
    variations.push(`${withoutExt}.js`);
    variations.push(`${withoutExt}.jsx`);

    // Add index variations
    variations.push(`${withoutExt}/index.ts`);
    variations.push(`${withoutExt}/index.tsx`);
    variations.push(`${withoutExt}/index.js`);
    variations.push(`${withoutExt}/index.jsx`);

    // Add variations that might match directory paths
    if (basePath.includes("/")) {
      const parts = basePath.split("/");
      const fileName = parts[parts.length - 1];
      const dirPath = parts.slice(0, -1).join("/");

      variations.push(fileName);
      variations.push(dirPath);
    }

    return variations.filter((v) => v.length > 0);
  }

  /**
   * Check if string matches valid npm package pattern
   */
  private isValidPackagePattern(cleanPath: string): boolean {
    // Scoped package (e.g., @org/package)
    if (cleanPath.startsWith("@") && cleanPath.includes("/")) {
      const parts = cleanPath.split("/");
      return (
        parts.length >= 2 && parts[0].startsWith("@") && parts[1].length > 0
      );
    }

    // Regular package (e.g., react, lodash)
    if (!cleanPath.includes("/")) {
      return /^[a-z0-9][a-z0-9\-_]*$/i.test(cleanPath);
    }

    // Package subpath (e.g., lodash/get, react-dom/client)
    const firstPart = cleanPath.split("/")[0];
    return firstPart.length > 0 && /^[a-z0-9][a-z0-9\-_]*$/i.test(firstPart);
  }
}
