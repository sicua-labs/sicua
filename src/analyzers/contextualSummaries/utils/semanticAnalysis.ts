import { BusinessLogicDefinition } from "../types/businessLogicExtractor.types";
import {
  ComponentContext,
  ComponentDefinition,
} from "../types/componentExtractor.types";
import {
  ComplexityLevel,
  DependencyContext,
  FileContextType,
} from "../types/contextualSummaries.types";
import {
  FunctionContext,
  FunctionDefinition,
} from "../types/functionExtractor.types";
import {
  SemanticAnalysisResult,
  FileSemantics,
  DomainConcept,
  TechnicalConcept,
  BusinessValue,
  SemanticComplexity,
  ArchitecturalPatternAnalysis,
  CodeQualityAnalysis,
  DesignPatternAnalysis,
  RelationshipAnalysis,
  ContextualInsight,
  RiskFactor,
  TechnicalUsage,
  AlternativeOption,
  ComplexityTrend,
  Recommendation,
  ApplicationLayer,
  ArchitecturalDebt,
  CodeSmell,
  ComplianceScore,
  DesignPrincipleAdherence,
  DetectedPattern,
  LayerInfo,
  MissingPatternOpportunity,
  PatternMisuseWarning,
  SeparationAnalysis,
  SOLIDAnalysis,
  ConsolidationOpportunity,
  DependencyStrengthAnalysis,
  DRYAnalysis,
  DuplicatedConcept,
  OptimizationOpportunity,
  CircularDependency,
  CohesionAnalysis,
  CohesionMetrics,
  ConceptRelationship,
  CouplingAnalysis,
  CouplingMetrics,
  CrossLayerDependency,
  DependencyHealth,
  IdentifiedConcern,
  KISSAnalysis,
  LayerViolation,
  MaintainabilityFactor,
  MaintainabilityMetrics,
  MaintainabilityScore,
  PatternEvolutionSuggestion,
  PerformanceMetrics,
  ReadabilityMetrics,
  ReliabilityMetrics,
  SecurityMetrics,
  SeparationImprovement,
  SeparationQuality,
  SeparationViolation,
  StrongDependency,
  TestabilityMetrics,
  WeakDependency,
  YAGNIAnalysis,
  SecurityVulnerability,
} from "../types/semanticAnalysis.types";
import { TypeContext, TypeDefinition } from "../types/typeExtractor.types";

export class SemanticAnalyzer {
  /**
   * Performs comprehensive semantic analysis on extracted data
   */
  static analyzeSemantics(
    fileType: FileContextType,
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext,
    businessLogic: BusinessLogicDefinition,
    dependencyContext: DependencyContext,
    filePath: string,
    content: string
  ): SemanticAnalysisResult {
    const analyzer = new SemanticAnalyzer();

    // Add defensive checks
    const safeFunctionContext = {
      ...functionContext,
      functions: functionContext.functions || [],
      callGraph: functionContext.callGraph || [],
      complexity: functionContext.complexity || {
        totalFunctions: 0,
        averageComplexity: 0,
        highComplexityCount: 0,
        maxNestingDepth: 0,
        totalLinesOfCode: 0,
      },
      patterns: functionContext.patterns || {
        functionalPatterns: [],
        reactPatterns: [],
        asyncPatterns: [],
        errorHandlingPatterns: [],
      },
    };

    const safeComponentContext = {
      ...componentContext,
      components: componentContext.components || [],
      relationships: componentContext.relationships || [],
      patterns: componentContext.patterns || {
        commonPatterns: [],
        patternUsage: {},
        antiPatterns: [],
        recommendations: [],
      },
      architecture: componentContext.architecture || {
        structure: "flat",
        depth: 0,
        componentHierarchy: [],
        modularity: {
          cohesion: "medium",
          coupling: "medium",
          reusability: "medium",
          maintainability: "medium",
        },
      },
      quality: componentContext.quality || {
        averageComplexity: 0,
        testabilityCoverage: 0,
        accessibilityScore: 0,
        performanceScore: 0,
        maintainabilityScore: 0,
        reusabilityScore: 0,
      },
    };

    const safeTypeContext = {
      ...typeContext,
      definitions: typeContext.definitions || [],
      imports: typeContext.imports || [],
      exports: typeContext.exports || [],
      relationships: typeContext.relationships || [],
    };

    const safeBusinessLogic = {
      ...businessLogic,
      operations: businessLogic.operations || [],
      workflows: businessLogic.workflows || [],
      validations: businessLogic.validations || [],
      transformations: businessLogic.transformations || [],
      rules: businessLogic.rules || [],
      dependencies: businessLogic.dependencies || {
        externalServices: [],
        databases: [],
        apis: [],
        libraries: [],
        configurations: [],
        resources: [],
      },
    };

    const fileSemantics = analyzer.analyzeFileSemantics(
      fileType,
      safeFunctionContext,
      safeComponentContext,
      safeTypeContext,
      safeBusinessLogic,
      content
    );

    const architecturalPatterns = analyzer.analyzeArchitecturalPatterns(
      functionContext,
      componentContext,
      businessLogic,
      filePath
    );

    const codeQuality = analyzer.analyzeCodeQuality(
      functionContext,
      componentContext,
      typeContext,
      businessLogic
    );

    const designPatterns = analyzer.analyzeDesignPatterns(
      functionContext,
      componentContext,
      typeContext,
      content
    );

    const relationshipAnalysis = analyzer.analyzeRelationships(
      dependencyContext,
      functionContext,
      componentContext
    );

    const contextualInsights = analyzer.generateContextualInsights(
      fileSemantics,
      architecturalPatterns,
      codeQuality,
      designPatterns
    );

    const recommendations = analyzer.generateRecommendations(
      fileSemantics,
      architecturalPatterns,
      codeQuality,
      contextualInsights
    );

    const riskFactors = analyzer.identifyRiskFactors(
      codeQuality,
      architecturalPatterns,
      businessLogic
    );

    const optimizationOpportunities =
      analyzer.identifyOptimizationOpportunities(
        functionContext,
        componentContext,
        businessLogic,
        codeQuality
      );

    return {
      fileSemantics,
      architecturalPatterns,
      codeQuality,
      designPatterns,
      relationshipAnalysis,
      contextualInsights,
      recommendations,
      riskFactors,
      optimizationOpportunities,
    };
  }

  /**
   * Analyzes file-level semantics
   */
  private analyzeFileSemantics(
    fileType: FileContextType,
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext,
    businessLogic: BusinessLogicDefinition,
    content: string
  ): FileSemantics {
    const primaryPurpose = this.determinePrimaryPurpose(
      fileType,
      functionContext,
      componentContext,
      businessLogic
    );
    const secondaryPurposes = this.determineSecondaryPurposes(
      functionContext,
      componentContext,
      businessLogic
    );
    const domainConcepts = this.extractDomainConcepts(
      businessLogic,
      typeContext,
      content
    );
    const technicalConcepts = this.extractTechnicalConcepts(
      functionContext,
      componentContext,
      content
    );
    const businessValue = this.assessBusinessValue(
      fileType,
      businessLogic,
      componentContext
    );
    const complexity = this.analyzeSemanticComplexity(
      functionContext,
      componentContext,
      businessLogic
    );
    const maintainability = this.analyzeMaintainability(
      functionContext,
      componentContext,
      typeContext
    );
    const cohesion = this.analyzeCohesion(
      functionContext,
      componentContext,
      businessLogic
    );
    const coupling = this.analyzeCoupling(functionContext, componentContext);

    return {
      primaryPurpose,
      secondaryPurposes,
      domainConcepts,
      technicalConcepts,
      businessValue,
      complexity,
      maintainability,
      cohesion,
      coupling,
    };
  }

  /**
   * Determines the primary purpose of the file
   */
  private determinePrimaryPurpose(
    fileType: FileContextType,
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): string {
    // Component files
    if (
      fileType === "react-component" &&
      componentContext.components.length > 0
    ) {
      const mainComponent = componentContext.components[0];
      return `Implements ${mainComponent.name} component for ${mainComponent.category} functionality`;
    }

    // Hook files
    if (fileType === "react-hook") {
      const hookFunctions = functionContext.functions.filter(
        (f) => f.reactSpecific?.isHook
      );
      if (hookFunctions.length > 0) {
        return `Provides custom React hook functionality for ${hookFunctions[0].name}`;
      }
    }

    // Utility files
    if (fileType === "utility") {
      const utilityPatterns = functionContext.functions.filter(
        (f) =>
          f.patterns.includes("utility-function") ||
          f.patterns.includes("data-transformation")
      );
      if (utilityPatterns.length > 0) {
        return `Provides utility functions for ${this.categorizeUtilityFunctions(
          utilityPatterns
        )}`;
      }
    }

    // Business logic files
    if (businessLogic.operations.length > 0) {
      return `Implements ${businessLogic.domain} business logic with ${businessLogic.operations.length} operations`;
    }

    // Type definition files
    if (fileType === "type-definition") {
      return `Defines TypeScript types and interfaces for application data structures`;
    }

    // Service files
    if (fileType === "service") {
      return `Provides service layer functionality for external integrations`;
    }

    // API routes
    if (fileType === "api-route") {
      return `Implements API endpoint handlers for server-side logic`;
    }

    // Default fallback
    return `Provides ${fileType.replace("-", " ")} functionality`;
  }

  /**
   * Determines secondary purposes
   */
  private determineSecondaryPurposes(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): string[] {
    const purposes: string[] = [];

    // Error handling
    if (
      functionContext.functions.some((f) =>
        f.patterns.includes("error-handling")
      )
    ) {
      purposes.push("Error handling and recovery");
    }

    // Validation
    if (businessLogic.validations.length > 0) {
      purposes.push("Data validation and integrity");
    }

    // Performance optimization
    if (
      componentContext.components.some(
        (c) => c.performance.memoization.reactMemo
      )
    ) {
      purposes.push("Performance optimization");
    }

    // State management
    if (
      functionContext.functions.some((f) =>
        f.patterns.includes("state-management")
      )
    ) {
      purposes.push("State management");
    }

    // API integration
    if (
      functionContext.functions.some((f) =>
        f.patterns.includes("api-integration")
      )
    ) {
      purposes.push("External API integration");
    }

    return purposes;
  }

  /**
   * Extracts domain concepts from the code
   */
  private extractDomainConcepts(
    businessLogic: BusinessLogicDefinition,
    typeContext: TypeContext,
    content: string
  ): DomainConcept[] {
    const concepts: DomainConcept[] = [];

    // Extract from business operations
    businessLogic.operations.forEach((operation) => {
      concepts.push({
        name: operation.name,
        type: "service",
        confidence: 0.8,
        context: operation.purpose,
        relationships: [],
      });
    });

    // Extract from type definitions
    typeContext.definitions.forEach((type) => {
      if (this.isDomainType(type.name)) {
        concepts.push({
          name: type.name,
          type: this.classifyDomainType(type),
          confidence: 0.7,
          context: type.description || "Domain type definition",
          relationships: this.extractTypeRelationships(type, typeContext),
        });
      }
    });

    return concepts;
  }

  /**
   * Extracts technical concepts
   */
  private extractTechnicalConcepts(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    content: string
  ): TechnicalConcept[] {
    const concepts: TechnicalConcept[] = [];

    // React patterns
    if (componentContext.components.length > 0) {
      const reactPatterns = componentContext.patterns.commonPatterns;
      reactPatterns.forEach((pattern) => {
        concepts.push({
          name: pattern,
          type: "pattern",
          usage: this.analyzePatternUsage(pattern, content),
          effectiveness: this.calculatePatternEffectiveness(
            pattern,
            componentContext
          ),
          alternatives: this.getPatternAlternatives(pattern),
        });
      });
    }

    // Functional programming patterns
    const functionalPatterns = functionContext.patterns.functionalPatterns;
    functionalPatterns.forEach((pattern) => {
      concepts.push({
        name: pattern,
        type: "pattern",
        usage: this.analyzePatternUsage(pattern, content),
        effectiveness: 0.8,
        alternatives: [],
      });
    });

    return concepts;
  }

  /**
   * Assesses business value of the file
   */
  private assessBusinessValue(
    fileType: FileContextType,
    businessLogic: BusinessLogicDefinition,
    componentContext: ComponentContext
  ): BusinessValue {
    let userImpact: "low" | "medium" | "high" = "low";
    let businessCriticality: "low" | "medium" | "high" | "critical" = "low";
    let frequencyOfUse:
      | "rarely"
      | "occasionally"
      | "frequently"
      | "constantly" = "occasionally";
    let revenueImpact: "none" | "indirect" | "direct" | "critical" = "none";
    let complianceRelevance = false;

    // Component impact
    if (fileType === "react-component") {
      const mainComponent = componentContext.components[0];
      if (mainComponent) {
        userImpact =
          mainComponent.category === "page"
            ? "high"
            : mainComponent.category === "form"
            ? "high"
            : "medium";
      }
    }

    // Business logic impact
    if (businessLogic.domain === "payment" || businessLogic.domain === "auth") {
      businessCriticality = "critical";
      revenueImpact = "direct";
      complianceRelevance = true;
    } else if (
      businessLogic.domain === "analytics" ||
      businessLogic.domain === "workflow"
    ) {
      businessCriticality = "high";
      revenueImpact = "indirect";
    }

    // Frequency assessment
    if (fileType === "react-component" || fileType === "utility") {
      frequencyOfUse = "frequently";
    } else if (fileType === "api-route") {
      frequencyOfUse = "constantly";
    }

    return {
      userImpact,
      businessCriticality,
      frequencyOfUse,
      revenueImpact,
      complianceRelevance,
    };
  }

  /**
   * Analyzes semantic complexity
   */
  private analyzeSemanticComplexity(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): SemanticComplexity {
    const conceptualComplexity = this.calculateConceptualComplexity(
      functionContext,
      componentContext,
      businessLogic
    );
    const interactionComplexity = this.calculateInteractionComplexity(
      componentContext,
      businessLogic
    );
    const dataComplexity = this.calculateDataComplexity(businessLogic);
    const algorithmicComplexity =
      this.calculateAlgorithmicComplexity(functionContext);

    const totalComplexity =
      conceptualComplexity +
      interactionComplexity +
      dataComplexity +
      algorithmicComplexity;

    let overallComplexity: ComplexityLevel;
    if (totalComplexity > 15) overallComplexity = "very-high";
    else if (totalComplexity > 10) overallComplexity = "high";
    else if (totalComplexity > 5) overallComplexity = "medium";
    else overallComplexity = "low";

    const complexityTrends = this.analyzeComplexityTrends(
      functionContext,
      componentContext
    );

    return {
      conceptualComplexity,
      interactionComplexity,
      dataComplexity,
      algorithmicComplexity,
      overallComplexity,
      complexityTrends,
    };
  }

  /**
   * Analyzes architectural patterns
   */
  private analyzeArchitecturalPatterns(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition,
    filePath: string
  ): ArchitecturalPatternAnalysis {
    const layerIdentification = this.identifyArchitecturalLayer(
      filePath,
      functionContext,
      componentContext
    );
    const separationOfConcerns = this.analyzeSeparationOfConcerns(
      functionContext,
      componentContext,
      businessLogic
    );
    const designPrinciples = this.analyzeDesignPrinciples(
      functionContext,
      componentContext,
      businessLogic
    );
    const codeSmells = this.identifyCodeSmells(
      functionContext,
      componentContext
    );
    const architecturalDebt = this.calculateArchitecturalDebt(
      functionContext,
      componentContext,
      businessLogic
    );

    return {
      layerIdentification,
      separationOfConcerns,
      designPrinciples,
      codeSmells,
      architecturalDebt,
    };
  }

  /**
   * Analyzes code quality
   */
  private analyzeCodeQuality(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext,
    businessLogic: BusinessLogicDefinition
  ): CodeQualityAnalysis {
    const readability = this.calculateReadabilityMetrics(
      functionContext,
      componentContext
    );
    const testability = this.calculateTestabilityMetrics(
      functionContext,
      componentContext
    );
    const performance = this.calculatePerformanceMetrics(
      functionContext,
      componentContext
    );
    const security = this.calculateSecurityMetrics(
      functionContext,
      businessLogic
    );
    const maintainability = this.calculateMaintainabilityScore(
      functionContext,
      componentContext,
      typeContext
    );
    const reliability = this.calculateReliabilityMetrics(
      functionContext,
      businessLogic
    );

    const overallQualityScore =
      (readability.score +
        testability.score +
        performance.score +
        security.score +
        maintainability.score +
        reliability.score) /
      6;

    return {
      readability,
      testability,
      performance,
      security,
      maintainability,
      reliability,
      overallQualityScore,
    };
  }

  /**
   * Analyzes design patterns
   */
  private analyzeDesignPatterns(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext,
    content: string
  ): DesignPatternAnalysis {
    const detectedPatterns = this.detectDesignPatterns(
      functionContext,
      componentContext,
      content
    );
    const missingPatterns = this.identifyMissingPatterns(
      functionContext,
      componentContext
    );
    const patternMisuse = this.identifyPatternMisuse(detectedPatterns, content);
    const patternEvolution = this.suggestPatternEvolution(
      detectedPatterns,
      functionContext
    );

    return {
      detectedPatterns,
      missingPatterns,
      patternMisuse,
      patternEvolution,
    };
  }

  /**
   * Analyzes relationships between components
   */
  private analyzeRelationships(
    dependencyContext: DependencyContext,
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): RelationshipAnalysis {
    const dependencyStrength =
      this.analyzeDependencyStrength(dependencyContext);
    const coupling = this.calculateCouplingMetrics(
      dependencyContext,
      functionContext
    );
    const cohesion = this.calculateCohesionMetrics(
      functionContext,
      componentContext
    );
    const fanIn = dependencyContext.internal.length;
    const fanOut = dependencyContext.external.length;
    const instability = fanOut / (fanIn + fanOut + 1);
    const abstractness = this.calculateAbstractness(
      functionContext,
      componentContext
    );
    const distance = Math.abs(abstractness + instability - 1);

    return {
      dependencyStrength,
      coupling,
      cohesion,
      fanIn,
      fanOut,
      instability,
      abstractness,
      distance,
    };
  }

  /**
   * Generates contextual insights
   */
  private generateContextualInsights(
    fileSemantics: FileSemantics,
    architecturalPatterns: ArchitecturalPatternAnalysis,
    codeQuality: CodeQualityAnalysis,
    designPatterns: DesignPatternAnalysis
  ): ContextualInsight[] {
    const insights: ContextualInsight[] = [];

    // Quality insights
    if (codeQuality.overallQualityScore < 60) {
      insights.push({
        type: "code-quality",
        category: "risk",
        priority: "high",
        description: "Code quality is below acceptable threshold",
        evidence: [
          `Overall quality score: ${codeQuality.overallQualityScore.toFixed(
            1
          )}`,
        ],
        impact: {
          scope: "module",
          stakeholders: ["developers", "maintainers"],
          timeframe: "medium-term",
          riskLevel: "high",
        },
        actionable: true,
        effort: "medium",
      });
    }

    // Complexity insights
    if (fileSemantics.complexity.overallComplexity === "very-high") {
      insights.push({
        type: "maintainability",
        category: "warning",
        priority: "high",
        description: "File has very high semantic complexity",
        evidence: [
          `Complexity level: ${fileSemantics.complexity.overallComplexity}`,
        ],
        impact: {
          scope: "local",
          stakeholders: ["developers"],
          timeframe: "immediate",
          riskLevel: "medium",
        },
        actionable: true,
        effort: "high",
      });
    }

    // Architecture insights
    if (architecturalPatterns.codeSmells.length > 0) {
      const severeCodes = architecturalPatterns.codeSmells.filter(
        (smell) => smell.severity === "high"
      );
      if (severeCodes.length > 0) {
        insights.push({
          type: "architecture",
          category: "improvement",
          priority: "medium",
          description: "Multiple code smells detected that affect architecture",
          evidence: severeCodes.map(
            (smell) => `${smell.type}: ${smell.description}`
          ),
          impact: {
            scope: "module",
            stakeholders: ["architects", "developers"],
            timeframe: "short-term",
            riskLevel: "medium",
          },
          actionable: true,
          effort: "medium",
        });
      }
    }

    // Design pattern insights
    if (designPatterns.missingPatterns.length > 0) {
      const highImpactPatterns = designPatterns.missingPatterns.filter(
        (p) => p.applicability > 0.7
      );
      if (highImpactPatterns.length > 0) {
        insights.push({
          type: "design-pattern",
          category: "opportunity",
          priority: "medium",
          description: "Opportunities to apply beneficial design patterns",
          evidence: highImpactPatterns.map((p) => `${p.pattern}: ${p.benefit}`),
          impact: {
            scope: "local",
            stakeholders: ["developers"],
            timeframe: "short-term",
            riskLevel: "low",
          },
          actionable: true,
          effort: "medium",
        });
      }
    }

    // Business value insights
    if (
      fileSemantics.businessValue.businessCriticality === "critical" &&
      codeQuality.overallQualityScore < 80
    ) {
      insights.push({
        type: "business-logic",
        category: "risk",
        priority: "critical",
        description: "Critical business logic has suboptimal code quality",
        evidence: [
          `Business criticality: ${fileSemantics.businessValue.businessCriticality}`,
          `Quality score: ${codeQuality.overallQualityScore.toFixed(1)}`,
        ],
        impact: {
          scope: "application",
          stakeholders: ["business", "developers", "users"],
          timeframe: "immediate",
          riskLevel: "critical",
        },
        actionable: true,
        effort: "high",
      });
    }

    return insights;
  }

  /**
   * Generates actionable recommendations
   */
  private generateRecommendations(
    fileSemantics: FileSemantics,
    architecturalPatterns: ArchitecturalPatternAnalysis,
    codeQuality: CodeQualityAnalysis,
    contextualInsights: ContextualInsight[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Refactoring recommendations
    if (fileSemantics.complexity.overallComplexity === "very-high") {
      recommendations.push({
        type: "refactoring",
        priority: "high",
        title: "Reduce File Complexity",
        description:
          "Break down complex functions and separate concerns to improve maintainability",
        rationale:
          "High complexity reduces code readability and increases bug risk",
        benefits: [
          "Improved maintainability",
          "Reduced bug risk",
          "Better testability",
          "Enhanced code reusability",
        ],
        implementation: {
          steps: [
            {
              order: 1,
              description:
                "Identify complex functions with high cyclomatic complexity",
              estimatedTime: "2h",
            },
            {
              order: 2,
              description:
                "Extract common functionality into utility functions",
              estimatedTime: "4h",
            },
            {
              order: 3,
              description: "Apply single responsibility principle",
              estimatedTime: "6h",
            },
            {
              order: 4,
              description: "Add unit tests for refactored code",
              estimatedTime: "4h",
            },
          ],
          prerequisites: ["Code review", "Test coverage analysis"],
          constraints: [
            "Maintain backward compatibility",
            "Preserve existing functionality",
          ],
          alternatives: ["Gradual refactoring", "Complete rewrite"],
          successCriteria: [
            "Complexity metrics improved",
            "Test coverage maintained",
          ],
        },
        riskLevel: "medium",
        estimatedEffort: {
          timeInHours: 16,
          complexity: "moderate",
          skillLevel: "intermediate",
          dependencies: ["Testing framework setup"],
        },
      });
    }

    // Performance recommendations
    if (codeQuality.performance.score < 70) {
      recommendations.push({
        type: "performance",
        priority: "medium",
        title: "Optimize Performance",
        description:
          "Implement performance optimizations to improve runtime efficiency",
        rationale:
          "Current performance metrics indicate optimization opportunities",
        benefits: [
          "Faster load times",
          "Better user experience",
          "Reduced resource consumption",
          "Improved scalability",
        ],
        implementation: {
          steps: [
            {
              order: 1,
              description: "Profile current performance bottlenecks",
              estimatedTime: "3h",
            },
            {
              order: 2,
              description: "Implement memoization where appropriate",
              estimatedTime: "5h",
            },
            {
              order: 3,
              description: "Optimize data structures and algorithms",
              estimatedTime: "8h",
            },
            {
              order: 4,
              description: "Add performance monitoring",
              estimatedTime: "2h",
            },
          ],
          prerequisites: ["Performance baseline", "Profiling tools"],
          constraints: ["Memory limitations", "Browser compatibility"],
          alternatives: ["Incremental optimization", "Architecture redesign"],
          successCriteria: [
            "Performance metrics improved by 30%",
            "User experience enhanced",
          ],
        },
        riskLevel: "low",
        estimatedEffort: {
          timeInHours: 18,
          complexity: "moderate",
          skillLevel: "intermediate",
          dependencies: ["Performance monitoring tools"],
        },
      });
    }

    // Security recommendations
    if (codeQuality.security.score < 80) {
      recommendations.push({
        type: "security",
        priority: "high",
        title: "Enhance Security Measures",
        description:
          "Implement security best practices to protect against vulnerabilities",
        rationale: "Security analysis identified potential vulnerabilities",
        benefits: [
          "Reduced security risk",
          "Compliance adherence",
          "User data protection",
          "Trust enhancement",
        ],
        implementation: {
          steps: [
            {
              order: 1,
              description: "Conduct security audit",
              estimatedTime: "4h",
            },
            {
              order: 2,
              description: "Implement input validation",
              estimatedTime: "6h",
            },
            {
              order: 3,
              description: "Add authentication checks",
              estimatedTime: "8h",
            },
            {
              order: 4,
              description: "Set up security monitoring",
              estimatedTime: "3h",
            },
          ],
          prerequisites: ["Security guidelines", "Threat model"],
          constraints: ["Performance impact", "User experience"],
          alternatives: [
            "Third-party security tools",
            "Manual security review",
          ],
          successCriteria: [
            "Security scan passing",
            "Vulnerability count reduced",
          ],
        },
        riskLevel: "low",
        estimatedEffort: {
          timeInHours: 21,
          complexity: "complex",
          skillLevel: "senior",
          dependencies: ["Security tools", "Compliance requirements"],
        },
      });
    }

    // Architecture recommendations
    if (architecturalPatterns.designPrinciples.overallAdherence < 0.7) {
      recommendations.push({
        type: "architecture",
        priority: "medium",
        title: "Improve Design Principle Adherence",
        description:
          "Refactor code to better follow SOLID and other design principles",
        rationale:
          "Poor adherence to design principles affects long-term maintainability",
        benefits: [
          "Better code organization",
          "Improved maintainability",
          "Enhanced extensibility",
          "Reduced coupling",
        ],
        implementation: {
          steps: [
            {
              order: 1,
              description: "Review SOLID principle violations",
              estimatedTime: "3h",
            },
            {
              order: 2,
              description: "Refactor to single responsibility",
              estimatedTime: "8h",
            },
            {
              order: 3,
              description: "Apply dependency inversion",
              estimatedTime: "6h",
            },
            {
              order: 4,
              description: "Update documentation",
              estimatedTime: "2h",
            },
          ],
          prerequisites: ["Architecture review", "Design pattern knowledge"],
          constraints: ["Existing dependencies", "API compatibility"],
          alternatives: ["Gradual principle adoption", "Architecture redesign"],
          successCriteria: [
            "Principle adherence score > 0.8",
            "Code reviews pass",
          ],
        },
        riskLevel: "medium",
        estimatedEffort: {
          timeInHours: 19,
          complexity: "complex",
          skillLevel: "senior",
          dependencies: ["Architecture documentation"],
        },
      });
    }

    return recommendations;
  }

  /**
   * Identifies risk factors
   */
  private identifyRiskFactors(
    codeQuality: CodeQualityAnalysis,
    architecturalPatterns: ArchitecturalPatternAnalysis,
    businessLogic: BusinessLogicDefinition
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Technical debt risk
    if (architecturalPatterns.architecturalDebt.length > 0) {
      const totalDebt = architecturalPatterns.architecturalDebt.reduce(
        (sum, debt) => sum + debt.totalCost,
        0
      );
      if (totalDebt > 100) {
        risks.push({
          type: "technical-debt",
          severity: "high",
          probability: "high",
          impact: "Increased development time and maintenance costs",
          description: `Accumulated technical debt of ${totalDebt} units detected`,
          mitigation: {
            approach: "prevention",
            actions: [
              {
                description: "Implement debt tracking",
                timeline: "1 week",
                responsible: "development team",
              },
              {
                description: "Schedule debt payoff sprints",
                timeline: "monthly",
                responsible: "tech lead",
              },
              {
                description: "Code review improvements",
                timeline: "ongoing",
                responsible: "all developers",
              },
            ],
            timeline: "3 months",
            cost: "high",
            effectiveness: 0.8,
          },
          indicators: [
            "Increasing bug reports",
            "Slower feature delivery",
            "Developer frustration",
          ],
        });
      }
    }

    // Security vulnerability risk
    if (codeQuality.security.score < 60) {
      risks.push({
        type: "security-vulnerability",
        severity: "critical",
        probability: "medium",
        impact: "Data breach, compliance violations, reputation damage",
        description: "Low security score indicates potential vulnerabilities",
        mitigation: {
          approach: "detection",
          actions: [
            {
              description: "Implement security scanning",
              timeline: "1 week",
              responsible: "security team",
            },
            {
              description: "Security training for developers",
              timeline: "2 weeks",
              responsible: "HR",
            },
            {
              description: "Regular penetration testing",
              timeline: "quarterly",
              responsible: "external vendor",
            },
          ],
          timeline: "1 month",
          cost: "medium",
          effectiveness: 0.9,
        },
        indicators: [
          "Failed security scans",
          "Unusual access patterns",
          "Data anomalies",
        ],
      });
    }

    // Performance bottleneck risk
    if (codeQuality.performance.score < 50) {
      risks.push({
        type: "performance-bottleneck",
        severity: "medium",
        probability: "high",
        impact: "Poor user experience, increased infrastructure costs",
        description: "Performance metrics indicate potential bottlenecks",
        mitigation: {
          approach: "prevention",
          actions: [
            {
              description: "Performance monitoring setup",
              timeline: "1 week",
              responsible: "DevOps team",
            },
            {
              description: "Code optimization sprints",
              timeline: "2 weeks",
              responsible: "development team",
            },
            {
              description: "Load testing implementation",
              timeline: "1 week",
              responsible: "QA team",
            },
          ],
          timeline: "1 month",
          cost: "medium",
          effectiveness: 0.7,
        },
        indicators: [
          "Slow response times",
          "High resource usage",
          "User complaints",
        ],
      });
    }

    // Business continuity risk
    if (
      businessLogic.quality.reliability < 70 &&
      businessLogic.quality.overallScore < 60
    ) {
      risks.push({
        type: "business-continuity",
        severity: "high",
        probability: "medium",
        impact: "Service disruptions, revenue loss, customer dissatisfaction",
        description:
          "Low reliability in business logic may cause service interruptions",
        mitigation: {
          approach: "response",
          actions: [
            {
              description: "Implement circuit breakers",
              timeline: "2 weeks",
              responsible: "development team",
            },
            {
              description: "Add monitoring and alerting",
              timeline: "1 week",
              responsible: "DevOps team",
            },
            {
              description: "Create incident response plan",
              timeline: "1 week",
              responsible: "operations team",
            },
          ],
          timeline: "1 month",
          cost: "high",
          effectiveness: 0.85,
        },
        indicators: [
          "Service outages",
          "Error rate spikes",
          "Customer support tickets",
        ],
      });
    }

    return risks;
  }

  /**
   * Identifies optimization opportunities
   */
  private identifyOptimizationOpportunities(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition,
    codeQuality: CodeQualityAnalysis
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Bundle size optimization
    if (
      componentContext.components.some((c) => !c.performance.lazyLoading.isLazy)
    ) {
      opportunities.push({
        type: "bundle-size",
        impact: "medium",
        effort: "low",
        description:
          "Implement lazy loading for components to reduce initial bundle size",
        currentState: "All components loaded synchronously",
        proposedState: "Components loaded on demand with lazy loading",
        benefits: [
          {
            type: "performance",
            value: "30% reduction in initial load time",
            quantifiable: true,
          },
          {
            type: "user-experience",
            value: "Faster time to interactive",
            quantifiable: false,
          },
          {
            type: "resource-usage",
            value: "Reduced memory consumption",
            quantifiable: false,
          },
        ],
        prerequisites: [
          "React.lazy support",
          "Suspense boundary implementation",
        ],
        metrics: {
          baseline: { bundleSize: "500KB", loadTime: "3s" },
          target: { bundleSize: "350KB", loadTime: "2.1s" },
          measurement: "Bundle analyzer and performance metrics",
        },
      });
    }

    // Memory optimization
    const heavyFunctions = functionContext.functions.filter(
      (f) =>
        f.complexity.cyclomaticComplexity > 10 && !f.reactSpecific?.isComponent
    );
    if (heavyFunctions.length > 0) {
      opportunities.push({
        type: "memory",
        impact: "medium",
        effort: "medium",
        description: "Optimize memory usage in complex functions",
        currentState: `${heavyFunctions.length} functions with high complexity`,
        proposedState: "Optimized functions with reduced memory footprint",
        benefits: [
          {
            type: "performance",
            value: "20% memory reduction",
            quantifiable: true,
          },
          {
            type: "stability",
            value: "Reduced memory leaks",
            quantifiable: false,
          },
          {
            type: "scalability",
            value: "Better performance under load",
            quantifiable: false,
          },
        ],
        prerequisites: ["Memory profiling", "Performance baseline"],
        metrics: {
          baseline: {
            memoryUsage: "Current levels",
            gcFrequency: "Current frequency",
          },
          target: {
            memoryUsage: "20% reduction",
            gcFrequency: "30% less frequent",
          },
          measurement: "Browser dev tools and memory profilers",
        },
      });
    }

    // Runtime performance optimization
    if (codeQuality.performance.score < 80) {
      opportunities.push({
        type: "runtime",
        impact: "high",
        effort: "medium",
        description: "Implement runtime performance optimizations",
        currentState: `Performance score: ${codeQuality.performance.score}`,
        proposedState: "Optimized runtime with score > 90",
        benefits: [
          {
            type: "performance",
            value: "40% faster execution",
            quantifiable: true,
          },
          {
            type: "user-experience",
            value: "Smoother interactions",
            quantifiable: false,
          },
          {
            type: "efficiency",
            value: "Better resource utilization",
            quantifiable: false,
          },
        ],
        prerequisites: ["Performance benchmarks", "Profiling tools"],
        metrics: {
          baseline: { executionTime: "Current", cpuUsage: "Current" },
          target: { executionTime: "40% faster", cpuUsage: "25% reduction" },
          measurement: "Performance API and profiling tools",
        },
      });
    }

    // Maintainability optimization
    if (codeQuality.maintainability.score < 70) {
      opportunities.push({
        type: "maintainability",
        impact: "high",
        effort: "high",
        description: "Improve code maintainability through refactoring",
        currentState: `Maintainability score: ${codeQuality.maintainability.score}`,
        proposedState: "Well-structured, maintainable codebase",
        benefits: [
          {
            type: "development-speed",
            value: "25% faster feature development",
            quantifiable: true,
          },
          {
            type: "bug-reduction",
            value: "50% fewer bugs",
            quantifiable: true,
          },
          {
            type: "developer-satisfaction",
            value: "Improved developer experience",
            quantifiable: false,
          },
        ],
        prerequisites: ["Refactoring plan", "Test coverage"],
        metrics: {
          baseline: {
            maintainabilityIndex: "Current",
            codeComplexity: "Current",
          },
          target: {
            maintainabilityIndex: "> 70",
            codeComplexity: "< 10 average",
          },
          measurement: "Static analysis tools and code metrics",
        },
      });
    }

    return opportunities;
  }

  // Helper methods for semantic analysis

  private categorizeUtilityFunctions(functions: FunctionDefinition[]): string {
    const categories = functions.map((f) => {
      if (f.patterns.includes("data-transformation")) return "data processing";
      if (f.patterns.includes("validation")) return "validation";
      if (f.patterns.includes("api-integration")) return "API integration";
      return "general utilities";
    });

    const primaryCategory = categories.reduce((a, b, _, arr) =>
      arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length
        ? a
        : b
    );

    return primaryCategory;
  }

  private isDomainType(typeName: string): boolean {
    const domainIndicators = [
      "User",
      "Order",
      "Product",
      "Customer",
      "Account",
      "Payment",
      "Invoice",
    ];
    return domainIndicators.some((indicator) => typeName.includes(indicator));
  }

  private classifyDomainType(
    type: TypeDefinition
  ): "entity" | "value-object" | "service" | "aggregate" | "repository" {
    if (type.name.toLowerCase().includes("service")) return "service";
    if (type.name.toLowerCase().includes("repository")) return "repository";
    if (
      type.kind === "interface" &&
      type.properties &&
      type.properties.length > 5
    )
      return "entity";
    if (type.kind === "type-alias") return "value-object";
    return "entity";
  }

  private extractTypeRelationships(
    type: TypeDefinition,
    typeContext: TypeContext
  ): ConceptRelationship[] {
    return (
      type.extends?.map((extended) => ({
        type: "inheritance" as const,
        target: extended,
        strength: "strong" as const,
      })) || []
    );
  }

  private analyzePatternUsage(
    pattern: string,
    content: string
  ): TechnicalUsage {
    const occurrences = (content.match(new RegExp(pattern, "gi")) || []).length;
    const frequency =
      occurrences > 5
        ? "extensive"
        : occurrences > 2
        ? "frequent"
        : occurrences > 0
        ? "occasional"
        : "rare";

    return {
      frequency,
      depth: "moderate",
      appropriateness: 0.8,
      mastery: 0.7,
    };
  }

  private calculatePatternEffectiveness(
    pattern: string,
    componentContext: ComponentContext
  ): number {
    // Simple heuristic based on pattern usage and component quality
    const baseEffectiveness = 0.7;
    // Calculate overall score from available metrics
    const overallScore =
      (componentContext.quality.testabilityCoverage +
        componentContext.quality.accessibilityScore +
        componentContext.quality.performanceScore +
        componentContext.quality.maintainabilityScore +
        componentContext.quality.reusabilityScore) /
      5;
    const qualityBonus = (overallScore / 100) * 0.3;
    return Math.min(1.0, baseEffectiveness + qualityBonus);
  }

  private getPatternAlternatives(pattern: string): AlternativeOption[] {
    const alternatives: { [key: string]: AlternativeOption[] } = {
      "functional-component": [
        {
          name: "Class Component",
          advantages: ["Lifecycle methods", "Error boundaries"],
          disadvantages: ["More verbose", "Harder to test"],
          migrationPath: "Convert to class syntax",
          feasibility: 0.8,
        },
      ],
      "custom-hook": [
        {
          name: "HOC Pattern",
          advantages: ["Component reuse", "Props manipulation"],
          disadvantages: ["Wrapper hell", "Complex debugging"],
          migrationPath: "Convert hook to HOC",
          feasibility: 0.6,
        },
      ],
    };

    return alternatives[pattern] || [];
  }

  private calculateConceptualComplexity(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): number {
    let complexity = 0;
    complexity += functionContext.functions.length * 0.5;
    complexity += componentContext.components.length * 1.0;
    complexity += businessLogic.operations.length * 1.5;
    return Math.min(10, complexity);
  }

  private calculateInteractionComplexity(
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): number {
    let complexity = 0;
    complexity += componentContext.relationships.length * 0.5;
    complexity += businessLogic.workflows.length * 2.0;
    complexity += businessLogic.dependencies.apis.length * 1.0;
    return Math.min(10, complexity);
  }

  private calculateDataComplexity(
    businessLogic: BusinessLogicDefinition
  ): number {
    let complexity = 0;
    complexity += businessLogic.transformations.length * 1.0;
    complexity += businessLogic.validations.length * 0.5;
    complexity += businessLogic.dependencies.databases.length * 2.0;
    return Math.min(10, complexity);
  }

  private calculateAlgorithmicComplexity(
    functionContext: FunctionContext
  ): number {
    const avgComplexity = functionContext.complexity.averageComplexity;
    return Math.min(10, avgComplexity);
  }

  private analyzeComplexityTrends(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): ComplexityTrend[] {
    return [
      {
        metric: "Function Complexity",
        direction: "stable",
        rate: 0,
        projection: "Complexity expected to remain stable",
      },
      {
        metric: "Component Complexity",
        direction: "stable",
        rate: 0,
        projection: "Component complexity within acceptable range",
      },
    ];
  }

  private analyzeMaintainability(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext
  ): MaintainabilityMetrics {
    const functionMaintainability =
      functionContext.functions.length > 0
        ? functionContext.functions.reduce(
            (sum, f) => sum + (f.pure ? 10 : 5),
            0
          ) / functionContext.functions.length
        : 10;

    const componentMaintainability =
      componentContext.components.length > 0
        ? componentContext.quality.maintainabilityScore
        : 10;

    const typeMaintainability =
      typeContext.definitions.length > 0
        ? (typeContext.definitions.filter((t) => t.description).length /
            typeContext.definitions.length) *
          10
        : 10;

    return {
      score:
        (functionMaintainability +
          componentMaintainability +
          typeMaintainability) /
        3,
      factors: [
        {
          name: "Function purity",
          impact: functionMaintainability,
          description: "Pure functions are easier to maintain",
        },
        {
          name: "Component structure",
          impact: componentMaintainability,
          description: "Well-structured components",
        },
        {
          name: "Type documentation",
          impact: typeMaintainability,
          description: "Documented types improve understanding",
        },
      ],
      trends: ["stable"],
      projections: ["Maintainability expected to remain stable"],
    };
  }

  private analyzeCohesion(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): CohesionAnalysis {
    const functionalCohesion =
      this.calculateFunctionalCohesion(functionContext);
    const componentCohesion = this.calculateComponentCohesion(componentContext);
    const businessCohesion = this.calculateBusinessCohesion(businessLogic);

    return {
      score: (functionalCohesion + componentCohesion + businessCohesion) / 3,
      type:
        functionalCohesion > 8
          ? "functional"
          : functionalCohesion > 6
          ? "sequential"
          : "logical",
      strengths: ["Single responsibility focus", "Clear purpose definition"],
      weaknesses:
        functionalCohesion < 6
          ? ["Mixed responsibilities", "Unclear purpose"]
          : [],
      improvements:
        functionalCohesion < 7
          ? ["Separate concerns", "Extract utilities"]
          : [],
    };
  }

  private analyzeCoupling(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): CouplingAnalysis {
    const functionCoupling = this.calculateFunctionCoupling(functionContext);
    const componentCoupling = this.calculateComponentCoupling(componentContext);

    return {
      score: (functionCoupling + componentCoupling) / 2,
      type:
        functionCoupling > 8
          ? "loose"
          : functionCoupling > 5
          ? "medium"
          : "tight",
      dependencies: functionContext.callGraph.length,
      strengths:
        functionCoupling > 7
          ? ["Low dependency count", "Clear interfaces"]
          : [],
      weaknesses:
        functionCoupling < 5
          ? ["High dependency count", "Complex relationships"]
          : [],
      improvements:
        functionCoupling < 6
          ? ["Reduce dependencies", "Use dependency injection"]
          : [],
    };
  }

  // Additional helper methods for metrics calculation
  private calculateFunctionalCohesion(
    functionContext: FunctionContext
  ): number {
    if (functionContext.functions.length === 0) return 10;

    const purposeGroups = functionContext.functions.reduce((groups, func) => {
      const purpose = func.patterns[0] || "utility";
      groups[purpose] = (groups[purpose] || 0) + 1;
      return groups;
    }, {} as { [key: string]: number });

    const maxGroupSize = Math.max(...Object.values(purposeGroups));
    const cohesionRatio = maxGroupSize / functionContext.functions.length;

    return cohesionRatio * 10;
  }

  private calculateComponentCohesion(
    componentContext: ComponentContext
  ): number {
    if (componentContext.components.length === 0) return 10;

    const categoryGroups = componentContext.components.reduce(
      (groups, comp) => {
        groups[comp.category] = (groups[comp.category] || 0) + 1;
        return groups;
      },
      {} as { [key: string]: number }
    );

    const maxGroupSize = Math.max(...Object.values(categoryGroups));
    const cohesionRatio = maxGroupSize / componentContext.components.length;

    return cohesionRatio * 10;
  }

  private calculateBusinessCohesion(
    businessLogic: BusinessLogicDefinition
  ): number {
    if (businessLogic.operations.length === 0) return 10;

    // All operations in same domain indicates good cohesion
    return businessLogic.domain === "general" ? 6 : 9;
  }

  private calculateFunctionCoupling(functionContext: FunctionContext): number {
    if (functionContext.functions.length === 0) return 10;

    const avgDependencies =
      functionContext.functions.reduce(
        (sum, func) => sum + func.dependencies.length,
        0
      ) / functionContext.functions.length;

    // Lower dependencies = higher score (less coupling)
    return Math.max(0, 10 - avgDependencies);
  }

  private calculateComponentCoupling(
    componentContext: ComponentContext
  ): number {
    if (componentContext.components.length === 0) return 10;

    const avgDependencies =
      componentContext.components.reduce(
        (sum, comp) => sum + comp.dependencies.internalComponents.length,
        0
      ) / componentContext.components.length;

    return Math.max(0, 10 - avgDependencies);
  }

  private identifyArchitecturalLayer(
    filePath: string,
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): LayerInfo {
    let identifiedLayer: ApplicationLayer = "utility";
    let layerPurity = 1.0;
    const crossLayerDependencies: CrossLayerDependency[] = [];
    const layerViolations: LayerViolation[] = [];

    // Determine layer based on file path patterns
    if (filePath.includes("/components/") || filePath.includes("/ui/")) {
      identifiedLayer = "presentation";
    } else if (filePath.includes("/services/") || filePath.includes("/api/")) {
      identifiedLayer = "business";
    } else if (
      filePath.includes("/data/") ||
      filePath.includes("/repositories/")
    ) {
      identifiedLayer = "data";
    } else if (filePath.includes("/utils/") || filePath.includes("/helpers/")) {
      identifiedLayer = "utility";
    } else if (filePath.includes("/domain/") || filePath.includes("/models/")) {
      identifiedLayer = "domain";
    }

    // Analyze layer purity based on dependencies
    if (componentContext.components.length > 0) {
      const component = componentContext.components[0];

      // Check for layer violations
      if (
        identifiedLayer === "presentation" &&
        component.dependencies.externalLibraries.length > 0 // Changed from externalServices to externalLibraries
      ) {
        layerPurity -= 0.3;
        layerViolations.push({
          description:
            "Presentation layer directly accessing external services",
          severity: "high",
          recommendation: "Move service calls to business layer",
        });
      }

      if (
        identifiedLayer === "domain" &&
        component.dependencies.internalComponents.some(
          (c) => c.relationship === "parent"
        )
      ) {
        layerPurity -= 0.2;
        layerViolations.push({
          description: "Domain layer has UI dependencies",
          severity: "medium",
          recommendation: "Remove UI dependencies from domain logic",
        });
      }
    }

    return {
      identifiedLayer,
      layerPurity: Math.max(0, layerPurity),
      crossLayerDependencies,
      layerViolations,
    };
  }

  /**
   * Analyzes separation of concerns
   */
  private analyzeSeparationOfConcerns(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): SeparationAnalysis {
    const concerns: IdentifiedConcern[] = [];
    const violations: SeparationViolation[] = [];
    const improvements: SeparationImprovement[] = [];

    // Identify concerns in functions
    functionContext.functions.forEach((func) => {
      const concernTypes = this.identifyFunctionConcerns(func);
      concernTypes.forEach((concernType) => {
        concerns.push({
          name: func.name,
          type: concernType,
          separation: concernTypes.length > 1 ? "mixed" : "good",
        });
      });

      // Check for mixed concerns
      if (concernTypes.length > 2) {
        violations.push({
          concern1: concernTypes[0],
          concern2: concernTypes[1],
          description: `Function ${func.name} mixes multiple concerns`,
          impact: "medium",
        });
      }
    });

    // Identify concerns in components
    componentContext.components.forEach((component) => {
      const hasBusinessLogic = component.reactInfo.hooks.some(
        (h) => h.type === "reducer"
      );
      const hasUILogic = component.reactInfo.jsxComplexity.elementCount > 0;
      const hasDataLogic = component.dependencies.externalLibraries.length > 0; // Changed from apis to externalLibraries

      if (hasBusinessLogic && hasUILogic && hasDataLogic) {
        violations.push({
          concern1: "business",
          concern2: "presentation",
          description: `Component ${component.name} mixes business, UI, and data concerns`,
          impact: "high",
        });

        improvements.push({
          description: `Split ${component.name} into container and presentation components`,
          effort: "medium",
          benefit: "high",
        });
      }
    });

    const separationScore = Math.max(0, 10 - violations.length * 2);
    const separation: SeparationQuality = {
      score: separationScore,
      level:
        separationScore > 8
          ? "excellent"
          : separationScore > 6
          ? "good"
          : separationScore > 4
          ? "fair"
          : "poor",
    };

    return {
      concerns,
      separation,
      violations,
      improvements,
    };
  }

  /**
   * Analyzes adherence to design principles
   */
  private analyzeDesignPrinciples(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): DesignPrincipleAdherence {
    const solid = this.analyzeSOLIDPrinciples(
      functionContext,
      componentContext
    );
    const dry = this.analyzeDRYPrinciple(functionContext, componentContext);
    const kiss = this.analyzeKISSPrinciple(functionContext, componentContext);
    const yagni = this.analyzeYAGNIPrinciple(
      functionContext,
      componentContext,
      businessLogic
    );

    const overallAdherence =
      ((solid.singleResponsibility.score +
        solid.openClosed.score +
        solid.liskovSubstitution.score +
        solid.interfaceSegregation.score +
        solid.dependencyInversion.score) /
        5 +
        dry.duplicationLevel / 10 +
        kiss.score / 10 +
        yagni.score / 10) /
      4;

    return {
      solid,
      dry,
      kiss,
      yagni,
      overallAdherence,
    };
  }

  /**
   * Identifies code smells
   */
  private identifyCodeSmells(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];

    // Long method smell
    functionContext.functions.forEach((func) => {
      if (func.complexity.linesOfCode > 50) {
        codeSmells.push({
          type: "long-method",
          severity: func.complexity.linesOfCode > 100 ? "high" : "medium",
          description: `Function ${func.name} has ${func.complexity.linesOfCode} lines`,
          location: `Function ${func.name}`,
          refactoringStrategy: {
            approach: "extract-method",
            steps: [
              "Identify logical blocks",
              "Extract blocks into separate methods",
              "Maintain original functionality",
            ],
            effort: "medium",
            risk: "low",
          },
          urgency: func.complexity.linesOfCode > 100 ? "high" : "medium",
        });
      }
    });

    // Large class smell (for components)
    componentContext.components.forEach((component) => {
      const totalMethods = component.structure.mainFunction
        ? 1
        : 0 +
          component.structure.helperFunctions.length +
          component.structure.renderMethods.length;

      if (totalMethods > 10) {
        codeSmells.push({
          type: "large-class",
          severity: totalMethods > 20 ? "high" : "medium",
          description: `Component ${component.name} has ${totalMethods} methods`,
          location: `Component ${component.name}`,
          refactoringStrategy: {
            approach: "extract-class",
            steps: [
              "Identify related methods",
              "Group into logical classes",
              "Extract to separate components",
            ],
            effort: "high",
            risk: "medium",
          },
          urgency: totalMethods > 20 ? "high" : "medium",
        });
      }
    });

    // Duplicate code smell
    const duplicateFunctions = this.findDuplicateFunctions(
      functionContext.functions
    );
    if (duplicateFunctions.length > 0) {
      codeSmells.push({
        type: "duplicate-code",
        severity: "medium",
        description: `${duplicateFunctions.length} functions with similar logic detected`,
        location: "Multiple functions",
        refactoringStrategy: {
          approach: "extract-method",
          steps: [
            "Identify common logic",
            "Extract to shared utility",
            "Replace duplicates with calls",
          ],
          effort: "medium",
          risk: "low",
        },
        urgency: "medium",
      });
    }

    return codeSmells;
  }

  /**
   * Calculates architectural debt
   */
  private calculateArchitecturalDebt(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): ArchitecturalDebt[] {
    const debts: ArchitecturalDebt[] = [];

    // Code debt from complex functions
    const complexFunctions = functionContext.functions.filter(
      (f) => f.complexity.cyclomaticComplexity > 10
    );

    if (complexFunctions.length > 0) {
      const principal = complexFunctions.length * 8; // hours
      const interest = principal * 0.1; // 10% monthly interest

      debts.push({
        type: "code-debt",
        principal,
        interest,
        totalCost: principal + interest,
        payoffStrategy: {
          approach: "incremental",
          timeline: "3 months",
          resources: ["Senior developer"],
          milestones: [
            "Refactor most complex function",
            "Add tests",
            "Complete refactoring",
          ],
        },
        timeToPayoff: "3 months",
      });
    }

    // Design debt from architectural violations
    const designViolations = componentContext.components.filter(
      (c) => c.patterns.antiPatterns.length > 0
    );

    if (designViolations.length > 0) {
      const principal = designViolations.length * 12; // hours
      const interest = principal * 0.15; // 15% monthly interest

      debts.push({
        type: "design-debt",
        principal,
        interest,
        totalCost: principal + interest,
        payoffStrategy: {
          approach: "gradual",
          timeline: "6 months",
          resources: ["Architect", "Senior developer"],
          milestones: [
            "Design review",
            "Refactoring plan",
            "Implementation",
            "Validation",
          ],
        },
        timeToPayoff: "6 months",
      });
    }

    // Test debt
    const untestedFunctions = functionContext.functions.filter((f) => !f.pure);
    if (untestedFunctions.length > 0) {
      const principal = untestedFunctions.length * 4; // hours
      const interest = principal * 0.2; // 20% monthly interest

      debts.push({
        type: "test-debt",
        principal,
        interest,
        totalCost: principal + interest,
        payoffStrategy: {
          approach: "incremental",
          timeline: "2 months",
          resources: ["QA engineer", "Developer"],
          milestones: [
            "Test framework setup",
            "Unit tests",
            "Integration tests",
          ],
        },
        timeToPayoff: "2 months",
      });
    }

    return debts;
  }

  /**
   * Detects design patterns in the code
   */
  private detectDesignPatterns(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    content: string
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Singleton pattern detection
    if (content.includes("getInstance") || content.includes("instance =")) {
      patterns.push({
        name: "Singleton",
        type: "creational",
        confidence: 0.8,
        implementation: {
          quality: "good",
          completeness: 0.8,
          adherence: 0.9,
          documentation: content.includes("/**") || content.includes("//"),
        },
        effectiveness: {
          score: 0.7,
          benefits: ["Controlled instantiation", "Global access"],
          drawbacks: ["Testing difficulties", "Hidden dependencies"],
          appropriateness: 0.7,
        },
        variants: [],
      });
    }

    // Observer pattern detection
    if (
      content.includes("subscribe") ||
      content.includes("addEventListener") ||
      content.includes("on(")
    ) {
      patterns.push({
        name: "Observer",
        type: "behavioral",
        confidence: 0.9,
        implementation: {
          quality: "good",
          completeness: 0.9,
          adherence: 0.8,
          documentation: true,
        },
        effectiveness: {
          score: 0.8,
          benefits: ["Loose coupling", "Dynamic relationships"],
          drawbacks: ["Memory leaks", "Complex debugging"],
          appropriateness: 0.8,
        },
        variants: [
          {
            name: "Event Emitter",
            description: "Node.js style event emission",
            usage: "common",
          },
        ],
      });
    }

    // Factory pattern detection
    if (content.includes("create") && content.includes("factory")) {
      patterns.push({
        name: "Factory",
        type: "creational",
        confidence: 0.7,
        implementation: {
          quality: "adequate",
          completeness: 0.7,
          adherence: 0.8,
          documentation: false,
        },
        effectiveness: {
          score: 0.8,
          benefits: ["Flexible object creation", "Encapsulation"],
          drawbacks: ["Additional complexity"],
          appropriateness: 0.8,
        },
        variants: [],
      });
    }

    // React-specific patterns
    componentContext.components.forEach((component) => {
      // HOC pattern
      if (component.reactInfo.isHOC) {
        patterns.push({
          name: "Higher-Order Component",
          type: "react",
          confidence: 0.9,
          implementation: {
            quality: "good",
            completeness: 0.8,
            adherence: 0.9,
            documentation: !!component.description,
          },
          effectiveness: {
            score: 0.7,
            benefits: ["Code reuse", "Cross-cutting concerns"],
            drawbacks: ["Wrapper hell", "Prop drilling"],
            appropriateness: 0.7,
          },
          variants: [],
        });
      }

      // Render props pattern
      if (component.reactInfo.isRenderProp) {
        patterns.push({
          name: "Render Props",
          type: "react",
          confidence: 0.8,
          implementation: {
            quality: "good",
            completeness: 0.8,
            adherence: 0.8,
            documentation: true,
          },
          effectiveness: {
            score: 0.8,
            benefits: ["Flexible rendering", "Logic sharing"],
            drawbacks: ["Complex nesting", "Performance concerns"],
            appropriateness: 0.8,
          },
          variants: [],
        });
      }
    });

    return patterns;
  }

  /**
   * Identifies missing pattern opportunities
   */
  private identifyMissingPatterns(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): MissingPatternOpportunity[] {
    const opportunities: MissingPatternOpportunity[] = [];

    // Strategy pattern opportunity
    const complexFunctions = functionContext.functions.filter(
      (f) =>
        f.complexity.cyclomaticComplexity > 8 &&
        f.patterns.includes("business-logic")
    );

    if (complexFunctions.length > 0) {
      opportunities.push({
        pattern: "Strategy Pattern",
        benefit: "Reduce complexity and improve maintainability",
        applicability: 0.8,
        implementationComplexity: "medium",
        expectedImpact: {
          maintainability: 0.3,
          performance: 0.0,
          testability: 0.2,
          reusability: 0.4,
        },
      });
    }

    // Command pattern opportunity
    const actionFunctions = functionContext.functions.filter(
      (f) =>
        f.name.toLowerCase().includes("handle") ||
        f.name.toLowerCase().includes("execute") ||
        f.patterns.includes("event-handling")
    );

    if (actionFunctions.length > 3) {
      opportunities.push({
        pattern: "Command Pattern",
        benefit: "Encapsulate actions and enable undo/redo functionality",
        applicability: 0.7,
        implementationComplexity: "medium",
        expectedImpact: {
          maintainability: 0.2,
          performance: -0.1,
          testability: 0.3,
          reusability: 0.5,
        },
      });
    }

    // Custom Hook opportunity
    const statefulComponents = componentContext.components.filter(
      (c) => c.reactInfo.state.length > 2 && c.reactInfo.hooks.length > 3
    );

    if (statefulComponents.length > 0) {
      opportunities.push({
        pattern: "Custom Hook",
        benefit: "Extract and reuse stateful logic",
        applicability: 0.9,
        implementationComplexity: "low",
        expectedImpact: {
          maintainability: 0.4,
          performance: 0.1,
          testability: 0.3,
          reusability: 0.6,
        },
      });
    }

    return opportunities;
  }

  /**
   * Identifies pattern misuse
   */
  private identifyPatternMisuse(
    detectedPatterns: DetectedPattern[],
    content: string
  ): PatternMisuseWarning[] {
    const warnings: PatternMisuseWarning[] = [];

    detectedPatterns.forEach((pattern) => {
      // Singleton misuse
      if (
        pattern.name === "Singleton" &&
        pattern.effectiveness.appropriateness < 0.5
      ) {
        warnings.push({
          pattern: "Singleton",
          issue: "Overused or inappropriately applied",
          severity: "medium",
          correction: "Consider dependency injection or factory pattern",
          consequences: [
            "Testing difficulties",
            "Hidden dependencies",
            "Global state issues",
          ],
        });
      }

      // HOC misuse
      if (
        pattern.name === "Higher-Order Component" &&
        pattern.implementation.quality === "poor"
      ) {
        warnings.push({
          pattern: "Higher-Order Component",
          issue: "Poor implementation leading to prop conflicts",
          severity: "high",
          correction: "Use custom hooks or render props instead",
          consequences: [
            "Prop drilling",
            "Naming conflicts",
            "Debugging complexity",
          ],
        });
      }

      // Observer pattern memory leaks
      if (
        pattern.name === "Observer" &&
        !content.includes("removeEventListener") &&
        !content.includes("unsubscribe")
      ) {
        warnings.push({
          pattern: "Observer",
          issue: "Missing cleanup in event listeners",
          severity: "high",
          correction: "Add proper cleanup in useEffect or componentWillUnmount",
          consequences: [
            "Memory leaks",
            "Performance degradation",
            "Unexpected behavior",
          ],
        });
      }
    });

    return warnings;
  }

  /**
   * Suggests pattern evolution
   */
  private suggestPatternEvolution(
    detectedPatterns: DetectedPattern[],
    functionContext: FunctionContext
  ): PatternEvolutionSuggestion[] {
    const suggestions: PatternEvolutionSuggestion[] = [];

    detectedPatterns.forEach((pattern) => {
      // HOC to hooks evolution
      if (
        pattern.name === "Higher-Order Component" &&
        pattern.effectiveness.score < 0.7
      ) {
        suggestions.push({
          currentPattern: "Higher-Order Component",
          suggestedPattern: "Custom Hook",
          rationale:
            "Custom hooks provide better composition and avoid wrapper hell",
          migrationPath: [
            "Extract stateful logic from HOC",
            "Create custom hook with same functionality",
            "Replace HOC usage with hook usage",
            "Remove HOC wrapper",
          ],
          benefits: [
            "Better composition",
            "Cleaner component tree",
            "Easier testing",
            "Better TypeScript support",
          ],
          risks: [
            "Breaking change",
            "Requires React 16.8+",
            "Different mental model",
          ],
        });
      }

      // Class to function component evolution
      if (pattern.name === "Class Component" && pattern.confidence > 0.8) {
        suggestions.push({
          currentPattern: "Class Component",
          suggestedPattern: "Function Component with Hooks",
          rationale:
            "Function components with hooks are the modern React pattern",
          migrationPath: [
            "Convert class to function",
            "Replace lifecycle methods with useEffect",
            "Replace setState with useState",
            "Update prop types",
          ],
          benefits: [
            "Smaller bundle size",
            "Better performance",
            "Simpler syntax",
            "Better tree shaking",
          ],
          risks: [
            "Different lifecycle semantics",
            "Potential behavior changes",
            "Team training required",
          ],
        });
      }
    });

    return suggestions;
  }

  // Helper methods for analysis

  private identifyFunctionConcerns(
    func: FunctionDefinition
  ): ("business" | "technical" | "infrastructure")[] {
    const concerns: ("business" | "technical" | "infrastructure")[] = [];

    if (
      func.patterns.includes("business-logic") ||
      func.patterns.includes("validation")
    ) {
      concerns.push("business");
    }

    if (
      func.patterns.includes("data-transformation") ||
      func.patterns.includes("utility-function")
    ) {
      concerns.push("technical");
    }

    if (
      func.patterns.includes("api-integration") ||
      func.sideEffects.some((e) => e.type === "api-call")
    ) {
      concerns.push("infrastructure");
    }

    return concerns.length > 0 ? concerns : ["technical"];
  }

  private analyzeSOLIDPrinciples(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): SOLIDAnalysis {
    // Single Responsibility Principle
    const srp = this.analyzeSingleResponsibility(
      functionContext,
      componentContext
    );

    // Open/Closed Principle
    const ocp = this.analyzeOpenClosed(functionContext, componentContext);

    // Liskov Substitution Principle
    const lsp = this.analyzeLiskovSubstitution(
      functionContext,
      componentContext
    );

    // Interface Segregation Principle
    const isp = this.analyzeInterfaceSegregation(
      functionContext,
      componentContext
    );

    // Dependency Inversion Principle
    const dip = this.analyzeDependencyInversion(
      functionContext,
      componentContext
    );

    return {
      singleResponsibility: srp,
      openClosed: ocp,
      liskovSubstitution: lsp,
      interfaceSegregation: isp,
      dependencyInversion: dip,
    };
  }

  private analyzeSingleResponsibility(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): ComplianceScore {
    let violations: string[] = [];
    let totalScore = 0;
    let itemCount = 0;

    // Analyze functions
    functionContext.functions.forEach((func) => {
      const concernCount = func.patterns.length;
      if (concernCount > 2) {
        violations.push(
          `Function ${func.name} has ${concernCount} different concerns`
        );
        totalScore += 3;
      } else {
        totalScore += 10;
      }
      itemCount++;
    });

    // Analyze components
    componentContext.components.forEach((component) => {
      const hasBusinessLogic = component.reactInfo.hooks.some(
        (h) => h.type === "reducer"
      );
      const hasUILogic = component.reactInfo.jsxComplexity.elementCount > 0;
      const hasDataLogic = component.dependencies.externalLibraries.some(
        (lib) =>
          lib.name.toLowerCase().includes("api") ||
          lib.name.toLowerCase().includes("fetch")
      ); // Changed from apis.length to checking externalLibraries for API-related dependencies

      const responsibilityCount = [
        hasBusinessLogic,
        hasUILogic,
        hasDataLogic,
      ].filter(Boolean).length;

      if (responsibilityCount > 2) {
        violations.push(
          `Component ${component.name} has multiple responsibilities`
        );
        totalScore += 4;
      } else {
        totalScore += 10;
      }
      itemCount++;
    });

    const score = itemCount > 0 ? totalScore / itemCount : 10;

    return {
      score,
      violations,
      recommendations:
        violations.length > 0
          ? [
              "Extract business logic into custom hooks",
              "Separate data fetching from UI components",
              "Create focused, single-purpose functions",
            ]
          : [],
    };
  }

  private analyzeOpenClosed(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): ComplianceScore {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Look for switch statements or long if-else chains
    functionContext.functions.forEach((func) => {
      if (func.complexity.cyclomaticComplexity > 8) {
        violations.push(
          `Function ${func.name} may violate Open/Closed principle with complex branching`
        );
      }
    });

    if (violations.length > 0) {
      recommendations.push(
        "Consider using strategy pattern for complex branching logic"
      );
      recommendations.push("Extract decision logic into configurable objects");
    }

    const score = Math.max(0, 10 - violations.length * 2);

    return {
      score,
      violations,
      recommendations,
    };
  }

  private analyzeLiskovSubstitution(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): ComplianceScore {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // In JavaScript/TypeScript, LSP violations are less common but can occur
    // with inheritance patterns or when functions don't handle all expected inputs

    componentContext.components.forEach((component) => {
      // Check for components that might violate LSP if they extend others
      if (
        component.reactInfo.isHOC &&
        component.patterns.antiPatterns.length > 0
      ) {
        violations.push(
          `HOC ${component.name} may not be substitutable with base component`
        );
      }
    });

    functionContext.functions.forEach((func) => {
      // Check for functions that might not handle all expected input types
      if (
        func.signature.parameters.some((p) => p.type === "any") &&
        func.sideEffects.length > 0
      ) {
        violations.push(
          `Function ${func.name} with 'any' parameters may violate LSP`
        );
      }
    });

    if (violations.length > 0) {
      recommendations.push(
        "Ensure all function overrides maintain the same contract"
      );
      recommendations.push("Use proper TypeScript types instead of any");
      recommendations.push("Test substitutability of components and functions");
    }

    const score = Math.max(0, 10 - violations.length * 3);

    return {
      score,
      violations,
      recommendations,
    };
  }

  private analyzeInterfaceSegregation(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): ComplianceScore {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for large interfaces or components with too many props
    componentContext.components.forEach((component) => {
      if (component.reactInfo.props.length > 15) {
        violations.push(
          `Component ${component.name} has ${component.reactInfo.props.length} props - interface too large`
        );
      }

      // Check for components that use only a subset of passed props
      const unusedProps = component.reactInfo.props.filter(
        (prop) =>
          !component.structure.mainFunction?.dependencies.some(
            (dep) => dep.name === prop.name
          )
      );

      if (unusedProps.length > component.reactInfo.props.length * 0.3) {
        violations.push(
          `Component ${component.name} ignores ${unusedProps.length} of its props`
        );
      }
    });

    // Check for functions with too many parameters
    functionContext.functions.forEach((func) => {
      if (func.signature.parameters.length > 7) {
        violations.push(
          `Function ${func.name} has ${func.signature.parameters.length} parameters - too many dependencies`
        );
      }
    });

    if (violations.length > 0) {
      recommendations.push("Break large interfaces into smaller, focused ones");
      recommendations.push(
        "Use object parameters for functions with many arguments"
      );
      recommendations.push(
        "Create specific prop interfaces for different use cases"
      );
    }

    const score = Math.max(0, 10 - violations.length * 2);

    return {
      score,
      violations,
      recommendations,
    };
  }

  private analyzeDependencyInversion(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): ComplianceScore {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for hard-coded dependencies
    functionContext.functions.forEach((func) => {
      const hardcodedDependencies = func.sideEffects.filter(
        (effect) =>
          effect.type === "api-call" && effect.description.includes("fetch")
      );

      if (hardcodedDependencies.length > 0) {
        violations.push(
          `Function ${func.name} has hard-coded API dependencies`
        );
      }
    });

    componentContext.components.forEach((component) => {
      // Check for components directly importing services
      const directServiceDependencies =
        component.dependencies.externalLibraries.filter(
          (
            service // Changed from externalServices to externalLibraries
          ) =>
            service.name.toLowerCase().includes("service") ||
            service.name.toLowerCase().includes("api")
        );

      if (directServiceDependencies.length > 0) {
        violations.push(
          `Component ${component.name} directly depends on concrete services`
        );
      }
    });

    if (violations.length > 0) {
      recommendations.push("Inject dependencies through props or context");
      recommendations.push(
        "Use abstract interfaces instead of concrete implementations"
      );
      recommendations.push(
        "Implement service abstractions for external dependencies"
      );
    }

    const score = Math.max(0, 10 - violations.length * 2);

    return {
      score,
      violations,
      recommendations,
    };
  }

  private analyzeDRYPrinciple(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): DRYAnalysis {
    const duplicatedConcepts: DuplicatedConcept[] = [];
    const consolidationOpportunities: ConsolidationOpportunity[] = [];

    // Find duplicate function logic
    const functionGroups = this.groupSimilarFunctions(
      functionContext.functions
    );
    Object.entries(functionGroups).forEach(([pattern, functions]) => {
      if (functions.length > 1) {
        duplicatedConcepts.push({
          concept: pattern,
          instances: functions.map((f) => f.name),
          similarity: 0.8,
          consolidationComplexity: functions.length > 3 ? "high" : "medium",
        });

        consolidationOpportunities.push({
          description: `Extract common ${pattern} logic into utility function`,
          effort: "medium",
          benefit: "high",
          riskLevel: "low",
        });
      }
    });

    // Find duplicate component patterns
    const componentGroups = this.groupSimilarComponents(
      componentContext.components
    );
    Object.entries(componentGroups).forEach(([pattern, components]) => {
      if (components.length > 1) {
        duplicatedConcepts.push({
          concept: `${pattern} component pattern`,
          instances: components.map((c) => c.name),
          similarity: 0.7,
          consolidationComplexity: "medium",
        });

        consolidationOpportunities.push({
          description: `Create reusable ${pattern} component`,
          effort: "high",
          benefit: "high",
          riskLevel: "medium",
        });
      }
    });

    const duplicationLevel = Math.max(0, 10 - duplicatedConcepts.length);

    return {
      duplicationLevel,
      duplicatedConcepts,
      consolidationOpportunities,
    };
  }

  private analyzeKISSPrinciple(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): KISSAnalysis {
    const complexityViolations: string[] = [];
    const simplificationOpportunities: string[] = [];

    // Check function complexity
    functionContext.functions.forEach((func) => {
      if (func.complexity.cyclomaticComplexity > 10) {
        complexityViolations.push(
          `Function ${func.name} is overly complex (complexity: ${func.complexity.cyclomaticComplexity})`
        );
        simplificationOpportunities.push(
          `Break down ${func.name} into smaller functions`
        );
      }

      if (func.signature.parameters.length > 5) {
        complexityViolations.push(
          `Function ${func.name} has too many parameters (${func.signature.parameters.length})`
        );
        simplificationOpportunities.push(
          `Use object parameter for ${func.name}`
        );
      }
    });

    // Check component complexity
    componentContext.components.forEach((component) => {
      if (component.reactInfo.jsxComplexity.nestingDepth > 6) {
        complexityViolations.push(
          `Component ${component.name} has deep JSX nesting (${component.reactInfo.jsxComplexity.nestingDepth})`
        );
        simplificationOpportunities.push(
          `Extract nested JSX from ${component.name} into sub-components`
        );
      }

      if (component.reactInfo.hooks.length > 8) {
        complexityViolations.push(
          `Component ${component.name} uses too many hooks (${component.reactInfo.hooks.length})`
        );
        simplificationOpportunities.push(
          `Extract hook logic from ${component.name} into custom hooks`
        );
      }
    });

    const score = Math.max(0, 10 - complexityViolations.length);

    return {
      score,
      complexityViolations,
      simplificationOpportunities,
    };
  }

  private analyzeYAGNIPrinciple(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    businessLogic: BusinessLogicDefinition
  ): YAGNIAnalysis {
    const overEngineering: string[] = [];
    const unnecessaryFeatures: string[] = [];

    // Check for over-engineered solutions
    functionContext.functions.forEach((func) => {
      // Functions with high complexity but simple purpose might be over-engineered
      if (
        func.complexity.cyclomaticComplexity > 8 &&
        func.patterns.includes("utility-function")
      ) {
        overEngineering.push(
          `Function ${func.name} might be over-engineered for utility purpose`
        );
      }

      // Functions with many generics might be over-abstracted
      if (func.signature.generics.length > 3) {
        overEngineering.push(`Function ${func.name} uses excessive generics`);
      }
    });

    componentContext.components.forEach((component) => {
      // Components with many prop types might be over-flexible
      if (component.reactInfo.props.length > 20) {
        overEngineering.push(
          `Component ${component.name} might be over-configurable`
        );
      }

      // Components that handle too many different use cases
      if (component.patterns.usagePatterns.length > 5) {
        unnecessaryFeatures.push(
          `Component ${component.name} handles too many different use cases`
        );
      }
    });

    // Check business logic for unnecessary complexity
    businessLogic.operations.forEach((operation) => {
      if (operation.complexity === "high" && operation.inputs.length > 10) {
        overEngineering.push(
          `Operation ${operation.name} might be over-parameterized`
        );
      }
    });

    const score = Math.max(
      0,
      10 - overEngineering.length - unnecessaryFeatures.length
    );

    return {
      score,
      overEngineering,
      unnecessaryFeatures,
    };
  }

  private analyzeDependencyStrength(
    dependencyContext: DependencyContext
  ): DependencyStrengthAnalysis {
    const strongDependencies: StrongDependency[] = [];
    const weakDependencies: WeakDependency[] = [];
    const circularDependencies: CircularDependency[] = [];

    // Analyze internal dependencies
    dependencyContext.internal.forEach((dep) => {
      if (
        dep.relationship === "parent-child" ||
        dep.relationship === "utility-consumer"
      ) {
        strongDependencies.push({
          from: "current-file",
          to: dep.path,
          type: "tight-coupling",
          strength: 0.8,
          reason: `${dep.relationship} dependency`,
        });
      } else {
        weakDependencies.push({
          from: "current-file",
          to: dep.path,
          type: "interface",
          strength: 0.3,
          reason: `${dep.relationship} dependency`,
        });
      }
    });

    // Simple circular dependency detection (would need more sophisticated analysis for real cycles)
    const dependencyPaths = dependencyContext.internal.map((dep) => dep.path);
    const potentialCycles = dependencyPaths.filter(
      (path, index) => dependencyPaths.indexOf(path) !== index
    );

    if (potentialCycles.length > 0) {
      circularDependencies.push({
        cycle: potentialCycles,
        severity: "medium",
        breakingPoint: potentialCycles[0],
        resolution: "Extract common interface or move shared logic",
      });
    }

    const dependencyHealth: DependencyHealth = {
      score: Math.max(
        0,
        10 - strongDependencies.length - circularDependencies.length * 3
      ),
      issues: [
        ...strongDependencies.map((dep) => `Strong coupling to ${dep.to}`),
        ...circularDependencies.map(
          (cycle) => `Circular dependency: ${cycle.cycle.join(" -> ")}`
        ),
      ],
      strengths:
        weakDependencies.length > strongDependencies.length
          ? ["Good use of loose coupling"]
          : [],
      recommendations: [
        "Reduce strong dependencies through dependency injection",
        "Break circular dependencies",
        "Use interfaces to reduce coupling",
      ],
    };

    return {
      strongDependencies,
      weakDependencies,
      circularDependencies,
      dependencyHealth,
    };
  }

  private calculateCouplingMetrics(
    dependencyContext: DependencyContext,
    functionContext: FunctionContext
  ): CouplingMetrics {
    const afferentCoupling = dependencyContext.internal.length;
    const efferentCoupling = dependencyContext.external.length;
    const totalCoupling = afferentCoupling + efferentCoupling;
    const instability =
      totalCoupling > 0 ? efferentCoupling / totalCoupling : 0;

    let coupling: "loose" | "medium" | "tight";
    if (totalCoupling < 5) coupling = "loose";
    else if (totalCoupling < 10) coupling = "medium";
    else coupling = "tight";

    return {
      afferentCoupling,
      efferentCoupling,
      instability,
      coupling,
    };
  }

  private calculateCohesionMetrics(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): CohesionMetrics {
    // Calculate cohesion based on how related the functions/components are
    const functionPurposes = functionContext.functions.map(
      (f) => f.patterns[0] || "utility"
    );
    const purposeGroups = functionPurposes.reduce((groups, purpose) => {
      groups[purpose] = (groups[purpose] || 0) + 1;
      return groups;
    }, {} as { [key: string]: number });

    const maxGroupSize = Math.max(...Object.values(purposeGroups), 0);
    const totalFunctions = functionContext.functions.length;

    const cohesionLevel =
      totalFunctions > 0 ? maxGroupSize / totalFunctions : 1;
    const cohesionType =
      cohesionLevel > 0.8
        ? "functional"
        : cohesionLevel > 0.6
        ? "sequential"
        : "logical";
    const score = cohesionLevel * 10;

    return {
      cohesionLevel,
      cohesionType,
      score,
    };
  }

  private calculateAbstractness(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): number {
    const totalElements =
      functionContext.functions.length + componentContext.components.length;
    if (totalElements === 0) return 0;

    // Count abstract elements (interfaces, abstract functions, HOCs)
    const abstractFunctions = functionContext.functions.filter(
      (f) =>
        f.name.includes("Abstract") ||
        f.signature.returnType.includes("interface")
    ).length;

    const abstractComponents = componentContext.components.filter(
      (c) => c.reactInfo.isHOC || c.type === "higher-order-component"
    ).length;

    return (abstractFunctions + abstractComponents) / totalElements;
  }

  private calculateReadabilityMetrics(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): ReadabilityMetrics {
    let score = 10;

    // Deduct for complex functions
    const complexFunctions = functionContext.functions.filter(
      (f) => f.complexity.cyclomaticComplexity > 10
    );
    score -= complexFunctions.length * 1.5;

    // Deduct for long functions
    const longFunctions = functionContext.functions.filter(
      (f) => f.complexity.linesOfCode > 50
    );
    score -= longFunctions.length * 1;

    // Deduct for unclear naming
    const unclearNames = functionContext.functions.filter(
      (f) =>
        f.name.length < 3 || f.name.includes("temp") || f.name.includes("data")
    );
    score -= unclearNames.length * 0.5;

    // Add for documentation
    const documentedFunctions = functionContext.functions.filter(
      (f) => f.description
    );
    score += documentedFunctions.length * 0.5;

    return {
      score: Math.max(0, Math.min(10, score)),
    };
  }

  private calculateTestabilityMetrics(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): TestabilityMetrics {
    let score = 10;

    // Deduct for impure functions
    const impureFunctions = functionContext.functions.filter((f) => !f.pure);
    score -= impureFunctions.length * 1;

    // Deduct for functions with side effects
    const sideEffectFunctions = functionContext.functions.filter(
      (f) => f.sideEffects.length > 0
    );
    score -= sideEffectFunctions.length * 1.5;

    // Deduct for components with complex state
    const complexStateComponents = componentContext.components.filter(
      (c) => c.reactInfo.state.length > 5 || c.reactInfo.hooks.length > 8
    );
    score -= complexStateComponents.length * 2;

    return {
      score: Math.max(0, Math.min(10, score)),
    };
  }

  private calculatePerformanceMetrics(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): PerformanceMetrics {
    let score = 10;

    // Deduct for expensive operations
    const expensiveFunctions = functionContext.functions.filter(
      (f) =>
        f.complexity.cyclomaticComplexity > 15 || f.complexity.linesOfCode > 100
    );
    score -= expensiveFunctions.length * 2;

    // Deduct for unmemoized components
    const unmemoizedComponents = componentContext.components.filter(
      (c) =>
        !c.performance.memoization.reactMemo &&
        c.reactInfo.jsxComplexity.complexityScore > 20
    );
    score -= unmemoizedComponents.length * 1.5;

    // Add for performance optimizations
    const optimizedComponents = componentContext.components.filter(
      (c) =>
        c.performance.memoization.reactMemo || c.performance.lazyLoading.isLazy
    );
    score += optimizedComponents.length * 1;

    return {
      score: Math.max(0, Math.min(10, score)),
    };
  }

  private calculateSecurityMetrics(
    functionContext: FunctionContext,
    businessLogic: BusinessLogicDefinition
  ): SecurityMetrics {
    const vulnerabilities: SecurityVulnerability[] = [];
    let score = 10;

    // Check for potential security issues
    functionContext.functions.forEach((func) => {
      // Functions with eval or similar dangerous patterns
      if (func.dependencies.some((dep) => dep.name.includes("eval"))) {
        vulnerabilities.push({
          type: "Code Injection",
          severity: "critical",
          description: `Function ${func.name} uses eval or similar dangerous function`,
          location: func.name,
        });
        score -= 3;
      }

      // Functions handling sensitive data without validation
      if (
        func.patterns.includes("api-integration") &&
        !func.patterns.includes("validation")
      ) {
        vulnerabilities.push({
          type: "Input Validation",
          severity: "medium",
          description: `Function ${func.name} handles external data without validation`,
          location: func.name,
        });
        score -= 1;
      }
    });

    // Business logic security
    if (businessLogic.domain === "auth" || businessLogic.domain === "payment") {
      if (businessLogic.validations.length === 0) {
        vulnerabilities.push({
          type: "Business Logic",
          severity: "high",
          description: "Critical business logic lacks proper validation",
          location: "Business logic",
        });
        score -= 2;
      }
    }

    const riskLevel =
      score < 4
        ? "critical"
        : score < 6
        ? "high"
        : score < 8
        ? "medium"
        : "low";
    const complianceLevel =
      score > 8
        ? "strict"
        : score > 6
        ? "standard"
        : score > 4
        ? "basic"
        : "none";

    return {
      score: Math.max(0, score),
      vulnerabilities,
      complianceLevel,
      riskLevel,
    };
  }

  private calculateMaintainabilityScore(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext
  ): MaintainabilityScore {
    const factors: MaintainabilityFactor[] = [];
    let score = 10;
    let codeSmells = 0;
    let technicalDebt = 0;

    // Function maintainability
    const complexFunctions = functionContext.functions.filter(
      (f) => f.complexity.cyclomaticComplexity > 10
    );
    if (complexFunctions.length > 0) {
      factors.push({
        name: "Function Complexity",
        impact: -complexFunctions.length * 1.5,
        description: `${complexFunctions.length} functions with high complexity`,
      });
      score -= complexFunctions.length * 1.5;
      codeSmells += complexFunctions.length;
      technicalDebt += complexFunctions.length * 4; // hours
    }

    // Component maintainability
    const complexComponents = componentContext.components.filter(
      (c) => c.complexity === "high" || c.complexity === "very-high"
    );
    if (complexComponents.length > 0) {
      factors.push({
        name: "Component Complexity",
        impact: -complexComponents.length * 2,
        description: `${complexComponents.length} components with high complexity`,
      });
      score -= complexComponents.length * 2;
      codeSmells += complexComponents.length;
      technicalDebt += complexComponents.length * 6; // hours
    }

    // Type documentation
    const undocumentedTypes = typeContext.definitions.filter(
      (t) => !t.description
    );
    if (undocumentedTypes.length > 0) {
      factors.push({
        name: "Type Documentation",
        impact: -undocumentedTypes.length * 0.5,
        description: `${undocumentedTypes.length} types lack documentation`,
      });
      score -= undocumentedTypes.length * 0.5;
      technicalDebt += undocumentedTypes.length * 1; // hours
    }

    return {
      score: Math.max(0, score),
      factors,
      codeSmells,
      technicalDebt,
    };
  }

  private calculateReliabilityMetrics(
    functionContext: FunctionContext,
    businessLogic: BusinessLogicDefinition
  ): ReliabilityMetrics {
    let errorHandling = 10;
    let testCoverage = 5; // Assume low base coverage
    let faultTolerance = 8;

    // Error handling assessment
    const functionsWithErrorHandling = functionContext.functions.filter(
      (f) =>
        f.patterns.includes("error-handling") ||
        f.sideEffects.some((e) => e.type === "api-call")
    );

    if (functionsWithErrorHandling.length > 0) {
      const errorHandlingRatio =
        functionsWithErrorHandling.length / functionContext.functions.length;
      errorHandling = errorHandlingRatio * 10;
    }

    // Test coverage estimation (would need actual test analysis)
    const pureFunctions = functionContext.functions.filter((f) => f.pure);
    if (pureFunctions.length > 0) {
      testCoverage +=
        (pureFunctions.length / functionContext.functions.length) * 5;
    }

    // Fault tolerance assessment
    if (businessLogic.dependencies.apis.length > 0) {
      const apisWithErrorHandling = businessLogic.dependencies.apis.filter(
        (api) => api.errorHandling.retries > 0 || api.errorHandling.fallback
      );

      if (apisWithErrorHandling.length > 0) {
        faultTolerance =
          (apisWithErrorHandling.length /
            businessLogic.dependencies.apis.length) *
          10;
      } else {
        faultTolerance = 3; // Low fault tolerance without proper error handling
      }
    }

    const score = (errorHandling + testCoverage + faultTolerance) / 3;

    return {
      score,
      errorHandling,
      testCoverage,
      faultTolerance,
    };
  }

  private findDuplicateFunctions(
    functions: FunctionDefinition[]
  ): FunctionDefinition[] {
    const duplicates: FunctionDefinition[] = [];
    const seen = new Set<string>();

    functions.forEach((func) => {
      const signature = `${func.patterns.join(",")}:${
        func.signature.parameters.length
      }`;
      if (seen.has(signature)) {
        duplicates.push(func);
      } else {
        seen.add(signature);
      }
    });

    return duplicates;
  }

  private groupSimilarFunctions(functions: FunctionDefinition[]): {
    [pattern: string]: FunctionDefinition[];
  } {
    const groups: { [pattern: string]: FunctionDefinition[] } = {};

    functions.forEach((func) => {
      const primaryPattern = func.patterns[0] || "utility";
      if (!groups[primaryPattern]) {
        groups[primaryPattern] = [];
      }
      groups[primaryPattern].push(func);
    });

    // Only return groups with multiple functions
    return Object.fromEntries(
      Object.entries(groups).filter(([_, funcs]) => funcs.length > 1)
    );
  }

  private groupSimilarComponents(components: ComponentDefinition[]): {
    [pattern: string]: ComponentDefinition[];
  } {
    const groups: { [pattern: string]: ComponentDefinition[] } = {};

    components.forEach((component) => {
      const pattern = component.category;
      if (!groups[pattern]) {
        groups[pattern] = [];
      }
      groups[pattern].push(component);
    });

    // Only return groups with multiple components
    return Object.fromEntries(
      Object.entries(groups).filter(([_, comps]) => comps.length > 1)
    );
  }
}
