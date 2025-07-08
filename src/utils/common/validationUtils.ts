import { ComponentRelation } from "../../types";

export class ValidationUtils {
  /**
   * Validates a component relation object
   */
  static validateComponentRelation(component: ComponentRelation): void {
    if (!component.name) {
      throw new Error("Component must have a name");
    }

    if (!component.fullPath) {
      throw new Error(`Component ${component.name} must have a full path`);
    }

    if (!Array.isArray(component.usedBy)) {
      throw new Error(`Component ${component.name} must have a usedBy array`);
    }

    if (!Array.isArray(component.imports)) {
      throw new Error(`Component ${component.name} must have an imports array`);
    }

    if (!Array.isArray(component.exports)) {
      throw new Error(`Component ${component.name} must have an exports array`);
    }
  }

  /**
   * Validates an array of component relations
   */
  static validateComponentRelations(components: ComponentRelation[]): void {
    if (!Array.isArray(components)) {
      throw new Error("Components must be an array");
    }

    const componentNames = new Set<string>();

    components.forEach((component, index) => {
      // Check for duplicate component names
      if (componentNames.has(component.name)) {
        throw new Error(`Duplicate component name found: ${component.name}`);
      }
      componentNames.add(component.name);

      // Validate individual component
      this.validateComponentRelation(component);

      // Validate references to other components
      component.usedBy.forEach((usedBy) => {
        if (!components.some((c) => c.name === usedBy)) {
          throw new Error(
            `Component ${component.name} references non-existent component ${usedBy} in usedBy`
          );
        }
      });
    });
  }

  /**
   * Validates a file path exists and has correct extension
   */
  static validateSourceFile(filePath: string): boolean {
    if (!filePath) {
      throw new Error("File path cannot be empty");
    }

    const ext = filePath.toLowerCase().split(".").pop();
    if (!ext || !["ts", "tsx", "js", "jsx"].includes(ext)) {
      throw new Error(
        `Invalid file extension for ${filePath}. Must be .ts, .tsx, .js, or .jsx`
      );
    }

    return true;
  }

  /**
   * Validates an object has required properties
   */
  static validateRequiredProperties<T extends object>(
    obj: T,
    requiredProps: (keyof T)[]
  ): void {
    for (const prop of requiredProps) {
      if (!(prop in obj)) {
        throw new Error(`Missing required property: ${String(prop)}`);
      }

      const value = obj[prop];
      if (value === undefined || value === null) {
        throw new Error(`Property ${String(prop)} cannot be null or undefined`);
      }
    }
  }

  /**
   * Validates a string is not empty or whitespace
   */
  static validateNonEmptyString(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`${fieldName} cannot be empty or whitespace`);
    }
  }

  /**
   * Validates an array is not empty
   */
  static validateNonEmptyArray<T>(
    array: T[] | undefined | null,
    arrayName: string
  ): void {
    if (!array || !Array.isArray(array) || array.length === 0) {
      throw new Error(`${arrayName} must be a non-empty array`);
    }
  }

  /**
   * Ensures a value is within a valid range
   */
  static validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void {
    if (value < min || value > max) {
      throw new Error(
        `${fieldName} must be between ${min} and ${max}, got ${value}`
      );
    }
  }

  /**
   * Type guard to check if value is not null or undefined
   */
  static isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  /**
   * Validates an object's type structure
   */
  static validateObjectStructure<T extends object>(
    obj: unknown,
    validator: (obj: unknown) => obj is T
  ): T {
    if (!validator(obj)) {
      throw new Error("Invalid object structure");
    }
    return obj;
  }
}
