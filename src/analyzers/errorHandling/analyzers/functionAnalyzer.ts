import ts from "typescript";
import { FunctionErrorHandling } from "../../../types/errorHandling.types";
import { ASTUtils } from "../../../utils/ast/ASTUtils";
import { RiskAnalysisUtils } from "../../../utils/error_specific/riskAnalysisUtils";
import { traverseAST } from "../../../utils/ast/traversal";
import { NodeTypeGuards } from "../../../utils/ast/nodeTypeGuards";
import { TryBlockAnalyzer } from "./tryBlockAnalyzer";
import { ErrorPatternAnalyzer } from "./errorPatternAnalyzer";
import { IConfigManager, ScanResult } from "../../../types";
import * as path from "path";
import { ConfigManager } from "../../../core/configManager";

/**
 * Enhanced analyzer for function-level error handling with comprehensive risk assessment and project structure awareness
 */
export class FunctionAnalyzer {
  private sourceFile: ts.SourceFile;
  private typeChecker: ts.TypeChecker;
  private tryBlockAnalyzer: TryBlockAnalyzer;
  private errorPatternAnalyzer: ErrorPatternAnalyzer;
  private imports: Map<string, string> = new Map();
  private config: IConfigManager;
  private scanResult: ScanResult;

  constructor(
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker,
    config?: IConfigManager,
    scanResult?: ScanResult
  ) {
    this.sourceFile = sourceFile;
    this.typeChecker = typeChecker;
    this.config = config || new ConfigManager(process.cwd());
    this.scanResult = scanResult || this.createFallbackScanResult();
    this.tryBlockAnalyzer = new TryBlockAnalyzer(sourceFile, this.config);
    this.errorPatternAnalyzer = new ErrorPatternAnalyzer(
      sourceFile,
      this.config
    );
    this.analyzeImports();
  }

  /**
   * Create fallback scan result if not provided
   */
  private createFallbackScanResult(): ScanResult {
    return {
      filePaths: [this.sourceFile.fileName],
      sourceFiles: new Map([[this.sourceFile.fileName, this.sourceFile]]),
      fileContents: new Map(),
      fileMetadata: new Map(),
      securityFiles: [],
      configFiles: [],
      environmentFiles: [],
      apiRoutes: [],
      middlewareFiles: [],
      packageInfo: [],
      securityScanMetadata: {
        scanTimestamp: Date.now(),
        scanDuration: 0,
        filesScanned: 1,
        securityIssuesFound: 0,
        riskLevel: "low",
        coveragePercentage: 0,
      },
    };
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

        if (
          node.importClause?.namedBindings &&
          ts.isNamedImports(node.importClause.namedBindings)
        ) {
          node.importClause.namedBindings.elements.forEach((element) => {
            this.imports.set(element.name.text, resolvedModuleName);
          });
        }

        if (node.importClause?.name) {
          this.imports.set(node.importClause.name.text, resolvedModuleName);
        }
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
   * Enhanced function analysis with comprehensive risk assessment and project structure awareness
   */
  public analyzeFunctionWithRisk(
    node: ts.Node
  ): FunctionErrorHandling | undefined {
    const functionName = ASTUtils.getFunctionNameFromNode(node);
    const location = ASTUtils.getNodeLocation(node, this.sourceFile);

    if (!location) return undefined;

    // Enhanced risk indicators with Next.js specific patterns
    const riskIndicators = {
      hasAsyncOperations: false,
      hasFileOperations: false,
      hasNetworkCalls: false,
      hasDataParsing: false,
      hasExternalAPICalls: false,
      hasDatabaseOperations: false,
      hasStateUpdates: false,
      hasComplexCalculations: false,
      hasThirdPartyLibraryCalls: false,
      hasDataTransformations: false,
      hasServerSideOperations: false,
      hasRouterOperations: false,
      hasAuthenticationOperations: false,
    };

    let riskScore = 0;

    // Comprehensive risk analysis with project structure awareness
    traverseAST(node, (currentNode) => {
      // Enhanced async/await operations
      if (this.isEnhancedAsyncOperation(currentNode)) {
        riskIndicators.hasAsyncOperations = true;
        riskScore += 2;
      }

      // Enhanced file operations
      if (this.isEnhancedFileOperation(currentNode)) {
        riskIndicators.hasFileOperations = true;
        riskScore += 2;
      }

      // Enhanced network requests
      if (this.isEnhancedNetworkCall(currentNode)) {
        riskIndicators.hasNetworkCalls = true;
        riskScore += 2;
      }

      // Enhanced data parsing
      if (this.isEnhancedDataParsing(currentNode)) {
        riskIndicators.hasDataParsing = true;
        riskScore += 1;
      }

      // Enhanced external API calls
      if (this.isEnhancedExternalAPICall(currentNode)) {
        riskIndicators.hasExternalAPICalls = true;
        riskScore += 2;
      }

      // Enhanced database operations
      if (this.isEnhancedDatabaseOperation(currentNode)) {
        riskIndicators.hasDatabaseOperations = true;
        riskScore += 2;
      }

      // Enhanced state updates
      if (this.isEnhancedStateUpdate(currentNode)) {
        riskIndicators.hasStateUpdates = true;
        riskScore += 1;
      }

      // Enhanced complex calculations
      if (this.isEnhancedComplexCalculation(currentNode)) {
        riskIndicators.hasComplexCalculations = true;
        riskScore += 1;
      }

      // Enhanced third-party library calls
      if (this.isEnhancedThirdPartyLibraryCall(currentNode)) {
        riskIndicators.hasThirdPartyLibraryCalls = true;
        riskScore += 1;
      }

      // Enhanced data transformations
      if (this.isEnhancedDataTransformation(currentNode)) {
        riskIndicators.hasDataTransformations = true;
        riskScore += 1;
      }

      // Next.js specific server-side operations
      if (this.isServerSideOperation(currentNode)) {
        riskIndicators.hasServerSideOperations = true;
        riskScore += 2;
      }

      // Next.js router operations
      if (this.isRouterOperation(currentNode)) {
        riskIndicators.hasRouterOperations = true;
        riskScore += 1;
      }

      // Authentication operations
      if (this.isAuthenticationOperation(currentNode)) {
        riskIndicators.hasAuthenticationOperations = true;
        riskScore += 2;
      }

      // Additional risk patterns
      riskScore += this.analyzeAdditionalRiskPatterns(currentNode);
    });

    // Analyze error handling patterns
    const tryCatchBlocks = this.tryBlockAnalyzer.findTryCatchBlocks(node);
    const errorHandlingPatterns =
      this.errorPatternAnalyzer.analyzeFunctionErrorPatterns(node);
    const errorPropagation = this.analyzeEnhancedErrorPropagation(node);
    const errorTypes = this.analyzeEnhancedErrorTypes(node);

    const hasErrorHandling =
      tryCatchBlocks.length > 0 ||
      errorHandlingPatterns.length > 0 ||
      errorPropagation.throws ||
      errorPropagation.rethrows ||
      errorPropagation.asyncHandling ||
      errorPropagation.customErrorClasses.length > 0 ||
      errorTypes.size > 0;

    // Adjust risk threshold based on project structure
    const projectStructure = this.config.getProjectStructure();
    let riskThreshold = 3;

    if (projectStructure?.projectType === "nextjs") {
      // Lower threshold for Next.js server-side code
      if (this.isServerSideFunction(node)) {
        riskThreshold = 2;
      }

      // API routes should have stricter requirements
      if (this.isAPIRoute()) {
        riskThreshold = 1;
      }
    }

    return {
      functionName,
      location,
      tryCatchBlocks,
      errorHandlingPatterns,
      errorPropagation,
      errorTypes,
      riskAnalysis: {
        shouldHaveErrorHandling: riskScore >= riskThreshold,
        riskIndicators,
        riskScore,
      },
      hasErrorHandling,
    };
  }

  /**
   * Check if function is server-side in Next.js
   */
  private isServerSideFunction(node: ts.Node): boolean {
    const projectStructure = this.config.getProjectStructure();
    if (projectStructure?.projectType !== "nextjs") {
      return false;
    }

    // Check if function is async (likely server component)
    if (NodeTypeGuards.isAsyncFunction(node)) {
      return true;
    }

    // Check for server-only imports
    let hasServerImports = false;
    traverseAST(node, (currentNode) => {
      if (
        ts.isImportDeclaration(currentNode) &&
        ts.isStringLiteral(currentNode.moduleSpecifier)
      ) {
        const importPath = currentNode.moduleSpecifier.text;
        const serverOnlyPackages = [
          "fs",
          "path",
          "crypto",
          "os",
          "server-only",
        ];
        if (
          serverOnlyPackages.some(
            (pkg) => importPath === pkg || importPath.startsWith(`${pkg}/`)
          )
        ) {
          hasServerImports = true;
        }
      }
    });

    return hasServerImports;
  }

  /**
   * Check if we're in an API route file
   */
  private isAPIRoute(): boolean {
    const fileName = this.sourceFile.fileName;
    return fileName.includes("/api/") || fileName.includes("\\api\\");
  }

  /**
   * Check for Next.js specific server-side operations
   */
  private isServerSideOperation(node: ts.Node): boolean {
    const projectStructure = this.config.getProjectStructure();
    if (projectStructure?.projectType !== "nextjs") {
      return false;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      // Next.js App Router server functions
      const serverFunctions = [
        /cookies\(\)/,
        /headers\(\)/,
        /notFound\(/,
        /redirect\(/,
        /permanentRedirect\(/,
        /unstable_noStore\(/,
        /revalidatePath\(/,
        /revalidateTag\(/,
      ];

      if (serverFunctions.some((pattern) => pattern.test(callText))) {
        return true;
      }

      // Pages Router server functions
      const pagesFunctions = [
        /getServerSideProps/,
        /getStaticProps/,
        /getStaticPaths/,
        /getInitialProps/,
      ];

      if (pagesFunctions.some((pattern) => pattern.test(callText))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for router operations
   */
  private isRouterOperation(node: ts.Node): boolean {
    const projectStructure = this.config.getProjectStructure();
    if (projectStructure?.projectType !== "nextjs") {
      return false;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      const routerPatterns = [
        /router\.(push|replace|back|forward|reload)/,
        /useRouter\(/,
        /useSearchParams\(/,
        /usePathname\(/,
        /useParams\(/,
        /useSelectedLayoutSegment/,
        /useSelectedLayoutSegments/,
      ];

      return routerPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Check for authentication operations
   */
  private isAuthenticationOperation(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      const authPatterns = [
        /signIn/,
        /signOut/,
        /authenticate/,
        /authorize/,
        /getSession/,
        /useSession/,
        /jwt\.(sign|verify)/,
        /bcrypt\.(hash|compare)/,
        /passport\./,
        /auth0\./,
        /firebase\.auth/,
        /supabase\.auth/,
        /clerk\./,
      ];

      return authPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced async operation detection
   */
  private isEnhancedAsyncOperation(node: ts.Node): boolean {
    if (ts.isAwaitExpression(node) || ASTUtils.isPromiseRelated(node)) {
      return true;
    }

    // Check for Promise-based patterns
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const asyncPatterns = [
        /\.then\(/,
        /\.catch\(/,
        /\.finally\(/,
        /Promise\.(all|race|allSettled|any)/,
        /setTimeout/,
        /setInterval/,
        /requestAnimationFrame/,
        /queueMicrotask/,
        /process\.nextTick/,
      ];

      return asyncPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced file operation detection
   */
  private isEnhancedFileOperation(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isFileSystemOperation(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const filePatterns = [
        // Browser file APIs
        /FileReader/,
        /File\(/,
        /Blob\(/,
        /URL\.createObjectURL/,
        /URL\.revokeObjectURL/,
        /FormData/,

        // Import/dynamic import
        /import\(/,
        /require\(/,

        // Web APIs
        /cache\./,
        /indexedDB/,

        // Next.js specific
        /fs\.(readFile|writeFile|readdir)/,
        /path\.(join|resolve)/,
      ];

      return filePatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced network call detection
   */
  private isEnhancedNetworkCall(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isNetworkRequest(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const networkPatterns = [
        // WebSocket
        /WebSocket/,
        /EventSource/,

        // WebRTC
        /RTCPeerConnection/,
        /RTCDataChannel/,

        // Service Worker
        /navigator\.serviceWorker/,
        /self\.registration/,

        // Push notifications
        /pushManager/,
        /showNotification/,

        // Web Workers
        /Worker\(/,
        /SharedWorker/,

        // GraphQL clients
        /apollo/,
        /graphql/,
        /relay/,

        // Next.js specific
        /fetch\(/,
        /axios\./,
        /unstable_cache/,
      ];

      return networkPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced data parsing detection
   */
  private isEnhancedDataParsing(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isDataParsing(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const parsingPatterns = [
        // Additional parsing libraries
        /yaml\.(parse|load)/,
        /xml2js/,
        /csv\.(parse|stringify)/,
        /querystring\.(parse|stringify)/,
        /qs\.(parse|stringify)/,

        // Date parsing
        /Date\.(parse|now)/,
        /moment\(/,
        /dayjs\(/,
        /luxon/,

        // Number parsing
        /parseInt/,
        /parseFloat/,
        /Number\(/,

        // URL parsing
        /URL\(/,
        /URLSearchParams/,

        // Base64
        /btoa/,
        /atob/,
        /Buffer\.(from|toString)/,

        // Next.js specific
        /searchParams\.(get|getAll)/,
        /headers\(\)\.get/,
      ];

      return parsingPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced external API call detection
   */
  private isEnhancedExternalAPICall(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isExternalAPICall(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const apiPatterns = [
        // Payment APIs
        /stripe/i,
        /paypal/i,
        /square/i,

        // Analytics
        /gtag/,
        /analytics/,
        /mixpanel/,
        /amplitude/,

        // Authentication
        /auth0/i,
        /firebase\.auth/,
        /cognito/i,

        // Cloud services
        /aws\./,
        /gcp\./,
        /azure\./,

        // Social APIs
        /facebook/i,
        /twitter/i,
        /linkedin/i,
        /google/i,

        // Mapping
        /mapbox/i,
        /googlemaps/i,

        // Next.js specific APIs
        /vercel/i,
        /planetscale/i,
        /supabase/i,
      ];

      return apiPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced database operation detection
   */
  private isEnhancedDatabaseOperation(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isDatabaseOperation(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const dbPatterns = [
        // NoSQL databases
        /mongodb/i,
        /dynamodb/i,
        /firestore/i,
        /cosmosdb/i,

        // Graph databases
        /neo4j/i,
        /arangodb/i,

        // Search engines
        /elasticsearch/i,
        /solr/i,
        /algolia/i,

        // Cache
        /redis/i,
        /memcached/i,

        // Browser storage
        /localStorage/,
        /sessionStorage/,
        /indexedDB/,

        // Next.js specific databases
        /prisma\./,
        /drizzle/i,
        /planetscale/i,
        /neon/i,
        /supabase\./,
      ];

      return dbPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced state update detection
   */
  private isEnhancedStateUpdate(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isStateUpdate(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const statePatterns = [
        // React state management
        /set[A-Z]/,
        /dispatch/,

        // State libraries
        /zustand/,
        /jotai/,
        /valtio/,
        /recoil/,

        // Form libraries
        /formik/,
        /react-hook-form/,
        /final-form/,

        // Router state
        /router\.(push|replace|go)/,
        /navigate/,
        /history\.(push|replace)/,

        // Next.js specific state
        /useSearchParams/,
        /useRouter/,
        /revalidatePath/,
        /revalidateTag/,
      ];

      return statePatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced complex calculation detection
   */
  private isEnhancedComplexCalculation(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isComplexCalculation(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const calculationPatterns = [
        // Math libraries
        /Math\.(pow|sqrt|log|exp|sin|cos|tan)/,
        /mathjs/,
        /decimal\.js/,
        /big\.js/,

        // Data processing
        /lodash\.(sum|mean|max|min|sortBy|groupBy)/,
        /ramda\./,
        /d3\.(scale|interpolate|format)/,

        // Crypto
        /crypto\.(createHash|createHmac|randomBytes)/,
        /bcrypt/,
        /scrypt/,

        // Compression
        /zlib\.(compress|decompress)/,
        /pako\./,
      ];

      return calculationPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Enhanced third-party library call detection
   */
  private isEnhancedThirdPartyLibraryCall(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isThirdPartyLibraryCall(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      // Check against known imports
      const thirdPartyLibraries = [
        "axios",
        "lodash",
        "moment",
        "dayjs",
        "uuid",
        "classnames",
        "react-query",
        "swr",
        "formik",
        "yup",
        "zod",
        "joi",
        "react-router",
        "next/router",
        "react-hook-form",
        "framer-motion",
        "react-spring",
        "lottie",
        "three",
        "chart.js",
        "d3",
        "plotly",
        "leaflet",
        "mapbox",
        "next-auth",
        "prisma",
        "drizzle-orm",
      ];

      return thirdPartyLibraries.some(
        (lib) => this.imports.has(lib) || callText.includes(lib)
      );
    }

    return false;
  }

  /**
   * Enhanced data transformation detection
   */
  private isEnhancedDataTransformation(node: ts.Node): boolean {
    if (RiskAnalysisUtils.isDataTransformation(node)) {
      return true;
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      const transformationPatterns = [
        // Array methods that can fail
        /\.(map|filter|reduce|find|sort|slice|splice)/,

        // Object manipulation
        /Object\.(keys|values|entries|assign|freeze|seal)/,

        // Type conversions
        /String\(/,
        /Number\(/,
        /Boolean\(/,
        /Array\.(from|of)/,

        // Data validation
        /validate/,
        /schema\./,
        /\.check/,
        /\.assert/,

        // Serialization
        /serialize/,
        /deserialize/,
        /stringify/,
        /encode/,
        /decode/,

        // Next.js specific transformations
        /searchParams\.(toString|sort)/,
        /headers\(\)\.(forEach|entries)/,
      ];

      return transformationPatterns.some((pattern) => pattern.test(callText));
    }

    return false;
  }

  /**
   * Analyze additional risk patterns specific to modern development and Next.js
   */
  private analyzeAdditionalRiskPatterns(node: ts.Node): number {
    let additionalRisk = 0;

    // Browser API risks
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();

      // Geolocation and device APIs
      if (
        /navigator\.(geolocation|mediaDevices|permissions|serviceWorker)/.test(
          callText
        )
      ) {
        additionalRisk += 1;
      }

      // Payment APIs
      if (/PaymentRequest|stripe|paypal/.test(callText)) {
        additionalRisk += 2;
      }

      // Biometric APIs
      if (/navigator\.(credentials|authentication)/.test(callText)) {
        additionalRisk += 2;
      }

      // Memory-intensive operations
      if (
        /canvas\.(getImageData|toDataURL)|ImageData|ArrayBuffer/.test(callText)
      ) {
        additionalRisk += 1;
      }

      // Form validation with external schemas
      if (/yup\.|zod\.|joi\./.test(callText)) {
        additionalRisk += 1;
      }

      // Next.js specific risk patterns
      const projectStructure = this.config.getProjectStructure();
      if (projectStructure?.projectType === "nextjs") {
        // Server actions
        if (/use(Server)?Action|useFormState|useFormStatus/.test(callText)) {
          additionalRisk += 2;
        }

        // Edge runtime functions
        if (/edge|runtime|middleware/.test(callText)) {
          additionalRisk += 1;
        }

        // Image optimization
        if (/next\/image|Image/.test(callText)) {
          additionalRisk += 1;
        }
      }
    }

    return additionalRisk;
  }

  /**
   * Enhanced error propagation analysis
   */
  private analyzeEnhancedErrorPropagation(node: ts.Node): {
    throws: boolean;
    rethrows: boolean;
    asyncHandling: boolean;
    customErrorClasses: string[];
  } {
    const analysis = {
      throws: false,
      rethrows: false,
      asyncHandling: false,
      customErrorClasses: new Set<string>(),
    };

    traverseAST(node, (currentNode) => {
      // Enhanced throw statement analysis
      if (ts.isThrowStatement(currentNode)) {
        analysis.throws = true;

        // Check for rethrows in catch clauses
        if (ASTUtils.isInsideCatchClause(currentNode)) {
          analysis.rethrows = true;
        }

        // Check for custom error types
        if (ts.isNewExpression(currentNode.expression)) {
          const errorType = currentNode.expression.expression.getText();
          if (errorType !== "Error") {
            analysis.customErrorClasses.add(errorType);
          }
        }
      }

      // Enhanced async error handling
      if (ts.isAwaitExpression(currentNode)) {
        const containingTry = ASTUtils.findNearestParent(
          currentNode,
          ts.isTryStatement
        );
        if (containingTry) {
          analysis.asyncHandling = true;
        }
      }

      // Promise rejection handling
      if (ts.isCallExpression(currentNode)) {
        const callText = currentNode.expression.getText();
        if (
          callText.includes("Promise.reject") ||
          callText.includes(".catch(")
        ) {
          analysis.asyncHandling = true;
        }
      }

      // Custom error class definitions
      if (ASTUtils.isCustomErrorClass(currentNode)) {
        const className = ASTUtils.getCustomErrorClassName(currentNode);
        if (className) {
          analysis.customErrorClasses.add(className);
        }
      }
    });

    return {
      ...analysis,
      customErrorClasses: Array.from(analysis.customErrorClasses),
    };
  }

  /**
   * Enhanced error types analysis
   */
  private analyzeEnhancedErrorTypes(node: ts.Node): Set<string> {
    const errorTypes = new Set<string>();

    traverseAST(node, (currentNode) => {
      // Catch clause parameter types
      if (ts.isCatchClause(currentNode)) {
        if (currentNode.variableDeclaration?.type) {
          errorTypes.add(currentNode.variableDeclaration.type.getText());
        } else {
          // Infer from usage
          if (
            currentNode.variableDeclaration?.name &&
            ts.isIdentifier(currentNode.variableDeclaration.name)
          ) {
            const errorVar = currentNode.variableDeclaration.name.text;
            traverseAST(currentNode.block, (blockNode) => {
              if (
                ts.isPropertyAccessExpression(blockNode) &&
                ts.isIdentifier(blockNode.expression) &&
                blockNode.expression.text === errorVar
              ) {
                errorTypes.add("Error"); // Assume generic Error type
              }
            });
          }
        }
      }

      // Thrown error types
      // Thrown error types
      if (ts.isThrowStatement(currentNode)) {
        if (ts.isNewExpression(currentNode.expression)) {
          const errorTypeName = currentNode.expression.expression.getText();
          errorTypes.add(errorTypeName);
        }
      }

      // Function return types that include Error
      if (NodeTypeGuards.isAsyncFunction(currentNode)) {
        const returnType = this.typeChecker.getReturnTypeOfSignature(
          this.typeChecker.getSignatureFromDeclaration(
            currentNode as ts.FunctionLikeDeclaration
          )!
        );
        const typeString = this.typeChecker.typeToString(returnType);
        if (typeString.includes("Error") || typeString.includes("Promise<")) {
          errorTypes.add(typeString);
        }
      }

      // Next.js specific error types
      const projectStructure = this.config.getProjectStructure();
      if (projectStructure?.projectType === "nextjs") {
        if (ts.isCallExpression(currentNode)) {
          const callText = currentNode.expression.getText();

          // Next.js specific error handling
          if (/notFound\(|redirect\(|permanentRedirect\(/.test(callText)) {
            errorTypes.add("NextResponse");
          }

          // Server action errors
          if (/useFormState|useFormStatus/.test(callText)) {
            errorTypes.add("FormState");
          }
        }
      }
    });

    return errorTypes;
  }

  /**
   * Analyze all functions in a file with enhanced project structure awareness
   */
  public analyzeFunctions(): FunctionErrorHandling[] {
    const functions: FunctionErrorHandling[] = [];

    traverseAST(this.sourceFile, (node) => {
      if (ASTUtils.isAnalyzableFunction(node, this.typeChecker)) {
        const analysis = this.analyzeFunctionWithRisk(node);
        if (analysis) {
          functions.push(analysis);
        }
      }
    });

    return functions;
  }

  /**
   * Analyze all functions within a component node with enhanced filtering
   */
  public analyzeComponentFunctions(node: ts.Node): FunctionErrorHandling[] {
    const functions: FunctionErrorHandling[] = [];

    traverseAST(node, (currentNode) => {
      if (ASTUtils.isAnalyzableFunction(currentNode, this.typeChecker)) {
        const analysis = this.analyzeFunctionWithRisk(currentNode);
        if (analysis) {
          functions.push(analysis);
        }
      }
    });

    return functions;
  }
}
