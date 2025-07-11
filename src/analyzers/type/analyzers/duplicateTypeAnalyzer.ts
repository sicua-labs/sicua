import ts from "typescript";
import {
  TypeDefinition,
  TypeRegistry,
  SignatureToTypesMap,
  DuplicateTypeGroup,
} from "../types/internalTypes";
import { TypeDuplication } from "../../../types";
import { ImprovementSuggestionGenerator } from "../generators/improvementSuggestionGenerator";

/**
 * Enhanced analyzer for detecting duplicate types with improved signature generation
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
   * Detect type duplications with enhanced signature comparison
   */
  public detectTypeDuplications(
    maxDuplicateSuggestions: number = 20
  ): TypeDuplication[] {
    const duplicateGroups: TypeDefinition[][] = [];
    const processedSignatures = new Set<string>();

    // First pass: rebuild signatures with enhanced logic
    const enhancedSignatureMap = new Map<string, TypeDefinition[]>();

    for (const [typeId, typeDef] of this.typeRegistry.entries()) {
      const enhancedSignature = this.generateEnhancedSignature(typeDef);

      if (!enhancedSignatureMap.has(enhancedSignature)) {
        enhancedSignatureMap.set(enhancedSignature, []);
      }
      enhancedSignatureMap.get(enhancedSignature)!.push(typeDef);
    }

    // Second pass: identify actual duplicates with semantic analysis
    for (const [signature, typeDefinitions] of enhancedSignatureMap.entries()) {
      if (typeDefinitions.length > 1 && !processedSignatures.has(signature)) {
        // Apply additional filtering to remove false positives
        const actualDuplicates = this.filterActualDuplicates(typeDefinitions);

        if (actualDuplicates.length > 1) {
          duplicateGroups.push(actualDuplicates);
          processedSignatures.add(signature);
        }
      }
    }

    // Generate suggestions for duplicate types
    return ImprovementSuggestionGenerator.generateDuplicationSuggestions(
      duplicateGroups,
      maxDuplicateSuggestions
    );
  }

  /**
   * Generate enhanced signature that considers actual type content
   */
  private generateEnhancedSignature(typeDef: TypeDefinition): string {
    const node = typeDef.node;
    const parts: string[] = [];

    // Include type kind
    parts.push(`kind:${ts.SyntaxKind[node.kind]}`);

    if (ts.isTypeAliasDeclaration(node)) {
      const typeSignature = this.getTypeAliasSignature(node);
      parts.push(`alias:${typeSignature}`);
    } else if (ts.isInterfaceDeclaration(node)) {
      const interfaceSignature = this.getInterfaceSignature(node);
      parts.push(`interface:${interfaceSignature}`);
    } else if (ts.isEnumDeclaration(node)) {
      const enumSignature = this.getEnumSignature(node);
      parts.push(`enum:${enumSignature}`);
    } else if (ts.isClassDeclaration(node)) {
      const classSignature = this.getClassSignature(node);
      parts.push(`class:${classSignature}`);
    }

    // Include semantic context
    const semanticContext = this.getSemanticContext(typeDef);
    if (semanticContext) {
      parts.push(`context:${semanticContext}`);
    }

    // Include usage patterns
    const usagePattern = this.getUsagePattern(typeDef);
    if (usagePattern) {
      parts.push(`usage:${usagePattern}`);
    }

    return parts.join("|");
  }

  /**
   * Get detailed signature for type alias declarations
   */
  private getTypeAliasSignature(node: ts.TypeAliasDeclaration): string {
    const typeNode = node.type;
    return this.getDetailedTypeSignature(typeNode);
  }

  /**
   * Get detailed type signature for any type node
   */
  private getDetailedTypeSignature(typeNode: ts.TypeNode): string {
    if (ts.isUnionTypeNode(typeNode)) {
      // For union types, include all literal values and their order
      const memberSignatures = typeNode.types
        .map((member) => {
          if (ts.isLiteralTypeNode(member)) {
            if (ts.isStringLiteral(member.literal)) {
              return `str:"${member.literal.text}"`;
            } else if (ts.isNumericLiteral(member.literal)) {
              return `num:${member.literal.text}`;
            }
            return `lit:${member.literal.getText()}`;
          }
          return this.getDetailedTypeSignature(member);
        })
        .sort(); // Sort for consistent comparison

      return `union[${memberSignatures.length}]:{${memberSignatures.join(
        ","
      )}}`;
    }

    if (ts.isIntersectionTypeNode(typeNode)) {
      const memberSignatures = typeNode.types
        .map((member) => this.getDetailedTypeSignature(member))
        .sort();

      return `intersection[${memberSignatures.length}]:{${memberSignatures.join(
        ","
      )}}`;
    }

    if (ts.isTypeLiteralNode(typeNode)) {
      const propertySignatures = typeNode.members
        .map((member) => {
          if (ts.isPropertySignature(member)) {
            const name = member.name?.getText() || "unknown";
            const type = member.type
              ? this.getDetailedTypeSignature(member.type)
              : "any";
            const optional = member.questionToken ? "?" : "";
            const readonly = member.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.ReadonlyKeyword
            )
              ? "readonly "
              : "";
            return `${readonly}${name}${optional}:${type}`;
          }
          return member.getText();
        })
        .sort();

      return `object[${propertySignatures.length}]:{${propertySignatures.join(
        ","
      )}}`;
    }

    if (ts.isArrayTypeNode(typeNode)) {
      const elementType = this.getDetailedTypeSignature(typeNode.elementType);
      return `array<${elementType}>`;
    }

    if (ts.isTupleTypeNode(typeNode)) {
      const elementTypes = typeNode.elements.map((element) =>
        this.getDetailedTypeSignature(element)
      );
      return `tuple[${elementTypes.length}]:<${elementTypes.join(",")}>`;
    }

    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText();
      const typeArgs =
        typeNode.typeArguments?.map((arg) =>
          this.getDetailedTypeSignature(arg)
        ) || [];

      // Special handling for common generic types
      if (typeName === "Promise" && typeArgs.length === 1) {
        return `Promise<${typeArgs[0]}>`;
      }
      if (typeName === "Array" && typeArgs.length === 1) {
        return `Array<${typeArgs[0]}>`;
      }

      return typeArgs.length > 0
        ? `${typeName}<${typeArgs.join(",")}>`
        : typeName;
    }

    // Handle primitive types
    if (typeNode.kind === ts.SyntaxKind.StringKeyword) return "string";
    if (typeNode.kind === ts.SyntaxKind.NumberKeyword) return "number";
    if (typeNode.kind === ts.SyntaxKind.BooleanKeyword) return "boolean";
    if (typeNode.kind === ts.SyntaxKind.VoidKeyword) return "void";
    if (typeNode.kind === ts.SyntaxKind.UndefinedKeyword) return "undefined";
    if (typeNode.kind === ts.SyntaxKind.NullKeyword) return "null";
    if (typeNode.kind === ts.SyntaxKind.AnyKeyword) return "any";
    if (typeNode.kind === ts.SyntaxKind.UnknownKeyword) return "unknown";
    if (typeNode.kind === ts.SyntaxKind.NeverKeyword) return "never";

    // Fallback to text representation
    return typeNode.getText();
  }

  /**
   * Get interface signature with detailed member information
   */
  private getInterfaceSignature(node: ts.InterfaceDeclaration): string {
    const parts: string[] = [];

    // Heritage clauses
    if (node.heritageClauses) {
      const extendsClause = node.heritageClauses
        .filter(
          (clause: ts.HeritageClause) =>
            clause.token === ts.SyntaxKind.ExtendsKeyword
        )
        .flatMap((clause: ts.HeritageClause) =>
          clause.types.map((type: ts.ExpressionWithTypeArguments) =>
            (type.expression as ts.Identifier).getText()
          )
        )
        .sort();

      if (extendsClause.length > 0) {
        parts.push(`extends:${extendsClause.join(",")}`);
      }
    }

    // Members
    const memberSignatures = node.members
      .map((member: ts.TypeElement) => {
        if (ts.isPropertySignature(member)) {
          const name = member.name?.getText() || "unknown";
          const type = member.type
            ? this.getDetailedTypeSignature(member.type)
            : "any";
          const optional = member.questionToken ? "?" : "";
          const readonly = member.modifiers?.some(
            (m: ts.Modifier) => m.kind === ts.SyntaxKind.ReadonlyKeyword
          )
            ? "readonly "
            : "";
          return `prop:${readonly}${name}${optional}:${type}`;
        } else if (ts.isMethodSignature(member)) {
          const name = member.name?.getText() || "unknown";
          const params = member.parameters.map(
            (param: ts.ParameterDeclaration) => {
              const paramName = param.name.getText();
              const paramType = param.type
                ? this.getDetailedTypeSignature(param.type)
                : "any";
              const optional = param.questionToken ? "?" : "";
              return `${paramName}${optional}:${paramType}`;
            }
          );
          const returnType = member.type
            ? this.getDetailedTypeSignature(member.type)
            : "any";
          return `method:${name}(${params.join(",")})=>${returnType}`;
        } else if (ts.isGetAccessorDeclaration(member)) {
          const name = member.name?.getText() || "unknown";
          const returnType = member.type
            ? this.getDetailedTypeSignature(member.type)
            : "any";
          return `getter:${name}=>${returnType}`;
        } else if (ts.isSetAccessorDeclaration(member)) {
          const name = member.name?.getText() || "unknown";
          const paramType = member.parameters[0]?.type
            ? this.getDetailedTypeSignature(member.parameters[0].type)
            : "any";
          return `setter:${name}(${paramType})`;
        }
        return `unknown:${member.getText()}`;
      })
      .sort();

    parts.push(
      `members[${memberSignatures.length}]:{${memberSignatures.join(";")}}`
    );

    return parts.join("|");
  }

  /**
   * Get enum signature with all values
   */
  private getEnumSignature(node: ts.EnumDeclaration): string {
    const isStringEnum = node.members.some(
      (member: ts.EnumMember) =>
        member.initializer && ts.isStringLiteral(member.initializer)
    );

    const memberSignatures = node.members.map((member: ts.EnumMember) => {
      const name = member.name.getText();
      if (member.initializer) {
        if (ts.isStringLiteral(member.initializer)) {
          return `${name}="${member.initializer.text}"`;
        } else if (ts.isNumericLiteral(member.initializer)) {
          return `${name}=${member.initializer.text}`;
        }
        return `${name}=${member.initializer.getText()}`;
      }
      return name;
    });

    const enumType = isStringEnum ? "string-enum" : "numeric-enum";
    return `${enumType}[${memberSignatures.length}]:{${memberSignatures.join(
      ","
    )}}`;
  }

  /**
   * Get class signature with key characteristics
   */
  private getClassSignature(node: ts.ClassDeclaration): string {
    const parts: string[] = [];

    // Heritage
    if (node.heritageClauses) {
      const extendsClause = node.heritageClauses
        .filter(
          (clause: ts.HeritageClause) =>
            clause.token === ts.SyntaxKind.ExtendsKeyword
        )
        .flatMap((clause: ts.HeritageClause) =>
          clause.types.map((type: ts.ExpressionWithTypeArguments) =>
            (type.expression as ts.Identifier).getText()
          )
        );

      const implementsClause = node.heritageClauses
        .filter(
          (clause: ts.HeritageClause) =>
            clause.token === ts.SyntaxKind.ImplementsKeyword
        )
        .flatMap((clause: ts.HeritageClause) =>
          clause.types.map((type: ts.ExpressionWithTypeArguments) =>
            (type.expression as ts.Identifier).getText()
          )
        );

      if (extendsClause.length > 0)
        parts.push(`extends:${extendsClause.join(",")}`);
      if (implementsClause.length > 0)
        parts.push(`implements:${implementsClause.join(",")}`);
    }

    // Count different member types
    let properties = 0;
    let methods = 0;
    let constructors = 0;
    let getters = 0;
    let setters = 0;

    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) properties++;
      else if (ts.isMethodDeclaration(member)) methods++;
      else if (ts.isConstructorDeclaration(member)) constructors++;
      else if (ts.isGetAccessorDeclaration(member)) getters++;
      else if (ts.isSetAccessorDeclaration(member)) setters++;
    }

    parts.push(
      `members:p${properties}m${methods}c${constructors}g${getters}s${setters}`
    );

    return parts.join("|");
  }

  /**
   * Get semantic context from type name and file path
   */
  private getSemanticContext(typeDef: TypeDefinition): string | null {
    const { name, filePath } = typeDef;
    const contexts: string[] = [];

    // Analyze type name patterns
    if (name.endsWith("Props")) contexts.push("react-props");
    if (name.endsWith("State")) contexts.push("react-state");
    if (name.endsWith("Config")) contexts.push("configuration");
    if (name.endsWith("Options")) contexts.push("options");
    if (name.endsWith("Schema")) contexts.push("schema");
    if (name.endsWith("Response")) contexts.push("api-response");
    if (name.endsWith("Request")) contexts.push("api-request");
    if (name.endsWith("Error")) contexts.push("error");
    if (name.endsWith("Event")) contexts.push("event");
    if (name.endsWith("Handler")) contexts.push("handler");
    if (name.endsWith("Type")) contexts.push("type-alias");

    // Analyze file path patterns
    if (filePath.includes("/types/") || filePath.includes("\\types\\")) {
      contexts.push("types-directory");
    }
    if (
      filePath.includes("/components/") ||
      filePath.includes("\\components\\")
    ) {
      contexts.push("component");
    }
    if (filePath.includes("/api/") || filePath.includes("\\api\\")) {
      contexts.push("api");
    }
    if (filePath.includes("/utils/") || filePath.includes("\\utils\\")) {
      contexts.push("utility");
    }

    // Check for Zod patterns
    if (this.isZodInferredType(typeDef)) {
      contexts.push("zod-inferred");
    }

    return contexts.length > 0 ? contexts.sort().join(",") : null;
  }

  /**
   * Check if type is Zod inferred
   */
  private isZodInferredType(typeDef: TypeDefinition): boolean {
    const node = typeDef.node;

    if (ts.isTypeAliasDeclaration(node)) {
      const typeText = node.type.getText();
      return typeText.includes("z.infer") || typeText.includes("infer<");
    }

    return false;
  }

  /**
   * Get usage pattern information
   */
  private getUsagePattern(typeDef: TypeDefinition): string | null {
    const usageCount = typeDef.usages.size;

    if (usageCount === 0) return "unused";
    if (usageCount === 1) return "single-use";
    if (usageCount <= 3) return "low-use";
    if (usageCount <= 10) return "medium-use";
    return "high-use";
  }

  /**
   * Filter out false positive duplicates using semantic analysis
   */
  private filterActualDuplicates(
    typeDefinitions: TypeDefinition[]
  ): TypeDefinition[] {
    if (typeDefinitions.length < 2) return typeDefinitions;

    // Group by semantic similarity
    const semanticGroups = new Map<string, TypeDefinition[]>();

    for (const typeDef of typeDefinitions) {
      const semanticKey = this.getSemanticSimilarityKey(typeDef);

      if (!semanticGroups.has(semanticKey)) {
        semanticGroups.set(semanticKey, []);
      }
      semanticGroups.get(semanticKey)!.push(typeDef);
    }

    // Only consider types in the same semantic group as potential duplicates
    const actualDuplicates: TypeDefinition[] = [];

    for (const [, group] of semanticGroups) {
      if (group.length > 1) {
        // Additional validation: check if they're actually duplicates
        const validatedDuplicates = this.validateDuplicates(group);
        actualDuplicates.push(...validatedDuplicates);
      }
    }

    return actualDuplicates;
  }

  /**
   * Generate semantic similarity key for grouping
   */
  private getSemanticSimilarityKey(typeDef: TypeDefinition): string {
    const parts: string[] = [];

    // Semantic category
    const semanticContext = this.getSemanticContext(typeDef);
    if (semanticContext) {
      parts.push(semanticContext);
    }

    // Type complexity (rough measure)
    const complexity = this.getTypeComplexity(typeDef);
    parts.push(`complexity:${complexity}`);

    // File location similarity
    const locationCategory = this.getLocationCategory(typeDef.filePath);
    parts.push(`location:${locationCategory}`);

    return parts.join("|");
  }

  /**
   * Get rough type complexity measure
   */
  private getTypeComplexity(typeDef: TypeDefinition): string {
    const node = typeDef.node;

    if (ts.isTypeAliasDeclaration(node)) {
      if (ts.isUnionTypeNode(node.type)) {
        const memberCount = node.type.types.length;
        if (memberCount <= 3) return "simple-union";
        if (memberCount <= 7) return "medium-union";
        return "complex-union";
      }
      if (ts.isTypeLiteralNode(node.type)) {
        const memberCount = node.type.members.length;
        if (memberCount <= 3) return "simple-object";
        if (memberCount <= 10) return "medium-object";
        return "complex-object";
      }
      return "simple-alias";
    }

    if (ts.isInterfaceDeclaration(node)) {
      const memberCount = node.members.length;
      if (memberCount <= 3) return "simple-interface";
      if (memberCount <= 10) return "medium-interface";
      return "complex-interface";
    }

    if (ts.isEnumDeclaration(node)) {
      const memberCount = node.members.length;
      if (memberCount <= 5) return "simple-enum";
      return "complex-enum";
    }

    return "unknown";
  }

  /**
   * Get location category for semantic grouping
   */
  private getLocationCategory(filePath: string): string {
    if (filePath.includes("/types/") || filePath.includes("\\types\\")) {
      return "types-dir";
    }
    if (
      filePath.includes("/components/") ||
      filePath.includes("\\components\\")
    ) {
      return "components-dir";
    }
    if (filePath.includes("/api/") || filePath.includes("\\api\\")) {
      return "api-dir";
    }
    if (filePath.includes("/utils/") || filePath.includes("\\utils\\")) {
      return "utils-dir";
    }
    return "other";
  }

  /**
   * Validate that types are actually duplicates and not just similar
   */
  private validateDuplicates(
    typeDefinitions: TypeDefinition[]
  ): TypeDefinition[] {
    if (typeDefinitions.length < 2) return typeDefinitions;

    // Check if they have identical AST structures
    const validDuplicates: TypeDefinition[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < typeDefinitions.length; i++) {
      for (let j = i + 1; j < typeDefinitions.length; j++) {
        const type1 = typeDefinitions[i];
        const type2 = typeDefinitions[j];
        const pairKey = `${type1.name}<->${type2.name}`;

        if (!processedPairs.has(pairKey)) {
          if (this.areTypesStructurallyIdentical(type1, type2)) {
            if (!validDuplicates.includes(type1)) validDuplicates.push(type1);
            if (!validDuplicates.includes(type2)) validDuplicates.push(type2);
          }
          processedPairs.add(pairKey);
        }
      }
    }

    return validDuplicates;
  }

  /**
   * Check if two types are structurally identical
   */
  private areTypesStructurallyIdentical(
    type1: TypeDefinition,
    type2: TypeDefinition
  ): boolean {
    // Different kinds can't be identical
    if (type1.node.kind !== type2.node.kind) {
      return false;
    }

    // Generate normalized AST representation for comparison
    const normalized1 = this.getNormalizedTypeStructure(type1.node);
    const normalized2 = this.getNormalizedTypeStructure(type2.node);

    return normalized1 === normalized2;
  }

  /**
   * Get normalized type structure for precise comparison
   */
  private getNormalizedTypeStructure(node: ts.Node): string {
    if (ts.isTypeAliasDeclaration(node)) {
      return this.getDetailedTypeSignature(node.type);
    }

    if (ts.isInterfaceDeclaration(node)) {
      return this.getInterfaceSignature(node);
    }

    if (ts.isEnumDeclaration(node)) {
      return this.getEnumSignature(node);
    }

    if (ts.isClassDeclaration(node)) {
      return this.getClassSignature(node);
    }

    return node.getText();
  }

  /**
   * Group duplicate types by similarity score
   */
  public groupDuplicateTypes(): DuplicateTypeGroup[] {
    const groups: DuplicateTypeGroup[] = [];
    const enhancedSignatureMap = new Map<string, TypeDefinition[]>();

    // Rebuild with enhanced signatures
    for (const [, typeDef] of this.typeRegistry.entries()) {
      const enhancedSignature = this.generateEnhancedSignature(typeDef);

      if (!enhancedSignatureMap.has(enhancedSignature)) {
        enhancedSignatureMap.set(enhancedSignature, []);
      }
      enhancedSignatureMap.get(enhancedSignature)!.push(typeDef);
    }

    for (const [, typeDefinitions] of enhancedSignatureMap.entries()) {
      if (typeDefinitions.length > 1) {
        const actualDuplicates = this.filterActualDuplicates(typeDefinitions);

        if (actualDuplicates.length > 1) {
          const primaryType = this.selectPrimaryType(actualDuplicates);
          const duplicates = actualDuplicates.filter(
            (type) => type.name !== primaryType.name
          );

          if (duplicates.length > 0) {
            groups.push({
              primaryType,
              duplicates,
              matchScore: 1.0, // Exact structural match after validation
            });
          }
        }
      }
    }

    return groups;
  }

  /**
   * Find types that are structurally identical but have different names
   */
  public findIdenticalTypesWithDifferentNames(): TypeDuplication[] {
    const results: TypeDuplication[] = [];
    const enhancedSignatureMap = new Map<string, TypeDefinition[]>();

    // Build enhanced signature map
    for (const [, typeDef] of this.typeRegistry.entries()) {
      const enhancedSignature = this.generateEnhancedSignature(typeDef);

      if (!enhancedSignatureMap.has(enhancedSignature)) {
        enhancedSignatureMap.set(enhancedSignature, []);
      }
      enhancedSignatureMap.get(enhancedSignature)!.push(typeDef);
    }

    for (const [, typeDefinitions] of enhancedSignatureMap.entries()) {
      if (typeDefinitions.length > 1) {
        const actualDuplicates = this.filterActualDuplicates(typeDefinitions);

        if (actualDuplicates.length > 1) {
          // Check if they have different names
          const uniqueNames = new Set(actualDuplicates.map((def) => def.name));

          if (uniqueNames.size > 1) {
            const primaryType = this.selectPrimaryType(actualDuplicates);

            const duplicates = actualDuplicates
              .filter((def) => def.name !== primaryType.name)
              .map((def) => ({
                name: def.name,
                filePath: def.filePath,
                location: def.location,
                matchScore: 1.0,
              }));

            const suggestion = `Types ${duplicates
              .map((d) => d.name)
              .join(", ")} are structurally identical to ${
              primaryType.name
            }. Consider consolidating them into a shared type definition.`;

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
    }

    return results;
  }

  /**
   * Find types that were duplicated across different directories
   */
  public findCrossDirDuplicates(): TypeDuplication[] {
    const results: TypeDuplication[] = [];
    const enhancedSignatureMap = new Map<string, TypeDefinition[]>();

    // Build enhanced signature map
    for (const [, typeDef] of this.typeRegistry.entries()) {
      const enhancedSignature = this.generateEnhancedSignature(typeDef);

      if (!enhancedSignatureMap.has(enhancedSignature)) {
        enhancedSignatureMap.set(enhancedSignature, []);
      }
      enhancedSignatureMap.get(enhancedSignature)!.push(typeDef);
    }

    for (const [, typeDefinitions] of enhancedSignatureMap.entries()) {
      if (typeDefinitions.length > 1) {
        const actualDuplicates = this.filterActualDuplicates(typeDefinitions);

        if (actualDuplicates.length > 1) {
          // Group by directory
          const directoriesMap = new Map<string, TypeDefinition[]>();

          for (const typeDef of actualDuplicates) {
            const dir = typeDef.filePath.split("/").slice(0, -1).join("/");
            if (!directoriesMap.has(dir)) {
              directoriesMap.set(dir, []);
            }
            directoriesMap.get(dir)!.push(typeDef);
          }

          // If types are in different directories, flag them
          if (directoriesMap.size > 1) {
            const primaryType = this.selectPrimaryType(actualDuplicates);

            const duplicates = actualDuplicates
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
            )}. Consider creating a shared type definition in a common types directory.`;

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
    }

    return results;
  }

  /**
   * Select the primary type from a list of duplicates based on usage and naming
   */
  private selectPrimaryType(typeDefinitions: TypeDefinition[]): TypeDefinition {
    return typeDefinitions.sort((a, b) => {
      // Prefer types in shared/types directories
      const aInTypesFolder =
        a.filePath.includes("/types/") ||
        a.filePath.includes("\\types\\") ||
        a.filePath.includes("/shared/") ||
        a.filePath.includes("\\shared\\");
      const bInTypesFolder =
        b.filePath.includes("/types/") ||
        b.filePath.includes("\\types\\") ||
        b.filePath.includes("/shared/") ||
        b.filePath.includes("\\shared\\");

      if (aInTypesFolder && !bInTypesFolder) return -1;
      if (!aInTypesFolder && bInTypesFolder) return 1;

      // Prefer non-Zod inferred types (more generic)
      const aIsZodInferred = this.isZodInferredType(a);
      const bIsZodInferred = this.isZodInferredType(b);

      if (!aIsZodInferred && bIsZodInferred) return -1;
      if (aIsZodInferred && !bIsZodInferred) return 1;

      // Prefer by usage count
      const aUsages = a.usages.size;
      const bUsages = b.usages.size;
      if (aUsages !== bUsages) return bUsages - aUsages;

      // Prefer more generic names (without specific suffixes)
      const aHasSpecificSuffix =
        /(?:Props|State|Config|Schema|Request|Response|Event|Handler)$/.test(
          a.name
        );
      const bHasSpecificSuffix =
        /(?:Props|State|Config|Schema|Request|Response|Event|Handler)$/.test(
          b.name
        );

      if (!aHasSpecificSuffix && bHasSpecificSuffix) return -1;
      if (aHasSpecificSuffix && !bHasSpecificSuffix) return 1;

      // Prefer shorter names (usually more general)
      if (a.name.length !== b.name.length) {
        return a.name.length - b.name.length;
      }

      // Finally, prefer alphabetically first
      return a.name.localeCompare(b.name);
    })[0];
  }

  /**
   * Get detailed statistics about duplicate analysis
   */
  public getAnalysisStatistics(): {
    totalTypes: number;
    uniqueSignatures: number;
    duplicateGroups: number;
    totalDuplicates: number;
    falsePositivesFiltered: number;
    zodInferredTypes: number;
    crossDirectoryDuplicates: number;
  } {
    const enhancedSignatureMap = new Map<string, TypeDefinition[]>();
    let zodInferredTypes = 0;
    let falsePositivesFiltered = 0;
    let duplicateGroups = 0;
    let totalDuplicates = 0;
    let crossDirectoryDuplicates = 0;

    // Build enhanced signature map and count statistics
    for (const [, typeDef] of this.typeRegistry.entries()) {
      const enhancedSignature = this.generateEnhancedSignature(typeDef);

      if (!enhancedSignatureMap.has(enhancedSignature)) {
        enhancedSignatureMap.set(enhancedSignature, []);
      }
      enhancedSignatureMap.get(enhancedSignature)!.push(typeDef);

      if (this.isZodInferredType(typeDef)) {
        zodInferredTypes++;
      }
    }

    // Analyze each signature group
    for (const [, typeDefinitions] of enhancedSignatureMap.entries()) {
      if (typeDefinitions.length > 1) {
        const beforeFilter = typeDefinitions.length;
        const actualDuplicates = this.filterActualDuplicates(typeDefinitions);
        const afterFilter = actualDuplicates.length;

        falsePositivesFiltered += beforeFilter - afterFilter;

        if (actualDuplicates.length > 1) {
          duplicateGroups++;
          totalDuplicates += actualDuplicates.length;

          // Check for cross-directory duplicates
          const directories = new Set(
            actualDuplicates.map((def) =>
              def.filePath.split("/").slice(0, -1).join("/")
            )
          );

          if (directories.size > 1) {
            crossDirectoryDuplicates += actualDuplicates.length;
          }
        }
      }
    }

    return {
      totalTypes: this.typeRegistry.size,
      uniqueSignatures: enhancedSignatureMap.size,
      duplicateGroups,
      totalDuplicates,
      falsePositivesFiltered,
      zodInferredTypes,
      crossDirectoryDuplicates,
    };
  }

  /**
   * Debug method to analyze why types are being flagged as duplicates
   */
  public debugDuplicateDetection(
    typeName1: string,
    typeName2: string
  ): {
    type1: TypeDefinition | undefined;
    type2: TypeDefinition | undefined;
    signature1: string;
    signature2: string;
    semanticContext1: string | null;
    semanticContext2: string | null;
    areStructurallyIdentical: boolean;
    wouldBeFiltered: boolean;
  } | null {
    const type1 = Array.from(this.typeRegistry.values()).find(
      (t) => t.name === typeName1
    );
    const type2 = Array.from(this.typeRegistry.values()).find(
      (t) => t.name === typeName2
    );

    if (!type1 || !type2) {
      return null;
    }

    const signature1 = this.generateEnhancedSignature(type1);
    const signature2 = this.generateEnhancedSignature(type2);
    const semanticContext1 = this.getSemanticContext(type1);
    const semanticContext2 = this.getSemanticContext(type2);
    const areStructurallyIdentical = this.areTypesStructurallyIdentical(
      type1,
      type2
    );

    // Test if they would be filtered out
    const testGroup = [type1, type2];
    const filteredGroup = this.filterActualDuplicates(testGroup);
    const wouldBeFiltered = filteredGroup.length < 2;

    return {
      type1,
      type2,
      signature1,
      signature2,
      semanticContext1,
      semanticContext2,
      areStructurallyIdentical,
      wouldBeFiltered,
    };
  }
}
