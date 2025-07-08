import { ComponentRelation } from "../../../types";
import { ComponentType } from "../types/deduplication.types";
import { memoize } from "lodash";
import { get as getLevenshteinDistance } from "fast-levenshtein";

/**
 * Names of components that should be excluded from deduplication analysis
 */
const EXCLUDED_COMPONENTS = new Set(["App", "Root", "Main", "Layout", "index"]);

/**
 * Memoized Levenshtein distance calculation for performance
 */
export const memoizedLevenshteinDistance = memoize(
  (str1: string, str2: string) => getLevenshteinDistance(str1, str2),
  (str1: string, str2: string) => `${str1}:${str2}`
);

/**
 * Determines if a component is valid for deduplication analysis
 * @param component The component to check
 * @returns boolean indicating if the component is valid for comparison
 */
export function isValidComponentForComparison(
  component: ComponentRelation
): boolean {
  const { name, fullPath } = component;
  const filePath = fullPath.toLowerCase();

  const checks = [
    () => !filePath.endsWith(".d.ts"),
    () => !filePath.includes(".test.") && !filePath.includes(".spec."),
    () => !name.startsWith("use"),
    () => !EXCLUDED_COMPONENTS.has(name),
    () => !isTypeFile(name),
    () => !isUtilityFile(name),
    () => !isContextFile(name),
    () => !isHOC(name),
    () => isPascalCase(name),
  ];

  return checks.every((check) => check());
}

/**
 * Checks if two components should be compared for similarity
 * @param comp1 First component
 * @param comp2 Second component
 * @param nameDistanceThreshold Threshold for name similarity (0.0-1.0)
 * @returns boolean indicating if the components should be compared
 */
export function shouldCompareComponents(
  comp1: ComponentRelation,
  comp2: ComponentRelation,
  nameDistanceThreshold: number = 0.7
): boolean {
  // Don't compare if either component is invalid
  if (
    !isValidComponentForComparison(comp1) ||
    !isValidComponentForComparison(comp2)
  ) {
    return false;
  }

  // Don't compare components from the same file (they're likely different by design)
  if (comp1.fullPath === comp2.fullPath) {
    return false;
  }

  // Don't compare components from very different directories
  const type1 = getComponentType(comp1.fullPath);
  const type2 = getComponentType(comp2.fullPath);
  if (type1 !== type2) return false;

  // Don't compare components with very different names
  const nameDistance = memoizedLevenshteinDistance(comp1.name, comp2.name);
  const maxLength = Math.max(comp1.name.length, comp2.name.length);

  // If names are too different, skip comparison
  if (nameDistance > maxLength * nameDistanceThreshold) return false;

  return true;
}

/**
 * Gets the type of a component based on its file path
 * @param path The component file path
 * @returns The component type
 */
export function getComponentType(path: string): ComponentType {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes("/pages/")) return ComponentType.Page;
  if (lowerPath.includes("/components/")) return ComponentType.Component;
  if (lowerPath.includes("/layouts/")) return ComponentType.Layout;
  if (lowerPath.includes("/features/")) return ComponentType.Feature;
  return ComponentType.Other;
}

/**
 * Checks if a component is likely a TypeScript type definition
 * @param name Component name
 * @returns boolean indicating if it's a type file
 */
function isTypeFile(name: string): boolean {
  return (
    name.endsWith("Type") ||
    name.endsWith("Types") ||
    name.includes("Interface") ||
    name.includes("Enum")
  );
}

/**
 * Checks if a component is likely a utility file
 * @param name Component name
 * @returns boolean indicating if it's a utility file
 */
function isUtilityFile(name: string): boolean {
  return (
    name.endsWith("Utils") ||
    name.endsWith("Helper") ||
    name.endsWith("Helpers") ||
    name.endsWith("Util")
  );
}

/**
 * Checks if a component is likely a React context or provider
 * @param name Component name
 * @returns boolean indicating if it's a context file
 */
function isContextFile(name: string): boolean {
  return name.endsWith("Context") || name.endsWith("Provider");
}

/**
 * Checks if a component is likely a higher-order component
 * @param name Component name
 * @returns boolean indicating if it's a HOC
 */
function isHOC(name: string): boolean {
  return (
    name.startsWith("with") &&
    name.length > 4 &&
    name[4] === name[4].toUpperCase()
  );
}

/**
 * Checks if a name follows PascalCase convention
 * @param name The name to check
 * @returns boolean indicating if it follows PascalCase
 */
function isPascalCase(name: string): boolean {
  return (
    name[0] === name[0].toUpperCase() &&
    !name.includes("_") &&
    !name.includes("-")
  );
}
