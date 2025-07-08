import ts from "typescript";
import {
  BusinessLogicContext,
  BusinessOperation,
  DataFlowPattern,
  SideEffect,
} from "../types";
import { ImportExtractor } from "./ImportExtractor";
import { FunctionExtractor } from "./FunctionExtractor";
import { ComponentExtractor } from "./ComponentExtractor";
import { TypeExtractor } from "./TypeExtractor";
import {
  BusinessLogicDefinition,
  BusinessComplexity,
  BusinessPatterns,
  BusinessQuality,
  BusinessDependencies,
  BusinessRule,
  WorkflowDefinition,
  ValidationDefinition,
  DataTransformation,
  TransformationType,
  ComplexityFactor,
  ArchitecturalPattern,
  DomainPattern,
  DataPattern,
  IntegrationPattern,
  BusinessAntiPattern,
  QualityIssue,
  ExternalService,
  DatabaseDependency,
  ApiDependency,
  LibraryDependency,
  ConfigurationDependency,
  ResourceDependency,
  ServiceType,
  DatabaseOperation,
  DatabasePerformance,
  HttpMethod,
  AuthenticationType,
  ApiErrorHandling,
  LibraryPurpose,
  SecurityInfo,
  MaintenanceInfo,
  Alternative,
  ResourceOptimization,
  WorkflowStep,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowOutcome,
  ErrorHandlingStrategy,
  ValidationRule,
  ValidationMessage,
  CustomValidator,
  DataStructure,
  TransformationPerformance,
  TransformationValidation,
} from "../types/businessLogicExtractor.types";
import { FunctionDefinition } from "../types/functionExtractor.types";

export class BusinessLogicExtractor {
  private sourceFile: ts.SourceFile;
  private content: string;
  private filePath: string;
  private importExtractor: ImportExtractor;
  private functionExtractor: FunctionExtractor;
  private componentExtractor: ComponentExtractor;
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
    this.componentExtractor = new ComponentExtractor(
      sourceFile,
      content,
      filePath,
      srcDir,
      typeChecker
    );
    this.typeExtractor = new TypeExtractor(typeChecker);
  }

  /**
   * Extracts business logic context from the source file
   */
  extractBusinessLogicContext(): BusinessLogicContext {
    const domain = this.identifyDomain();
    const operations = this.extractBusinessOperations();
    const dataFlow = this.extractDataFlowPatterns();
    const sideEffects = this.extractSideEffects();

    return {
      domain,
      operations,
      dataFlow,
      sideEffects,
    };
  }

  /**
   * Extracts complete business logic definition
   */
  extractBusinessLogicDefinition(): BusinessLogicDefinition {
    const functionContext = this.functionExtractor.extractFunctionContext();
    const componentContext = this.componentExtractor.extractComponentContext();
    const typeContext = this.typeExtractor.extractTypeContext(this.sourceFile);
    const dependencyContext = this.importExtractor.extractDependencies(
      this.sourceFile,
      this.filePath
    );

    const domain = this.identifyDomain();
    const operations = this.extractBusinessOperations();
    const dataFlow = this.extractDataFlowPatterns();
    const sideEffects = this.extractSideEffects();
    const complexity = this.calculateBusinessComplexity(
      functionContext,
      operations,
      dataFlow
    );
    const patterns = this.analyzeBusinessPatterns(
      functionContext,
      componentContext,
      operations
    );
    const quality = this.assessBusinessQuality(
      operations,
      complexity,
      patterns
    );
    const dependencies = this.extractBusinessDependencies(dependencyContext);
    const rules = this.extractBusinessRules();
    const workflows = this.extractWorkflows();
    const validations = this.extractValidations();
    const transformations = this.extractDataTransformations();

    return {
      domain,
      operations,
      dataFlow,
      sideEffects,
      complexity,
      patterns,
      quality,
      dependencies,
      rules,
      workflows,
      validations,
      transformations,
    };
  }

  /**
   * **FIXED: Enhanced domain identification with better logic and priority**
   * Identifies the business domain based on file content and structure
   */
  private identifyDomain(): string {
    const fileName = this.filePath.toLowerCase();
    const content = this.content.toLowerCase();

    // **PRIORITY 1: File path and name analysis (most reliable)**
    const pathSegments = this.filePath.toLowerCase().split(/[/\\]/);

    // Check directory structure for domain hints
    for (const segment of pathSegments) {
      if (segment === "auth" || segment === "authentication") return "auth";
      if (segment === "payment" || segment === "billing") return "payment";
      if (segment === "report" || segment === "reports")
        return "report-management";
      if (segment === "diagram" || segment === "diagrams")
        return "diagram-analysis";
      if (segment === "analytics" || segment === "analysis") return "analytics";
      if (segment === "project" || segment === "projects")
        return "project-management";
      if (segment === "file" || segment === "files") return "file-management";
      if (segment === "user" || segment === "users") return "user-management";
      if (segment === "notification" || segment === "notifications")
        return "communication";
    }

    // **PRIORITY 2: Filename analysis with weighted scoring**
    const fileNameBase = fileName.replace(/\.(tsx?|jsx?)$/, "");

    // Domain patterns with confidence scores
    const domainPatterns = {
      "diagram-analysis": {
        keywords: ["diagram", "chart", "graph", "visual", "viewer", "analysis"],
        weight: 3,
      },
      "report-management": {
        keywords: [
          "report",
          "analytics",
          "metrics",
          "data",
          "score",
          "breakdown",
        ],
        weight: 3,
      },
      "project-management": {
        keywords: ["project", "slot", "workspace", "portfolio"],
        weight: 3,
      },
      "file-management": {
        keywords: ["upload", "download", "file", "storage", "document"],
        weight: 3,
      },
      auth: {
        keywords: ["auth", "login", "signup", "user", "account", "session"],
        weight: 2, // Lower weight unless very specific
      },
      payment: {
        keywords: [
          "payment",
          "billing",
          "invoice",
          "checkout",
          "order",
          "stripe",
          "paypal",
        ],
        weight: 3,
      },
      inventory: {
        keywords: ["inventory", "product", "catalog", "stock", "item"],
        weight: 3,
      },
      communication: {
        keywords: ["notification", "email", "message", "chat", "alert"],
        weight: 2,
      },
      workflow: {
        keywords: ["workflow", "process", "step", "approval", "pipeline"],
        weight: 2,
      },
      configuration: {
        keywords: ["config", "setting", "preference", "option", "setup"],
        weight: 2,
      },
      search: {
        keywords: ["search", "filter", "query", "index", "find"],
        weight: 2,
      },
    };

    // **PRIORITY 3: Content analysis with context**
    const domainScores: { [domain: string]: number } = {};

    for (const [domain, config] of Object.entries(domainPatterns)) {
      let score = 0;

      // Filename matches
      for (const keyword of config.keywords) {
        if (fileNameBase.includes(keyword)) {
          score += config.weight * 2; // Filename matches are strong indicators
        }
      }

      // Content matches (but with context)
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        const matches = content.match(regex);
        if (matches) {
          // Weight by frequency but cap to avoid false positives
          score += Math.min(
            matches.length * config.weight * 0.5,
            config.weight * 3
          );
        }
      }

      domainScores[domain] = score;
    }

    // **PRIORITY 4: Context-aware analysis**
    // Look for specific patterns that indicate domain

    // For DiagramViewer specifically - look for component orchestration patterns
    if (
      fileNameBase.includes("viewer") ||
      fileNameBase.includes("controller")
    ) {
      if (
        content.includes("diagram") ||
        content.includes("chart") ||
        content.includes("analysis")
      ) {
        domainScores["diagram-analysis"] =
          (domainScores["diagram-analysis"] || 0) + 10;
      }
      if (
        content.includes("report") ||
        content.includes("score") ||
        content.includes("metrics")
      ) {
        domainScores["report-management"] =
          (domainScores["report-management"] || 0) + 10;
      }
    }

    // API integration patterns
    if (
      content.includes("usesavereport") ||
      content.includes("reportmutation")
    ) {
      domainScores["report-management"] =
        (domainScores["report-management"] || 0) + 8;
    }

    if (content.includes("uploadfile") || content.includes("fileupload")) {
      domainScores["file-management"] =
        (domainScores["file-management"] || 0) + 8;
    }

    if (content.includes("projectslot") || content.includes("projectname")) {
      domainScores["project-management"] =
        (domainScores["project-management"] || 0) + 8;
    }

    // **PRIORITY 5: Business logic pattern analysis**
    if (
      content.includes("validate") &&
      content.includes("rule") &&
      content.includes("policy")
    ) {
      domainScores["validation"] = (domainScores["validation"] || 0) + 5;
    }

    if (
      content.includes("calculate") &&
      content.includes("compute") &&
      content.includes("formula")
    ) {
      domainScores["calculation"] = (domainScores["calculation"] || 0) + 5;
    }

    if (
      content.includes("workflow") &&
      content.includes("process") &&
      content.includes("step")
    ) {
      domainScores["workflow"] = (domainScores["workflow"] || 0) + 5;
    }

    // **FIND HIGHEST SCORING DOMAIN**
    let bestDomain = "general";
    let bestScore = 0;

    for (const [domain, score] of Object.entries(domainScores)) {
      if (score > bestScore && score >= 3) {
        // Minimum threshold
        bestScore = score;
        bestDomain = domain;
      }
    }

    // **FALLBACK ANALYSIS**
    if (bestDomain === "general") {
      // If no clear domain, try to infer from component type
      if (fileNameBase.includes("component") || fileNameBase.includes("view")) {
        if (content.includes("user") && content.includes("interface")) {
          return "user-interface";
        }
        if (content.includes("data") && content.includes("display")) {
          return "data-presentation";
        }
      }

      // Generic business logic patterns
      if (content.includes("business") && content.includes("logic")) {
        return "business-logic";
      }
    }

    return bestDomain;
  }

  /**
   * Extracts business operations from functions
   */
  private extractBusinessOperations(): BusinessOperation[] {
    const functionContext = this.functionExtractor.extractFunctionContext();
    const operations: BusinessOperation[] = [];

    // Add defensive check
    const functions = functionContext?.functions || [];
    functions.forEach((func) => {
      if (this.isBusinessOperation(func)) {
        const operation = this.buildBusinessOperation(func);
        operations.push(operation);
      }
    });

    return operations;
  }

  /**
   * Determines if a function represents a business operation
   */
  private isBusinessOperation(func: FunctionDefinition): boolean {
    // Skip simple utility functions
    if (
      func.complexity.level === "low" &&
      func.signature.parameters.length === 0
    ) {
      return false;
    }

    // Skip React-specific functions
    if (func.reactSpecific?.isComponent || func.reactSpecific?.isHook) {
      return false;
    }

    // Look for business logic patterns
    const businessPatterns = [
      "business-logic",
      "data-transformation",
      "validation",
      "api-integration",
    ];

    return func.patterns.some((pattern) => businessPatterns.includes(pattern));
  }

  /**
   * Builds a business operation from a function definition
   */
  private buildBusinessOperation(func: FunctionDefinition): BusinessOperation {
    const name = func.name;
    const purpose = this.determinePurpose(func);
    const complexity = this.mapComplexityLevel(func.complexity.level);
    const inputs = func.signature.parameters.map((p) => p.name);
    const outputs = [func.signature.returnType];

    return {
      name,
      purpose,
      complexity,
      inputs,
      outputs,
    };
  }

  /**
   * Extracts data flow patterns
   */
  private extractDataFlowPatterns(): DataFlowPattern[] {
    const patterns: DataFlowPattern[] = [];
    const content = this.content;

    // State management patterns
    if (
      content.includes("useState") ||
      content.includes("useReducer") ||
      content.includes("redux")
    ) {
      patterns.push({
        pattern: "state-management",
        description: "Manages application state",
        triggers: this.extractStateManagementTriggers(),
      });
    }

    // Data fetching patterns
    if (
      content.includes("fetch") ||
      content.includes("axios") ||
      content.includes("useSWR") ||
      content.includes("useQuery")
    ) {
      patterns.push({
        pattern: "data-fetching",
        description: "Fetches data from external sources",
        triggers: this.extractDataFetchingTriggers(),
      });
    }

    // Event handling patterns
    if (
      content.includes("onClick") ||
      content.includes("onChange") ||
      content.includes("addEventListener")
    ) {
      patterns.push({
        pattern: "event-handling",
        description: "Handles user interactions and events",
        triggers: this.extractEventHandlingTriggers(),
      });
    }

    // Side effect patterns
    if (content.includes("useEffect") || content.includes("useLayoutEffect")) {
      patterns.push({
        pattern: "side-effect",
        description: "Manages side effects and lifecycle",
        triggers: this.extractSideEffectTriggers(),
      });
    }

    // Computation patterns
    if (
      content.includes("useMemo") ||
      content.includes("calculate") ||
      content.includes("compute")
    ) {
      patterns.push({
        pattern: "computation",
        description: "Performs calculations and data processing",
        triggers: this.extractComputationTriggers(),
      });
    }

    return patterns;
  }

  /**
   * Extracts side effects
   */
  private extractSideEffects(): SideEffect[] {
    const functionContext = this.functionExtractor.extractFunctionContext();
    const sideEffects: SideEffect[] = [];

    functionContext.functions.forEach((func) => {
      func.sideEffects.forEach((effect) => {
        // Map function side effect types to business logic side effect types
        let mappedType:
          | "api-call"
          | "dom-manipulation"
          | "storage"
          | "navigation"
          | "external-service";

        switch (effect.type) {
          case "console":
            mappedType = "external-service"; // Map console to external-service
            break;
          case "file-system":
            mappedType = "external-service"; // Map file-system to external-service
            break;
          default:
            mappedType = effect.type as
              | "api-call"
              | "dom-manipulation"
              | "storage"
              | "navigation"
              | "external-service";
        }

        sideEffects.push({
          type: mappedType,
          description: effect.description,
          conditions: ["function execution"],
        });
      });
    });

    // Additional side effect detection
    if (
      this.content.includes("localStorage") ||
      this.content.includes("sessionStorage")
    ) {
      sideEffects.push({
        type: "storage",
        description: "Accesses browser storage",
        conditions: ["user interaction", "data persistence"],
      });
    }

    if (
      this.content.includes("window.location") ||
      this.content.includes("router.push")
    ) {
      sideEffects.push({
        type: "navigation",
        description: "Navigates to different routes",
        conditions: ["user action", "business logic"],
      });
    }

    return sideEffects;
  }

  /**
   * Calculates business complexity
   */
  private calculateBusinessComplexity(
    functionContext: any,
    operations: BusinessOperation[],
    dataFlow: DataFlowPattern[]
  ): BusinessComplexity {
    const operationalComplexity =
      this.calculateOperationalComplexity(operations);
    const dataComplexity = this.calculateDataComplexity(dataFlow);
    const logicalComplexity = this.calculateLogicalComplexity(functionContext);
    const integrationComplexity = this.calculateIntegrationComplexity();

    const totalComplexity =
      operationalComplexity +
      dataComplexity +
      logicalComplexity +
      integrationComplexity;

    let overallComplexity: "low" | "medium" | "high" | "very-high";
    if (totalComplexity > 15) overallComplexity = "very-high";
    else if (totalComplexity > 10) overallComplexity = "high";
    else if (totalComplexity > 5) overallComplexity = "medium";
    else overallComplexity = "low";

    const complexityFactors = this.identifyComplexityFactors(
      operationalComplexity,
      dataComplexity,
      logicalComplexity,
      integrationComplexity
    );

    return {
      operationalComplexity,
      dataComplexity,
      logicalComplexity,
      integrationComplexity,
      overallComplexity,
      complexityFactors,
    };
  }

  /**
   * Analyzes business patterns
   */
  private analyzeBusinessPatterns(
    functionContext: any,
    componentContext: any,
    operations: BusinessOperation[]
  ): BusinessPatterns {
    const architecturalPatterns = this.identifyArchitecturalPatterns();
    const domainPatterns = this.identifyDomainPatterns(operations);
    const dataPatterns = this.identifyDataPatterns();
    const integrationPatterns = this.identifyIntegrationPatterns();
    const antiPatterns = this.identifyBusinessAntiPatterns(
      functionContext,
      operations
    );

    return {
      architecturalPatterns,
      domainPatterns,
      dataPatterns,
      integrationPatterns,
      antiPatterns,
    };
  }

  /**
   * Assesses business quality
   */
  private assessBusinessQuality(
    operations: BusinessOperation[],
    complexity: BusinessComplexity,
    patterns: BusinessPatterns
  ): BusinessQuality {
    const maintainability = this.calculateMaintainability(complexity, patterns);
    const testability = this.calculateTestability(operations);
    const reusability = this.calculateReusability(operations, patterns);
    const reliability = this.calculateReliability(patterns);
    const performance = this.calculatePerformance(complexity, patterns);
    const security = this.calculateSecurity(patterns);

    const overallScore =
      (maintainability +
        testability +
        reusability +
        reliability +
        performance +
        security) /
      6;
    const qualityIssues = this.identifyQualityIssues(complexity, patterns);

    return {
      maintainability,
      testability,
      reusability,
      reliability,
      performance,
      security,
      overallScore,
      qualityIssues,
    };
  }

  /**
   * Extracts business dependencies
   */
  private extractBusinessDependencies(
    dependencyContext: any
  ): BusinessDependencies {
    const externalServices = this.identifyExternalServices(dependencyContext);
    const databases = this.identifyDatabaseDependencies();
    const apis = this.identifyApiDependencies();
    const libraries = this.identifyLibraryDependencies(dependencyContext);
    const configurations = this.identifyConfigurationDependencies();
    const resources = this.identifyResourceDependencies();

    return {
      externalServices,
      databases,
      apis,
      libraries,
      configurations,
      resources,
    };
  }

  /**
   * Extracts business rules
   */
  private extractBusinessRules(): BusinessRule[] {
    const rules: BusinessRule[] = [];
    const content = this.content;

    // Look for validation rules
    const validationPattern = /if\s*\([^)]*(?:validate|check|verify)[^)]*\)/gi;
    let match;
    let ruleId = 1;

    while ((match = validationPattern.exec(content)) !== null) {
      rules.push({
        id: `rule_${ruleId++}`,
        name: `Validation Rule ${ruleId - 1}`,
        type: "validation",
        condition: match[0],
        action: "Validate input",
        priority: "medium",
        domain: this.identifyDomain(),
        implementation: {
          method: "imperative",
          location: this.filePath,
          testable: true,
          configurable: false,
        },
        validation: {
          hasTests: false,
          coverage: 0,
          scenarios: [],
        },
      });
    }

    // Look for calculation rules
    const calculationPattern =
      /(?:calculate|compute|total|sum|price|cost|tax)/gi;
    if (calculationPattern.test(content)) {
      rules.push({
        id: `rule_${ruleId++}`,
        name: "Calculation Rule",
        type: "calculation",
        condition: "When calculation is needed",
        action: "Perform calculation",
        priority: "high",
        domain: this.identifyDomain(),
        implementation: {
          method: "imperative",
          location: this.filePath,
          testable: true,
          configurable: false,
        },
        validation: {
          hasTests: false,
          coverage: 0,
          scenarios: [],
        },
      });
    }

    return rules;
  }

  /**
   * Extracts workflows
   */
  private extractWorkflows(): WorkflowDefinition[] {
    const workflows: WorkflowDefinition[] = [];

    // Look for async workflow patterns
    if (this.content.includes("async") && this.content.includes("await")) {
      const steps = this.extractWorkflowSteps();
      const triggers = this.extractWorkflowTriggers();
      const conditions = this.extractWorkflowConditions();
      const outcomes = this.extractWorkflowOutcomes();
      const errorHandling = this.extractErrorHandlingStrategies();

      workflows.push({
        name: "Async Workflow",
        steps,
        triggers,
        conditions,
        outcomes,
        complexity:
          steps.length > 5
            ? "complex"
            : steps.length > 2
            ? "moderate"
            : "simple",
        async: true,
        errorHandling,
      });
    }

    return workflows;
  }

  /**
   * Extracts validations
   */
  private extractValidations(): ValidationDefinition[] {
    const validations: ValidationDefinition[] = [];
    const content = this.content;

    // Look for form validation patterns
    const fieldPattern = /(\w+):\s*(?:yup|joi|z)\./g;
    let match;

    while ((match = fieldPattern.exec(content)) !== null) {
      const field = match[1];
      const rules = this.extractValidationRules(field);
      const messages = this.extractValidationMessages(field);
      const dependencies = this.extractValidationDependencies(field);
      const customValidators = this.extractCustomValidators(field);

      validations.push({
        field,
        rules,
        messages,
        async:
          content.includes(`${field}Async`) ||
          content.includes(`async.*${field}`),
        dependencies,
        customValidators,
      });
    }

    return validations;
  }

  /**
   * Extracts data transformations
   */
  private extractDataTransformations(): DataTransformation[] {
    const transformations: DataTransformation[] = [];
    const content = this.content;

    // Look for transformation patterns
    const transformPatterns = [
      { pattern: /\.map\(/g, type: "mapping" as TransformationType },
      { pattern: /\.filter\(/g, type: "filtering" as TransformationType },
      { pattern: /\.reduce\(/g, type: "aggregation" as TransformationType },
      { pattern: /\.sort\(/g, type: "sorting" as TransformationType },
      {
        pattern: /normalize|transform/gi,
        type: "normalization" as TransformationType,
      },
    ];

    transformPatterns.forEach(({ pattern, type }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        transformations.push({
          name: `${type} transformation`,
          input: this.createGenericDataStructure("input"),
          output: this.createGenericDataStructure("output"),
          transformationType: type,
          complexity: this.determineTransformationComplexity(
            type,
            matches.length
          ),
          performance: this.analyzeTransformationPerformance(type),
          validation: this.analyzeTransformationValidation(type),
        });
      }
    });

    return transformations;
  }

  // Helper methods for business logic analysis

  private determinePurpose(func: FunctionDefinition): string {
    const name = func.name.toLowerCase();
    const content = this.content.toLowerCase();

    if (name.includes("validate") || name.includes("check"))
      return "Validates input data";
    if (name.includes("calculate") || name.includes("compute"))
      return "Performs calculations";
    if (name.includes("transform") || name.includes("convert"))
      return "Transforms data";
    if (name.includes("process") || name.includes("handle"))
      return "Processes business logic";
    if (name.includes("save") || name.includes("update"))
      return "Persists data";
    if (name.includes("fetch") || name.includes("get")) return "Retrieves data";
    if (name.includes("send") || name.includes("notify"))
      return "Sends notifications";

    return "Handles business operations";
  }

  private mapComplexityLevel(level: string): "low" | "medium" | "high" {
    if (level === "very-high" || level === "high") return "high";
    if (level === "medium") return "medium";
    return "low";
  }

  private extractStateManagementTriggers(): string[] {
    const triggers = [];
    if (this.content.includes("onClick")) triggers.push("user click");
    if (this.content.includes("onChange")) triggers.push("input change");
    if (this.content.includes("useEffect"))
      triggers.push("component lifecycle");
    if (this.content.includes("dispatch")) triggers.push("action dispatch");
    return triggers;
  }

  private extractDataFetchingTriggers(): string[] {
    const triggers = [];
    if (this.content.includes("useEffect")) triggers.push("component mount");
    if (this.content.includes("onClick")) triggers.push("user interaction");
    if (this.content.includes("onSubmit")) triggers.push("form submission");
    if (this.content.includes("interval")) triggers.push("timer");
    return triggers;
  }

  private extractEventHandlingTriggers(): string[] {
    const triggers = [];
    const eventPatterns = this.content.match(/on[A-Z]\w+/g) || [];
    return eventPatterns.map((pattern) =>
      pattern.replace(/^on/, "").toLowerCase()
    );
  }

  private extractSideEffectTriggers(): string[] {
    const triggers = [];
    if (this.content.includes("[]")) triggers.push("component mount");
    if (this.content.includes("[")) triggers.push("dependency change");
    return triggers;
  }

  private extractComputationTriggers(): string[] {
    const triggers = [];
    if (this.content.includes("useMemo")) triggers.push("dependency change");
    if (this.content.includes("calculate")) triggers.push("data change");
    return triggers;
  }

  private calculateOperationalComplexity(
    operations: BusinessOperation[]
  ): number {
    return operations.reduce((total, op) => {
      const complexityScores = { low: 1, medium: 2, high: 3, "very-high": 4 };
      return total + (complexityScores[op.complexity] || 1);
    }, 0);
  }

  private calculateDataComplexity(dataFlow: DataFlowPattern[]): number {
    const complexityMap = {
      "state-management": 3,
      "data-fetching": 2,
      "event-handling": 1,
      "side-effect": 2,
      computation: 2,
    };

    return dataFlow.reduce((total, pattern) => {
      return total + (complexityMap[pattern.pattern] || 1);
    }, 0);
  }

  private calculateLogicalComplexity(functionContext: any): number {
    if (!functionContext.functions) return 0;

    return functionContext.functions.reduce((total: number, func: any) => {
      return total + func.complexity.cyclomaticComplexity;
    }, 0);
  }

  private calculateIntegrationComplexity(): number {
    let complexity = 0;
    const content = this.content;

    // External API calls
    if (content.includes("fetch") || content.includes("axios")) complexity += 2;

    // Database operations
    if (content.includes("query") || content.includes("sql")) complexity += 2;

    // Third-party services
    if (content.includes("stripe") || content.includes("paypal"))
      complexity += 1;

    // Authentication services
    if (content.includes("auth") || content.includes("jwt")) complexity += 1;

    return complexity;
  }

  private identifyComplexityFactors(
    operational: number,
    data: number,
    logical: number,
    integration: number
  ): ComplexityFactor[] {
    const factors: ComplexityFactor[] = [];

    if (operational > 5) {
      factors.push({
        factor: "High operational complexity",
        impact: operational,
        description: "Multiple complex business operations",
        mitigation: "Consider breaking down operations into smaller functions",
      });
    }

    if (data > 5) {
      factors.push({
        factor: "Complex data flow",
        impact: data,
        description: "Multiple data flow patterns and transformations",
        mitigation: "Implement data flow optimization and caching",
      });
    }

    if (logical > 10) {
      factors.push({
        factor: "High logical complexity",
        impact: logical,
        description: "High cyclomatic complexity in functions",
        mitigation: "Refactor complex functions and reduce branching",
      });
    }

    if (integration > 3) {
      factors.push({
        factor: "Multiple integrations",
        impact: integration,
        description: "Dependencies on multiple external services",
        mitigation: "Implement circuit breakers and fallback mechanisms",
      });
    }

    return factors;
  }

  private identifyArchitecturalPatterns(): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    const content = this.content;

    // Repository pattern
    if (content.includes("repository") || content.includes("Repository")) {
      patterns.push({
        name: "Repository Pattern",
        confidence: 0.8,
        evidence: ["Repository class or interface found"],
        benefits: ["Data access abstraction", "Testability"],
        drawbacks: ["Additional complexity layer"],
      });
    }

    // Strategy pattern
    if (content.includes("strategy") || content.includes("Strategy")) {
      patterns.push({
        name: "Strategy Pattern",
        confidence: 0.7,
        evidence: ["Strategy interface or implementation"],
        benefits: ["Runtime algorithm selection", "Extensibility"],
        drawbacks: ["Increased number of classes"],
      });
    }

    // Observer pattern
    if (content.includes("observer") || content.includes("subscribe")) {
      patterns.push({
        name: "Observer Pattern",
        confidence: 0.7,
        evidence: ["Observer or subscription mechanism"],
        benefits: ["Loose coupling", "Event-driven architecture"],
        drawbacks: ["Potential memory leaks", "Complex debugging"],
      });
    }

    return patterns;
  }

  private identifyDomainPatterns(
    operations: BusinessOperation[]
  ): DomainPattern[] {
    const patterns: DomainPattern[] = [];
    const domain = this.identifyDomain();

    // CRUD pattern
    const crudOperations = operations.filter((op) =>
      ["create", "read", "update", "delete"].some((crud) =>
        op.name.toLowerCase().includes(crud)
      )
    );

    if (crudOperations.length >= 3) {
      patterns.push({
        name: "CRUD Pattern",
        domain,
        usage: `${crudOperations.length} CRUD operations implemented`,
        effectiveness: crudOperations.length === 4 ? "high" : "medium",
      });
    }

    // Validation pattern
    const validationOperations = operations.filter(
      (op) =>
        op.name.toLowerCase().includes("validate") ||
        op.purpose.includes("validate")
    );

    if (validationOperations.length > 0) {
      patterns.push({
        name: "Validation Pattern",
        domain,
        usage: `${validationOperations.length} validation operations`,
        effectiveness: validationOperations.length > 2 ? "high" : "medium",
      });
    }

    return patterns;
  }

  private identifyDataPatterns(): DataPattern[] {
    const patterns: DataPattern[] = [];
    const content = this.content;

    // Caching pattern
    if (
      content.includes("cache") ||
      content.includes("useMemo") ||
      content.includes("useCallback")
    ) {
      patterns.push({
        pattern: "Caching",
        usage: {
          reads: this.countOccurrences(content, /\.get\(/g),
          writes: this.countOccurrences(content, /\.set\(/g),
          transforms: this.countOccurrences(
            content,
            /\.map\(|\.filter\(|\.reduce\(/g
          ),
          caching: true,
        },
        optimization: ["Memory optimization", "Performance improvement"],
        issues: [],
      });
    }

    // Transformation pattern
    const transformCount = this.countOccurrences(
      content,
      /\.map\(|\.filter\(|\.reduce\(/g
    );
    if (transformCount > 0) {
      patterns.push({
        pattern: "Data Transformation",
        usage: {
          reads: transformCount,
          writes: 0,
          transforms: transformCount,
          caching: false,
        },
        optimization: transformCount > 5 ? ["Consider memoization"] : [],
        issues: transformCount > 10 ? ["High transformation complexity"] : [],
      });
    }

    return patterns;
  }

  private identifyIntegrationPatterns(): IntegrationPattern[] {
    const patterns: IntegrationPattern[] = [];
    const content = this.content;

    // REST API pattern
    if (
      content.includes("fetch") ||
      content.includes("axios") ||
      content.includes("api")
    ) {
      patterns.push({
        pattern: "REST API Integration",
        services: this.extractApiEndpoints(),
        reliability: this.assessApiReliability(),
        performance: this.assessApiPerformance(),
      });
    }

    // WebSocket pattern
    if (content.includes("websocket") || content.includes("socket.io")) {
      patterns.push({
        pattern: "WebSocket Integration",
        services: ["Real-time service"],
        reliability: "medium",
        performance: "fast",
      });
    }

    return patterns;
  }

  private identifyBusinessAntiPatterns(
    functionContext: any,
    operations: BusinessOperation[]
  ): BusinessAntiPattern[] {
    const antiPatterns: BusinessAntiPattern[] = [];

    // God function anti-pattern
    if (functionContext.functions) {
      const complexFunctions = functionContext.functions.filter(
        (f: any) => f.complexity.cyclomaticComplexity > 10
      );

      complexFunctions.forEach((func: any) => {
        antiPatterns.push({
          name: "God Function",
          severity: "high",
          description: `Function ${func.name} has high cyclomatic complexity (${func.complexity.cyclomaticComplexity})`,
          impact: "Reduced maintainability and testability",
          solution: "Break down into smaller, focused functions",
          location: this.filePath,
        });
      });
    }

    // Duplicate business logic
    const operationNames = operations.map((op) => op.name.toLowerCase());
    const duplicates = operationNames.filter(
      (name, index) => operationNames.indexOf(name) !== index
    );

    if (duplicates.length > 0) {
      antiPatterns.push({
        name: "Duplicate Business Logic",
        severity: "medium",
        description: "Similar operations found that could be consolidated",
        impact: "Code duplication and maintenance overhead",
        solution: "Extract common logic into reusable functions",
        location: this.filePath,
      });
    }

    return antiPatterns;
  }

  private calculateMaintainability(
    complexity: BusinessComplexity,
    patterns: BusinessPatterns
  ): number {
    let score = 100;

    // Deduct for complexity
    const complexityPenalty = {
      low: 0,
      medium: 10,
      high: 25,
      "very-high": 40,
    };
    score -= complexityPenalty[complexity.overallComplexity];

    // Deduct for anti-patterns
    patterns.antiPatterns.forEach((antiPattern) => {
      const penalties = { low: 5, medium: 10, high: 20, critical: 30 };
      score -= penalties[antiPattern.severity];
    });

    return Math.max(0, score);
  }

  private calculateTestability(operations: BusinessOperation[]): number {
    let score = 100;

    // Deduct for complex operations
    const complexOperations = operations.filter(
      (op) => op.complexity === "high"
    ).length;
    score -= complexOperations * 15;

    // Deduct for side effects
    if (
      this.content.includes("localStorage") ||
      this.content.includes("window.")
    ) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  private calculateReusability(
    operations: BusinessOperation[],
    patterns: BusinessPatterns
  ): number {
    let score = 50; // Base score

    // Add for generic operations
    const genericOperations = operations.filter(
      (op) => !op.name.includes("specific") && !op.name.includes("custom")
    ).length;
    score += genericOperations * 10;

    // Add for good patterns
    score += patterns.architecturalPatterns.length * 5;

    return Math.min(100, score);
  }

  private calculateReliability(patterns: BusinessPatterns): number {
    let score = 80; // Base score

    // Add for error handling patterns
    if (this.content.includes("try") && this.content.includes("catch")) {
      score += 10;
    }

    // Deduct for anti-patterns
    patterns.antiPatterns.forEach((antiPattern) => {
      if (
        antiPattern.severity === "high" ||
        antiPattern.severity === "critical"
      ) {
        score -= 15;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  private calculatePerformance(
    complexity: BusinessComplexity,
    patterns: BusinessPatterns
  ): number {
    let score = 80; // Base score

    // Deduct for high complexity
    if (complexity.overallComplexity === "very-high") score -= 30;
    else if (complexity.overallComplexity === "high") score -= 20;

    // Add for optimization patterns
    if (
      this.content.includes("useMemo") ||
      this.content.includes("useCallback")
    ) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateSecurity(patterns: BusinessPatterns): number {
    let score = 70; // Base score

    // Add for security patterns
    if (
      this.content.includes("sanitize") ||
      this.content.includes("validate")
    ) {
      score += 15;
    }

    // Deduct for security issues
    if (this.content.includes("eval(") || this.content.includes("innerHTML")) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  private identifyQualityIssues(
    complexity: BusinessComplexity,
    patterns: BusinessPatterns
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Complexity issues
    if (complexity.overallComplexity === "very-high") {
      issues.push({
        type: "complexity",
        severity: "high",
        description: "Very high business logic complexity",
        location: this.filePath,
        suggestion: "Break down complex operations into smaller functions",
        impact: "Reduced maintainability and increased bug risk",
      });
    }

    // Performance issues
    const transformCount = this.countOccurrences(
      this.content,
      /\.map\(|\.filter\(|\.reduce\(/g
    );
    if (transformCount > 10) {
      issues.push({
        type: "performance",
        severity: "medium",
        description: "High number of data transformations",
        location: this.filePath,
        suggestion: "Consider memoization or data structure optimization",
        impact: "Potential performance bottlenecks",
      });
    }

    return issues;
  }

  private identifyExternalServices(dependencyContext: any): ExternalService[] {
    const services: ExternalService[] = [];

    dependencyContext.external.forEach((dep: any) => {
      if (this.isExternalService(dep.name)) {
        services.push({
          name: dep.name,
          type: this.determineServiceType(dep.name),
          reliability: "medium",
          performance: "moderate",
          security: "medium",
          cost: "medium",
          alternatives: this.findServiceAlternatives(dep.name),
        });
      }
    });

    return services;
  }

  private identifyDatabaseDependencies(): DatabaseDependency[] {
    const dependencies: DatabaseDependency[] = [];
    const content = this.content;

    if (content.includes("sql") || content.includes("query")) {
      dependencies.push({
        type: "sql",
        operations: this.extractDatabaseOperations(),
        performance: this.assessDatabasePerformance(),
        reliability: "high",
        scalability: "medium",
      });
    }

    return dependencies;
  }

  private identifyApiDependencies(): ApiDependency[] {
    const dependencies: ApiDependency[] = [];
    const endpoints = this.extractApiEndpoints();

    endpoints.forEach((endpoint) => {
      dependencies.push({
        endpoint,
        method: this.extractHttpMethod(endpoint),
        authentication: this.determineAuthType(),
        reliability: "medium",
        errorHandling: this.assessApiErrorHandling(),
      });
    });

    return dependencies;
  }

  private identifyLibraryDependencies(
    dependencyContext: any
  ): LibraryDependency[] {
    const libraries: LibraryDependency[] = [];

    dependencyContext.external.forEach((dep: any) => {
      libraries.push({
        name: dep.name,
        purpose: this.mapToLibraryPurpose(dep.purpose),
        version: "unknown",
        security: this.assessLibrarySecurity(dep.name),
        maintenance: this.assessLibraryMaintenance(dep.name),
        alternatives: this.findLibraryAlternatives(dep.name),
      });
    });

    return libraries;
  }

  private identifyConfigurationDependencies(): ConfigurationDependency[] {
    const dependencies: ConfigurationDependency[] = [];
    const content = this.content;

    // Environment variables
    const envMatches = content.match(/process\.env\.(\w+)/g) || [];
    envMatches.forEach((envVar) => {
      const name = envVar.replace("process.env.", "");
      dependencies.push({
        name,
        type: "environment",
        required: true,
        sensitive: name.includes("SECRET") || name.includes("KEY"),
        validation: { required: true },
      });
    });

    return dependencies;
  }

  private identifyResourceDependencies(): ResourceDependency[] {
    const dependencies: ResourceDependency[] = [];
    const content = this.content;

    // Image imports
    const imageMatches =
      content.match(/import.*\.(png|jpg|jpeg|gif|svg)/g) || [];
    imageMatches.forEach((imageImport) => {
      dependencies.push({
        name: imageImport,
        type: "image",
        availability: "local",
        optimization: this.assessResourceOptimization("image"),
      });
    });

    return dependencies;
  }

  // Utility helper methods
  private countOccurrences(text: string, pattern: RegExp): number {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  }

  private extractApiEndpoints(): string[] {
    const content = this.content;
    const urlPattern = /['"`]([^'"`]*\/api\/[^'"`]*)['"`]/g;
    const endpoints: string[] = [];
    let match;

    while ((match = urlPattern.exec(content)) !== null) {
      endpoints.push(match[1]);
    }

    return endpoints;
  }

  private assessApiReliability(): "low" | "medium" | "high" {
    return this.content.includes("retry") || this.content.includes("catch")
      ? "high"
      : "medium";
  }

  private assessApiPerformance(): "slow" | "moderate" | "fast" {
    return this.content.includes("cache") || this.content.includes("memo")
      ? "fast"
      : "moderate";
  }

  private isExternalService(name: string): boolean {
    const servicePatterns = [
      "stripe",
      "paypal",
      "auth0",
      "firebase",
      "aws",
      "google",
    ];
    return servicePatterns.some((pattern) =>
      name.toLowerCase().includes(pattern)
    );
  }

  private determineServiceType(name: string): ServiceType {
    if (name.includes("auth")) return "auth";
    if (name.includes("pay") || name.includes("stripe")) return "payment";
    if (name.includes("firebase") || name.includes("aws")) return "database";
    return "rest-api";
  }

  private findServiceAlternatives(serviceName: string): string[] {
    const alternatives: { [key: string]: string[] } = {
      stripe: ["PayPal", "Square", "Braintree"],
      auth0: ["Firebase Auth", "AWS Cognito", "Okta"],
      firebase: ["AWS", "Supabase", "MongoDB Atlas"],
    };

    return alternatives[serviceName.toLowerCase()] || [];
  }

  private extractDatabaseOperations(): DatabaseOperation[] {
    return [
      {
        type: "query",
        frequency: "medium",
        complexity: "moderate",
      },
    ];
  }

  private assessDatabasePerformance(): DatabasePerformance {
    return {
      queryOptimization: false,
      indexing: false,
      caching: this.content.includes("cache"),
      connectionPooling: false,
    };
  }

  private extractHttpMethod(endpoint: string): HttpMethod {
    const content = this.content;
    if (content.includes(`post`)) return "POST";
    if (content.includes(`put`)) return "PUT";
    if (content.includes(`delete`)) return "DELETE";
    return "GET";
  }

  private determineAuthType(): AuthenticationType {
    if (this.content.includes("bearer") || this.content.includes("jwt"))
      return "bearer";
    if (this.content.includes("api-key") || this.content.includes("apikey"))
      return "api-key";
    if (this.content.includes("oauth")) return "oauth";
    return "none";
  }

  private assessApiErrorHandling(): ApiErrorHandling {
    return {
      retries: this.content.includes("retry") ? 3 : 0,
      timeout: this.content.includes("timeout") ? 5000 : 0,
      fallback: this.content.includes("fallback"),
      circuitBreaker: this.content.includes("circuit"),
    };
  }

  private mapToLibraryPurpose(purpose: string): LibraryPurpose {
    const mapping: { [key: string]: LibraryPurpose } = {
      "ui-library": "ui",
      "state-management": "state-management",
      "data-fetching": "data-fetching",
      validation: "validation",
      testing: "testing",
      utility: "utility",
    };

    return mapping[purpose] || "utility";
  }

  private assessLibrarySecurity(name: string): SecurityInfo {
    return {
      vulnerabilities: [],
      lastAudit: "unknown",
      riskLevel: "medium",
    };
  }

  private assessLibraryMaintenance(name: string): MaintenanceInfo {
    return {
      lastUpdate: "unknown",
      activelyMaintained: true,
      communitySupport: "medium",
    };
  }

  private findLibraryAlternatives(name: string): Alternative[] {
    return [];
  }

  private assessResourceOptimization(type: string): ResourceOptimization {
    return {
      compressed: false,
      cached: false,
      lazyLoaded: this.content.includes("lazy"),
      optimized: false,
    };
  }

  private extractWorkflowSteps(): WorkflowStep[] {
    return [];
  }

  private extractWorkflowTriggers(): WorkflowTrigger[] {
    return [];
  }

  private extractWorkflowConditions(): WorkflowCondition[] {
    return [];
  }

  private extractWorkflowOutcomes(): WorkflowOutcome[] {
    return [];
  }

  private extractErrorHandlingStrategies(): ErrorHandlingStrategy[] {
    return [];
  }

  private extractValidationRules(field: string): ValidationRule[] {
    return [];
  }

  private extractValidationMessages(field: string): ValidationMessage[] {
    return [];
  }

  private extractValidationDependencies(field: string): string[] {
    return [];
  }

  private extractCustomValidators(field: string): CustomValidator[] {
    return [];
  }

  private createGenericDataStructure(type: string): DataStructure {
    return {
      schema: `${type} schema`,
      fields: [],
      relationships: [],
      constraints: [],
    };
  }

  private determineTransformationComplexity(
    type: TransformationType,
    count: number
  ): "simple" | "moderate" | "complex" {
    if (count > 5) return "complex";
    if (count > 2) return "moderate";
    return "simple";
  }

  private analyzeTransformationPerformance(
    type: TransformationType
  ): TransformationPerformance {
    const complexityMap: Record<
      TransformationType,
      "O(1)" | "O(n)" | "O(n²)" | "O(log n)" | "unknown"
    > = {
      mapping: "O(n)",
      filtering: "O(n)",
      aggregation: "O(n)",
      sorting: "O(n²)",
      computation: "O(n)",
      normalization: "O(n)",
    };

    return {
      complexity: complexityMap[type] || "O(n)",
      memoryUsage: type === "aggregation" ? "high" : "medium",
      optimizable: true,
    };
  }

  private analyzeTransformationValidation(
    type: TransformationType
  ): TransformationValidation {
    return {
      inputValidation: false,
      outputValidation: false,
      errorHandling:
        this.content.includes("try") && this.content.includes("catch"),
      testCoverage: 0,
    };
  }
}
