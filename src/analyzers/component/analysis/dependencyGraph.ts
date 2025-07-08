import { ComponentRelation, DependencyGraph } from "../../../types";
import { generateComponentId } from "../../../utils/common/analysisUtils";
import { normalizeImportPath } from "../utils/graphUtils";

/**
 * Builds a dependency graph from component relationships using unique component IDs
 * @param components The list of components to analyze
 * @returns A dependency graph mapping unique component IDs to their dependencies
 */
export function buildDependencyGraph(
  components: ComponentRelation[]
): DependencyGraph {
  const graph: DependencyGraph = {};

  // Create a map for efficient component lookup by name
  const componentsByName = new Map<string, ComponentRelation[]>();
  components.forEach((component) => {
    if (!componentsByName.has(component.name)) {
      componentsByName.set(component.name, []);
    }
    componentsByName.get(component.name)!.push(component);
  });

  components.forEach((component) => {
    const componentId = generateComponentId(component);

    graph[componentId] = component.imports
      .map((imp) => normalizeImportPath(imp, components))
      .flatMap((normalizedImport) => {
        // Find all components that match this import name
        const matchingComponents = componentsByName.get(normalizedImport) || [];
        // Return unique IDs for all matching components
        return matchingComponents.map((comp) => generateComponentId(comp));
      })
      .filter((targetId) => targetId !== componentId); // Avoid self-references
  });

  return graph;
}
