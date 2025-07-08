/**
 * Utility types and type guards
 */
import ts from "typescript";
import { ComponentRelation } from "./component.types";
import { FunctionData } from "./function.types";

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};

// Enum for file types
export enum FileType {
  JavaScript,
  TypeScript,
  JSX,
  TSX,
}

// Type guards
export function isComponentRelation(obj: any): obj is ComponentRelation {
  return (
    obj &&
    typeof obj.name === "string" &&
    Array.isArray(obj.usedBy) &&
    Array.isArray(obj.imports)
  );
}

export function isFunctionData(obj: any): obj is FunctionData {
  return (
    obj &&
    typeof obj.componentName === "string" &&
    typeof obj.functionName === "string" &&
    Array.isArray(obj.params)
  );
}

// Utility types for TypeScript parsing
export type NodeVisitor = (node: ts.Node) => void;
