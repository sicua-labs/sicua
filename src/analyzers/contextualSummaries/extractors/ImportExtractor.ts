import ts from "typescript";
import * as path from "path";
import {
  DependencyContext,
  ExternalDependency,
  InternalDependency,
  ReactDependency,
  DependencyRelationship,
  DependencyPurpose,
} from "../types";
import { getDependencyPurpose, sanitizeFilePath } from "../utils/contextUtils";

export class ImportExtractor {
  private srcDir: string;

  constructor(srcDir: string) {
    this.srcDir = srcDir;
  }

  /**
   * Extracts all dependency context from a source file
   */
  extractDependencies(
    sourceFile: ts.SourceFile,
    filePath: string
  ): DependencyContext {
    const external: ExternalDependency[] = [];
    const internal: InternalDependency[] = [];
    const reactSpecific: ReactDependency = {
      hooks: [],
      components: [],
      patterns: [],
    };
    const utilityImports: string[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        this.processImportDeclaration(
          node,
          filePath,
          external,
          internal,
          reactSpecific,
          utilityImports
        );
      }
    });

    // Also check for dynamic imports
    this.extractDynamicImports(sourceFile, external, internal);

    return {
      external,
      internal,
      reactSpecific: [reactSpecific],
      utilityImports,
    };
  }

  /**
   * Processes a single import declaration
   */
  private processImportDeclaration(
    node: ts.ImportDeclaration,
    filePath: string,
    external: ExternalDependency[],
    internal: InternalDependency[],
    reactSpecific: ReactDependency,
    utilityImports: string[]
  ): void {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const importPath = moduleSpecifier.text;
    const isRelativeImport =
      importPath.startsWith("./") || importPath.startsWith("../");
    const isAbsoluteImport =
      importPath.startsWith("/") || importPath.startsWith("@/");

    if (isRelativeImport || isAbsoluteImport) {
      this.processInternalImport(node, importPath, filePath, internal);
    } else {
      this.processExternalImport(
        node,
        importPath,
        external,
        reactSpecific,
        utilityImports
      );
    }
  }

  /**
   * Processes internal (relative/absolute) imports
   */
  private processInternalImport(
    node: ts.ImportDeclaration,
    importPath: string,
    currentFilePath: string,
    internal: InternalDependency[]
  ): void {
    const resolvedPath = this.resolveInternalPath(importPath, currentFilePath);
    const relationship = this.determineRelationship(
      importPath,
      currentFilePath
    );
    const usageType = this.determineUsageType(node, resolvedPath);

    internal.push({
      path: sanitizeFilePath(resolvedPath, this.srcDir),
      relationship,
      usageType,
    });
  }

  /**
   * Processes external (npm package) imports
   */
  private processExternalImport(
    node: ts.ImportDeclaration,
    importPath: string,
    external: ExternalDependency[],
    reactSpecific: ReactDependency,
    utilityImports: string[]
  ): void {
    const packageName = this.extractPackageName(importPath);
    const purpose = getDependencyPurpose(packageName);
    const criticality = this.determineCriticality(packageName, purpose);

    // Handle React-specific imports
    if (packageName === "react" || packageName.startsWith("react-")) {
      this.processReactImport(node, packageName, reactSpecific);
    }

    // Add to external dependencies
    const existingDep = external.find((dep) => dep.name === packageName);
    if (!existingDep) {
      external.push({
        name: packageName,
        purpose,
        criticality,
      });
    }

    // Track utility imports
    if (purpose === "utility") {
      const importedNames = this.extractImportedNames(node);
      utilityImports.push(...importedNames);
    }
  }

  /**
   * Processes React-specific imports
   */
  private processReactImport(
    node: ts.ImportDeclaration,
    packageName: string,
    reactSpecific: ReactDependency
  ): void {
    const importedNames = this.extractImportedNames(node);

    importedNames.forEach((name) => {
      // React hooks
      if (name.startsWith("use")) {
        reactSpecific.hooks.push(name);
      }
      // React components
      else if (name[0] && name[0] === name[0].toUpperCase()) {
        reactSpecific.components.push(name);
      }
    });

    // Identify patterns based on package
    if (packageName === "react") {
      if (importedNames.includes("createContext")) {
        reactSpecific.patterns.push("context-provider");
      }
      if (importedNames.includes("Component")) {
        reactSpecific.patterns.push("class-component");
      }
    }
  }

  /**
   * Extracts dynamic imports (lazy loading, etc.)
   */
  private extractDynamicImports(
    sourceFile: ts.SourceFile,
    external: ExternalDependency[],
    internal: InternalDependency[]
  ): void {
    const visit = (node: ts.Node) => {
      // Handle import() expressions
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg)) {
          const importPath = arg.text;
          if (this.isExternalImport(importPath)) {
            const packageName = this.extractPackageName(importPath);
            const purpose = getDependencyPurpose(packageName);
            external.push({
              name: packageName,
              purpose,
              criticality: "medium", // Dynamic imports are usually less critical
            });
          }
        }
      }

      // Handle React.lazy
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (
          (ts.isIdentifier(expression) && expression.text === "lazy") ||
          (ts.isPropertyAccessExpression(expression) &&
            ts.isIdentifier(expression.expression) &&
            expression.expression.text === "React" &&
            ts.isIdentifier(expression.name) &&
            expression.name.text === "lazy")
        ) {
          // This is a lazy-loaded component
          const arg = node.arguments[0];
          if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
            // Look for dynamic import inside the function
            ts.forEachChild(arg, visit);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Extracts imported names from import declaration
   */
  private extractImportedNames(node: ts.ImportDeclaration): string[] {
    const names: string[] = [];

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        names.push(node.importClause.name.text);
      }

      // Named imports
      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach((element) => {
            names.push(element.name.text);
          });
        }
        // Namespace import
        else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          names.push(node.importClause.namedBindings.name.text);
        }
      }
    }

    return names;
  }

  /**
   * Resolves internal import path to absolute path
   */
  private resolveInternalPath(
    importPath: string,
    currentFilePath: string
  ): string {
    if (importPath.startsWith("@/")) {
      // Absolute import with alias
      return path.join(this.srcDir, importPath.substring(2));
    }

    // Relative import
    const currentDir = path.dirname(currentFilePath);
    return path.resolve(currentDir, importPath);
  }

  /**
   * Determines relationship type between files
   */
  private determineRelationship(
    importPath: string,
    currentFilePath: string
  ): DependencyRelationship {
    const currentDir = path.dirname(currentFilePath);
    const importDir = path.dirname(path.resolve(currentDir, importPath));

    // Same directory - likely siblings
    if (currentDir === importDir) {
      return "sibling";
    }

    // Parent directory
    if (importDir === path.dirname(currentDir)) {
      return "parent-child";
    }

    // Utility patterns
    if (importPath.includes("util") || importPath.includes("helper")) {
      return "utility-consumer";
    }

    // Type patterns
    if (importPath.includes("type") || importPath.includes("interface")) {
      return "type-provider";
    }

    // Service patterns
    if (importPath.includes("service") || importPath.includes("api")) {
      return "service-consumer";
    }

    // Config patterns
    if (importPath.includes("config") || importPath.includes("constant")) {
      return "config-consumer";
    }

    return "utility-consumer"; // Default
  }

  /**
   * Determines usage type based on import and file patterns
   */
  private determineUsageType(
    node: ts.ImportDeclaration,
    resolvedPath: string
  ): "component" | "utility" | "type" | "constant" | "hook" {
    const fileName = path.basename(resolvedPath);

    // Check file name patterns
    if (fileName.includes("type") || fileName.includes(".d.ts")) {
      return "type";
    }

    if (fileName.includes("constant") || fileName.includes("config")) {
      return "constant";
    }

    if (
      fileName.startsWith("use") &&
      fileName[3]?.toUpperCase() === fileName[3]
    ) {
      return "hook";
    }

    // Check import patterns
    const importedNames = this.extractImportedNames(node);
    const hasCapitalizedImports = importedNames.some(
      (name) => name[0] && name[0] === name[0].toUpperCase()
    );

    if (hasCapitalizedImports) {
      return "component";
    }

    return "utility";
  }

  /**
   * Extracts package name from import path
   */
  private extractPackageName(importPath: string): string {
    // Handle scoped packages
    if (importPath.startsWith("@")) {
      const parts = importPath.split("/");
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    }

    // Handle regular packages
    return importPath.split("/")[0];
  }

  /**
   * Determines if import is external (npm package)
   */
  private isExternalImport(importPath: string): boolean {
    return (
      !importPath.startsWith("./") &&
      !importPath.startsWith("../") &&
      !importPath.startsWith("/") &&
      !importPath.startsWith("@/")
    );
  }

  /**
   * Determines criticality of a dependency
   */
  private determineCriticality(
    packageName: string,
    purpose: DependencyPurpose
  ): "high" | "medium" | "low" {
    // Core dependencies
    if (["react", "react-dom", "next"].includes(packageName)) {
      return "high";
    }

    // Important functional dependencies
    if (["state-management", "routing", "data-fetching"].includes(purpose)) {
      return "high";
    }

    // UI and styling dependencies
    if (["ui-library", "styling", "form-handling"].includes(purpose)) {
      return "medium";
    }

    // Utilities and development tools
    if (["utility", "testing", "build-tool"].includes(purpose)) {
      return "low";
    }

    return "medium"; // Default
  }
}
