import * as path from "path";
import { ComponentRelation, IConfigManager } from "../types";
import {
  ComponentNode,
  DependencyEdge,
  ComponentDependencyGraph,
} from "../types/diagram.types";
import {
  getNodeSize,
  getNodeColor,
  getEdgeSize,
  getEdgeColor,
} from "./graphFormatUtils";
import { generateComponentId } from "../utils/common/analysisUtils";

interface GraphCache {
  componentNodes: ComponentNode[];
  componentEdges: Map<string, DependencyEdge[]>;
  componentMap: Map<string, ComponentRelation>;
  fileToComponentsMap: Map<string, ComponentRelation[]>;
  rootComponentSet: Set<string>;
}

const GENERATOR_VERSION = "2.1.0";
let graphCache: GraphCache | null = null;

/**
 * Detects file type and metadata from file path and content
 */
function detectFileMetadata(
  filePath: string,
  component: ComponentRelation
): {
  fileType: string;
  isNextRoute: boolean;
  routeType: string | undefined;
  isComponent: boolean;
  hasClientDirective: boolean;
  hasServerDirective: boolean;
} {
  const fileType = path.extname(filePath).replace(".", "");
  const isComponent = isReactComponent(component, fileType);

  const isNextRoute =
    filePath.includes("/app/") &&
    (filePath.includes("/page.") ||
      filePath.includes("/layout.") ||
      filePath.includes("/loading.") ||
      filePath.includes("/error."));

  let routeType: string | undefined;
  if (isNextRoute) {
    if (filePath.includes("/page.")) routeType = "page";
    else if (filePath.includes("/layout.")) routeType = "layout";
    else if (filePath.includes("/loading.")) routeType = "loading";
    else if (filePath.includes("/error.")) routeType = "error";
    else if (filePath.includes("/not-found.")) routeType = "not-found";
  }

  const contentStr = component.content || "";
  const hasClientDirective =
    contentStr.includes('"use client"') || contentStr.includes("'use client'");

  const hasServerDirective =
    contentStr.includes('"use server"') || contentStr.includes("'use server'");

  return {
    fileType,
    isNextRoute,
    routeType,
    isComponent,
    hasClientDirective,
    hasServerDirective,
  };
}

/**
 * Enhanced React component detection
 */
function isReactComponent(
  component: ComponentRelation,
  fileType: string
): boolean {
  if (fileType !== "tsx" && fileType !== "jsx") {
    return false;
  }

  const contentStr = component.content || "";

  const reactPatterns = [
    /export\s+default\s+function\s+\w+/,
    /export\s+default\s+\w+/,
    /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*return\s*\(/,
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*return\s*\(/,
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\(/,
    /export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>/,
    /export\s+function\s+\w+/,
  ];

  const hasReactPattern = reactPatterns.some((pattern) =>
    pattern.test(contentStr)
  );

  const hasJSX =
    /<[A-Z][A-Za-z0-9]*[\s\S]*?>/.test(contentStr) ||
    /<[a-z]+[\s\S]*?>/.test(contentStr);

  return hasReactPattern && hasJSX;
}

/**
 * Generate graph data optimized for Sigma.js visualization of component relationships
 */
export function generateGraphData(
  components: ComponentRelation[],
  config: IConfigManager
): {
  getSigmaData: () => ComponentDependencyGraph;
  loadComponentDetails: (componentName: string) => void;
} {
  if (graphCache && isValidCache(components, graphCache)) {
    return createReturnObject(graphCache);
  }

  // Create component map with unique IDs
  const componentMap = new Map<string, ComponentRelation>();
  const fileToComponentsMap = new Map<string, ComponentRelation[]>();

  // Build component maps
  for (const comp of components) {
    const componentId = generateComponentId(comp);
    componentMap.set(componentId, comp);

    // Group components by file for import resolution
    const filePath = comp.fullPath;
    if (!fileToComponentsMap.has(filePath)) {
      fileToComponentsMap.set(filePath, []);
    }
    fileToComponentsMap.get(filePath)!.push(comp);
  }

  const rootComponentSet = new Set(
    config.rootComponentNames.map((name) => name.toLowerCase())
  );

  const componentNodes: ComponentNode[] = [];
  const componentEdges = new Map<string, DependencyEdge[]>();

  // Generate component nodes with unique IDs
  for (const comp of components) {
    const componentId = generateComponentId(comp);
    const metadata = detectFileMetadata(comp.fullPath, comp);

    const nodeProps = {
      isNextRoute: metadata.isNextRoute,
      isComponent: metadata.isComponent,
      routeType: metadata.routeType,
    };

    const node: ComponentNode = {
      id: componentId,
      label: comp.name, // Keep original component name as label
      fullPath: comp.fullPath,
      directory: comp.directory,
      fileType: metadata.fileType,
      isNextRoute: metadata.isNextRoute,
      routeType: metadata.routeType,
      isComponent: metadata.isComponent,
      hasClientDirective: metadata.hasClientDirective,
      hasServerDirective: metadata.hasServerDirective,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: getNodeSize(nodeProps),
      color: getNodeColor(nodeProps),
    };

    componentNodes.push(node);
  }

  // Update cache
  graphCache = {
    componentNodes,
    componentEdges,
    componentMap,
    fileToComponentsMap,
    rootComponentSet,
  };

  return createReturnObject(graphCache);
}

function createReturnObject(cache: GraphCache) {
  const loadComponentDetails = (componentName: string) => {
    // Handle both unique IDs and original component names
    const componentId = componentName.includes("#")
      ? componentName
      : Array.from(cache.componentMap.keys()).find((id) =>
          id.endsWith(`#${componentName}`)
        );

    if (!componentId || cache.componentEdges.has(componentId)) {
      return;
    }

    const component = cache.componentMap.get(componentId);
    if (component) {
      const edges: DependencyEdge[] = [];
      createComponentEdges(
        component,
        componentId,
        cache.componentMap,
        cache.fileToComponentsMap,
        edges
      );

      if (cache.rootComponentSet.has(component.name.toLowerCase())) {
        createRootEdges(
          Array.from(cache.componentMap.entries()),
          component,
          componentId,
          edges
        );
      }
      cache.componentEdges.set(componentId, edges);
    }
  };

  const getSigmaData = (): ComponentDependencyGraph => {
    // Ensure all components have their edges loaded
    cache.componentMap.forEach((_, componentId) =>
      loadComponentDetails(componentId)
    );

    return {
      nodes: cache.componentNodes,
      edges: Array.from(cache.componentEdges.values()).flat(),
      version: GENERATOR_VERSION,
    };
  };

  return {
    getSigmaData,
    loadComponentDetails,
  };
}

function isValidCache(
  components: ComponentRelation[],
  cache: GraphCache
): boolean {
  return cache.componentNodes.length === components.length;
}

/**
 * Create edges between components based on imports - Enhanced for multiple components per file
 */
function createComponentEdges(
  component: ComponentRelation,
  componentId: string,
  componentMap: Map<string, ComponentRelation>,
  fileToComponentsMap: Map<string, ComponentRelation[]>,
  edges: DependencyEdge[]
) {
  component.imports.forEach((importPath) => {
    const targetComponents = findComponentsByImportPath(
      importPath,
      componentMap,
      fileToComponentsMap
    );

    targetComponents.forEach((targetComponent) => {
      const targetComponentId = generateComponentId(targetComponent);
      const edgeType = importPath.includes("lazy") ? "dynamic" : "import";

      const edge: DependencyEdge = {
        id: `${componentId}-${targetComponentId}`,
        source: componentId,
        target: targetComponentId,
        type: edgeType,
        size: getEdgeSize(edgeType),
        color: getEdgeColor(edgeType),
      };

      edges.push(edge);
    });
  });
}

/**
 * Enhanced component finding by import path - handles multiple components per file
 */
function findComponentsByImportPath(
  importPath: string,
  componentMap: Map<string, ComponentRelation>,
  fileToComponentsMap: Map<string, ComponentRelation[]>
): ComponentRelation[] {
  const results: ComponentRelation[] = [];
  const importName = path.basename(importPath, path.extname(importPath));

  // Strategy 1: Direct component name match (for named imports)
  const directMatch = Array.from(componentMap.values()).find(
    (c) => c.name === importName
  );
  if (directMatch) {
    results.push(directMatch);
    return results;
  }

  // Strategy 2: Match by file basename - return all components in that file
  const matchingFile = Array.from(fileToComponentsMap.entries()).find(
    ([filePath, _]) => {
      const fileName = path.basename(filePath, path.extname(filePath));
      return fileName === importName;
    }
  );

  if (matchingFile) {
    results.push(...matchingFile[1]);
    return results;
  }

  // Strategy 3: Match by partial path (for relative imports)
  if (importPath.startsWith(".")) {
    const matchingComponents = Array.from(componentMap.values()).filter(
      (c) => c.fullPath.includes(importName) || c.name === importName
    );
    results.push(...matchingComponents);
  }

  // Strategy 4: Match by export name (for named imports)
  if (results.length === 0) {
    const exportMatches = Array.from(componentMap.values()).filter((c) =>
      c.exports.some((exp) => exp === importName)
    );
    results.push(...exportMatches);
  }

  return results;
}

/**
 * Create edges for root components - Updated for unique IDs
 */
function createRootEdges(
  componentEntries: [string, ComponentRelation][],
  rootComponent: ComponentRelation,
  rootComponentId: string,
  edges: DependencyEdge[]
) {
  componentEntries.forEach(([componentId, comp]) => {
    if (comp !== rootComponent && comp.directory === "") {
      const edgeType = "import";

      const edge: DependencyEdge = {
        id: `${rootComponentId}-${componentId}`,
        source: rootComponentId,
        target: componentId,
        type: edgeType,
        size: getEdgeSize(edgeType),
        color: getEdgeColor(edgeType),
      };

      edges.push(edge);
    }
  });
}
