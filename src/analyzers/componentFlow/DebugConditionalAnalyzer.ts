import * as fs from "fs";
import { JSXReturnAnalyzer } from "./scanners/JSXReturnAnalyzer";
import { ConditionalParser } from "./parsers/ConditionalParser";
import { parseFileToAST } from "./utils";
import { ComponentFlowNode, ConditionalRender } from "./types";

/**
 * Debug utility to analyze conditional rendering patterns and identify duplicates
 */
export class DebugConditionalAnalyzer {
  private jsxAnalyzer: JSXReturnAnalyzer;
  private conditionalParser: ConditionalParser;

  constructor() {
    this.jsxAnalyzer = new JSXReturnAnalyzer();
    this.conditionalParser = new ConditionalParser();
  }

  /**
   * Analyzes all conditionals in a file and logs detailed information
   */
  debugFileConditionals(filePath: string): void {
    console.log(`\n🔍 DEBUG ANALYSIS: ${filePath}`);
    console.log("=".repeat(80));

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const ast = parseFileToAST(content);

      if (!ast) {
        console.log("❌ Failed to parse AST");
        return;
      }

      // Get JSX returns from the file
      const jsxReturns = this.jsxAnalyzer.analyzeAST(ast, content);

      console.log(`📊 Found ${jsxReturns.length} JSX return statement(s)`);

      let totalConditionals = 0;
      const conditionFrequency = new Map<string, number>();

      jsxReturns.forEach((jsxReturn, returnIndex) => {
        console.log(`\n📝 JSX Return #${returnIndex + 1}:`);
        console.log(`   Has Conditional: ${jsxReturn.hasConditional}`);
        console.log(
          `   Position: Line ${jsxReturn.position.line}, Column ${jsxReturn.position.column}`
        );
        console.log(
          `   Component References: ${jsxReturn.componentReferences.length}`
        );

        if (jsxReturn.hasConditional) {
          console.log(
            `   Conditional Patterns: ${jsxReturn.conditionalPatterns.length}`
          );

          jsxReturn.conditionalPatterns.forEach((pattern, patternIndex) => {
            totalConditionals++;

            // Track frequency of each condition
            const count = conditionFrequency.get(pattern.condition) || 0;
            conditionFrequency.set(pattern.condition, count + 1);

            console.log(`\n   🎯 Pattern #${patternIndex + 1}:`);
            console.log(`      Type: ${pattern.type}`);
            console.log(`      Condition: "${pattern.condition}"`);
            console.log(
              `      Position: Line ${pattern.position.line}, Column ${pattern.position.column}`
            );
            console.log(
              `      True Branch Components: ${pattern.trueBranch.length}`
            );
            console.log(
              `      False Branch Components: ${
                pattern.falseBranch?.length || 0
              }`
            );

            // Show component names in branches
            if (pattern.trueBranch.length > 0) {
              const trueNames = pattern.trueBranch
                .map((comp) => comp.name)
                .join(", ");
              console.log(`      True Branch: [${trueNames}]`);
            }

            if (pattern.falseBranch && pattern.falseBranch.length > 0) {
              const falseNames = pattern.falseBranch
                .map((comp) => comp.name)
                .join(", ");
              console.log(`      False Branch: [${falseNames}]`);
            }
          });
        }
      });

      console.log(`\n📈 SUMMARY FOR ${filePath}:`);
      console.log(`   Total Conditional Patterns: ${totalConditionals}`);
      console.log(`   Unique Conditions: ${conditionFrequency.size}`);

      if (conditionFrequency.size > 0) {
        console.log(`\n🔄 CONDITION FREQUENCY:`);
        Array.from(conditionFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([condition, count]) => {
            const status = count > 1 ? "⚠️  DUPLICATE" : "✅ UNIQUE";
            console.log(`   ${status} "${condition}" appears ${count} time(s)`);
          });
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error);
    }
  }

  /**
   * Analyzes multiple files and shows global duplication patterns
   */
  debugMultipleFiles(filePaths: string[]): void {
    console.log(`\n🌍 GLOBAL CONDITIONAL ANALYSIS`);
    console.log("=".repeat(80));

    const globalConditionFrequency = new Map<
      string,
      { count: number; files: string[] }
    >();
    let globalTotal = 0;

    filePaths.forEach((filePath: string) => {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const ast = parseFileToAST(content);

        if (!ast) return;

        const jsxReturns = this.jsxAnalyzer.analyzeAST(ast, content);

        jsxReturns.forEach((jsxReturn) => {
          if (jsxReturn.hasConditional) {
            jsxReturn.conditionalPatterns.forEach((pattern) => {
              globalTotal++;

              const existing = globalConditionFrequency.get(
                pattern.condition
              ) || { count: 0, files: [] };
              existing.count++;
              if (!existing.files.includes(filePath)) {
                existing.files.push(filePath);
              }
              globalConditionFrequency.set(pattern.condition, existing);
            });
          }
        });
      } catch (error) {
        console.warn(`⚠️  Skipped ${filePath}: ${error}`);
      }
    });

    console.log(`\n📊 GLOBAL SUMMARY:`);
    console.log(`   Total Conditional Patterns Found: ${globalTotal}`);
    console.log(`   Unique Conditions: ${globalConditionFrequency.size}`);
    console.log(
      `   Expected Conditionals (if no duplicates): ${globalConditionFrequency.size}`
    );
    console.log(
      `   Duplication Factor: ${(
        globalTotal / globalConditionFrequency.size
      ).toFixed(2)}x`
    );

    console.log(`\n🔍 DETAILED BREAKDOWN:`);
    Array.from(globalConditionFrequency.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([condition, data]) => {
        const status = data.count > 1 ? "🚨 DUPLICATE" : "✅ UNIQUE";
        console.log(`\n   ${status} "${condition}"`);
        console.log(`     Appears: ${data.count} time(s)`);
        console.log(`     In files: ${data.files.length}`);

        if (data.count > 1) {
          data.files.forEach((file: string) => {
            const fileName = file.split(/[/\\]/).pop();
            console.log(`       - ${fileName}`);
          });
        }
      });
  }

  /**
   * Debug complete component flow analysis with proper typing
   */
  debugCompleteFlowAnalysis(appDirectory: string): void {
    console.log(`\n🌐 COMPLETE COMPONENT FLOW ANALYSIS DEBUG`);
    console.log("=".repeat(80));

    try {
      // Import the required modules dynamically to avoid type issues
      const RouteScanner = require("./scanners/RouteScanner").RouteScanner;
      const FlowTreeBuilder =
        require("./builders/FlowTreeBuilder").FlowTreeBuilder;

      const routeScanner = new RouteScanner(appDirectory);
      const routes: Array<{
        routePath: string;
        pageFilePath: string;
        segments: any[];
        metadata: any;
      }> = routeScanner.scanAllRoutes();

      console.log(`\n📋 Found ${routes.length} routes to analyze`);

      const flowTreeBuilder = new FlowTreeBuilder(
        appDirectory.replace("/app", ""),
        appDirectory.replace("/app", "/src"),
        appDirectory,
        [] // Empty components for debug
      );

      let globalConditionalCount = 0;
      const componentConditionalMap = new Map<string, number>();

      routes.forEach(
        (route: { routePath: string; pageFilePath: string }, index: number) => {
          console.log(`\n🔍 ANALYZING ROUTE ${index + 1}: ${route.routePath}`);
          console.log("-".repeat(50));

          try {
            const tree = flowTreeBuilder.buildRouteFlowTree(route);
            const routeConditionals =
              tree.componentStats.conditionalRenderCount;

            console.log(`📊 Route conditionals: ${routeConditionals}`);
            console.log(
              `🧮 Route components: ${tree.componentStats.totalComponents}`
            );

            globalConditionalCount += routeConditionals;

            // Track components and their conditionals
            this.debugComponentTree(
              tree.pageComponent,
              componentConditionalMap,
              0
            );
          } catch (error) {
            console.error(
              `❌ Error analyzing route ${route.routePath}:`,
              error
            );
          }
        }
      );

      console.log(`\n📈 FINAL SUMMARY:`);
      console.log(`   Total routes: ${routes.length}`);
      console.log(`   Global conditional count: ${globalConditionalCount}`);
      console.log(`   Expected (from debug): 13-20`);
      console.log(
        `   Multiplication factor: ${(globalConditionalCount / 15).toFixed(2)}x`
      );

      console.log(`\n🔍 COMPONENT BREAKDOWN:`);
      Array.from(componentConditionalMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([component, count]) => {
          if (count > 0) {
            console.log(`   ${component}: ${count} conditionals`);
          }
        });
    } catch (error) {
      console.error(`❌ Error in complete flow analysis:`, error);
    }
  }

  /**
   * Debug component tree recursively with proper typing
   */
  private debugComponentTree(
    component: ComponentFlowNode,
    componentMap: Map<string, number>,
    depth: number
  ): void {
    const indent = "  ".repeat(depth);
    const conditionalCount = component.conditionalRenders?.length || 0;

    console.log(
      `${indent}📦 ${component.componentName} (${conditionalCount} conditionals)`
    );

    // Track in map
    const existing = componentMap.get(component.componentName) || 0;
    componentMap.set(component.componentName, existing + conditionalCount);

    // Process conditional renders
    if (component.conditionalRenders) {
      component.conditionalRenders.forEach(
        (conditional: ConditionalRender, index: number) => {
          console.log(
            `${indent}  🎯 Conditional ${index + 1}: "${conditional.condition}"`
          );

          // True branch
          if (conditional.trueBranch) {
            conditional.trueBranch.forEach((child: ComponentFlowNode) => {
              this.debugComponentTree(child, componentMap, depth + 2);
            });
          }

          // False branch
          if (conditional.falseBranch) {
            conditional.falseBranch.forEach((child: ComponentFlowNode) => {
              this.debugComponentTree(child, componentMap, depth + 2);
            });
          }
        }
      );
    }

    // Process regular children
    if (component.children) {
      component.children.forEach((child: ComponentFlowNode) => {
        this.debugComponentTree(child, componentMap, depth + 1);
      });
    }
  }

  /**
   * Quick debug for specific test files
   */
  debugTestProject(appDirectory: string): void {
    const testFiles = [
      `${appDirectory}/page.tsx`, // Home page
      `${appDirectory}/blog/[...slug]/page.tsx`, // Blog page
      `${appDirectory}/dashboard/page.tsx`, // Dashboard
      `${appDirectory}/dashboard/analytics/page.tsx`, // Analytics
    ];

    console.log(`🧪 DEBUGGING TEST PROJECT CONDITIONALS`);
    console.log("=".repeat(80));

    // Analyze each file individually
    testFiles.forEach((file: string) => {
      if (fs.existsSync(file)) {
        this.debugFileConditionals(file);
      }
    });

    // Global analysis
    const existingFiles = testFiles.filter((file: string) =>
      fs.existsSync(file)
    );
    if (existingFiles.length > 0) {
      this.debugMultipleFiles(existingFiles);
    }

    // Now run the complete flow analysis
    this.debugCompleteFlowAnalysis(appDirectory);
  }
}

// Usage example:
// const debugger = new DebugConditionalAnalyzer();
// debugger.debugTestProject("/path/to/your/app");
// debugger.debugFileConditionals("/path/to/specific/file.tsx");
