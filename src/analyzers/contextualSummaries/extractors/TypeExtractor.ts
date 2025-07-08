import ts from "typescript";
import { getExportType } from "../utils/contextUtils";
import {
  TypeContext,
  TypeDefinition,
  TypeImport,
  TypeExport,
  TypeRelationship,
  TypeKind,
  PropertyDefinition,
  MethodDefinition,
  ParameterDefinition,
  TypeComplexityMetrics,
} from "../types/typeExtractor.types";

export class TypeExtractor {
  private typeChecker: ts.TypeChecker | null;

  constructor(typeChecker?: ts.TypeChecker) {
    this.typeChecker = typeChecker || null;
  }

  /**
   * Extracts all type context from a source file
   */
  extractTypeContext(sourceFile: ts.SourceFile): TypeContext {
    const definitions: TypeDefinition[] = [];
    const imports: TypeImport[] = [];
    const exports: TypeExport[] = [];
    const relationships: TypeRelationship[] = [];

    ts.forEachChild(sourceFile, (node) => {
      // Type definitions
      if (ts.isInterfaceDeclaration(node)) {
        definitions.push(this.extractInterface(node));
      } else if (ts.isTypeAliasDeclaration(node)) {
        definitions.push(this.extractTypeAlias(node));
      } else if (ts.isEnumDeclaration(node)) {
        definitions.push(this.extractEnum(node));
      } else if (ts.isClassDeclaration(node)) {
        definitions.push(this.extractClass(node));
      }

      // Type imports
      else if (ts.isImportDeclaration(node)) {
        imports.push(...this.extractTypeImports(node));
      }

      // Type exports
      else if (ts.isExportDeclaration(node) || this.hasExportModifier(node)) {
        exports.push(...this.extractTypeExports(node));
      }
    });

    // Extract relationships
    relationships.push(...this.extractTypeRelationships(definitions));

    const complexity = this.calculateTypeComplexity(definitions);

    return {
      definitions,
      imports,
      exports,
      relationships,
      complexity,
    };
  }

  /**
   * Extracts interface definition
   */
  private extractInterface(node: ts.InterfaceDeclaration): TypeDefinition {
    const name = node.name.text;
    const properties = this.extractProperties(node.members);
    const methods = this.extractMethods(node.members);
    const generics = this.extractGenerics(node.typeParameters);
    const extends_ = this.extractHeritageClause(
      node,
      ts.SyntaxKind.ExtendsKeyword
    );

    return {
      name,
      kind: "interface",
      complexity: this.calculateDefinitionComplexity(properties, methods),
      properties,
      methods,
      generics,
      extends: extends_,
      isExported: this.hasExportModifier(node),
      exportType: this.hasExportModifier(node)
        ? getExportType(node)
        : undefined,
      description: this.extractJSDocComment(node),
    };
  }

  /**
   * Extracts type alias definition
   */
  private extractTypeAlias(node: ts.TypeAliasDeclaration): TypeDefinition {
    const name = node.name.text;
    const generics = this.extractGenerics(node.typeParameters);
    const typeNode = node.type;

    let kind: TypeKind = "type-alias";
    if (ts.isUnionTypeNode(typeNode)) kind = "union";
    else if (ts.isIntersectionTypeNode(typeNode)) kind = "intersection";
    else if (ts.isFunctionTypeNode(typeNode)) kind = "function-type";

    return {
      name,
      kind,
      complexity: this.calculateTypeNodeComplexity(typeNode),
      generics,
      isExported: this.hasExportModifier(node),
      exportType: this.hasExportModifier(node)
        ? getExportType(node)
        : undefined,
      description: this.extractJSDocComment(node),
    };
  }

  /**
   * Extracts enum definition
   */
  private extractEnum(node: ts.EnumDeclaration): TypeDefinition {
    const name = node.name.text;
    const members = node.members.map((member) => ({
      name: member.name?.getText() || "",
      type: "string | number",
      optional: false,
      readonly: true,
    }));

    return {
      name,
      kind: "enum",
      complexity:
        members.length > 10
          ? "complex"
          : members.length > 5
          ? "moderate"
          : "simple",
      properties: members,
      isExported: this.hasExportModifier(node),
      exportType: this.hasExportModifier(node)
        ? getExportType(node)
        : undefined,
      description: this.extractJSDocComment(node),
    };
  }

  /**
   * Extracts class definition
   */
  private extractClass(node: ts.ClassDeclaration): TypeDefinition {
    const name = node.name?.text || "Anonymous";
    const properties = this.extractClassProperties(node.members);
    const methods = this.extractClassMethods(node.members);
    const generics = this.extractGenerics(node.typeParameters);
    const extends_ = this.extractHeritageClause(
      node,
      ts.SyntaxKind.ExtendsKeyword
    );
    const implements_ = this.extractHeritageClause(
      node,
      ts.SyntaxKind.ImplementsKeyword
    );

    return {
      name,
      kind: "class",
      complexity: this.calculateDefinitionComplexity(properties, methods),
      properties,
      methods,
      generics,
      extends: extends_,
      implements: implements_,
      isExported: this.hasExportModifier(node),
      exportType: this.hasExportModifier(node)
        ? getExportType(node)
        : undefined,
      description: this.extractJSDocComment(node),
    };
  }

  /**
   * Extracts properties from interface/class members
   */
  private extractProperties(
    members: ts.NodeArray<ts.TypeElement>
  ): PropertyDefinition[] {
    return members.filter(ts.isPropertySignature).map((prop) => ({
      name: prop.name?.getText() || "",
      type: prop.type?.getText() || "any",
      optional: !!prop.questionToken,
      readonly: !!prop.modifiers?.some(
        (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
      ),
      description: this.extractJSDocComment(prop),
    }));
  }

  /**
   * Extracts methods from interface/class members
   */
  private extractMethods(
    members: ts.NodeArray<ts.TypeElement>
  ): MethodDefinition[] {
    return members.filter(ts.isMethodSignature).map((method) => ({
      name: method.name?.getText() || "",
      parameters: this.extractParameters(method.parameters),
      returnType: method.type?.getText() || "void",
      isAsync: false, // Method signatures don't have async modifier
      description: this.extractJSDocComment(method),
    }));
  }

  /**
   * Extracts class properties
   */
  private extractClassProperties(
    members: ts.NodeArray<ts.ClassElement>
  ): PropertyDefinition[] {
    return members.filter(ts.isPropertyDeclaration).map((prop) => ({
      name: prop.name?.getText() || "",
      type: prop.type?.getText() || "any",
      optional: !!prop.questionToken,
      readonly: !!prop.modifiers?.some(
        (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
      ),
      description: this.extractJSDocComment(prop),
    }));
  }

  /**
   * Extracts class methods
   */
  private extractClassMethods(
    members: ts.NodeArray<ts.ClassElement>
  ): MethodDefinition[] {
    return members.filter(ts.isMethodDeclaration).map((method) => ({
      name: method.name?.getText() || "",
      parameters: this.extractParameters(method.parameters),
      returnType: method.type?.getText() || "void",
      isAsync: !!method.modifiers?.some(
        (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
      ),
      description: this.extractJSDocComment(method),
    }));
  }

  /**
   * Extracts parameters from function/method
   */
  private extractParameters(
    parameters: ts.NodeArray<ts.ParameterDeclaration>
  ): ParameterDefinition[] {
    return parameters.map((param) => ({
      name: param.name.getText(),
      type: param.type?.getText() || "any",
      optional: !!param.questionToken,
      defaultValue: param.initializer?.getText(),
    }));
  }

  /**
   * Extracts generic type parameters
   */
  private extractGenerics(
    typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>
  ): string[] {
    if (!typeParameters) return [];
    return typeParameters.map((tp) => tp.name.text);
  }

  /**
   * Extracts heritage clause (extends/implements)
   */
  private extractHeritageClause(
    node: ts.InterfaceDeclaration | ts.ClassDeclaration,
    kind: ts.SyntaxKind.ExtendsKeyword | ts.SyntaxKind.ImplementsKeyword
  ): string[] {
    if (!node.heritageClauses) return [];

    const clause = node.heritageClauses.find((hc) => hc.token === kind);
    if (!clause) return [];

    return clause.types.map((type) => type.expression.getText());
  }

  /**
   * Extracts type imports
   */
  private extractTypeImports(node: ts.ImportDeclaration): TypeImport[] {
    const imports: TypeImport[] = [];
    const source = (node.moduleSpecifier as ts.StringLiteral).text;
    const isTypeOnly = !!node.importClause?.isTypeOnly;

    if (
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      node.importClause.namedBindings.elements.forEach((element) => {
        imports.push({
          name: element.name.text,
          source,
          isTypeOnly: isTypeOnly || !!element.isTypeOnly,
        });
      });
    }

    return imports;
  }

  /**
   * Extracts type exports
   */
  private extractTypeExports(node: ts.Node): TypeExport[] {
    const exports: TypeExport[] = [];

    if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      node.exportClause.elements.forEach((element) => {
        exports.push({
          name: element.name.text,
          kind: "type-alias", // Default, could be refined
          isDefault: false,
          isTypeOnly: !!element.isTypeOnly,
        });
      });
    } else if (this.hasExportModifier(node)) {
      let name = "";
      let kind: TypeKind = "type-alias";

      if (ts.isInterfaceDeclaration(node)) {
        name = node.name.text;
        kind = "interface";
      } else if (ts.isTypeAliasDeclaration(node)) {
        name = node.name.text;
        kind = "type-alias";
      } else if (ts.isEnumDeclaration(node)) {
        name = node.name.text;
        kind = "enum";
      } else if (ts.isClassDeclaration(node)) {
        name = node.name?.text || "";
        kind = "class";
      }

      if (name) {
        exports.push({
          name,
          kind,
          isDefault: this.isDefaultExport(node),
          isTypeOnly: false,
        });
      }
    }

    return exports;
  }

  /**
   * Extracts type relationships
   */
  private extractTypeRelationships(
    definitions: TypeDefinition[]
  ): TypeRelationship[] {
    const relationships: TypeRelationship[] = [];

    definitions.forEach((def) => {
      // Extends relationships
      def.extends?.forEach((extended) => {
        relationships.push({
          from: def.name,
          to: extended,
          relationship: "extends",
        });
      });

      // Implements relationships
      def.implements?.forEach((implemented) => {
        relationships.push({
          from: def.name,
          to: implemented,
          relationship: "implements",
        });
      });

      // Property type usage relationships
      def.properties?.forEach((prop) => {
        const usedTypes = this.extractTypeNamesFromString(prop.type);
        usedTypes.forEach((typeName) => {
          if (definitions.some((d) => d.name === typeName)) {
            relationships.push({
              from: def.name,
              to: typeName,
              relationship: "uses",
            });
          }
        });
      });
    });

    return relationships;
  }

  /**
   * Calculates complexity of a type definition
   */
  private calculateDefinitionComplexity(
    properties?: PropertyDefinition[],
    methods?: MethodDefinition[]
  ): "simple" | "moderate" | "complex" {
    const propCount = properties?.length || 0;
    const methodCount = methods?.length || 0;
    const total = propCount + methodCount;

    if (total > 15) return "complex";
    if (total > 7) return "moderate";
    return "simple";
  }

  /**
   * Calculates complexity of a type node
   */
  private calculateTypeNodeComplexity(
    typeNode: ts.TypeNode
  ): "simple" | "moderate" | "complex" {
    const text = typeNode.getText();
    const nestingLevel = (text.match(/[<({]/g) || []).length;
    const unionCount = (text.match(/\|/g) || []).length;

    if (nestingLevel > 3 || unionCount > 5) return "complex";
    if (nestingLevel > 1 || unionCount > 2) return "moderate";
    return "simple";
  }

  /**
   * Calculates overall type complexity metrics
   */
  private calculateTypeComplexity(
    definitions: TypeDefinition[]
  ): TypeComplexityMetrics {
    const totalTypes = definitions.length;
    const complexityScores = definitions.map((def) => {
      switch (def.complexity) {
        case "complex":
          return 3;
        case "moderate":
          return 2;
        case "simple":
          return 1;
        default:
          return 1;
      }
    });

    const averageComplexity =
      complexityScores.length > 0
        ? complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length
        : 0;

    const maxNestingLevel = Math.max(
      ...definitions.map((def) =>
        Math.max(
          ...(def.properties?.map(
            (p) => (p.type.match(/[<({]/g) || []).length
          ) || [0]),
          ...(def.methods?.map(
            (m) => (m.returnType.match(/[<({]/g) || []).length
          ) || [0])
        )
      ),
      0
    );

    const genericUsage = definitions.filter(
      (def) => def.generics && def.generics.length > 0
    ).length;
    const unionTypes = definitions.filter((def) => def.kind === "union").length;

    return {
      totalTypes,
      averageComplexity,
      maxNestingLevel,
      genericUsage,
      unionTypes,
    };
  }

  /**
   * Extracts JSDoc comment
   */
  private extractJSDocComment(node: ts.Node): string | undefined {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(
      fullText,
      node.getFullStart()
    );

    if (commentRanges && commentRanges.length > 0) {
      const lastComment = commentRanges[commentRanges.length - 1];
      const commentText = fullText.substring(lastComment.pos, lastComment.end);

      if (commentText.startsWith("/**")) {
        return commentText
          .replace(/\/\*\*|\*\/|\* ?/g, "")
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join(" ");
      }
    }

    return undefined;
  }

  /**
   * Checks if node has export modifier
   */
  private hasExportModifier(node: ts.Node): boolean {
    return ts.getCombinedModifierFlags(node as any) & ts.ModifierFlags.Export
      ? true
      : false;
  }

  /**
   * Checks if node is default export
   */
  private isDefaultExport(node: ts.Node): boolean {
    return ts.getCombinedModifierFlags(node as any) & ts.ModifierFlags.Default
      ? true
      : false;
  }

  /**
   * Extracts type names from a type string
   */
  private extractTypeNamesFromString(typeStr: string): string[] {
    // Simple regex to extract custom type names (capital letter start)
    const matches = typeStr.match(/\b[A-Z][a-zA-Z0-9]*\b/g) || [];
    // Filter out built-in types
    const builtInTypes = [
      "String",
      "Number",
      "Boolean",
      "Array",
      "Object",
      "Date",
      "Promise",
      "Record",
    ];
    return matches.filter((match) => !builtInTypes.includes(match));
  }
}
