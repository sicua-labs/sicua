import { TypesByDirectoryMap } from "../types/internalTypes";

/**
 * Analyzer for type statistics
 */
export class TypeStatisticsAnalyzer {
  private typesByDirectory: TypesByDirectoryMap;

  constructor(typesByDirectory: TypesByDirectoryMap) {
    this.typesByDirectory = typesByDirectory;
  }

  /**
   * Calculate type statistics
   */
  public calculateTypeStatistics(): {
    interfacesCount: number;
    typesCount: number;
    enumsCount: number;
    classesCount: number;
    totalTypes: number;
    typesByDirectoryStats: Record<
      string,
      {
        total: number;
        percentage: number;
      }
    >;
  } {
    let interfacesCount = 0;
    let typesCount = 0;
    let enumsCount = 0;
    let classesCount = 0;

    const directoryStats: Record<string, number> = {};

    // Calculate counts from typesByDirectory
    for (const [directory, types] of Object.entries(this.typesByDirectory)) {
      interfacesCount += types.interfaces.length;
      typesCount += types.types.length;
      enumsCount += types.enums.length;
      classesCount += types.classes.length;

      const dirTotal =
        types.interfaces.length +
        types.types.length +
        types.enums.length +
        types.classes.length;

      directoryStats[directory] = dirTotal;
    }

    const totalTypes = interfacesCount + typesCount + enumsCount + classesCount;

    // Calculate percentage by directory
    const typesByDirectoryStats: Record<
      string,
      {
        total: number;
        percentage: number;
      }
    > = {};

    for (const [directory, count] of Object.entries(directoryStats)) {
      typesByDirectoryStats[directory] = {
        total: count,
        percentage: totalTypes > 0 ? (count / totalTypes) * 100 : 0,
      };
    }

    return {
      interfacesCount,
      typesCount,
      enumsCount,
      classesCount,
      totalTypes,
      typesByDirectoryStats,
    };
  }

  /**
   * Analyze type naming patterns
   */
  public analyzeTypeNamingPatterns(): {
    commonPrefixes: { prefix: string; count: number }[];
    commonSuffixes: { suffix: string; count: number }[];
    namingPatterns: { pattern: string; count: number }[];
  } {
    const prefixCounts: Record<string, number> = {};
    const suffixCounts: Record<string, number> = {};
    const patternCounts: Record<string, number> = {};

    // Helper to extract prefix (up to 3 characters)
    const getPrefix = (name: string): string => {
      return name.substring(0, Math.min(3, name.length));
    };

    // Helper to extract suffix (up to 5 characters)
    const getSuffix = (name: string): string => {
      return name.substring(Math.max(0, name.length - 5));
    };

    // Helper to identify naming pattern
    const getNamingPattern = (name: string): string => {
      if (/^I[A-Z]/.test(name)) return "IUpperCase"; // Interface with I prefix
      if (/^T[A-Z]/.test(name)) return "TUpperCase"; // Type with T prefix
      if (/^E[A-Z]/.test(name)) return "EUpperCase"; // Enum with E prefix
      if (/Props$/.test(name)) return "EndsWithProps";
      if (/State$/.test(name)) return "EndsWithState";
      if (/Config$/.test(name)) return "EndsWithConfig";
      if (/Options$/.test(name)) return "EndsWithOptions";
      if (/Type$/.test(name)) return "EndsWithType";
      if (/^[A-Z]/.test(name)) return "PascalCase";
      if (/^[a-z]/.test(name)) return "camelCase";
      return "other";
    };

    // Collect statistics across all types
    for (const { interfaces, types, enums, classes } of Object.values(
      this.typesByDirectory
    )) {
      // Process interfaces
      for (const name of interfaces) {
        const prefix = getPrefix(name);
        const suffix = getSuffix(name);
        const pattern = getNamingPattern(name);

        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
        suffixCounts[suffix] = (suffixCounts[suffix] || 0) + 1;
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }

      // Process types
      for (const name of types) {
        const prefix = getPrefix(name);
        const suffix = getSuffix(name);
        const pattern = getNamingPattern(name);

        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
        suffixCounts[suffix] = (suffixCounts[suffix] || 0) + 1;
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }

      // Process enums
      for (const name of enums) {
        const prefix = getPrefix(name);
        const suffix = getSuffix(name);
        const pattern = getNamingPattern(name);

        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
        suffixCounts[suffix] = (suffixCounts[suffix] || 0) + 1;
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }

      // Process classes
      for (const name of classes) {
        const prefix = getPrefix(name);
        const suffix = getSuffix(name);
        const pattern = getNamingPattern(name);

        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
        suffixCounts[suffix] = (suffixCounts[suffix] || 0) + 1;
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
    }

    // Sort and convert to arrays
    const commonPrefixes = Object.entries(prefixCounts)
      .filter(([_, count]) => count > 1)
      .map(([prefix, count]) => ({ prefix, count }))
      .sort((a, b) => b.count - a.count);

    const commonSuffixes = Object.entries(suffixCounts)
      .filter(([_, count]) => count > 1)
      .map(([suffix, count]) => ({ suffix, count }))
      .sort((a, b) => b.count - a.count);

    const namingPatterns = Object.entries(patternCounts)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);

    return {
      commonPrefixes,
      commonSuffixes,
      namingPatterns,
    };
  }

  /**
   * Analyze type distribution
   */
  public analyzeTypeDistribution(): {
    typeCountByFile: { file: string; count: number }[];
    directoryTypeDistribution: { directory: string; count: number }[];
    typeDensity: number;
  } {
    // Count types per file
    const fileTypeCounts: Record<string, number> = {};
    const directoryTypeCountsMap: Record<string, number> = {};
    let totalTypes = 0;

    for (const [
      directory,
      { interfaces, types, enums, classes },
    ] of Object.entries(this.typesByDirectory)) {
      const dirTotal =
        interfaces.length + types.length + enums.length + classes.length;
      directoryTypeCountsMap[directory] = dirTotal;
      totalTypes += dirTotal;

      // Approximate file counts (in a real implementation we'd track by file)
      const dirParts = directory.split("/");
      const dirName = dirParts[dirParts.length - 1];
      fileTypeCounts[`${dirName}/types.ts`] = dirTotal;
    }

    // Convert to arrays and sort
    const typeCountByFile = Object.entries(fileTypeCounts)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count);

    const directoryTypeDistribution = Object.entries(directoryTypeCountsMap)
      .map(([directory, count]) => ({ directory, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate type density (average types per directory)
    const typeDensity =
      totalTypes / Math.max(1, Object.keys(this.typesByDirectory).length);

    return {
      typeCountByFile,
      directoryTypeDistribution,
      typeDensity,
    };
  }
}
