/**
 * Types for the General Analyzer
 */

export interface MagicNumber {
  value: number;
  line: number;
  fileName: string;
  filePath: string;
  context: {
    before: string;
    current: string;
    after: string;
  };
}

export interface LineMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
}

export interface CodeMetrics {
  lineMetrics: LineMetrics;
  codeToCommentRatio: number;
  magicNumbers: MagicNumber[];
  totalMagicNumbers: number;
}

// Import the project metadata types from the detector
export interface FrameworkInfo {
  react?: string;
  nextjs?: string;
  typescript?: string;
  nodejs?: string;
}

export interface DevelopmentTools {
  buildTools: Record<string, string>;
  linting: Record<string, string>;
  testing: Record<string, string>;
  bundlers: Record<string, string>;
}

export interface UIAndStyling {
  cssFrameworks: Record<string, string>;
  uiLibraries: Record<string, string>;
  iconLibraries: Record<string, string>;
}

export interface StateManagement {
  libraries: Record<string, string>;
}

export interface ConfigurationFiles {
  nextConfig: boolean;
  tsConfig: boolean;
  eslintConfig: boolean;
  prettierConfig: boolean;
  jestConfig: boolean;
  vitestConfig: boolean;
  playwrightConfig: boolean;
  cypressConfig: boolean;
}

export interface ProjectMetadata {
  packageInfo: {
    name?: string;
    version?: string;
    description?: string;
    private?: boolean;
    hasScripts: boolean;
    scriptCount: number;
  };
  framework: FrameworkInfo;
  developmentTools: DevelopmentTools;
  uiAndStyling: UIAndStyling;
  stateManagement: StateManagement;
  configurationFiles: ConfigurationFiles;
}

export interface GeneralAnalysisResult {
  codeMetrics: CodeMetrics;
  projectMetadata: ProjectMetadata;
  analyzedFiles: number;
  totalFiles: number;
}

export interface GeneralAnalyzerConfig {
  excludeTestFiles?: boolean;
  excludeNodeModules?: boolean;
  fileExtensions?: string[];
}
