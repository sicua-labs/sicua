import {
  ComponentSimilarity,
  JSXStructure,
  PropSignature,
  JSXSimilarity,
} from "../../../types";
import ShortUniqueId from "short-unique-id";
import { GroupData } from "../types/deduplication.types";

const { randomUUID } = new ShortUniqueId();

/**
 * Extract component name from component ID (format: fileName#componentName)
 */
function extractComponentNameFromId(componentId: string): string {
  if (componentId.includes("#")) {
    return componentId.split("#")[1];
  }
  // Fallback: if it's not a unique ID, treat as filename
  return (
    componentId
      .split("/")
      .pop()
      ?.replace(/\.[jt]sx?$/, "") || ""
  );
}

/**
 * Groups similar components together based on comparison results
 * @param similarities Individual component similarity results
 * @returns Grouped component similarities
 */
export function groupSimilarComponents(
  similarities: ComponentSimilarity[]
): ComponentSimilarity[] {
  const groups: GroupData[] = [];

  // First pass: create initial groups based on component overlap
  similarities.forEach((similarity) => {
    const overlappingGroups = groups.filter((group) =>
      similarity.components.some((comp) => group.componentPaths.has(comp))
    );

    if (overlappingGroups.length > 0) {
      // Merge all overlapping groups
      const mergedGroup = overlappingGroups[0];

      // Add all components from this similarity
      similarity.components.forEach((comp) =>
        mergedGroup.componentPaths.add(comp)
      );
      mergedGroup.similarities.push(similarity);

      // Merge any other overlapping groups into the first one
      if (overlappingGroups.length > 1) {
        for (let i = 1; i < overlappingGroups.length; i++) {
          overlappingGroups[i].componentPaths.forEach((comp) =>
            mergedGroup.componentPaths.add(comp)
          );
          mergedGroup.similarities.push(...overlappingGroups[i].similarities);

          // Remove the merged group
          const index = groups.indexOf(overlappingGroups[i]);
          if (index !== -1) {
            groups.splice(index, 1);
          }
        }
      }
    } else {
      // Create new group
      groups.push({
        componentPaths: new Set(similarity.components),
        similarities: [similarity],
      });
    }
  });

  // Second pass: convert groups to ComponentSimilarity format
  return groups.map((group) => {
    const componentIds = Array.from(group.componentPaths);

    // Calculate internal similarity matrix for group members
    const internalSimilarityMatrix = calculateInternalSimilarityMatrix(
      group.similarities,
      componentIds
    );

    return {
      groupId: randomUUID(),
      components: componentIds, // These are now unique component IDs
      commonProps: mergeCommonProps(group.similarities),
      commonJSXStructure: mergeCommonStructure(group.similarities),
      similarityScore: calculateGroupSimilarity(group.similarities),
      deduplicationData: enhanceDeduplicationDataWithGroupInfo(
        group.similarities,
        componentIds,
        internalSimilarityMatrix
      ),
    };
  });
}

/**
 * Calculates a matrix of similarity scores between all components in a group
 * @param similarities The similarity results in the group
 * @param componentIds All component IDs in the group
 * @returns A map of component pairs to their similarity scores
 */
function calculateInternalSimilarityMatrix(
  similarities: ComponentSimilarity[],
  componentIds: string[]
): Map<string, number> {
  const matrix = new Map<string, number>();

  // Initialize matrix with known similarities
  similarities.forEach((similarity) => {
    if (similarity.components.length === 2) {
      const key = `${similarity.components[0]}:${similarity.components[1]}`;
      matrix.set(key, similarity.similarityScore);

      // Also set reverse direction
      const reverseKey = `${similarity.components[1]}:${similarity.components[0]}`;
      matrix.set(reverseKey, similarity.similarityScore);
    }
  });

  // For pairs without direct similarity, use transitive relationship
  // This is a simplification - a more sophisticated approach would be to
  // interpolate based on the path between components
  for (let i = 0; i < componentIds.length; i++) {
    for (let j = i + 1; j < componentIds.length; j++) {
      const key = `${componentIds[i]}:${componentIds[j]}`;
      const reverseKey = `${componentIds[j]}:${componentIds[i]}`;

      if (!matrix.has(key)) {
        // If no direct similarity exists, estimate it as the average of
        // similarities in the group
        const avgScore = calculateGroupSimilarity(similarities);
        matrix.set(key, avgScore * 0.8); // Apply penalty factor for indirect
        matrix.set(reverseKey, avgScore * 0.8);
      }
    }
  }

  return matrix;
}

/**
 * Enhances deduplication data with group-level information
 * @param similarities Similarities in the group
 * @param componentIds All component IDs
 * @param similarityMatrix Matrix of intra-group similarities
 * @returns Enhanced deduplication data
 */
function enhanceDeduplicationDataWithGroupInfo(
  similarities: ComponentSimilarity[],
  componentIds: string[],
  similarityMatrix: Map<string, number>
): any {
  // Use the first similarity's deduplication data as a base
  if (similarities.length === 0) {
    return {};
  }

  const baseData = similarities[0].deduplicationData;

  // Enhance with group information
  return {
    ...baseData,
    components: componentIds.map((componentId) => {
      // Find component data for this ID
      const existingComponentData = baseData.components.find(
        (c) => c.componentId === componentId || c.path === componentId
      );

      if (existingComponentData) {
        return existingComponentData;
      }

      // If not found in base data, try to find in other similarities
      for (let i = 1; i < similarities.length; i++) {
        const compData = similarities[i].deduplicationData.components.find(
          (c) => c.componentId === componentId || c.path === componentId
        );
        if (compData) {
          return compData;
        }
      }

      // If still not found, create minimal data using component ID
      return {
        name: extractComponentNameFromId(componentId),
        path: componentId.includes("#")
          ? componentId.split("#")[0]
          : componentId, // Extract file path if it's a unique ID
        content: "",
        componentId: componentId,
      };
    }),
    commonalities: mergeCommonalities(similarities),
    differences: mergeDifferences(similarities, componentIds),
    internalSimilarities: Array.from(similarityMatrix.entries()).map(
      ([key, score]) => {
        const [source, target] = key.split(":");
        return { source, target, score };
      }
    ),
  };
}

/**
 * Merges common properties across multiple deduplication data objects
 * @param similarities Similarities to merge
 * @returns Merged commonalities
 */
function mergeCommonalities(similarities: ComponentSimilarity[]): any {
  if (similarities.length === 0)
    return {
      props: [],
      structure: {
        sharedRootElement: "",
        sharedStructure: [],
        sharedClassNames: [],
      },
    };

  // Start with the first similarity's commonalities
  const base = similarities[0].deduplicationData.commonalities;

  // Ensure base.props exists with fallback
  const baseProps = base.props || [];

  // For additional similarities, only keep what's common to all
  const props = similarities.reduce(
    (common, current) => {
      // Get prop similarities from current with fallback
      const currentProps = current.deduplicationData.commonalities.props || [];

      // Keep only props that exist in both
      return common.filter((prop) =>
        currentProps.some((p) => p.name === prop.name && p.type === prop.type)
      );
    },
    [...baseProps] // Use baseProps instead of base.props
  );

  // Merge structure similarities with fallbacks
  const structure: JSXSimilarity = {
    sharedRootElement: base.structure?.sharedRootElement || "",
    sharedStructure: similarities.reduce(
      (common, current) => {
        const currentStructure =
          current.deduplicationData.commonalities.structure?.sharedStructure ||
          [];
        return common.filter((item) => currentStructure.includes(item));
      },
      [...(base.structure?.sharedStructure || [])] // Add fallback for base.structure.sharedStructure
    ),
    sharedClassNames: similarities.reduce(
      (common, current) => {
        const currentClassNames =
          current.deduplicationData.commonalities.structure?.sharedClassNames ||
          [];
        return common.filter((item) => currentClassNames.includes(item));
      },
      [...(base.structure?.sharedClassNames || [])] // Add fallback for base.structure.sharedClassNames
    ),
  };

  return { props, structure };
}

/**
 * Merges differences across multiple deduplication data objects
 * @param similarities Similarities to merge
 * @param componentIds All component IDs in the group
 * @returns Merged differences
 */
function mergeDifferences(
  similarities: ComponentSimilarity[],
  componentIds: string[]
): any {
  // Get all component names from IDs
  const componentNames = componentIds.map((id) =>
    extractComponentNameFromId(id)
  );

  // Collect all differences
  const propDifferences: Record<string, any[]> = {};
  const structureDifferences: Record<string, any[]> = {};

  // Initialize records for each component
  componentNames.forEach((name) => {
    propDifferences[name] = [];
    structureDifferences[name] = [];
  });

  // Collect differences from all similarities
  similarities.forEach((similarity) => {
    const diffs = similarity.deduplicationData?.differences || {};

    // Process prop differences
    if (diffs.props) {
      diffs.props.forEach((diff) => {
        if (
          diff.componentName &&
          diff.uniqueProps &&
          Array.isArray(diff.uniqueProps)
        ) {
          // Ensure the component exists in our differences record
          if (!propDifferences[diff.componentName]) {
            propDifferences[diff.componentName] = [];
          }

          // Append unique props if they don't already exist
          propDifferences[diff.componentName] = [
            ...propDifferences[diff.componentName],
            ...diff.uniqueProps.filter(
              (prop) =>
                !propDifferences[diff.componentName].some(
                  (p) => p.name === prop.name
                )
            ),
          ];
        }
      });
    }

    // Process structure differences
    if (diffs.structure) {
      diffs.structure.forEach((diff) => {
        if (
          diff.componentName &&
          diff.uniqueElements &&
          Array.isArray(diff.uniqueElements)
        ) {
          // Ensure the component exists in our differences record
          if (!structureDifferences[diff.componentName]) {
            structureDifferences[diff.componentName] = [];
          }

          // Append unique elements if they don't already exist
          structureDifferences[diff.componentName] = [
            ...structureDifferences[diff.componentName],
            ...diff.uniqueElements.filter(
              (elem) =>
                !structureDifferences[diff.componentName].some(
                  (e) =>
                    e.element === elem.element && e.location === elem.location
                )
            ),
          ];
        }
      });
    }
  });

  // Format differences for return
  const props = Object.entries(propDifferences).map(
    ([componentName, uniqueProps]) => ({ componentName, uniqueProps })
  );

  const structure = Object.entries(structureDifferences).map(
    ([componentName, uniqueElements]) => ({ componentName, uniqueElements })
  );

  return { props, structure };
}

/**
 * Merges common props across multiple similarity results
 * @param similarities The similarity results to merge
 * @returns Merged common props
 */
function mergeCommonProps(
  similarities: ComponentSimilarity[]
): PropSignature[] {
  if (similarities.length === 0) return [];
  if (similarities.length === 1) return similarities[0].commonProps;

  // Start with props from first similarity
  let commonProps = [...similarities[0].commonProps];

  // Intersect with each subsequent similarity
  for (let i = 1; i < similarities.length; i++) {
    commonProps = commonProps.filter((prop) =>
      similarities[i].commonProps.some(
        (p) => p.name === prop.name && p.type === prop.type
      )
    );
  }

  return commonProps;
}

/**
 * Merges common JSX structure across multiple similarity results
 * @param similarities The similarity results to merge
 * @returns Merged common JSX structure
 */
function mergeCommonStructure(
  similarities: ComponentSimilarity[]
): JSXStructure[] {
  if (similarities.length === 0) return [];
  if (similarities.length === 1) return similarities[0].commonJSXStructure;

  // If any similarity has no common structure, the merged result has no common structure
  if (similarities.some((s) => s.commonJSXStructure.length === 0)) {
    return [];
  }

  // Start with structure from first similarity
  let commonStructure = similarities[0].commonJSXStructure;

  // Simple approach: if the structures don't match in depth or shape, return empty
  for (let i = 1; i < similarities.length; i++) {
    const currentStructure = similarities[i].commonJSXStructure;

    // If root element doesn't match, no common structure
    if (
      commonStructure.length === 0 ||
      currentStructure.length === 0 ||
      commonStructure[0].tagName !== currentStructure[0].tagName
    ) {
      return [];
    }

    // Create merged structure
    commonStructure = [
      {
        tagName: commonStructure[0].tagName,
        props: [], // Props handled separately
        children: [], // Simple approach: don't try to merge children
      },
    ];
  }

  return commonStructure;
}

/**
 * Calculates the overall similarity score for a group
 * @param similarities The similarity results to average
 * @returns Average similarity score
 */
function calculateGroupSimilarity(similarities: ComponentSimilarity[]): number {
  if (similarities.length === 0) return 0;

  const sum = similarities.reduce(
    (total, similarity) => total + similarity.similarityScore,
    0
  );

  // Round to 2 decimal places
  return Math.round((sum / similarities.length) * 100) / 100;
}

/**
 * Consolidates a list of similarities to ensure best coverage and quality
 * This version preserves group information instead of breaking them down
 * @param similarities List of component similarities
 * @returns Processed list with optimal coverage
 */
export function consolidateSimilarities(
  similarities: ComponentSimilarity[]
): ComponentSimilarity[] {
  // Sort by number of components and then by similarity score
  const sorted = [...similarities].sort((a, b) => {
    const sizeDiff = b.components.length - a.components.length;
    if (sizeDiff !== 0) return sizeDiff;
    return b.similarityScore - a.similarityScore;
  });

  // Track which components have been included in a result
  const includedComponents = new Set<string>();
  const result: ComponentSimilarity[] = [];

  // First pass: add all groups with 3 or more components
  sorted.forEach((similarity) => {
    if (similarity.components.length >= 3) {
      // Check how many components would be newly included
      const newComponents = similarity.components.filter(
        (comp) => !includedComponents.has(comp)
      );

      // If at least 50% are new, include this group
      if (newComponents.length >= similarity.components.length * 0.5) {
        result.push(similarity);
        similarity.components.forEach((comp) => includedComponents.add(comp));
      }
    }
  });

  // Second pass: add important pairs if they don't break group integrity
  sorted
    .filter((s) => s.components.length === 2)
    .forEach((similarity) => {
      const [comp1, comp2] = similarity.components;

      // Only include if both components are not already included
      // OR if similarity score is very high and they're in the same group
      if (
        (!includedComponents.has(comp1) && !includedComponents.has(comp2)) ||
        (similarity.similarityScore > 0.8 &&
          result.some(
            (group) =>
              group.components.includes(comp1) &&
              group.components.includes(comp2)
          ))
      ) {
        result.push(similarity);
        similarity.components.forEach((comp) => includedComponents.add(comp));
      }
    });

  return result;
}
