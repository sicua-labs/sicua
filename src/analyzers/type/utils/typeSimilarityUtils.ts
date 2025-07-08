import ts from "typescript";
import { TypeDefinition } from "../types/internalTypes";

/**
 * Utilities for comparing and measuring similarity between types
 */
export class TypeSimilarityUtils {
  /**
   * Calculate similarity between two types (0-1)
   * Optimized to focus on property names which is most important
   */
  public static calculateTypeSimilarity(
    a: TypeDefinition,
    b: TypeDefinition
  ): number {
    // Handle different kinds of types differently
    if (a.signature.kind !== b.signature.kind) {
      return 0; // Different kinds of types are not similar
    }

    // For interfaces and type literals, compare properties and methods
    if (
      ts.isInterfaceDeclaration(a.node) ||
      ts.isTypeAliasDeclaration(a.node)
    ) {
      // Compare properties
      const aProps = Array.from(a.signature.properties.keys());
      const bProps = Array.from(b.signature.properties.keys());

      const commonProps = aProps.filter((prop) => bProps.includes(prop));
      const allProps = [...new Set([...aProps, ...bProps])];

      // Calculate Jaccard similarity for properties
      const propSimilarity =
        allProps.length > 0 ? commonProps.length / allProps.length : 0;

      // For speed, only consider property names as they're most important
      return propSimilarity;
    }

    // For enums, compare members
    if (ts.isEnumDeclaration(a.node) && ts.isEnumDeclaration(b.node)) {
      const aMembers = a.node.members.map((m) => m.name.getText());
      const bMembers = b.node.members.map((m) => m.name.getText());

      const commonMembers = aMembers.filter((mem) => bMembers.includes(mem));
      const allMembers = [...new Set([...aMembers, ...bMembers])];

      return allMembers.length > 0
        ? commonMembers.length / allMembers.length
        : 0;
    }

    // For similar type names, give a small similarity score
    if (a.name.length > 3 && b.name.length > 3) {
      // Use substring matching for speed rather than Levenshtein
      if (a.name.includes(b.name) || b.name.includes(a.name)) {
        return 0.3; // Similar names could indicate related types
      }
    }

    return 0;
  }

  /**
   * Calculates detailed property similarity between two types
   */
  public static calculateDetailedSimilarity(
    a: TypeDefinition,
    b: TypeDefinition
  ): {
    propertySimilarity: number;
    methodSimilarity: number;
    extendsSimilarity: number;
    overallSimilarity: number;
    commonProperties: string[];
    commonMethods: string[];
    commonExtends: string[];
  } {
    // Calculate property similarity
    const aProps = Array.from(a.signature.properties.keys());
    const bProps = Array.from(b.signature.properties.keys());
    const commonProps = aProps.filter((prop) => bProps.includes(prop));
    const allProps = [...new Set([...aProps, ...bProps])];
    const propSimilarity =
      allProps.length > 0 ? commonProps.length / allProps.length : 0;

    // Calculate method similarity
    const aMethods = Array.from(a.signature.methods.keys());
    const bMethods = Array.from(b.signature.methods.keys());
    const commonMethods = aMethods.filter((method) =>
      bMethods.includes(method)
    );
    const allMethods = [...new Set([...aMethods, ...bMethods])];
    const methodSimilarity =
      allMethods.length > 0 ? commonMethods.length / allMethods.length : 0;

    // Calculate extends similarity
    const aExtends = a.signature.extends;
    const bExtends = b.signature.extends;
    const commonExtends = aExtends.filter((ext) => bExtends.includes(ext));
    const allExtends = [...new Set([...aExtends, ...bExtends])];
    const extendsSimilarity =
      allExtends.length > 0 ? commonExtends.length / allExtends.length : 0;

    // Calculate overall similarity with weighted factors
    const overallSimilarity =
      propSimilarity * 0.6 + // Properties are most important
      methodSimilarity * 0.3 + // Methods somewhat important
      extendsSimilarity * 0.1; // Extends relationships least important

    return {
      propertySimilarity: propSimilarity,
      methodSimilarity,
      extendsSimilarity,
      overallSimilarity,
      commonProperties: commonProps,
      commonMethods,
      commonExtends,
    };
  }

  /**
   * Find similar (but not identical) types
   */
  public static findSimilarTypes(
    candidates: TypeDefinition[],
    similarityThreshold: number = 0.5
  ): TypeDefinition[][] {
    const groups: TypeDefinition[][] = [];
    const processedTypes = new Set<string>();

    // Create an index of types by property names for faster matching
    const typesByPropertyNames = new Map<string, TypeDefinition[]>();

    // Index types by their property names
    for (const typeDef of candidates) {
      if (processedTypes.has(`${typeDef.filePath}:${typeDef.name}`)) continue;

      const propNames = Array.from(typeDef.signature.properties.keys())
        .sort()
        .join(",");
      if (propNames.length > 0) {
        if (!typesByPropertyNames.has(propNames)) {
          typesByPropertyNames.set(propNames, []);
        }
        typesByPropertyNames.get(propNames)!.push(typeDef);
      }
    }

    // Group types with exactly the same property names
    for (const [propNames, types] of typesByPropertyNames.entries()) {
      if (types.length >= 2) {
        groups.push(types);
        types.forEach((t) => processedTypes.add(`${t.filePath}:${t.name}`));
      }
    }

    // For remaining types, use similarity-based grouping
    for (const typeDef of candidates) {
      const typeId = `${typeDef.filePath}:${typeDef.name}`;
      if (processedTypes.has(typeId)) continue;

      const similarTypes: TypeDefinition[] = [typeDef];
      processedTypes.add(typeId);

      // Compare with a limited number of other types for efficiency
      const otherTypes = candidates
        .filter((t) => !processedTypes.has(`${t.filePath}:${t.name}`))
        .slice(0, 50); // Limit comparisons to 50 other types

      for (const otherDef of otherTypes) {
        const otherId = `${otherDef.filePath}:${otherDef.name}`;
        if (typeId === otherId || processedTypes.has(otherId)) continue;

        // Skip if they're different kinds (interface vs type alias vs enum)
        if (typeDef.signature.kind !== otherDef.signature.kind) continue;

        // Calculate similarity score using property names as a shortcut
        const similarity = this.calculateTypeSimilarity(typeDef, otherDef);
        if (similarity > similarityThreshold) {
          // At least similar above threshold
          similarTypes.push(otherDef);
          processedTypes.add(otherId);
        }
      }

      if (similarTypes.length > 1) {
        groups.push(similarTypes);
      }
    }

    return groups;
  }

  /**
   * Find types that are structurally identical
   */
  public static findIdenticalTypes(
    types: TypeDefinition[]
  ): TypeDefinition[][] {
    const signatureGroups = new Map<string, TypeDefinition[]>();

    // Group types by their structural signature
    for (const typeDef of types) {
      const signature = typeDef.signature.signature;

      if (!signatureGroups.has(signature)) {
        signatureGroups.set(signature, []);
      }

      signatureGroups.get(signature)!.push(typeDef);
    }

    // Return only groups with multiple types
    return Array.from(signatureGroups.values()).filter(
      (group) => group.length > 1
    );
  }

  /**
   * Group similar types with detailed similarity information
   */
  public static groupSimilarTypes(
    types: TypeDefinition[],
    similarityThreshold: number = 0.5
  ): Array<{
    types: TypeDefinition[];
    similarity: number;
    commonProperties: string[];
  }> {
    const similarGroups: Array<{
      types: TypeDefinition[];
      similarity: number;
      commonProperties: string[];
    }> = [];

    const typeGroups = this.findSimilarTypes(types, similarityThreshold);

    for (const group of typeGroups) {
      if (group.length < 2) continue;

      // Calculate combined similarity for the group
      let totalSimilarity = 0;
      let comparisons = 0;

      // Find properties common to all types in group
      const allProperties = group.map((t) =>
        Array.from(t.signature.properties.keys())
      );

      const commonProperties =
        allProperties.length > 0
          ? allProperties.reduce((common, props) =>
              common.filter((prop) => props.includes(prop))
            )
          : [];

      // Calculate average similarity across all pairs in the group
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const similarity = this.calculateTypeSimilarity(group[i], group[j]);
          totalSimilarity += similarity;
          comparisons++;
        }
      }

      const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

      similarGroups.push({
        types: group,
        similarity: avgSimilarity,
        commonProperties,
      });
    }

    // Sort by similarity (descending)
    return similarGroups.sort((a, b) => b.similarity - a.similarity);
  }
}
