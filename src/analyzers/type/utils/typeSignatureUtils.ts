import ts from "typescript";
import { TypeSignature } from "../types/internalTypes";

/**
 * Utilities for generating and manipulating type signatures
 */
export class TypeSignatureUtils {
  /**
   * Generate a structural signature for a type node
   */
  public static generateTypeSignature(node: ts.Node): TypeSignature {
    const properties = new Map<string, string>();
    const methods = new Map<string, string>();
    const extendsTypes: string[] = [];

    // Extract properties, methods, and extended types based on node kind
    if (ts.isInterfaceDeclaration(node)) {
      // Handle extends clauses
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            for (const type of clause.types) {
              extendsTypes.push(type.getText());
            }
          }
        }
      }

      // Handle properties and methods
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const name = member.name.getText();
          const type = member.type ? member.type.getText() : "any";
          properties.set(name, type);
        } else if (ts.isMethodSignature(member) && member.name) {
          const name = member.name.getText();
          const returnType = member.type ? member.type.getText() : "any";
          const params = member.parameters.map((p) => p.getText()).join(", ");
          methods.set(name, `(${params}) => ${returnType}`);
        }
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      if (ts.isTypeLiteralNode(node.type)) {
        // Handle object type aliases
        for (const member of node.type.members) {
          if (ts.isPropertySignature(member) && member.name) {
            const name = member.name.getText();
            const type = member.type ? member.type.getText() : "any";
            properties.set(name, type);
          } else if (ts.isMethodSignature(member) && member.name) {
            const name = member.name.getText();
            const returnType = member.type ? member.type.getText() : "any";
            const params = member.parameters.map((p) => p.getText()).join(", ");
            methods.set(name, `(${params}) => ${returnType}`);
          }
        }
      }
      // For union/intersection types, we would need more complex logic
    } else if (ts.isClassDeclaration(node)) {
      // Handle extends
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            for (const type of clause.types) {
              extendsTypes.push(type.getText());
            }
          }
        }
      }

      // Handle properties and methods
      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member) && member.name) {
          const name = member.name.getText();
          const type = member.type ? member.type.getText() : "any";
          properties.set(name, type);
        } else if (ts.isMethodDeclaration(member) && member.name) {
          const name = member.name.getText();
          const returnType = member.type ? member.type.getText() : "any";
          const params = member.parameters.map((p) => p.getText()).join(", ");
          methods.set(name, `(${params}) => ${returnType}`);
        }
      }
    }

    // Generate a unique signature hash from the structure
    const propsArray = Array.from(properties.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const methodsArray = Array.from(methods.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    const signatureString = JSON.stringify({
      props: propsArray,
      methods: methodsArray,
      extends: extendsTypes.sort(),
    });

    const signatureHash = this.hashString(signatureString);

    return {
      kind: node.kind,
      properties,
      methods,
      extends: extendsTypes,
      signature: signatureHash,
    };
  }

  /**
   * Simple hash function for strings
   */
  public static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Compare two type signatures for structural equality
   */
  public static areSignaturesEqual(
    a: TypeSignature,
    b: TypeSignature
  ): boolean {
    return a.signature === b.signature;
  }

  /**
   * Check if a type is a subtype of another by signature
   */
  public static isSubtypeOf(
    subType: TypeSignature,
    superType: TypeSignature
  ): boolean {
    // A type is a subtype if it has all properties of the supertype
    // and potentially more
    for (const [propName, propType] of superType.properties.entries()) {
      if (!subType.properties.has(propName)) {
        return false;
      }

      // For strict subtyping, would need to check type compatibility too
      // For now, we just check if the property exists
    }

    // Check methods too
    for (const [methodName, methodSig] of superType.methods.entries()) {
      if (!subType.methods.has(methodName)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get property overlap between two type signatures
   */
  public static getPropertyOverlap(
    a: TypeSignature,
    b: TypeSignature
  ): {
    common: string[];
    onlyInA: string[];
    onlyInB: string[];
  } {
    const propsA = Array.from(a.properties.keys());
    const propsB = Array.from(b.properties.keys());

    const common = propsA.filter((prop) => propsB.includes(prop));
    const onlyInA = propsA.filter((prop) => !propsB.includes(prop));
    const onlyInB = propsB.filter((prop) => !propsA.includes(prop));

    return { common, onlyInA, onlyInB };
  }

  /**
   * Create a merged signature from multiple type signatures
   */
  public static mergeTypeSignatures(
    signatures: TypeSignature[]
  ): TypeSignature {
    if (signatures.length === 0) {
      throw new Error("Cannot merge empty array of signatures");
    }

    const merged: TypeSignature = {
      kind: signatures[0].kind,
      properties: new Map<string, string>(),
      methods: new Map<string, string>(),
      extends: [],
      signature: "",
    };

    // Merge all properties, methods, and extends
    for (const sig of signatures) {
      // Add properties
      for (const [propName, propType] of sig.properties.entries()) {
        if (!merged.properties.has(propName)) {
          merged.properties.set(propName, propType);
        } else if (merged.properties.get(propName) !== propType) {
          // If property exists with different type, use union type
          merged.properties.set(
            propName,
            `${merged.properties.get(propName)} | ${propType}`
          );
        }
      }

      // Add methods
      for (const [methodName, methodSig] of sig.methods.entries()) {
        if (!merged.methods.has(methodName)) {
          merged.methods.set(methodName, methodSig);
        }
      }

      // Add extends
      for (const ext of sig.extends) {
        if (!merged.extends.includes(ext)) {
          merged.extends.push(ext);
        }
      }
    }

    // Regenerate signature hash
    const propsArray = Array.from(merged.properties.entries()).sort(
      ([a], [b]) => a.localeCompare(b)
    );
    const methodsArray = Array.from(merged.methods.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    const signatureString = JSON.stringify({
      props: propsArray,
      methods: methodsArray,
      extends: merged.extends.sort(),
    });

    merged.signature = this.hashString(signatureString);

    return merged;
  }
}
