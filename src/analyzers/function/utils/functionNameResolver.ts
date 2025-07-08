import ts from "typescript";

/**
 * Configuration for function name resolution
 */
interface NameResolutionConfig {
  includeAnonymousIndicator: boolean;
  useParentContext: boolean;
  resolveComputedNames: boolean;
  maxComputedNameLength: number;
  fallbackPrefix: string;
}

/**
 * Detailed function name information
 */
interface ResolvedFunctionName {
  name: string;
  isAnonymous: boolean;
  isComputed: boolean;
  hasParentContext: boolean;
  source: FunctionNameSource;
  confidence: number;
  alternativeNames: string[];
}

/**
 * Source of function name resolution
 */
enum FunctionNameSource {
  DIRECT_NAME = "direct_name",
  VARIABLE_DECLARATION = "variable_declaration",
  PROPERTY_ASSIGNMENT = "property_assignment",
  EXPORT_ASSIGNMENT = "export_assignment",
  PARENT_CONTEXT = "parent_context",
  COMPUTED_EXPRESSION = "computed_expression",
  FALLBACK = "fallback",
}

/**
 * Utility class for comprehensive function name resolution
 */
export class FunctionNameResolver {
  private config: NameResolutionConfig;

  constructor(config: Partial<NameResolutionConfig> = {}) {
    this.config = {
      includeAnonymousIndicator: true,
      useParentContext: true,
      resolveComputedNames: true,
      maxComputedNameLength: 50,
      fallbackPrefix: "Anonymous",
      ...config,
    };
  }

  /**
   * Resolves function name (backward compatibility)
   * @param node The function-like node
   * @returns Simple function name string
   */
  resolveName(node: ts.Node): string {
    const resolved = this.resolveNameDetailed(node);
    return resolved.name;
  }

  /**
   * Resolves function name with detailed information
   * @param node The function-like node
   * @returns Detailed name resolution result
   */
  resolveNameDetailed(node: ts.Node): ResolvedFunctionName {
    try {
      // Try direct name resolution first
      const directResult = this.tryDirectNameResolution(node);
      if (directResult.confidence > 0.8) {
        return directResult;
      }

      // Try variable declaration context
      const variableResult = this.tryVariableDeclarationResolution(node);
      if (variableResult.confidence > 0.8) {
        return variableResult;
      }

      // Try property assignment context
      const propertyResult = this.tryPropertyAssignmentResolution(node);
      if (propertyResult.confidence > 0.8) {
        return propertyResult;
      }

      // Try export context
      const exportResult = this.tryExportResolution(node);
      if (exportResult.confidence > 0.8) {
        return exportResult;
      }

      // Try parent context if enabled
      if (this.config.useParentContext) {
        const parentResult = this.tryParentContextResolution(node);
        if (parentResult.confidence > 0.6) {
          return parentResult;
        }
      }

      // Try computed name resolution if enabled
      if (this.config.resolveComputedNames) {
        const computedResult = this.tryComputedNameResolution(node);
        if (computedResult.confidence > 0.5) {
          return computedResult;
        }
      }

      // Return fallback
      return this.createFallbackResult(node);
    } catch (error) {
      return this.createErrorFallback();
    }
  }

  /**
   * Tries to resolve name directly from the node
   */
  private tryDirectNameResolution(node: ts.Node): ResolvedFunctionName {
    // Function declaration with name
    if (ts.isFunctionDeclaration(node) && node.name) {
      return {
        name: node.name.text,
        isAnonymous: false,
        isComputed: false,
        hasParentContext: false,
        source: FunctionNameSource.DIRECT_NAME,
        confidence: 1.0,
        alternativeNames: [],
      };
    }

    // Method declaration with identifier name
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return {
        name: node.name.text,
        isAnonymous: false,
        isComputed: false,
        hasParentContext: true,
        source: FunctionNameSource.DIRECT_NAME,
        confidence: 1.0,
        alternativeNames: [],
      };
    }

    // Function expression with name
    if (ts.isFunctionExpression(node) && node.name) {
      return {
        name: node.name.text,
        isAnonymous: false,
        isComputed: false,
        hasParentContext: false,
        source: FunctionNameSource.DIRECT_NAME,
        confidence: 0.9,
        alternativeNames: [],
      };
    }

    return this.createLowConfidenceResult("", FunctionNameSource.DIRECT_NAME);
  }

  /**
   * Tries to resolve name from variable declaration context
   */
  private tryVariableDeclarationResolution(
    node: ts.Node
  ): ResolvedFunctionName {
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const parent = node.parent;

      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return {
          name: parent.name.text,
          isAnonymous: false,
          isComputed: false,
          hasParentContext: true,
          source: FunctionNameSource.VARIABLE_DECLARATION,
          confidence: 0.9,
          alternativeNames: [],
        };
      }

      // Handle destructuring assignment
      if (
        ts.isVariableDeclaration(parent) &&
        ts.isObjectBindingPattern(parent.name)
      ) {
        const destructuredName = this.resolveDestructuredName(
          parent.name,
          node
        );
        if (destructuredName) {
          return {
            name: destructuredName,
            isAnonymous: false,
            isComputed: false,
            hasParentContext: true,
            source: FunctionNameSource.VARIABLE_DECLARATION,
            confidence: 0.8,
            alternativeNames: [],
          };
        }
      }
    }

    return this.createLowConfidenceResult(
      "",
      FunctionNameSource.VARIABLE_DECLARATION
    );
  }

  /**
   * Tries to resolve name from property assignment context
   */
  private tryPropertyAssignmentResolution(node: ts.Node): ResolvedFunctionName {
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const parent = node.parent;

      // Property assignment
      if (ts.isPropertyAssignment(parent)) {
        const propertyName = this.resolvePropertyName(parent.name);
        if (propertyName) {
          return {
            name: propertyName,
            isAnonymous: false,
            isComputed: ts.isComputedPropertyName(parent.name),
            hasParentContext: true,
            source: FunctionNameSource.PROPERTY_ASSIGNMENT,
            confidence: 0.85,
            alternativeNames: [],
          };
        }
      }

      // Binary expression (e.g., object.method = function)
      if (
        ts.isBinaryExpression(parent) &&
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        const leftSide = parent.left;
        if (ts.isPropertyAccessExpression(leftSide)) {
          return {
            name: leftSide.name.text,
            isAnonymous: false,
            isComputed: false,
            hasParentContext: true,
            source: FunctionNameSource.PROPERTY_ASSIGNMENT,
            confidence: 0.8,
            alternativeNames: [this.getFullPropertyPath(leftSide)],
          };
        }
      }

      // Shorthand property assignment
      if (ts.isShorthandPropertyAssignment(parent)) {
        return {
          name: parent.name.text,
          isAnonymous: false,
          isComputed: false,
          hasParentContext: true,
          source: FunctionNameSource.PROPERTY_ASSIGNMENT,
          confidence: 0.9,
          alternativeNames: [],
        };
      }
    }

    return this.createLowConfidenceResult(
      "",
      FunctionNameSource.PROPERTY_ASSIGNMENT
    );
  }

  /**
   * Tries to resolve name from export context
   */
  private tryExportResolution(node: ts.Node): ResolvedFunctionName {
    const parent = node.parent;

    // Export default
    if (ts.isExportAssignment(parent) && parent.expression === node) {
      const sourceFile = node.getSourceFile();
      const fileName = this.getFileBaseName(sourceFile.fileName);
      return {
        name: `Default${fileName}`,
        isAnonymous: false,
        isComputed: false,
        hasParentContext: true,
        source: FunctionNameSource.EXPORT_ASSIGNMENT,
        confidence: 0.7,
        alternativeNames: [fileName, "DefaultExport"],
      };
    }

    // Named export with variable declaration
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      const grandParent = parent.parent?.parent;
      if (
        ts.isVariableStatement(grandParent) &&
        grandParent.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
        )
      ) {
        return {
          name: parent.name.text,
          isAnonymous: false,
          isComputed: false,
          hasParentContext: true,
          source: FunctionNameSource.EXPORT_ASSIGNMENT,
          confidence: 0.9,
          alternativeNames: [],
        };
      }
    }

    return this.createLowConfidenceResult(
      "",
      FunctionNameSource.EXPORT_ASSIGNMENT
    );
  }

  /**
   * Tries to resolve name from parent context
   */
  private tryParentContextResolution(node: ts.Node): ResolvedFunctionName {
    let current = node.parent;
    const contextNames: string[] = [];

    while (current && contextNames.length < 3) {
      // Class method context
      if (ts.isClassDeclaration(current) && current.name) {
        contextNames.push(`${current.name.text}Method`);
        break;
      }

      // Namespace context
      if (ts.isModuleDeclaration(current) && current.name) {
        contextNames.push(current.name.getText());
      }

      // Interface method context
      if (ts.isInterfaceDeclaration(current) && current.name) {
        contextNames.push(`${current.name.text}Method`);
        break;
      }

      current = current.parent;
    }

    if (contextNames.length > 0) {
      const contextName = contextNames.reverse().join(".");
      return {
        name: contextName,
        isAnonymous: true,
        isComputed: false,
        hasParentContext: true,
        source: FunctionNameSource.PARENT_CONTEXT,
        confidence: 0.6,
        alternativeNames: contextNames,
      };
    }

    return this.createLowConfidenceResult(
      "",
      FunctionNameSource.PARENT_CONTEXT
    );
  }

  /**
   * Tries to resolve computed property names
   */
  private tryComputedNameResolution(node: ts.Node): ResolvedFunctionName {
    const parent = node.parent;

    if (
      ts.isPropertyAssignment(parent) &&
      ts.isComputedPropertyName(parent.name)
    ) {
      const expression = parent.name.expression;
      const computedText = expression.getText();

      if (computedText.length <= this.config.maxComputedNameLength) {
        // Try to evaluate simple computed expressions
        const simplifiedName = this.simplifyComputedExpression(computedText);

        return {
          name: `Computed_${simplifiedName}`,
          isAnonymous: false,
          isComputed: true,
          hasParentContext: true,
          source: FunctionNameSource.COMPUTED_EXPRESSION,
          confidence: 0.5,
          alternativeNames: [computedText, simplifiedName],
        };
      }
    }

    return this.createLowConfidenceResult(
      "",
      FunctionNameSource.COMPUTED_EXPRESSION
    );
  }

  /**
   * Resolves property name from various property name types
   */
  private resolvePropertyName(name: ts.PropertyName): string | null {
    if (ts.isIdentifier(name)) {
      return name.text;
    }
    if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name) && this.config.resolveComputedNames) {
      const expression = name.expression;
      if (ts.isStringLiteral(expression)) {
        return expression.text;
      }
      if (ts.isIdentifier(expression)) {
        return `[${expression.text}]`;
      }
    }
    return null;
  }

  /**
   * Resolves name from destructuring pattern
   */
  private resolveDestructuredName(
    pattern: ts.ObjectBindingPattern,
    targetNode: ts.Node
  ): string | null {
    // This is a simplified implementation - in practice, you'd need to match
    // the specific element that corresponds to the target node
    for (const element of pattern.elements) {
      if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
        return element.name.text;
      }
    }
    return null;
  }

  /**
   * Gets full property access path
   */
  private getFullPropertyPath(expr: ts.PropertyAccessExpression): string {
    const parts: string[] = [];
    let current: ts.Expression = expr;

    while (ts.isPropertyAccessExpression(current)) {
      parts.unshift(current.name.text);
      current = current.expression;
    }

    if (ts.isIdentifier(current)) {
      parts.unshift(current.text);
    }

    return parts.join(".");
  }

  /**
   * Simplifies computed expressions for naming
   */
  private simplifyComputedExpression(expression: string): string {
    // Remove quotes and brackets
    let simplified = expression.replace(/['"[\]]/g, "");

    // Replace common patterns
    simplified = simplified.replace(/\./g, "_");
    simplified = simplified.replace(/[^a-zA-Z0-9_]/g, "");

    // Truncate if too long
    if (simplified.length > 20) {
      simplified = simplified.substring(0, 20) + "...";
    }

    return simplified || "Unknown";
  }

  /**
   * Gets base file name without extension
   */
  private getFileBaseName(fileName: string): string {
    const baseName = fileName.split("/").pop()?.split(".")[0];
    return baseName ? this.capitalizeFirstLetter(baseName) : "File";
  }

  /**
   * Capitalizes first letter of string
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates a low confidence result
   */
  private createLowConfidenceResult(
    name: string,
    source: FunctionNameSource
  ): ResolvedFunctionName {
    return {
      name: name || `${this.config.fallbackPrefix}Function`,
      isAnonymous: true,
      isComputed: false,
      hasParentContext: false,
      source,
      confidence: 0.1,
      alternativeNames: [],
    };
  }

  /**
   * Creates fallback result
   */
  private createFallbackResult(node: ts.Node): ResolvedFunctionName {
    const nodeKind = ts.SyntaxKind[node.kind];
    const fallbackName = this.config.includeAnonymousIndicator
      ? `${this.config.fallbackPrefix}${nodeKind}`
      : this.config.fallbackPrefix;

    return {
      name: fallbackName,
      isAnonymous: true,
      isComputed: false,
      hasParentContext: false,
      source: FunctionNameSource.FALLBACK,
      confidence: 0.0,
      alternativeNames: [nodeKind, "Anonymous Function"],
    };
  }

  /**
   * Creates error fallback result
   */
  private createErrorFallback(): ResolvedFunctionName {
    return {
      name: "ErrorFunction",
      isAnonymous: true,
      isComputed: false,
      hasParentContext: false,
      source: FunctionNameSource.FALLBACK,
      confidence: 0.0,
      alternativeNames: ["Error", "Unknown"],
    };
  }

  /**
   * Checks if a name resolution is reliable
   */
  isReliableName(resolved: ResolvedFunctionName): boolean {
    return resolved.confidence > 0.7 && !resolved.isAnonymous;
  }

  /**
   * Gets the best alternative name
   */
  getBestAlternativeName(resolved: ResolvedFunctionName): string {
    if (resolved.alternativeNames.length > 0) {
      return resolved.alternativeNames[0];
    }
    return resolved.name;
  }

  /**
   * Normalizes function name for consistency
   */
  normalizeName(name: string): string {
    // Remove invalid characters
    let normalized = name.replace(/[^a-zA-Z0-9_$]/g, "_");

    // Ensure doesn't start with number
    if (/^[0-9]/.test(normalized)) {
      normalized = "_" + normalized;
    }

    // Handle empty or too short names
    if (normalized.length < 2) {
      normalized = "fn_" + normalized;
    }

    return normalized;
  }
}
