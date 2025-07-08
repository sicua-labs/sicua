/**
 * Types and interfaces for accessibility analysis
 */

import { JSXStructure } from "../../../types";

export interface AccessibilityAnalysis {
  // Overview metrics for dashboard visualization
  summary: {
    totalViolations: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    componentsWithIssues: number;
    totalComponentsAnalyzed: number;
    overallScore: number; // 0-100 accessibility score
  };

  // Rule-based breakdown for analytics
  ruleViolations: {
    [ruleId: string]: {
      ruleName: string;
      severity: "error" | "warning" | "info";
      description: string;
      violationCount: number;
      affectedComponents: string[];
      wcagLevel?: "A" | "AA" | "AAA";
      wcagCriterion?: string; // e.g., "1.1.1"
    };
  };

  // Component-level details for deep-dive analysis
  componentViolations: {
    [componentName: string]: {
      componentPath: string;
      violationCount: number;
      accessibilityScore: number; // 0-100
      violations: AccessibilityViolation[];
    };
  };

  // Trends and patterns for insights
  patterns: {
    mostCommonViolations: Array<{
      ruleId: string;
      count: number;
      percentage: number;
    }>;
    violationsByDirectory: Record<string, number>;
    violationsBySeverity: Record<string, number>;
    wcagComplianceLevel: "A" | "AA" | "AAA" | "none";
  };
}

export interface AccessibilityViolation {
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  element: string; // JSX element type
  elementLocation?: {
    line?: number;
    column?: number;
  };
  context?: string; // Surrounding code context
}

export interface A11yRule {
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  wcagLevel?: "A" | "AA" | "AAA";
  wcagCriterion?: string;
  selector: ElementSelector;
  validator: (element: JSXElementInfo) => AccessibilityViolation | null;
}

export interface ElementSelector {
  tagName?: string;
  tagNames?: string[];
  hasProps?: string[];
  hasAnyProp?: string[];
  customMatcher?: (element: JSXElementInfo) => boolean;
}

export interface JSXElementInfo {
  tagName: string;
  props: Record<string, JSXPropValue>;
  children: JSXElementInfo[];
  textContent?: string;
  location?: {
    line?: number;
    column?: number;
  };
  context?: string;
}

export interface JSXPropValue {
  type: "string" | "number" | "boolean" | "expression" | "undefined";
  value: string | number | boolean | undefined;
  rawValue?: string; // Original expression text for complex values
}

export interface A11yRuleMatch {
  rule: A11yRule;
  element: JSXElementInfo;
}

export interface ComponentA11yInfo {
  componentName: string;
  componentPath: string;
  elements: JSXElementInfo[];
  violations: AccessibilityViolation[];
  accessibilityScore: number;
}

export interface A11yAnalysisContext {
  componentName: string;
  componentPath: string;
  content: string;
  jsxStructure?: JSXStructure;
}

// Specific violation types for better categorization
export type ViolationCategory =
  | "missing-alt-text"
  | "missing-labels"
  | "invalid-aria"
  | "semantic-structure"
  | "keyboard-navigation"
  | "color-contrast"
  | "focus-management"
  | "form-accessibility"
  | "interactive-elements";

export interface CategorizedViolation extends AccessibilityViolation {
  category: ViolationCategory;
  impact: "critical" | "serious" | "moderate" | "minor";
}

// WCAG compliance tracking
export interface WCAGCompliance {
  level: "A" | "AA" | "AAA" | "none";
  passedCriteria: string[];
  failedCriteria: string[];
  notApplicableCriteria: string[];
  complianceScore: number; // 0-100
}

// Rule configuration for customization
export interface A11yRuleConfig {
  enabled: boolean;
  severity?: "error" | "warning" | "info";
  options?: Record<string, unknown>;
}

export interface A11yAnalyzerConfig {
  rules: Record<string, A11yRuleConfig>;
  wcagLevel: "A" | "AA" | "AAA";
  includeWarnings: boolean;
  includeInfo: boolean;
}
