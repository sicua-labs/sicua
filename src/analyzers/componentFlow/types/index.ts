/**
 * Component Flow Analysis Types
 * Defines all interfaces and types for component flow analysis
 */

// Basic component flow structures
export interface ComponentFlowNode {
  componentName: string;
  filePath: string;
  isExternal: boolean;
  conditionalRenders: ConditionalRender[];
  children: ComponentFlowNode[];
}

export interface ConditionalRender {
  conditionType: ConditionalType;
  condition: string;
  trueBranch: ComponentFlowNode[];
  falseBranch?: ComponentFlowNode[];
  position: CodePosition;
  // NEW: HTML elements in conditional branches
  htmlElementsTrue?: HTMLElementReference[];
  htmlElementsFalse?: HTMLElementReference[];
}

export type ConditionalType =
  | "ternary"
  | "logical_and"
  | "if_statement"
  | "switch_statement"
  | "early_return";

export interface CodePosition {
  line: number;
  column: number;
  startOffset: number;
  endOffset: number;
}

// Route-specific structures
export interface RouteFlowTree {
  routePath: string;
  pageComponent: ComponentFlowNode;
  specialFiles: SpecialFileCoverage;
  metadata: RouteMetadata;
}

export interface SpecialFileCoverage {
  layout: SpecialFileInfo[];
  template: SpecialFileInfo | null;
  error: SpecialFileInfo | null;
  loading: SpecialFileInfo | null;
  notFound: SpecialFileInfo | null;
}

export interface SpecialFileInfo {
  exists: boolean;
  filePath?: string;
  routeSegment: string;
}

export interface RouteMetadata {
  isDynamic: boolean;
  isCatchAll: boolean;
  routeGroup?: string;
  depth: number;
  segments: string[];
}

// Analysis results
export interface ComponentFlowAnalysisResult {
  routes: RouteFlowTree[];
  summary: FlowAnalysisSummary;
  externalDependencies: ExternalDependency[];
}

export interface FlowAnalysisSummary {
  totalRoutes: number;
  totalComponents: number;
  totalConditionalRenders: number;
  routesWithMissingSpecialFiles: string[];
  mostComplexRoute: string;
  averageComponentDepth: number;
}

export interface ExternalDependency {
  name: string;
  usedInRoutes: string[];
  usageCount: number;
}

// JSX Analysis structures
export interface JSXReturnStatement {
  hasConditional: boolean;
  conditionalPatterns: ConditionalPattern[];
  componentReferences: ComponentReference[];
  htmlElementReferences: HTMLElementReference[]; // NEW: HTML elements
  position: CodePosition;
}

export interface ConditionalPattern {
  type: ConditionalType;
  condition: string;
  trueBranch: ComponentReference[];
  falseBranch?: ComponentReference[];
  // NEW: HTML elements in conditional patterns
  htmlElementsTrue: HTMLElementReference[];
  htmlElementsFalse?: HTMLElementReference[];
  position: CodePosition;
}

export interface ComponentReference {
  name: string;
  isJSXElement: boolean;
  props: PropReference[];
  position: CodePosition;
}

// NEW: HTML Element Reference structure
export interface HTMLElementReference {
  tagName: string;
  props: PropReference[];
  hasChildren: boolean;
  textContent?: string; // For simple text content
  position: CodePosition;
}

export interface PropReference {
  name: string;
  value: string;
  isDynamic: boolean;
}

// Scanner and parser input/output types
export interface FileFlowAnalysis {
  filePath: string;
  componentName: string;
  jsxReturns: JSXReturnStatement[];
  hasMultipleReturns: boolean;
  imports: ImportReference[];
}

export interface ImportReference {
  name: string;
  source: string;
  isDefault: boolean;
  isNamespace: boolean;
  localName: string;
}

// Route scanning types
export interface RouteStructure {
  routePath: string;
  pageFilePath: string;
  segments: RouteSegment[];
  metadata: RouteMetadata;
}

export interface RouteSegment {
  name: string;
  isDynamic: boolean;
  isCatchAll: boolean;
  isRouteGroup: boolean;
  specialFiles: SpecialFileCoverage;
  depth: number;
}

// Configuration types
export interface ComponentFlowConfig {
  maxDepth: number;
  includeExternalComponents: boolean;
  excludePatterns: string[];
  onlyAnalyzeRoutes: string[];
  // NEW: HTML element tracking configuration
  includeHtmlElements: boolean;
  htmlElementFilter: HTMLElementFilter;
}

// NEW: HTML Element filtering configuration
export interface HTMLElementFilter {
  // Include all HTML elements
  includeAll: boolean;
  // Specific elements to include (if includeAll is false)
  includeTags: string[];
  // Elements to exclude (applied after include rules)
  excludeTags: string[];
  // Whether to capture text content
  captureTextContent: boolean;
  // Maximum text content length to capture
  maxTextLength: number;
}

// Error and validation types
export interface FlowAnalysisError {
  type: "parsing_error" | "resolution_error" | "file_not_found" | "invalid_jsx";
  message: string;
  filePath: string;
  position?: CodePosition;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FlowAnalysisError[];
  warnings: string[];
}

// NEW: Enhanced element reference type that can be either component or HTML
export type ElementReference = ComponentReference | HTMLElementReference;

// NEW: Type guards for element references
export function isComponentReference(
  ref: ElementReference
): ref is ComponentReference {
  return "isJSXElement" in ref;
}

export function isHTMLElementReference(
  ref: ElementReference
): ref is HTMLElementReference {
  return "tagName" in ref;
}

// NEW: Default HTML element filter configuration
export const DEFAULT_HTML_ELEMENT_FILTER: HTMLElementFilter = {
  includeAll: false,
  includeTags: [
    // Common semantic elements
    "div",
    "section",
    "article",
    "main",
    "aside",
    "header",
    "footer",
    "nav",
    // Text elements that might contain important content
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "span",
    // Interactive elements
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "form",
    // Media elements
    "img",
    "video",
    "audio",
    "picture",
    // List elements
    "ul",
    "ol",
    "li",
    // Table elements
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
  ],
  excludeTags: [
    // Exclude very generic/wrapper elements that add little value
    "br",
    "hr",
    "meta",
    "link",
    "style",
    "script",
  ],
  captureTextContent: true,
  maxTextLength: 100,
};

/**
 * Enhanced flow tree with additional metadata
 */
export interface EnhancedRouteFlowTree extends RouteFlowTree {
  coverageAnalysis: RouteCoverageAnalysis;
  componentStats: ComponentTreeStats;
  visualizationData: VisualizationMetadata;
}

/**
 * Statistics about the component tree
 */
export interface ComponentTreeStats {
  totalComponents: number;
  externalComponents: number;
  internalComponents: number;
  maxDepth: number;
  conditionalRenderCount: number;
  uniqueComponents: Set<string>;
  componentsByDepth: Map<number, string[]>;
}

/**
 * Metadata for visualization purposes
 */
export interface VisualizationMetadata {
  nodeCount: number;
  edgeCount: number;
  clusterInfo: ClusterInfo[];
  layoutHints: LayoutHints;
}

/**
 * Cluster information for grouping related components
 */
export interface ClusterInfo {
  clusterId: string;
  clusterType: "conditional" | "external" | "internal" | "special_file";
  componentNames: string[];
  depth: number;
}

/**
 * Layout hints for visualization
 */
export interface LayoutHints {
  suggestedLayout: "hierarchical" | "force" | "circular";
  primaryFlow: "vertical" | "horizontal";
  groupings: { [key: string]: string[] };
}

/**
 * Coverage analysis results for a single route
 */
export interface RouteCoverageAnalysis {
  routePath: string;
  routeMetadata: RouteMetadata;
  specialFilesCoverage: SpecialFileCoverage;
  coverageMetrics: CoverageMetrics;
  recommendations: CoverageRecommendation[];
  riskAssessment: RiskLevel;
}

/**
 * Coverage metrics for a route
 */
export interface CoverageMetrics {
  totalRequiredFiles: number;
  existingFiles: number;
  missingFiles: string[];
  coveragePercentage: number;
  layoutCoverage: {
    total: number;
    existing: number;
    missing: string[];
  };
  errorHandlingCoverage: {
    hasErrorBoundary: boolean;
    hasNotFound: boolean;
    hasLoading: boolean;
  };
}

/**
 * Coverage recommendation
 */
export interface CoverageRecommendation {
  type: "missing_file" | "best_practice" | "performance" | "user_experience";
  priority: "high" | "medium" | "low";
  message: string;
  filePath?: string;
  action: string;
}

/**
 * Risk assessment levels
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";
