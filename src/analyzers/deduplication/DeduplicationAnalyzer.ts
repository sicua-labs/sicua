import ts from "typescript";
import { ComponentRelation, ComponentSimilarity } from "../../types";
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

  /**
   * Creates a new DeduplicationAnalyzer
   * @param components Components to analyze
   */
  constructor(components: ComponentRelation[]) {
    // Create source files from components with content
    this.sourceFiles = createSourceFiles(components);
  }

  /**
   * Analyzes components to find similarities and duplication
   * @param components Components to analyze
   * @param thresholds Optional similarity thresholds
   * @returns Component similarities
   */
  async analyzeComponents(
    components: ComponentRelation[],
    thresholds: SimilarityThresholds = DEFAULT_SIMILARITY_THRESHOLDS
  ): Promise<ComponentSimilarity[]> {
    try {
      // Filter valid components first
      const validComponents = components.filter((comp) =>
        isValidComponentForComparison(comp)
      );

      // First pass: Enhance ComponentRelation with detailed prop and structure info
      let processedCount = 0;
      let comparisonCount = 0;

      // Make enhancement parallel but controlled
      const enhancedComponents = await Promise.all(
        validComponents.map(async (component) => {
          processedCount++;
          // Allow other operations to execute between heavy computations
          await new Promise((resolve) => setTimeout(resolve, 0));

          const sourceFile = this.sourceFiles.get(component.fullPath);
          if (!sourceFile) {
            return component;
          }

          return enhanceComponentInfo(component, sourceFile);
        })
      );

      // Second pass: Find similarities between components
      const similarities: ComponentSimilarity[] = [];

      // Process comparisons in chunks to avoid blocking
      const chunkSize = 100; // Adjust based on your needs
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

          comparisonCount++;
          if (comparisonCount % chunkSize === 0) {
            // Allow other operations to execute between chunks
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

      // Group similar components to form larger groups (like the original implementation)
      const groupedSimilarities = groupSimilarComponents(significantMatches);

      // Apply consolidation to ensure optimal result quality
      const consolidatedResults = consolidateSimilarities(groupedSimilarities);

      return consolidatedResults;
    } finally {
      // Cleanup
      this.sourceFiles.clear();
    }
  }
}
