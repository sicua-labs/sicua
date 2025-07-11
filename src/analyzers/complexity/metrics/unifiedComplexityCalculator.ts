import ts from "typescript";
import { ScanResult, ComponentRelation, PropSignature } from "../../../types";
import { isReactComponent } from "../../../utils/ast/reactSpecific";
import { generateComponentId } from "../../../utils/common/analysisUtils";
import { countLines } from "../../general/utils/lineCounter";
import { HalsteadMetrics } from "../types/complexity.types";
import path from "path";
import { ComponentFilter } from "../../seo/utils/ComponentFilter";

export interface ComponentComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  componentComplexity: number;
  couplingDegree: number;
}

export interface ComplexityCalculationResult {
  componentComplexity: { [key: string]: number };
  couplingDegree: { [key: string]: number };
  cyclomaticComplexity: { [key: string]: number };
  maintainabilityIndex: { [key: string]: number };
  cognitiveComplexity: { [key: string]: number };
}

/**
 * Unified complexity calculator that processes each file once and calculates all metrics
 * Uses existing parsed source files and optimized lookup services
 */
export class UnifiedComplexityCalculator {
  private scanResult: ScanResult;

  constructor(scanResult: ScanResult) {
    this.scanResult = scanResult;
  }

  /**
   * Calculate all complexity metrics in a single pass with component filtering
   */
  calculateAllMetrics(
    components: ComponentRelation[]
  ): ComplexityCalculationResult {
    // Filter to only include actual React components
    const actualComponents = ComponentFilter.filterComponents(components);

    const result: ComplexityCalculationResult = {
      componentComplexity: {},
      couplingDegree: {},
      cyclomaticComplexity: {},
      maintainabilityIndex: {},
      cognitiveComplexity: {},
    };

    // Calculate component-level metrics (no AST traversal needed)
    this.calculateComponentComplexity(
      actualComponents,
      result.componentComplexity
    );
    this.calculateCouplingDegree(actualComponents, result.couplingDegree);

    // Group components by file path for efficient AST-based processing
    const componentsByFile = this.groupComponentsByFile(actualComponents);

    // Process each file once, calculating all AST-based metrics
    for (const [filePath, fileComponents] of componentsByFile) {
      this.processFileMetrics(filePath, fileComponents, result);
    }

    return result;
  }

  // Rest of the methods remain the same but work with filtered components
  private groupComponentsByFile(
    components: ComponentRelation[]
  ): Map<string, ComponentRelation[]> {
    const componentsByFile = new Map<string, ComponentRelation[]>();

    for (const component of components) {
      if (!componentsByFile.has(component.fullPath)) {
        componentsByFile.set(component.fullPath, []);
      }
      componentsByFile.get(component.fullPath)!.push(component);
    }

    return componentsByFile;
  }

  /**
   * Process all AST-based metrics for a single file
   */
  private processFileMetrics(
    filePath: string,
    fileComponents: ComponentRelation[],
    result: ComplexityCalculationResult
  ): void {
    // Use existing parsed source file from scan result
    const sourceFile = this.scanResult.sourceFiles.get(filePath);
    if (!sourceFile) {
      // Fallback values for components without source files
      for (const component of fileComponents) {
        const componentId = generateComponentId(component);
        result.cyclomaticComplexity[componentId] = 1;
        result.cognitiveComplexity[componentId] = 0;
        result.maintainabilityIndex[componentId] = 50;
      }
      return;
    }

    // Find all component nodes in the file in a single traversal
    const componentNodes = this.findComponentNodes(sourceFile, fileComponents);

    // Calculate metrics for each component
    for (const component of fileComponents) {
      const componentId = generateComponentId(component);
      const componentNode = componentNodes.get(component.name);

      if (componentNode) {
        const metrics = this.calculateNodeMetrics(componentNode, component);
        result.cyclomaticComplexity[componentId] = metrics.cyclomaticComplexity;
        result.cognitiveComplexity[componentId] = metrics.cognitiveComplexity;
        result.maintainabilityIndex[componentId] = metrics.maintainabilityIndex;
      } else {
        // Fallback values
        result.cyclomaticComplexity[componentId] = 1;
        result.cognitiveComplexity[componentId] = 0;
        result.maintainabilityIndex[componentId] = 50;
      }
    }
  }

  /**
   * Find component nodes in source file (single traversal)
   */
  private findComponentNodes(
    sourceFile: ts.SourceFile,
    components: ComponentRelation[]
  ): Map<string, ts.Node> {
    const componentNodes = new Map<string, ts.Node>();
    const componentNames = new Set(components.map((c) => c.name));

    const visit = (node: ts.Node): void => {
      // Check for function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const functionName = node.name.text;
        if (componentNames.has(functionName) && isReactComponent(node)) {
          componentNodes.set(functionName, node);
        }
      }

      // Check for variable declarations (const ComponentName = ...)
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const varName = node.name.text;
        if (componentNames.has(varName) && node.initializer) {
          if (
            (ts.isArrowFunction(node.initializer) ||
              ts.isFunctionExpression(node.initializer)) &&
            isReactComponent(node.initializer)
          ) {
            componentNodes.set(varName, node.initializer);
          }
        }
      }

      // Check for exported function declarations
      if (
        ts.isExportAssignment(node) &&
        ts.isFunctionDeclaration(node.expression)
      ) {
        const func = node.expression;
        if (
          func.name &&
          componentNames.has(func.name.text) &&
          isReactComponent(func)
        ) {
          componentNodes.set(func.name.text, func);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return componentNodes;
  }

  /**
   * Calculate all metrics for a single component node
   */
  private calculateNodeMetrics(
    node: ts.Node,
    component: ComponentRelation
  ): ComponentComplexityMetrics {
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(node);
    const cognitiveComplexity = this.calculateCognitiveComplexity(node);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      node,
      component,
      cyclomaticComplexity
    );

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      maintainabilityIndex,
      componentComplexity: 0, // Calculated separately
      couplingDegree: 0, // Calculated separately
    };
  }

  /**
   * Calculate cyclomatic complexity for a node
   */
  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const incrementComplexity = (currentNode: ts.Node): void => {
      switch (currentNode.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
          complexity++;
          break;

        case ts.SyntaxKind.BinaryExpression:
          const binaryExpr = currentNode as ts.BinaryExpression;
          if (
            binaryExpr.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken ||
            binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ) {
            complexity++;
          }
          break;

        case ts.SyntaxKind.QuestionDotToken:
        case ts.SyntaxKind.QuestionQuestionToken:
          complexity++;
          break;

        case ts.SyntaxKind.JsxExpression:
          const jsxExpression = currentNode as ts.JsxExpression;
          if (jsxExpression.expression) {
            if (
              ts.isBinaryExpression(jsxExpression.expression) &&
              jsxExpression.expression.operatorToken.kind ===
                ts.SyntaxKind.AmpersandAmpersandToken
            ) {
              complexity++;
            } else if (ts.isConditionalExpression(jsxExpression.expression)) {
              complexity++;
            }
          }
          break;

        case ts.SyntaxKind.FunctionExpression:
        case ts.SyntaxKind.ArrowFunction:
        case ts.SyntaxKind.FunctionDeclaration:
        case ts.SyntaxKind.MethodDeclaration:
          if (currentNode !== node) {
            return; // Don't traverse nested functions
          }
          break;
      }

      ts.forEachChild(currentNode, incrementComplexity);
    };

    ts.forEachChild(node, incrementComplexity);
    return complexity;
  }

  /**
   * Calculate cognitive complexity for a node
   */
  private calculateCognitiveComplexity(node: ts.Node): number {
    let totalComplexity = 0;

    const calculateComplexity = (
      currentNode: ts.Node,
      nestingLevel: number = 0
    ): number => {
      let nodeComplexity = 0;

      switch (currentNode.kind) {
        case ts.SyntaxKind.IfStatement:
          nodeComplexity += 1 + nestingLevel;
          const ifStatement = currentNode as ts.IfStatement;
          nodeComplexity += calculateComplexity(
            ifStatement.expression,
            nestingLevel
          );
          nodeComplexity += calculateComplexity(
            ifStatement.thenStatement,
            nestingLevel + 1
          );
          if (ifStatement.elseStatement) {
            if (ts.isIfStatement(ifStatement.elseStatement)) {
              nodeComplexity += calculateComplexity(
                ifStatement.elseStatement,
                nestingLevel
              );
            } else {
              nodeComplexity += calculateComplexity(
                ifStatement.elseStatement,
                nestingLevel + 1
              );
            }
          }
          break;

        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
          nodeComplexity += 1 + nestingLevel;
          ts.forEachChild(currentNode, (child) => {
            nodeComplexity += calculateComplexity(child, nestingLevel + 1);
          });
          break;

        case ts.SyntaxKind.SwitchStatement:
          nodeComplexity += 1 + nestingLevel;
          const switchStatement = currentNode as ts.SwitchStatement;
          nodeComplexity += calculateComplexity(
            switchStatement.expression,
            nestingLevel
          );
          switchStatement.caseBlock.clauses.forEach((clause) => {
            if (ts.isCaseClause(clause)) {
              nodeComplexity += 1 + nestingLevel;
            }
            clause.statements.forEach((statement) => {
              nodeComplexity += calculateComplexity(
                statement,
                nestingLevel + 1
              );
            });
          });
          break;

        case ts.SyntaxKind.TryStatement:
          const tryStatement = currentNode as ts.TryStatement;
          nodeComplexity += calculateComplexity(
            tryStatement.tryBlock,
            nestingLevel
          );
          if (tryStatement.catchClause) {
            nodeComplexity += 1 + nestingLevel;
            nodeComplexity += calculateComplexity(
              tryStatement.catchClause.block,
              nestingLevel + 1
            );
          }
          if (tryStatement.finallyBlock) {
            nodeComplexity += calculateComplexity(
              tryStatement.finallyBlock,
              nestingLevel
            );
          }
          break;

        case ts.SyntaxKind.ConditionalExpression:
          nodeComplexity += 1 + nestingLevel;
          const conditionalExpression = currentNode as ts.ConditionalExpression;
          nodeComplexity += calculateComplexity(
            conditionalExpression.condition,
            nestingLevel
          );
          nodeComplexity += calculateComplexity(
            conditionalExpression.whenTrue,
            nestingLevel + 1
          );
          nodeComplexity += calculateComplexity(
            conditionalExpression.whenFalse,
            nestingLevel + 1
          );
          break;

        case ts.SyntaxKind.BinaryExpression:
          const binaryExpression = currentNode as ts.BinaryExpression;
          if (
            binaryExpression.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken ||
            binaryExpression.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ) {
            nodeComplexity += 1 + nestingLevel;
          }
          nodeComplexity += calculateComplexity(
            binaryExpression.left,
            nestingLevel
          );
          nodeComplexity += calculateComplexity(
            binaryExpression.right,
            nestingLevel
          );
          break;

        case ts.SyntaxKind.FunctionExpression:
        case ts.SyntaxKind.ArrowFunction:
          ts.forEachChild(currentNode, (child) => {
            nodeComplexity += calculateComplexity(child, 0);
          });
          break;

        case ts.SyntaxKind.FunctionDeclaration:
        case ts.SyntaxKind.MethodDeclaration:
          if (currentNode !== node) {
            ts.forEachChild(currentNode, (child) => {
              nodeComplexity += calculateComplexity(child, 0);
            });
          } else {
            ts.forEachChild(currentNode, (child) => {
              nodeComplexity += calculateComplexity(child, nestingLevel);
            });
          }
          break;

        case ts.SyntaxKind.JsxExpression:
          const jsxExpression = currentNode as ts.JsxExpression;
          if (jsxExpression.expression) {
            if (
              ts.isBinaryExpression(jsxExpression.expression) &&
              jsxExpression.expression.operatorToken.kind ===
                ts.SyntaxKind.AmpersandAmpersandToken
            ) {
              nodeComplexity += 1 + nestingLevel;
            } else if (ts.isConditionalExpression(jsxExpression.expression)) {
              nodeComplexity += 1 + nestingLevel;
            }
            nodeComplexity += calculateComplexity(
              jsxExpression.expression,
              nestingLevel
            );
          }
          break;

        case ts.SyntaxKind.QuestionQuestionToken:
          nodeComplexity += 1;
          ts.forEachChild(currentNode, (child) => {
            nodeComplexity += calculateComplexity(child, nestingLevel);
          });
          break;

        default:
          ts.forEachChild(currentNode, (child) => {
            nodeComplexity += calculateComplexity(child, nestingLevel);
          });
      }

      return nodeComplexity;
    };

    totalComplexity = calculateComplexity(node);
    return totalComplexity;
  }

  /**
   * Calculate maintainability index using the Microsoft normalized formula:
   * MI = MAX(0, (171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)) * 100 / 171)
   * Range: 0-100 where higher is better
   */
  private calculateMaintainabilityIndex(
    node: ts.Node,
    component: ComponentRelation,
    cyclomaticComplexity: number
  ): number {
    const halsteadMetrics = this.calculateHalsteadMetrics(node);
    const componentText = node.getFullText();
    const linesOfCode = countLines(componentText).codeLines;

    // Calculate Halstead Volume
    const vocabularySize = halsteadMetrics.n1 + halsteadMetrics.n2;
    const programLength = halsteadMetrics.N1 + halsteadMetrics.N2;
    let halsteadVolume = 1; // Default to 1 to avoid log(0)

    if (vocabularySize > 0 && programLength > 0) {
      halsteadVolume = programLength * Math.log2(vocabularySize);
    }

    // Ensure we have positive values for logarithms
    const safeHalsteadVolume = Math.max(halsteadVolume, 1);
    const safeLinesOfCode = Math.max(linesOfCode, 1);

    // Apply the Microsoft maintainability index formula
    const rawMaintainabilityIndex =
      171 -
      5.2 * Math.log(safeHalsteadVolume) -
      0.23 * cyclomaticComplexity -
      16.2 * Math.log(safeLinesOfCode);

    // Normalize to 0-100 range as per Microsoft's specification
    const normalizedIndex = Math.max(0, (rawMaintainabilityIndex * 100) / 171);

    // Apply maintainability adjustments based on component characteristics
    const adjustedIndex = this.applyMaintainabilityAdjustments(
      normalizedIndex,
      halsteadMetrics,
      component
    );

    return Math.round(adjustedIndex * 100) / 100;
  }

  /**
   * Apply maintainability adjustments based on component characteristics
   * Adjustments are applied to the normalized 0-100 scale
   */
  private applyMaintainabilityAdjustments(
    baseIndex: number,
    halsteadMetrics: HalsteadMetrics,
    component: ComponentRelation
  ): number {
    let adjustedIndex = baseIndex;

    // Code repetition penalty (adjusted for 0-100 scale)
    const totalElements = halsteadMetrics.N1 + halsteadMetrics.N2;
    const vocabularySize = halsteadMetrics.n1 + halsteadMetrics.n2;

    if (vocabularySize > 0) {
      const repetitionRatio = totalElements / vocabularySize;
      if (repetitionRatio > 10) {
        // Reduce by up to 15 points for high repetition
        adjustedIndex -= Math.min((repetitionRatio - 10) * 1.5, 15);
      }
    }

    // Component complexity factors (adjusted for 0-100 scale)
    if (component.functions && component.functions.length > 20) {
      // Reduce by up to 10 points for too many functions
      adjustedIndex -= Math.min((component.functions.length - 20) * 0.5, 10);
    }

    // High coupling penalty (adjusted for 0-100 scale)
    const totalConnections = component.imports.length + component.usedBy.length;
    if (totalConnections > 15) {
      // Reduce by up to 8 points for high coupling
      adjustedIndex -= Math.min((totalConnections - 15) * 0.4, 8);
    }

    // Ensure we stay within 0-100 bounds
    return Math.max(0, Math.min(100, adjustedIndex));
  }

  /**
   * Calculate Halstead metrics for a node
   */
  private calculateHalsteadMetrics(node: ts.Node): HalsteadMetrics {
    const operators = new Set<string>();
    const operands = new Set<string>();
    let totalOperators = 0;
    let totalOperands = 0;

    const visitor = (node: ts.Node) => {
      switch (node.kind) {
        case ts.SyntaxKind.BinaryExpression:
          const binaryExpr = node as ts.BinaryExpression;
          operators.add(binaryExpr.operatorToken.getText());
          totalOperators++;
          break;

        case ts.SyntaxKind.PrefixUnaryExpression:
        case ts.SyntaxKind.PostfixUnaryExpression:
          const unaryExpr = node as
            | ts.PrefixUnaryExpression
            | ts.PostfixUnaryExpression;
          operators.add(
            ts.tokenToString(unaryExpr.operator) ||
              unaryExpr.operator.toString()
          );
          totalOperators++;
          break;

        case ts.SyntaxKind.CallExpression:
          const callExpr = node as ts.CallExpression;
          if (ts.isIdentifier(callExpr.expression)) {
            operators.add(callExpr.expression.text);
            totalOperators++;
          } else if (ts.isPropertyAccessExpression(callExpr.expression)) {
            operators.add(callExpr.expression.name.text);
            totalOperators++;
          }
          break;

        case ts.SyntaxKind.Identifier:
          const identifier = node as ts.Identifier;
          const parent = identifier.parent;
          if (!ts.isVariableDeclaration(parent) || parent.name !== identifier) {
            operands.add(identifier.text);
            totalOperands++;
          }
          break;

        case ts.SyntaxKind.StringLiteral:
        case ts.SyntaxKind.NumericLiteral:
        case ts.SyntaxKind.TrueKeyword:
        case ts.SyntaxKind.FalseKeyword:
        case ts.SyntaxKind.NullKeyword:
        case ts.SyntaxKind.UndefinedKeyword:
          operands.add(node.getText());
          totalOperands++;
          break;
      }

      ts.forEachChild(node, visitor);
    };

    visitor(node);

    return {
      n1: operators.size,
      n2: operands.size,
      N1: totalOperators,
      N2: totalOperands,
    };
  }

  /**
   * Compute maintainability index using standard formula
   */
  private computeMaintainabilityIndex(
    halsteadVolume: number,
    cyclomaticComplexity: number,
    linesOfCode: number
  ): number {
    if (linesOfCode === 0) return 100;
    if (halsteadVolume <= 0) halsteadVolume = 1;
    if (cyclomaticComplexity <= 0) cyclomaticComplexity = 1;

    let maintainabilityIndex =
      171 -
      5.2 * Math.log(halsteadVolume) -
      0.23 * cyclomaticComplexity -
      16.2 * Math.log(linesOfCode);

    maintainabilityIndex = (maintainabilityIndex * 100) / 171;
    return Math.max(
      0,
      Math.min(100, Math.round(maintainabilityIndex * 100) / 100)
    );
  }

  /**
   * Calculate component complexity (non-AST based)
   */
  private calculateComponentComplexity(
    components: ComponentRelation[],
    result: { [key: string]: number }
  ): void {
    for (const component of components) {
      let componentComplexity = 0;

      componentComplexity += component.imports.length + component.usedBy.length;
      componentComplexity += component.exports.length * 0.5;

      if (component.functions) {
        componentComplexity += component.functions.length * 1.5;
      }

      if (component.functionCalls) {
        const totalFunctionCalls = Object.values(
          component.functionCalls
        ).reduce((sum, calls) => sum + calls.length, 0);
        componentComplexity += totalFunctionCalls * 0.3;
      }

      if (component.props) {
        const requiredPropsComplexity =
          component.props.filter((prop) => prop.required).length * 1.2;
        const optionalPropsComplexity =
          component.props.filter((prop) => !prop.required).length * 0.8;
        componentComplexity +=
          requiredPropsComplexity + optionalPropsComplexity;
      }

      if (component.usedBy.length > 5) {
        componentComplexity *= 1 + (component.usedBy.length - 5) * 0.1;
      }

      const componentId = generateComponentId(component);
      result[componentId] = Math.round(componentComplexity * 10) / 10;
    }
  }

  /**
   * Calculate coupling degree with proper normalization
   */
  /**
   * Calculate coupling degree using the proper software engineering formula:
   * C = 1 - 1/(di + 2×ci + do + 2×co + gd + 2×gc + w + r)
   * Range: ~0.67 (low coupling) to 1.0 (highly coupled)
   */
  private calculateCouplingDegree(
    components: ComponentRelation[],
    result: { [key: string]: number }
  ): void {
    // Create a map for efficient lookups
    const componentMap = new Map<string, ComponentRelation>();
    components.forEach((comp) => {
      componentMap.set(comp.name, comp);
    });

    for (const component of components) {
      const componentId = generateComponentId(component);

      // Fan-in: number of modules calling this module
      const r = component.usedBy.length;

      // Fan-out: number of modules this module calls (only count actual components)
      const w = component.imports.filter((imp) => {
        const importName = path.basename(imp, path.extname(imp));
        return componentMap.has(importName);
      }).length;

      // Input parameters analysis from props
      let di = 0; // input data parameters
      let ci = 0; // input control parameters

      if (component.props) {
        for (const prop of component.props) {
          if (this.isControlParameter(prop)) {
            ci++;
          } else {
            di++;
          }
        }
      }

      // Output parameters analysis from exports
      let do_param = 0; // output data parameters
      let co = 0; // output control parameters

      if (component.exports) {
        for (const exportName of component.exports) {
          if (this.isControlExport(exportName, component)) {
            co++;
          } else {
            do_param++;
          }
        }
      }

      // Global coupling analysis
      const globalAnalysis = this.analyzeGlobalCoupling(component);
      const gd = globalAnalysis.dataGlobals; // global variables used as data
      const gc = globalAnalysis.controlGlobals; // global variables used as control

      // Apply the coupling formula
      const denominator = di + 2 * ci + do_param + 2 * co + gd + 2 * gc + w + r;

      let coupling = 0;
      if (denominator > 0) {
        coupling = 1 - 1 / denominator;
      }

      // Ensure minimum coupling value (components with very few connections)
      coupling = Math.max(coupling, 0);

      result[componentId] = Math.round(coupling * 100) / 100;
    }
  }

  /**
   * Determine if a prop is a control parameter (callback, handler, function)
   */
  private isControlParameter(prop: PropSignature): boolean {
    const controlPatterns = [
      /^on[A-Z]/, // onClick, onSubmit, etc.
      /^handle[A-Z]/, // handleClick, handleSubmit, etc.
      /Handler$/, // clickHandler, submitHandler, etc.
      /Callback$/, // onCallback, submitCallback, etc.
      /Function$/, // renderFunction, etc.
    ];

    const isControlName = controlPatterns.some((pattern) =>
      pattern.test(prop.name)
    );
    const isControlType =
      prop.type.includes("function") ||
      prop.type.includes("=>") ||
      prop.type.includes("()") ||
      prop.type.includes("Function");

    return isControlName || isControlType;
  }

  /**
   * Determine if an export is a control export (function, handler)
   */
  private isControlExport(
    exportName: string,
    component: ComponentRelation
  ): boolean {
    const controlPatterns = [
      /^handle[A-Z]/, // handleClick, handleSubmit, etc.
      /^on[A-Z]/, // onClick, onSubmit, etc.
      /Handler$/, // clickHandler, submitHandler, etc.
      /Function$/, // renderFunction, etc.
      /^use[A-Z]/, // custom hooks
    ];

    const isControlName = controlPatterns.some((pattern) =>
      pattern.test(exportName)
    );

    // Check if it's in the functions array (indicating it's a function export)
    const isFunction = component.functions?.includes(exportName) || false;

    return isControlName || isFunction;
  }

  /**
   * Analyze global coupling by examining content for global variable usage
   */
  private analyzeGlobalCoupling(component: ComponentRelation): {
    dataGlobals: number;
    controlGlobals: number;
  } {
    if (!component.content) {
      return { dataGlobals: 0, controlGlobals: 0 };
    }

    let dataGlobals = 0;
    let controlGlobals = 0;

    // Global data patterns
    const globalDataPatterns = [
      /process\.env\./g, // environment variables
      /window\./g, // window object access
      /document\./g, // document object access
      /localStorage\./g, // localStorage access
      /sessionStorage\./g, // sessionStorage access
      /global\./g, // explicit global access
    ];

    // Global control patterns
    const globalControlPatterns = [
      /window\.location/g, // navigation control
      /history\./g, // history manipulation
      /router\./g, // router control
      /dispatch\(/g, // state dispatch
      /\.push\(/g, // navigation push
      /\.replace\(/g, // navigation replace
    ];

    // Count global data usage
    globalDataPatterns.forEach((pattern) => {
      const matches = component.content!.match(pattern);
      if (matches) {
        dataGlobals += matches.length;
      }
    });

    // Count global control usage
    globalControlPatterns.forEach((pattern) => {
      const matches = component.content!.match(pattern);
      if (matches) {
        controlGlobals += matches.length;
      }
    });

    return { dataGlobals, controlGlobals };
  }
}
