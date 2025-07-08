# Utils Documentation

This directory contains utility classes and functions for static analysis of TypeScript/React projects.

## ASTUtils (`src/utils/ast/ASTUtils.ts`)

Core utility class for TypeScript AST (Abstract Syntax Tree) manipulation and analysis.

### Methods

#### `getFunctionName(node: ts.Node | ts.FunctionDeclaration | ts.ArrowFunction): string`

Extracts the name of a function-like declaration from various TypeScript node types.

#### `findNodesInFiles<T extends ts.Node>(sourceFiles: Map<string, ts.SourceFile>, predicate: (node: ts.Node) => node is T): Map<string, T[]>`

Finds all nodes matching a specific predicate across multiple source files and returns them grouped by file path.

#### `findNodes<T extends ts.Node>(sourceFile: ts.SourceFile, predicate: (node: ts.Node) => node is T): T[]`

Finds all nodes matching a predicate within a single TypeScript source file.

#### `getNodeLocation(node: ts.Node, sourceFile: ts.SourceFile): { line: number; column: number }`

Gets the line and column position of a node within its source file.

#### `getSourceFileForNode(node: ts.Node, sourceFiles: Map<string, ts.SourceFile>): ts.SourceFile | undefined`

Retrieves the source file that contains a given node.

#### `getNodePath(node: ts.Node): ts.Node[]`

Builds an array representing the path from the root to a specific node through its ancestors.

#### `findNearestParent<T extends ts.Node>(node: ts.Node, predicate: (node: ts.Node) => node is T): T | undefined`

Finds the closest parent node that matches a given predicate.

#### `findReferencesInFiles(sourceFiles: Map<string, ts.SourceFile>, identifier: string): Map<string, ts.Identifier[]>`

Finds all references to a specific identifier across multiple source files.

#### `findReferences(sourceFile: ts.SourceFile, identifier: string): ts.Identifier[]`

Finds all references to a specific identifier within a single source file.

#### `findContainingConditions(node: ts.Node): string[]`

Extracts all conditional expressions that contain a given node (if statements, ternary operators, logical expressions, JSX conditionals).

#### `findIdentifiersInFiles(sourceFiles: Map<string, ts.SourceFile>): Map<string, ts.Identifier[]>`

Finds all identifier nodes across multiple source files.

#### `getContainingFunction(node: ts.Node): ts.FunctionLikeDeclaration | undefined`

Gets the nearest parent function-like declaration that contains the given node.

#### `getContainingBlock(node: ts.Node): ts.Block | undefined`

Gets the nearest parent block scope that contains the given node.

#### `isPure(node: ts.Expression): boolean`

Determines if an expression is pure (has no side effects).

#### `findNodesWithContext<T extends ts.Node>(sourceFiles: Map<string, ts.SourceFile>, predicate: (node: ts.Node) => node is T): Array<{ node: T; sourceFile: ts.SourceFile; filePath: string }>`

Finds nodes across multiple files and returns them with their source file context.

#### `isErrorCreation(node: ts.Node): boolean`

Checks if a node represents the creation of an Error object.

#### `isPromiseRejection(node: ts.Node): boolean`

Checks if a node represents a Promise rejection call.

#### `isInsideCatchClause(node: ts.Node): boolean`

Determines if a node is located inside a try-catch block's catch clause.

#### `isCustomErrorClass(node: ts.Node): node is ts.ClassDeclaration`

Checks if a node is a class declaration that extends an Error class.

#### `getCustomErrorClassName(node: ts.ClassDeclaration): string | undefined`

Extracts the name of a custom error class.

#### `getFunctionNameFromNode(node: ts.Node): string`

Gets the function name from various types of function nodes, returning "anonymous" if no name is found.

#### `safeGetNodeText(node: ts.Node | undefined): string`

Safely gets the text content of a node, returning empty string if the operation fails.

#### `safeIsArrayBindingPattern(node: ts.Node | undefined): node is ts.ArrayBindingPattern`

Safely checks if a node is an array binding pattern with error handling.

#### `isTestFile(node: ts.Node): boolean`

Determines if a node belongs to a test file based on common test file naming patterns.

#### `isHook(node: ts.Node): node is ts.CallExpression`

Checks if a node represents a React hook call (functions starting with "use").

#### `getHookName(node: ts.CallExpression): string`

Extracts the name of a React hook from a call expression.

#### `isAnalyzableFunction(node: ts.Node, typeChecker: ts.TypeChecker): node is ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction`

Determines if a function node should be included in analysis (excludes React components and test files).

#### `isEventHandler(node: ts.Node): boolean`

Checks if a node represents an event handler based on naming conventions ("handle" or "on" prefix).

#### `isPromiseRelated(node: ts.Node): boolean`

Determines if a node is related to Promise operations or async calls.

## NodeVisitors (`src/utils/ast/nodeVisitors.ts`)

Factory class for creating various TypeScript AST node visitors for analysis and transformation.

### Types

#### `VisitorContext`

Interface containing `sourceFile: ts.SourceFile` and optional `typeChecker: ts.TypeChecker` for visitor context.

#### `NodeVisitor<T>`

Function type `(node: ts.Node, context: VisitorContext) => T | undefined` for visiting nodes.

#### `NodePredicate`

Function type `(node: ts.Node) => boolean` for node filtering predicates.

### Methods

#### `createCollector<T extends ts.Node>(predicate: (node: ts.Node) => node is T): NodeVisitor<T[]>`

Creates a visitor that collects all nodes matching a given predicate into an array.

#### `createTransformer<T extends ts.Node>(predicate: (node: ts.Node) => node is T, transformer: (node: T) => ts.Node): ts.TransformerFactory<ts.Node>`

Creates a TypeScript transformer that modifies nodes matching a predicate using a transformation function.

#### `createDependencyAnalyzer(sourceFile: ts.SourceFile): NodeVisitor<Map<string, Set<string>>>`

Creates a visitor that analyzes dependencies between identifiers in the source file.

#### `createControlFlowAnalyzer(context: VisitorContext): NodeVisitor<Map<ts.Node, Set<ts.Node>>>`

Creates a visitor that builds a control flow graph showing relationships between control flow statements.

#### `createScopeAnalyzer(context: VisitorContext): NodeVisitor<Map<ts.Node, Set<string>>>`

Creates a visitor that analyzes variable scopes within blocks and function-like nodes.

## NodeTypeGuards (`src/utils/ast/nodeTypeGuards.ts`)

Type guard utility class for identifying specific types of TypeScript/React nodes.

### Methods

#### `isComponentDeclaration(node: ts.Node): node is ts.FunctionDeclaration | ts.ClassDeclaration`

Checks if a node is a React component declaration (function or class with capitalized name).

#### `isHookCall(node: ts.Node): node is ts.CallExpression`

Checks if a node represents a React hook call (function starting with "use").

#### `isJsxComponent(node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement`

Checks if a node is a JSX component element with a capitalized tag name.

#### `isEventHandler(node: ts.Node): node is ts.MethodDeclaration | ts.PropertyDeclaration`

Checks if a node is an event handler method or property (name starts with "handle" or "on").

#### `isStateDeclaration(node: ts.Node): node is ts.VariableDeclaration`

Checks if a node is a React useState hook declaration with array destructuring.

#### `isEffectCall(node: ts.Node): node is ts.CallExpression`

Checks if a node is a useEffect or useLayoutEffect hook call.

#### `isMemoCall(node: ts.Node): node is ts.CallExpression`

Checks if a node is a useMemo or useCallback hook call.

#### `isTypeReference(node: ts.Node): node is ts.TypeReferenceNode`

Checks if a node is a TypeScript type reference with an identifier type name.

#### `isAsyncFunction(node: ts.Node): node is ts.FunctionLikeDeclaration`

Checks if a function-like node has the async modifier.

## reactSpecific (`src/utils/ast/reactSpecific.ts`)

Utilities for identifying and analyzing React-specific patterns in TypeScript and Babel AST nodes.

### Functions

#### `isReactComponent(node: ts.Node, typeChecker?: ts.TypeChecker): boolean`

Determines if a TypeScript node represents a React component using type checking and JSX analysis.

#### `isReactComponentDefinition(funcDef: FunctionDefinition): boolean`

Checks if a custom FunctionDefinition object represents a React component based on naming, patterns, and dependencies.

#### `isReactComponentElement(node: t.JSXElement): boolean`

Determines if a Babel JSX element represents a React component (vs HTML element) based on naming convention.

#### `getJSXElementName(name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string`

Extracts the name from various types of JSX element names, handling member expressions and namespaced names.

#### `isHTMLElement(node: t.JSXElement): boolean`

Checks if a JSX element represents an HTML element rather than a React component.

#### `containsJSXPatterns(node: ts.Node): boolean`

Analyzes TypeScript nodes for JSX patterns using text analysis and deep AST traversal.

#### `hasDeepJSXPatterns(node: ts.Node): boolean`

Performs deep JSX pattern analysis by traversing the TypeScript AST for JSX elements and patterns.

#### `containsJSXInExpression(expr: ts.Expression): boolean`

Checks if a TypeScript expression contains JSX, handling complex expressions like conditionals and arrays.

#### `isReactComponentBabel(node: t.Function | t.ArrowFunctionExpression, functionName?: string): boolean`

Babel version that checks if a function node is a React component using JSX detection and naming conventions.

#### `containsJSX(node: t.Node): boolean`

Enhanced JSX detection for Babel AST nodes, handling various expression types and nested JSX patterns.

#### `getBabelFunctionName(node: t.Function | t.ArrowFunctionExpression, parent?: t.Node): string`

Extracts function names from Babel AST nodes considering parent context for arrow functions and expressions.

---

## traversal (`src/utils/ast/traversal.ts`)

Collection of functions for various AST traversal patterns and node navigation operations.

### Basic Traversal Functions

#### `traverseAST(node: ts.Node, callback: (node: ts.Node) => void): void`

Performs depth-first traversal of AST nodes, calling the callback for each node visited.

#### `visitEachChild(node: ts.Node, visitor: (node: ts.Node) => void): void`

Visits only the direct children of a node, not deeper descendants.

#### `walkDescendants(node: ts.Node, predicate?: (node: ts.Node) => boolean): ts.Node[]`

Collects all descendant nodes, optionally filtered by a predicate function.

#### `traverseWithContext<T>(node: ts.Node, visitor: (node: ts.Node, context: T) => void, context: T): void`

Traverses nodes while passing context information to the visitor function.

#### `visitNodesOfKind<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind, visitor: (node: T) => void): void`

Visits only nodes of a specific TypeScript syntax kind.

### Advanced Traversal Functions

#### `traverseDepthFirst(node: ts.Node, visitor: (node: ts.Node) => boolean | void): boolean`

Depth-first traversal with early exit capability when visitor returns false.

#### `traverseBreadthFirst(node: ts.Node, visitor: (node: ts.Node) => void): void`

Breadth-first traversal using a queue-based approach.

#### `visitWithCallback<T>(node: ts.Node, callback: (node: ts.Node) => T | undefined): T[]`

Traverses nodes and collects non-undefined results returned by the callback.

### Navigation Functions

#### `getNodePath(node: ts.Node): ts.Node[]`

Builds an array representing the path from root to the specified node through its ancestors.

#### `getContainingFunction(node: ts.Node): ts.FunctionLikeDeclaration | undefined`

Finds the nearest parent function-like declaration containing the node.

#### `getContainingBlock(node: ts.Node): ts.Block | undefined`

Finds the nearest parent block scope containing the node.

#### `getSourceFileForNode(node: ts.Node, sourceFiles: Map<string, ts.SourceFile>): ts.SourceFile | undefined`

Retrieves the source file that contains the specified node.

#### `getParentOfKind<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T | undefined`

Finds the nearest parent node of a specific TypeScript syntax kind.

#### `getAncestor(node: ts.Node, level: number): ts.Node | undefined`

Gets an ancestor node at a specific level up the parent chain.

#### `navigateToRoot(node: ts.Node): ts.SourceFile`

Navigates to the root SourceFile node by following parent references.

#### `findSiblings(node: ts.Node): ts.Node[]`

Returns all sibling nodes of the specified node (children of the same parent).

### Search and Discovery Functions

#### `findNodes<T extends ts.Node>(sourceFile: ts.SourceFile, predicate: (node: ts.Node) => node is T): T[]`

Finds all nodes matching a type guard predicate within a single source file.

#### `findNodesInFiles<T extends ts.Node>(sourceFiles: Map<string, ts.SourceFile>, predicate: (node: ts.Node) => node is T): Map<string, T[]>`

Finds matching nodes across multiple source files, grouped by file path.

#### `findNearestParent<T extends ts.Node>(node: ts.Node, predicate: (node: ts.Node) => node is T): T | undefined`

Finds the closest parent node matching a type guard predicate.

#### `findReferences(sourceFile: ts.SourceFile, identifier: string): ts.Identifier[]`

Finds all references to a specific identifier within a single source file.

#### `findReferencesInFiles(sourceFiles: Map<string, ts.SourceFile>, identifier: string): Map<string, ts.Identifier[]>`

Finds all references to an identifier across multiple source files.

#### `findNodesWithContext<T extends ts.Node>(sourceFiles: Map<string, ts.SourceFile>, predicate: (node: ts.Node) => node is T): Array<{ node: T; sourceFile: ts.SourceFile; filePath: string }>`

Finds nodes across multiple files and returns them with their source file context.

### React-Specific Functions

#### `findComponentNode(node: ts.Node, componentName: string, typeChecker: ts.TypeChecker): ts.Node | undefined`

Finds a React component node by name, handling function declarations, variable declarations, and export assignments.

### Utility Functions

#### `findIdentifiersInFiles(sourceFiles: Map<string, ts.SourceFile>): Map<string, ts.Identifier[]>`

Collects all identifier nodes across multiple source files.

### Features

- **Multiple Traversal Patterns**: Supports depth-first, breadth-first, and context-aware traversal
- **Early Exit**: Provides mechanisms to stop traversal early based on conditions
- **Type Safety**: Uses TypeScript type guards for type-safe node filtering
- **Multi-File Support**: Many functions work across multiple source files
- **React Integration**: Includes React component discovery capabilities
- **Flexible Filtering**: Supports predicate-based node filtering and collection

### Common Use Cases

- **Code Analysis**: Finding all nodes of specific types for analysis
- **Refactoring**: Locating references and dependencies for safe code changes
- **Linting**: Traversing code to detect patterns and violations
- **Documentation**: Extracting information about code structure and relationships
- **Component Discovery**: Finding React components and their relationships

---

## analysisUtils (`src/utils/common/analysisUtils.ts`)

Collection of utility functions for analyzing TypeScript nodes and detecting React-specific patterns.

### Functions

#### `isNodeCommented(sourceFile: ts.SourceFile, node: ts.Node): boolean`

Checks if a TypeScript node is commented out using either single-line or multi-line comments.

#### `isLikelyFrontendFunction(fileName: string, functionName: string): boolean`

Determines if a function is likely frontend-related based on file name and function name patterns.

#### `isLikelyEventHandler(functionName: string): boolean`

Checks if a function name follows event handler naming conventions (starts with "handle" or "on").

#### `extractDependencies(node: ts.Node): string[]`

Extracts all identifier dependencies from a TypeScript node, excluding property access expressions.

#### `extractCalledFunctions(node: ts.Node): string[]`

Extracts all function calls from a TypeScript node and returns their names as a unique array.

#### `hasJsxReturn(node: ts.Node): boolean`

Recursively checks if a node contains JSX elements in return statements or expressions.

#### `safeNodeText(node: ts.Node | undefined): string`

Safely gets the text content of a node, returning empty string if the operation fails.

#### `serializeJsxElement(node: ts.JsxElement | ts.JsxSelfClosingElement): string`

Safely serializes JSX elements to string representation with error handling.

#### `replacer(key: string, value: any): any`

JSON replacer function that handles TypeScript nodes and Set objects for serialization.

#### `isSimpleSetter(node: ts.Node): boolean`

Checks if an arrow function represents a simple setter pattern for state management.

#### `usesReactHooks(node: ts.Node): boolean`

Recursively checks if a node contains React hook calls (useState, useEffect, etc.).

#### `usesFrontendAPIs(node: ts.Node): boolean`

Checks if a node uses frontend-specific APIs (localStorage, document, window, etc.).

#### `usesThisKeyword(node: ts.Node): boolean`

Recursively checks if a node contains the 'this' keyword.

#### `hasReactSpecificOperations(node: ts.Node): boolean`

Determines if a node contains React-specific operations based on predefined patterns and identifiers.

#### `hasReducerPattern(node: ts.Node): boolean`

Checks if a node implements the reducer pattern by looking for switch statements or if conditions on action.type.

#### `hasStateSpreadPattern(node: ts.Node): boolean`

Checks if a node uses the state spread pattern (e.g., {...state, newProp: value}).

### Types

#### `SerializableFallbackElement`

Serializable version of FallbackElement with string representations of element and condition properties.

#### `SerializableErrorBoundary`

Serializable version of ErrorBoundary with features converted to string array.

## ContentProcessor (`src/utils/common/contentProcessor.ts`)

Utility class for compressing and decompressing React component content using dictionary-based compression.

### Methods

#### `processComponent(component: ComponentRelation): ComponentRelation`

Processes a single component by extracting and compressing its imports, logic, and JSX content.

#### `processComponents(components: ComponentRelation[]): ComponentRelation[]`

Processes an array of components by applying compression to each component's content.

#### `decompressComponent(compressed: string): string`

Decompresses a previously compressed component back to its original readable format.

### Private Methods

#### `extractImports(content: string): string[]`

Extracts all import statements from component content and returns them as compressed strings.

#### `extractLogic(content: string): string`

Extracts function bodies and class methods from component content, excluding imports and declarations.

#### `extractJSX(content: string): string`

Extracts JSX content from return statements in component functions.

#### `compressContent(content: string): string`

Applies dictionary-based compression to content using predefined keyword, pattern, attribute, and style mappings.

### Types

#### `DictionaryMapping`

Object mapping original strings to their compressed representations.

#### `ProcessingDictionary`

Contains compression dictionaries for keywords, patterns, attributes, and styles.

#### `ProcessedContent`

Structure containing compressed dictionary, imports, logic, and JSX content.

## FunctionFilter (`src/utils/common/functionFilter.ts`)

Utility class for determining whether functions should be included in analysis based on size, complexity, and business logic indicators.

### Methods

#### `shouldIncludeFunction(node: ts.Node, functionName: string): boolean`

Determines if a function should be included in analysis based on naming, size, complexity, and business logic patterns.

### Private Methods

#### `hasExcludedNaming(functionName: string): boolean`

Checks if function name matches excluded prefixes (get, set, handle, on) or suffixes (Handler, Listener, Callback).

#### `getFunctionBody(node: ts.Node): string | null`

Extracts the body text from various types of function nodes.

#### `meetsMinimumSize(body: string): boolean`

Checks if function body meets minimum line and statement count requirements.

#### `hasSignificantComplexity(node: ts.Node): boolean`

Calculates cyclomatic complexity by counting control flow statements and logical operators.

#### `hasBusinessLogicPatterns(functionName: string, body: string): boolean`

Checks for business logic patterns like calculate, process, validate, transform, etc.

#### `hasDataProcessingIndicators(body: string): boolean`

Identifies data processing operations like array methods, math operations, and data transformations.

### Configuration

#### Default filtering thresholds:

- **minLines**: 5 lines minimum
- **minStatements**: 3 statements minimum
- **minCyclomaticComplexity**: 2 minimum complexity
- **maxBodyLength**: 2000 characters maximum
- **excludedPrefixes**: ["get", "set", "handle", "on"]
- **excludedSuffixes**: ["Handler", "Listener", "Callback"]

## SeoRelated (`src/utils/common/seoRelatedUtils.ts`)

Utility class for SEO-related operations including route handling, link analysis, and schema.org data processing.

### Methods

#### `extractRouteParams(route: string): string[]`

Extracts dynamic route parameters from a route string (e.g., ":id" from "/users/:id").

#### `isInternalLink(href: string): boolean`

Determines if a link is internal by checking for relative paths or absence of protocol.

#### `getJsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string`

Extracts the lowercase tag name from JSX elements or self-closing elements.

#### `extractStaticValue(node: ts.Expression): string | null`

Extracts static string values from TypeScript expressions, including string literals and template expressions.

#### `extractRouteConstant(text: string): string | null`

Converts route constant references (like "routes.userProfile") to actual path format ("/user-profile").

#### `getCommonElements<T>(arr: T[]): T[]`

Returns array elements that appear more than once in the input array.

#### `calculateAverage(numbers: number[]): number`

Calculates the arithmetic mean of an array of numbers, returning 0 for empty arrays.

#### `getTypeFromThing(thing: Thing | WithContext<Thing>): string`

Extracts the "@type" property from schema.org Thing objects.

### Type Guards

#### `isGraph(schema: WithContext<Thing> | Graph): schema is Graph`

Type guard to check if a schema object is a Graph containing an array of items.

#### `isThingWithType(item: unknown): item is Thing`

Type guard to verify if an unknown object is a valid Thing with a "@type" property.

## PathUtils (`src/utils/common/pathUtils.ts`)

Utility class for file path operations and file system interactions.

### Static Methods

#### `normalizePath(filePath: string): string`

Normalizes file paths to use forward slashes consistently across platforms.

#### `getRelativePath(from: string, to: string): string`

Calculates the relative path from one absolute path to another.

#### `isAbsolutePath(filePath: string): boolean`

Checks if a given path is absolute.

#### `getDirectory(filePath: string): string`

Extracts the directory portion of a file path.

#### `getFileName(filePath: string): string`

Gets the file name without extension from a path.

#### `getFileExtension(filePath: string): string`

Extracts the file extension from a path.

#### `joinPaths(...paths: string[]): string`

Joins multiple path segments into a single normalized path.

#### `resolvePath(...paths: string[]): string`

Resolves path segments to an absolute path.

#### `isWithinDirectory(directory: string, filePath: string): boolean`

Checks if a file path is contained within a specified directory.

#### `isSourceFile(filePath: string): boolean`

Determines if a file is a TypeScript or JavaScript source file based on extension.

### Async Functions

#### `calculateFileHash(filePath: string): Promise<string>`

Calculates SHA-256 hash of a file's contents for integrity checking.

#### `ensureDirectoryExists(dirPath: string): Promise<void>`

Creates a directory recursively if it doesn't exist.

#### `readJsonFile(filePath: string): Promise<any>`

Reads and parses a JSON file asynchronously.

#### `writeJsonFile(filePath: string, data: any): Promise<void>`

Writes data to a JSON file with pretty formatting.

### Utility Functions

#### `extractPackageName(importPath: string): string | null`

Extracts package names from import paths, handling scoped packages (returns null for relative imports).

#### `isPathAlias(path: string): boolean`

Checks if a path uses alias patterns like "@/", "~/", "#/", "src/", "./", or "../".

## ValidationUtils (`src/utils/common/validationUtils.ts`)

Utility class providing comprehensive validation functions for component relations and data structures.

### Methods

#### `validateComponentRelation(component: ComponentRelation): void`

Validates that a component relation object has all required properties (name, fullPath, usedBy, imports, exports).

#### `validateComponentRelations(components: ComponentRelation[]): void`

Validates an array of component relations, checking for duplicates and cross-references between components.

#### `validateSourceFile(filePath: string): boolean`

Validates that a file path exists and has a valid TypeScript/JavaScript extension (.ts, .tsx, .js, .jsx).

#### `validateRequiredProperties<T extends object>(obj: T, requiredProps: (keyof T)[]): void`

Generic function to validate that an object contains all required properties and they are not null/undefined.

#### `validateNonEmptyString(value: string, fieldName: string): void`

Ensures a string value is not empty or only whitespace.

#### `validateNonEmptyArray<T>(array: T[] | undefined | null, arrayName: string): void`

Validates that an array exists and contains at least one element.

#### `validateRange(value: number, min: number, max: number, fieldName: string): void`

Checks that a numeric value falls within the specified minimum and maximum range.

#### `isDefined<T>(value: T | null | undefined): value is T`

Type guard that checks if a value is not null or undefined.

#### `validateObjectStructure<T extends object>(obj: unknown, validator: (obj: unknown) => obj is T): T`

Validates an object's structure using a provided type guard validator function.

## StateAnalysisUtils (`src/utils/common/stateAnalysisUtils.ts`)

Utility class for analyzing state management patterns in TypeScript code, including Redux actions and state selectors.

### Methods

#### `findStatesInSelector(node: ts.Node): string[]`

Analyzes a selector function and extracts all state property paths referenced within it.

#### `extractActionType(node: ts.Node, findActionCreator?: (name: string) => ts.Node | undefined): string | undefined`

Extracts action types from various action patterns including object literals, action creators, and type aliases.

#### `isActionType(node: ts.Node): boolean`

Determines if a TypeScript node represents an action type definition.

#### `getFullActionType(node: ts.Node): string | undefined`

Gets the complete action type including namespace if present (e.g., "UserActions.UPDATE_PROFILE").

#### `buildStatePath(node: ts.PropertyAccessExpression): string`

Constructs a dot-notation path string from a property access expression (e.g., "state.user.profile").

#### `isStateAccess(path: string, storeDefinitions?: Map<string, any>): boolean`

Determines if a property path represents state access using predefined patterns and optional store definitions.

### Private Methods

#### `extractTypeFromInitializer(initializer: ts.Expression): string | undefined`

Extracts type information from various expression initializers including literals and property access.

#### `isKnownStatePattern(path: string): boolean`

Checks if a path matches known state access patterns using regex matching.

### Features

- **Action Type Extraction**: Supports various action creator patterns including Redux Toolkit's `createAction`
- **State Path Analysis**: Builds complete state access paths from property chains
- **Pattern Recognition**: Uses predefined patterns from `STATE_PATTERNS` constants for state identification
- **Store Integration**: Can leverage store definitions for more accurate state detection

---

## analysisUtils (`src/utils/common/analysisUtils.ts`)

Collection of utility functions for analyzing TypeScript nodes and detecting React-specific patterns.

### Functions

#### `isNodeCommented(sourceFile: ts.SourceFile, node: ts.Node): boolean`

Checks if a TypeScript node is commented out using either single-line or multi-line comments.

#### `isLikelyFrontendFunction(fileName: string, functionName: string): boolean`

Determines if a function is likely frontend-related based on file name and function name patterns.

#### `isLikelyEventHandler(functionName: string): boolean`

Checks if a function name follows event handler naming conventions (starts with "handle" or "on").

#### `extractDependencies(node: ts.Node): string[]`

Extracts all identifier dependencies from a TypeScript node, excluding property access expressions.

#### `extractCalledFunctions(node: ts.Node): string[]`

Extracts all function calls from a TypeScript node and returns their names as a unique array.

#### `hasJsxReturn(node: ts.Node): boolean`

Recursively checks if a node contains JSX elements in return statements or expressions.

#### `safeNodeText(node: ts.Node | undefined): string`

Safely gets the text content of a node, returning empty string if the operation fails.

#### `serializeJsxElement(node: ts.JsxElement | ts.JsxSelfClosingElement): string`

Safely serializes JSX elements to string representation with error handling.

#### `replacer(key: string, value: any): any`

JSON replacer function that handles TypeScript nodes and Set objects for serialization.

#### `isSimpleSetter(node: ts.Node): boolean`

Checks if an arrow function represents a simple setter pattern for state management.

#### `usesReactHooks(node: ts.Node): boolean`

Recursively checks if a node contains React hook calls (useState, useEffect, etc.).

#### `usesFrontendAPIs(node: ts.Node): boolean`

Checks if a node uses frontend-specific APIs (localStorage, document, window, etc.).

#### `usesThisKeyword(node: ts.Node): boolean`

Recursively checks if a node contains the 'this' keyword.

#### `hasReactSpecificOperations(node: ts.Node): boolean`

Determines if a node contains React-specific operations based on predefined patterns and identifiers.

#### `hasReducerPattern(node: ts.Node): boolean`

Checks if a node implements the reducer pattern by looking for switch statements or if conditions on action.type.

#### `hasStateSpreadPattern(node: ts.Node): boolean`

Checks if a node uses the state spread pattern (e.g., {...state, newProp: value}).

### Types

#### `SerializableFallbackElement`

Serializable version of FallbackElement with string representations of element and condition properties.

#### `SerializableErrorBoundary`

Serializable version of ErrorBoundary with features converted to string array.

## ContentProcessor (`src/utils/common/contentProcessor.ts`)

Utility class for compressing and decompressing React component content using dictionary-based compression.

### Methods

#### `processComponent(component: ComponentRelation): ComponentRelation`

Processes a single component by extracting and compressing its imports, logic, and JSX content.

#### `processComponents(components: ComponentRelation[]): ComponentRelation[]`

Processes an array of components by applying compression to each component's content.

#### `decompressComponent(compressed: string): string`

Decompresses a previously compressed component back to its original readable format.

### Private Methods

#### `extractImports(content: string): string[]`

Extracts all import statements from component content and returns them as compressed strings.

#### `extractLogic(content: string): string`

Extracts function bodies and class methods from component content, excluding imports and declarations.

#### `extractJSX(content: string): string`

Extracts JSX content from return statements in component functions.

#### `compressContent(content: string): string`

Applies dictionary-based compression to content using predefined keyword, pattern, attribute, and style mappings.

### Types

#### `DictionaryMapping`

Object mapping original strings to their compressed representations.

#### `ProcessingDictionary`

Contains compression dictionaries for keywords, patterns, attributes, and styles.

#### `ProcessedContent`

Structure containing compressed dictionary, imports, logic, and JSX content.

## FunctionFilter (`src/utils/common/functionFilter.ts`)

Utility class for determining whether functions should be included in analysis based on size, complexity, and business logic indicators.

### Methods

#### `shouldIncludeFunction(node: ts.Node, functionName: string): boolean`

Determines if a function should be included in analysis based on naming, size, complexity, and business logic patterns.

### Private Methods

#### `hasExcludedNaming(functionName: string): boolean`

Checks if function name matches excluded prefixes (get, set, handle, on) or suffixes (Handler, Listener, Callback).

#### `getFunctionBody(node: ts.Node): string | null`

Extracts the body text from various types of function nodes.

#### `meetsMinimumSize(body: string): boolean`

Checks if function body meets minimum line and statement count requirements.

#### `hasSignificantComplexity(node: ts.Node): boolean`

Calculates cyclomatic complexity by counting control flow statements and logical operators.

#### `hasBusinessLogicPatterns(functionName: string, body: string): boolean`

Checks for business logic patterns like calculate, process, validate, transform, etc.

#### `hasDataProcessingIndicators(body: string): boolean`

Identifies data processing operations like array methods, math operations, and data transformations.

### Configuration

#### Default filtering thresholds:

- **minLines**: 5 lines minimum
- **minStatements**: 3 statements minimum
- **minCyclomaticComplexity**: 2 minimum complexity
- **maxBodyLength**: 2000 characters maximum
- **excludedPrefixes**: ["get", "set", "handle", "on"]
- **excludedSuffixes**: ["Handler", "Listener", "Callback"]

## SeoRelated (`src/utils/common/seoRelatedUtils.ts`)

Utility class for SEO-related operations including route handling, link analysis, and schema.org data processing.

### Methods

#### `extractRouteParams(route: string): string[]`

Extracts dynamic route parameters from a route string (e.g., ":id" from "/users/:id").

#### `isInternalLink(href: string): boolean`

Determines if a link is internal by checking for relative paths or absence of protocol.

#### `getJsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string`

Extracts the lowercase tag name from JSX elements or self-closing elements.

#### `extractStaticValue(node: ts.Expression): string | null`

Extracts static string values from TypeScript expressions, including string literals and template expressions.

#### `extractRouteConstant(text: string): string | null`

Converts route constant references (like "routes.userProfile") to actual path format ("/user-profile").

#### `getCommonElements<T>(arr: T[]): T[]`

Returns array elements that appear more than once in the input array.

#### `calculateAverage(numbers: number[]): number`

Calculates the arithmetic mean of an array of numbers, returning 0 for empty arrays.

#### `getTypeFromThing(thing: Thing | WithContext<Thing>): string`

Extracts the "@type" property from schema.org Thing objects.

### Type Guards

#### `isGraph(schema: WithContext<Thing> | Graph): schema is Graph`

Type guard to check if a schema object is a Graph containing an array of items.

#### `isThingWithType(item: unknown): item is Thing`

Type guard to verify if an unknown object is a valid Thing with a "@type" property.

## PathUtils (`src/utils/common/pathUtils.ts`)

Utility class for file path operations and file system interactions.

### Static Methods

#### `normalizePath(filePath: string): string`

Normalizes file paths to use forward slashes consistently across platforms.

#### `getRelativePath(from: string, to: string): string`

Calculates the relative path from one absolute path to another.

#### `isAbsolutePath(filePath: string): boolean`

Checks if a given path is absolute.

#### `getDirectory(filePath: string): string`

Extracts the directory portion of a file path.

#### `getFileName(filePath: string): string`

Gets the file name without extension from a path.

#### `getFileExtension(filePath: string): string`

Extracts the file extension from a path.

#### `joinPaths(...paths: string[]): string`

Joins multiple path segments into a single normalized path.

#### `resolvePath(...paths: string[]): string`

Resolves path segments to an absolute path.

#### `isWithinDirectory(directory: string, filePath: string): boolean`

Checks if a file path is contained within a specified directory.

#### `isSourceFile(filePath: string): boolean`

Determines if a file is a TypeScript or JavaScript source file based on extension.

### Async Functions

#### `calculateFileHash(filePath: string): Promise<string>`

Calculates SHA-256 hash of a file's contents for integrity checking.

#### `ensureDirectoryExists(dirPath: string): Promise<void>`

Creates a directory recursively if it doesn't exist.

#### `readJsonFile(filePath: string): Promise<any>`

Reads and parses a JSON file asynchronously.

#### `writeJsonFile(filePath: string, data: any): Promise<void>`

Writes data to a JSON file with pretty formatting.

### Utility Functions

#### `extractPackageName(importPath: string): string | null`

Extracts package names from import paths, handling scoped packages (returns null for relative imports).

#### `isPathAlias(path: string): boolean`

Checks if a path uses alias patterns like "@/", "~/", "#/", "src/", "./", or "../".

## ValidationUtils (`src/utils/common/validationUtils.ts`)

Utility class providing comprehensive validation functions for component relations and data structures.

### Methods

#### `validateComponentRelation(component: ComponentRelation): void`

Validates that a component relation object has all required properties (name, fullPath, usedBy, imports, exports).

#### `validateComponentRelations(components: ComponentRelation[]): void`

Validates an array of component relations, checking for duplicates and cross-references between components.

#### `validateSourceFile(filePath: string): boolean`

Validates that a file path exists and has a valid TypeScript/JavaScript extension (.ts, .tsx, .js, .jsx).

#### `validateRequiredProperties<T extends object>(obj: T, requiredProps: (keyof T)[]): void`

Generic function to validate that an object contains all required properties and they are not null/undefined.

#### `validateNonEmptyString(value: string, fieldName: string): void`

Ensures a string value is not empty or only whitespace.

#### `validateNonEmptyArray<T>(array: T[] | undefined | null, arrayName: string): void`

Validates that an array exists and contains at least one element.

#### `validateRange(value: number, min: number, max: number, fieldName: string): void`

Checks that a numeric value falls within the specified minimum and maximum range.

#### `isDefined<T>(value: T | null | undefined): value is T`

Type guard that checks if a value is not null or undefined.

#### `validateObjectStructure<T extends object>(obj: unknown, validator: (obj: unknown) => obj is T): T`

Validates an object's structure using a provided type guard validator function.

## StateAnalysisUtils (`src/utils/common/stateAnalysisUtils.ts`)

Utility class for analyzing state management patterns in TypeScript code, including Redux actions and state selectors.

### Methods

#### `findStatesInSelector(node: ts.Node): string[]`

Analyzes a selector function and extracts all state property paths referenced within it.

#### `extractActionType(node: ts.Node, findActionCreator?: (name: string) => ts.Node | undefined): string | undefined`

Extracts action types from various action patterns including object literals, action creators, and type aliases.

#### `isActionType(node: ts.Node): boolean`

Determines if a TypeScript node represents an action type definition.

#### `getFullActionType(node: ts.Node): string | undefined`

Gets the complete action type including namespace if present (e.g., "UserActions.UPDATE_PROFILE").

#### `buildStatePath(node: ts.PropertyAccessExpression): string`

Constructs a dot-notation path string from a property access expression (e.g., "state.user.profile").

#### `isStateAccess(path: string, storeDefinitions?: Map<string, any>): boolean`

Determines if a property path represents state access using predefined patterns and optional store definitions.

### Private Methods

#### `extractTypeFromInitializer(initializer: ts.Expression): string | undefined`

Extracts type information from various expression initializers including literals and property access.

#### `isKnownStatePattern(path: string): boolean`

Checks if a path matches known state access patterns using regex matching.

### Features

- **Action Type Extraction**: Supports various action creator patterns including Redux Toolkit's `createAction`
- **State Path Analysis**: Builds complete state access paths from property chains
- **Pattern Recognition**: Uses predefined patterns from `STATE_PATTERNS` constants for state identification
- **Store Integration**: Can leverage store definitions for more accurate state detection

## RiskAnalysisUtils (`src/utils/common/riskAnalysisUtils.ts`)

Utility class for identifying high-risk operations and patterns in TypeScript code that may require error handling.

### Methods

#### `isFileSystemOperation(node: ts.Node): boolean`

Detects file system operations like readFile, writeFile, createReadStream, and other fs module calls.

#### `isNetworkRequest(node: ts.Node): boolean`

Identifies network requests including fetch, axios, HTTP calls, and REST API operations.

#### `isDataParsing(node: ts.Node): boolean`

Detects data parsing operations like JSON.parse, JSON.stringify, and other serialization/deserialization calls.

#### `isExternalAPICall(node: ts.Node): boolean`

Identifies calls to external APIs through common client patterns (api., client., service., GraphQL, REST).

#### `isDatabaseOperation(node: ts.Node): boolean`

Detects database operations including queries, transactions, and ORM calls (Prisma, Sequelize, Mongoose).

#### `isStateUpdate(node: ts.Node): boolean`

Identifies state update operations including useState setters, Redux dispatch, and mutation calls.

#### `isComplexCalculation(node: ts.Node): boolean`

Analyzes nodes for complex mathematical operations and calculations that might fail or produce unexpected results.

#### `isThirdPartyLibraryCall(node: ts.Node): boolean`

Detects calls to third-party libraries that commonly throw errors (lodash, moment, validation libraries).

#### `isDataTransformation(node: ts.Node): boolean`

Identifies data transformation operations like map, reduce, filter, and format operations.

---

## RiskAnalysisUtils (`src/utils/common/riskAnalysisUtils.ts`)

Utility class for identifying high-risk operations and patterns in TypeScript code that may require error handling.

### Methods

#### `isFileSystemOperation(node: ts.Node): boolean`

Detects file system operations like readFile, writeFile, createReadStream, and other fs module calls.

#### `isNetworkRequest(node: ts.Node): boolean`

Identifies network requests including fetch, axios, HTTP calls, and REST API operations.

#### `isDataParsing(node: ts.Node): boolean`

Detects data parsing operations like JSON.parse, JSON.stringify, and other serialization/deserialization calls.

#### `isExternalAPICall(node: ts.Node): boolean`

Identifies calls to external APIs through common client patterns (api., client., service., GraphQL, REST).

#### `isDatabaseOperation(node: ts.Node): boolean`

Detects database operations including queries, transactions, and ORM calls (Prisma, Sequelize, Mongoose).

#### `isStateUpdate(node: ts.Node): boolean`

Identifies state update operations including useState setters, Redux dispatch, and mutation calls.

#### `isComplexCalculation(node: ts.Node): boolean`

Analyzes nodes for complex mathematical operations and calculations that might fail or produce unexpected results.

#### `isThirdPartyLibraryCall(node: ts.Node): boolean`

Detects calls to third-party libraries that commonly throw errors (lodash, moment, validation libraries).

#### `isDataTransformation(node: ts.Node): boolean`

Identifies data transformation operations like map, reduce, filter, and format operations.

---

## ErrorPatternUtils (`src/utils/error_specific/errorPatternUtils.ts`)

Utility class for detecting error handling patterns, error boundaries, and error-related UI components in React/TypeScript code.

### Methods

#### `isErrorRelatedName(name: string): boolean`

Checks if a variable or function name is error-related by matching patterns like "error", "err", "exception", "fail".

#### `isErrorLoggingCall(text: string): boolean`

Detects error logging function calls including console.error, logger.error, captureException, and monitoring calls.

#### `isLikelyErrorBoundary(node: ts.JsxElement | ts.JsxSelfClosingElement): boolean`

Analyzes JSX elements to determine if they represent React error boundaries based on naming and props.

#### `extractJsxProps(node: ts.JsxElement | ts.JsxSelfClosingElement): Record<string, any>`

Safely extracts all props from JSX elements, handling both attributes and expression containers.

#### `isErrorStateSetter(name: string): boolean`

Identifies React state setters that are specifically for error state (e.g., "setError", "setIsError").

#### `getStateNameFromSetter(setter: string): string`

Converts a setter function name to its corresponding state variable name (e.g., "setError" → "error").

#### `isFallbackElement(node: ts.JsxElement | ts.JsxSelfClosingElement): boolean`

Determines if a JSX element represents error fallback UI based on component names and error-related props.

### Pattern Recognition

#### Error Boundary Patterns:

- **Component Names**: ErrorBoundary, ErrorHandler, ErrorWrapper, ErrorContainer, ErrorFallback
- **Props**: fallback, FallbackComponent, onError, handleError, errorComponent, renderError

#### Fallback Element Patterns:

- **Component Names**: Error, Fallback, ErrorMessage, ErrorState, ErrorDisplay
- **Props**: error, isError, hasError, onRetry, errorMessage

#### Logging Patterns:

- console.error, logger.error, logError, reportError, captureException, trackError, monitor

---

## ValueEvaluator (`src/utils/evaluation/valueEvaluator.ts`)

Static utility class for evaluating TypeScript expressions to extract their runtime values.

### Methods

#### `evaluateExpression(node: ts.Expression): any`

Evaluates a TypeScript expression and returns its value for literals, arrays, objects, and simple operations.

#### `getInitialValue(node: ts.VariableDeclaration): any`

Extracts the initial value from a variable declaration's initializer expression.

#### `getDefaultParameterValue(node: ts.ParameterDeclaration): any`

Gets the default value from a function parameter declaration.

#### `getEnumMemberValue(node: ts.EnumMember): number | string | undefined`

Evaluates and returns the value of an enum member.

### Private Methods

#### `evaluateBinaryExpression(node: ts.BinaryExpression): any`

Handles arithmetic, logical, and comparison operations between two operands.

#### `evaluatePrefixUnaryExpression(node: ts.PrefixUnaryExpression): any`

Evaluates unary operations like negation, logical NOT, and bitwise NOT.

### Supported Expression Types

- **Literals**: String, number, boolean, null, undefined
- **Arrays**: Array literal expressions with evaluated elements
- **Objects**: Object literal expressions with evaluated properties
- **Binary Operations**: Arithmetic (+, -, \*, /, %), logical (&&, ||), comparison (==, ===, !=, !==, <, <=, >, >=)
- **Unary Operations**: +, -, !, ~ operators

## TypeEvaluator (`src/utils/evaluation/typeEvaluator.ts`)

Utility class for evaluating and analyzing TypeScript types using the TypeScript compiler's type checker.

### Constructor

#### `constructor(typeChecker: ts.TypeChecker)`

Requires a TypeScript type checker instance for type analysis.

### Methods

#### `evaluateType(node: ts.Node): string`

Gets the type string representation for any TypeScript node.

#### `extractTypeProperties(type: ts.TypeNode): Record<string, string>`

Extracts property names and their types from interface or type literal nodes.

#### `evaluateUnionType(type: ts.UnionTypeNode): string[]`

Returns an array of type strings for each component of a union type.

#### `getFunctionReturnType(node: ts.FunctionLikeDeclaration): string | undefined`

Determines the return type of functions, methods, and arrow functions.

#### `getFunctionParameterTypes(node: ts.FunctionLikeDeclaration): Record<string, string>`

Returns a mapping of parameter names to their type strings.

#### `getBaseTypes(node: ts.ClassDeclaration | ts.InterfaceDeclaration): string[]`

Extracts base class or extended interface types from heritage clauses.

#### `isTypeAssignableTo(source: ts.Node, target: ts.Node): boolean`

Checks if one type can be assigned to another using TypeScript's type compatibility rules.

#### `getTypeArguments(node: ts.TypeReferenceNode): string[]`

Extracts generic type arguments from type reference nodes.

#### `getInferredType(node: ts.Node): string`

Gets the TypeScript compiler's inferred type for a node.

#### `isPromiseType(node: ts.Node): boolean`

Determines if a node's type is a Promise type.

#### `getDeclaredType(declaration: ts.VariableDeclaration | ts.ParameterDeclaration): string | undefined`

Gets the explicitly declared type annotation from variable or parameter declarations.

### Private Methods

#### `getTypeString(type: ts.TypeNode): string`

Converts various TypeNode types to their string representations, handling type references, literals, unions, and arrays.

### Features

- **Type Analysis**: Comprehensive type information extraction using TypeScript's type system
- **Generic Support**: Handles generic types and type arguments
- **Union Types**: Analyzes and decomposes union type components
- **Inheritance**: Tracks class and interface inheritance relationships
- **Type Compatibility**: Leverages TypeScript's assignability checking

---
