/**
 * Types for state flow analysis
 */

export interface StateFlowNode {
  type: "declaration" | "update" | "usage" | "render";
  component: string;
  stateName: string;
  location: {
    line: number;
    column: number;
  };
  conditions: string[];
  updateType?: "setState" | "reducer" | "context" | "store";
  storeType?: "context" | "redux" | "zustand" | "recoil" | "jotai" | "mobx";
  dependentStates?: string[];
}

export interface StateFlow {
  name: string;
  varName: string;
  initialValue: string;
  flows: StateFlowNode[];
  components: Set<string>;
  conditionalPaths: {
    condition: string;
    components: string[];
    dependentStates: string[];
  }[];
  storeInfo?: {
    type: "context" | "redux" | "zustand" | "recoil" | "jotai" | "mobx";
    scope: "global" | "provider";
    provider?: string;
    selector?: string;
  };
}

export interface StoreDefinition {
  type: "context" | "redux" | "zustand" | "recoil" | "jotai" | "mobx";
  name: string;
  initialState: { [key: string]: any };
  actions?: { [key: string]: string[] };
  selectors?: { [key: string]: string[] };
}

// FLOW ANALYZER
export interface StateUsageInfo {
  type: "reference" | "jsx" | "event";
  location: { line: number; column: number };
  component: string;
  conditions: string[];
}

export interface StateModification {
  type: "set" | "toggle" | "increment" | "merge" | "reset";
  stateName: string;
  component: string;
  location: { line: number; column: number };
  modificationPattern: string;
  dependentStates: string[];
  conditions: string[];
}

export interface StateUpdatePath {
  stateName: string;
  path: {
    component: string;
    type: "producer" | "consumer";
    usage: StateUsageInfo | StateModification;
  }[];
  dependencies: string[];
}

export interface ConditionAnalysis {
  condition: string;
  stateVariables: string[];
  complexity: number;
  location: { line: number; column: number };
  isReachable: boolean;
}

export interface ConditionalBranch {
  condition: string;
  states: {
    read: string[];
    modified: string[];
  };
  components: string[];
  parentConditions: string[];
}

export interface ConditionalDependency {
  sourceCondition: string;
  dependentCondition: string;
  sharedStates: string[];
  type: "mutuallyExclusive" | "dependent" | "independent";
}

export interface StatePropagation {
  stateName: string;
  source: {
    component: string;
    location: { line: number; column: number };
  };
  propagationPath: {
    component: string;
    type: "prop" | "context" | "store";
    depth: number;
  }[];
  affects: string[]; // affected components
}

export interface StateLifecycle {
  stateName: string;
  declarations: {
    component: string;
    location: { line: number; column: number };
  }[];
  updates: {
    component: string;
    type: "set" | "dependency" | "derived";
    location: { line: number; column: number };
  }[];
  usages: {
    component: string;
    type: "render" | "computation" | "condition";
    location: { line: number; column: number };
  }[];
}

export interface StateFlowPath {
  source: string;
  target: string;
  path: {
    component: string;
    type: "prop" | "context" | "store" | "hook";
    direction: "up" | "down" | "lateral";
  }[];
  distance: number;
}

export interface StateCollision {
  stateName: string;
  collisions: {
    components: string[];
    type: "concurrent" | "race" | "override";
    location: { line: number; column: number };
  }[];
  severity: "high" | "medium" | "low";
}

export type ReduxStoreDefinition = {
  type: "redux";
  name: string;
  initialState: any;
  actions: { [key: string]: string[] };
  selectors?: { [key: string]: string[] };
};

export type ContextStoreDefinition = {
  type: "context";
  name: string;
  initialState: any;
  actions: { [key: string]: string[] };
};

export type ZustandStoreDefinition = {
  type: "zustand";
  name: string;
  initialState: any;
  actions: { [key: string]: string[] };
};
