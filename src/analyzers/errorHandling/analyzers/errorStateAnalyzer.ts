import ts from "typescript";
import {
  ErrorState,
  ErrorStateUsage,
} from "../../../types/errorHandling.types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { ErrorPatternUtils } from "../../../utils/error_specific/errorPatternUtils";
import { StateAnalysisUtils } from "../../../utils/common/stateAnalysisUtils";
import { traverseAST } from "../../../utils/ast/traversal";
import { ErrorStatesMap } from "../types/internalTypes";

/**
 * Enhanced analyzer for error state management in React components
 */
export class ErrorStateAnalyzer {
  private sourceFile: ts.SourceFile;
  private imports: Map<string, string> = new Map();

  constructor(sourceFile: ts.SourceFile) {
    this.sourceFile = sourceFile;
    this.analyzeImports();
  }

  /**
   * Analyze import statements to understand state management libraries
   */
  private analyzeImports(): void {
    traverseAST(this.sourceFile, (node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const moduleName = node.moduleSpecifier.text;

        if (
          node.importClause?.namedBindings &&
          ts.isNamedImports(node.importClause.namedBindings)
        ) {
          node.importClause.namedBindings.elements.forEach((element) => {
            this.imports.set(element.name.text, moduleName);
          });
        }

        if (node.importClause?.name) {
          this.imports.set(node.importClause.name.text, moduleName);
        }
      }
    });
  }

  /**
   * Analyze a useState hook call for potential error states
   */
  public analyzeErrorState(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    try {
      const parent = node.parent;
      if (!parent) return;

      // Handle different patterns of useState declarations
      if (ts.isVariableDeclaration(parent)) {
        // [state, setState] = useState() pattern
        if (ASTUtils.safeIsArrayBindingPattern(parent.name)) {
          const [stateName, setterName] = this.extractStateNames(parent);
          if (stateName && ErrorPatternUtils.isErrorRelatedName(stateName)) {
            const location = ASTUtils.getNodeLocation(node, this.sourceFile);
            if (location) {
              errorStates.set(stateName, {
                setter: setterName,
                location,
                initialValue: this.extractInitialValue(node.arguments[0]),
              });
            }
          }
        }
      } else if (ts.isArrayLiteralExpression(parent)) {
        // Direct array destructuring pattern
        const elements = parent.elements;
        if (elements.length >= 2) {
          const stateName = ASTUtils.safeGetNodeText(elements[0]);
          const setterName = ASTUtils.safeGetNodeText(elements[1]);
          if (stateName && ErrorPatternUtils.isErrorRelatedName(stateName)) {
            const location = ASTUtils.getNodeLocation(node, this.sourceFile);
            if (location) {
              errorStates.set(stateName, {
                setter: setterName,
                location,
                initialValue: this.extractInitialValue(node.arguments[0]),
              });
            }
          }
        }
      }
    } catch (error) {
      // Silently continue
    }
  }

  /**
   * Analyze useReducer hooks for error state patterns
   */
  public analyzeReducerErrorState(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    try {
      const parent = node.parent;
      if (!parent || !ts.isVariableDeclaration(parent)) return;

      if (ASTUtils.safeIsArrayBindingPattern(parent.name)) {
        const [stateName, dispatchName] = this.extractStateNames(parent);

        // Check if reducer handles error actions
        const reducerArg = node.arguments[0];
        if (reducerArg && this.hasErrorHandlingInReducer(reducerArg)) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            errorStates.set(`${stateName}.error`, {
              setter: dispatchName,
              location,
              initialValue: this.extractInitialValue(node.arguments[1]),
            });
          }
        }
      }
    } catch (error) {
      // Silently continue
    }
  }

  /**
   * Analyze React Context for error state patterns
   */
  public analyzeContextErrorState(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    try {
      const callText = node.expression.getText();

      // useContext patterns
      if (callText === "useContext" && node.arguments.length > 0) {
        const contextArg = node.arguments[0];
        const contextName = contextArg.getText();

        // Look for error-related context names
        if (ErrorPatternUtils.isErrorRelatedName(contextName)) {
          const parent = node.parent;
          if (
            parent &&
            ts.isVariableDeclaration(parent) &&
            ts.isIdentifier(parent.name)
          ) {
            const location = ASTUtils.getNodeLocation(node, this.sourceFile);
            if (location) {
              errorStates.set(parent.name.text, {
                setter: `set${this.capitalize(parent.name.text)}`,
                location,
                initialValue: "context",
              });
            }
          }
        }
      }

      // Context provider patterns
      if (
        ts.isJsxElement(node.parent) &&
        this.isErrorContextProvider(node.parent)
      ) {
        this.analyzeContextProviderErrorState(node.parent, errorStates);
      }
    } catch (error) {
      // Silently continue
    }
  }

  /**
   * Analyze state management library patterns (Redux, Zustand, Jotai)
   */
  public analyzeStateLibraryErrorState(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    try {
      const callText = node.expression.getText();

      // Redux patterns
      if (this.isReduxSelector(node)) {
        this.analyzeReduxErrorSelector(node, errorStates);
      }

      // Zustand patterns
      if (this.isZustandStore(node)) {
        this.analyzeZustandErrorState(node, errorStates);
      }

      // Jotai patterns
      if (this.isJotaiAtom(node)) {
        this.analyzeJotaiErrorAtom(node, errorStates);
      }

      // React Query error states
      if (this.isReactQueryHook(node)) {
        this.analyzeReactQueryErrorState(node, errorStates);
      }

      // SWR error states
      if (this.isSWRHook(node)) {
        this.analyzeSWRErrorState(node, errorStates);
      }
    } catch (error) {
      // Silently continue
    }
  }

  /**
   * Find all error states in a component node
   */
  public findErrorStates(componentNode: ts.Node): ErrorStatesMap {
    const errorStates: ErrorStatesMap = new Map();

    traverseAST(componentNode, (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const hookName = node.expression.text;

        // Standard useState patterns
        if (hookName === "useState") {
          this.analyzeErrorState(node, errorStates);
        }

        // useReducer patterns
        if (hookName === "useReducer") {
          this.analyzeReducerErrorState(node, errorStates);
        }

        // Context patterns
        if (hookName === "useContext") {
          this.analyzeContextErrorState(node, errorStates);
        }

        // State management library patterns
        this.analyzeStateLibraryErrorState(node, errorStates);
      }
    });

    return errorStates;
  }

  /**
   * Process error state map into array of ErrorState objects with usage info
   */
  public processErrorStates(errorStates: ErrorStatesMap): ErrorState[] {
    return Array.from(errorStates.entries()).map(([name, info]) => ({
      name,
      setter: info.setter,
      location: info.location,
      initialValue: info.initialValue,
      usage: this.analyzeStateUsage(name, info.setter),
    }));
  }

  /**
   * Enhanced analysis of how an error state is used throughout a component
   */
  private analyzeStateUsage(
    stateName: string,
    setter: string
  ): ErrorStateUsage {
    const usage: ErrorStateUsage = {
      inRender: false,
      inEffects: false,
      inEvents: false,
      setterLocations: [],
    };

    try {
      traverseAST(this.sourceFile, (node) => {
        try {
          if (ts.isIdentifier(node)) {
            const text = ASTUtils.safeGetNodeText(node);
            if (text === stateName) {
              const scope = this.determineAdvancedScope(node);
              if (scope === "render") usage.inRender = true;
              if (scope === "effect") usage.inEffects = true;
              if (scope === "event") usage.inEvents = true;
            } else if (text === setter) {
              const location = ASTUtils.getNodeLocation(node, this.sourceFile);
              if (location) {
                usage.setterLocations.push(location);
              }
            }
          }
        } catch (error) {
          // Silently continue
        }
      });
    } catch (error) {
      // Silently continue
    }

    return usage;
  }

  /**
   * Enhanced scope determination with more patterns
   */
  private determineAdvancedScope(
    node: ts.Node
  ): "render" | "effect" | "event" | "other" {
    let current: ts.Node | undefined = node;
    while (current) {
      // JSX patterns
      if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
        return "render";
      }

      // Hook patterns
      if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
        const hookName = current.expression.text;
        if (
          hookName.startsWith("use") &&
          (hookName.includes("Effect") || hookName === "useLayoutEffect")
        ) {
          return "effect";
        }
      }

      // Event handler patterns
      if (ASTUtils.isEventHandler(current)) {
        return "event";
      }

      // Callback patterns
      if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
        const callName = current.expression.text;
        if (callName === "useCallback" || callName === "useMemo") {
          return "other";
        }
      }

      current = current.parent;
    }
    return "other";
  }

  /**
   * Extract state names from destructuring patterns
   */
  private extractStateNames(
    declaration: ts.VariableDeclaration
  ): [string, string] {
    try {
      if (!ASTUtils.safeIsArrayBindingPattern(declaration.name)) {
        return ["", ""];
      }

      const elements = declaration.name.elements;
      if (elements.length < 2) return ["", ""];

      const getName = (element: ts.ArrayBindingElement): string => {
        try {
          if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
            return ASTUtils.safeGetNodeText(element.name);
          }
        } catch {
          // Handle any potential errors in accessing node properties
        }
        return "";
      };

      return [getName(elements[0]), getName(elements[1])];
    } catch {
      return ["", ""];
    }
  }

  /**
   * Extract initial value from node with better type handling
   */
  private extractInitialValue(node: ts.Expression | undefined): unknown {
    if (!node) return null;

    try {
      if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        return node.text;
      }
      if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
      if (node.kind === ts.SyntaxKind.NullKeyword) return null;
      if (node.kind === ts.SyntaxKind.UndefinedKeyword) return undefined;

      return ASTUtils.safeGetNodeText(node);
    } catch {
      return null;
    }
  }

  /**
   * Check if reducer handles error actions
   */
  private hasErrorHandlingInReducer(reducerNode: ts.Expression): boolean {
    let hasErrorHandling = false;

    traverseAST(reducerNode, (node) => {
      // Switch case patterns
      if (ts.isCaseClause(node) && ts.isStringLiteral(node.expression)) {
        const caseValue = node.expression.text;
        if (ErrorPatternUtils.isErrorRelatedName(caseValue)) {
          hasErrorHandling = true;
        }
      }

      // Action type patterns
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.text === "type" &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "action"
      ) {
        hasErrorHandling = true;
      }
    });

    return hasErrorHandling;
  }

  /**
   * Check if JSX element is an error context provider
   */
  private isErrorContextProvider(element: ts.JsxElement): boolean {
    const tagName = element.openingElement.tagName.getText();
    return (
      ErrorPatternUtils.isErrorRelatedName(tagName) &&
      tagName.includes("Provider")
    );
  }

  /**
   * Analyze context provider for error state
   */
  private analyzeContextProviderErrorState(
    element: ts.JsxElement,
    errorStates: ErrorStatesMap
  ): void {
    // Analyze provider value prop for error state
    const attributes = element.openingElement.attributes.properties;
    attributes.forEach((attr) => {
      if (
        ts.isJsxAttribute(attr) &&
        ts.isIdentifier(attr.name) &&
        attr.name.text === "value" &&
        attr.initializer &&
        ts.isJsxExpression(attr.initializer)
      ) {
        const valueExpr = attr.initializer.expression;
        if (valueExpr && ts.isObjectLiteralExpression(valueExpr)) {
          valueExpr.properties.forEach((prop) => {
            if (
              ts.isPropertyAssignment(prop) &&
              ts.isIdentifier(prop.name) &&
              ErrorPatternUtils.isErrorRelatedName(prop.name.text)
            ) {
              const location = ASTUtils.getNodeLocation(
                element,
                this.sourceFile
              );
              if (location) {
                errorStates.set(prop.name.text, {
                  setter: `set${this.capitalize(prop.name.text)}`,
                  location,
                  initialValue: "context",
                });
              }
            }
          });
        }
      }
    });
  }

  /**
   * Check if call is Redux selector
   */
  private isReduxSelector(node: ts.CallExpression): boolean {
    const callText = node.expression.getText();
    return callText === "useSelector" && this.imports.has("useSelector");
  }

  /**
   * Analyze Redux error selector
   */
  private analyzeReduxErrorSelector(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    if (node.arguments.length > 0) {
      const selectorArg = node.arguments[0];
      const errorStates_found =
        StateAnalysisUtils.findStatesInSelector(selectorArg);

      errorStates_found.forEach((statePath) => {
        if (ErrorPatternUtils.isErrorRelatedName(statePath)) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            errorStates.set(statePath, {
              setter: "dispatch",
              location,
              initialValue: "redux",
            });
          }
        }
      });
    }
  }

  /**
   * Check if call is Zustand store
   */
  private isZustandStore(node: ts.CallExpression): boolean {
    const callText = node.expression.getText();
    return (
      (callText.includes("useStore") || callText.includes("use")) &&
      this.imports.has("zustand")
    );
  }

  /**
   * Analyze Zustand error state
   */
  private analyzeZustandErrorState(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    // Zustand selector patterns
    if (node.arguments.length > 0) {
      const selectorArg = node.arguments[0];
      traverseAST(selectorArg, (selectorNode) => {
        if (
          ts.isPropertyAccessExpression(selectorNode) &&
          ErrorPatternUtils.isErrorRelatedName(selectorNode.name.text)
        ) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            errorStates.set(selectorNode.name.text, {
              setter: "set",
              location,
              initialValue: "zustand",
            });
          }
        }
      });
    }
  }

  /**
   * Check if call is Jotai atom
   */
  private isJotaiAtom(node: ts.CallExpression): boolean {
    const callText = node.expression.getText();
    return (
      (callText === "useAtom" || callText === "useAtomValue") &&
      this.imports.has("jotai")
    );
  }

  /**
   * Analyze Jotai error atom
   */
  private analyzeJotaiErrorAtom(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    if (node.arguments.length > 0) {
      const atomArg = node.arguments[0];
      const atomName = atomArg.getText();

      if (ErrorPatternUtils.isErrorRelatedName(atomName)) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          errorStates.set(atomName, {
            setter: "setAtom",
            location,
            initialValue: "jotai",
          });
        }
      }
    }
  }

  /**
   * Check if call is React Query hook
   */
  private isReactQueryHook(node: ts.CallExpression): boolean {
    const callText = node.expression.getText();
    const reactQueryHooks = ["useQuery", "useMutation", "useInfiniteQuery"];
    return (
      reactQueryHooks.includes(callText) &&
      (this.imports.has("@tanstack/react-query") ||
        this.imports.has("react-query"))
    );
  }

  /**
   * Analyze React Query error state
   */
  private analyzeReactQueryErrorState(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    const parent = node.parent;
    if (parent && ts.isVariableDeclaration(parent)) {
      // Destructured pattern: const { data, error, isLoading } = useQuery(...)
      if (ts.isObjectBindingPattern(parent.name)) {
        parent.name.elements.forEach((element) => {
          if (
            ts.isBindingElement(element) &&
            ts.isIdentifier(element.name) &&
            element.name.text === "error"
          ) {
            const location = ASTUtils.getNodeLocation(node, this.sourceFile);
            if (location) {
              errorStates.set("error", {
                setter: "refetch",
                location,
                initialValue: "react-query",
              });
            }
          }
        });
      }
    }
  }

  /**
   * Check if call is SWR hook
   */
  private isSWRHook(node: ts.CallExpression): boolean {
    const callText = node.expression.getText();
    return callText === "useSWR" && this.imports.has("swr");
  }

  /**
   * Analyze SWR error state
   */
  private analyzeSWRErrorState(
    node: ts.CallExpression,
    errorStates: ErrorStatesMap
  ): void {
    const parent = node.parent;
    if (parent && ts.isVariableDeclaration(parent)) {
      // Destructured pattern: const { data, error, mutate } = useSWR(...)
      if (ts.isObjectBindingPattern(parent.name)) {
        parent.name.elements.forEach((element) => {
          if (
            ts.isBindingElement(element) &&
            ts.isIdentifier(element.name) &&
            element.name.text === "error"
          ) {
            const location = ASTUtils.getNodeLocation(node, this.sourceFile);
            if (location) {
              errorStates.set("error", {
                setter: "mutate",
                location,
                initialValue: "swr",
              });
            }
          }
        });
      }
    }
  }

  /**
   * Capitalize first letter of string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
