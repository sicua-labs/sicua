import ts from "typescript";
import { UsagePatternType } from "../types";
import { getExportType, identifyReactPatterns } from "../utils/contextUtils";
import {
  FunctionContext,
  FunctionDefinition,
  FunctionCall,
  FunctionSignature,
  FunctionParameter,
  FunctionComplexity,
  ReactFunctionInfo,
  StateUsageInfo,
  EffectUsageInfo,
  FunctionDependency,
  FunctionComplexityMetrics,
  PatternAnalysis,
  FunctionKind,
  CodeLocation,
  SideEffect,
  EffectInfo,
} from "../types/functionExtractor.types";
import { isReactComponent } from "../../../utils/ast/reactSpecific";

export class FunctionExtractor {
  private sourceFile: ts.SourceFile;
  private content: string;

  constructor(sourceFile: ts.SourceFile, content: string) {
    this.sourceFile = sourceFile;
    this.content = content;
  }

  /**
   * Extracts all function context from the source file
   */
  extractFunctionContext(): FunctionContext {
    const functions: FunctionDefinition[] = [];
    const callGraph: FunctionCall[] = [];

    // Extract function definitions
    this.visitNode(this.sourceFile, (node) => {
      if (this.isFunctionNode(node)) {
        functions.push(this.extractFunction(node));
      }
    });

    // Extract function calls
    this.extractFunctionCalls(functions, callGraph);

    const complexity = this.calculateComplexityMetrics(functions);
    const patterns = this.analyzePatterns(functions);

    return {
      functions,
      callGraph,
      complexity,
      patterns,
    };
  }

  /**
   * Extracts a single function definition
   */
  private extractFunction(node: ts.Node): FunctionDefinition {
    const name = this.getFunctionName(node);
    const kind = this.getFunctionKind(node);
    const signature = this.extractSignature(node);
    const complexity = this.calculateFunctionComplexity(node);
    const patterns = this.identifyUsagePatterns(node);
    const reactSpecific = this.extractReactInfo(node);
    const async = this.isAsyncFunction(node);
    const pure = this.isPureFunction(node);
    const sideEffects = this.extractSideEffects(node);
    const dependencies = this.extractFunctionDependencies(node);
    const isExported = this.hasExportModifier(node);
    const location = this.getLocation(node);

    return {
      name,
      kind,
      signature,
      complexity,
      patterns,
      reactSpecific,
      async,
      pure,
      sideEffects,
      dependencies,
      isExported,
      exportType: isExported ? getExportType(node) : undefined,
      description: this.extractJSDocComment(node),
      location,
    };
  }

  /**
   * Extracts function signature
   */
  private extractSignature(node: ts.Node): FunctionSignature {
    let parameters: FunctionParameter[] = [];
    let returnType = "void";
    let generics: string[] = [];
    let overloads: string[] = [];

    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    ) {
      parameters = this.extractParameters(node.parameters);
      returnType = node.type?.getText() || "void";
      generics = this.extractGenerics(node.typeParameters);
    } else if (ts.isMethodDeclaration(node)) {
      parameters = this.extractParameters(node.parameters);
      returnType = node.type?.getText() || "void";
      generics = this.extractGenerics(node.typeParameters);
    }

    return {
      parameters,
      returnType,
      generics,
      overloads,
    };
  }

  /**
   * Extracts function parameters
   */
  private extractParameters(
    parameters: ts.NodeArray<ts.ParameterDeclaration>
  ): FunctionParameter[] {
    return parameters.map((param) => ({
      name: param.name.getText(),
      type: param.type?.getText() || "any",
      optional: !!param.questionToken,
      defaultValue: param.initializer?.getText(),
      destructured:
        ts.isObjectBindingPattern(param.name) ||
        ts.isArrayBindingPattern(param.name),
      restParameter: !!param.dotDotDotToken,
    }));
  }

  /**
   * Calculates function complexity
   */
  private calculateFunctionComplexity(node: ts.Node): FunctionComplexity {
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(node);
    const cognitiveComplexity = this.calculateCognitiveComplexity(node);
    const linesOfCode = this.calculateLinesOfCode(node);
    const nestingDepth = this.calculateNestingDepth(node);

    let level: "low" | "medium" | "high" | "very-high" = "low";
    const totalScore =
      cyclomaticComplexity + cognitiveComplexity + nestingDepth * 2;

    if (totalScore > 20) level = "very-high";
    else if (totalScore > 15) level = "high";
    else if (totalScore > 10) level = "medium";

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      nestingDepth,
      level,
    };
  }

  /**
   * Calculates cyclomatic complexity
   */
  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    this.visitNode(node, (child) => {
      switch (child.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
        case ts.SyntaxKind.BinaryExpression:
          const binExpr = child as ts.BinaryExpression;
          if (
            binExpr.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken ||
            binExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ) {
            complexity++;
          }
          break;
      }
    });

    return complexity;
  }

  /**
   * Calculates cognitive complexity
   */
  private calculateCognitiveComplexity(node: ts.Node): number {
    let complexity = 0;
    let nestingLevel = 0;

    const visit = (node: ts.Node, level: number) => {
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.SwitchStatement:
          complexity += 1 + level;
          nestingLevel = Math.max(nestingLevel, level + 1);
          ts.forEachChild(node, (child) => visit(child, level + 1));
          return;
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity += 1 + level;
          break;
        case ts.SyntaxKind.BinaryExpression:
          const binExpr = node as ts.BinaryExpression;
          if (
            binExpr.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken ||
            binExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ) {
            complexity += 1;
          }
          break;
      }

      ts.forEachChild(node, (child) => visit(child, level));
    };

    visit(node, 0);
    return complexity;
  }

  /**
   * Calculates lines of code for a function
   */
  private calculateLinesOfCode(node: ts.Node): number {
    const start = this.sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );
    const end = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return end.line - start.line + 1;
  }

  /**
   * Calculates maximum nesting depth
   */
  private calculateNestingDepth(node: ts.Node): number {
    let maxDepth = 0;

    const visit = (node: ts.Node, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);

      const isNestingNode =
        ts.isIfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isSwitchStatement(node) ||
        ts.isTryStatement(node);

      const nextDepth = isNestingNode ? depth + 1 : depth;
      ts.forEachChild(node, (child) => visit(child, nextDepth));
    };

    visit(node, 0);
    return maxDepth;
  }

  /**
   * Identifies usage patterns for a function
   */
  private identifyUsagePatterns(node: ts.Node): UsagePatternType[] {
    const patterns: UsagePatternType[] = [];
    const nodeText = node.getText();

    // Data transformation patterns
    if (
      nodeText.includes(".map(") ||
      nodeText.includes(".filter(") ||
      nodeText.includes(".reduce(") ||
      nodeText.includes(".sort(")
    ) {
      patterns.push("data-transformation");
    }

    // Event handling patterns
    if (
      nodeText.includes("addEventListener") ||
      nodeText.includes("onClick") ||
      nodeText.includes("onChange") ||
      nodeText.includes("onSubmit")
    ) {
      patterns.push("event-handling");
    }

    // State management patterns
    if (
      nodeText.includes("useState") ||
      nodeText.includes("useReducer") ||
      nodeText.includes("setState") ||
      nodeText.includes("dispatch")
    ) {
      patterns.push("state-management");
    }

    // API integration patterns
    if (
      nodeText.includes("fetch(") ||
      nodeText.includes("axios") ||
      nodeText.includes("api.") ||
      nodeText.includes("await ")
    ) {
      patterns.push("api-integration");
    }

    // UI composition patterns
    if (nodeText.includes("return (") && nodeText.includes("<")) {
      patterns.push("ui-composition");
    }

    // Validation patterns
    if (
      nodeText.includes("validate") ||
      nodeText.includes("schema") ||
      nodeText.includes("yup.") ||
      nodeText.includes("joi.")
    ) {
      patterns.push("validation");
    }

    // Error handling patterns
    if (
      nodeText.includes("try") ||
      nodeText.includes("catch") ||
      nodeText.includes("throw") ||
      nodeText.includes("Error(")
    ) {
      patterns.push("error-handling");
    }

    // Performance optimization patterns
    if (
      nodeText.includes("useMemo") ||
      nodeText.includes("useCallback") ||
      nodeText.includes("React.memo") ||
      nodeText.includes("lazy(")
    ) {
      patterns.push("performance-optimization");
    }

    // Business logic patterns
    if (patterns.length === 0 && !nodeText.includes("<")) {
      patterns.push("business-logic");
    }

    // Utility function patterns
    if (nodeText.length < 100 && !patterns.includes("ui-composition")) {
      patterns.push("utility-function");
    }

    return patterns;
  }

  /**
   * Extracts React-specific information
   */
  private extractReactInfo(node: ts.Node): ReactFunctionInfo | undefined {
    const nodeText = node.getText();

    // Check if it's a React component or hook
    const isComponent = isReactComponent(node);
    const isHook = this.isReactHook(node);

    if (!isComponent && !isHook) {
      return undefined;
    }

    const hooksUsed = this.extractHooksUsed(nodeText);
    const jsxComplexity = this.calculateJSXComplexity(nodeText);
    const propTypes = this.extractPropTypes(node);
    const stateUsage = this.extractStateUsage(nodeText);
    const effectUsage = this.extractEffectUsage(nodeText);

    return {
      isComponent,
      isHook,
      hooksUsed,
      jsxComplexity,
      propTypes,
      stateUsage,
      effectUsage,
    };
  }

  /**
   * Checks if function is a React hook
   */
  private isReactHook(node: ts.Node): boolean {
    const name = this.getFunctionName(node);
    return name
      ? name.startsWith("use") && name[3]?.toUpperCase() === name[3]
      : false;
  }

  /**
   * Extracts hooks used in the function
   */
  private extractHooksUsed(nodeText: string): string[] {
    const hookPattern = /\b(use[A-Z]\w*)\s*\(/g;
    const hooks: string[] = [];
    let match;

    while ((match = hookPattern.exec(nodeText)) !== null) {
      if (!hooks.includes(match[1])) {
        hooks.push(match[1]);
      }
    }

    return hooks;
  }

  /**
   * Calculates JSX complexity
   */
  private calculateJSXComplexity(nodeText: string): number {
    const jsxElements = (nodeText.match(/<[A-Z]/g) || []).length;
    const conditionalRendering = (nodeText.match(/\{[^}]*\?[^}]*:/g) || [])
      .length;
    const mapOperations = (nodeText.match(/\.map\(/g) || []).length;

    return jsxElements + conditionalRendering * 2 + mapOperations * 2;
  }

  /**
   * Extracts prop types from function parameters
   */
  private extractPropTypes(node: ts.Node): string[] | undefined {
    if (
      !ts.isFunctionDeclaration(node) &&
      !ts.isFunctionExpression(node) &&
      !ts.isArrowFunction(node)
    ) {
      return undefined;
    }

    if (node.parameters.length === 0) return [];

    const firstParam = node.parameters[0];
    if (firstParam.type) {
      const typeText = firstParam.type.getText();
      // Extract property names from interface/type
      const propPattern = /(\w+)\s*[?:]?\s*:/g;
      const props: string[] = [];
      let match;

      while ((match = propPattern.exec(typeText)) !== null) {
        props.push(match[1]);
      }

      return props;
    }

    return undefined;
  }

  /**
   * Extracts state usage information
   */
  private extractStateUsage(nodeText: string): StateUsageInfo {
    const hasState =
      nodeText.includes("useState") ||
      nodeText.includes("useReducer") ||
      nodeText.includes("useContext");

    const stateVariables: string[] = [];
    const useStatePattern = /const\s*\[([^,\]]+),/g;
    let match;
    while ((match = useStatePattern.exec(nodeText)) !== null) {
      stateVariables.push(match[1].trim());
    }

    const reducers: string[] = [];
    const useReducerPattern =
      /const\s*\[([^,\]]+),\s*([^,\]]+)\]\s*=\s*useReducer/g;
    while ((match = useReducerPattern.exec(nodeText)) !== null) {
      reducers.push(match[1].trim());
    }

    const contextUsage: string[] = [];
    const useContextPattern = /const\s+(\w+)\s*=\s*useContext\(([^)]+)\)/g;
    while ((match = useContextPattern.exec(nodeText)) !== null) {
      contextUsage.push(match[2].trim());
    }

    return {
      hasState,
      stateVariables,
      reducers,
      contextUsage,
    };
  }

  /**
   * Extracts effect usage information
   */
  private extractEffectUsage(nodeText: string): EffectUsageInfo {
    const effects: EffectInfo[] = [];
    const dependencies: string[][] = [];

    // Extract useEffect calls
    const effectPattern =
      /(useEffect|useLayoutEffect|useMemo|useCallback)\s*\(\s*[^,]+,\s*\[([^\]]*)\]/g;
    let match;

    while ((match = effectPattern.exec(nodeText)) !== null) {
      const type = match[1] as
        | "useEffect"
        | "useLayoutEffect"
        | "useMemo"
        | "useCallback";
      const depsString = match[2];
      const deps = depsString
        ? depsString
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d)
        : [];

      // Check for cleanup function
      const effectStart = match.index;
      const effectBlock = this.extractEffectBlock(nodeText, effectStart);
      const hasCleanup =
        (effectBlock.includes("return ") && effectBlock.includes("=>")) ||
        effectBlock.includes("return function");

      effects.push({
        type,
        dependencies: deps,
        hasCleanup,
      });

      dependencies.push(deps);
    }

    const cleanupFunctions = effects.filter((e) => e.hasCleanup).length;

    return {
      effects,
      cleanupFunctions,
      dependencies,
    };
  }

  /**
   * Extracts the effect block content
   */
  private extractEffectBlock(nodeText: string, startIndex: number): string {
    let braceCount = 0;
    let inEffect = false;
    let effectContent = "";

    for (let i = startIndex; i < nodeText.length; i++) {
      const char = nodeText[i];

      if (char === "(" && !inEffect) {
        inEffect = true;
        continue;
      }

      if (inEffect) {
        if (char === "{") braceCount++;
        if (char === "}") braceCount--;

        effectContent += char;

        if (braceCount === 0 && char === "}") {
          break;
        }
      }
    }

    return effectContent;
  }

  /**
   * Extracts side effects from function
   */
  private extractSideEffects(node: ts.Node): SideEffect[] {
    const sideEffects: SideEffect[] = [];
    const nodeText = node.getText();

    // API calls
    if (
      nodeText.includes("fetch(") ||
      nodeText.includes(".get(") ||
      nodeText.includes(".post(")
    ) {
      sideEffects.push({
        type: "api-call",
        description: "Makes HTTP requests",
        location: this.getLocation(node),
      });
    }

    // DOM manipulation
    if (
      nodeText.includes("document.") ||
      nodeText.includes("window.") ||
      nodeText.includes(".getElementById")
    ) {
      sideEffects.push({
        type: "dom-manipulation",
        description: "Directly manipulates DOM",
        location: this.getLocation(node),
      });
    }

    // Storage access
    if (
      nodeText.includes("localStorage") ||
      nodeText.includes("sessionStorage") ||
      nodeText.includes("indexedDB")
    ) {
      sideEffects.push({
        type: "storage",
        description: "Accesses browser storage",
        location: this.getLocation(node),
      });
    }

    // Console operations
    if (nodeText.includes("console.")) {
      sideEffects.push({
        type: "console",
        description: "Logs to console",
        location: this.getLocation(node),
      });
    }

    return sideEffects;
  }

  /**
   * Extracts function dependencies
   */
  private extractFunctionDependencies(node: ts.Node): FunctionDependency[] {
    const dependencies: FunctionDependency[] = [];
    const nodeText = node.getText();

    // Extract function calls
    const functionCallPattern = /(\w+)\s*\(/g;
    let match;
    const builtIns = [
      "console",
      "setTimeout",
      "setInterval",
      "parseInt",
      "parseFloat",
      "JSON",
    ];

    while ((match = functionCallPattern.exec(nodeText)) !== null) {
      const funcName = match[1];
      if (
        !builtIns.includes(funcName) &&
        funcName !== this.getFunctionName(node)
      ) {
        dependencies.push({
          name: funcName,
          type: "function-call",
        });
      }
    }

    return dependencies;
  }

  /**
   * Extracts function calls for call graph
   */
  private extractFunctionCalls(
    functions: FunctionDefinition[],
    callGraph: FunctionCall[]
  ): void {
    functions.forEach((func) => {
      func.dependencies.forEach((dep) => {
        if (dep.type === "function-call") {
          callGraph.push({
            caller: func.name,
            callee: dep.name,
            location: func.location,
            isConditional: this.isConditionalCall(func, dep.name),
            isInLoop: this.isInLoop(func, dep.name),
          });
        }
      });
    });
  }

  /**
   * Calculates overall complexity metrics
   */
  private calculateComplexityMetrics(
    functions: FunctionDefinition[]
  ): FunctionComplexityMetrics {
    const totalFunctions = functions.length;
    const complexities = functions.map(
      (f) => f.complexity.cyclomaticComplexity
    );
    const averageComplexity =
      complexities.length > 0
        ? complexities.reduce((a, b) => a + b, 0) / complexities.length
        : 0;
    const highComplexityCount = functions.filter(
      (f) => f.complexity.level === "high" || f.complexity.level === "very-high"
    ).length;
    const maxNestingDepth = Math.max(
      ...functions.map((f) => f.complexity.nestingDepth),
      0
    );
    const totalLinesOfCode = functions.reduce(
      (total, f) => total + f.complexity.linesOfCode,
      0
    );

    return {
      totalFunctions,
      averageComplexity,
      highComplexityCount,
      maxNestingDepth,
      totalLinesOfCode,
    };
  }

  /**
   * Analyzes patterns across all functions
   */
  private analyzePatterns(functions: FunctionDefinition[]): PatternAnalysis {
    const allPatterns = functions.flatMap((f) => f.patterns);
    const reactFunctions = functions.filter((f) => f.reactSpecific);

    const functionalPatterns = [
      ...new Set(
        allPatterns.filter((p) =>
          [
            "data-transformation",
            "utility-function",
            "business-logic",
          ].includes(p)
        )
      ),
    ];

    const reactPatterns = [
      ...new Set(
        reactFunctions.flatMap((f) =>
          identifyReactPatterns(this.sourceFile, this.content)
        )
      ),
    ];

    const asyncPatterns =
      functions.filter((f) => f.async).length > 0 ? ["async-await"] : [];

    const errorHandlingPatterns = allPatterns.includes("error-handling")
      ? ["try-catch"]
      : [];

    return {
      functionalPatterns,
      reactPatterns,
      asyncPatterns,
      errorHandlingPatterns,
    };
  }

  /**
   * Helper methods
   */
  private isFunctionNode(node: ts.Node): boolean {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    );
  }

  private getFunctionName(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node)) {
      return node.name?.text || "anonymous";
    }
    if (
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      return node.name?.getText() || "anonymous";
    }
    if (ts.isConstructorDeclaration(node)) {
      return "constructor";
    }
    return "anonymous";
  }

  private getFunctionKind(node: ts.Node): FunctionKind {
    if (ts.isFunctionDeclaration(node)) return "function-declaration";
    if (ts.isFunctionExpression(node)) return "function-expression";
    if (ts.isArrowFunction(node)) return "arrow-function";
    if (ts.isMethodDeclaration(node)) return "method";
    if (ts.isConstructorDeclaration(node)) return "constructor";
    if (ts.isGetAccessorDeclaration(node)) return "getter";
    if (ts.isSetAccessorDeclaration(node)) return "setter";
    return "function-declaration";
  }

  private extractGenerics(
    typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>
  ): string[] {
    if (!typeParameters) return [];
    return typeParameters.map((tp) => tp.name.text);
  }

  private isAsyncFunction(node: ts.Node): boolean {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      return !!node.modifiers?.some(
        (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
      );
    }
    return false;
  }

  private isPureFunction(node: ts.Node): boolean {
    // Simple heuristic: no side effects detected
    return this.extractSideEffects(node).length === 0;
  }

  private hasExportModifier(node: ts.Node): boolean {
    return ts.getCombinedModifierFlags(node as any) & ts.ModifierFlags.Export
      ? true
      : false;
  }

  private getLocation(node: ts.Node): CodeLocation {
    const start = this.sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );
    const end = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      startLine: start.line + 1,
      endLine: end.line + 1,
      startColumn: start.character,
      endColumn: end.character,
    };
  }

  private extractJSDocComment(node: ts.Node): string | undefined {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(
      fullText,
      node.getFullStart()
    );

    if (commentRanges && commentRanges.length > 0) {
      const lastComment = commentRanges[commentRanges.length - 1];
      const commentText = fullText.substring(lastComment.pos, lastComment.end);

      if (commentText.startsWith("/**")) {
        return commentText
          .replace(/\/\*\*|\*\/|\* ?/g, "")
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join(" ");
      }
    }

    return undefined;
  }

  private visitNode(node: ts.Node, callback: (node: ts.Node) => void): void {
    callback(node);
    ts.forEachChild(node, (child) => this.visitNode(child, callback));
  }

  private isConditionalCall(func: FunctionDefinition, callee: string): boolean {
    // Simple heuristic: check if function contains conditional statements
    return func.complexity.cyclomaticComplexity > 1;
  }

  private isInLoop(func: FunctionDefinition, callee: string): boolean {
    // Simple heuristic: check if function contains loops
    const nodeText = this.content.substring(
      this.sourceFile.getPositionOfLineAndCharacter(
        func.location.startLine - 1,
        0
      ),
      this.sourceFile.getPositionOfLineAndCharacter(
        func.location.endLine - 1,
        func.location.endColumn
      )
    );

    return (
      nodeText.includes("for(") ||
      nodeText.includes("while(") ||
      nodeText.includes(".map(") ||
      nodeText.includes(".forEach(")
    );
  }
}
