import { ComponentRelation } from "../types";
import { generateComponentId } from "../utils/common/analysisUtils";
import path from "path";

export interface ComponentLookupMaps {
  byId: Map<string, ComponentRelation>;
  byName: Map<string, ComponentRelation[]>;
  byPath: Map<string, ComponentRelation>;
  byDirectory: Map<string, ComponentRelation[]>;
  byNormalizedImport: Map<string, ComponentRelation[]>;
}

/**
 * High-performance lookup service for component relations
 * Pre-builds hash maps for O(1) component lookups instead of O(n) array searches
 */
export class ComponentLookupService {
  private readonly lookupMaps: ComponentLookupMaps;

  constructor(components: ComponentRelation[]) {
    this.lookupMaps = this.buildLookupMaps(components);
  }

  /**
   * Find component by unique ID - O(1)
   */
  getComponentById(id: string): ComponentRelation | undefined {
    return this.lookupMaps.byId.get(id);
  }

  /**
   * Find components by name - O(1)
   */
  getComponentsByName(name: string): ComponentRelation[] {
    return this.lookupMaps.byName.get(name) || [];
  }

  /**
   * Find component by full path - O(1)
   */
  getComponentByPath(fullPath: string): ComponentRelation | undefined {
    return this.lookupMaps.byPath.get(fullPath);
  }

  /**
   * Find components in directory - O(1)
   */
  getComponentsByDirectory(directory: string): ComponentRelation[] {
    return this.lookupMaps.byDirectory.get(directory) || [];
  }

  /**
   * Find components by normalized import path - O(1)
   */
  getComponentsByNormalizedImport(
    normalizedImport: string
  ): ComponentRelation[] {
    return this.lookupMaps.byNormalizedImport.get(normalizedImport) || [];
  }

  /**
   * Get all component IDs - O(1)
   */
  getAllComponentIds(): string[] {
    return Array.from(this.lookupMaps.byId.keys());
  }

  /**
   * Get all components - O(1)
   */
  getAllComponents(): ComponentRelation[] {
    return Array.from(this.lookupMaps.byId.values());
  }

  /**
   * Check if component exists by ID - O(1)
   */
  hasComponentById(id: string): boolean {
    return this.lookupMaps.byId.has(id);
  }

  /**
   * Check if component exists by name - O(1)
   */
  hasComponentByName(name: string): boolean {
    return this.lookupMaps.byName.has(name);
  }

  /**
   * Get component count - O(1)
   */
  getComponentCount(): number {
    return this.lookupMaps.byId.size;
  }

  /**
   * Find target component IDs for an import path
   */
  resolveImportToComponentIds(importPath: string): string[] {
    const normalizedImport = this.normalizeImportPath(importPath);
    const matchingComponents =
      this.getComponentsByNormalizedImport(normalizedImport);
    return matchingComponents.map((comp) => generateComponentId(comp));
  }

  /**
   * Build all lookup maps during initialization - O(n) operation done once
   */
  private buildLookupMaps(
    components: ComponentRelation[]
  ): ComponentLookupMaps {
    const byId = new Map<string, ComponentRelation>();
    const byName = new Map<string, ComponentRelation[]>();
    const byPath = new Map<string, ComponentRelation>();
    const byDirectory = new Map<string, ComponentRelation[]>();
    const byNormalizedImport = new Map<string, ComponentRelation[]>();

    for (const component of components) {
      const componentId = generateComponentId(component);

      // Index by unique ID
      byId.set(componentId, component);

      // Index by name (can have multiple components with same name in different directories)
      if (!byName.has(component.name)) {
        byName.set(component.name, []);
      }
      byName.get(component.name)!.push(component);

      // Index by full path (should be unique)
      byPath.set(component.fullPath, component);

      // Index by directory
      if (!byDirectory.has(component.directory)) {
        byDirectory.set(component.directory, []);
      }
      byDirectory.get(component.directory)!.push(component);

      // Index by normalized import patterns
      const normalizedPatterns =
        this.generateNormalizedImportPatterns(component);
      for (const pattern of normalizedPatterns) {
        if (!byNormalizedImport.has(pattern)) {
          byNormalizedImport.set(pattern, []);
        }
        byNormalizedImport.get(pattern)!.push(component);
      }
    }

    return {
      byId,
      byName,
      byPath,
      byDirectory,
      byNormalizedImport,
    };
  }

  /**
   * Generate all possible normalized import patterns for a component
   */
  private generateNormalizedImportPatterns(
    component: ComponentRelation
  ): string[] {
    const patterns = new Set<string>();

    // Add component name
    patterns.add(component.name);

    // Add variations of the file path
    const fileName = path.basename(
      component.fullPath,
      path.extname(component.fullPath)
    );
    patterns.add(fileName);

    // Add relative path variations
    const relativePath = component.fullPath;
    if (relativePath) {
      patterns.add(relativePath.replace(/\.(js|jsx|ts|tsx)$/, ""));
      patterns.add(relativePath);

      // Add path without extension
      const withoutExt = relativePath.replace(/\.(js|jsx|ts|tsx)$/, "");
      patterns.add(withoutExt);

      // Add just the directory + filename
      const dirAndFile = path.join(component.directory, fileName);
      patterns.add(dirAndFile);
    }

    return Array.from(patterns).filter((pattern) => pattern.length > 0);
  }

  /**
   * Normalize import path for consistent lookups
   */
  private normalizeImportPath(importPath: string): string {
    return importPath
      .replace(/\.(js|jsx|ts|tsx)$/, "")
      .replace(/^\.\//, "")
      .replace(/^\//, "");
  }
}
