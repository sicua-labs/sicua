import {
  TypeDefinition,
  TypeRegistry,
  SignatureToTypesMap,
  DuplicateTypeGroup,
} from "../types/internalTypes";
import { TypeDuplication } from "../../../types";
import { ImprovementSuggestionGenerator } from "../generators/improvementSuggestionGenerator";

/**
 * Analyzer for detecting duplicate types
 */
export class DuplicateTypeAnalyzer {
  private typeRegistry: TypeRegistry;
  private signatureToTypes: SignatureToTypesMap;

  constructor(
    typeRegistry: TypeRegistry,
    signatureToTypes: SignatureToTypesMap
  ) {
    this.typeRegistry = typeRegistry;
    this.signatureToTypes = signatureToTypes;
  }

  /**
   * Detect type duplications based on structural signatures
   */
  public detectTypeDuplications(
    maxDuplicateSuggestions: number = 20
  ): TypeDuplication[] {
    const duplicateGroups: TypeDefinition[][] = [];

    // Process only groups with multiple types (exact duplicates)
    for (const [signature, typeIds] of this.signatureToTypes.entries()) {
      if (typeIds.length > 1) {
        const typeDefinitions = typeIds
          .map((id) => this.typeRegistry.get(id))
          .filter((def): def is TypeDefinition => !!def);

        duplicateGroups.push(typeDefinitions);
      }
    }

    // Generate suggestions for duplicate types
    return ImprovementSuggestionGenerator.generateDuplicationSuggestions(
      duplicateGroups,
      maxDuplicateSuggestions
    );
  }

  /**
   * Group duplicate types by similarity score
   */
  public groupDuplicateTypes(): DuplicateTypeGroup[] {
    const groups: DuplicateTypeGroup[] = [];

    for (const [signature, typeIds] of this.signatureToTypes.entries()) {
      if (typeIds.length > 1) {
        const typeDefinitions = typeIds
          .map((id) => this.typeRegistry.get(id))
          .filter((def): def is TypeDefinition => !!def);

        if (typeDefinitions.length < 2) continue;

        // Select the primary type
        const primaryType = this.selectPrimaryType(typeDefinitions);
        const duplicates = typeDefinitions.filter(
          (type) => type.name !== primaryType.name
        );

        groups.push({
          primaryType,
          duplicates,
          matchScore: 1.0, // Exact structural match
        });
      }
    }

    return groups;
  }

  /**
   * Find types that are structurally identical but have different names
   */
  public findIdenticalTypesWithDifferentNames(): TypeDuplication[] {
    const results: TypeDuplication[] = [];

    for (const [signature, typeIds] of this.signatureToTypes.entries()) {
      if (typeIds.length > 1) {
        const typeDefinitions = typeIds
          .map((id) => this.typeRegistry.get(id))
          .filter((def): def is TypeDefinition => !!def);

        // Check if they have different names
        const uniqueNames = new Set(typeDefinitions.map((def) => def.name));

        if (uniqueNames.size > 1) {
          // Select primary type
          const primaryType = this.selectPrimaryType(typeDefinitions);

          // Create duplicates list
          const duplicates = typeDefinitions
            .filter((def) => def.name !== primaryType.name)
            .map((def) => ({
              name: def.name,
              filePath: def.filePath,
              location: def.location,
              matchScore: 1.0,
            }));

          // Generate suggestion
          const suggestion = `Types ${duplicates
            .map((d) => d.name)
            .join(", ")} are structurally identical to ${
            primaryType.name
          }. Consider consolidating them.`;

          results.push({
            primaryType: {
              name: primaryType.name,
              filePath: primaryType.filePath,
              location: primaryType.location,
            },
            duplicates,
            suggestion,
          });
        }
      }
    }

    return results;
  }

  /**
   * Find types that were duplicated across different directories
   */
  public findCrossDirDuplicates(): TypeDuplication[] {
    const results: TypeDuplication[] = [];

    for (const [signature, typeIds] of this.signatureToTypes.entries()) {
      if (typeIds.length > 1) {
        const typeDefinitions = typeIds
          .map((id) => this.typeRegistry.get(id))
          .filter((def): def is TypeDefinition => !!def);

        // Group by directory
        const directoriesMap = new Map<string, TypeDefinition[]>();

        for (const typeDef of typeDefinitions) {
          const dir = typeDef.filePath.split("/").slice(0, -1).join("/");
          if (!directoriesMap.has(dir)) {
            directoriesMap.set(dir, []);
          }
          directoriesMap.get(dir)!.push(typeDef);
        }

        // If types are in different directories, flag them
        if (directoriesMap.size > 1) {
          const primaryType = this.selectPrimaryType(typeDefinitions);

          const duplicates = typeDefinitions
            .filter((def) => def.name !== primaryType.name)
            .map((def) => ({
              name: def.name,
              filePath: def.filePath,
              location: def.location,
              matchScore: 1.0,
            }));

          const dirs = Array.from(directoriesMap.keys());
          const suggestion = `Type ${
            primaryType.name
          } is duplicated across directories: ${dirs.join(
            ", "
          )}. Consider creating a shared type.`;

          results.push({
            primaryType: {
              name: primaryType.name,
              filePath: primaryType.filePath,
              location: primaryType.location,
            },
            duplicates,
            suggestion,
          });
        }
      }
    }

    return results;
  }

  /**
   * Select the primary type from a list of duplicates based on usage and naming
   */
  private selectPrimaryType(typeDefinitions: TypeDefinition[]): TypeDefinition {
    // Sort by usages count (descending), then by name quality
    return typeDefinitions.sort((a, b) => {
      // Prefer types in types/ folders
      const aInTypesFolder =
        a.filePath.includes("/types/") || a.filePath.includes("\\types\\");
      const bInTypesFolder =
        b.filePath.includes("/types/") || b.filePath.includes("\\types\\");

      if (aInTypesFolder && !bInTypesFolder) return -1;
      if (!aInTypesFolder && bInTypesFolder) return 1;

      // Then prefer by usage count
      const aUsages = a.usages.size;
      const bUsages = b.usages.size;
      if (aUsages !== bUsages) return bUsages - aUsages;

      // Then prefer shorter names (usually more general)
      return a.name.length - b.name.length;
    })[0];
  }
}
