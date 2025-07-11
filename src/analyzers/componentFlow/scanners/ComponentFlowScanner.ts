import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { JSXReturnAnalyzer } from "./JSXReturnAnalyzer";
import { ComponentRelation, ScanResult } from "../../../types";
import { ComponentLookupService } from "../../../core/componentLookupService";
import {
  ComponentFlowNode,
  FileFlowAnalysis,
  ConditionalRender,
  ImportReference,
  ComponentFlowConfig,
  DEFAULT_HTML_ELEMENT_FILTER,
} from "../types";
import {
  checkMultipleReturns,
  extractDefaultExportName,
  parseFileToAST,
} from "../utils";
import { PathResolver } from "../../../parsers/pathResolver";

/**
 * Enhanced component flow scanner using optimized services and existing parsed files
 */
export class ComponentFlowScanner {
  private jsxAnalyzer: JSXReturnAnalyzer;
  private lookupService: ComponentLookupService;
  private pathResolver: PathResolver;
  private scanResult: ScanResult;
  private maxDepth: number;
  private config: ComponentFlowConfig;

  // Optimized state management using lookup services
  private analyzedComponents: Map<string, ComponentFlowNode>;
  private conditionalIds: Set<string>;
  private analysisInProgress: Set<string>;

  constructor(
    lookupService: ComponentLookupService,
    pathResolver: PathResolver,
    scanResult: ScanResult,
    maxDepth: number = 10,
    config?: ComponentFlowConfig
  ) {
    // Set up configuration with defaults
    this.config = config || {
      maxDepth,
      includeExternalComponents: true,
      excludePatterns: [],
      onlyAnalyzeRoutes: [],
      includeHtmlElements: false,
      htmlElementFilter: DEFAULT_HTML_ELEMENT_FILTER,
    };

    this.maxDepth = this.config.maxDepth;
    this.lookupService = lookupService;
    this.pathResolver = pathResolver;
    this.scanResult = scanResult;

    // Initialize analyzers with configuration
    this.jsxAnalyzer = new JSXReturnAnalyzer(this.config);

    // Initialize optimized state
    this.analyzedComponents = new Map();
    this.conditionalIds = new Set();
    this.analysisInProgress = new Set();
  }

  /**
   * Analyzes a component file and builds its complete flow tree using optimized services
   */
  scanComponentFlow(
    filePath: string,
    depth: number = 0
  ): ComponentFlowNode | null {
    // FIXED: Normalize file path to match scanResult format
    const normalizedFilePath = this.normalizeFilePath(filePath);

    // Create a unique key for this component analysis
    const componentKey = this.createComponentKey(normalizedFilePath);

    // Return cached result if already analyzed
    if (this.analyzedComponents.has(componentKey)) {
      return this.analyzedComponents.get(componentKey)!;
    }

    // Prevent infinite recursion
    if (depth >= this.maxDepth || this.analysisInProgress.has(componentKey)) {
      return null;
    }

    // Mark as in progress
    this.analysisInProgress.add(componentKey);

    try {
      const fileAnalysis = this.analyzeFile(normalizedFilePath);
      if (!fileAnalysis) {
        return null;
      }

      const componentNode = this.buildComponentFlowNode(fileAnalysis, depth);

      // Cache the result
      this.analyzedComponents.set(componentKey, componentNode);

      return componentNode;
    } catch (error) {
      console.warn(
        `Error scanning component flow for ${normalizedFilePath}:`,
        error
      );
      return null;
    } finally {
      // Remove from in-progress
      this.analysisInProgress.delete(componentKey);
    }
  }

  /**
   * FIXED: Normalize file path to match scanResult format (forward slashes)
   */
  private normalizeFilePath(filePath: string): string {
    // Convert Windows backslashes to forward slashes to match scanResult format
    return filePath.replace(/\\/g, "/");
  }

  /**
   * Analyzes multiple component files
   */
  scanMultipleComponentFlows(filePaths: string[]): ComponentFlowNode[] {
    const nodes: ComponentFlowNode[] = [];

    for (const filePath of filePaths) {
      const node = this.scanComponentFlow(filePath);
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Gets detailed analysis for a specific file without building the tree
   */
  getFileAnalysis(filePath: string): FileFlowAnalysis | null {
    const normalizedFilePath = this.normalizeFilePath(filePath);
    return this.analyzeFile(normalizedFilePath);
  }

  /**
   * Creates a unique key for component identification
   */
  private createComponentKey(filePath: string): string {
    return this.pathResolver.normalizeFilePath(filePath);
  }

  /**
   * Creates a unique key for conditional identification
   */
  private createConditionalKey(
    filePath: string,
    condition: string,
    line: number,
    column: number
  ): string {
    return `${this.createComponentKey(
      filePath
    )}::${condition}::${line}:${column}`;
  }

  /**
   * Analyzes a single file using existing parsed content from ScanResult
   */
  private analyzeFile(filePath: string): FileFlowAnalysis | null {
    try {
      // Use existing file content from ScanResult - no file I/O
      const content = this.scanResult.fileContents.get(filePath);
      if (!content) {
        console.warn(`File content not found in scanResult: ${filePath}`);
        // Debug: Log some available files for comparison
        const availableFiles = Array.from(
          this.scanResult.fileContents.keys()
        ).slice(0, 3);
        console.warn(`Available files sample:`, availableFiles);
        return null;
      }

      // Parse AST only if not available (fallback)
      const ast = parseFileToAST(content);
      if (!ast) {
        return null;
      }

      const componentName = this.extractComponentName(filePath, ast);

      // Pass current configuration to JSX analyzer
      this.jsxAnalyzer.updateConfig(this.config);
      const jsxReturns = this.jsxAnalyzer.analyzeAST(ast, content);

      const imports = this.extractImports(ast, content);
      const hasMultipleReturns = checkMultipleReturns(ast);

      return {
        filePath,
        componentName,
        jsxReturns,
        hasMultipleReturns,
        imports,
      };
    } catch (error) {
      console.warn(`Error analyzing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Builds a ComponentFlowNode from file analysis using optimized services
   */
  private buildComponentFlowNode(
    fileAnalysis: FileFlowAnalysis,
    depth: number
  ): ComponentFlowNode {
    // Build conditional renders with optimized deduplication
    const conditionalRenders = this.buildConditionalRenders(
      fileAnalysis,
      depth
    );

    // Get unique child components using optimized resolution
    const childComponents = this.extractChildComponents(fileAnalysis, depth);

    return {
      componentName: fileAnalysis.componentName,
      filePath: fileAnalysis.filePath,
      isExternal: false,
      conditionalRenders,
      children: childComponents,
    };
  }

  /**
   * Builds conditional render objects with optimized deduplication
   */
  private buildConditionalRenders(
    fileAnalysis: FileFlowAnalysis,
    depth: number
  ): ConditionalRender[] {
    const conditionalRenders: ConditionalRender[] = [];

    for (const jsxReturn of fileAnalysis.jsxReturns) {
      if (jsxReturn.hasConditional) {
        for (const pattern of jsxReturn.conditionalPatterns) {
          // Create unique conditional ID
          const conditionalId = this.createConditionalKey(
            fileAnalysis.filePath,
            pattern.condition,
            pattern.position.line,
            pattern.position.column
          );

          // Skip if this exact conditional has been processed
          if (this.conditionalIds.has(conditionalId)) {
            continue;
          }

          // Mark as processed
          this.conditionalIds.add(conditionalId);

          const trueBranch = this.resolveComponentReferences(
            pattern.trueBranch,
            fileAnalysis.filePath,
            depth + 1
          );

          const falseBranch = pattern.falseBranch
            ? this.resolveComponentReferences(
                pattern.falseBranch,
                fileAnalysis.filePath,
                depth + 1
              )
            : undefined;

          // Build the conditional render with HTML elements
          const conditionalRender: ConditionalRender = {
            conditionType: pattern.type,
            condition: pattern.condition,
            trueBranch,
            falseBranch,
            position: pattern.position,
          };

          // Add HTML elements if available and enabled
          if (this.config.includeHtmlElements) {
            if (
              pattern.htmlElementsTrue &&
              pattern.htmlElementsTrue.length > 0
            ) {
              conditionalRender.htmlElementsTrue = pattern.htmlElementsTrue;
            }
            if (
              pattern.htmlElementsFalse &&
              pattern.htmlElementsFalse.length > 0
            ) {
              conditionalRender.htmlElementsFalse = pattern.htmlElementsFalse;
            }
          }

          conditionalRenders.push(conditionalRender);
        }
      }
    }

    return conditionalRenders;
  }

  /**
   * Extracts child components with optimized deduplication
   */
  private extractChildComponents(
    fileAnalysis: FileFlowAnalysis,
    depth: number
  ): ComponentFlowNode[] {
    const childComponents: ComponentFlowNode[] = [];
    const seenComponentKeys = new Set<string>();

    // Process all JSX returns
    for (const jsxReturn of fileAnalysis.jsxReturns) {
      // Get components from direct references
      const directComponents = this.resolveComponentReferences(
        jsxReturn.componentReferences,
        fileAnalysis.filePath,
        depth + 1
      );

      this.addUniqueComponents(
        directComponents,
        childComponents,
        seenComponentKeys
      );

      // Get components from conditional patterns
      for (const pattern of jsxReturn.conditionalPatterns) {
        // True branch components
        const trueComponents = this.resolveComponentReferences(
          pattern.trueBranch,
          fileAnalysis.filePath,
          depth + 1
        );
        this.addUniqueComponents(
          trueComponents,
          childComponents,
          seenComponentKeys
        );

        // False branch components
        if (pattern.falseBranch) {
          const falseComponents = this.resolveComponentReferences(
            pattern.falseBranch,
            fileAnalysis.filePath,
            depth + 1
          );
          this.addUniqueComponents(
            falseComponents,
            childComponents,
            seenComponentKeys
          );
        }
      }
    }

    return childComponents;
  }

  /**
   * Adds components to list if not already seen
   */
  private addUniqueComponents(
    components: ComponentFlowNode[],
    targetList: ComponentFlowNode[],
    seenKeys: Set<string>
  ): void {
    for (const component of components) {
      const componentKey = this.createComponentKey(component.filePath);
      if (!seenKeys.has(componentKey)) {
        seenKeys.add(componentKey);
        targetList.push(component);
      }
    }
  }

  /**
   * Resolves component references to ComponentFlowNodes using optimized services
   */
  private resolveComponentReferences(
    references: Array<{
      name: string;
      isJSXElement: boolean;
      props: Array<{ name: string; value: string; isDynamic: boolean }>;
      position: {
        line: number;
        column: number;
        startOffset: number;
        endOffset: number;
      };
    }>,
    currentFilePath: string,
    depth: number
  ): ComponentFlowNode[] {
    const resolvedNodes: ComponentFlowNode[] = [];
    const seenInThisResolution = new Set<string>();

    for (const reference of references) {
      const resolved = this.resolveComponentReference(
        reference,
        currentFilePath
      );

      if (resolved) {
        const nodeKey = this.createComponentKey(
          resolved.filePath || resolved.componentName
        );

        // Skip if already resolved in this batch
        if (seenInThisResolution.has(nodeKey)) {
          continue;
        }
        seenInThisResolution.add(nodeKey);

        if (resolved.isExternal) {
          // External component - add as-is
          resolvedNodes.push(resolved);
        } else if (resolved.filePath) {
          // Internal component - recursively analyze with depth limit
          if (depth < this.maxDepth) {
            const childNode = this.scanComponentFlow(resolved.filePath, depth);
            if (childNode) {
              // Use the resolved component name
              childNode.componentName = reference.name;
              resolvedNodes.push(childNode);
            }
          } else {
            // At max depth, add without children
            resolvedNodes.push({
              ...resolved,
              componentName: reference.name,
              children: [],
              conditionalRenders: [],
            });
          }
        }
      }
    }

    return resolvedNodes;
  }

  /**
   * Resolves a component reference using optimized lookup services
   */
  private resolveComponentReference(
    reference: {
      name: string;
      isJSXElement: boolean;
      props: any[];
      position: any;
    },
    currentFilePath: string
  ): ComponentFlowNode | null {
    const componentName = reference.name;

    // Skip native HTML elements
    if (this.isNativeHTMLElement(componentName)) {
      return null;
    }

    // Skip React built-ins
    if (this.isReactBuiltIn(componentName)) {
      return null;
    }

    // Check if it's an external component using PathResolver
    if (this.isExternallyImported(componentName, currentFilePath)) {
      return {
        componentName,
        filePath: "",
        isExternal: true,
        conditionalRenders: [],
        children: [],
      };
    }

    // Try to resolve internal component using ComponentLookupService
    const components = this.lookupService.getComponentsByName(componentName);

    // Find the best match (prefer components in similar directory structure)
    let bestMatch: ComponentRelation | null = null;
    const currentDir = this.pathResolver.extractDirectory(currentFilePath);

    for (const component of components) {
      if (!bestMatch) {
        bestMatch = component;
      } else {
        // Prefer components in the same or parent directories
        const componentDir = component.directory;
        const bestMatchDir = bestMatch.directory;

        if (componentDir === currentDir) {
          bestMatch = component;
          break;
        } else if (
          componentDir.includes(currentDir) &&
          !bestMatchDir.includes(currentDir)
        ) {
          bestMatch = component;
        }
      }
    }

    if (bestMatch) {
      return {
        componentName,
        filePath: bestMatch.fullPath,
        isExternal: false,
        conditionalRenders: [],
        children: [],
      };
    }

    // Component not found
    return null;
  }

  /**
   * Checks if a component name is externally imported using PathResolver
   */
  private isExternallyImported(
    componentName: string,
    filePath: string
  ): boolean {
    const fileContent = this.scanResult.fileContents.get(filePath);
    if (!fileContent) {
      return false;
    }

    // Extract import statements and check if componentName is imported externally
    const importRegex =
      /import\s+(?:{[^}]*\b(\w+)\b[^}]*}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(fileContent)) !== null) {
      const namedImport = match[1];
      const defaultImport = match[2];
      const importPath = match[3];

      if (namedImport === componentName || defaultImport === componentName) {
        // Use PathResolver to check if this import is external
        if (this.pathResolver.isExternalPackage(importPath)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Checks if a component reference is a native HTML element
   */
  private isNativeHTMLElement(componentName: string): boolean {
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
   * Checks if a component reference is a React built-in
   */
  private isReactBuiltIn(componentName: string): boolean {
    const reactBuiltIns = new Set([
      "Fragment",
      "Suspense",
      "StrictMode",
      "Profiler",
      "React.Fragment",
      "React.Suspense",
      "React.StrictMode",
      "React.Profiler",
      "Transition",
      "SuspenseList",
      "ConcurrentMode",
      "unstable_ConcurrentMode",
    ]);

    return reactBuiltIns.has(componentName);
  }

  /**
   * Extracts component name from file path or AST
   */
  private extractComponentName(filePath: string, ast: t.File): string {
    // First try to extract from default export
    let componentName = extractDefaultExportName(ast);

    if (!componentName) {
      // Use lookup service to get component name for this file
      const component = this.lookupService.getComponentByPath(filePath);
      if (component) {
        componentName = component.name;
      }
    }

    if (!componentName) {
      // Fallback to filename
      const fileName = filePath.split("/").pop() || "";
      componentName = fileName.replace(/\.(tsx?|jsx?)$/, "");
    }

    return componentName;
  }

  /**
   * Extracts import statements from AST
   */
  private extractImports(ast: t.File, content: string): ImportReference[] {
    const imports: ImportReference[] = [];

    traverse(ast, {
      ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
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

    return imports;
  }

  /**
   * Resets the analyzer state
   */
  reset(): void {
    this.analyzedComponents.clear();
    this.conditionalIds.clear();
    this.analysisInProgress.clear();
  }

  /**
   * Gets summary statistics
   */
  getSummaryStats(rootComponents: ComponentFlowNode[]): {
    totalConditionals: number;
    totalComponents: number;
    uniqueComponents: number;
    htmlElementsEnabled: boolean;
    totalHtmlElementsInConditionals: number;
  } {
    const allComponents = Array.from(this.analyzedComponents.values());
    const totalConditionals = this.conditionalIds.size;
    const totalComponents = allComponents.length;
    const uniqueComponents = new Set(
      allComponents.map((comp) => this.createComponentKey(comp.filePath))
    ).size;

    // Count HTML elements in conditionals
    let totalHtmlElementsInConditionals = 0;
    if (this.config.includeHtmlElements) {
      for (const component of allComponents) {
        for (const conditional of component.conditionalRenders) {
          if (conditional.htmlElementsTrue) {
            totalHtmlElementsInConditionals +=
              conditional.htmlElementsTrue.length;
          }
          if (conditional.htmlElementsFalse) {
            totalHtmlElementsInConditionals +=
              conditional.htmlElementsFalse.length;
          }
        }
      }
    }

    return {
      totalConditionals,
      totalComponents,
      uniqueComponents,
      htmlElementsEnabled: this.config.includeHtmlElements,
      totalHtmlElementsInConditionals,
    };
  }

  /**
   * Gets all analyzed components
   */
  getAllAnalyzedComponents(): ComponentFlowNode[] {
    return Array.from(this.analyzedComponents.values());
  }

  /**
   * Gets conditional count
   */
  getConditionalCount(): number {
    return this.conditionalIds.size;
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<ComponentFlowConfig>): void {
    this.config = { ...this.config, ...config };
    this.maxDepth = this.config.maxDepth;

    // Reinitialize analyzers with new config
    this.jsxAnalyzer.updateConfig(this.config);

    // Clear caches if configuration changed significantly
    if (config.includeHtmlElements !== undefined || config.htmlElementFilter) {
      this.reset();
    }
  }

  /**
   * Gets current configuration
   */
  getConfig(): ComponentFlowConfig {
    return { ...this.config };
  }
}
