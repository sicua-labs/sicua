import ts from "typescript";
import {
  TryCatchBlock,
  ErrorStateUpdate,
} from "../../../types/errorHandling.types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { ErrorPatternUtils } from "../../../utils/error_specific/errorPatternUtils";
import { traverseAST } from "../../../utils/ast/traversal";
import { NodeTypeGuards } from "../../../utils/ast/nodeTypeGuards";
import { IConfigManager } from "../../../types";
import * as path from "path";
import { ConfigManager } from "../../../core/configManager";

/**
 * Enhanced analyzer for try-catch blocks in React components with project structure awareness
 */
export class TryBlockAnalyzer {
  private sourceFile: ts.SourceFile;
  private config: IConfigManager;

  constructor(sourceFile: ts.SourceFile, config?: IConfigManager) {
    this.sourceFile = sourceFile;
    this.config = config || new ConfigManager(process.cwd());
  }

  /**
   * Enhanced analysis of try-catch block to extract comprehensive error handling patterns
   */
  public analyzeTryCatchBlock(
    node: ts.TryStatement
  ): TryCatchBlock | undefined {
    const location = ASTUtils.getNodeLocation(node, this.sourceFile);
    if (!location) return undefined;

    const scope = this.determineEnhancedTryCatchScope(node);
    const catchClause = node.catchClause;
    if (!catchClause) return undefined;

    return {
      location,
      scope,
      hasFallbackRender: this.detectEnhancedFallbackRender(catchClause),
      errorStateUpdates: this.extractEnhancedErrorStateUpdates(catchClause),
      hasErrorLogging: this.hasEnhancedErrorLogging(catchClause),
    };
  }

  /**
   * Enhanced scope determination with Next.js patterns and more React patterns
   */
  private determineEnhancedTryCatchScope(
    node: ts.TryStatement
  ): TryCatchBlock["scope"] {
    let current: ts.Node | undefined = node;
    const projectStructure = this.config.getProjectStructure();

    while (current) {
      // JSX rendering context
      if (
        ts.isJsxElement(current) ||
        ts.isJsxSelfClosingElement(current) ||
        ts.isJsxExpression(current)
      ) {
        return "render";
      }

      // React hooks context
      if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
        const hookName = current.expression.text;

        // Effect hooks
        if (
          hookName === "useEffect" ||
          hookName === "useLayoutEffect" ||
          hookName === "useInsertionEffect"
        ) {
          return "effect";
        }

        // Callback hooks that might contain event handlers
        if (hookName === "useCallback" || hookName === "useMemo") {
          return this.isEventHandlerContext(current) ? "event" : "other";
        }

        // Custom hooks
        if (
          hookName.startsWith("use") &&
          hookName[3] &&
          hookName[3] === hookName[3].toUpperCase()
        ) {
          return "effect";
        }

        // Next.js specific hooks
        if (projectStructure?.projectType === "nextjs") {
          const nextjsHooks = [
            "useRouter",
            "useSearchParams",
            "usePathname",
            "useParams",
            "useSelectedLayoutSegment",
            "useSelectedLayoutSegments",
            "useFormState",
            "useFormStatus",
          ];

          if (nextjsHooks.includes(hookName)) {
            return "effect";
          }
        }
      }

      // Event handler patterns
      if (this.isEnhancedEventHandler(current)) {
        return "event";
      }

      // Function component render
      if (this.isComponentRenderFunction(current)) {
        return "render";
      }

      // Class component methods
      if (ts.isMethodDeclaration(current)) {
        const methodName = current.name?.getText();
        if (methodName === "render") {
          return "render";
        }
        if (methodName?.startsWith("handle") || methodName?.startsWith("on")) {
          return "event";
        }
        if (
          methodName === "componentDidMount" ||
          methodName === "componentDidUpdate" ||
          methodName === "componentWillUnmount"
        ) {
          return "effect";
        }
      }

      // Async function context
      if (NodeTypeGuards.isAsyncFunction(current)) {
        return this.determineAsyncFunctionContext(current);
      }

      // Next.js specific contexts
      if (projectStructure?.projectType === "nextjs") {
        const nextjsScope = this.determineNextJsSpecificScope(current);
        if (nextjsScope !== "other") {
          return nextjsScope;
        }
      }

      current = current.parent;
    }

    return "other";
  }

  /**
   * Determine Next.js specific scope contexts
   */
  private determineNextJsSpecificScope(node: ts.Node): TryCatchBlock["scope"] {
    const projectStructure = this.config.getProjectStructure();
    if (projectStructure?.projectType !== "nextjs") {
      return "other";
    }

    // Check for Next.js App Router specific contexts
    if (projectStructure.routerType === "app") {
      // Server actions
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
        // Check if it's a server action by looking for "use server" directive
        const statements = this.getFunctionBodyStatements(node);
        if (
          statements?.some(
            (stmt) =>
              ts.isExpressionStatement(stmt) &&
              ts.isStringLiteral(stmt.expression) &&
              stmt.expression.text === "use server"
          )
        ) {
          return "effect"; // Server actions are like effects
        }
      }

      // Route handlers (app/api)
      if (this.isAPIRouteHandler(node)) {
        return "effect";
      }

      // Middleware
      if (this.isMiddlewareFunction(node)) {
        return "effect";
      }
    }

    // Check for Next.js Pages Router specific contexts
    if (projectStructure.routerType === "pages") {
      // API routes
      if (this.isAPIRouteHandler(node)) {
        return "effect";
      }

      // Data fetching functions
      if (this.isDataFetchingFunction(node)) {
        return "effect";
      }
    }

    return "other";
  }

  /**
   * Get function body statements
   */
  private getFunctionBodyStatements(node: ts.Node): ts.Statement[] | undefined {
    if (ts.isFunctionDeclaration(node) && node.body) {
      return Array.from(node.body.statements);
    }
    if (ts.isArrowFunction(node) && ts.isBlock(node.body)) {
      return Array.from(node.body.statements);
    }
    return undefined;
  }

  /**
   * Check if node is an API route handler
   */
  private isAPIRouteHandler(node: ts.Node): boolean {
    const fileName = this.sourceFile.fileName;
    if (!fileName.includes("/api/") && !fileName.includes("\\api\\")) {
      return false;
    }

    // Check for HTTP method exports
    if (ts.isFunctionDeclaration(node) && node.name) {
      const funcName = node.name.text;
      const httpMethods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
      ];
      return httpMethods.includes(funcName);
    }

    return false;
  }

  /**
   * Check if node is a middleware function
   */
  private isMiddlewareFunction(node: ts.Node): boolean {
    const fileName = path.basename(this.sourceFile.fileName);
    return fileName === "middleware.ts" || fileName === "middleware.js";
  }

  /**
   * Check if node is a data fetching function
   */
  private isDataFetchingFunction(node: ts.Node): boolean {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const funcName = node.name.text;
      const dataFetchingFunctions = [
        "getServerSideProps",
        "getStaticProps",
        "getStaticPaths",
        "getInitialProps",
      ];
      return dataFetchingFunctions.includes(funcName);
    }
    return false;
  }

  /**
   * Check if current context is an event handler
   */
  private isEventHandlerContext(node: ts.Node): boolean {
    // Look for event handler prop assignments
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isJsxAttribute(current) && ts.isIdentifier(current.name)) {
        const propName = current.name.text;
        return /^(on[A-Z]|handle[A-Z])/.test(propName);
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Enhanced event handler detection
   */
  private isEnhancedEventHandler(node: ts.Node): boolean {
    // Standard event handler detection
    if (ASTUtils.isEventHandler(node)) {
      return true;
    }

    // Function assignments to event properties
    if (ts.isPropertyAssignment(node)) {
      const propName = node.name?.getText();
      if (propName && /^(on[A-Z]|handle[A-Z])/.test(propName)) {
        return true;
      }
    }

    // JSX event prop assignments
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const propName = node.name.text;
      return /^(on[A-Z])/.test(propName);
    }

    // Event listener additions
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      if (
        callText.includes("addEventListener") ||
        callText.includes("removeEventListener") ||
        callText.includes("on(") ||
        callText.includes("off(")
      ) {
        return true;
      }

      // Next.js specific event patterns
      const projectStructure = this.config.getProjectStructure();
      if (projectStructure?.projectType === "nextjs") {
        const nextjsEventPatterns = [
          /router\.(push|replace|back|forward)/,
          /searchParams\.(set|delete)/,
          /form\.(submit|reset)/,
        ];

        if (nextjsEventPatterns.some((pattern) => pattern.test(callText))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if node is a component render function
   */
  private isComponentRenderFunction(node: ts.Node): boolean {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      // Check if function returns JSX
      let returnsJSX = false;
      traverseAST(node, (current) => {
        if (ts.isReturnStatement(current) && current.expression) {
          if (
            ts.isJsxElement(current.expression) ||
            ts.isJsxSelfClosingElement(current.expression) ||
            ts.isJsxFragment(current.expression)
          ) {
            returnsJSX = true;
          }
        }
      });
      return returnsJSX;
    }
    return false;
  }

  /**
   * Determine context of async function with Next.js awareness
   */
  private determineAsyncFunctionContext(node: ts.Node): TryCatchBlock["scope"] {
    const functionName = ASTUtils.getFunctionNameFromNode(node);
    const projectStructure = this.config.getProjectStructure();

    // Event handler patterns
    if (functionName.startsWith("handle") || functionName.startsWith("on")) {
      return "event";
    }

    // Effect patterns
    if (
      functionName.includes("fetch") ||
      functionName.includes("load") ||
      functionName.includes("init")
    ) {
      return "effect";
    }

    // Next.js specific async function patterns
    if (projectStructure?.projectType === "nextjs") {
      // Server component patterns
      if (this.isServerComponent(node)) {
        return "render";
      }

      // API route patterns
      if (this.isAPIRouteHandler(node)) {
        return "effect";
      }

      // Server action patterns
      if (this.isServerAction(node)) {
        return "effect";
      }

      // Data fetching patterns
      if (this.isDataFetchingFunction(node)) {
        return "effect";
      }
    }

    // Check function usage context
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
        const hookName = current.expression.text;
        if (hookName === "useEffect" || hookName === "useLayoutEffect") {
          return "effect";
        }
        if (hookName === "useCallback") {
          return this.isEventHandlerContext(current) ? "event" : "other";
        }
      }
      current = current.parent;
    }

    return "other";
  }

  /**
   * Check if function is a Next.js server component
   */
  private isServerComponent(node: ts.Node): boolean {
    const projectStructure = this.config.getProjectStructure();
    if (
      projectStructure?.projectType !== "nextjs" ||
      projectStructure.routerType !== "app"
    ) {
      return false;
    }

    // Check if we're in the app directory
    if (!this.sourceFile.fileName.includes("/app/")) {
      return false;
    }

    // Server components are async by default in app router
    return NodeTypeGuards.isAsyncFunction(node);
  }

  /**
   * Check if function is a server action
   */
  private isServerAction(node: ts.Node): boolean {
    const statements = this.getFunctionBodyStatements(node);
    return (
      statements?.some(
        (stmt) =>
          ts.isExpressionStatement(stmt) &&
          ts.isStringLiteral(stmt.expression) &&
          stmt.expression.text === "use server"
      ) || false
    );
  }

  /**
   * Enhanced fallback render detection with Next.js patterns
   */
  private detectEnhancedFallbackRender(catchClause: ts.CatchClause): boolean {
    let hasFallback = false;

    traverseAST(catchClause, (node) => {
      // Direct JSX rendering
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        hasFallback = true;
        return;
      }

      // JSX fragments
      if (ts.isJsxFragment(node)) {
        hasFallback = true;
        return;
      }

      // Return statements with JSX
      if (ts.isReturnStatement(node) && node.expression) {
        if (
          ts.isJsxElement(node.expression) ||
          ts.isJsxSelfClosingElement(node.expression) ||
          ts.isJsxFragment(node.expression)
        ) {
          hasFallback = true;
          return;
        }

        // Conditional JSX returns
        if (ts.isConditionalExpression(node.expression)) {
          const hasJSXInCondition = this.hasJSXInExpression(node.expression);
          if (hasJSXInCondition) {
            hasFallback = true;
            return;
          }
        }
      }

      // State updates that trigger fallback UI
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const setterName = node.expression.text;
        if (ErrorPatternUtils.isErrorStateSetter(setterName)) {
          // Check if the setter value indicates UI fallback
          if (node.arguments.length > 0) {
            const arg = node.arguments[0];
            if (
              ts.isStringLiteral(arg) ||
              arg.kind === ts.SyntaxKind.TrueKeyword ||
              arg.kind === ts.SyntaxKind.FalseKeyword
            ) {
              hasFallback = true;
              return;
            }
          }
        }
      }

      // Function calls that render fallback UI
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText();
        const fallbackFunctionPatterns = [
          /render(Error|Fallback|Message)/i,
          /show(Error|Message|Alert)/i,
          /display(Error|Fallback)/i,
          /toast\.(error|show)/i,
          /notification\.(error|show)/i,
          /alert\(/i,
        ];

        if (
          fallbackFunctionPatterns.some((pattern) => pattern.test(callText))
        ) {
          hasFallback = true;
          return;
        }

        // Next.js specific fallback patterns
        const projectStructure = this.config.getProjectStructure();
        if (projectStructure?.projectType === "nextjs") {
          const nextjsFallbackPatterns = [
            /notFound\(/,
            /redirect\(/,
            /permanentRedirect\(/,
            /router\.(push|replace)/,
          ];

          if (
            nextjsFallbackPatterns.some((pattern) => pattern.test(callText))
          ) {
            hasFallback = true;
            return;
          }
        }
      }
    });

    return hasFallback;
  }

  /**
   * Check if expression contains JSX
   */
  private hasJSXInExpression(expr: ts.Expression): boolean {
    let hasJSX = false;
    traverseAST(expr, (node) => {
      if (
        ts.isJsxElement(node) ||
        ts.isJsxSelfClosingElement(node) ||
        ts.isJsxFragment(node)
      ) {
        hasJSX = true;
      }
    });
    return hasJSX;
  }

  /**
   * Enhanced error state updates extraction with Next.js patterns
   */
  private extractEnhancedErrorStateUpdates(
    catchClause: ts.CatchClause
  ): ErrorStateUpdate[] {
    const updates: ErrorStateUpdate[] = [];

    traverseAST(catchClause, (node) => {
      // Direct state setter calls
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const callee = node.expression.text;
        if (ErrorPatternUtils.isErrorStateSetter(callee)) {
          updates.push({
            stateName: ErrorPatternUtils.getStateNameFromSetter(callee),
            setter: callee,
            value: node.arguments[0]?.getText() || "",
          });
        }
      }

      // Redux dispatch calls with error actions
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText();
        if (callText === "dispatch" && node.arguments.length > 0) {
          const actionArg = node.arguments[0];
          const actionText = actionArg.getText();

          // Check for error action patterns
          if (/error|fail|reject/i.test(actionText)) {
            updates.push({
              stateName: "reduxError",
              setter: "dispatch",
              value: actionText,
            });
          }
        }
      }

      // Zustand/Jotai state updates
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText();
        if (
          (callText === "set" || callText.includes("setAtom")) &&
          node.arguments.length > 0
        ) {
          const stateUpdate = node.arguments[0];
          const updateText = stateUpdate.getText();

          if (/error|Error/.test(updateText)) {
            updates.push({
              stateName: "storeError",
              setter: callText,
              value: updateText,
            });
          }
        }
      }

      // Form library error updates
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText();
        const formErrorPatterns = [
          /setError/,
          /setFieldError/,
          /setStatus/,
          /setSubmitting/,
        ];

        if (formErrorPatterns.some((pattern) => pattern.test(callText))) {
          updates.push({
            stateName: "formError",
            setter: callText,
            value: node.arguments[0]?.getText() || "",
          });
        }
      }

      // Context state updates
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText();
        if (callText.includes("Context") && callText.includes("set")) {
          const argText = node.arguments[0]?.getText() || "";
          if (/error|Error/.test(argText)) {
            updates.push({
              stateName: "contextError",
              setter: callText,
              value: argText,
            });
          }
        }
      }

      // Next.js specific state updates
      const projectStructure = this.config.getProjectStructure();
      if (projectStructure?.projectType === "nextjs") {
        if (ts.isCallExpression(node)) {
          const callText = node.expression.getText();

          // Next.js form state updates
          const nextjsFormPatterns = [
            /useFormState/,
            /useFormStatus/,
            /startTransition/,
          ];

          if (nextjsFormPatterns.some((pattern) => pattern.test(callText))) {
            updates.push({
              stateName: "nextjsFormError",
              setter: callText,
              value: node.arguments[0]?.getText() || "",
            });
          }

          // Router error updates
          if (/router\.(push|replace)/.test(callText)) {
            updates.push({
              stateName: "routerError",
              setter: "router",
              value: node.arguments[0]?.getText() || "",
            });
          }
        }
      }
    });

    return updates;
  }

  /**
   * Enhanced error logging detection with Next.js patterns
   */
  private hasEnhancedErrorLogging(catchClause: ts.CatchClause): boolean {
    let hasLogging = false;

    traverseAST(catchClause, (node) => {
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText();

        // Enhanced logging patterns
        const loggingPatterns = [
          // Console methods
          /console\.(error|warn|log|info|debug)/,

          // Logging libraries
          /logger\.(error|warn|info|debug)/,
          /log\.(error|warn|info|debug)/,
          /winston\.(error|warn|info)/,
          /bunyan\.(error|warn|info)/,

          // Error monitoring services
          /Sentry\.(captureException|captureMessage|withScope)/,
          /captureException/,
          /captureMessage/,
          /addBreadcrumb/,

          // Bugsnag
          /Bugsnag\.(notify|leaveBreadcrumb)/,
          /bugsnag\.(notify|leaveBreadcrumb)/,

          // Rollbar
          /Rollbar\.(error|warning|info|debug)/,
          /rollbar\.(error|warning|info|debug)/,

          // LogRocket
          /LogRocket\.(captureException|identify|track)/,

          // Custom error reporting
          /reportError/,
          /trackError/,
          /logError/,
          /sendError/,
          /errorReporter/,

          // Analytics error tracking
          /gtag\(.*error/,
          /analytics\.track.*error/i,
          /mixpanel\.track.*error/i,
          /amplitude\.logEvent.*error/i,

          // APM tools
          /newrelic\.(recordCustomEvent|addCustomAttribute)/,
          /elastic\.(apm|track)/,
          /datadog\.(increment|histogram)/,
        ];

        // Next.js specific logging patterns
        const projectStructure = this.config.getProjectStructure();
        if (projectStructure?.projectType === "nextjs") {
          const nextjsLoggingPatterns = [
            /unstable_noStore/,
            /cookies\(\)\.set/,
            /headers\(\)\.set/,
            /revalidatePath/,
            /revalidateTag/,
          ];
          loggingPatterns.push(...nextjsLoggingPatterns);
        }

        if (loggingPatterns.some((pattern) => pattern.test(callText))) {
          hasLogging = true;
          return;
        }

        // Check for generic reporting functions with error context
        if (/report|track|send|log|capture/i.test(callText)) {
          // Check if arguments contain error-related content
          const hasErrorArg = node.arguments.some((arg) => {
            const argText = arg.getText();
            return /error|exception|fail|crash/i.test(argText);
          });

          if (hasErrorArg) {
            hasLogging = true;
            return;
          }
        }
      }

      // Check for error logging through object method calls
      if (
        ts.isPropertyAccessExpression(node.parent) &&
        ts.isCallExpression(node.parent.parent)
      ) {
        const propertyCall = node.parent.parent;
        const fullCallText = propertyCall.expression.getText();

        if (/\.(error|warn|info|debug|log)\(/.test(fullCallText)) {
          hasLogging = true;
          return;
        }
      }
    });

    return hasLogging;
  }

  /**
   * Find all try-catch blocks in a node with enhanced analysis
   */
  public findTryCatchBlocks(node: ts.Node): TryCatchBlock[] {
    const tryCatchBlocks: TryCatchBlock[] = [];

    traverseAST(node, (currentNode) => {
      if (ts.isTryStatement(currentNode)) {
        const analyzed = this.analyzeTryCatchBlock(currentNode);
        if (analyzed) {
          tryCatchBlocks.push(analyzed);
        }
      }
    });

    return tryCatchBlocks;
  }

  /**
   * Analyze nested try-catch patterns
   */
  public analyzeNestedTryCatch(node: ts.Node): {
    hasNestedTry: boolean;
    nestedDepth: number;
    hasFinally: boolean;
  } {
    let hasNestedTry = false;
    let maxDepth = 0;
    let hasFinally = false;

    const analyzeDepth = (currentNode: ts.Node, currentDepth: number): void => {
      if (ts.isTryStatement(currentNode)) {
        maxDepth = Math.max(maxDepth, currentDepth);

        if (currentDepth > 1) {
          hasNestedTry = true;
        }

        if (currentNode.finallyBlock) {
          hasFinally = true;
        }

        // Analyze children with increased depth
        ts.forEachChild(currentNode, (child) => {
          analyzeDepth(child, currentDepth + 1);
        });
      } else {
        ts.forEachChild(currentNode, (child) => {
          analyzeDepth(child, currentDepth);
        });
      }
    };

    analyzeDepth(node, 0);

    return {
      hasNestedTry,
      nestedDepth: maxDepth,
      hasFinally,
    };
  }

  /**
   * Analyze async try-catch patterns with Next.js awareness
   */
  public analyzeAsyncTryCatch(node: ts.TryStatement): {
    hasAwaitInTry: boolean;
    hasAsyncErrorHandling: boolean;
    hasPromiseChaining: boolean;
    hasServerSideAsync: boolean;
  } {
    let hasAwaitInTry = false;
    let hasAsyncErrorHandling = false;
    let hasPromiseChaining = false;
    let hasServerSideAsync = false;

    // Check try block for async patterns
    traverseAST(node.tryBlock, (current) => {
      if (ts.isAwaitExpression(current)) {
        hasAwaitInTry = true;
        hasAsyncErrorHandling = true;
      }

      if (ts.isCallExpression(current)) {
        const callText = current.expression.getText();
        if (callText.includes(".then(") || callText.includes(".catch(")) {
          hasPromiseChaining = true;
          hasAsyncErrorHandling = true;
        }

        // Check for Next.js server-side async operations
        const projectStructure = this.config.getProjectStructure();
        if (projectStructure?.projectType === "nextjs") {
          const serverAsyncPatterns = [
            /fetch\(/,
            /cookies\(\)/,
            /headers\(\)/,
            /notFound\(/,
            /redirect\(/,
            /revalidatePath/,
            /revalidateTag/,
          ];

          if (serverAsyncPatterns.some((pattern) => pattern.test(callText))) {
            hasServerSideAsync = true;
            hasAsyncErrorHandling = true;
          }
        }
      }
    });

    return {
      hasAwaitInTry,
      hasAsyncErrorHandling,
      hasPromiseChaining,
      hasServerSideAsync,
    };
  }
}
