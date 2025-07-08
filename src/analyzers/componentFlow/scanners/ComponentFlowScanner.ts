import * as fs from "fs";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { JSXReturnAnalyzer } from "./JSXReturnAnalyzer";
import { ComponentReferenceResolver } from "../parsers/ComponentReferenceResolver";
import { ComponentRelation } from "../../../types";
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

/**
 * Main scanner for component flow analysis - ENHANCED with configuration support
 */
export class ComponentFlowScanner {
  private jsxAnalyzer: JSXReturnAnalyzer;
  private componentResolver: ComponentReferenceResolver;
  private maxDepth: number;
  private config: ComponentFlowConfig;

  // Global state to prevent duplicates across entire analysis
  private globalAnalyzedComponents: Map<string, ComponentFlowNode>;
  private globalConditionalIds: Set<string>;
  private analysisInProgress: Set<string>;

  constructor(
    projectRoot: string,
    srcDirectory: string,
    components: ComponentRelation[],
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

    // Initialize analyzers with configuration
    this.jsxAnalyzer = new JSXReturnAnalyzer(this.config);
    this.componentResolver = new ComponentReferenceResolver(
      projectRoot,
      srcDirectory,
      components
    );

    // Initialize global state
    this.globalAnalyzedComponents = new Map();
    this.globalConditionalIds = new Set();
    this.analysisInProgress = new Set();
  }

  /**
   * Analyzes a component file and builds its complete flow tree - ENHANCED
   */
  scanComponentFlow(
    filePath: string,
    depth: number = 0
  ): ComponentFlowNode | null {
    // Create a unique key for this component analysis
    const componentKey = this.createComponentKey(filePath);

    // Return cached result if already analyzed
    if (this.globalAnalyzedComponents.has(componentKey)) {
      return this.globalAnalyzedComponents.get(componentKey)!;
    }

    // Prevent infinite recursion
    if (depth >= this.maxDepth || this.analysisInProgress.has(componentKey)) {
      return null;
    }

    // Mark as in progress
    this.analysisInProgress.add(componentKey);

    try {
      const fileAnalysis = this.analyzeFile(filePath);
      if (!fileAnalysis) {
        return null;
      }

      const componentNode = this.buildComponentFlowNode(fileAnalysis, depth);

      // Cache the result globally
      this.globalAnalyzedComponents.set(componentKey, componentNode);

      return componentNode;
    } catch (error) {
      console.warn(`Error scanning component flow for ${filePath}:`, error);
      return null;
    } finally {
      // Remove from in-progress
      this.analysisInProgress.delete(componentKey);
    }
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
    return this.analyzeFile(filePath);
  }

  /**
   * Creates a unique key for component identification
   */
  private createComponentKey(filePath: string): string {
    return filePath.replace(/\\/g, "/"); // Normalize path separators
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
   * Analyzes a single file for component flow patterns
   */
  private analyzeFile(filePath: string): FileFlowAnalysis | null {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
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
   * Builds a ComponentFlowNode from file analysis - ENHANCED
   */
  private buildComponentFlowNode(
    fileAnalysis: FileFlowAnalysis,
    depth: number
  ): ComponentFlowNode {
    // Build conditional renders with global deduplication and HTML element support
    const conditionalRenders = this.buildConditionalRenders(
      fileAnalysis,
      depth
    );

    // Get unique child components
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
   * Builds conditional render objects with GLOBAL deduplication - ENHANCED
   */
  private buildConditionalRenders(
    fileAnalysis: FileFlowAnalysis,
    depth: number
  ): ConditionalRender[] {
    const conditionalRenders: ConditionalRender[] = [];

    for (const jsxReturn of fileAnalysis.jsxReturns) {
      if (jsxReturn.hasConditional) {
        for (const pattern of jsxReturn.conditionalPatterns) {
          // Create globally unique conditional ID
          const conditionalId = this.createConditionalKey(
            fileAnalysis.filePath,
            pattern.condition,
            pattern.position.line,
            pattern.position.column
          );

          // Skip if this exact conditional has been processed globally
          if (this.globalConditionalIds.has(conditionalId)) {
            continue;
          }

          // Mark as processed globally
          this.globalConditionalIds.add(conditionalId);

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

          // NEW: Build the enhanced conditional render with HTML elements
          const conditionalRender: ConditionalRender = {
            conditionType: pattern.type,
            condition: pattern.condition,
            trueBranch,
            falseBranch,
            position: pattern.position,
          };

          // NEW: Add HTML elements if available and enabled
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
   * Extracts child components with proper deduplication - ENHANCED
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
   * Adds components to list if not already seen - HELPER
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
   * Resolves component references to ComponentFlowNodes - ENHANCED
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
      const resolved = this.componentResolver.resolveComponentReference(
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
              // Use the resolved component name, not the extracted one
              childNode.componentName = reference.name;
              resolvedNodes.push(childNode);
            }
          } else {
            // At max depth, add without children
            resolvedNodes.push({
              ...resolved,
              componentName: reference.name, // Use original reference name
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
   * Extracts component name from file path or AST
   */
  private extractComponentName(filePath: string, ast: t.File): string {
    // First try to extract from default export
    let componentName = extractDefaultExportName(ast);

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
   * Resets the analyzer state - ENHANCED
   */
  reset(): void {
    this.globalAnalyzedComponents.clear();
    this.globalConditionalIds.clear();
    this.analysisInProgress.clear();
  }

  /**
   * Gets accurate summary statistics - ENHANCED
   */
  getSummaryStats(rootComponents: ComponentFlowNode[]): {
    totalConditionals: number;
    totalComponents: number;
    uniqueComponents: number;
    htmlElementsEnabled: boolean;
    totalHtmlElementsInConditionals: number;
  } {
    // Since we use global deduplication, we can just count what's stored
    const allComponents = Array.from(this.globalAnalyzedComponents.values());
    const totalConditionals = this.globalConditionalIds.size;
    const totalComponents = allComponents.length;
    const uniqueComponents = new Set(
      allComponents.map((comp) => this.createComponentKey(comp.filePath))
    ).size;

    // NEW: Count HTML elements in conditionals
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
   * Gets all analyzed components - ENHANCED
   */
  getAllAnalyzedComponents(): ComponentFlowNode[] {
    return Array.from(this.globalAnalyzedComponents.values());
  }

  /**
   * Gets global conditional count
   */
  getGlobalConditionalCount(): number {
    return this.globalConditionalIds.size;
  }

  /**
   * NEW: Updates configuration and reinitializes analyzers
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
   * NEW: Gets current configuration
   */
  getConfig(): ComponentFlowConfig {
    return { ...this.config };
  }

  /**
   * NEW: Enables HTML element tracking
   */
  enableHtmlElementTracking(): void {
    this.updateConfig({ includeHtmlElements: true });
  }

  /**
   * NEW: Disables HTML element tracking
   */
  disableHtmlElementTracking(): void {
    this.updateConfig({ includeHtmlElements: false });
  }

  /**
   * NEW: Analyzes specific file for HTML elements and components
   */
  analyzeFileForElements(filePath: string): {
    components: ComponentFlowNode[];
    htmlElementStats: {
      totalElements: number;
      elementsByTag: Map<string, number>;
      elementsWithText: number;
    };
  } | null {
    const fileAnalysis = this.analyzeFile(filePath);
    if (!fileAnalysis) {
      return null;
    }

    const components = [this.buildComponentFlowNode(fileAnalysis, 0)];

    // NEW: Calculate HTML element statistics
    const htmlElementStats = {
      totalElements: 0,
      elementsByTag: new Map<string, number>(),
      elementsWithText: 0,
    };

    if (this.config.includeHtmlElements) {
      for (const jsxReturn of fileAnalysis.jsxReturns) {
        for (const htmlElement of jsxReturn.htmlElementReferences) {
          htmlElementStats.totalElements++;

          const currentCount =
            htmlElementStats.elementsByTag.get(htmlElement.tagName) || 0;
          htmlElementStats.elementsByTag.set(
            htmlElement.tagName,
            currentCount + 1
          );

          if (htmlElement.textContent) {
            htmlElementStats.elementsWithText++;
          }
        }
      }
    }

    return {
      components,
      htmlElementStats,
    };
  }
}
