import { ExportType } from "./contextualSummaries.types";

export interface TypeDefinition {
  name: string;
  kind: TypeKind;
  complexity: "simple" | "moderate" | "complex";
  properties?: PropertyDefinition[];
  methods?: MethodDefinition[];
  generics?: string[];
  extends?: string[];
  implements?: string[];
  description?: string;
  isExported: boolean;
  exportType?: ExportType;
}

export interface PropertyDefinition {
  name: string;
  type: string;
  optional: boolean;
  readonly: boolean;
  description?: string;
}

export interface MethodDefinition {
  name: string;
  parameters: ParameterDefinition[];
  returnType: string;
  isAsync: boolean;
  description?: string;
}

export interface ParameterDefinition {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export type TypeKind =
  | "interface"
  | "type-alias"
  | "enum"
  | "class"
  | "function-type"
  | "union"
  | "intersection"
  | "generic";

export interface TypeContext {
  definitions: TypeDefinition[];
  imports: TypeImport[];
  exports: TypeExport[];
  relationships: TypeRelationship[];
  complexity: TypeComplexityMetrics;
}

export interface TypeImport {
  name: string;
  source: string;
  isTypeOnly: boolean;
}

export interface TypeExport {
  name: string;
  kind: TypeKind;
  isDefault: boolean;
  isTypeOnly: boolean;
}

export interface TypeRelationship {
  from: string;
  to: string;
  relationship: "extends" | "implements" | "uses" | "composes";
}

export interface TypeComplexityMetrics {
  totalTypes: number;
  averageComplexity: number;
  maxNestingLevel: number;
  genericUsage: number;
  unionTypes: number;
}
