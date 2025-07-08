import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export class PathUtils {
  /**
   * Normalizes a file path to a consistent format
   */
  static normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, "/");
  }

  /**
   * Gets relative path between two absolute paths
   */
  static getRelativePath(from: string, to: string): string {
    const relativePath = path.relative(path.dirname(from), to);
    return this.normalizePath(relativePath);
  }

  /**
   * Checks if a path is absolute
   */
  static isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Gets directory name from path
   */
  static getDirectory(filePath: string): string {
    return this.normalizePath(path.dirname(filePath));
  }

  /**
   * Gets file name from path
   */
  static getFileName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Gets file extension from path
   */
  static getFileExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Joins path segments
   */
  static joinPaths(...paths: string[]): string {
    return this.normalizePath(path.join(...paths));
  }

  /**
   * Resolves a path to its absolute form
   */
  static resolvePath(...paths: string[]): string {
    return this.normalizePath(path.resolve(...paths));
  }

  /**
   * Generate SHA-256 hash of a string
   */
  static generateHash(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  /**
   * Checks if a path is within another path
   */
  static isWithinDirectory(directory: string, filePath: string): boolean {
    const normalizedDir = this.normalizePath(directory);
    const normalizedPath = this.normalizePath(filePath);
    return normalizedPath.startsWith(normalizedDir);
  }

  /**
   * Checks if path is a TypeScript/JavaScript file
   */
  static isSourceFile(filePath: string): boolean {
    const ext = this.getFileExtension(filePath).toLowerCase();
    return [".ts", ".tsx", ".js", ".jsx"].includes(ext);
  }
}

// File system operations
export async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  } catch (error) {
    console.error(`Error calculating file hash for ${filePath}:`, error);
    throw error;
  }
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

// JSON file operations
export async function readJsonFile(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    throw error;
  }
}

export async function writeJsonFile(
  filePath: string,
  data: any
): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Extracts the package name from an import path
 * @example
 * extractPackageName("@angular/core") // returns "@angular/core"
 * extractPackageName("lodash") // returns "lodash"
 * extractPackageName("./local/file") // returns null
 */
export function extractPackageName(importPath: string): string | null {
  if (importPath.startsWith(".") || importPath.startsWith("/")) {
    return null;
  }
  const parts = importPath.split("/");
  return parts[0].startsWith("@") && parts.length > 1
    ? `${parts[0]}/${parts[1]}`
    : parts[0];
}

/**
 * Checks if a path is using an alias pattern
 * @example
 * isPathAlias("@/components/Button") // returns true
 * isPathAlias("lodash") // returns false
 */
export function isPathAlias(path: string): boolean {
  const aliasPatterns = [
    /^@\//, // @/something
    /^~\//, // ~/something
    /^#\//, // #/something
    /^src\//, // src/something
    /^\.\//, // ./something
    /^\.\.\//, // ../something
  ];
  return aliasPatterns.some((pattern) => pattern.test(path));
}
