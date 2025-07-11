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
  COMMON_UI_PATTERNS,
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
 * Compares two components for similarity with balanced filtering
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

  // Calculate structure complexity
  const complexity1 = calculateStructureComplexity(comp1.jsxStructure);
  const complexity2 = calculateStructureComplexity(comp2.jsxStructure);
  const complexityRatio =
    Math.min(complexity1.complexity, complexity2.complexity) /
    Math.max(complexity1.complexity, complexity2.complexity);

  // Check minimum complexity requirements
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

  // Calculate base similarity scores
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

  // Apply common pattern penalty
  const commonPatternPenalty = calculateCommonPatternPenalty(
    comp1.jsxStructure,
    comp2.jsxStructure
  );

  // Calculate weighted similarity score
  const structureScore =
    (baseStructureScore + childComponentScore + styleScore) / 3;
  const rawSimilarityScore = propsScore * 0.4 + structureScore * 0.6;

  // Apply penalty for too many common UI patterns
  const similarityScore = Math.max(
    0,
    Math.round((rawSimilarityScore - commonPatternPenalty) * 100) / 100
  );

  const deduplicationData = generateDeduplicationData(
    [comp1, comp2],
    commonProps,
    commonStructure
  );

  return {
    groupId: randomUUID(),
    components: [generateComponentId(comp1), generateComponentId(comp2)],
    commonProps,
    commonJSXStructure: commonStructure,
    similarityScore,
    deduplicationData,
  };
}

/**
 * Calculates penalty for components that share mostly common UI patterns
 */
function calculateCommonPatternPenalty(
  struct1?: JSXStructure,
  struct2?: JSXStructure
): number {
  if (!struct1 || !struct2) return 0;

  const elements1 = getAllElementNames(struct1);
  const elements2 = getAllElementNames(struct2);

  // Count common UI patterns
  const commonPatterns1 = elements1.filter((el) =>
    COMMON_UI_PATTERNS.includes(el)
  ).length;
  const commonPatterns2 = elements2.filter((el) =>
    COMMON_UI_PATTERNS.includes(el)
  ).length;

  // Calculate ratio of common patterns
  const ratio1 = elements1.length > 0 ? commonPatterns1 / elements1.length : 0;
  const ratio2 = elements2.length > 0 ? commonPatterns2 / elements2.length : 0;
  const avgRatio = (ratio1 + ratio2) / 2;

  // Apply penalty if more than 70% of elements are common UI patterns
  if (avgRatio > 0.7) {
    return (avgRatio - 0.7) * 0.5; // Up to 15% penalty
  }

  return 0;
}

/**
 * Gets all element names from JSX structure
 */
function getAllElementNames(structure: JSXStructure): string[] {
  const names = [structure.tagName];
  structure.children.forEach((child) => {
    names.push(...getAllElementNames(child));
  });
  return names;
}

/**
 * Creates a low similarity result
 */
function createLowSimilarityResult(
  comp1: ComponentRelation,
  comp2: ComponentRelation,
  commonProps: PropSignature[],
  commonStructure: JSXStructure[]
): ComponentSimilarity {
  return {
    groupId: randomUUID(),
    components: [generateComponentId(comp1), generateComponentId(comp2)],
    commonProps,
    commonJSXStructure: commonStructure,
    similarityScore: 0.1,
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
  const componentData = components.map((comp) => ({
    name: comp.name,
    path: comp.fullPath,
    content: comp.content || "",
    componentId: generateComponentId(comp),
  }));

  const propSimilarities = commonProps.map((prop) => ({
    name: prop.name,
    type: prop.type,
    isRequired: prop.required,
    usedInComponents: components.map((c) => generateComponentId(c)),
  }));

  const propDifferences: PropDifference[] = components.map((comp) => ({
    componentName: comp.name,
    componentId: generateComponentId(comp),
    uniqueProps: (comp.props || [])
      .filter((prop) => !commonProps.some((cp) => cp.name === prop.name))
      .map((prop) => ({
        name: prop.name,
        type: prop.type,
        isRequired: prop.required,
      })),
  }));

  const jsxSimilarity = {
    sharedRootElement: commonStructure[0]?.tagName || "",
    sharedStructure: extractSharedStructure(commonStructure),
    sharedClassNames: extractSharedClassNames(commonStructure),
  };

  const jsxDifferences: JSXDifference[] = components.map((comp) => ({
    componentName: comp.name,
    componentId: generateComponentId(comp),
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
 */
export function filterSignificantSimilarities(
  similarities: ComponentSimilarity[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLDS.minSimilarityScore
): ComponentSimilarity[] {
  return similarities.filter((s) => s.similarityScore >= threshold);
}
