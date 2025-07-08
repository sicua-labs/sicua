import ts from "typescript";
import {
  ErrorBoundary,
  FallbackElement,
  ErrorHandlingLocation,
} from "../../../types/errorHandling.types";
import { replacer } from "../../../utils/common/analysisUtils";

/**
 * Types for serialized versions of complex objects
 */
export interface SerializableErrorBoundary {
  library: {
    name: string;
    source: string;
    type: string;
    features: string[];
    importPath: string;
  };
  props: Record<string, any>;
  location: ErrorHandlingLocation;
}

export interface SerializableFallbackElement {
  element: string;
  condition?: string;
  relatedErrorStates: string[];
  location: ErrorHandlingLocation;
}

/**
 * Utilities for serializing error handling analysis objects
 */
export class SerializationUtils {
  /**
   * Serializes a fallback element for JSON output
   */
  public static serializeFallbackElement(
    element: FallbackElement
  ): SerializableFallbackElement {
    return {
      element: element.element.getText(),
      condition: element.condition?.getText(),
      relatedErrorStates: element.relatedErrorStates,
      location: element.location,
    };
  }

  /**
   * Serializes an error boundary for JSON output
   */
  public static serializeErrorBoundary(
    boundary: ErrorBoundary
  ): SerializableErrorBoundary {
    return {
      library: {
        ...boundary.library,
        features: Array.from(boundary.library.features),
      },
      props: boundary.props,
      location: boundary.location,
    };
  }

  /**
   * Verifies that an object can be serialized to JSON
   * @throws Error if the object contains circular references
   */
  public static verifySerializable(object: any): void {
    try {
      JSON.stringify(object, replacer);
    } catch (error) {
      throw new Error(
        "Analysis result contains circular references that cannot be serialized to JSON"
      );
    }
  }
}
