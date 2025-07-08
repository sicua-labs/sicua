import ts from "typescript";
import { NodeTypeGuards } from "../ast/nodeTypeGuards";

export class TypeEvaluator {
  private typeChecker: ts.TypeChecker;

  constructor(typeChecker: ts.TypeChecker) {
    this.typeChecker = typeChecker;
  }

  /**
   * Gets the type string for a node
   */
  evaluateType(node: ts.Node): string {
    const type = this.typeChecker.getTypeAtLocation(node);
    return this.typeChecker.typeToString(type);
  }

  /**
   * Extracts type properties from an interface or type
   */
  extractTypeProperties(type: ts.TypeNode): Record<string, string> {
    const properties: Record<string, string> = {};

    if (ts.isTypeLiteralNode(type)) {
      type.members.forEach((member) => {
        if (ts.isPropertySignature(member) && member.type) {
          const propName = member.name.getText();
          properties[propName] = this.getTypeString(member.type);
        }
      });
    }

    return properties;
  }

  /**
   * Evaluates union type components
   */
  evaluateUnionType(type: ts.UnionTypeNode): string[] {
    return type.types.map((t) => this.getTypeString(t));
  }

  /**
   * Gets return type of a function-like declaration
   */
  getFunctionReturnType(node: ts.FunctionLikeDeclaration): string | undefined {
    if (node.type) {
      return this.getTypeString(node.type);
    }

    const signature = this.typeChecker.getSignatureFromDeclaration(node);
    if (signature) {
      const returnType = this.typeChecker.getReturnTypeOfSignature(signature);
      return this.typeChecker.typeToString(returnType);
    }

    return undefined;
  }

  /**
   * Gets parameter types of a function-like declaration
   */
  getFunctionParameterTypes(
    node: ts.FunctionLikeDeclaration
  ): Record<string, string> {
    const paramTypes: Record<string, string> = {};

    node.parameters.forEach((param) => {
      if (ts.isIdentifier(param.name) && param.type) {
        paramTypes[param.name.text] = this.getTypeString(param.type);
      }
    });

    return paramTypes;
  }

  /**
   * Gets the base type(s) of a class/interface
   */
  getBaseTypes(node: ts.ClassDeclaration | ts.InterfaceDeclaration): string[] {
    const baseTypes: string[] = [];

    if (node.heritageClauses) {
      node.heritageClauses.forEach((clause) => {
        clause.types.forEach((type) => {
          const baseType = this.typeChecker.getTypeAtLocation(type.expression);
          baseTypes.push(this.typeChecker.typeToString(baseType));
        });
      });
    }

    return baseTypes;
  }

  /**
   * Checks if a type is assignable to another type
   */
  isTypeAssignableTo(source: ts.Node, target: ts.Node): boolean {
    const sourceType = this.typeChecker.getTypeAtLocation(source);
    const targetType = this.typeChecker.getTypeAtLocation(target);
    return this.typeChecker.isTypeAssignableTo(sourceType, targetType);
  }

  /**
   * Gets resolved type arguments for a generic type
   */
  getTypeArguments(node: ts.TypeReferenceNode): string[] {
    if (!node.typeArguments) return [];

    return node.typeArguments.map((arg) => this.getTypeString(arg));
  }

  /**
   * Helper method to convert TypeNode to string
   */
  private getTypeString(type: ts.TypeNode): string {
    if (NodeTypeGuards.isTypeReference(type)) {
      return type.typeName.getText();
    } else if (ts.isLiteralTypeNode(type)) {
      return type.literal.getText();
    } else if (ts.isUnionTypeNode(type)) {
      return type.types.map((t) => this.getTypeString(t)).join(" | ");
    } else if (ts.isArrayTypeNode(type)) {
      return `${this.getTypeString(type.elementType)}[]`;
    } else {
      return type.getText();
    }
  }

  /**
   * Gets inferred type of a node
   */
  getInferredType(node: ts.Node): string {
    const type = this.typeChecker.getTypeAtLocation(node);
    return this.typeChecker.typeToString(type);
  }

  /**
   * Checks if a type is a Promise type
   */
  isPromiseType(node: ts.Node): boolean {
    const type = this.typeChecker.getTypeAtLocation(node);
    const symbol = type.getSymbol();
    return symbol?.getName() === "Promise";
  }

  /**
   * Gets the declared type of a variable/parameter
   */
  getDeclaredType(
    declaration: ts.VariableDeclaration | ts.ParameterDeclaration
  ): string | undefined {
    if (declaration.type) {
      return this.getTypeString(declaration.type);
    }
    return undefined;
  }
}
