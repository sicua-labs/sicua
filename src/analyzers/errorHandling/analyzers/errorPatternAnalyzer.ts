import ts from "typescript";
import { ErrorPattern } from "../../../types/errorHandling.types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { ErrorPatternUtils } from "../../../utils/error_specific/errorPatternUtils";
import { traverseAST } from "../../../utils/ast/traversal";
import { ErrorStatesMap } from "../types/internalTypes";
import { IConfigManager } from "../../../types";
import * as path from "path";
import { ConfigManager } from "../../../core/configManager";

/**
 * Enhanced analyzer for error handling patterns in React components with project structure awareness
 */
export class ErrorPatternAnalyzer {
  private sourceFile: ts.SourceFile;
  private imports: Set<string> = new Set();
  private config: IConfigManager;

  constructor(sourceFile: ts.SourceFile, config?: IConfigManager) {
    this.sourceFile = sourceFile;
    this.config = config || new ConfigManager(process.cwd());
    this.analyzeImports();
  }

  /**
   * Analyze import statements to understand available libraries with enhanced resolution
   */
  private analyzeImports(): void {
    traverseAST(this.sourceFile, (node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const moduleName = node.moduleSpecifier.text;
        const resolvedModuleName = this.resolveImportPath(moduleName);
        this.imports.add(resolvedModuleName);
      }
    });
  }

  /**
   * Resolve import paths using project structure context
   */
  private resolveImportPath(importPath: string): string {
    // Skip external packages
    if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
      return importPath;
    }

    try {
      const currentDir = path.dirname(this.sourceFile.fileName);
      const projectStructure = this.config.getProjectStructure();

      if (importPath.startsWith(".")) {
        // Relative import
        return path.resolve(currentDir, importPath);
      } else {
        // Absolute import from project root
        const baseDir =
          projectStructure?.detectedSourceDirectory || this.config.projectPath;
        return path.resolve(baseDir, importPath.substring(1));
      }
    } catch (error) {
      return importPath; // Fallback to original path
    }
  }

  /**
   * Analyze a component node for error handling patterns with project structure awareness
   */
  public analyzeErrorPatterns(
    node: ts.Node,
    errorStates: ErrorStatesMap
  ): ErrorPattern[] {
    const patterns: ErrorPattern[] = [];

    traverseAST(node, (currentNode) => {
      // Conditional rendering patterns
      const conditionalPattern = this.analyzeConditionalRenderingPattern(
        currentNode,
        errorStates
      );
      if (conditionalPattern) patterns.push(conditionalPattern);

      // Error logging patterns
      const loggingPattern = this.analyzeErrorLoggingPattern(currentNode);
      if (loggingPattern) patterns.push(loggingPattern);

      // State update patterns
      const stateUpdatePattern = this.analyzeStateUpdatePattern(currentNode);
      if (stateUpdatePattern) patterns.push(stateUpdatePattern);

      // Browser API error patterns
      const browserApiPattern = this.analyzeBrowserApiPattern(currentNode);
      if (browserApiPattern) patterns.push(browserApiPattern);

      // Third-party library error patterns
      const libraryPattern = this.analyzeThirdPartyLibraryPattern(currentNode);
      if (libraryPattern) patterns.push(libraryPattern);

      // Form validation patterns
      const formValidationPattern =
        this.analyzeFormValidationPattern(currentNode);
      if (formValidationPattern) patterns.push(formValidationPattern);

      // Async operation patterns
      const asyncPattern = this.analyzeAsyncErrorPattern(currentNode);
      if (asyncPattern) patterns.push(asyncPattern);

      // Next.js specific patterns
      const nextjsPattern = this.analyzeNextJsErrorPattern(currentNode);
      if (nextjsPattern) patterns.push(nextjsPattern);
    });

    return patterns;
  }

  /**
   * Analyze Next.js specific error patterns
   */
  private analyzeNextJsErrorPattern(node: ts.Node): ErrorPattern | undefined {
    const projectStructure = this.config.getProjectStructure();
    if (projectStructure?.projectType !== "nextjs") {
      return undefined;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      // Next.js App Router patterns
      if (projectStructure.routerType === "app") {
        const appRouterPatterns = [
          /notFound\(/,
          /redirect\(/,
          /permanentRedirect\(/,
          /unstable_noStore\(/,
          /revalidatePath\(/,
          /revalidateTag\(/,
        ];

        if (appRouterPatterns.some((pattern) => pattern.test(callText))) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            return {
              type: "async-handling",
              location,
              relatedStates: [],
              pattern: callText,
            };
          }
        }
      }

      // Next.js Pages Router patterns
      if (projectStructure.routerType === "pages") {
        const pagesRouterPatterns = [
          /getServerSideProps/,
          /getStaticProps/,
          /getStaticPaths/,
          /getInitialProps/,
        ];

        if (pagesRouterPatterns.some((pattern) => pattern.test(callText))) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            return {
              type: "async-handling",
              location,
              relatedStates: [],
              pattern: callText,
            };
          }
        }
      }

      // Next.js Router patterns
      const routerPatterns = [
        /router\.(push|replace|back|forward|reload)/,
        /useRouter\(/,
        /useSearchParams\(/,
        /usePathname\(/,
        /useParams\(/,
      ];

      if (routerPatterns.some((pattern) => pattern.test(callText))) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "async-handling",
            location,
            relatedStates: [],
            pattern: callText,
          };
        }
      }

      // Next.js Image and optimization patterns
      const optimizationPatterns = [
        /next\/image/,
        /next\/font/,
        /next\/script/,
        /next\/head/,
      ];

      if (optimizationPatterns.some((pattern) => pattern.test(callText))) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "async-handling",
            location,
            relatedStates: [],
            pattern: callText,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Analyze conditional rendering patterns
   */
  private analyzeConditionalRenderingPattern(
    node: ts.Node,
    errorStates: ErrorStatesMap
  ): ErrorPattern | undefined {
    if (ts.isConditionalExpression(node) || ts.isIfStatement(node)) {
      const condition = ts.isConditionalExpression(node)
        ? node.condition
        : node.expression;

      const relatedStates = this.findRelatedErrorStates(condition, errorStates);
      if (relatedStates.length > 0) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "conditional-render",
            location,
            relatedStates,
            pattern: condition.getText(),
          };
        }
      }
    }

    // Logical AND/OR patterns in JSX
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      const relatedStates = this.findRelatedErrorStates(node.left, errorStates);
      if (relatedStates.length > 0) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "conditional-render",
            location,
            relatedStates,
            pattern: node.getText(),
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Analyze error logging patterns with enhanced detection
   */
  private analyzeErrorLoggingPattern(node: ts.Node): ErrorPattern | undefined {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      // Enhanced logging pattern detection
      const loggingPatterns = [
        /console\.(error|warn|log)/,
        /logger\.(error|warn|info)/,
        /log\.(error|warn|info)/,
        /captureException/,
        /reportError/,
        /trackError/,
        /Sentry\.(captureException|captureMessage)/,
        /bugsnag\.(notify|leaveBreadcrumb)/,
        /rollbar\.(error|warning|info)/,
        /LogRocket\.(captureException|log)/,
        /amplitude\.(logEvent|track)/,
        /mixpanel\.track/,
        /gtag\(.*error/,
        /analytics\.track/,

        // Next.js specific logging
        /console\.error/,
        /console\.warn/,
        /unstable_noStore/,
      ];

      if (loggingPatterns.some((pattern) => pattern.test(callText))) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "error-logging",
            location,
            relatedStates: [],
            pattern: callText,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Analyze state update patterns with enhanced detection
   */
  private analyzeStateUpdatePattern(node: ts.Node): ErrorPattern | undefined {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const callee = node.expression.text;

      // Enhanced state setter detection
      if (
        ErrorPatternUtils.isErrorStateSetter(callee) ||
        this.isReduxDispatchErrorAction(node) ||
        this.isZustandErrorUpdate(node) ||
        this.isJotaiErrorUpdate(node) ||
        this.isNextJsStateUpdate(node)
      ) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "state-update",
            location,
            relatedStates: [ErrorPatternUtils.getStateNameFromSetter(callee)],
            pattern: node.getText(),
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Check for Next.js specific state updates
   */
  private isNextJsStateUpdate(node: ts.CallExpression): boolean {
    const projectStructure = this.config.getProjectStructure();
    if (projectStructure?.projectType !== "nextjs") {
      return false;
    }

    const callText = node.expression.getText();

    // Router state updates
    if (
      callText.includes("router.") &&
      ["push", "replace", "back", "forward", "reload"].some((method) =>
        callText.includes(method)
      )
    ) {
      return true;
    }

    // Search params updates
    if (
      callText.includes("searchParams") ||
      callText.includes("setSearchParams")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Analyze browser API error patterns with enhanced detection
   */
  private analyzeBrowserApiPattern(node: ts.Node): ErrorPattern | undefined {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      const browserApiPatterns = [
        /navigator\.geolocation\.(getCurrentPosition|watchPosition)/,
        /navigator\.mediaDevices\.getUserMedia/,
        /navigator\.mediaDevices\.getDisplayMedia/,
        /navigator\.permissions\.query/,
        /navigator\.serviceWorker\.register/,
        /fetch\(/,
        /XMLHttpRequest/,
        /WebSocket/,
        /localStorage\.(getItem|setItem)/,
        /sessionStorage\.(getItem|setItem)/,
        /indexedDB\.open/,
        /caches\.(open|match)/,
        /navigator\.clipboard\.(read|write)/,
        /document\.execCommand/,
        /FileReader/,
        /URL\.createObjectURL/,
        /canvas\.getContext/,
        /AudioContext/,
        /webkitAudioContext/,
        /RTCPeerConnection/,
        /MediaRecorder/,
        /IntersectionObserver/,
        /MutationObserver/,
        /ResizeObserver/,
        /PerformanceObserver/,
      ];

      if (browserApiPatterns.some((pattern) => pattern.test(callText))) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "async-handling",
            location,
            relatedStates: [],
            pattern: callText,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Analyze third-party library error patterns with Next.js awareness
   */
  private analyzeThirdPartyLibraryPattern(
    node: ts.Node
  ): ErrorPattern | undefined {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      // React Query patterns
      if (
        this.imports.has("@tanstack/react-query") ||
        this.imports.has("react-query")
      ) {
        const reactQueryPatterns = [
          /useQuery/,
          /useMutation/,
          /useInfiniteQuery/,
          /queryClient\.(fetchQuery|prefetchQuery)/,
        ];

        if (reactQueryPatterns.some((pattern) => pattern.test(callText))) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            return {
              type: "async-handling",
              location,
              relatedStates: [],
              pattern: callText,
            };
          }
        }
      }

      // SWR patterns
      if (this.imports.has("swr")) {
        if (/useSWR/.test(callText)) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            return {
              type: "async-handling",
              location,
              relatedStates: [],
              pattern: callText,
            };
          }
        }
      }

      // Axios patterns
      if (this.imports.has("axios")) {
        const axiosPatterns = [
          /axios\.(get|post|put|delete|patch)/,
          /axios\(/,
          /\.get\(/,
          /\.post\(/,
          /\.put\(/,
          /\.delete\(/,
          /\.patch\(/,
        ];

        if (axiosPatterns.some((pattern) => pattern.test(callText))) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            return {
              type: "async-handling",
              location,
              relatedStates: [],
              pattern: callText,
            };
          }
        }
      }

      // Next.js specific libraries
      const projectStructure = this.config.getProjectStructure();
      if (projectStructure?.projectType === "nextjs") {
        const nextjsLibraryPatterns = [
          /next-auth/,
          /next-seo/,
          /@next\/bundle-analyzer/,
          /next-i18next/,
          /next-themes/,
          /@next\/font/,
        ];

        if (nextjsLibraryPatterns.some((pattern) => pattern.test(callText))) {
          const location = ASTUtils.getNodeLocation(node, this.sourceFile);
          if (location) {
            return {
              type: "async-handling",
              location,
              relatedStates: [],
              pattern: callText,
            };
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Analyze form validation patterns
   */
  private analyzeFormValidationPattern(
    node: ts.Node
  ): ErrorPattern | undefined {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      const formValidationPatterns = [
        // React Hook Form
        /useForm/,
        /register/,
        /handleSubmit/,
        /formState\.errors/,

        // Formik
        /useFormik/,
        /Formik/,
        /Field/,
        /ErrorMessage/,

        // Yup validation
        /yup\.(string|number|object|array)/,
        /\.validate/,
        /\.validateSync/,

        // Zod validation
        /z\.(string|number|object|array)/,
        /\.parse/,
        /\.safeParse/,

        // Joi validation
        /Joi\.(string|number|object|array)/,
        /\.validate/,

        // Next.js specific form handling
        /useFormState/,
        /useFormStatus/,
      ];

      if (formValidationPatterns.some((pattern) => pattern.test(callText))) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "state-update",
            location,
            relatedStates: [],
            pattern: callText,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Analyze async error patterns with enhanced detection
   */
  private analyzeAsyncErrorPattern(node: ts.Node): ErrorPattern | undefined {
    // Unhandled promise patterns
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      // Check for promises without .catch()
      if (callText.includes(".then(") && !callText.includes(".catch(")) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "promise-rejection",
            location,
            relatedStates: [],
            pattern: callText,
          };
        }
      }
    }

    // Async/await without try-catch
    if (ts.isAwaitExpression(node)) {
      const containingFunction = ASTUtils.getContainingFunction(node);
      if (containingFunction && !this.isInsideTryCatch(node)) {
        const location = ASTUtils.getNodeLocation(node, this.sourceFile);
        if (location) {
          return {
            type: "async-handling",
            location,
            relatedStates: [],
            pattern: node.getText(),
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Analyze a function for error patterns specific to functions
   */
  public analyzeFunctionErrorPatterns(node: ts.Node): ErrorPattern[] {
    const patterns: ErrorPattern[] = [];

    traverseAST(node, (currentNode) => {
      // Error throwing patterns
      if (ts.isThrowStatement(currentNode)) {
        const location = ASTUtils.getNodeLocation(currentNode, this.sourceFile);
        if (location) {
          patterns.push({
            type: "throw",
            location,
            relatedStates: [],
            pattern: currentNode.expression.getText(),
          });
        }
      }

      // Error creation patterns
      if (ASTUtils.isErrorCreation(currentNode)) {
        const location = ASTUtils.getNodeLocation(currentNode, this.sourceFile);
        if (location) {
          patterns.push({
            type: "error-creation",
            location,
            relatedStates: [],
            pattern: currentNode.getText(),
          });
        }
      }

      // Promise rejection patterns
      if (ASTUtils.isPromiseRejection(currentNode)) {
        const location = ASTUtils.getNodeLocation(currentNode, this.sourceFile);
        if (location) {
          patterns.push({
            type: "promise-rejection",
            location,
            relatedStates: [],
            pattern: currentNode.getText(),
          });
        }
      }

      // Async handling patterns
      if (ts.isAwaitExpression(currentNode)) {
        const parent = currentNode.parent;
        if (ts.isTryStatement(parent)) {
          const location = ASTUtils.getNodeLocation(
            currentNode,
            this.sourceFile
          );
          if (location) {
            patterns.push({
              type: "async-handling",
              location,
              relatedStates: [],
              pattern: currentNode.getText(),
            });
          }
        }
      }
    });

    return patterns;
  }

  /**
   * Find error states referenced in a condition
   */
  private findRelatedErrorStates(
    condition: ts.Expression,
    errorStates: ErrorStatesMap
  ): string[] {
    const relatedStates: string[] = [];

    traverseAST(condition, (node) => {
      if (ts.isIdentifier(node)) {
        const name = node.getText();
        if (errorStates.has(name)) {
          relatedStates.push(name);
        }
      }
    });

    return [...new Set(relatedStates)];
  }

  /**
   * Check if a call expression is a Redux dispatch with error action
   */
  private isReduxDispatchErrorAction(node: ts.CallExpression): boolean {
    const callText = node.expression.getText();
    if (callText.includes("dispatch")) {
      const args = node.arguments;
      if (args.length > 0) {
        const actionText = args[0].getText();
        return /error|fail|reject/i.test(actionText);
      }
    }
    return false;
  }

  /**
   * Check if a call expression is a Zustand error state update
   */
  private isZustandErrorUpdate(node: ts.CallExpression): boolean {
    const callText = node.expression.getText();
    return (
      callText.includes("set") &&
      node.arguments.some(
        (arg) =>
          arg.getText().includes("error") || arg.getText().includes("Error")
      )
    );
  }

  /**
   * Check if a call expression is a Jotai error atom update
   */
  private isJotaiErrorUpdate(node: ts.CallExpression): boolean {
    const callText = node.expression.getText();
    return (
      (callText.includes("set") || callText.includes("useSetAtom")) &&
      node.arguments.some(
        (arg) =>
          arg.getText().includes("error") || arg.getText().includes("Error")
      )
    );
  }

  /**
   * Check if a node is inside a try-catch block
   */
  private isInsideTryCatch(node: ts.Node): boolean {
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isTryStatement(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}
