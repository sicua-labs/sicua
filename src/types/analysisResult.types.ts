/**
 * Combined analysis result types
 */
import { FunctionData } from "./function.types";
import { DependencyAnalysisDetailedResult } from "./dependency.types";
import { TypeAnalysisResult } from "./typeAnalysis.types";
import { ComplexityAnalysisResult } from "./complexity.types";
import { ComponentDependencyGraph } from "./diagram.types";
import { FileStructureGraph } from "./structureDiagram.types";
import { ComponentSimilarity } from "./deduplication.types";
import { ErrorHandlingCompleteAnalysis } from "./errorHandling.types";
import { SEOAnalysisResult } from "./seoCoverageTypes";
import { ProcessedComponentRelation } from "./component.types";
import { TranslationAnalysisResult } from "./translation.types";
import { ComponentFlowAnalysisResult } from "../analyzers/componentFlow/types";
import { GeneralAnalysisResult } from "../analyzers/general/types/generalAnalyzer.types";
import { ScoredComponentRelation } from "../analyzers/scoring/ComponentScoringAnalyzer";
import { AccessibilityAnalysis } from "../analyzers/accessibility/types/accessibilityTypes";
import { SecurityAnalysisResult } from "../analyzers/security/types/analysis.types";

export interface AnalysisResult {
  generalAnalysis: GeneralAnalysisResult;
  functionAnalysis: FunctionData[];
  advancedAnalysis: DependencyAnalysisDetailedResult;
  typeAnalysis: TypeAnalysisResult;
  complexityAnalysis: ComplexityAnalysisResult;
  componentDependencyGraph: ComponentDependencyGraph;
  fileStructureGraph: FileStructureGraph;
  /* flowAnalysis: {
    stateFlows: { [key: string]: StateFlow };
    storeDefinitions: { [key: string]: StoreDefinition };
  }; */
  deduplicationAnalysis: ComponentSimilarity[];
  errorHandlingAnalysis: ErrorHandlingCompleteAnalysis;
  seoAnalysis: SEOAnalysisResult;
  /* components: ProcessedComponentRelation[]; */
  translationAnalysis: TranslationAnalysisResult;
  componentFlowAnalysis: ComponentFlowAnalysisResult;
  topScoringComponents: ScoredComponentRelation[];
  accessibilityAnalysis: AccessibilityAnalysis;
  securityAnalysis: SecurityAnalysisResult;
  /* contextualSummariesAnalysis: ContextualSummariesAnalysisResult; */
}
