import {
  ContextualSummary,
  GeneratedPrompt,
  PromptStructure,
  PromptContext,
  TokenEstimate,
  FileContextType,
  ContextualSummariesConfig,
  DependencyContext,
} from "../types";
import { estimateTokenCount } from "./contextUtils";
import {
  SummaryTemplate,
  PromptOptimization,
  PromptPersonalization,
  AdaptivePromptFeatures,
  ContextualMetadata,
  SectionTemplate,
  FooterTemplate,
  HeaderTemplate,
  PromptConstraints,
  SectionFormat,
  SpecializationOptions,
  SpecializedUseCase,
} from "../types/summaryBuilder.types";
import { FunctionContext } from "../types/functionExtractor.types";
import { BusinessLogicDefinition } from "../types/businessLogicExtractor.types";
import { ComponentContext } from "../types/componentExtractor.types";
import { SemanticAnalysisResult } from "../types/semanticAnalysis.types";
import { TypeContext } from "../types/typeExtractor.types";

export class SummaryBuilder {
  private config: ContextualSummariesConfig;
  private templates: Map<string, SummaryTemplate>;
  private optimization: PromptOptimization;
  private personalization: PromptPersonalization;
  private adaptiveFeatures: AdaptivePromptFeatures;

  constructor(config: ContextualSummariesConfig) {
    this.config = config;
    this.templates = new Map();
    this.optimization = this.getDefaultOptimization();
    this.personalization = this.getDefaultPersonalization();
    this.adaptiveFeatures = this.getDefaultAdaptiveFeatures();
    this.initializeTemplates();
  }

  /**
   * Builds a complete contextual summary with optimized prompt
   */
  buildContextualSummary(
    filePath: string,
    fileType: FileContextType,
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext,
    businessLogic: BusinessLogicDefinition,
    dependencyContext: DependencyContext,
    semanticAnalysis: SemanticAnalysisResult,
    metadata?: ContextualMetadata
  ): ContextualSummary {
    // Select appropriate template
    const template = this.selectTemplate(fileType, semanticAnalysis);

    // Build prompt structure
    const promptStructure = this.buildPromptStructure(
      template,
      functionContext,
      componentContext,
      typeContext,
      businessLogic,
      dependencyContext,
      semanticAnalysis
    );

    // Generate prompt contexts
    const promptContexts = this.generatePromptContexts(
      template,
      functionContext,
      componentContext,
      typeContext,
      businessLogic,
      dependencyContext,
      semanticAnalysis
    );

    // Apply optimization
    const optimizedPrompt = this.optimizePrompt(
      promptStructure,
      promptContexts
    );

    // Calculate token estimate
    const tokenEstimate = this.calculateTokenEstimate(optimizedPrompt);

    // Build the complete summary
    return {
      filePath,
      fileName: this.extractFileName(filePath),
      fileType,
      purpose: semanticAnalysis.fileSemantics.primaryPurpose,
      complexity: semanticAnalysis.fileSemantics.complexity.overallComplexity,
      keyFeatures: this.extractKeyFeatures(semanticAnalysis),
      dependencies: dependencyContext,
      exports: this.buildExportContext(
        functionContext,
        componentContext,
        typeContext
      ),
      businessLogic: businessLogic,
      technicalContext: this.buildTechnicalContext(semanticAnalysis),
      usagePatterns: this.extractUsagePatterns(
        functionContext,
        componentContext
      ),
      prompt: {
        summary: optimizedPrompt.summary,
        structure: optimizedPrompt.structure,
        context: optimizedPrompt.contexts,
        tokens: tokenEstimate,
      },
    };
  }

  /**
   * Generates adaptive prompts based on context and user needs
   */
  generateAdaptivePrompt(
    contextualSummary: ContextualSummary,
    personalization: PromptPersonalization,
    constraints?: PromptConstraints
  ): GeneratedPrompt {
    const adaptedStructure = this.adaptPromptStructure(
      contextualSummary.prompt.structure,
      personalization,
      constraints
    );

    const adaptedContexts = this.adaptPromptContexts(
      contextualSummary.prompt.context,
      personalization,
      constraints
    );

    const summary = this.generateAdaptiveSummary(
      adaptedStructure,
      adaptedContexts,
      personalization
    );

    const tokens = this.calculateTokenEstimate({
      summary,
      structure: adaptedStructure,
      contexts: adaptedContexts,
    });

    return {
      summary,
      structure: adaptedStructure,
      context: adaptedContexts,
      tokens,
    };
  }

  /**
   * Creates specialized prompts for different use cases
   */
  createSpecializedPrompt(
    contextualSummary: ContextualSummary,
    useCase: SpecializedUseCase,
    options?: SpecializationOptions
  ): GeneratedPrompt {
    const specializedTemplate = this.getSpecializedTemplate(
      useCase,
      contextualSummary.fileType
    );

    const structure = this.buildSpecializedStructure(
      specializedTemplate,
      contextualSummary,
      options
    );

    const contexts = this.buildSpecializedContexts(
      specializedTemplate,
      contextualSummary,
      options
    );

    const summary = this.generateSpecializedSummary(
      structure,
      contexts,
      useCase,
      options
    );

    const tokens = this.calculateTokenEstimate({
      summary,
      structure,
      contexts,
    });

    return {
      summary,
      structure,
      context: contexts,
      tokens,
    };
  }

  /**
   * Selects the most appropriate template for the file type and analysis
   */
  private selectTemplate(
    fileType: FileContextType,
    semanticAnalysis: SemanticAnalysisResult
  ): SummaryTemplate {
    // Check for exact file type match
    const exactMatch = Array.from(this.templates.values()).find((template) =>
      template.fileTypes.includes(fileType)
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Fallback to complexity-based selection
    const complexity =
      semanticAnalysis.fileSemantics.complexity.overallComplexity;

    if (complexity === "very-high" || complexity === "high") {
      return (
        this.templates.get("detailed-technical") || this.getDefaultTemplate()
      );
    } else if (
      semanticAnalysis.fileSemantics.businessValue.businessCriticality ===
      "critical"
    ) {
      return (
        this.templates.get("business-focused") || this.getDefaultTemplate()
      );
    }

    return this.getDefaultTemplate();
  }

  /**
   * Builds the prompt structure based on template and analysis
   */
  private buildPromptStructure(
    template: SummaryTemplate,
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext,
    businessLogic: BusinessLogicDefinition,
    dependencyContext: DependencyContext,
    semanticAnalysis: SemanticAnalysisResult
  ): PromptStructure {
    const header = this.buildHeader(
      template.structure.header,
      semanticAnalysis
    );
    const keyPoints = this.buildKeyPoints(
      template,
      semanticAnalysis,
      functionContext,
      componentContext
    );
    const dependencies = this.buildDependenciesSection(dependencyContext);
    const exports = this.buildExportsSection(
      functionContext,
      componentContext,
      typeContext
    );
    const footer = this.buildFooter(
      template.structure.footer,
      semanticAnalysis
    );

    return {
      header,
      keyPoints,
      dependencies,
      exports,
      footer,
    };
  }

  /**
   * Generates prompt contexts for different sections
   */
  private generatePromptContexts(
    template: SummaryTemplate,
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext,
    businessLogic: BusinessLogicDefinition,
    dependencyContext: DependencyContext,
    semanticAnalysis: SemanticAnalysisResult
  ): PromptContext[] {
    const contexts: PromptContext[] = [];

    // Process each section template
    template.structure.sections.forEach((sectionTemplate) => {
      if (this.shouldIncludeSection(sectionTemplate, semanticAnalysis)) {
        const context = this.buildSectionContext(
          sectionTemplate,
          functionContext,
          componentContext,
          typeContext,
          businessLogic,
          dependencyContext,
          semanticAnalysis
        );

        if (context.content.trim()) {
          contexts.push(context);
        }
      }
    });

    // Sort contexts by priority
    contexts.sort(
      (a, b) =>
        this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority)
    );

    return contexts;
  }

  /**
   * Builds context for a specific section
   */
  private buildSectionContext(
    sectionTemplate: SectionTemplate,
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext,
    businessLogic: BusinessLogicDefinition,
    dependencyContext: DependencyContext,
    semanticAnalysis: SemanticAnalysisResult
  ): PromptContext {
    let content = "";
    let priority: "high" | "medium" | "low" = "medium";

    switch (sectionTemplate.id) {
      case "overview":
        content = this.buildOverviewContent(semanticAnalysis);
        priority = "high";
        break;

      case "structure":
        content = this.buildStructureContent(
          functionContext,
          componentContext,
          typeContext
        );
        priority = "high";
        break;

      case "dependencies":
        content = this.buildDependenciesContent(
          dependencyContext,
          semanticAnalysis
        );
        priority = "medium";
        break;

      case "exports":
        content = this.buildExportsContent(
          functionContext,
          componentContext,
          typeContext
        );
        priority = "medium";
        break;

      case "business-logic":
        content = this.buildBusinessLogicContent(
          businessLogic,
          semanticAnalysis
        );
        priority = businessLogic.operations.length > 0 ? "high" : "low";
        break;

      case "technical-details":
        content = this.buildTechnicalDetailsContent(
          semanticAnalysis,
          functionContext
        );
        priority = "medium";
        break;

      case "usage-examples":
        content = this.buildUsageExamplesContent(
          componentContext,
          functionContext
        );
        priority = "low";
        break;

      case "relationships":
        content = this.buildRelationshipsContent(
          semanticAnalysis.relationshipAnalysis
        );
        priority = "medium";
        break;
    }

    // Apply section formatting
    content = this.formatSectionContent(content, sectionTemplate.format);

    // Apply token limits
    content = this.applySectionTokenLimit(content, sectionTemplate.maxTokens);

    return {
      section: sectionTemplate.id,
      content,
      priority,
    };
  }

  /**
   * Builds overview content
   */
  private buildOverviewContent(
    semanticAnalysis: SemanticAnalysisResult
  ): string {
    const fileSemantics = semanticAnalysis.fileSemantics;
    const overview = [`**Purpose:** ${fileSemantics.primaryPurpose}`];

    if (fileSemantics.secondaryPurposes.length > 0) {
      overview.push(
        `**Secondary Functions:** ${fileSemantics.secondaryPurposes.join(", ")}`
      );
    }

    overview.push(
      `**Complexity:** ${fileSemantics.complexity.overallComplexity}`
    );
    overview.push(
      `**Business Value:** ${fileSemantics.businessValue.businessCriticality}`
    );

    if (fileSemantics.domainConcepts.length > 0) {
      const concepts = fileSemantics.domainConcepts
        .map((c) => c.name)
        .slice(0, 3)
        .join(", ");
      overview.push(`**Key Concepts:** ${concepts}`);
    }

    return overview.join("\n");
  }

  /**
   * Builds structure content
   */
  private buildStructureContent(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext
  ): string {
    const structure: string[] = [];

    if (functionContext.functions.length > 0) {
      structure.push(`**Functions (${functionContext.functions.length}):**`);
      const mainFunctions = functionContext.functions
        .filter((f) => f.isExported || f.complexity.level !== "low")
        .slice(0, 5)
        .map(
          (f) =>
            `- ${f.name}${f.async ? " (async)" : ""}: ${f.signature.returnType}`
        )
        .join("\n");
      structure.push(mainFunctions);
    }

    if (componentContext.components.length > 0) {
      structure.push(`**Components (${componentContext.components.length}):**`);
      const mainComponents = componentContext.components
        .slice(0, 3)
        .map((c) => `- ${c.name} (${c.type}, ${c.category})`)
        .join("\n");
      structure.push(mainComponents);
    }

    if (typeContext.definitions.length > 0) {
      structure.push(`**Types (${typeContext.definitions.length}):**`);
      const mainTypes = typeContext.definitions
        .filter((t) => t.isExported)
        .slice(0, 5)
        .map((t) => `- ${t.name} (${t.kind})`)
        .join("\n");
      structure.push(mainTypes);
    }

    return structure.join("\n\n");
  }

  /**
   * Builds dependencies content
   */
  private buildDependenciesContent(
    dependencyContext: DependencyContext,
    semanticAnalysis: SemanticAnalysisResult
  ): string {
    const deps: string[] = [];

    if (dependencyContext.external.length > 0) {
      deps.push(
        `**External Dependencies (${dependencyContext.external.length}):**`
      );
      const criticalDeps = dependencyContext.external
        .filter((d) => d.criticality === "high")
        .slice(0, 5)
        .map((d) => `- ${d.name} (${d.purpose})`)
        .join("\n");
      deps.push(criticalDeps);
    }

    if (dependencyContext.internal.length > 0) {
      deps.push(
        `**Internal Dependencies (${dependencyContext.internal.length}):**`
      );
      const internalDeps = dependencyContext.internal
        .slice(0, 5)
        .map((d) => `- ${d.path} (${d.usageType})`)
        .join("\n");
      deps.push(internalDeps);
    }

    if (
      dependencyContext.reactSpecific.length > 0 &&
      dependencyContext.reactSpecific[0].hooks.length > 0
    ) {
      deps.push(
        `**React Hooks:** ${dependencyContext.reactSpecific[0].hooks
          .slice(0, 5)
          .join(", ")}`
      );
    }

    return deps.join("\n\n");
  }

  /**
   * Builds exports content
   */
  private buildExportsContent(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext
  ): string {
    const exports: string[] = [];

    const exportedFunctions = functionContext.functions.filter(
      (f) => f.isExported
    );
    if (exportedFunctions.length > 0) {
      exports.push(
        `**Exported Functions:** ${exportedFunctions
          .map((f) => f.name)
          .join(", ")}`
      );
    }

    const exportedComponents = componentContext.components.filter(
      (c) => c.isExported
    );
    if (exportedComponents.length > 0) {
      exports.push(
        `**Exported Components:** ${exportedComponents
          .map((c) => c.name)
          .join(", ")}`
      );
    }

    const exportedTypes = typeContext.definitions.filter((t) => t.isExported);
    if (exportedTypes.length > 0) {
      exports.push(
        `**Exported Types:** ${exportedTypes.map((t) => t.name).join(", ")}`
      );
    }

    return exports.join("\n");
  }

  /**
   * Builds business logic content
   */
  private buildBusinessLogicContent(
    businessLogic: BusinessLogicDefinition,
    semanticAnalysis: SemanticAnalysisResult
  ): string {
    if (businessLogic.operations.length === 0) {
      return "";
    }

    const content: string[] = [];

    content.push(`**Domain:** ${businessLogic.domain}`);

    if (businessLogic.operations.length > 0) {
      content.push(`**Key Operations (${businessLogic.operations.length}):**`);
      const operations = businessLogic.operations
        .slice(0, 5)
        .map((op) => `- ${op.name}: ${op.purpose} (${op.complexity})`)
        .join("\n");
      content.push(operations);
    }

    if (businessLogic.rules.length > 0) {
      content.push(
        `**Business Rules:** ${businessLogic.rules.length} rules defined`
      );
    }

    if (businessLogic.workflows.length > 0) {
      content.push(
        `**Workflows:** ${businessLogic.workflows.length} workflow(s)`
      );
    }

    return content.join("\n\n");
  }

  /**
   * Builds technical details content
   */
  private buildTechnicalDetailsContent(
    semanticAnalysis: SemanticAnalysisResult,
    functionContext: FunctionContext
  ): string {
    const details: string[] = [];

    const codeQuality = semanticAnalysis.codeQuality;
    details.push(
      `**Quality Score:** ${codeQuality.overallQualityScore.toFixed(1)}/10`
    );

    if (codeQuality.performance.score < 8) {
      details.push(`**Performance:** Optimization opportunities identified`);
    }

    if (codeQuality.security.score < 8) {
      details.push(
        `**Security:** ${codeQuality.security.vulnerabilities.length} potential issues`
      );
    }

    const patterns = semanticAnalysis.designPatterns.detectedPatterns;
    if (patterns.length > 0) {
      details.push(
        `**Design Patterns:** ${patterns.map((p) => p.name).join(", ")}`
      );
    }

    const complexity = functionContext.complexity;
    if (complexity.averageComplexity > 5) {
      details.push(
        `**Complexity:** Above average (${complexity.averageComplexity.toFixed(
          1
        )})`
      );
    }

    return details.join("\n");
  }

  /**
   * Builds usage examples content
   */
  private buildUsageExamplesContent(
    componentContext: ComponentContext,
    functionContext: FunctionContext
  ): string {
    const examples: string[] = [];

    // Component usage examples
    if (componentContext.components.length > 0) {
      const mainComponent = componentContext.components[0];
      if (mainComponent.reactInfo.props.length > 0) {
        examples.push(`**${mainComponent.name} Usage:**`);
        const requiredProps = mainComponent.reactInfo.props
          .filter((p) => p.required)
          .map((p) => `${p.name}: ${p.type}`)
          .join(", ");

        if (requiredProps) {
          examples.push(`Required props: ${requiredProps}`);
        }
      }
    }

    // Function usage examples
    const exportedFunctions = functionContext.functions.filter(
      (f) => f.isExported
    );
    if (exportedFunctions.length > 0 && exportedFunctions.length <= 3) {
      examples.push(`**Function Signatures:**`);
      exportedFunctions.forEach((func) => {
        const params = func.signature.parameters
          .map((p) => `${p.name}: ${p.type}`)
          .join(", ");
        examples.push(
          `- ${func.name}(${params}): ${func.signature.returnType}`
        );
      });
    }

    return examples.join("\n");
  }

  /**
   * Builds relationships content
   */
  private buildRelationshipsContent(relationshipAnalysis: any): string {
    const relationships: string[] = [];

    if (relationshipAnalysis.fanIn > 0) {
      relationships.push(`**Dependencies In:** ${relationshipAnalysis.fanIn}`);
    }

    if (relationshipAnalysis.fanOut > 0) {
      relationships.push(
        `**Dependencies Out:** ${relationshipAnalysis.fanOut}`
      );
    }

    relationships.push(
      `**Coupling:** ${relationshipAnalysis.coupling.coupling}`
    );
    relationships.push(
      `**Cohesion:** ${relationshipAnalysis.cohesion.cohesionType}`
    );

    if (relationshipAnalysis.instability > 0.7) {
      relationships.push(
        `**Stability:** Unstable (${relationshipAnalysis.instability.toFixed(
          2
        )})`
      );
    }

    return relationships.join("\n");
  }

  /**
   * Optimizes the prompt for token efficiency
   */
  private optimizePrompt(
    structure: PromptStructure,
    contexts: PromptContext[]
  ): {
    summary: string;
    structure: PromptStructure;
    contexts: PromptContext[];
  } {
    let optimizedStructure = { ...structure };
    let optimizedContexts = [...contexts];

    // Apply optimization based on configuration
    switch (this.optimization.compressionLevel) {
      case "aggressive":
        optimizedStructure =
          this.applyAggressiveCompression(optimizedStructure);
        optimizedContexts = this.compressContexts(optimizedContexts, 0.5);
        break;

      case "moderate":
        optimizedStructure = this.applyModerateCompression(optimizedStructure);
        optimizedContexts = this.compressContexts(optimizedContexts, 0.7);
        break;

      case "light":
        optimizedContexts = this.compressContexts(optimizedContexts, 0.9);
        break;
    }

    // Remove redundancy if enabled
    if (this.optimization.removeRedundancy) {
      optimizedContexts = this.removeRedundantContent(optimizedContexts);
    }

    // Generate final summary
    const summary = this.generateFinalSummary(
      optimizedStructure,
      optimizedContexts
    );

    return {
      summary,
      structure: optimizedStructure,
      contexts: optimizedContexts,
    };
  }

  /**
   * Generates the final summary text
   */
  private generateFinalSummary(
    structure: PromptStructure,
    contexts: PromptContext[]
  ): string {
    const parts: string[] = [];

    // Add header
    if (structure.header) {
      parts.push(structure.header);
    }

    // Add key points
    if (structure.keyPoints.length > 0) {
      parts.push("**Key Points:**");
      parts.push(structure.keyPoints.map((point) => `• ${point}`).join("\n"));
    }

    // Add contexts in priority order
    contexts.forEach((context) => {
      if (context.content.trim()) {
        parts.push(context.content);
      }
    });

    // Add dependencies
    if (structure.dependencies) {
      parts.push(structure.dependencies);
    }

    // Add exports
    if (structure.exports) {
      parts.push(structure.exports);
    }

    // Add footer
    if (structure.footer) {
      parts.push(structure.footer);
    }

    return parts.filter((part) => part.trim()).join("\n\n");
  }

  /**
   * Calculates token estimate for the prompt
   */
  private calculateTokenEstimate(prompt: {
    summary: string;
    structure: PromptStructure;
    contexts: PromptContext[];
  }): TokenEstimate {
    const originalSize = estimateTokenCount(prompt.summary);
    const approximate = Math.ceil(originalSize * 0.85); // Account for optimization
    const compressionRatio = approximate / Math.max(originalSize, 1);

    return {
      approximate,
      compressionRatio,
      originalSize,
    };
  }

  // Helper methods for template management and optimization

  private initializeTemplates(): void {
    // Concise template for simple files
    this.templates.set("concise", {
      name: "Concise",
      fileTypes: ["utility", "type-definition", "constant"],
      structure: {
        header: {
          format: "{purpose} • {complexity}",
          includeFileInfo: false,
          includeComplexity: true,
          includePurpose: true,
        },
        sections: [
          {
            id: "overview",
            title: "Overview",
            format: "paragraph",
            required: true,
            maxTokens: 100,
            priority: 1,
            conditions: [],
          },
          {
            id: "exports",
            title: "Exports",
            format: "bullet-points",
            required: true,
            maxTokens: 80,
            priority: 2,
            conditions: [],
          },
        ],
        footer: {
          format: "",
          includeRecommendations: false,
          includeRelatedFiles: false,
          includeNextSteps: false,
        },
        connectors: [],
      },
      style: "concise",
      maxTokens: 300,
      priority: {
        high: ["overview", "exports"],
        medium: ["dependencies"],
        low: ["technical-details"],
      },
    });

    // Detailed template for complex files
    this.templates.set("detailed-technical", {
      name: "Detailed Technical",
      fileTypes: ["react-component", "api-route", "service"],
      structure: {
        header: {
          format:
            "{purpose}\n**Complexity:** {complexity} • **Type:** {fileType}",
          includeFileInfo: true,
          includeComplexity: true,
          includePurpose: true,
        },
        sections: [
          {
            id: "overview",
            title: "Overview",
            format: "paragraph",
            required: true,
            maxTokens: 200,
            priority: 1,
            conditions: [],
          },
          {
            id: "structure",
            title: "Structure",
            format: "bullet-points",
            required: true,
            maxTokens: 300,
            priority: 2,
            conditions: [],
          },
          {
            id: "business-logic",
            title: "Business Logic",
            format: "paragraph",
            required: false,
            maxTokens: 250,
            priority: 3,
            conditions: [
              {
                type: "has-content",
                value: "business-operations",
                operator: "greater-than",
              },
            ],
          },
          {
            id: "technical-details",
            title: "Technical Details",
            format: "bullet-points",
            required: true,
            maxTokens: 200,
            priority: 4,
            conditions: [],
          },
          {
            id: "dependencies",
            title: "Dependencies",
            format: "bullet-points",
            required: true,
            maxTokens: 150,
            priority: 5,
            conditions: [],
          },
        ],
        footer: {
          format: "**Recommendations:** {recommendations}",
          includeRecommendations: true,
          includeRelatedFiles: false,
          includeNextSteps: true,
        },
        connectors: [
          {
            between: ["overview", "structure"],
            text: "The file structure includes:",
            conditional: false,
          },
          {
            between: ["structure", "business-logic"],
            text: "Key business operations:",
            conditional: true,
          },
        ],
      },
      style: "technical",
      maxTokens: 1200,
      priority: {
        high: ["overview", "structure", "business-logic"],
        medium: ["technical-details", "dependencies"],
        low: ["usage-examples", "relationships"],
      },
    });

    // Business-focused template
    this.templates.set("business-focused", {
      name: "Business Focused",
      fileTypes: ["react-component", "service", "api-route"],
      structure: {
        header: {
          format:
            "{purpose}\n**Business Impact:** {businessValue} • **Domain:** {domain}",
          includeFileInfo: true,
          includeComplexity: false,
          includePurpose: true,
        },
        sections: [
          {
            id: "overview",
            title: "Business Overview",
            format: "paragraph",
            required: true,
            maxTokens: 180,
            priority: 1,
            conditions: [],
          },
          {
            id: "business-logic",
            title: "Business Operations",
            format: "numbered-list",
            required: true,
            maxTokens: 400,
            priority: 2,
            conditions: [],
          },
          {
            id: "structure",
            title: "Implementation",
            format: "bullet-points",
            required: true,
            maxTokens: 200,
            priority: 3,
            conditions: [],
          },
          {
            id: "dependencies",
            title: "External Dependencies",
            format: "bullet-points",
            required: false,
            maxTokens: 150,
            priority: 4,
            conditions: [
              {
                type: "has-content",
                value: "external-dependencies",
                operator: "greater-than",
              },
            ],
          },
        ],
        footer: {
          format:
            "**Business Value:** {businessValue}\n**Recommendations:** {recommendations}",
          includeRecommendations: true,
          includeRelatedFiles: true,
          includeNextSteps: true,
        },
        connectors: [],
      },
      style: "business",
      maxTokens: 1000,
      priority: {
        high: ["business-logic", "overview"],
        medium: ["structure", "dependencies"],
        low: ["technical-details", "usage-examples"],
      },
    });
  }

  private getDefaultTemplate(): SummaryTemplate {
    return (
      this.templates.get("concise") || {
        name: "Default",
        fileTypes: [],
        structure: {
          header: {
            format: "{purpose}",
            includeFileInfo: false,
            includeComplexity: false,
            includePurpose: true,
          },
          sections: [],
          footer: {
            format: "",
            includeRecommendations: false,
            includeRelatedFiles: false,
            includeNextSteps: false,
          },
          connectors: [],
        },
        style: "concise",
        maxTokens: 500,
        priority: { high: [], medium: [], low: [] },
      }
    );
  }

  private getDefaultOptimization(): PromptOptimization {
    return {
      compressionLevel:
        this.config.templatePreference === "concise" ? "moderate" : "light",
      preserveKeyInfo: true,
      removeRedundancy: true,
      abbreviateNames: false,
      useShortcuts: this.config.templatePreference === "concise",
    };
  }

  private getDefaultPersonalization(): PromptPersonalization {
    return {
      targetAudience: "ai-assistant",
      experienceLevel: "intermediate",
      context: "general",
      domain: "fullstack",
    };
  }

  private getDefaultAdaptiveFeatures(): AdaptivePromptFeatures {
    return {
      dynamicLength: true,
      contextAwareness: true,
      intelligentFiltering: true,
      relevanceScoring: true,
      semanticClustering: false,
    };
  }

  private shouldIncludeSection(
    sectionTemplate: SectionTemplate,
    semanticAnalysis: SemanticAnalysisResult
  ): boolean {
    if (sectionTemplate.required) {
      return true;
    }

    // Check conditions
    return sectionTemplate.conditions.every((condition) => {
      switch (condition.type) {
        case "complexity-level":
          return (
            semanticAnalysis.fileSemantics.complexity.overallComplexity ===
            condition.value
          );

        case "business-domain":
          return semanticAnalysis.fileSemantics.domainConcepts.some((concept) =>
            concept.name
              .toLowerCase()
              .includes((condition.value as string).toLowerCase())
          );

        case "has-content":
          return this.hasRelevantContent(
            condition.value as string,
            semanticAnalysis
          );

        default:
          return true;
      }
    });
  }

  private hasRelevantContent(
    contentType: string,
    semanticAnalysis: SemanticAnalysisResult
  ): boolean {
    switch (contentType) {
      case "business-operations":
        return (
          semanticAnalysis.fileSemantics.businessValue.businessCriticality !==
          "low"
        );

      case "external-dependencies":
        return semanticAnalysis.relationshipAnalysis.fanOut > 0;

      case "complex-logic":
        return (
          semanticAnalysis.fileSemantics.complexity.overallComplexity ===
            "high" ||
          semanticAnalysis.fileSemantics.complexity.overallComplexity ===
            "very-high"
        );

      default:
        return true;
    }
  }

  private formatSectionContent(content: string, format: SectionFormat): string {
    switch (format) {
      case "bullet-points":
        return content
          .split("\n")
          .filter((line) => line.trim())
          .map((line) =>
            line.startsWith("•") || line.startsWith("-") || line.startsWith("*")
              ? line
              : `• ${line}`
          )
          .join("\n");

      case "numbered-list":
        return content
          .split("\n")
          .filter((line) => line.trim())
          .map((line, index) =>
            line.match(/^\d+\./) ? line : `${index + 1}. ${line}`
          )
          .join("\n");

      case "key-value":
        return content
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => (line.includes(":") ? line : `**${line}:**`))
          .join("\n");

      case "code-snippet":
        return `\`\`\`\n${content}\n\`\`\``;

      case "table":
        // Simple table formatting
        const lines = content.split("\n").filter((line) => line.trim());
        if (lines.length > 1) {
          return `| Item | Description |\n|------|-------------|\n${lines
            .map((line) => `| ${line} |`)
            .join("\n")}`;
        }
        return content;

      default:
        return content;
    }
  }

  private applySectionTokenLimit(content: string, maxTokens: number): string {
    const estimatedTokens = estimateTokenCount(content);

    if (estimatedTokens <= maxTokens) {
      return content;
    }

    // Simple truncation with ellipsis
    const ratio = maxTokens / estimatedTokens;
    const targetLength = Math.floor(content.length * ratio * 0.9); // 90% to be safe

    if (targetLength < content.length) {
      const truncated = content.substring(0, targetLength);
      const lastSentence = truncated.lastIndexOf(".");
      const lastNewline = truncated.lastIndexOf("\n");

      const cutPoint = Math.max(lastSentence, lastNewline);
      return cutPoint > targetLength * 0.5
        ? truncated.substring(0, cutPoint + 1) + "..."
        : truncated + "...";
    }

    return content;
  }

  private getPriorityScore(priority: "high" | "medium" | "low"): number {
    switch (priority) {
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 1;
    }
  }

  private buildHeader(
    headerTemplate: HeaderTemplate,
    semanticAnalysis: SemanticAnalysisResult
  ): string {
    let header = headerTemplate.format;

    if (headerTemplate.includePurpose) {
      header = header.replace(
        "{purpose}",
        semanticAnalysis.fileSemantics.primaryPurpose
      );
    }

    if (headerTemplate.includeComplexity) {
      header = header.replace(
        "{complexity}",
        semanticAnalysis.fileSemantics.complexity.overallComplexity
      );
    }

    if (headerTemplate.includeFileInfo) {
      header = header.replace(
        "{fileType}",
        semanticAnalysis.fileSemantics.primaryPurpose
      );
      header = header.replace(
        "{businessValue}",
        semanticAnalysis.fileSemantics.businessValue.businessCriticality
      );

      if (semanticAnalysis.fileSemantics.domainConcepts.length > 0) {
        header = header.replace(
          "{domain}",
          semanticAnalysis.fileSemantics.domainConcepts[0].name
        );
      }
    }

    return header;
  }

  private buildKeyPoints(
    template: SummaryTemplate,
    semanticAnalysis: SemanticAnalysisResult,
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): string[] {
    const keyPoints: string[] = [];

    // Add complexity information
    if (semanticAnalysis.fileSemantics.complexity.overallComplexity !== "low") {
      keyPoints.push(
        `${semanticAnalysis.fileSemantics.complexity.overallComplexity} complexity file`
      );
    }

    // Add main exports
    const exportedFunctions = functionContext.functions.filter(
      (f) => f.isExported
    ).length;
    const exportedComponents = componentContext.components.filter(
      (c) => c.isExported
    ).length;

    if (exportedFunctions > 0) {
      keyPoints.push(
        `Exports ${exportedFunctions} function${
          exportedFunctions > 1 ? "s" : ""
        }`
      );
    }

    if (exportedComponents > 0) {
      keyPoints.push(
        `Exports ${exportedComponents} component${
          exportedComponents > 1 ? "s" : ""
        }`
      );
    }

    // Add quality insights
    if (semanticAnalysis.codeQuality.overallQualityScore < 7) {
      keyPoints.push("Has quality improvement opportunities");
    }

    // Add pattern information
    const patterns = semanticAnalysis.designPatterns.detectedPatterns;
    if (patterns.length > 0) {
      keyPoints.push(
        `Uses ${patterns.length} design pattern${
          patterns.length > 1 ? "s" : ""
        }`
      );
    }

    return keyPoints.slice(0, 5); // Limit to 5 key points
  }

  private buildDependenciesSection(
    dependencyContext: DependencyContext
  ): string {
    const deps: string[] = [];

    if (dependencyContext.external.length > 0) {
      deps.push(
        `**External:** ${dependencyContext.external
          .slice(0, 3)
          .map((d) => d.name)
          .join(", ")}`
      );
    }

    if (dependencyContext.internal.length > 0) {
      deps.push(
        `**Internal:** ${dependencyContext.internal.length} file${
          dependencyContext.internal.length > 1 ? "s" : ""
        }`
      );
    }

    return deps.join(" • ");
  }

  private buildExportsSection(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext
  ): string {
    const exports: string[] = [];

    const exportedFunctions = functionContext.functions.filter(
      (f) => f.isExported
    );
    const exportedComponents = componentContext.components.filter(
      (c) => c.isExported
    );
    const exportedTypes = typeContext.definitions.filter((t) => t.isExported);

    if (exportedFunctions.length > 0) {
      exports.push(
        `Functions: ${exportedFunctions
          .slice(0, 3)
          .map((f) => f.name)
          .join(", ")}`
      );
    }

    if (exportedComponents.length > 0) {
      exports.push(
        `Components: ${exportedComponents
          .slice(0, 2)
          .map((c) => c.name)
          .join(", ")}`
      );
    }

    if (exportedTypes.length > 0) {
      exports.push(
        `Types: ${exportedTypes
          .slice(0, 3)
          .map((t) => t.name)
          .join(", ")}`
      );
    }

    return exports.join(" • ");
  }

  private buildFooter(
    footerTemplate: FooterTemplate,
    semanticAnalysis: SemanticAnalysisResult
  ): string | undefined {
    if (!footerTemplate.format) {
      return undefined;
    }

    let footer = footerTemplate.format;

    if (footerTemplate.includeRecommendations) {
      const recommendations = semanticAnalysis.recommendations
        .slice(0, 2)
        .map((r) => r.title)
        .join(", ");
      footer = footer.replace("{recommendations}", recommendations || "None");
    }

    if (footerTemplate.includeNextSteps) {
      const nextSteps = this.generateNextSteps(semanticAnalysis);
      footer = footer.replace("{nextSteps}", nextSteps);
    }

    return footer;
  }

  private generateNextSteps(semanticAnalysis: SemanticAnalysisResult): string {
    const steps: string[] = [];

    if (semanticAnalysis.codeQuality.overallQualityScore < 7) {
      steps.push("Improve code quality");
    }

    if (semanticAnalysis.optimizationOpportunities.length > 0) {
      steps.push("Apply performance optimizations");
    }

    if (semanticAnalysis.riskFactors.length > 0) {
      steps.push("Address risk factors");
    }

    return steps.join(", ") || "Continue development";
  }

  private applyAggressiveCompression(
    structure: PromptStructure
  ): PromptStructure {
    return {
      ...structure,
      header: this.compressText(structure.header, 0.6),
      keyPoints: structure.keyPoints
        .slice(0, 3)
        .map((point) => this.compressText(point, 0.7)),
      dependencies: this.compressText(structure.dependencies, 0.6),
      exports: this.compressText(structure.exports, 0.6),
      footer: structure.footer
        ? this.compressText(structure.footer, 0.6)
        : undefined,
    };
  }

  private applyModerateCompression(
    structure: PromptStructure
  ): PromptStructure {
    return {
      ...structure,
      header: this.compressText(structure.header, 0.8),
      keyPoints: structure.keyPoints
        .slice(0, 4)
        .map((point) => this.compressText(point, 0.8)),
      dependencies: this.compressText(structure.dependencies, 0.8),
      exports: this.compressText(structure.exports, 0.8),
      footer: structure.footer
        ? this.compressText(structure.footer, 0.8)
        : undefined,
    };
  }

  private compressContexts(
    contexts: PromptContext[],
    ratio: number
  ): PromptContext[] {
    return contexts.map((context) => ({
      ...context,
      content: this.compressText(context.content, ratio),
    }));
  }

  private compressText(text: string, ratio: number): string {
    if (ratio >= 1) return text;

    const targetLength = Math.floor(text.length * ratio);
    if (targetLength >= text.length) return text;

    // Intelligent compression: keep important parts
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

    if (sentences.length <= 1) {
      return text.substring(0, targetLength) + "...";
    }

    // Keep first and last sentences, compress middle
    const firstSentence = sentences[0];
    const lastSentence = sentences[sentences.length - 1];
    const remainingLength =
      targetLength - firstSentence.length - lastSentence.length - 10; // buffer

    if (remainingLength <= 0) {
      return firstSentence + "...";
    }

    const middleSentences = sentences.slice(1, -1);
    const compressedMiddle = middleSentences
      .join(". ")
      .substring(0, remainingLength);

    return `${firstSentence}. ${compressedMiddle}... ${lastSentence}.`;
  }

  private removeRedundantContent(contexts: PromptContext[]): PromptContext[] {
    const seen = new Set<string>();
    const filtered: PromptContext[] = [];

    contexts.forEach((context) => {
      const key = this.getContentKey(context.content);
      if (!seen.has(key)) {
        seen.add(key);
        filtered.push(context);
      }
    });

    return filtered;
  }

  private getContentKey(content: string): string {
    // Simple content deduplication based on first 50 characters
    return content.substring(0, 50).trim().toLowerCase();
  }

  private extractFileName(filePath: string): string {
    return filePath.split("/").pop() || filePath.split("\\").pop() || filePath;
  }

  private extractKeyFeatures(
    semanticAnalysis: SemanticAnalysisResult
  ): string[] {
    const features: string[] = [];

    // Add complexity as a feature
    if (semanticAnalysis.fileSemantics.complexity.overallComplexity !== "low") {
      features.push(
        `${semanticAnalysis.fileSemantics.complexity.overallComplexity} complexity`
      );
    }

    // Add business value
    if (
      semanticAnalysis.fileSemantics.businessValue.businessCriticality !== "low"
    ) {
      features.push(
        `${semanticAnalysis.fileSemantics.businessValue.businessCriticality} business impact`
      );
    }

    // Add patterns
    const patterns = semanticAnalysis.designPatterns.detectedPatterns;
    if (patterns.length > 0) {
      features.push(
        `${patterns.length} design pattern${patterns.length > 1 ? "s" : ""}`
      );
    }

    // Add quality indicators
    if (semanticAnalysis.codeQuality.overallQualityScore > 8) {
      features.push("high quality code");
    } else if (semanticAnalysis.codeQuality.overallQualityScore < 6) {
      features.push("needs improvement");
    }

    return features;
  }

  private buildExportContext(
    functionContext: FunctionContext,
    componentContext: ComponentContext,
    typeContext: TypeContext
  ): any {
    return {
      functions: functionContext.functions
        .filter((f) => f.isExported)
        .map((f) => ({
          name: f.name,
          type: f.signature.returnType,
          async: f.async,
        })),
      components: componentContext.components
        .filter((c) => c.isExported)
        .map((c) => ({
          name: c.name,
          type: c.type,
          category: c.category,
        })),
      types: typeContext.definitions
        .filter((t) => t.isExported)
        .map((t) => ({
          name: t.name,
          kind: t.kind,
        })),
    };
  }

  private buildTechnicalContext(semanticAnalysis: SemanticAnalysisResult): any {
    return {
      architecture:
        semanticAnalysis.architecturalPatterns.layerIdentification
          .identifiedLayer,
      quality: {
        overall: semanticAnalysis.codeQuality.overallQualityScore,
        maintainability: semanticAnalysis.codeQuality.maintainability.score,
        performance: semanticAnalysis.codeQuality.performance.score,
        security: semanticAnalysis.codeQuality.security.score,
      },
      patterns: semanticAnalysis.designPatterns.detectedPatterns.map(
        (p) => p.name
      ),
      risks: semanticAnalysis.riskFactors.filter(
        (r) => r.severity === "high" || r.severity === "critical"
      ).length,
    };
  }

  private extractUsagePatterns(
    functionContext: FunctionContext,
    componentContext: ComponentContext
  ): any[] {
    const patterns: any[] = [];

    // Function patterns
    const functionPatterns = functionContext.patterns;
    if (functionPatterns.functionalPatterns.length > 0) {
      patterns.push({
        type: "functional",
        patterns: functionPatterns.functionalPatterns,
      });
    }

    // React patterns
    if (functionPatterns.reactPatterns.length > 0) {
      patterns.push({
        type: "react",
        patterns: functionPatterns.reactPatterns,
      });
    }

    // Component patterns
    if (componentContext.patterns.commonPatterns.length > 0) {
      patterns.push({
        type: "component",
        patterns: componentContext.patterns.commonPatterns,
      });
    }

    return patterns;
  }

  // Additional methods for advanced features

  private adaptPromptStructure(
    structure: PromptStructure,
    personalization: PromptPersonalization,
    constraints?: PromptConstraints
  ): PromptStructure {
    let adapted = { ...structure };

    // Adapt based on target audience
    switch (personalization.targetAudience) {
      case "business-analyst":
        adapted.keyPoints = adapted.keyPoints.filter(
          (point) =>
            !point.includes("technical") && !point.includes("complexity")
        );
        break;

      case "developer": // Changed from "junior-developer" to "developer"
        // Add more explanatory content for junior developers
        if (personalization.experienceLevel === "junior") {
          adapted.header = `${adapted.header}\n*Note: This is a ${personalization.experienceLevel} level explanation*`;
        }
        break;

      case "documentation":
        // More formal structure
        adapted.header = `# ${adapted.header}`;
        break;
    }

    // Apply constraints
    if (constraints?.maxTokens) {
      adapted = this.applyTokenConstraints(adapted, constraints.maxTokens);
    }

    return adapted;
  }

  private adaptPromptContexts(
    contexts: PromptContext[],
    personalization: PromptPersonalization,
    constraints?: PromptConstraints
  ): PromptContext[] {
    let adapted = [...contexts];

    // Filter based on experience level
    if (personalization.experienceLevel === "junior") {
      adapted = adapted.filter(
        (context) =>
          context.section !== "technical-details" || context.priority === "high"
      );
    }

    // Adapt content style
    adapted = adapted.map((context) => ({
      ...context,
      content: this.adaptContentForAudience(
        context.content,
        personalization.targetAudience
      ),
    }));

    return adapted;
  }

  private generateAdaptiveSummary(
    structure: PromptStructure,
    contexts: PromptContext[],
    personalization: PromptPersonalization
  ): string {
    // Generate summary adapted to the audience
    return this.generateFinalSummary(structure, contexts);
  }

  private getSpecializedTemplate(
    useCase: SpecializedUseCase,
    fileType: FileContextType
  ): SummaryTemplate {
    // Return specialized templates based on use case
    switch (useCase) {
      case "code-review":
        return (
          this.templates.get("detailed-technical") || this.getDefaultTemplate()
        );

      case "documentation":
        return (
          this.templates.get("business-focused") || this.getDefaultTemplate()
        );

      default:
        return this.getDefaultTemplate();
    }
  }

  private buildSpecializedStructure(
    template: SummaryTemplate,
    summary: ContextualSummary,
    options?: SpecializationOptions
  ): PromptStructure {
    // Build structure for specialized use cases
    return summary.prompt.structure;
  }

  private buildSpecializedContexts(
    template: SummaryTemplate,
    summary: ContextualSummary,
    options?: SpecializationOptions
  ): PromptContext[] {
    // Build contexts for specialized use cases
    return summary.prompt.context;
  }

  private generateSpecializedSummary(
    structure: PromptStructure,
    contexts: PromptContext[],
    useCase: SpecializedUseCase,
    options?: SpecializationOptions
  ): string {
    // Generate summary for specialized use cases
    return this.generateFinalSummary(structure, contexts);
  }

  private applyTokenConstraints(
    structure: PromptStructure,
    maxTokens: number
  ): PromptStructure {
    // Apply token constraints to structure
    const ratio = Math.min(
      1,
      maxTokens / estimateTokenCount(JSON.stringify(structure))
    );
    return this.applyModerateCompression(structure);
  }

  private adaptContentForAudience(content: string, audience: string): string {
    // Adapt content based on target audience
    switch (audience) {
      case "business-analyst":
        return content
          .replace(/technical/gi, "implementation")
          .replace(/complexity/gi, "sophistication");

      case "documentation":
        return content.replace(/\*\*/g, "").replace(/•/g, "-");

      default:
        return content;
    }
  }
}
