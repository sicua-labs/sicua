import { ComponentRelation } from "../../../types";
import { generateComponentId } from "../../../utils/common/analysisUtils";

export function calculateComponentComplexity(components: ComponentRelation[]): {
  [key: string]: number;
} {
  const complexity: { [key: string]: number } = {};

  components.forEach((component) => {
    let componentComplexity = 0;

    // Base complexity from imports and usage (original logic)
    componentComplexity += component.imports.length + component.usedBy.length;

    // Add complexity based on exports (more exports = more interface surface)
    componentComplexity += component.exports.length * 0.5;

    // Add complexity based on functions
    if (component.functions) {
      componentComplexity += component.functions.length * 1.5;
    }

    // Add complexity based on function calls depth
    if (component.functionCalls) {
      const totalFunctionCalls = Object.values(component.functionCalls).reduce(
        (sum, calls) => sum + calls.length,
        0
      );
      componentComplexity += totalFunctionCalls * 0.3;
    }

    // Add complexity based on props (more props = more interface complexity)
    if (component.props) {
      // Required props add more complexity than optional ones
      const requiredPropsComplexity =
        component.props.filter((prop) => prop.required).length * 1.2;

      const optionalPropsComplexity =
        component.props.filter((prop) => !prop.required).length * 0.8;

      componentComplexity += requiredPropsComplexity + optionalPropsComplexity;
    }

    // Add complexity based on JSX structure depth
    if (component.jsxStructure) {
      componentComplexity += calculateJSXComplexity(component.jsxStructure);
    }

    // Path-based complexity (deeper nested components may be more complex)
    const pathSegments = component.fullPath.split("/").length;
    if (pathSegments > 4) {
      // Only add complexity for deeply nested components
      componentComplexity += (pathSegments - 4) * 0.2;
    }

    // Directory-based complexity (shared/common components might be more complex)
    if (
      component.directory.includes("shared") ||
      component.directory.includes("common") ||
      component.directory.includes("utils")
    ) {
      componentComplexity += 1;
    }

    // High usage complexity multiplier (heavily used components are riskier to change)
    if (component.usedBy.length > 5) {
      componentComplexity *= 1 + (component.usedBy.length - 5) * 0.1;
    }

    // Use unique component ID as key
    const componentId = generateComponentId(component);
    complexity[componentId] = Math.round(componentComplexity * 10) / 10; // Round to 1 decimal
  });

  return complexity;
}

function calculateJSXComplexity(
  jsxStructure: ComponentRelation["jsxStructure"]
): number {
  if (!jsxStructure) return 0;

  let jsxComplexity = 0;

  // Base complexity for the element itself
  jsxComplexity += 1;

  // Add complexity for props
  jsxComplexity += jsxStructure.props.length * 0.3;

  // Add complexity for complex prop types
  jsxStructure.props.forEach((prop) => {
    if (prop.type.includes("function") || prop.type.includes("=>")) {
      jsxComplexity += 0.5; // Function props add complexity
    }
    if (prop.type.includes("|")) {
      jsxComplexity += 0.3; // Union types add complexity
    }
    if (prop.type.includes("[]")) {
      jsxComplexity += 0.2; // Array types add slight complexity
    }
  });

  // Recursively calculate complexity for children
  if (jsxStructure.children && jsxStructure.children.length > 0) {
    jsxStructure.children.forEach((child) => {
      jsxComplexity += calculateJSXComplexity(child);
    });

    // Add penalty for having many direct children
    if (jsxStructure.children.length > 3) {
      jsxComplexity += (jsxStructure.children.length - 3) * 0.2;
    }
  }

  // Add complexity for certain HTML elements that typically indicate complexity
  const complexTags = ["form", "table", "svg", "canvas", "video", "audio"];
  if (complexTags.includes(jsxStructure.tagName.toLowerCase())) {
    jsxComplexity += 1;
  }

  // Add complexity for custom components (capitalized tag names)
  if (
    jsxStructure.tagName[0] &&
    jsxStructure.tagName[0] === jsxStructure.tagName[0].toUpperCase()
  ) {
    jsxComplexity += 0.5;
  }

  return jsxComplexity;
}
