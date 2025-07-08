import { ComponentRelation } from "../../../types";
import { generateComponentId } from "../../../utils/common/analysisUtils";

export function calculateCouplingDegree(components: ComponentRelation[]): {
  [key: string]: number;
} {
  const coupling: { [key: string]: number } = {};
  const totalComponents = components.length;

  // Build dependency maps for more accurate analysis using unique IDs
  const componentMap = new Map<string, ComponentRelation>();
  const componentsByName = new Map<string, ComponentRelation[]>();
  const internalDependencies = new Map<string, Set<string>>();
  const externalDependencies = new Map<string, Set<string>>();

  // Index components for quick lookup
  components.forEach((component) => {
    const componentId = generateComponentId(component);
    componentMap.set(componentId, component);

    // Also index by name for import resolution
    if (!componentsByName.has(component.name)) {
      componentsByName.set(component.name, []);
    }
    componentsByName.get(component.name)!.push(component);

    internalDependencies.set(componentId, new Set());
    externalDependencies.set(componentId, new Set());
  });

  // Categorize dependencies
  components.forEach((component) => {
    const componentId = generateComponentId(component);
    const internalDeps = internalDependencies.get(componentId)!;
    const externalDeps = externalDependencies.get(componentId)!;

    component.imports.forEach((importPath) => {
      // Check if import is an internal component
      const matchingComponents = findMatchingComponents(
        importPath,
        components,
        componentsByName
      );

      if (matchingComponents.length > 0) {
        // It's an internal dependency
        matchingComponents.forEach((matchingComp) => {
          const targetId = generateComponentId(matchingComp);
          if (targetId !== componentId) {
            // Avoid self-references
            internalDeps.add(targetId);
          }
        });
      } else {
        // It's an external dependency
        externalDeps.add(importPath);
      }
    });
  });

  components.forEach((component) => {
    const componentId = generateComponentId(component);
    let couplingScore = 0;

    // Base coupling from imports and usage (normalized)
    const directConnections =
      component.imports.length + component.usedBy.length;
    const baseCoupling = directConnections / Math.max(totalComponents - 1, 1);

    // Internal coupling (more significant than external)
    const internalDeps = internalDependencies.get(componentId)!;
    const internalCoupling =
      internalDeps.size / Math.max(totalComponents - 1, 1);

    // External coupling (less critical for internal coupling degree)
    const externalDeps = externalDependencies.get(componentId)!;
    const externalCoupling = Math.min(externalDeps.size / 20, 1); // Cap external influence

    // Bidirectional coupling (components that both import and are used by this component)
    const bidirectionalConnections = component.imports.filter((imp) =>
      component.usedBy.some((user) => imp.includes(user) || user.includes(imp))
    ).length;
    const bidirectionalCoupling =
      bidirectionalConnections / Math.max(totalComponents - 1, 1);

    // Transitive coupling (components connected through intermediaries)
    const transitiveCoupling = calculateTransitiveCoupling(
      component,
      components,
      componentMap,
      componentsByName
    );

    // Function call coupling
    let functionCallCoupling = 0;
    if (component.functionCalls) {
      const totalFunctionCalls = Object.values(component.functionCalls).reduce(
        (sum, calls) => sum + calls.length,
        0
      );
      functionCallCoupling = Math.min(
        totalFunctionCalls / (totalComponents * 5),
        1
      );
    }

    // Hub component penalty (components with very high usage)
    const hubPenalty =
      component.usedBy.length > totalComponents * 0.3
        ? (component.usedBy.length / totalComponents) * 0.2
        : 0;

    // Shared directory coupling boost
    const sharedDirectoryBoost =
      component.directory.includes("shared") ||
      component.directory.includes("common") ||
      component.directory.includes("utils")
        ? 0.1
        : 0;

    // Calculate weighted coupling score
    couplingScore =
      baseCoupling * 0.3 + // Base connections
      internalCoupling * 0.4 + // Internal dependencies (most important)
      externalCoupling * 0.1 + // External dependencies
      bidirectionalCoupling * 0.15 + // Bidirectional coupling
      transitiveCoupling * 0.05 + // Transitive connections
      functionCallCoupling * 0.1 + // Function-level coupling
      hubPenalty + // Hub component penalty
      sharedDirectoryBoost; // Shared component boost

    // Apply coupling intensity multiplier for highly connected components
    if (directConnections > totalComponents * 0.2) {
      couplingScore *= 1 + (directConnections / totalComponents) * 0.5;
    }

    // Normalize to reasonable range and round, using unique component ID as key
    coupling[componentId] = Math.round(Math.min(couplingScore, 2) * 100) / 100;
  });

  return coupling;
}

/**
 * Find matching components for an import path
 */
function findMatchingComponents(
  importPath: string,
  allComponents: ComponentRelation[],
  componentsByName: Map<string, ComponentRelation[]>
): ComponentRelation[] {
  const results: ComponentRelation[] = [];

  // Strategy 1: Direct name match
  const directMatches = componentsByName.get(importPath) || [];
  results.push(...directMatches);

  if (results.length > 0) {
    return results;
  }

  // Strategy 2: Check by file path patterns
  const matchingComponents = allComponents.filter(
    (c) =>
      c.fullPath.includes(importPath) ||
      importPath.includes(c.name) ||
      c.exports.some((exp) => exp === importPath)
  );

  results.push(...matchingComponents);
  return results;
}

function calculateTransitiveCoupling(
  component: ComponentRelation,
  allComponents: ComponentRelation[],
  componentMap: Map<string, ComponentRelation>,
  componentsByName: Map<string, ComponentRelation[]>
): number {
  const visited = new Set<string>();
  const transitiveDeps = new Set<string>();
  const componentId = generateComponentId(component);

  function findTransitiveDependencies(compId: string, depth: number): void {
    if (depth > 2 || visited.has(compId)) return; // Limit depth to avoid cycles

    visited.add(compId);
    const comp = componentMap.get(compId);
    if (!comp) return;

    comp.imports.forEach((imp) => {
      // Find matching components for this import
      const matchingComponents = findMatchingComponents(
        imp,
        allComponents,
        componentsByName
      );

      matchingComponents.forEach((matchingComp) => {
        const matchingCompId = generateComponentId(matchingComp);
        if (matchingCompId !== componentId) {
          transitiveDeps.add(matchingCompId);
          findTransitiveDependencies(matchingCompId, depth + 1);
        }
      });
    });
  }

  // Start from component's direct imports
  component.imports.forEach((imp) => {
    const matchingComponents = findMatchingComponents(
      imp,
      allComponents,
      componentsByName
    );
    matchingComponents.forEach((matchingComp) => {
      const matchingCompId = generateComponentId(matchingComp);
      if (matchingCompId !== componentId) {
        findTransitiveDependencies(matchingCompId, 0);
      }
    });
  });

  return Math.min(
    transitiveDeps.size / Math.max(allComponents.length - 1, 1),
    0.5
  );
}
