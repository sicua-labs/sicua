import ts from "typescript";
import {
  ComponentRelation,
  ComponentSimilarity,
  ScanResult,
} from "../../types";
import {
  SimilarityThresholds,
  DEFAULT_SIMILARITY_THRESHOLDS,
} from "./types/deduplication.types";
import {
  isValidComponentForComparison,
  shouldCompareComponents,
} from "./utils/componentFilter";
import {
  filterSignificantSimilarities,
  compareComponents,
} from "./utils/similarity";
import {
  createSourceFiles,
  enhanceComponentInfo,
} from "./extractors/componentInfoExtractor";
import {
  groupSimilarComponents,
  consolidateSimilarities,
} from "./utils/grouping";

/**
 * Analyzer for detecting component duplication
 */
export class DeduplicationAnalyzer {
  private sourceFiles: Map<string, ts.SourceFile>;
  private scanResult: ScanResult;

  constructor(components: ComponentRelation[], scanResult: ScanResult) {
    this.scanResult = scanResult;
    this.sourceFiles = createSourceFiles(components, scanResult);
  }

  /**
   * Analyzes components to find similarities and duplication
   */
  async analyzeComponents(
    components: ComponentRelation[],
    thresholds: SimilarityThresholds = DEFAULT_SIMILARITY_THRESHOLDS
  ): Promise<ComponentSimilarity[]> {
    try {
      const validComponents = components.filter((comp) =>
        this.isValidForDeduplication(comp)
      );

      let processedCount = 0;
      let comparisonCount = 0;

      // Enhance components with detailed info
      const enhancedComponents = await Promise.all(
        validComponents.map(async (component) => {
          processedCount++;
          await new Promise((resolve) => setTimeout(resolve, 0));

          const sourceFile = this.sourceFiles.get(component.fullPath);
          if (!sourceFile) {
            return component;
          }

          return enhanceComponentInfo(component, sourceFile, this.scanResult);
        })
      );

      // Find similarities between components
      const similarities: ComponentSimilarity[] = [];
      const chunkSize = 100;

      for (let i = 0; i < enhancedComponents.length; i++) {
        for (let j = i + 1; j < enhancedComponents.length; j++) {
          if (
            !shouldCompareComponents(
              enhancedComponents[i],
              enhancedComponents[j],
              thresholds.nameDistanceThreshold
            )
          ) {
            continue;
          }

          // Skip components from very different contexts
          if (
            !shouldCompareByContext(
              enhancedComponents[i],
              enhancedComponents[j]
            )
          ) {
            continue;
          }

          comparisonCount++;
          if (comparisonCount % chunkSize === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          const similarity = compareComponents(
            enhancedComponents[i],
            enhancedComponents[j],
            thresholds
          );

          similarities.push(similarity);
        }
      }

      // Filter for significant matches
      const significantMatches = filterSignificantSimilarities(
        similarities,
        thresholds.minSimilarityScore
      );

      // Group similar components
      const groupedSimilarities = groupSimilarComponents(significantMatches);

      // Apply consolidation
      const consolidatedResults = consolidateSimilarities(groupedSimilarities);

      return consolidatedResults;
    } finally {
      this.sourceFiles.clear();
    }
  }

  /**
   * Component validation using scan result metadata
   */
  private isValidForDeduplication(component: ComponentRelation): boolean {
    if (!isValidComponentForComparison(component)) {
      return false;
    }

    const metadata = this.scanResult.fileMetadata.get(component.fullPath);
    if (metadata) {
      // Skip test files
      if (metadata.isTest) {
        return false;
      }

      // Require React patterns
      if (
        !metadata.hasReactImport &&
        !metadata.hasJSX &&
        metadata.componentCount === 0
      ) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Check if components should be compared based on their context/purpose
 */
function shouldCompareByContext(
  comp1: ComponentRelation,
  comp2: ComponentRelation
): boolean {
  // Extract context from file paths
  const context1 = extractContext(comp1.fullPath);
  const context2 = extractContext(comp2.fullPath);

  // Don't compare components from very different contexts
  const differentContexts = ["auth", "marketing", "admin", "dashboard"];

  if (
    differentContexts.includes(context1) &&
    differentContexts.includes(context2) &&
    context1 !== context2
  ) {
    return false;
  }

  return true;
}

/**
 * Extract context from file path
 */
function extractContext(filePath: string): string {
  const pathParts = filePath.split("/");

  // Look for Next.js route groups like (auth), (marketing)
  for (const part of pathParts) {
    if (part.startsWith("(") && part.endsWith(")")) {
      return part.slice(1, -1);
    }
  }

  // Look for common directory patterns
  const contextPatterns = [
    "auth",
    "marketing",
    "admin",
    "dashboard",
    "components",
  ];
  for (const part of pathParts) {
    if (contextPatterns.includes(part.toLowerCase())) {
      return part.toLowerCase();
    }
  }

  return "general";
}
