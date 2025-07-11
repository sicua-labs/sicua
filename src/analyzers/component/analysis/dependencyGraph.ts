import { ComponentRelation, DependencyGraph } from "../../../types";
import { ComponentLookupService } from "../../../core/componentLookupService";
import { generateComponentId } from "../../../utils/common/analysisUtils";

/**
 * Builds a dependency graph from component relationships using optimized lookups
 * @param components The list of components to analyze
 * @param lookupService Pre-initialized lookup service for O(1) component resolution
 * @returns A dependency graph mapping unique component IDs to their dependencies
 */
export function buildDependencyGraph(
  components: ComponentRelation[],
  lookupService: ComponentLookupService
): DependencyGraph {
  const graph: DependencyGraph = {};

  for (const component of components) {
    const componentId = generateComponentId(component);

    // Resolve all imports to target component IDs using O(1) lookups
    const targetComponentIds: string[] = [];

    for (const importPath of component.imports) {
      const resolvedIds = lookupService.resolveImportToComponentIds(importPath);

      // Add all resolved component IDs, excluding self-references
      for (const targetId of resolvedIds) {
        if (targetId !== componentId) {
          targetComponentIds.push(targetId);
        }
      }
    }

    // Remove duplicates and store in graph
    graph[componentId] = Array.from(new Set(targetComponentIds));
  }

  return graph;
}
