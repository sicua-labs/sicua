/**
 * Main accessibility analyzer class that orchestrates the entire analysis process
 * Updated to work with enhanced ScanResult and project structure detection
 */

import { ComponentRelation, ScanResult } from "../../types";
import { A11Y_RULES } from "./rules/a11yRules";
import {
  ComponentA11yInfo,
  AccessibilityAnalysis,
  A11yAnalysisContext,
  AccessibilityViolation,
  JSXElementInfo,
} from "./types/accessibilityTypes";
import { JSXAnalysisUtils } from "./utils/jsxAnalysisUtils";
import { RuleValidators } from "./validators/ruleValidators";

export class AccessibilityAnalyzer {
  private scanResult: ScanResult;
  private components: ComponentRelation[];
  private componentA11yInfo: Map<string, ComponentA11yInfo> = new Map();

  constructor(scanResult: ScanResult, components: ComponentRelation[]) {
    this.scanResult = scanResult;
    this.components = components;
  }

  /**
   * Main analysis method that produces complete accessibility analysis
   */
  async analyze(): Promise<AccessibilityAnalysis> {
    // Process all components for accessibility issues
    await this.analyzeComponents();

    // Generate summary metrics
    const summary = this.generateSummary();

    // Generate rule-based breakdown
    const ruleViolations = this.generateRuleViolations();

    // Generate component-level details
    const componentViolations = this.generateComponentViolations();

    // Generate patterns and insights
    const patterns = this.generatePatterns();

    return {
      summary,
      ruleViolations,
      componentViolations,
      patterns,
    };
  }

  /**
   * Analyze all components for accessibility violations
   */
  private async analyzeComponents(): Promise<void> {
    for (const component of this.components) {
      const componentInfo = await this.analyzeComponent(component);
      this.componentA11yInfo.set(component.name, componentInfo);
    }
  }

  /**
   * Analyze a single component for accessibility issues using enhanced validators
   */
  private async analyzeComponent(
    component: ComponentRelation
  ): Promise<ComponentA11yInfo> {
    const context: A11yAnalysisContext = {
      componentName: component.name,
      componentPath: component.fullPath,
      content: component.content || "",
      jsxStructure: component.jsxStructure,
    };

    // Extract JSX elements from component using enhanced extraction
    const elements = JSXAnalysisUtils.extractJSXElements(
      component,
      this.scanResult
    );

    // Run enhanced individual element validations
    const violations: AccessibilityViolation[] = [];

    // Use enhanced validators directly for better context support
    this.runEnhancedValidations(elements, violations);

    // Run multi-element validations
    const multiElementViolations = this.runMultiElementValidations(elements);
    violations.push(...multiElementViolations);

    // Calculate component accessibility score
    const accessibilityScore = this.calculateComponentScore(
      elements,
      violations
    );

    return {
      componentName: component.name,
      componentPath: component.fullPath,
      elements,
      violations,
      accessibilityScore,
    };
  }

  /**
   * Run enhanced validations with proper context support
   */
  private runEnhancedValidations(
    elements: JSXElementInfo[],
    violations: AccessibilityViolation[]
  ): void {
    for (const element of elements) {
      // Image validations
      if (element.tagName === "img") {
        const violation = RuleValidators.validateImageAlt(element);
        if (violation) violations.push(violation);
      }

      // Input validations (with context)
      if (element.tagName === "input") {
        const violation = RuleValidators.validateInputLabel(element, elements);
        if (violation) violations.push(violation);
      }

      // Button validations
      if (element.tagName === "button") {
        const violation = RuleValidators.validateButtonText(element);
        if (violation) violations.push(violation);
      }

      // Link validations
      if (element.tagName === "a") {
        const violation = RuleValidators.validateLinkText(element);
        if (violation) violations.push(violation);
      }

      // ARIA role validations
      if (JSXAnalysisUtils.hasProp(element, "role")) {
        const violation = RuleValidators.validateAriaRole(element);
        if (violation) violations.push(violation);
      }

      // Interactive role validations
      const hasInteractiveHandlers = [
        "onClick",
        "onPress",
        "onTap",
        "onKeyDown",
        "onKeyPress",
        "onKeyUp",
      ].some((handler) => JSXAnalysisUtils.hasProp(element, handler));

      if (hasInteractiveHandlers) {
        const violation = RuleValidators.validateInteractiveRole(element);
        if (violation) violations.push(violation);
      }

      // ARIA attributes validations
      const hasAriaProps = Object.keys(element.props).some((prop) =>
        prop.startsWith("aria-")
      );
      if (hasAriaProps) {
        const violation = RuleValidators.validateAriaAttributes(element);
        if (violation) violations.push(violation);
      }

      // Form structure validations
      if (element.tagName === "fieldset") {
        const violation = RuleValidators.validateFormStructure(element);
        if (violation) violations.push(violation);
      }

      // HTML lang validation
      if (element.tagName === "html") {
        const violation = RuleValidators.validateLangAttribute(element);
        if (violation) violations.push(violation);
      }
    }
  }

  /**
   * Run validations that require multiple elements
   */
  private runMultiElementValidations(
    elements: JSXElementInfo[]
  ): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    // Heading hierarchy validation
    const headingViolations = RuleValidators.validateHeadingHierarchy(elements);
    violations.push(...headingViolations);

    // Unique ID validation
    const idViolations = RuleValidators.validateUniqueIds(elements);
    violations.push(...idViolations);

    return violations;
  }

  /**
   * Calculate accessibility score for a component (0-100)
   */
  private calculateComponentScore(
    elements: JSXElementInfo[],
    violations: AccessibilityViolation[]
  ): number {
    if (elements.length === 0) {
      return 100; // No elements, no issues
    }

    // Weight violations by severity
    const severityWeights = {
      error: 10,
      warning: 5,
      info: 1,
    };

    const totalPenalty = violations.reduce((penalty, violation) => {
      return penalty + severityWeights[violation.severity];
    }, 0);

    // Calculate base score (elements without violations get full points)
    const elementsWithViolations = new Set(
      violations.map((v) => `${v.element}-${v.elementLocation?.line || 0}`)
    ).size;

    const cleanElements = elements.length - elementsWithViolations;
    const baseScore =
      elements.length > 0 ? (cleanElements / elements.length) * 100 : 100;

    // Apply penalty reduction
    const penaltyReduction = Math.min(totalPenalty * 2, 50); // Cap penalty at 50 points

    return Math.max(0, Math.round(baseScore - penaltyReduction));
  }

  /**
   * Generate summary metrics for the analysis
   */
  private generateSummary(): AccessibilityAnalysis["summary"] {
    const allViolations = this.getAllViolations();
    const componentInfos = Array.from(this.componentA11yInfo.values());

    const errorCount = allViolations.filter(
      (v) => v.severity === "error"
    ).length;
    const warningCount = allViolations.filter(
      (v) => v.severity === "warning"
    ).length;
    const infoCount = allViolations.filter((v) => v.severity === "info").length;

    const componentsWithIssues = componentInfos.filter(
      (info) => info.violations.length > 0
    ).length;
    const totalComponentsAnalyzed = componentInfos.length;

    // Calculate overall score as weighted average
    const totalScore = componentInfos.reduce(
      (sum, info) => sum + info.accessibilityScore,
      0
    );
    const overallScore =
      totalComponentsAnalyzed > 0
        ? Math.round(totalScore / totalComponentsAnalyzed)
        : 100;

    return {
      totalViolations: allViolations.length,
      errorCount,
      warningCount,
      infoCount,
      componentsWithIssues,
      totalComponentsAnalyzed,
      overallScore,
    };
  }

  /**
   * Generate rule-based breakdown of violations
   */
  private generateRuleViolations(): AccessibilityAnalysis["ruleViolations"] {
    const ruleViolations: AccessibilityAnalysis["ruleViolations"] = {};
    const allViolations = this.getAllViolations();

    // Group violations by rule ID
    const violationsByRule = new Map<string, AccessibilityViolation[]>();
    for (const violation of allViolations) {
      if (!violationsByRule.has(violation.ruleId)) {
        violationsByRule.set(violation.ruleId, []);
      }
      violationsByRule.get(violation.ruleId)!.push(violation);
    }

    // Build rule violation summary
    for (const [ruleId, violations] of violationsByRule) {
      const rule = A11Y_RULES[ruleId];
      if (!rule) continue;

      const affectedComponents = new Set(
        violations.map((v) => this.getComponentNameForViolation(v))
      );

      ruleViolations[ruleId] = {
        ruleName: rule.name,
        severity: rule.severity,
        description: rule.description,
        violationCount: violations.length,
        affectedComponents: Array.from(affectedComponents),
        wcagLevel: rule.wcagLevel,
        wcagCriterion: rule.wcagCriterion,
      };
    }

    return ruleViolations;
  }

  /**
   * Generate component-level violation details
   */
  private generateComponentViolations(): AccessibilityAnalysis["componentViolations"] {
    const componentViolations: AccessibilityAnalysis["componentViolations"] =
      {};

    for (const [componentName, info] of this.componentA11yInfo) {
      if (info.violations.length > 0) {
        componentViolations[componentName] = {
          componentPath: info.componentPath,
          violationCount: info.violations.length,
          accessibilityScore: info.accessibilityScore,
          violations: info.violations,
        };
      }
    }

    return componentViolations;
  }

  /**
   * Generate patterns and insights from the analysis
   */
  private generatePatterns(): AccessibilityAnalysis["patterns"] {
    const allViolations = this.getAllViolations();

    // Most common violations
    const violationCounts = new Map<string, number>();
    for (const violation of allViolations) {
      violationCounts.set(
        violation.ruleId,
        (violationCounts.get(violation.ruleId) || 0) + 1
      );
    }

    const mostCommonViolations = Array.from(violationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ruleId, count]) => ({
        ruleId,
        count,
        percentage: Math.round((count / allViolations.length) * 100),
      }));

    // Violations by directory
    const violationsByDirectory: Record<string, number> = {};
    for (const [componentName, info] of this.componentA11yInfo) {
      const directory = this.getDirectoryFromPath(info.componentPath);
      violationsByDirectory[directory] =
        (violationsByDirectory[directory] || 0) + info.violations.length;
    }

    // Violations by severity
    const violationsBySeverity = {
      error: allViolations.filter((v) => v.severity === "error").length,
      warning: allViolations.filter((v) => v.severity === "warning").length,
      info: allViolations.filter((v) => v.severity === "info").length,
    };

    // WCAG compliance level assessment
    const wcagComplianceLevel = this.assessWCAGCompliance(allViolations);

    return {
      mostCommonViolations,
      violationsByDirectory,
      violationsBySeverity,
      wcagComplianceLevel,
    };
  }

  /**
   * Get all violations from all components
   */
  private getAllViolations(): AccessibilityViolation[] {
    const allViolations: AccessibilityViolation[] = [];

    for (const info of this.componentA11yInfo.values()) {
      allViolations.push(...info.violations);
    }

    return allViolations;
  }

  /**
   * Get component name for a violation (for tracking purposes)
   */
  private getComponentNameForViolation(
    violation: AccessibilityViolation
  ): string {
    // Find component that contains this violation
    for (const [componentName, info] of this.componentA11yInfo) {
      if (info.violations.includes(violation)) {
        return componentName;
      }
    }
    return "unknown";
  }

  /**
   * Extract directory from file path
   */
  private getDirectoryFromPath(filePath: string): string {
    const parts = filePath.split("/");
    return parts.slice(0, -1).join("/") || "/";
  }

  /**
   * Assess WCAG compliance level based on violations
   */
  private assessWCAGCompliance(
    violations: AccessibilityViolation[]
  ): "A" | "AA" | "AAA" | "none" {
    const errorViolations = violations.filter((v) => v.severity === "error");

    if (errorViolations.length === 0) {
      // Check for AA level compliance
      const aaViolations = violations.filter((v) => {
        const rule = A11Y_RULES[v.ruleId];
        return rule && rule.wcagLevel === "AA" && v.severity === "warning";
      });

      if (aaViolations.length === 0) {
        return "AAA"; // No errors or AA warnings
      }
      return "AA"; // No errors but has AA warnings
    }

    // Check if only AA/AAA level errors exist
    const aLevelErrors = errorViolations.filter((v) => {
      const rule = A11Y_RULES[v.ruleId];
      return rule && rule.wcagLevel === "A";
    });

    if (aLevelErrors.length === 0) {
      return "A"; // No A-level errors
    }

    return "none"; // Has A-level errors
  }

  /**
   * Get detailed component information for a specific component
   */
  getComponentInfo(componentName: string): ComponentA11yInfo | undefined {
    return this.componentA11yInfo.get(componentName);
  }

  /**
   * Get violations for a specific rule across all components
   */
  getViolationsForRule(ruleId: string): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    for (const info of this.componentA11yInfo.values()) {
      const ruleViolations = info.violations.filter((v) => v.ruleId === ruleId);
      violations.push(...ruleViolations);
    }

    return violations;
  }

  /**
   * Get components that have no accessibility violations
   */
  getCleanComponents(): string[] {
    const cleanComponents: string[] = [];

    for (const [componentName, info] of this.componentA11yInfo) {
      if (info.violations.length === 0) {
        cleanComponents.push(componentName);
      }
    }

    return cleanComponents;
  }
}
