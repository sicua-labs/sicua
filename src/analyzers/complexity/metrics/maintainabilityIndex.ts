import { ComponentRelation } from "../../../types";
import { readFileContent } from "../utils/fileReader";
import {
  calculateFunctionComplexity,
  calculateHalsteadMetrics,
  computeMaintainabilityIndex,
} from "../utils/codeMetrics";
import { createSourceFile } from "../../translation/utils/astUtils";
import { countLines } from "../../general/utils/lineCounter";
import { isReactComponent } from "../../../utils/ast/reactSpecific";
import ts from "typescript";
import { generateComponentId } from "../../../utils/common/analysisUtils";

export async function calculateMaintainabilityIndex(
  components: ComponentRelation[]
): Promise<{
  [key: string]: number;
}> {
  const maintainabilityIndex: { [key: string]: number } = {};

  // Group components by file path for efficient processing
  const componentsByFile = new Map<string, ComponentRelation[]>();
  components.forEach((component) => {
    if (!componentsByFile.has(component.fullPath)) {
      componentsByFile.set(component.fullPath, []);
    }
    componentsByFile.get(component.fullPath)!.push(component);
  });

  // Process each file once and calculate maintainability for each component
  for (const [filePath, fileComponents] of componentsByFile) {
    const content = await readFileContent(filePath);
    const sourceFile = createSourceFile(filePath, content);

    // Find all component nodes in the file
    const componentNodes = findComponentNodes(sourceFile, fileComponents);

    // Calculate maintainability for each component
    fileComponents.forEach((component) => {
      const componentId = generateComponentId(component);
      const componentNode = componentNodes.get(component.name);

      if (componentNode) {
        const cyclomaticComplexity = calculateFunctionComplexity(componentNode);
        const halsteadMetrics = calculateHalsteadMetrics(componentNode);

        // Calculate lines of code for this specific component
        const componentText = componentNode.getFullText();
        const linesOfCode = countLines(componentText).codeLines;

        // Calculate Halstead volume with enhanced safety checks
        const vocabularySize = halsteadMetrics.n1 + halsteadMetrics.n2;
        const programLength = halsteadMetrics.N1 + halsteadMetrics.N2;

        const halsteadVolume =
          vocabularySize > 0 ? programLength * Math.log2(vocabularySize) : 1;

        // Calculate base maintainability index using enhanced metrics
        let baseIndex = computeMaintainabilityIndex(
          halsteadVolume,
          cyclomaticComplexity,
          linesOfCode
        );

        // Apply additional adjustments for more accurate assessment
        const adjustedIndex = applyMaintainabilityAdjustments(
          baseIndex,
          halsteadMetrics,
          cyclomaticComplexity,
          linesOfCode,
          component
        );

        maintainabilityIndex[componentId] = adjustedIndex;
      } else {
        // Fallback: if we can't find the specific component, use default values
        maintainabilityIndex[componentId] = 50; // Neutral maintainability score
      }
    });
  }

  return maintainabilityIndex;
}

/**
 * Find component nodes in the source file
 */
function findComponentNodes(
  sourceFile: ts.SourceFile,
  components: ComponentRelation[]
): Map<string, ts.Node> {
  const componentNodes = new Map<string, ts.Node>();
  const componentNames = new Set(components.map((c) => c.name));

  function visit(node: ts.Node): void {
    // Check for function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionName = node.name.text;
      if (componentNames.has(functionName) && isReactComponent(node)) {
        componentNodes.set(functionName, node);
      }
    }

    // Check for variable declarations (const ComponentName = ...)
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const varName = node.name.text;
      if (componentNames.has(varName) && node.initializer) {
        if (
          (ts.isArrowFunction(node.initializer) ||
            ts.isFunctionExpression(node.initializer)) &&
          isReactComponent(node.initializer)
        ) {
          componentNodes.set(varName, node.initializer);
        }
      }
    }

    // Check for exported function declarations
    if (
      ts.isExportAssignment(node) &&
      ts.isFunctionDeclaration(node.expression)
    ) {
      const func = node.expression;
      if (
        func.name &&
        componentNames.has(func.name.text) &&
        isReactComponent(func)
      ) {
        componentNodes.set(func.name.text, func);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return componentNodes;
}

function applyMaintainabilityAdjustments(
  baseIndex: number,
  halsteadMetrics: { n1: number; n2: number; N1: number; N2: number },
  cyclomaticComplexity: number,
  linesOfCode: number,
  component: ComponentRelation
): number {
  let adjustedIndex = baseIndex;

  // Factor 1: Code repetition penalty
  const totalElements = halsteadMetrics.N1 + halsteadMetrics.N2;
  const vocabularySize = halsteadMetrics.n1 + halsteadMetrics.n2;

  if (vocabularySize > 0) {
    const repetitionRatio = totalElements / vocabularySize;
    if (repetitionRatio > 10) {
      adjustedIndex -= (repetitionRatio - 10) * 0.3;
    }
  }

  // Factor 2: Component complexity factors
  if (component.functions && component.functions.length > 20) {
    adjustedIndex -= (component.functions.length - 20) * 0.2;
  }

  // Factor 3: High coupling penalty
  const totalConnections = component.imports.length + component.usedBy.length;
  if (totalConnections > 15) {
    adjustedIndex -= (totalConnections - 15) * 0.1;
  }

  // Factor 4: Props complexity (if available)
  if (component.props && component.props.length > 10) {
    const requiredPropsCount = component.props.filter((p) => p.required).length;
    if (requiredPropsCount > 5) {
      adjustedIndex -= (requiredPropsCount - 5) * 0.3;
    }
  }

  // Factor 5: File size penalties (adjusted for component-specific lines)
  if (linesOfCode > 200) {
    // Lower threshold since this is per-component
    adjustedIndex -= Math.min((linesOfCode - 200) * 0.01, 5);
  }

  // Factor 6: Very high complexity penalty
  if (cyclomaticComplexity > 15) {
    adjustedIndex -= (cyclomaticComplexity - 15) * 0.4;
  }

  // Factor 7: Directory-based adjustments
  if (
    component.directory.includes("shared") ||
    component.directory.includes("common") ||
    component.directory.includes("utils")
  ) {
    // Shared components should be more maintainable
    if (adjustedIndex < 70) {
      adjustedIndex -= 2; // Penalty for low maintainability in shared code
    }
  }

  // Factor 8: Function call complexity
  if (component.functionCalls) {
    const totalFunctionCalls = Object.values(component.functionCalls).reduce(
      (sum, calls) => sum + calls.length,
      0
    );
    if (totalFunctionCalls > 30) {
      adjustedIndex -= (totalFunctionCalls - 30) * 0.05;
    }
  }

  // Factor 9: Export complexity
  if (component.exports.length > 5) {
    adjustedIndex -= (component.exports.length - 5) * 0.2;
  }

  // Factor 10: High usage component penalty (harder to maintain when many depend on it)
  if (component.usedBy.length > 10) {
    adjustedIndex -= (component.usedBy.length - 10) * 0.1;
  }

  // Ensure bounds and reasonable precision
  return Math.max(0, Math.min(100, Math.round(adjustedIndex * 100) / 100));
}
