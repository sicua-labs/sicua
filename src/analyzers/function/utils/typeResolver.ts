import ts from "typescript";

/**
 * Utility class for resolving TypeScript types accurately
 */
export class TypeResolver {
  private typeChecker: ts.TypeChecker;

  constructor(typeChecker: ts.TypeChecker) {
    this.typeChecker = typeChecker;
  }

  /**
   * Resolves the return type of a function-like declaration
   * Handles both explicit and inferred types
   */
  resolveFunctionReturnType(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): string {
    try {
      // First try to get explicit return type annotation
      if (node.type) {
        return this.cleanTypeString(node.type.getText());
      }

      // For inferred types, use the type checker
      const signature = this.typeChecker.getSignatureFromDeclaration(node);
      if (signature) {
        const returnType = this.typeChecker.getReturnTypeOfSignature(signature);
        const typeString = this.typeChecker.typeToString(returnType);
        return this.cleanTypeString(typeString);
      }

      // Handle arrow functions without explicit types
      if (ts.isArrowFunction(node) && node.body) {
        if (ts.isBlock(node.body)) {
          // Block body - try to infer from return statements
          return this.inferReturnTypeFromBlock(node.body);
        } else {
          // Expression body - get the type of the expression
          const expressionType = this.typeChecker.getTypeAtLocation(node.body);
          return this.cleanTypeString(
            this.typeChecker.typeToString(expressionType)
          );
        }
      }

      return "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Resolves parameter types for a function
   * Returns an array of type strings corresponding to each parameter
   */
  resolveParameterTypes(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): string[] {
    try {
      return node.parameters.map((param) => {
        // Check for explicit type annotation
        if (param.type) {
          return this.cleanTypeString(param.type.getText());
        }

        // Use type checker for inferred types
        const paramType = this.typeChecker.getTypeAtLocation(param);
        return this.cleanTypeString(this.typeChecker.typeToString(paramType));
      });
    } catch (error) {
      return node.parameters.map(() => "unknown");
    }
  }

  /**
   * Checks if a function returns a Promise (is effectively async)
   */
  isEffectivelyAsync(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    try {
      // Check for explicit async modifier
      if (
        node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.AsyncKeyword)
      ) {
        return true;
      }

      // Check return type for Promise
      const signature = this.typeChecker.getSignatureFromDeclaration(node);
      if (signature) {
        const returnType = this.typeChecker.getReturnTypeOfSignature(signature);
        const typeString = this.typeChecker.typeToString(returnType);
        return this.isPromiseType(typeString);
      }

      // For arrow functions, check the body
      if (ts.isArrowFunction(node) && node.body && !ts.isBlock(node.body)) {
        const expressionType = this.typeChecker.getTypeAtLocation(node.body);
        const typeString = this.typeChecker.typeToString(expressionType);
        return this.isPromiseType(typeString);
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Resolves the type of a variable or property
   */
  resolveVariableType(
    node: ts.VariableDeclaration | ts.PropertyDeclaration
  ): string {
    try {
      // Check for explicit type annotation
      if (node.type) {
        return this.cleanTypeString(node.type.getText());
      }

      // Use type checker for inferred types
      const nodeType = this.typeChecker.getTypeAtLocation(node);
      return this.cleanTypeString(this.typeChecker.typeToString(nodeType));
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Checks if a type represents a generic type
   */
  isGenericType(typeString: string): boolean {
    return typeString.includes("<") && typeString.includes(">");
  }

  /**
   * Extracts generic type parameters from a type string
   */
  extractGenericParameters(typeString: string): string[] {
    const match = typeString.match(/<([^>]+)>/);
    if (match) {
      return match[1].split(",").map((param) => param.trim());
    }
    return [];
  }

  /**
   * Checks if a type is a union type
   */
  isUnionType(typeString: string): boolean {
    return typeString.includes(" | ");
  }

  /**
   * Checks if a type is an intersection type
   */
  isIntersectionType(typeString: string): boolean {
    return typeString.includes(" & ");
  }

  /**
   * Private helper to clean up type strings
   */
  private cleanTypeString(typeString: string): string {
    return typeString.replace(/\s+/g, " ").replace(/\n/g, " ").trim();
  }

  /**
   * Private helper to check if a type string represents a Promise
   */
  private isPromiseType(typeString: string): boolean {
    const cleanType = typeString.toLowerCase();
    return (
      cleanType.includes("promise<") ||
      cleanType.startsWith("promise") ||
      cleanType.includes("awaitable") ||
      cleanType.includes("thenable")
    );
  }

  /**
   * Private helper to infer return type from a block statement
   */
  private inferReturnTypeFromBlock(block: ts.Block): string {
    const returnStatements: ts.ReturnStatement[] = [];

    const findReturns = (node: ts.Node): void => {
      if (ts.isReturnStatement(node)) {
        returnStatements.push(node);
      }
      ts.forEachChild(node, findReturns);
    };

    findReturns(block);

    if (returnStatements.length === 0) {
      return "void";
    }

    // If all returns have expressions, infer from the first one
    const firstReturnWithExpression = returnStatements.find(
      (stmt) => stmt.expression
    );
    if (firstReturnWithExpression && firstReturnWithExpression.expression) {
      try {
        const expressionType = this.typeChecker.getTypeAtLocation(
          firstReturnWithExpression.expression
        );
        return this.cleanTypeString(
          this.typeChecker.typeToString(expressionType)
        );
      } catch (error) {
        return "unknown";
      }
    }

    // If we only have empty returns, it's void
    return "void";
  }

  /**
   * Checks if a type is a primitive type
   */
  isPrimitiveType(typeString: string): boolean {
    const primitives = [
      "string",
      "number",
      "boolean",
      "null",
      "undefined",
      "void",
      "never",
    ];
    return primitives.includes(typeString.toLowerCase());
  }

  /**
   * Simplifies complex type strings for better readability
   */
  simplifyTypeString(typeString: string): string {
    const cleaned = this.cleanTypeString(typeString);

    // Handle very long union types
    if (this.isUnionType(cleaned) && cleaned.length > 100) {
      const unionTypes = cleaned.split(" | ");
      if (unionTypes.length > 5) {
        return `${unionTypes.slice(0, 3).join(" | ")} | ... (${
          unionTypes.length - 3
        } more)`;
      }
    }

    // Simplify deeply nested generics
    if (this.isGenericType(cleaned) && cleaned.length > 150) {
      const baseType = cleaned.split("<")[0];
      return `${baseType}<...>`;
    }

    return cleaned;
  }
}
