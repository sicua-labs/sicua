import * as path from "path";
import * as fs from "fs";
import { SpecialFileCoverage, SpecialFileInfo } from "../types";
import { parseRoutePath } from "../utils";

/**
 * Scans Next.js app directory for special files and builds coverage analysis
 */
export class SpecialFileCoverageScanner {
  private appDirectory: string;
  private validExtensions: string[];

  constructor(appDirectory: string) {
    this.appDirectory = appDirectory;
    this.validExtensions = [".js", ".jsx", ".ts", ".tsx"];
  }

  /**
   * Scans a route path for all special files coverage
   */
  scanRouteSpecialFiles(routePath: string): SpecialFileCoverage {
    const routeSegments = parseRoutePath(routePath);

    return {
      layout: this.scanLayoutFiles(routeSegments),
      template: this.scanTemplateFile(routeSegments),
      error: this.scanErrorFile(routeSegments),
      loading: this.scanLoadingFile(routeSegments),
      notFound: this.scanNotFoundFile(routeSegments),
    };
  }

  /**
   * Gets all special files for a specific route segment
   */
  getSegmentSpecialFiles(routeSegment: string): SpecialFileCoverage {
    const segmentPath = path.join(this.appDirectory, routeSegment);

    return {
      layout: this.scanLayoutInDirectory(segmentPath, routeSegment),
      template: this.scanSpecialFileInDirectory(
        segmentPath,
        "template",
        routeSegment
      ),
      error: this.scanSpecialFileInDirectory(
        segmentPath,
        "error",
        routeSegment
      ),
      loading: this.scanSpecialFileInDirectory(
        segmentPath,
        "loading",
        routeSegment
      ),
      notFound: this.scanSpecialFileInDirectory(
        segmentPath,
        "not-found",
        routeSegment
      ),
    };
  }

  /**
   * Checks if a specific special file exists in a directory
   */
  hasSpecialFile(directory: string, fileName: string): boolean {
    for (const ext of this.validExtensions) {
      const filePath = path.join(directory, `${fileName}${ext}`);
      if (fs.existsSync(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets the full path of a special file if it exists
   */
  getSpecialFilePath(directory: string, fileName: string): string | null {
    for (const ext of this.validExtensions) {
      const filePath = path.join(directory, `${fileName}${ext}`);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  /**
   * Scans for all layout files in the route hierarchy
   */
  private scanLayoutFiles(routeSegments: string[]): SpecialFileInfo[] {
    const layouts: SpecialFileInfo[] = [];

    // Start from app root and traverse down to the route
    let currentPath = this.appDirectory;

    // Check root layout
    const rootLayoutPath = this.getSpecialFilePath(currentPath, "layout");
    layouts.push({
      exists: rootLayoutPath !== null,
      filePath: rootLayoutPath || undefined,
      routeSegment: "",
    });

    // Check each segment for layout files
    for (const segment of routeSegments) {
      currentPath = path.join(currentPath, segment);
      const layoutPath = this.getSpecialFilePath(currentPath, "layout");

      layouts.push({
        exists: layoutPath !== null,
        filePath: layoutPath || undefined,
        routeSegment: segment,
      });
    }

    return layouts;
  }

  /**
   * Scans for template file - only the closest one matters
   */
  private scanTemplateFile(routeSegments: string[]): SpecialFileInfo | null {
    // Check from the deepest route segment up to root
    for (let i = routeSegments.length - 1; i >= 0; i--) {
      const segmentPath = path.join(
        this.appDirectory,
        ...routeSegments.slice(0, i + 1)
      );
      const templatePath = this.getSpecialFilePath(segmentPath, "template");

      if (templatePath) {
        return {
          exists: true,
          filePath: templatePath,
          routeSegment: routeSegments[i],
        };
      }
    }

    // Check root
    const rootTemplatePath = this.getSpecialFilePath(
      this.appDirectory,
      "template"
    );
    return {
      exists: rootTemplatePath !== null,
      filePath: rootTemplatePath || undefined,
      routeSegment: "",
    };
  }

  /**
   * Scans for error file - only the closest one matters
   */
  private scanErrorFile(routeSegments: string[]): SpecialFileInfo | null {
    // Check from the deepest route segment up to root
    for (let i = routeSegments.length - 1; i >= 0; i--) {
      const segmentPath = path.join(
        this.appDirectory,
        ...routeSegments.slice(0, i + 1)
      );
      const errorPath = this.getSpecialFilePath(segmentPath, "error");

      if (errorPath) {
        return {
          exists: true,
          filePath: errorPath,
          routeSegment: routeSegments[i],
        };
      }
    }

    // Check root
    const rootErrorPath = this.getSpecialFilePath(this.appDirectory, "error");
    return {
      exists: rootErrorPath !== null,
      filePath: rootErrorPath || undefined,
      routeSegment: "",
    };
  }

  /**
   * Scans for loading file - only the closest one matters
   */
  private scanLoadingFile(routeSegments: string[]): SpecialFileInfo | null {
    // Check from the deepest route segment up to root
    for (let i = routeSegments.length - 1; i >= 0; i--) {
      const segmentPath = path.join(
        this.appDirectory,
        ...routeSegments.slice(0, i + 1)
      );
      const loadingPath = this.getSpecialFilePath(segmentPath, "loading");

      if (loadingPath) {
        return {
          exists: true,
          filePath: loadingPath,
          routeSegment: routeSegments[i],
        };
      }
    }

    // Check root
    const rootLoadingPath = this.getSpecialFilePath(
      this.appDirectory,
      "loading"
    );
    return {
      exists: rootLoadingPath !== null,
      filePath: rootLoadingPath || undefined,
      routeSegment: "",
    };
  }

  /**
   * Scans for not-found file - only the closest one matters
   */
  private scanNotFoundFile(routeSegments: string[]): SpecialFileInfo | null {
    // Check from the deepest route segment up to root
    for (let i = routeSegments.length - 1; i >= 0; i--) {
      const segmentPath = path.join(
        this.appDirectory,
        ...routeSegments.slice(0, i + 1)
      );
      const notFoundPath = this.getSpecialFilePath(segmentPath, "not-found");

      if (notFoundPath) {
        return {
          exists: true,
          filePath: notFoundPath,
          routeSegment: routeSegments[i],
        };
      }
    }

    // Check root
    const rootNotFoundPath = this.getSpecialFilePath(
      this.appDirectory,
      "not-found"
    );
    return {
      exists: rootNotFoundPath !== null,
      filePath: rootNotFoundPath || undefined,
      routeSegment: "",
    };
  }

  /**
   * Scans for layout files in a specific directory
   */
  private scanLayoutInDirectory(
    directory: string,
    routeSegment: string
  ): SpecialFileInfo[] {
    const layoutPath = this.getSpecialFilePath(directory, "layout");

    return [
      {
        exists: layoutPath !== null,
        filePath: layoutPath || undefined,
        routeSegment,
      },
    ];
  }

  /**
   * Scans for a specific special file in a directory
   */
  private scanSpecialFileInDirectory(
    directory: string,
    fileName: string,
    routeSegment: string
  ): SpecialFileInfo | null {
    const filePath = this.getSpecialFilePath(directory, fileName);

    return {
      exists: filePath !== null,
      filePath: filePath || undefined,
      routeSegment,
    };
  }

  /**
   * Gets coverage summary for a route
   */
  getCoverageSummary(coverage: SpecialFileCoverage): {
    totalFiles: number;
    existingFiles: number;
    missingFiles: string[];
    coveragePercentage: number;
  } {
    const files = [
      { name: "layout", info: coverage.layout },
      { name: "template", info: coverage.template },
      { name: "error", info: coverage.error },
      { name: "loading", info: coverage.loading },
      { name: "not-found", info: coverage.notFound },
    ];

    let totalFiles = 0;
    let existingFiles = 0;
    const missingFiles: string[] = [];

    for (const file of files) {
      if (file.name === "layout" && Array.isArray(file.info)) {
        // Handle layout array
        for (const layout of file.info) {
          totalFiles++;
          if (layout.exists) {
            existingFiles++;
          } else {
            missingFiles.push(
              `${file.name} (${layout.routeSegment || "root"})`
            );
          }
        }
      } else if (
        file.info &&
        typeof file.info === "object" &&
        !Array.isArray(file.info)
      ) {
        // Handle single file info
        totalFiles++;
        if (file.info.exists) {
          existingFiles++;
        } else {
          missingFiles.push(file.name);
        }
      }
    }

    return {
      totalFiles,
      existingFiles,
      missingFiles,
      coveragePercentage:
        totalFiles > 0 ? (existingFiles / totalFiles) * 100 : 0,
    };
  }
}
