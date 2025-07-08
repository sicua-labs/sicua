import ts from "typescript";
import * as fs from "fs/promises";

/**
 * Manages source file loading and caching to improve performance
 */
export class SourceFileManager {
  private sourceFileCache: Map<string, ts.SourceFile>;

  constructor() {
    this.sourceFileCache = new Map();
  }

  /**
   * Gets a source file from cache or loads it from disk
   * @param filePath Path to the source file
   * @returns A Promise resolving to the TypeScript SourceFile
   */
  async getOrCreateSourceFile(filePath: string): Promise<ts.SourceFile> {
    if (!this.sourceFileCache.has(filePath)) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        this.sourceFileCache.set(
          filePath,
          ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
        );
      } catch (error) {
        throw error;
      }
    }
    return this.sourceFileCache.get(filePath)!;
  }

  /**
   * Clears the source file cache
   */
  clearCache(): void {
    this.sourceFileCache.clear();
  }

  /**
   * Gets the current size of the cache
   */
  getCacheSize(): number {
    return this.sourceFileCache.size;
  }
}
