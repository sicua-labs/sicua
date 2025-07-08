import * as path from "path";
import * as fs from "fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { NodeModuleDetector } from "../utils/NodeModuleDetector";
import {
  ImportReference,
  ComponentFlowNode,
  ComponentReference,
} from "../types";
import { ComponentRelation } from "../../../types";

/**
 * Resolves component references to actual component files and handles external dependencies
 */
export class ComponentReferenceResolver {
  private nodeModuleDetector: NodeModuleDetector;
  private componentMap: Map<string, ComponentRelation>;
  private importMap: Map<string, ImportReference[]>;
  private resolveCache: Map<string, ComponentFlowNode | null>;

  constructor(
    projectRoot: string,
    srcDirectory: string,
    components: ComponentRelation[]
  ) {
    this.nodeModuleDetector = new NodeModuleDetector(projectRoot, srcDirectory);
    this.componentMap = new Map();
    this.importMap = new Map();
    this.resolveCache = new Map();

    this.buildComponentMap(components);
    this.buildImportMap(components);
  }

  /**
   * Resolves a component reference to a ComponentFlowNode - FIXED VERSION
   */
  resolveComponentReference(
    reference: ComponentReference,
    currentFilePath: string
  ): ComponentFlowNode | null {
    const cacheKey = `${currentFilePath}:${reference.name}`;

    if (this.resolveCache.has(cacheKey)) {
      return this.resolveCache.get(cacheKey) || null;
    }

    const resolved = this.performResolution(reference, currentFilePath);
    this.resolveCache.set(cacheKey, resolved);

    return resolved;
  }

  /**
   * Resolves multiple component references
   */
  resolveMultipleReferences(
    references: ComponentReference[],
    currentFilePath: string
  ): ComponentFlowNode[] {
    const resolved: ComponentFlowNode[] = [];

    for (const reference of references) {
      const node = this.resolveComponentReference(reference, currentFilePath);
      if (node) {
        resolved.push(node);
      }
    }

    return resolved;
  }

  /**
   * Gets all imports for a specific file by parsing the actual file content
   */
  getFileImports(filePath: string): ImportReference[] {
    // Check cache first
    if (this.importMap.has(filePath)) {
      return this.importMap.get(filePath)!;
    }

    // Parse file directly if not in cache
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const imports = this.parseImportsFromContent(content);
      this.importMap.set(filePath, imports);
      return imports;
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Parses imports directly from file content using AST
   */
  private parseImportsFromContent(content: string): ImportReference[] {
    const imports: ImportReference[] = [];

    try {
      const ast = parse(content, {
        sourceType: "module",
        plugins: [
          "jsx",
          "typescript",
          "decorators",
          "classProperties",
          "exportDefaultFrom",
          "exportNamespaceFrom",
          "dynamicImport",
        ],
        errorRecovery: true,
      });

      traverse(ast, {
        ImportDeclaration: (path) => {
          const source = path.node.source.value;

          for (const specifier of path.node.specifiers) {
            if (t.isImportDefaultSpecifier(specifier)) {
              imports.push({
                name: specifier.local.name,
                source,
                isDefault: true,
                isNamespace: false,
                localName: specifier.local.name,
              });
            } else if (t.isImportNamespaceSpecifier(specifier)) {
              imports.push({
                name: "*",
                source,
                isDefault: false,
                isNamespace: true,
                localName: specifier.local.name,
              });
            } else if (t.isImportSpecifier(specifier)) {
              const importedName = t.isIdentifier(specifier.imported)
                ? specifier.imported.name
                : specifier.imported.value;

              imports.push({
                name: importedName,
                source,
                isDefault: false,
                isNamespace: false,
                localName: specifier.local.name,
              });
            }
          }
        },
      });
    } catch (error) {
      console.warn("Failed to parse imports from content:", error);
    }

    return imports;
  }

  /**
   * Checks if a component name is externally imported in a file
   */
  isExternallyImported(componentName: string, filePath: string): boolean {
    const imports = this.getFileImports(filePath);

    for (const importRef of imports) {
      if (
        (importRef.localName === componentName ||
          importRef.name === componentName) &&
        this.nodeModuleDetector.isExternalComponent(importRef.source, filePath)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolves the actual file path for a component
   */
  resolveComponentFilePath(
    componentName: string,
    currentFilePath: string
  ): string | null {
    // Check imports to resolve the component
    const imports = this.getFileImports(currentFilePath);
    const importRef = this.findComponentInImports(componentName, imports);

    if (!importRef) {
      // If no import found, check if it's directly mapped in our component map
      const directMatch = this.findDirectComponentMatch(componentName);
      return directMatch ? directMatch.fullPath : null;
    }

    // Skip external imports
    if (
      this.nodeModuleDetector.isExternalComponent(
        importRef.source,
        currentFilePath
      )
    ) {
      return null;
    }

    // Resolve the import path for internal components
    const resolvedPath = this.nodeModuleDetector.resolveInternalComponentPath(
      importRef.source,
      currentFilePath
    );

    if (resolvedPath) {
      return resolvedPath;
    }

    // Try to find by import source in component map
    return this.findComponentByImportSource(importRef.source);
  }

  /**
   * Extracts the actual component name from a file path - NEW METHOD
   */
  private extractComponentNameFromFile(filePath: string): string {
    try {
      // Try to extract from file content first
      const content = fs.readFileSync(filePath, "utf-8");
      const componentName = this.extractComponentNameFromContent(content);
      if (componentName) {
        return componentName;
      }
    } catch (error) {
      // Fall back to filename-based extraction if file read fails
    }

    // Fallback: extract from filename
    const fileName = path.basename(filePath, path.extname(filePath));

    // Handle common patterns
    if (fileName === "index") {
      // For index files, use the directory name
      const dirName = path.basename(path.dirname(filePath));
      return this.toPascalCase(dirName);
    }

    return this.toPascalCase(fileName);
  }

  /**
   * Extracts component name from file content using AST - NEW METHOD
   */
  private extractComponentNameFromContent(content: string): string | null {
    try {
      const ast = parse(content, {
        sourceType: "module",
        plugins: [
          "jsx",
          "typescript",
          "decorators",
          "classProperties",
          "exportDefaultFrom",
          "exportNamespaceFrom",
          "dynamicImport",
        ],
        errorRecovery: true,
      });

      let componentName: string | null = null;

      traverse(ast, {
        // Check for default export function declarations
        ExportDefaultDeclaration: (path) => {
          const declaration = path.node.declaration;

          if (t.isFunctionDeclaration(declaration) && declaration.id) {
            componentName = declaration.id.name;
          } else if (t.isIdentifier(declaration)) {
            componentName = declaration.name;
          }
        },

        // Check for function declarations that look like components
        FunctionDeclaration: (path) => {
          const func = path.node;
          if (func.id && this.isLikelyReactComponent(func.id.name)) {
            componentName = func.id.name;
          }
        },

        // Check for variable declarations with arrow functions
        VariableDeclarator: (path) => {
          if (
            t.isIdentifier(path.node.id) &&
            (t.isArrowFunctionExpression(path.node.init) ||
              t.isFunctionExpression(path.node.init)) &&
            this.isLikelyReactComponent(path.node.id.name)
          ) {
            componentName = path.node.id.name;
          }
        },
      });

      return componentName;
    } catch (error) {
      return null;
    }
  }

  /**
   * Checks if a name looks like a React component - NEW METHOD
   */
  private isLikelyReactComponent(name: string): boolean {
    // React components should start with uppercase and not be common non-component names
    const nonComponentNames = ["App", "Document", "Error", "Layout"];
    return (
      name.charAt(0) === name.charAt(0).toUpperCase() &&
      !nonComponentNames.includes(name)
    );
  }

  /**
   * Converts string to PascalCase - NEW METHOD
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  /**
   * Performs the actual resolution logic - FIXED VERSION
   */
  private performResolution(
    reference: ComponentReference,
    currentFilePath: string
  ): ComponentFlowNode | null {
    const componentName = reference.name;

    // Skip native HTML elements
    if (this.nodeModuleDetector.isNativeHTMLElement(componentName)) {
      return null;
    }

    // Skip React built-ins
    if (this.nodeModuleDetector.isReactBuiltIn(componentName)) {
      return null;
    }

    // Check if it's an external component
    if (this.isExternallyImported(componentName, currentFilePath)) {
      return {
        componentName, // Use the actual component name, not file path
        filePath: "", // External components don't have local file paths
        isExternal: true,
        conditionalRenders: [],
        children: [],
      };
    }

    // Try to resolve internal component
    const filePath = this.resolveComponentFilePath(
      componentName,
      currentFilePath
    );

    if (!filePath) {
      // Check if it might be an external component that we missed
      const imports = this.getFileImports(currentFilePath);
      const importRef = this.findComponentInImports(componentName, imports);

      if (importRef) {
        // If we found an import but couldn't resolve the path, it's likely external
        return {
          componentName, // Use the actual component name
          filePath: "",
          isExternal: true,
          conditionalRenders: [],
          children: [],
        };
      }

      // Component not found anywhere
      return null;
    }

    // Use the original component name from the reference, not from file extraction
    // The reference name (e.g., "Card") is what matters for the flow tree
    return {
      componentName: componentName, // Use the original reference name (e.g., "Card")
      filePath,
      isExternal: false,
      conditionalRenders: [],
      children: [],
    };
  }

  /**
   * Builds a map of component names to ComponentRelation objects
   */
  private buildComponentMap(components: ComponentRelation[]): void {
    for (const component of components) {
      this.componentMap.set(component.name, component);

      // Also map by file basename without extension
      const basename = path.basename(
        component.fullPath,
        path.extname(component.fullPath)
      );
      if (basename !== component.name) {
        this.componentMap.set(basename, component);
      }

      // Also try to extract actual component name from file
      try {
        const actualName = this.extractComponentNameFromFile(
          component.fullPath
        );
        if (actualName && actualName !== component.name) {
          this.componentMap.set(actualName, component);
        }
      } catch (error) {
        // Ignore errors in component name extraction during mapping
      }
    }
  }

  /**
   * Builds a map of file paths to their import references
   */
  private buildImportMap(components: ComponentRelation[]): void {
    for (const component of components) {
      if (component.content) {
        const imports = this.parseImportsFromContent(component.content);
        this.importMap.set(component.fullPath, imports);
      }
    }
  }

  /**
   * Finds a direct component match in the component map
   */
  private findDirectComponentMatch(
    componentName: string
  ): ComponentRelation | null {
    return this.componentMap.get(componentName) || null;
  }

  /**
   * Finds a component in the imports list
   */
  private findComponentInImports(
    componentName: string,
    imports: ImportReference[]
  ): ImportReference | null {
    return (
      imports.find(
        (imp) =>
          imp.localName === componentName ||
          imp.name === componentName ||
          (imp.isNamespace && componentName.startsWith(imp.localName + "."))
      ) || null
    );
  }

  /**
   * Finds a component by its import source
   */
  private findComponentByImportSource(importSource: string): string | null {
    for (const [, component] of this.componentMap) {
      if (component.imports && component.imports.includes(importSource)) {
        return component.fullPath;
      }

      // Check if the import source matches the component's directory structure
      const relativePath = path.relative(
        path.dirname(component.fullPath),
        importSource
      );
      if (relativePath === "." || relativePath === "./index") {
        return component.fullPath;
      }
    }

    return null;
  }
}
