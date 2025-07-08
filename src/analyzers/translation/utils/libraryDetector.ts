import ts from "typescript";

/**
 * Enum representing supported translation libraries
 */
export enum TranslationLibrary {
  NEXT_INTL = "next-intl",
  REACT_I18NEXT = "react-i18next",
  UNKNOWN = "unknown",
}

/**
 * Result of library detection analysis
 */
export interface LibraryDetectionResult {
  library: TranslationLibrary;
  confidence: number; // 0-1 score
  evidence: {
    imports: string[];
    hooks: string[];
    patterns: string[];
  };
}

/**
 * Detects which translation library is being used in the project
 */
export class LibraryDetector {
  /**
   * Analyzes source files to determine which translation library is being used
   * @param sourceFiles Map of source files to analyze
   * @returns Detection result with library type and confidence
   */
  detectTranslationLibrary(
    sourceFiles: Map<string, ts.SourceFile>
  ): LibraryDetectionResult {
    const nextIntlEvidence = this.scanForNextIntl(sourceFiles);
    const reactI18nextEvidence = this.scanForReactI18next(sourceFiles);

    // Calculate confidence scores
    const nextIntlScore = this.calculateConfidenceScore(nextIntlEvidence);
    const reactI18nextScore =
      this.calculateConfidenceScore(reactI18nextEvidence);

    // Determine library based on priority (next-intl > react-i18next)
    if (nextIntlScore > 0 && nextIntlScore >= reactI18nextScore) {
      return {
        library: TranslationLibrary.NEXT_INTL,
        confidence: nextIntlScore,
        evidence: nextIntlEvidence,
      };
    } else if (reactI18nextScore > 0) {
      return {
        library: TranslationLibrary.REACT_I18NEXT,
        confidence: reactI18nextScore,
        evidence: reactI18nextEvidence,
      };
    }

    return {
      library: TranslationLibrary.UNKNOWN,
      confidence: 0,
      evidence: {
        imports: [],
        hooks: [],
        patterns: [],
      },
    };
  }

  /**
   * Scans for next-intl specific patterns
   * @param sourceFiles Source files to scan
   * @returns Evidence of next-intl usage
   */
  private scanForNextIntl(sourceFiles: Map<string, ts.SourceFile>): {
    imports: string[];
    hooks: string[];
    patterns: string[];
  } {
    const evidence = {
      imports: [] as string[],
      hooks: [] as string[],
      patterns: [] as string[],
    };

    for (const [filePath, sourceFile] of sourceFiles.entries()) {
      this.visitNodes(sourceFile, (node) => {
        // Check for next-intl imports
        if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
          if (
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === "next-intl"
          ) {
            evidence.imports.push(`${filePath}: ${node.moduleSpecifier.text}`);
          }
        }

        // Check for useTranslations hook calls (plural)
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "useTranslations"
        ) {
          evidence.hooks.push(`${filePath}: useTranslations()`);
        }

        // Check for variable declarations with useTranslations
        if (
          ts.isVariableDeclaration(node) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          ts.isIdentifier(node.initializer.expression) &&
          node.initializer.expression.text === "useTranslations"
        ) {
          evidence.patterns.push(`${filePath}: const t = useTranslations()`);
        }
      });
    }

    return evidence;
  }

  /**
   * Scans for react-i18next specific patterns
   * @param sourceFiles Source files to scan
   * @returns Evidence of react-i18next usage
   */
  private scanForReactI18next(sourceFiles: Map<string, ts.SourceFile>): {
    imports: string[];
    hooks: string[];
    patterns: string[];
  } {
    const evidence = {
      imports: [] as string[],
      hooks: [] as string[],
      patterns: [] as string[],
    };

    for (const [filePath, sourceFile] of sourceFiles.entries()) {
      this.visitNodes(sourceFile, (node) => {
        // Check for react-i18next imports
        if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
          if (
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === "react-i18next"
          ) {
            evidence.imports.push(`${filePath}: ${node.moduleSpecifier.text}`);
          }
        }

        // Check for useTranslation hook calls (singular)
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "useTranslation"
        ) {
          evidence.hooks.push(`${filePath}: useTranslation()`);
        }

        // Check for variable declarations with useTranslation
        if (
          ts.isVariableDeclaration(node) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          ts.isIdentifier(node.initializer.expression) &&
          node.initializer.expression.text === "useTranslation"
        ) {
          evidence.patterns.push(`${filePath}: const { t } = useTranslation()`);
        }

        // Check for destructuring patterns common in react-i18next
        if (
          ts.isVariableDeclaration(node) &&
          ts.isObjectBindingPattern(node.name) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          ts.isIdentifier(node.initializer.expression) &&
          node.initializer.expression.text === "useTranslation"
        ) {
          // Look for { t, i18n } destructuring pattern
          const hasT = node.name.elements.some(
            (element) =>
              ts.isBindingElement(element) &&
              element.name &&
              ts.isIdentifier(element.name) &&
              element.name.text === "t"
          );

          const hasI18n = node.name.elements.some(
            (element) =>
              ts.isBindingElement(element) &&
              element.name &&
              ts.isIdentifier(element.name) &&
              element.name.text === "i18n"
          );

          if (hasT) {
            evidence.patterns.push(
              `${filePath}: destructured 't' from useTranslation`
            );
          }

          if (hasI18n) {
            evidence.patterns.push(
              `${filePath}: destructured 'i18n' from useTranslation`
            );
          }
        }
      });
    }

    return evidence;
  }

  /**
   * Calculates confidence score based on evidence
   * @param evidence Evidence collected for a library
   * @returns Confidence score between 0 and 1
   */
  private calculateConfidenceScore(evidence: {
    imports: string[];
    hooks: string[];
    patterns: string[];
  }): number {
    let score = 0;

    // Import evidence is strongest (0.5 points)
    if (evidence.imports.length > 0) {
      score += 0.5;
    }

    // Hook usage evidence (0.3 points)
    if (evidence.hooks.length > 0) {
      score += 0.3;
    }

    // Pattern evidence (0.2 points)
    if (evidence.patterns.length > 0) {
      score += 0.2;
    }

    // Bonus for multiple files using the library
    const uniqueFiles = new Set(
      [...evidence.imports, ...evidence.hooks, ...evidence.patterns].map(
        (item) => item.split(":")[0]
      )
    );

    if (uniqueFiles.size > 1) {
      score += 0.1 * Math.min(uniqueFiles.size - 1, 3); // Max 0.3 bonus
    }

    return Math.min(score, 1.0);
  }

  /**
   * Utility method to visit all nodes in a source file
   * @param node Starting node
   * @param visitor Visitor function
   */
  private visitNodes(node: ts.Node, visitor: (node: ts.Node) => void): void {
    visitor(node);
    ts.forEachChild(node, (child) => this.visitNodes(child, visitor));
  }
}
