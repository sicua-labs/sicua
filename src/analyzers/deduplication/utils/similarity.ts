import {
  ComponentRelation,
  ComponentSimilarity,
  ComponentDeduplicationData,
  JSXDifference,
  JSXStructure,
  PropDifference,
  PropSignature,
} from "../../../types";
import { generateComponentId } from "../../../utils/common/analysisUtils";
import {
  SimilarityThresholds,
  DEFAULT_SIMILARITY_THRESHOLDS,
} from "../types/deduplication.types";
import { calculatePropsSimilarity } from "./propComparison";
import {
  calculateChildComponentSimilarity,
  calculateStructureComplexity,
  calculateStructureSimilarity,
  calculateStyleSimilarity,
  findCommonStructure,
} from "./structureComparison";
import ShortUniqueId from "short-unique-id";

const { randomUUID } = new ShortUniqueId();

/**
 * Compares two components for similarity
 * @param comp1 First component
 * @param comp2 Second component
 * @param thresholds Similarity thresholds configuration
 * @returns A similarity result with scores and common elements
 */
export function compareComponents(
  comp1: ComponentRelation,
  comp2: ComponentRelation,
  thresholds: SimilarityThresholds = DEFAULT_SIMILARITY_THRESHOLDS
): ComponentSimilarity {
  // Find common props and structures
  const commonProps = findCommonProps(comp1.props, comp2.props);
  const commonStructure = findCommonStructure(
    comp1.jsxStructure,
    comp2.jsxStructure
  );

  // Calculate structure complexity to determine if components are complex enough to compare
  const complexity1 = calculateStructureComplexity(comp1.jsxStructure);
  const complexity2 = calculateStructureComplexity(comp2.jsxStructure);
  const complexityRatio =
    Math.min(complexity1.complexity, complexity2.complexity) /
    Math.max(complexity1.complexity, complexity2.complexity);

  // If structures aren't similar enough in complexity, assign low similarity
  if (
    complexityRatio < thresholds.minComplexityRatio ||
    complexity1.complexity < thresholds.minStructureComplexity ||
    complexity2.complexity < thresholds.minStructureComplexity
  ) {
    return createLowSimilarityResult(
      comp1,
      comp2,
      commonProps,
      commonStructure
    );
  }

  // Calculate similarity scores for different aspects
  const propsScore = calculatePropsSimilarity(commonProps, [comp1, comp2]);
  const childComponentScore = calculateChildComponentSimilarity(
    comp1.jsxStructure,
    comp2.jsxStructure
  );
  const styleScore = calculateStyleSimilarity(
    comp1.jsxStructure,
    comp2.jsxStructure
  );
  const baseStructureScore = calculateStructureSimilarity(commonStructure, [
    comp1.jsxStructure,
    comp2.jsxStructure,
  ]);

  // Calculate weighted similarity score
  const structureScore =
    (baseStructureScore + childComponentScore + styleScore) / 3;
  const similarityScore =
    Math.round((propsScore * 0.4 + structureScore * 0.6) * 100) / 100;

  // Generate deduplication data
  const deduplicationData = generateDeduplicationData(
    [comp1, comp2],
    commonProps,
    commonStructure
  );

  return {
    groupId: randomUUID(),
    components: [generateComponentId(comp1), generateComponentId(comp2)], // Use unique component IDs
    commonProps,
    commonJSXStructure: commonStructure,
    similarityScore,
    deduplicationData,
  };
}

/**
 * Creates a result for components with low similarity
 */
function createLowSimilarityResult(
  comp1: ComponentRelation,
  comp2: ComponentRelation,
  commonProps: PropSignature[],
  commonStructure: JSXStructure[]
): ComponentSimilarity {
  const similarityScore = 0.1;

  return {
    groupId: randomUUID(),
    components: [generateComponentId(comp1), generateComponentId(comp2)], // Use unique component IDs
    commonProps,
    commonJSXStructure: commonStructure,
    similarityScore,
    deduplicationData: generateDeduplicationData(
      [comp1, comp2],
      commonProps,
      commonStructure
    ),
  };
}

/**
 * Finds common props between two sets of props
 */
function findCommonProps(
  props1?: PropSignature[],
  props2?: PropSignature[]
): PropSignature[] {
  if (!props1 || !props2) return [];

  return props1.filter((prop1) =>
    props2.some(
      (prop2) => prop1.name === prop2.name && prop1.type === prop2.type
    )
  );
}

/**
 * Generates detailed deduplication data for components
 */
export function generateDeduplicationData(
  components: ComponentRelation[],
  commonProps: PropSignature[],
  commonStructure: JSXStructure[]
): ComponentDeduplicationData {
  // Basic component data with unique component IDs
  const componentData = components.map((comp) => ({
    name: comp.name, // Keep original name for display
    path: comp.fullPath,
    content: comp.content || "",
    componentId: generateComponentId(comp), // Add unique component ID
  }));

  // Analyze prop similarities and differences with unique component IDs
  const propSimilarities = commonProps.map((prop) => ({
    name: prop.name,
    type: prop.type,
    isRequired: prop.required,
    usedInComponents: components.map((c) => generateComponentId(c)), // Use unique component IDs
  }));

  const propDifferences: PropDifference[] = components.map((comp) => ({
    componentName: comp.name, // Keep original name for display
    componentId: generateComponentId(comp), // Add unique component ID
    uniqueProps: (comp.props || [])
      .filter((prop) => !commonProps.some((cp) => cp.name === prop.name))
      .map((prop) => ({
        name: prop.name,
        type: prop.type,
        isRequired: prop.required,
      })),
  }));

  // Analyze JSX similarities and differences
  const jsxSimilarity = {
    sharedRootElement: commonStructure[0]?.tagName || "",
    sharedStructure: extractSharedStructure(commonStructure),
    sharedClassNames: extractSharedClassNames(commonStructure),
  };

  const jsxDifferences: JSXDifference[] = components.map((comp) => ({
    componentName: comp.name, // Keep original name for display
    componentId: generateComponentId(comp), // Add unique component ID
    uniqueElements: findUniqueElements(comp.jsxStructure, commonStructure),
  }));

  return {
    components: componentData,
    commonalities: {
      props: propSimilarities,
      structure: jsxSimilarity,
    },
    differences: {
      props: propDifferences,
      structure: jsxDifferences,
    },
  };
}

/**
 * Extracts the structure of shared elements
 */
function extractSharedStructure(structure: JSXStructure[]): string[] {
  const result: string[] = [];
  const process = (node: JSXStructure) => {
    result.push(node.tagName);
    node.children.forEach(process);
  };
  structure.forEach(process);
  return result;
}

/**
 * Extracts shared class names from JSX structure
 */
function extractSharedClassNames(structure: JSXStructure[]): string[] {
  const classNames: string[] = [];
  const process = (node: JSXStructure) => {
    const className = node.props.find((p) => p.name === "className");
    if (className) {
      const classes = className.type
        .replace(/['"]/g, "")
        .split(" ")
        .filter(Boolean);
      classNames.push(...classes);
    }
    node.children.forEach(process);
  };
  structure.forEach(process);
  return [...new Set(classNames)];
}

/**
 * Finds elements unique to a component's structure
 */
function findUniqueElements(
  componentStructure?: JSXStructure,
  commonStructure?: JSXStructure[]
): { element: string; location: string; props?: Record<string, string> }[] {
  const unique: {
    element: string;
    location: string;
    props?: Record<string, string>;
  }[] = [];

  const process = (
    node?: JSXStructure,
    commonNode?: JSXStructure,
    path: string = ""
  ) => {
    if (!node) return;

    if (!commonNode || node.tagName !== commonNode.tagName) {
      unique.push({
        element: node.tagName,
        location: path,
        props: node.props.reduce(
          (acc, prop) => ({
            ...acc,
            [prop.name]: prop.type,
          }),
          {}
        ),
      });
    }

    node.children.forEach((child, index) => {
      process(
        child,
        commonNode?.children[index],
        `${path}${path ? "." : ""}children[${index}]`
      );
    });
  };

  process(componentStructure, commonStructure?.[0]);
  return unique;
}

/**
 * Filters similarities based on a minimum threshold
 * @param similarities Array of component similarities
 * @param threshold Minimum similarity score threshold (0.0-1.0)
 * @returns Filtered array of similarities
 */
export function filterSignificantSimilarities(
  similarities: ComponentSimilarity[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLDS.minSimilarityScore
): ComponentSimilarity[] {
  return similarities.filter((s) => s.similarityScore >= threshold);
}
