import {
  ExportType,
  ReactPattern,
  UsagePatternType,
} from "./contextualSummaries.types";
import { FunctionDefinition } from "./functionExtractor.types";
import { TypeDefinition } from "./typeExtractor.types";

export interface ComponentDefinition {
  name: string;
  type: ComponentType;
  category: ComponentCategory;
  complexity: ComponentComplexity;
  reactInfo: ReactComponentInfo;
  structure: ComponentStructure;
  dependencies: ComponentDependencies;
  lifecycle: ComponentLifecycle;
  performance: PerformanceInfo;
  accessibility: AccessibilityInfo;
  testing: TestingInfo;
  patterns: ComponentPatterns;
  isExported: boolean;
  exportType?: ExportType;
  description?: string;
  location: ComponentLocation;
}

export interface ReactComponentInfo {
  isComponent: boolean;
  isFunctional: boolean;
  isClassBased: boolean;
  isHOC: boolean;
  isRenderProp: boolean;
  isCompoundComponent: boolean;
  hooks: HookUsage[];
  props: PropDefinition[];
  state: StateDefinition[];
  context: ContextUsage[];
  refs: RefUsage[];
  jsxComplexity: JSXComplexity;
}

export interface ComponentStructure {
  mainFunction: FunctionDefinition;
  helperFunctions: FunctionDefinition[];
  types: TypeDefinition[];
  constants: ConstantDefinition[];
  subComponents: SubComponentInfo[];
  renderMethods: RenderMethodInfo[];
}

export interface ComponentDependencies {
  reactDependencies: ReactDependency[];
  externalLibraries: ExternalLibrary[];
  internalComponents: InternalComponent[];
  utilities: UtilityDependency[];
  stylesDependencies: StyleDependency[];
}

export interface ComponentLifecycle {
  hasEffects: boolean;
  effects: EffectInfo[];
  mounts: MountInfo[];
  updates: UpdateInfo[];
  cleanups: CleanupInfo[];
  errorBoundaries: ErrorBoundaryInfo[];
}

export interface PerformanceInfo {
  memoization: MemoizationInfo;
  lazyLoading: LazyLoadingInfo;
  bundleSplitting: boolean;
  expensiveOperations: ExpensiveOperation[];
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface AccessibilityInfo {
  ariaAttributes: AriaAttribute[];
  semanticElements: SemanticElement[];
  keyboardNavigation: KeyboardNavigationInfo;
  screenReaderSupport: ScreenReaderInfo;
  colorContrast: ColorContrastInfo;
  accessibilityScore: number;
}

export interface TestingInfo {
  testability: TestabilityScore;
  testPatterns: TestPattern[];
  mockableComponents: string[];
  complexInteractions: ComplexInteraction[];
}

export interface ComponentPatterns {
  designPatterns: DesignPattern[];
  reactPatterns: ReactPattern[];
  usagePatterns: UsagePatternType[];
  antiPatterns: AntiPattern[];
}

export interface HookUsage {
  name: string;
  type: HookType;
  complexity: "simple" | "moderate" | "complex";
  dependencies: string[];
  purpose: string;
  customHook: boolean;
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
  validation?: string;
}

export interface StateDefinition {
  name: string;
  type: string;
  initialValue?: string;
  updaters: string[];
  scope: "local" | "global" | "context";
}

export interface ContextUsage {
  contextName: string;
  isProvider: boolean;
  isConsumer: boolean;
  valuesProvided: string[];
  valuesConsumed: string[];
}

export interface RefUsage {
  name: string;
  type: "element" | "component" | "value";
  purpose: string;
  forwardedRef: boolean;
}

export interface JSXComplexity {
  elementCount: number;
  nestingDepth: number;
  conditionalRenders: number;
  listRenders: number;
  dynamicProps: number;
  eventHandlers: number;
  complexityScore: number;
}

export interface ConstantDefinition {
  name: string;
  type: string;
  value?: string;
  exported: boolean;
  purpose: string;
}

export interface SubComponentInfo {
  name: string;
  inline: boolean;
  complexity: "simple" | "moderate" | "complex";
  purpose: string;
}

export interface RenderMethodInfo {
  name: string;
  complexity: number;
  conditional: boolean;
  returnsJSX: boolean;
}

export interface ReactDependency {
  name: string;
  version?: string;
  usage: string[];
  critical: boolean;
}

export interface ExternalLibrary {
  name: string;
  purpose: string;
  version?: string;
  treeshakeable: boolean;
  bundleSize?: string;
}

export interface InternalComponent {
  name: string;
  path: string;
  relationship: "parent" | "child" | "sibling" | "wrapper";
  usage: string;
}

export interface UtilityDependency {
  name: string;
  path: string;
  functions: string[];
  critical: boolean;
}

export interface StyleDependency {
  type: "css" | "scss" | "styled-components" | "emotion" | "tailwind";
  path?: string;
  classes: string[];
  dynamic: boolean;
}

export interface EffectInfo {
  type: "useEffect" | "useLayoutEffect" | "custom";
  purpose: string;
  dependencies: string[];
  hasCleanup: boolean;
  triggers: string[];
}

export interface MountInfo {
  hasOnMount: boolean;
  operations: string[];
  sideEffects: string[];
}

export interface UpdateInfo {
  dependencies: string[];
  operations: string[];
  optimized: boolean;
}

export interface CleanupInfo {
  hasCleanup: boolean;
  operations: string[];
  listeners: string[];
  subscriptions: string[];
}

export interface ErrorBoundaryInfo {
  isErrorBoundary: boolean;
  catchesErrors: boolean;
  fallbackComponent: string;
  errorHandling: string[];
}

export interface MemoizationInfo {
  useMemo: MemoUsage[];
  useCallback: CallbackUsage[];
  reactMemo: boolean;
  memoizedComponents: string[];
}

export interface LazyLoadingInfo {
  isLazy: boolean;
  lazyComponents: string[];
  suspenseBoundary: boolean;
  fallbackComponent?: string;
}

export interface ExpensiveOperation {
  operation: string;
  location: string;
  impact: "low" | "medium" | "high";
  suggestion: string;
}

export interface OptimizationOpportunity {
  type: "memoization" | "code-splitting" | "bundle-optimization" | "rendering";
  description: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
}

export interface AriaAttribute {
  name: string;
  value: string;
  element: string;
  purpose: string;
}

export interface SemanticElement {
  tag: string;
  count: number;
  proper: boolean;
}

export interface KeyboardNavigationInfo {
  hasTabIndex: boolean;
  keyHandlers: string[];
  focusManagement: boolean;
  shortcuts: string[];
}

export interface ScreenReaderInfo {
  hasAriaLabels: boolean;
  hasAriaDescriptions: boolean;
  hasLiveRegions: boolean;
  hasLandmarks: boolean;
}

export interface ColorContrastInfo {
  hasContrastIssues: boolean;
  contrastRatio?: number;
  suggestions: string[];
}

export interface TestabilityScore {
  score: number;
  factors: TestabilityFactor[];
  improvements: string[];
}

export interface TestPattern {
  pattern: string;
  suitable: boolean;
  reason: string;
}

export interface ComplexInteraction {
  interaction: string;
  complexity: "low" | "medium" | "high";
  testingStrategy: string;
}

export interface DesignPattern {
  name: string;
  confidence: number;
  evidence: string[];
}

export interface AntiPattern {
  name: string;
  severity: "low" | "medium" | "high";
  description: string;
  suggestion: string;
}

export interface MemoUsage {
  variable: string;
  dependencies: string[];
  complex: boolean;
}

export interface CallbackUsage {
  function: string;
  dependencies: string[];
  purpose: string;
}

export interface TestabilityFactor {
  factor: string;
  score: number;
  description: string;
}

export interface ComponentLocation {
  startLine: number;
  endLine: number;
  filePath: string;
  directory: string;
}

export type ComponentType =
  | "functional-component"
  | "class-component"
  | "higher-order-component"
  | "render-prop-component"
  | "compound-component"
  | "custom-hook"
  | "utility-component";

export type ComponentCategory =
  | "page"
  | "layout"
  | "container"
  | "presentation"
  | "form"
  | "navigation"
  | "utility"
  | "provider"
  | "wrapper";

export type ComponentComplexity =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type HookType =
  | "state"
  | "effect"
  | "context"
  | "ref"
  | "memo"
  | "callback"
  | "reducer"
  | "custom";

export interface ComponentContext {
  components: ComponentDefinition[];
  relationships: ComponentRelationship[];
  patterns: ComponentPatternAnalysis;
  architecture: ComponentArchitecture;
  quality: QualityMetrics;
}

export interface ComponentRelationship {
  parent: string;
  child: string;
  relationship:
    | "renders"
    | "imports"
    | "wraps"
    | "provides-data"
    | "receives-props";
  strength: "weak" | "medium" | "strong";
}

export interface ComponentPatternAnalysis {
  commonPatterns: string[];
  patternUsage: { [pattern: string]: number };
  antiPatterns: AntiPattern[];
  recommendations: string[];
}

export interface ComponentArchitecture {
  structure: "flat" | "nested" | "feature-based" | "atomic";
  depth: number;
  componentHierarchy: ComponentHierarchy[];
  modularity: ModularityInfo;
}

export interface ComponentHierarchy {
  component: string;
  level: number;
  children: string[];
  parent?: string;
}

export interface ModularityInfo {
  cohesion: "low" | "medium" | "high";
  coupling: "low" | "medium" | "high";
  reusability: "low" | "medium" | "high";
  maintainability: "low" | "medium" | "high";
}

export interface QualityMetrics {
  averageComplexity: number;
  testabilityCoverage: number;
  accessibilityScore: number;
  performanceScore: number;
  maintainabilityScore: number;
  reusabilityScore: number;
}
