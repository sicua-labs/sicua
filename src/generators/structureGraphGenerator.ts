import * as path from "path";
import { IConfigManager, ScanResult } from "../types";
import { getNodeSize, getNodeColor } from "./graphFormatUtils";
import {
  FileSystemNode,
  FileSystemEdge,
  StructureScanResult,
  FileStructureGraph,
} from "../types/structureDiagram.types";

interface StructureGraphCache {
  structureNodes: FileSystemNode[];
  structureEdges: FileSystemEdge[];
  structureScan: StructureScanResult;
  hash: string; // Hash to verify cache validity
}

const STRUCTURE_GENERATOR_VERSION = "1.0.1";
let structureGraphCache: StructureGraphCache | null = null;

/**
 * Normalizes file paths to be relative to the project root
 * @param filePath The absolute file path
 * @param projectPath The absolute project path
 * @returns Project-relative path
 */
function normalizeFilePath(filePath: string, projectPath: string): string {
  // Make sure paths use consistent separators
  const normalizedFilePath = filePath.replace(/\\/g, "/");
  const normalizedProjectPath = projectPath.replace(/\\/g, "/");

  // Make the path relative to project root
  if (normalizedFilePath.startsWith(normalizedProjectPath)) {
    return normalizedFilePath
      .substring(normalizedProjectPath.length)
      .replace(/^\/+/, ""); // Remove leading slashes
  }

  return normalizedFilePath;
}

/**
 * Calculate directory depth from a normalized path
 * @param normalizedPath The path relative to project root
 * @returns The directory depth (number of path segments)
 */
function calculateDirectoryDepth(normalizedPath: string): number {
  // Split the path by separator and filter out empty segments
  const pathSegments = normalizedPath
    .split("/")
    .filter((segment) => segment.length > 0);
  // Return the number of segments, which represents the depth
  return pathSegments.length;
}

/**
 * Safely gets all parent directories from a file path, handling Windows paths correctly
 * @param filePath The file path to extract directories from
 * @param projectPath The project root path for normalization
 * @returns Array of directory paths (excluding root)
 */
function getAllParentDirectories(
  filePath: string,
  projectPath: string
): string[] {
  const directories: string[] = [];
  const normalizedFilePath = normalizeFilePath(filePath, projectPath);

  // Start with the immediate directory
  let currentDir = path.dirname(normalizedFilePath);

  // Keep extracting parent directories until we reach the root
  while (currentDir && currentDir !== "." && currentDir !== "/") {
    directories.push(currentDir);
    // Get the parent directory
    const parentDir = path.dirname(currentDir);

    // Break if we're stuck at the same level (safeguard)
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return directories;
}

/**
 * Generates a simple hash from the file paths to verify cache validity
 * @param filePaths Array of file paths
 * @returns A hash string
 */
function generatePathsHash(filePaths: string[]): string {
  // Take the first, middle and last file paths as a simple hash
  if (filePaths.length === 0) return "empty";

  const first = filePaths[0];
  const middle = filePaths[Math.floor(filePaths.length / 2)];
  const last = filePaths[filePaths.length - 1];

  return `${filePaths.length}-${first.length}${middle.length}${last.length}`;
}

/**
 * Checks if a file is a Next.js special file
 * @param fileName The file name
 * @returns True if it's a Next.js special file
 */
function isNextSpecialFile(fileName: string): boolean {
  return (
    fileName === "middleware.js" ||
    fileName === "middleware.ts" ||
    fileName === "instrumentation.js" ||
    fileName === "instrumentation.ts" ||
    fileName === "global-error.js" ||
    fileName === "global-error.tsx" ||
    fileName === "default.js" ||
    fileName === "default.tsx" ||
    fileName === "route.js" ||
    fileName === "route.ts"
  );
}

/**
 * Checks if a directory is a Next.js dynamic route segment
 * @param dirName The directory name
 * @returns True if it's a dynamic route segment
 */
function isNextDynamicRouteSegment(dirName: string): boolean {
  // Check for dynamic route patterns: [param], [...param], [[...param]]
  return /^\[.+\]$/.test(dirName);
}

/**
 * Gets the type of dynamic route segment
 * @param dirName The directory name
 * @returns The type of dynamic route segment or undefined
 */
function getDynamicRouteType(dirName: string): string | undefined {
  if (dirName.startsWith("[[...") && dirName.endsWith("]]")) {
    return "optional-catch-all"; // [[...param]]
  } else if (dirName.startsWith("[...") && dirName.endsWith("]")) {
    return "catch-all"; // [...param]
  } else if (dirName.startsWith("[") && dirName.endsWith("]")) {
    return "dynamic"; // [param]
  }
  return undefined;
}

/**
 * Checks if a file is a Next.js route file
 * @param filePath The file path
 * @param fileName The file name
 * @returns True if it's a Next.js route file
 */
function isNextRouteFile(filePath: string, fileName: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return (
    (normalizedPath.includes("/app/") || normalizedPath.includes("\\app\\")) &&
    (fileName === "page.js" ||
      fileName === "page.tsx" ||
      fileName === "layout.js" ||
      fileName === "layout.tsx" ||
      fileName === "loading.js" ||
      fileName === "loading.tsx" ||
      fileName === "error.js" ||
      fileName === "error.tsx" ||
      fileName === "not-found.js" ||
      fileName === "not-found.tsx" ||
      fileName === "route.js" ||
      fileName === "route.ts" ||
      fileName === "default.js" ||
      fileName === "default.tsx")
  );
}

/**
 * Determines the route type from file name
 * @param fileName The file name
 * @returns The route type or undefined
 */
function getRouteType(fileName: string): string | undefined {
  if (fileName.startsWith("page.")) return "page";
  if (fileName.startsWith("layout.")) return "layout";
  if (fileName.startsWith("loading.")) return "loading";
  if (fileName.startsWith("error.")) return "error";
  if (fileName.startsWith("not-found.")) return "not-found";
  if (fileName.startsWith("route.")) return "api";
  if (fileName.startsWith("default.")) return "default";
  return undefined;
}

/**
 * Extracts structure information with optimized performance and cross-platform compatibility
 * @param scanResult The scan result containing file paths
 * @param config The application configuration
 * @returns Structured data about directories and files
 */
function extractStructureInfo(
  scanResult: ScanResult,
  config: IConfigManager
): StructureScanResult {
  const directories = new Map<
    string,
    {
      path: string;
      depth: number;
      childDirs: string[];
      childFiles: string[];
      isDynamicRoute?: boolean;
      dynamicRouteType?: string;
    }
  >();

  const files = new Map<
    string,
    {
      path: string;
      name: string;
      extension: string;
      size?: number;
      isNextRoute: boolean;
      routeType?: string;
      isNextSpecialFile: boolean;
      fileDepth: number;
    }
  >();

  try {
    // First pass: Collect all directories using batched processing
    const allDirectories = new Set<string>();
    const BATCH_SIZE = 100; // Larger batch size for production

    for (let i = 0; i < scanResult.filePaths.length; i += BATCH_SIZE) {
      const batch = scanResult.filePaths.slice(i, i + BATCH_SIZE);

      for (const filePath of batch) {
        const normalizedPath = normalizeFilePath(filePath, config.projectPath);
        const dirPaths = getAllParentDirectories(filePath, config.projectPath);
        for (const dirPath of dirPaths) {
          allDirectories.add(dirPath);
        }
        // Add the immediate directory too
        const immediateDir = path.dirname(normalizedPath);
        if (immediateDir !== "." && immediateDir !== "/") {
          allDirectories.add(immediateDir);
        }
      }
    }

    // Second pass: Create directory objects
    allDirectories.forEach((dirPath) => {
      const dirName = path.basename(dirPath);

      // Check if it's a dynamic route
      const isDynamicRoute = isNextDynamicRouteSegment(dirName);
      const dynamicRouteType = isDynamicRoute
        ? getDynamicRouteType(dirName)
        : undefined;

      directories.set(dirPath, {
        path: dirPath,
        depth: calculateDirectoryDepth(dirPath),
        childDirs: [],
        childFiles: [],
        isDynamicRoute,
        dynamicRouteType,
      });
    });

    // Third pass: Process files and setup relationships
    for (const filePath of scanResult.filePaths) {
      try {
        const normalizedPath = normalizeFilePath(filePath, config.projectPath);
        const fileName = path.basename(normalizedPath);
        const fileExt = path.extname(normalizedPath).replace(".", "");
        const dirPath = path.dirname(normalizedPath);

        // Optimize checks by using helper functions
        const isNextRoute = isNextRouteFile(normalizedPath, fileName);
        const routeType = isNextRoute ? getRouteType(fileName) : undefined;
        const isNextSpecialFileValue = isNextSpecialFile(fileName);
        const fileDepth = calculateDirectoryDepth(dirPath);

        // Add file to map
        files.set(normalizedPath, {
          path: normalizedPath,
          name: fileName,
          extension: fileExt,
          isNextRoute,
          routeType,
          isNextSpecialFile: isNextSpecialFileValue,
          fileDepth,
        });

        // Add file to parent directory's childFiles
        const dirData = directories.get(dirPath);
        if (dirData) {
          dirData.childFiles.push(normalizedPath);
        }
      } catch (err) {
        // Silently continue in production to avoid console spam
        // Uncomment for debugging: console.error(`Error processing file ${filePath}:`, err);
      }
    }

    // Fourth pass: Setup directory parent-child relationships
    directories.forEach((dir, dirPath) => {
      const parentDir = path.dirname(dirPath);
      if (
        parentDir !== dirPath &&
        parentDir !== "." &&
        directories.has(parentDir)
      ) {
        const parent = directories.get(parentDir);
        if (parent && !parent.childDirs.includes(dirPath)) {
          parent.childDirs.push(dirPath);
        }
      }
    });
  } catch (err) {
    console.error(`Error in structure info extraction:`, err);
  }

  return { directories, files };
}

/**
 * Generate structure graph data for Sigma.js visualization
 * @param scanResult The scan result containing file paths and contents
 * @param config The application configuration
 * @returns An object with a method to get the structure graph data
 */
export function generateStructureGraphData(
  scanResult: ScanResult,
  config: IConfigManager
): {
  getStructureData: () => FileStructureGraph;
} {
  // Create a hash from the file paths to verify cache validity
  const currentHash = generatePathsHash(scanResult.filePaths);

  // If we have valid cached data, return it
  if (
    structureGraphCache &&
    isValidStructureCache(scanResult) &&
    structureGraphCache.hash === currentHash
  ) {
    return createStructureReturnObject(structureGraphCache);
  }

  // Extract structure information
  const structureScan = extractStructureInfo(scanResult, config);

  // Generate nodes and edges
  const structureNodes: FileSystemNode[] = [];
  const structureEdges: FileSystemEdge[] = [];

  // Create directory nodes
  try {
    structureScan.directories.forEach((dir, dirPath) => {
      try {
        const dirName = path.basename(dirPath);
        const parentPath = path.dirname(dirPath);

        // Check if this directory contains Next.js route files or is part of a route
        const isNextRoute =
          dir.childFiles.some(
            (file) => structureScan.files.get(file)?.isNextRoute
          ) || dirPath.includes("/app/");

        // Determine if this is a dynamic route segment
        const isDynamicRoute = dir.isDynamicRoute || false;
        const dynamicRouteType = dir.dynamicRouteType;

        // Enhance color selection for dynamic routes
        let nodeColor = isNextRoute ? "#4CAF50" : "#9E9E9E"; // Green for Next.js routes, gray for regular dirs

        // Special coloring for dynamic routes
        if (isDynamicRoute) {
          nodeColor = "#E91E63"; // Pink for dynamic routes
        }

        const node: FileSystemNode = {
          id: dirPath,
          label: dirName,
          isDirectory: true,
          depth: calculateDirectoryDepth(dirPath),
          childCount: dir.childDirs.length + dir.childFiles.length,
          parentId:
            parentPath !== dirPath && parentPath !== "." && parentPath !== ""
              ? parentPath
              : undefined,
          fullPath: dirPath,
          fileName: dirName,
          x: Math.random() * 100, // Random initial position
          y: Math.random() * 100, // Random initial position
          size: 8 + Math.min(5, dir.childFiles.length * 0.5), // Size based on number of files
          color: nodeColor,
          isNextRoute,
          routeType: isDynamicRoute ? dynamicRouteType : undefined,
        };

        structureNodes.push(node);
      } catch (err) {
        // Silent fail in production
      }
    });
  } catch (err) {
    console.error(`Error creating directory nodes:`, err);
  }

  // Create file nodes
  try {
    structureScan.files.forEach((file, filePath) => {
      try {
        const dirPath = path.dirname(filePath);

        const nodeProps = {
          isNextRoute: file.isNextRoute,
          isComponent: file.extension === "tsx" || file.extension === "jsx",
          routeType: file.routeType,
        };

        const node: FileSystemNode = {
          id: filePath,
          label: file.name,
          isDirectory: false,
          depth: structureScan.directories.get(dirPath)?.depth || 0,
          childCount: 0,
          parentId: dirPath,
          fullPath: filePath,
          fileName: file.name,
          fileType: file.extension,
          x: Math.random() * 100, // Random initial position
          y: Math.random() * 100, // Random initial position
          size: getNodeSize(nodeProps),
          color: getNodeColor(nodeProps),
          isNextRoute: file.isNextRoute,
          routeType: file.routeType,
          isNextSpecialFile: file.isNextSpecialFile,
        };

        structureNodes.push(node);
      } catch (err) {
        // Silent fail in production
      }
    });
  } catch (err) {
    console.error(`Error creating file nodes:`, err);
  }

  // Create parent-child edges
  try {
    // Pre-create a map of valid parent nodes for efficient lookup
    const nodeMap = new Map(structureNodes.map((node) => [node.id, node]));

    for (const node of structureNodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const edge: FileSystemEdge = {
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          color: "#AAAAAA", // Light gray for structure edges
          size: 1,
          relationType: "parent-child",
        };

        structureEdges.push(edge);
      }
    }
  } catch (err) {
    console.error(`Error creating edges:`, err);
  }

  // Update cache with hash
  structureGraphCache = {
    structureNodes,
    structureEdges,
    structureScan,
    hash: currentHash,
  };

  return createStructureReturnObject(structureGraphCache);
}

/**
 * Creates the return object for the structure graph data
 * @param cache The structure graph cache
 * @returns An object with a method to get the structure graph data
 */
function createStructureReturnObject(cache: StructureGraphCache) {
  const getStructureData = (): FileStructureGraph => {
    return {
      nodes: cache.structureNodes,
      edges: cache.structureEdges,
      version: STRUCTURE_GENERATOR_VERSION,
    };
  };

  return {
    getStructureData,
  };
}

/**
 * Checks if the structure graph cache is valid
 * @param scanResult The scan result containing file paths
 * @returns True if the cache is valid
 */
function isValidStructureCache(scanResult: ScanResult): boolean {
  if (!structureGraphCache) return false;

  // Compare file counts as a basic validation
  return (
    structureGraphCache.structureScan.files.size === scanResult.filePaths.length
  );
}
