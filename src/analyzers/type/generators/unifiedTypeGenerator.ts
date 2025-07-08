import path from "path-browserify";
import { TypeDefinition, SimilarTypesGroup } from "../types/internalTypes";
import { UnifiedTypeInfo } from "../../../types";
import { NamingUtils } from "../utils/namingUtils";

/**
 * Generator for unified type suggestions
 */
export class UnifiedTypeGenerator {
  /**
   * Generate a unified type suggestion from a group of similar types
   */
  public static generateUnifiedType(
    group: TypeDefinition[]
  ): UnifiedTypeInfo | null {
    // Skip if group is too small
    if (group.length < 2) return null;

    // Collect all properties and methods from all types
    const allProperties: Record<string, string[]> = {};
    const allExtends: string[] = [];

    // Track files where these types are used
    const usedIn: Set<string> = new Set<string>();

    // For naming the unified type
    const typeNames: string[] = [];

    for (const typeDef of group) {
      typeNames.push(typeDef.name);

      // Add usage information
      usedIn.add(typeDef.filePath);
      typeDef.usages.forEach((usage) => usedIn.add(usage));

      // Add extends
      typeDef.signature.extends.forEach((ext) => {
        if (!allExtends.includes(ext)) {
          allExtends.push(ext);
        }
      });

      // Add properties
      for (const [
        propName,
        propType,
      ] of typeDef.signature.properties.entries()) {
        if (!allProperties[propName]) {
          allProperties[propName] = [];
        }
        if (!allProperties[propName].includes(propType)) {
          allProperties[propName].push(propType);
        }
      }
    }

    // Generate a suggested name for the unified type
    const commonPrefix = NamingUtils.findLongestCommonPrefix(typeNames);
    const possibleName =
      commonPrefix.length > 3
        ? commonPrefix + "Base"
        : NamingUtils.findSuggestedName(typeNames);

    // Convert properties map to final form, using union types if needed
    const unifiedProperties: Record<string, string> = {};
    for (const [propName, propTypes] of Object.entries(allProperties)) {
      if (propTypes.length === 1) {
        unifiedProperties[propName] = propTypes[0];
      } else {
        // For multiple potential types, suggest a union
        unifiedProperties[propName] = propTypes.join(" | ");
      }
    }

    // Determine the best location for the unified type
    const dirsWithTypes = Array.from(usedIn)
      .map((filePath) => path.dirname(filePath))
      .filter((dir) => {
        return dir.includes("/types/") || dir.includes("\\types\\");
      });

    let suggestedLocation: string;

    if (dirsWithTypes.length > 0) {
      // Use the first types directory found
      suggestedLocation = path.join(dirsWithTypes[0], `${possibleName}.ts`);
    } else {
      // Find the common directory ancestor
      const commonDir = NamingUtils.findCommonDirectory(Array.from(usedIn));
      suggestedLocation = path.join(commonDir, "types", `${possibleName}.ts`);
    }

    return {
      possibleName,
      baseTypes: typeNames,
      properties: unifiedProperties,
      usedIn: Array.from(usedIn),
      suggestedLocation,
    };
  }

  /**
   * Generate all unified type suggestions from groups of similar types
   */
  public static generateAllUnifiedTypes(
    similarGroups: SimilarTypesGroup[],
    maxSuggestions: number = 10
  ): UnifiedTypeInfo[] {
    // Sort groups by significance (more similar types first)
    const significantGroups = similarGroups
      .filter((group) => group.types.length >= 2)
      .sort((a, b) => {
        // Prioritize by combination of size and similarity
        const scoreA = a.types.length * a.similarityScore;
        const scoreB = b.types.length * b.similarityScore;
        return scoreB - scoreA;
      })
      .slice(0, maxSuggestions);

    const suggestions: UnifiedTypeInfo[] = [];

    for (const group of significantGroups) {
      const unifiedType = this.generateUnifiedType(group.types);
      if (unifiedType) {
        suggestions.push(unifiedType);
      }
    }

    return suggestions;
  }

  /**
   * Generate unified type code snippet
   */
  public static generateTypeCode(unifiedType: UnifiedTypeInfo): string {
    const { possibleName, properties, baseTypes } = unifiedType;

    // Build the type definition as an interface
    let code = `/**\n`;
    code += ` * Unified type generated from: ${baseTypes.join(", ")}\n`;
    code += ` */\n`;
    code += `interface ${possibleName} {\n`;

    // Add properties
    for (const [propName, propType] of Object.entries(properties)) {
      code += `  ${propName}: ${propType};\n`;
    }

    code += `}\n\n`;

    // Add export statement
    code += `export { ${possibleName} };\n`;

    return code;
  }

  /**
   * Generate a migration plan from individual types to unified types
   */
  public static generateMigrationPlan(unifiedType: UnifiedTypeInfo): string {
    const { possibleName, baseTypes, suggestedLocation } = unifiedType;

    let plan = `# Migration Plan for ${possibleName}\n\n`;
    plan += `## Step 1: Create the unified type\n\n`;
    plan += `Create a new file at \`${suggestedLocation}\` with the unified type definition.\n\n`;

    plan += `## Step 2: Update imports and usage\n\n`;
    plan += `Replace the following types with ${possibleName}:\n\n`;

    baseTypes.forEach((typeName) => {
      plan += `- \`${typeName}\`\n`;
    });

    plan += `\n## Step 3: Extend if needed\n\n`;
    plan += `If specific types need additional properties, extend the base type:\n\n`;
    plan += `\`\`\`typescript\n`;
    plan += `interface SpecificType extends ${possibleName} {\n`;
    plan += `  additionalProp: string;\n`;
    plan += `}\n`;
    plan += `\`\`\`\n`;

    return plan;
  }
}
