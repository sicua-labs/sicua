import ts from "typescript";
import { FileContextType } from "../types";
import { determineFileContextType } from "../utils/contextUtils";
import { ImportExtractor } from "./ImportExtractor";
import { FunctionExtractor } from "./FunctionExtractor";
import { TypeExtractor } from "./TypeExtractor";
import {
  ComponentContext,
  ComponentDefinition,
  ComponentCategory,
  ComponentComplexity,
  ReactComponentInfo,
  HookUsage,
  PropDefinition,
  JSXComplexity,
  HookType,
  ComponentStructure,
  ComponentDependencies,
  PerformanceInfo,
  AccessibilityInfo,
  TestingInfo,
  ComponentPatterns,
  ComponentLocation,
  StateDefinition,
  AntiPattern,
  ComponentArchitecture,
  ComponentHierarchy,
  ComponentPatternAnalysis,
  ComponentRelationship,
  ContextUsage,
  ModularityInfo,
  QualityMetrics,
  RefUsage,
  ComponentType,
  ComponentLifecycle,
} from "../types/componentExtractor.types";
import { FunctionDefinition } from "../types/functionExtractor.types";
import { isReactComponentDefinition } from "../../../utils/ast/reactSpecific";

export class ComponentExtractor {
  private sourceFile: ts.SourceFile;
  private content: string;
  private filePath: string;
  private importExtractor: ImportExtractor;
  private functionExtractor: FunctionExtractor;
  private typeExtractor: TypeExtractor;

  constructor(
    sourceFile: ts.SourceFile,
    content: string,
    filePath: string,
    srcDir: string,
    typeChecker?: ts.TypeChecker
  ) {
    this.sourceFile = sourceFile;
    this.content = content;
    this.filePath = filePath;
    this.importExtractor = new ImportExtractor(srcDir);
    this.functionExtractor = new FunctionExtractor(sourceFile, content);
    this.typeExtractor = new TypeExtractor(typeChecker);
  }

  /**
   * Extracts all component context from the source file
   */
  extractComponentContext(): ComponentContext {
    const fileType = determineFileContextType(
      this.filePath,
      this.content,
      this.sourceFile
    );

    // Only process React-related files
    if (!this.isReactRelatedFile(fileType)) {
      return {
        components: [],
        relationships: [],
        patterns: this.createEmptyPatternAnalysis(),
        architecture: this.createEmptyArchitecture(),
        quality: this.createEmptyQualityMetrics(),
      };
    }

    const components = this.extractComponents();
    const relationships = this.extractComponentRelationships(components);
    const patterns = this.analyzeComponentPatterns(components);
    const architecture = this.analyzeComponentArchitecture(components);
    const quality = this.calculateQualityMetrics(components);

    return {
      components,
      relationships,
      patterns,
      architecture,
      quality,
    };
  }

  /**
   * Extracts individual components from the file
   */
  private extractComponents(): ComponentDefinition[] {
    const components: ComponentDefinition[] = [];
    const functionContext = this.functionExtractor.extractFunctionContext();
    const typeContext = this.typeExtractor.extractTypeContext(this.sourceFile);
    const dependencyContext = this.importExtractor.extractDependencies(
      this.sourceFile,
      this.filePath
    );

    // Find React components among functions
    functionContext.functions.forEach((func) => {
      if (isReactComponentDefinition(func)) {
        const component = this.buildComponentDefinition(
          func,
          functionContext,
          typeContext,
          dependencyContext
        );
        components.push(component);
      }
    });

    // Find class components
    ts.forEachChild(this.sourceFile, (node) => {
      if (ts.isClassDeclaration(node) && this.isReactClassComponent(node)) {
        const component = this.buildClassComponentDefinition(
          node,
          typeContext,
          dependencyContext
        );
        components.push(component);
      }
    });

    return components;
  }

  /**
   * Builds a complete component definition
   */
  private buildComponentDefinition(
    func: FunctionDefinition,
    functionContext: any,
    typeContext: any,
    dependencyContext: any
  ): ComponentDefinition {
    const name = func.name;
    const type = this.determineComponentType(func);
    const category = this.determineComponentCategory(func);
    const complexity = this.calculateComponentComplexity(func);
    const reactInfo = this.extractReactComponentInfo(func);
    const structure = this.extractComponentStructure(
      func,
      functionContext,
      typeContext
    );
    const dependencies = this.extractComponentDependencies(dependencyContext);
    const lifecycle = this.extractComponentLifecycle(func);
    const performance = this.analyzePerformance(func);
    const accessibility = this.analyzeAccessibility(func);
    const testing = this.analyzeTestability(func);
    const patterns = this.extractComponentPatterns(func);
    const location = this.getComponentLocation(func);

    return {
      name,
      type,
      category,
      complexity,
      reactInfo,
      structure,
      dependencies,
      lifecycle,
      performance,
      accessibility,
      testing,
      patterns,
      isExported: func.isExported,
      exportType: func.exportType,
      description: func.description,
      location,
    };
  }

  /**
   * Determines if a class is a React component
   */
  private isReactClassComponent(node: ts.ClassDeclaration): boolean {
    if (!node.heritageClauses) return false;

    return node.heritageClauses.some((clause) =>
      clause.types.some((type) => {
        const text = type.expression.getText();
        return text.includes("Component") || text.includes("PureComponent");
      })
    );
  }

  /**
   * Determines component type
   */
  private determineComponentType(func: FunctionDefinition): ComponentType {
    const nodeText = this.content;

    // Higher-order component
    if (this.isHOC(func)) return "higher-order-component";

    // Render prop component
    if (this.isRenderProp(func)) return "render-prop-component";

    // Compound component
    if (this.isCompoundComponent(func)) return "compound-component";

    // Custom hook
    if (func.reactSpecific?.isHook) return "custom-hook";

    // Default to functional component
    return "functional-component";
  }

  /**
   * Determines component category
   */
  private determineComponentCategory(
    func: FunctionDefinition
  ): ComponentCategory {
    const name = func.name.toLowerCase();
    const nodeText = this.content.toLowerCase();

    // Page components
    if (
      name.includes("page") ||
      name.includes("route") ||
      name.includes("screen")
    ) {
      return "page";
    }

    // Layout components
    if (
      name.includes("layout") ||
      name.includes("template") ||
      name.includes("wrapper")
    ) {
      return "layout";
    }

    // Container components (state logic)
    if (
      func.reactSpecific?.stateUsage.hasState &&
      func.complexity.level !== "low"
    ) {
      return "container";
    }

    // Form components
    if (
      name.includes("form") ||
      nodeText.includes("onsubmit") ||
      nodeText.includes("validation")
    ) {
      return "form";
    }

    // Navigation components
    if (
      name.includes("nav") ||
      name.includes("menu") ||
      name.includes("tab") ||
      name.includes("breadcrumb")
    ) {
      return "navigation";
    }

    // Provider components
    if (name.includes("provider") || nodeText.includes("context.provider")) {
      return "provider";
    }

    // Presentation components (no state, simple)
    if (
      !func.reactSpecific?.stateUsage.hasState &&
      func.complexity.level === "low"
    ) {
      return "presentation";
    }

    return "utility";
  }

  /**
   * Calculates component complexity
   */
  private calculateComponentComplexity(
    func: FunctionDefinition
  ): ComponentComplexity {
    let score = 0;

    // Base function complexity
    switch (func.complexity.level) {
      case "very-high":
        score += 4;
        break;
      case "high":
        score += 3;
        break;
      case "medium":
        score += 2;
        break;
      case "low":
        score += 1;
        break;
    }

    // JSX complexity
    if (func.reactSpecific?.jsxComplexity) {
      score += Math.min(func.reactSpecific.jsxComplexity / 10, 3);
    }

    // Hooks complexity
    const hooksCount = func.reactSpecific?.hooksUsed.length || 0;
    score += Math.min(hooksCount / 3, 2);

    // State complexity
    const stateVars = func.reactSpecific?.stateUsage.stateVariables.length || 0;
    score += Math.min(stateVars / 2, 2);

    // Effects complexity
    const effectsCount = func.reactSpecific?.effectUsage.effects.length || 0;
    score += Math.min(effectsCount / 2, 2);

    if (score >= 10) return "very-high";
    if (score >= 7) return "high";
    if (score >= 4) return "medium";
    if (score >= 2) return "low";
    return "very-low";
  }

  /**
   * Extracts React-specific component information
   */
  private extractReactComponentInfo(
    func: FunctionDefinition
  ): ReactComponentInfo {
    const reactSpecific = func.reactSpecific;
    if (!reactSpecific) {
      return this.createEmptyReactComponentInfo();
    }

    const hooks = this.extractHookUsage(func);
    const props = this.extractPropDefinitions(func);
    const state = this.extractStateDefinitions(func);
    const context = this.extractContextUsage(func);
    const refs = this.extractRefUsage(func);
    const jsxComplexity = this.calculateJSXComplexity(func);

    return {
      isComponent: reactSpecific.isComponent,
      isFunctional:
        func.kind === "function-declaration" || func.kind === "arrow-function",
      isClassBased: false, // Would be determined differently for class components
      isHOC: this.isHOC(func),
      isRenderProp: this.isRenderProp(func),
      isCompoundComponent: this.isCompoundComponent(func),
      hooks,
      props,
      state,
      context,
      refs,
      jsxComplexity,
    };
  }

  /**
   * Extracts hook usage information
   */
  private extractHookUsage(func: FunctionDefinition): HookUsage[] {
    const hooks: HookUsage[] = [];
    const hooksUsed = func.reactSpecific?.hooksUsed || [];

    hooksUsed.forEach((hookName) => {
      const hookType = this.determineHookType(hookName);
      const complexity = this.determineHookComplexity(hookName, func);
      const dependencies = this.extractHookDependencies(hookName, func);
      const purpose = this.determineHookPurpose(hookName);
      const customHook = ![
        "useState",
        "useEffect",
        "useContext",
        "useReducer",
        "useCallback",
        "useMemo",
        "useRef",
        "useLayoutEffect",
      ].includes(hookName);

      hooks.push({
        name: hookName,
        type: hookType,
        complexity,
        dependencies,
        purpose,
        customHook,
      });
    });

    return hooks;
  }

  /**
   * Extracts prop definitions
   */
  private extractPropDefinitions(func: FunctionDefinition): PropDefinition[] {
    const props: PropDefinition[] = [];
    const propTypes = func.reactSpecific?.propTypes;

    if (propTypes && propTypes.length > 0) {
      propTypes.forEach((propName) => {
        // Extract from function parameters
        if (func.signature.parameters.length > 0) {
          const propsParam = func.signature.parameters[0];
          if (propsParam.destructured) {
            props.push({
              name: propName,
              type: "any", // Would need more sophisticated type extraction
              required: !propsParam.optional,
              description: `Prop extracted from component parameters`,
            });
          }
        }
      });
    }

    return props;
  }

  /**
   * Calculates JSX complexity
   */
  private calculateJSXComplexity(func: FunctionDefinition): JSXComplexity {
    const nodeText = this.content;

    const elementCount = (nodeText.match(/<[A-Z]/g) || []).length;
    const nestingDepth = this.calculateJSXNestingDepth(nodeText);
    const conditionalRenders =
      (nodeText.match(/\{[^}]*\?[^}]*:/g) || []).length +
      (nodeText.match(/&&[^}]*</g) || []).length;
    const listRenders = (nodeText.match(/\.map\(/g) || []).length;
    const dynamicProps = (nodeText.match(/\{[^}]+\}/g) || []).length;
    const eventHandlers = (nodeText.match(/on[A-Z]\w*=/g) || []).length;

    const complexityScore =
      elementCount +
      nestingDepth * 2 +
      conditionalRenders * 3 +
      listRenders * 2 +
      dynamicProps +
      eventHandlers;

    return {
      elementCount,
      nestingDepth,
      conditionalRenders,
      listRenders,
      dynamicProps,
      eventHandlers,
      complexityScore,
    };
  }

  /**
   * Helper methods for component analysis
   */
  private isHOC(func: FunctionDefinition): boolean {
    const nodeText = this.content;
    // Look for HOC patterns: function that returns a function/component
    return (
      nodeText.includes("return function") ||
      nodeText.includes("return (props") ||
      (func.name.startsWith("with") &&
        func.name[4]?.toUpperCase() === func.name[4])
    );
  }

  private isRenderProp(func: FunctionDefinition): boolean {
    const nodeText = this.content;
    return (
      nodeText.includes("children(") ||
      nodeText.includes("render(") ||
      func.signature.parameters.some(
        (p) => p.name === "render" || p.name === "children"
      )
    );
  }

  private isCompoundComponent(func: FunctionDefinition): boolean {
    const nodeText = this.content;
    // Look for component.subcomponent patterns
    return (
      nodeText.includes(`${func.name}.`) &&
      nodeText.includes("= ") &&
      nodeText.includes("function")
    );
  }

  private isReactRelatedFile(fileType: FileContextType): boolean {
    return (
      ["react-component", "react-hook"].includes(fileType) ||
      this.content.includes("import React") ||
      this.content.includes("from 'react'") ||
      this.content.includes("jsx") ||
      this.content.includes("tsx")
    );
  }

  private calculateJSXNestingDepth(nodeText: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    let inJSX = false;

    for (let i = 0; i < nodeText.length; i++) {
      const char = nodeText[i];
      const nextChar = nodeText[i + 1];

      if (char === "<" && nextChar && /[A-Za-z]/.test(nextChar)) {
        inJSX = true;
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === "<" && nextChar === "/") {
        currentDepth = Math.max(0, currentDepth - 1);
      } else if (char === "/" && nextChar === ">") {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  private determineHookType(hookName: string): HookType {
    if (hookName.includes("State")) return "state";
    if (hookName.includes("Effect")) return "effect";
    if (hookName.includes("Context")) return "context";
    if (hookName.includes("Ref")) return "ref";
    if (hookName.includes("Memo")) return "memo";
    if (hookName.includes("Callback")) return "callback";
    if (hookName.includes("Reducer")) return "reducer";
    return "custom";
  }

  private determineHookComplexity(
    hookName: string,
    func: FunctionDefinition
  ): "simple" | "moderate" | "complex" {
    // Simple heuristics based on hook usage
    if (hookName === "useState" || hookName === "useRef") return "simple";
    if (hookName === "useEffect" || hookName === "useCallback")
      return "moderate";
    if (
      hookName === "useReducer" ||
      (hookName.startsWith("use") && !hookName.includes("State"))
    )
      return "complex";
    return "simple";
  }

  private extractHookDependencies(
    hookName: string,
    func: FunctionDefinition
  ): string[] {
    // Extract from effect usage if available
    if (func.reactSpecific?.effectUsage) {
      const relatedEffect = func.reactSpecific.effectUsage.effects.find((e) =>
        e.type.includes(hookName.toLowerCase())
      );
      return relatedEffect?.dependencies || [];
    }
    return [];
  }

  private determineHookPurpose(hookName: string): string {
    const purposes: { [key: string]: string } = {
      useState: "Manages local component state",
      useEffect: "Handles side effects and lifecycle",
      useContext: "Consumes context values",
      useReducer: "Manages complex state logic",
      useCallback: "Memoizes functions",
      useMemo: "Memoizes computed values",
      useRef: "References DOM elements or values",
      useLayoutEffect: "Synchronous side effects",
    };

    return purposes[hookName] || "Custom hook functionality";
  }

  // Placeholder methods for remaining functionality
  private buildClassComponentDefinition(
    node: ts.ClassDeclaration,
    typeContext: any,
    dependencyContext: any
  ): ComponentDefinition {
    // Implementation for class components
    return {} as ComponentDefinition;
  }

  private extractComponentStructure(
    func: FunctionDefinition,
    functionContext: any,
    typeContext: any
  ): ComponentStructure {
    return {} as ComponentStructure;
  }

  private extractComponentDependencies(
    dependencyContext: any
  ): ComponentDependencies {
    return {} as ComponentDependencies;
  }

  private extractComponentLifecycle(
    func: FunctionDefinition
  ): ComponentLifecycle {
    return {} as ComponentLifecycle;
  }

  private analyzePerformance(func: FunctionDefinition): PerformanceInfo {
    return {} as PerformanceInfo;
  }

  private analyzeAccessibility(func: FunctionDefinition): AccessibilityInfo {
    return {} as AccessibilityInfo;
  }

  private analyzeTestability(func: FunctionDefinition): TestingInfo {
    return {} as TestingInfo;
  }

  private extractComponentPatterns(
    func: FunctionDefinition
  ): ComponentPatterns {
    return {} as ComponentPatterns;
  }

  private getComponentLocation(func: FunctionDefinition): ComponentLocation {
    return {} as ComponentLocation;
  }

  private extractStateDefinitions(func: FunctionDefinition): StateDefinition[] {
    const stateDefinitions: StateDefinition[] = [];
    const stateUsage = func.reactSpecific?.stateUsage;

    if (!stateUsage) return stateDefinitions;

    // Extract useState variables
    stateUsage.stateVariables.forEach((stateVar) => {
      const updaterName = `set${
        stateVar.charAt(0).toUpperCase() + stateVar.slice(1)
      }`;
      stateDefinitions.push({
        name: stateVar,
        type: "unknown", // Would need more sophisticated type extraction
        scope: "local",
        updaters: [updaterName],
      });
    });

    // Extract reducer states
    stateUsage.reducers.forEach((reducer) => {
      stateDefinitions.push({
        name: reducer,
        type: "reducer",
        scope: "local",
        updaters: ["dispatch"],
      });
    });

    // Extract context states
    stateUsage.contextUsage.forEach((context) => {
      stateDefinitions.push({
        name: context,
        type: "context",
        scope: "global",
        updaters: [],
      });
    });

    return stateDefinitions;
  }

  private extractContextUsage(func: FunctionDefinition): ContextUsage[] {
    const contextUsages: ContextUsage[] = [];
    const nodeText = this.content;

    // Find context providers
    const providerPattern = /(\w+)\.Provider/g;
    let match: RegExpExecArray | null;
    while ((match = providerPattern.exec(nodeText)) !== null) {
      contextUsages.push({
        contextName: match[1],
        isProvider: true,
        isConsumer: false,
        valuesProvided: this.extractProvidedValues(match[1]),
        valuesConsumed: [],
      });
    }

    // Find context consumers
    const consumerPattern = /useContext\((\w+)\)/g;
    while ((match = consumerPattern.exec(nodeText)) !== null) {
      const existing = contextUsages.find((c) => c.contextName === match![1]);
      if (existing) {
        existing.isConsumer = true;
        existing.valuesConsumed = this.extractConsumedValues(match![1]);
      } else {
        contextUsages.push({
          contextName: match![1],
          isProvider: false,
          isConsumer: true,
          valuesProvided: [],
          valuesConsumed: this.extractConsumedValues(match![1]),
        });
      }
    }

    return contextUsages;
  }

  private extractRefUsage(func: FunctionDefinition): RefUsage[] {
    const refUsages: RefUsage[] = [];
    const nodeText = this.content;

    // Find useRef calls
    const refPattern = /const\s+(\w+)\s*=\s*useRef\s*\(\s*([^)]*)\s*\)/g;
    let match;
    while ((match = refPattern.exec(nodeText)) !== null) {
      const refName = match[1];
      const initialValue = match[2];

      refUsages.push({
        name: refName,
        type: this.determineRefType(refName, initialValue),
        purpose: this.determineRefPurpose(refName, nodeText),
        forwardedRef: false,
      });
    }

    // Find forwardRef usage
    if (nodeText.includes("forwardRef")) {
      refUsages.push({
        name: "forwardedRef",
        type: "element",
        purpose: "Forwarded reference to child component",
        forwardedRef: true,
      });
    }

    return refUsages;
  }

  private extractComponentRelationships(
    components: ComponentDefinition[]
  ): ComponentRelationship[] {
    const relationships: ComponentRelationship[] = [];

    components.forEach((component) => {
      // Extract render relationships from JSX
      const renderedComponents = this.extractRenderedComponents(component);
      renderedComponents.forEach((rendered) => {
        relationships.push({
          parent: component.name,
          child: rendered,
          relationship: "renders",
          strength: "medium",
        });
      });

      // Extract import relationships
      component.dependencies.internalComponents.forEach((internal) => {
        relationships.push({
          parent: component.name,
          child: internal.name,
          relationship: "imports",
          strength: internal.relationship === "child" ? "strong" : "medium",
        });
      });

      // Extract prop passing relationships
      const propRelationships = this.extractPropRelationships(component);
      relationships.push(...propRelationships);
    });

    return relationships;
  }

  private analyzeComponentPatterns(
    components: ComponentDefinition[]
  ): ComponentPatternAnalysis {
    const patternCounts: { [pattern: string]: number } = {};
    const antiPatterns: AntiPattern[] = [];

    components.forEach((component) => {
      // Count design patterns
      component.patterns.designPatterns.forEach((pattern) => {
        patternCounts[pattern.name] = (patternCounts[pattern.name] || 0) + 1;
      });

      // Count React patterns
      component.patterns.reactPatterns.forEach((pattern) => {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      });

      // Collect anti-patterns
      antiPatterns.push(...component.patterns.antiPatterns);
    });

    const commonPatterns = Object.entries(patternCounts)
      .filter(([_, count]) => count >= 2)
      .map(([pattern, _]) => pattern);

    const recommendations = this.generatePatternRecommendations(
      patternCounts,
      antiPatterns
    );

    return {
      commonPatterns,
      patternUsage: patternCounts,
      antiPatterns,
      recommendations,
    };
  }

  private analyzeComponentArchitecture(
    components: ComponentDefinition[]
  ): ComponentArchitecture {
    const hierarchy = this.buildComponentHierarchy(components);
    const structure = this.determineArchitectureStructure(components);
    const depth = this.calculateArchitectureDepth(hierarchy);
    const modularity = this.analyzeModularity(components);

    return {
      structure,
      depth,
      componentHierarchy: hierarchy,
      modularity,
    };
  }

  private calculateQualityMetrics(
    components: ComponentDefinition[]
  ): QualityMetrics {
    if (components.length === 0) {
      return this.createEmptyQualityMetrics();
    }

    const complexityScores = components.map((c) =>
      this.complexityToNumber(c.complexity)
    );
    const averageComplexity =
      complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;

    const testabilityCoverage =
      components.reduce((total, c) => total + c.testing.testability.score, 0) /
      components.length;

    const accessibilityScore =
      components.reduce(
        (total, c) => total + c.accessibility.accessibilityScore,
        0
      ) / components.length;

    const performanceScore =
      components.reduce(
        (total, c) => total + this.calculatePerformanceScore(c.performance),
        0
      ) / components.length;

    const maintainabilityScore = this.calculateMaintainabilityScore(components);
    const reusabilityScore = this.calculateReusabilityScore(components);

    return {
      averageComplexity,
      testabilityCoverage,
      accessibilityScore,
      performanceScore,
      maintainabilityScore,
      reusabilityScore,
    };
  }

  // Helper methods
  private extractProvidedValues(contextName: string): string[] {
    const nodeText = this.content;
    const pattern = new RegExp(
      `${contextName}\\.Provider[^>]*value\\s*=\\s*\\{\\s*([^}]+)\\s*\\}`,
      "g"
    );
    const match = pattern.exec(nodeText);

    if (match) {
      return match[1]
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v);
    }
    return [];
  }

  private extractConsumedValues(contextName: string): string[] {
    const nodeText = this.content;
    const pattern = new RegExp(
      `const\\s+\\{([^}]+)\\}\\s*=\\s*useContext\\(${contextName}\\)`,
      "g"
    );
    const match = pattern.exec(nodeText);

    if (match) {
      return match[1]
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v);
    }
    return [];
  }

  private determineRefType(
    refName: string,
    initialValue: string
  ): "element" | "component" | "value" {
    if (initialValue === "null" || initialValue === "") return "element";
    if (initialValue && !initialValue.includes("null")) return "value";
    if (refName.toLowerCase().includes("ref")) return "element";
    return "value";
  }

  private determineRefPurpose(refName: string, nodeText: string): string {
    if (nodeText.includes(`${refName}.current.focus`))
      return "Focus management";
    if (nodeText.includes(`${refName}.current.scroll`)) return "Scroll control";
    if (nodeText.includes(`${refName}.current.measure`))
      return "DOM measurements";
    if (nodeText.includes(`${refName}.current`)) return "DOM manipulation";
    return "Value persistence";
  }

  private extractRenderedComponents(component: ComponentDefinition): string[] {
    const nodeText = this.content;
    const componentPattern = /<([A-Z][A-Za-z0-9]*)/g;
    const rendered: string[] = [];
    let match;

    while ((match = componentPattern.exec(nodeText)) !== null) {
      const componentName = match[1];
      if (
        componentName !== component.name &&
        !rendered.includes(componentName)
      ) {
        rendered.push(componentName);
      }
    }

    return rendered;
  }

  private extractPropRelationships(
    component: ComponentDefinition
  ): ComponentRelationship[] {
    const relationships: ComponentRelationship[] = [];
    const nodeText = this.content;

    // Look for prop passing patterns
    const propPattern = /<([A-Z][A-Za-z0-9]*)[^>]*\s+(\w+)=/g;
    let match;

    while ((match = propPattern.exec(nodeText)) !== null) {
      const childComponent = match[1];
      const propName = match[2];

      relationships.push({
        parent: component.name,
        child: childComponent,
        relationship: "provides-data",
        strength: "medium",
      });
    }

    return relationships;
  }

  private generatePatternRecommendations(
    patternCounts: { [pattern: string]: number },
    antiPatterns: AntiPattern[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommend patterns that are underused
    if (patternCounts["custom-hook"] === 0) {
      recommendations.push(
        "Consider extracting reusable logic into custom hooks"
      );
    }

    if (patternCounts["react-memo"] === 0) {
      recommendations.push(
        "Consider using React.memo for performance optimization"
      );
    }

    // Address anti-patterns
    antiPatterns.forEach((antiPattern) => {
      if (antiPattern.severity === "high") {
        recommendations.push(
          `Address ${antiPattern.name}: ${antiPattern.suggestion}`
        );
      }
    });

    return recommendations;
  }

  private buildComponentHierarchy(
    components: ComponentDefinition[]
  ): ComponentHierarchy[] {
    const hierarchy: ComponentHierarchy[] = [];

    components.forEach((component) => {
      const children = this.extractRenderedComponents(component);
      hierarchy.push({
        component: component.name,
        level: 0, // Would need more sophisticated calculation
        children,
        parent: undefined, // Would need to determine parent relationships
      });
    });

    return hierarchy;
  }

  private determineArchitectureStructure(
    components: ComponentDefinition[]
  ): "flat" | "nested" | "feature-based" | "atomic" {
    const avgNesting =
      components.reduce(
        (total, c) => total + c.reactInfo.jsxComplexity.nestingDepth,
        0
      ) / components.length;

    if (avgNesting > 5) return "nested";
    if (components.some((c) => c.category === "page")) return "feature-based";
    if (components.every((c) => c.category === "presentation")) return "atomic";
    return "flat";
  }

  private calculateArchitectureDepth(hierarchy: ComponentHierarchy[]): number {
    return Math.max(...hierarchy.map((h) => h.level), 0);
  }

  private analyzeModularity(components: ComponentDefinition[]): ModularityInfo {
    // Simple heuristics for modularity analysis
    const avgComplexity =
      components.reduce(
        (total, c) => total + this.complexityToNumber(c.complexity),
        0
      ) / components.length;

    const cohesion =
      avgComplexity < 3 ? "high" : avgComplexity < 5 ? "medium" : "low";
    const coupling = components.some(
      (c) => c.dependencies.internalComponents.length > 5
    )
      ? "high"
      : "medium";
    const reusability =
      components.filter((c) => c.category === "presentation").length /
        components.length >
      0.5
        ? "high"
        : "medium";
    const maintainability =
      cohesion === "high" && coupling !== "high" ? "high" : "medium"; // Fixed comparison

    return { cohesion, coupling, reusability, maintainability };
  }

  private complexityToNumber(complexity: ComponentComplexity): number {
    const map = { "very-low": 1, low: 2, medium: 3, high: 4, "very-high": 5 };
    return map[complexity];
  }

  private calculatePerformanceScore(performance: PerformanceInfo): number {
    let score = 100;

    // Deduct points for performance issues
    score -= performance.expensiveOperations.length * 10;

    // Add points for optimizations
    if (performance.memoization.reactMemo) score += 10;
    if (performance.lazyLoading.isLazy) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  private calculateMaintainabilityScore(
    components: ComponentDefinition[]
  ): number {
    let score = 100;

    // Deduct for high complexity
    const highComplexityCount = components.filter(
      (c) => c.complexity === "high" || c.complexity === "very-high"
    ).length;
    score -= (highComplexityCount / components.length) * 50;

    // Deduct for anti-patterns
    const antiPatternCount = components.reduce(
      (total, c) => total + c.patterns.antiPatterns.length,
      0
    );
    score -= antiPatternCount * 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateReusabilityScore(components: ComponentDefinition[]): number {
    const presentationComponents = components.filter(
      (c) => c.category === "presentation"
    ).length;
    const utilityComponents = components.filter(
      (c) => c.category === "utility"
    ).length;
    const reusableCount = presentationComponents + utilityComponents;

    return (reusableCount / components.length) * 100;
  }

  // Empty object creators
  private createEmptyReactComponentInfo(): ReactComponentInfo {
    return {
      isComponent: false,
      isFunctional: false,
      isClassBased: false,
      isHOC: false,
      isRenderProp: false,
      isCompoundComponent: false,
      hooks: [],
      props: [],
      state: [],
      context: [],
      refs: [],
      jsxComplexity: {
        elementCount: 0,
        nestingDepth: 0,
        conditionalRenders: 0,
        listRenders: 0,
        dynamicProps: 0,
        eventHandlers: 0,
        complexityScore: 0,
      },
    };
  }

  private createEmptyPatternAnalysis(): ComponentPatternAnalysis {
    return {
      commonPatterns: [],
      patternUsage: {},
      antiPatterns: [],
      recommendations: [],
    };
  }

  private createEmptyArchitecture(): ComponentArchitecture {
    return {
      structure: "flat",
      depth: 0,
      componentHierarchy: [],
      modularity: {
        cohesion: "medium",
        coupling: "medium",
        reusability: "medium",
        maintainability: "medium",
      },
    };
  }

  private createEmptyQualityMetrics(): QualityMetrics {
    return {
      averageComplexity: 0,
      testabilityCoverage: 0,
      accessibilityScore: 0,
      performanceScore: 0,
      maintainabilityScore: 0,
      reusabilityScore: 0,
    };
  }
}
