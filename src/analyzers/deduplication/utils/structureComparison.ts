import { JSXStructure } from "../../../types";
import {
  FlattenedJSXNode,
  StructureComplexityInfo,
} from "../types/deduplication.types";

/**
 * Finds common JSX structure between two component structures
 * @param struct1 First JSX structure
 * @param struct2 Second JSX structure
 * @returns Array of common JSX structures
 */
export function findCommonStructure(
  struct1?: JSXStructure,
  struct2?: JSXStructure
): JSXStructure[] {
  if (!struct1 || !struct2) return [];

  // Check for similar structure even with different root names
  if (isStructurallySimilar(struct1, struct2)) {
    // Return common structure recursively
    return [
      {
        tagName: struct1.tagName,
        props: [], // Props will be handled by prop comparison utilities
        children: struct1.children.map(
          (child, index) =>
            // For each child in struct1, find common structure with corresponding child in struct2
            findCommonStructure(child, struct2.children[index])[0] || child
        ),
      },
    ];
  }

  return [];
}

/**
 * Calculates similarity between two JSX structures
 * @param common Common JSX structure
 * @param originals Array of original JSX structures
 * @returns Similarity score between 0 and 1
 */
export function calculateStructureSimilarity(
  common: JSXStructure[],
  originals: (JSXStructure | undefined)[]
): number {
  if (!common.length || originals.some((o) => !o)) return 0;

  const commonCount = countJSXNodes(common);
  const originalCounts = originals.map((o) => countJSXNodes([o!]));

  return commonCount / Math.max(...originalCounts);
}

/**
 * Calculates similarity of child components between structures
 * @param struct1 First JSX structure
 * @param struct2 Second JSX structure
 * @returns Similarity score between 0 and 1
 */
export function calculateChildComponentSimilarity(
  struct1?: JSXStructure,
  struct2?: JSXStructure
): number {
  if (!struct1 || !struct2) return 0;

  // Get all nodes in a flat structure with their depth
  const nodes1 = flattenStructure(struct1);
  const nodes2 = flattenStructure(struct2);

  // Count components at each depth level
  const depthMap1 = getDepthMap(nodes1);
  const depthMap2 = getDepthMap(nodes2);

  // Compare structures at each depth
  const maxDepth = Math.max(
    ...Array.from(depthMap1.keys()),
    ...Array.from(depthMap2.keys())
  );

  let similaritySum = 0;
  let depthCount = 0;

  for (let depth = 0; depth <= maxDepth; depth++) {
    const map1 = depthMap1.get(depth) || new Map();
    const map2 = depthMap2.get(depth) || new Map();

    const allTags = new Set([...map1.keys(), ...map2.keys()]);
    let depthSimilarity = 0;

    allTags.forEach((tag) => {
      const count1 = map1.get(tag) || 0;
      const count2 = map2.get(tag) || 0;

      // If both structures have this tag at this depth
      if (count1 > 0 && count2 > 0) {
        depthSimilarity += Math.min(count1, count2) / Math.max(count1, count2);
      }
    });

    if (allTags.size > 0) {
      similaritySum += depthSimilarity / allTags.size;
      depthCount++;
    }
  }

  return depthCount > 0 ? similaritySum / depthCount : 0;
}

/**
 * Calculates style similarity between two JSX structures based on className attributes
 * @param struct1 First JSX structure
 * @param struct2 Second JSX structure
 * @returns Similarity score between 0 and 1
 */
export function calculateStyleSimilarity(
  struct1?: JSXStructure,
  struct2?: JSXStructure
): number {
  if (!struct1 || !struct2) return 0;

  // Extract and compare className attributes
  const classes1 = getClassNames(struct1);
  const classes2 = getClassNames(struct2);

  if (classes1.size === 0 && classes2.size === 0) return 1; // Both have no classes, consider them similar

  const commonClasses = [...classes1].filter((c) => classes2.has(c));
  const totalClasses = new Set([...classes1, ...classes2]);

  return commonClasses.length / totalClasses.size;
}

/**
 * Calculates the complexity of a JSX structure
 * @param struct JSX structure to analyze
 * @returns Structure complexity information
 */
export function calculateStructureComplexity(
  struct?: JSXStructure
): StructureComplexityInfo {
  if (!struct) {
    return { totalNodes: 0, maxDepth: 0, componentCount: 0, complexity: 0 };
  }

  let totalNodes = 0;
  let maxDepth = 0;
  let componentCount = 0;
  let complexity = 0;

  // Traverse the structure to calculate metrics
  const traverse = (node: JSXStructure, depth: number) => {
    totalNodes++;
    maxDepth = Math.max(maxDepth, depth);

    // Add base complexity for the node
    let nodeComplexity = 1;

    // Add complexity for props
    nodeComplexity += node.props.length * 0.5;

    // Add complexity for custom components (uppercase first letter)
    if (node.tagName[0] === node.tagName[0].toUpperCase()) {
      nodeComplexity += 1;
      componentCount++;
    }

    // Add complexity for styling
    if (node.props.some((p) => p.name === "className")) {
      nodeComplexity += 0.5;
    }

    complexity += nodeComplexity;

    // Recursively process children
    node.children.forEach((child) => traverse(child, depth + 1));
  };

  traverse(struct, 0);

  return { totalNodes, maxDepth, componentCount, complexity };
}

/**
 * Counts the total number of nodes in a JSX structure
 * @param structure Array of JSX structures
 * @returns Total node count
 */
export function countJSXNodes(structure: JSXStructure[]): number {
  return structure.reduce(
    (count, node) => count + 1 + countJSXNodes(node.children),
    0
  );
}

/**
 * Checks if two JSX structures are similar in basic shape
 * @param s1 First JSX structure
 * @param s2 Second JSX structure
 * @returns Boolean indicating structural similarity
 */
function isStructurallySimilar(s1: JSXStructure, s2: JSXStructure): boolean {
  // Both are likely React components if they start with uppercase
  const bothComponents =
    s1.tagName[0] === s1.tagName[0].toUpperCase() &&
    s2.tagName[0] === s2.tagName[0].toUpperCase();

  return (
    s1.tagName === s2.tagName ||
    (bothComponents && s1.children.length === s2.children.length)
  );
}

/**
 * Flattens a JSX structure into an array of nodes with depth information
 * @param struct JSX structure to flatten
 * @returns Array of flattened nodes
 */
function flattenStructure(struct: JSXStructure): FlattenedJSXNode[] {
  const nodes: FlattenedJSXNode[] = [];

  const traverse = (node: JSXStructure, depth: number, path: string = "") => {
    const className = node.props.find((p) => p.name === "className")?.type;

    nodes.push({
      tagName: node.tagName,
      depth,
      path,
      className: className?.replace(/['"]/g, ""),
      props: node.props.map((p) => ({ name: p.name, value: p.type })),
    });

    node.children.forEach((child, index) => {
      traverse(child, depth + 1, `${path}${path ? "." : ""}children[${index}]`);
    });
  };

  traverse(struct, 0);
  return nodes;
}

/**
 * Creates a map of tag counts by depth
 * @param nodes Flattened JSX nodes
 * @returns Map of depth to tag counts
 */
function getDepthMap(
  nodes: FlattenedJSXNode[]
): Map<number, Map<string, number>> {
  const map = new Map<number, Map<string, number>>();

  nodes.forEach(({ tagName, depth }) => {
    if (!map.has(depth)) {
      map.set(depth, new Map());
    }
    const depthMap = map.get(depth)!;
    depthMap.set(tagName, (depthMap.get(tagName) || 0) + 1);
  });

  return map;
}

/**
 * Extracts all class names from a JSX structure
 * @param struct JSX structure
 * @returns Set of class names
 */
function getClassNames(struct: JSXStructure): Set<string> {
  const classes = new Set<string>();

  const addClasses = (s: JSXStructure) => {
    const className = s.props.find((p) => p.name === "className");
    if (className?.type) {
      const classNames = className.type
        .replace(/['"]/g, "")
        .split(" ")
        .filter(Boolean);
      classNames.forEach((c) => classes.add(c));
    }
    s.children.forEach(addClasses);
  };

  addClasses(struct);
  return classes;
}
