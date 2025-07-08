import ts from "typescript";

/**
 * Interface representing parsed parameter information
 */
interface ParsedParameter {
  name: string;
  type: string;
  isOptional: boolean;
  hasDefaultValue: boolean;
  defaultValue: string | null;
  isRestParameter: boolean;
  isDestructured: boolean;
  destructuredProperties: string[];
}

/**
 * Utility class for parsing function parameters comprehensively
 */
export class ParameterParser {
  /**
   * Parses function parameters and returns detailed information
   * @param node The function-like declaration
   * @returns Array of parameter name strings (for backward compatibility)
   */
  parseParameters(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): string[] {
    return node.parameters.map((param) => this.parseParameter(param).name);
  }

  /**
   * Parses function parameters with detailed information
   * @param node The function-like declaration
   * @returns Array of detailed parameter information
   */
  parseParametersDetailed(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): ParsedParameter[] {
    return node.parameters.map((param) => this.parseParameter(param));
  }

  /**
   * Parses a single parameter node
   * @param param The parameter declaration
   * @returns Detailed parameter information
   */
  private parseParameter(param: ts.ParameterDeclaration): ParsedParameter {
    const result: ParsedParameter = {
      name: this.extractParameterName(param),
      type: this.extractParameterType(param),
      isOptional: this.isOptionalParameter(param),
      hasDefaultValue: !!param.initializer,
      defaultValue: this.extractDefaultValue(param),
      isRestParameter: !!param.dotDotDotToken,
      isDestructured: this.isDestructuredParameter(param),
      destructuredProperties: this.extractDestructuredProperties(param),
    };

    return result;
  }

  /**
   * Extracts the parameter name, handling destructuring and rest parameters
   */
  private extractParameterName(param: ts.ParameterDeclaration): string {
    try {
      // Handle rest parameters
      if (param.dotDotDotToken) {
        const name = this.getNameFromBindingName(param.name);
        return `...${name}`;
      }

      // Handle destructuring patterns
      if (ts.isObjectBindingPattern(param.name)) {
        return this.formatObjectDestructuring(param.name);
      }

      if (ts.isArrayBindingPattern(param.name)) {
        return this.formatArrayDestructuring(param.name);
      }

      // Handle simple identifier
      if (ts.isIdentifier(param.name)) {
        return param.name.text;
      }

      return "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Extracts parameter type information
   */
  private extractParameterType(param: ts.ParameterDeclaration): string {
    try {
      if (param.type) {
        return param.type.getText().trim();
      }
      return "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Checks if a parameter is optional
   */
  private isOptionalParameter(param: ts.ParameterDeclaration): boolean {
    return !!param.questionToken || !!param.initializer;
  }

  /**
   * Extracts the default value of a parameter if it exists
   */
  private extractDefaultValue(param: ts.ParameterDeclaration): string | null {
    try {
      if (param.initializer) {
        return param.initializer.getText().trim();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Checks if a parameter uses destructuring
   */
  private isDestructuredParameter(param: ts.ParameterDeclaration): boolean {
    return (
      ts.isObjectBindingPattern(param.name) ||
      ts.isArrayBindingPattern(param.name)
    );
  }

  /**
   * Extracts properties from destructured parameters
   */
  private extractDestructuredProperties(
    param: ts.ParameterDeclaration
  ): string[] {
    const properties: string[] = [];

    if (ts.isObjectBindingPattern(param.name)) {
      param.name.elements.forEach((element) => {
        if (ts.isBindingElement(element)) {
          const name = this.getNameFromBindingName(element.name);
          if (name) {
            properties.push(name);
          }
        }
      });
    }

    if (ts.isArrayBindingPattern(param.name)) {
      param.name.elements.forEach((element) => {
        if (element && ts.isBindingElement(element)) {
          const name = this.getNameFromBindingName(element.name);
          if (name) {
            properties.push(name);
          }
        }
      });
    }

    return properties;
  }

  /**
   * Formats object destructuring pattern for display
   */
  private formatObjectDestructuring(pattern: ts.ObjectBindingPattern): string {
    try {
      const elements = pattern.elements
        .map((element) => {
          if (ts.isBindingElement(element)) {
            const name = this.getNameFromBindingName(element.name);
            const propertyName = element.propertyName
              ? this.getNameFromPropertyName(element.propertyName)
              : null;

            if (propertyName && propertyName !== name) {
              return `${propertyName}: ${name}`;
            }
            return name;
          }
          return "unknown";
        })
        .filter(Boolean);

      return `{ ${elements.join(", ")} }`;
    } catch (error) {
      return "{ ... }";
    }
  }

  /**
   * Safely extracts name from property name node
   */
  private getNameFromPropertyName(name: ts.PropertyName): string {
    try {
      if (ts.isIdentifier(name)) {
        return name.text;
      }
      if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
      }
      if (ts.isComputedPropertyName(name)) {
        return `[${name.expression.getText()}]`;
      }
      return "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Formats array destructuring pattern for display
   */
  private formatArrayDestructuring(pattern: ts.ArrayBindingPattern): string {
    try {
      const elements = pattern.elements.map((element) => {
        if (element && ts.isBindingElement(element)) {
          return this.getNameFromBindingName(element.name);
        }
        return "_"; // Hole in array destructuring
      });

      return `[ ${elements.join(", ")} ]`;
    } catch (error) {
      return "[ ... ]";
    }
  }

  /**
   * Safely extracts name from binding name node
   */
  private getNameFromBindingName(name: ts.BindingName): string {
    try {
      if (ts.isIdentifier(name)) {
        return name.text;
      }
      if (ts.isObjectBindingPattern(name)) {
        return this.formatObjectDestructuring(name);
      }
      if (ts.isArrayBindingPattern(name)) {
        return this.formatArrayDestructuring(name);
      }
      return "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Gets parameter count including rest parameters
   */
  getParameterCount(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): number {
    return node.parameters.length;
  }

  /**
   * Gets required parameter count (excluding optional and rest parameters)
   */
  getRequiredParameterCount(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): number {
    return node.parameters.filter(
      (param) =>
        !param.questionToken && !param.initializer && !param.dotDotDotToken
    ).length;
  }

  /**
   * Checks if function has destructured parameters
   */
  hasDestructuredParameters(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    return node.parameters.some((param) => this.isDestructuredParameter(param));
  }

  /**
   * Checks if function has rest parameters
   */
  hasRestParameters(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    return node.parameters.some((param) => !!param.dotDotDotToken);
  }

  /**
   * Checks if function has optional parameters
   */
  hasOptionalParameters(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): boolean {
    return node.parameters.some((param) => this.isOptionalParameter(param));
  }

  /**
   * Gets the complexity score for parameters (for analysis purposes)
   */
  getParameterComplexity(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction
  ): number {
    let complexity = 0;

    node.parameters.forEach((param) => {
      // Base complexity per parameter
      complexity += 1;

      // Additional complexity for destructuring
      if (this.isDestructuredParameter(param)) {
        complexity += 2;
        const properties = this.extractDestructuredProperties(param);
        complexity += properties.length * 0.5;
      }

      // Additional complexity for optional parameters
      if (this.isOptionalParameter(param)) {
        complexity += 1;
      }

      // Additional complexity for rest parameters
      if (param.dotDotDotToken) {
        complexity += 1;
      }
    });

    return Math.round(complexity * 10) / 10; // Round to 1 decimal place
  }
}
