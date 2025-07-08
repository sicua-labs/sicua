import { Thing, WithContext, Graph } from "schema-dts";
import { ComponentRelation } from "../../../types";
import { MetaTagAnalysis } from "../../../types/seoCoverageTypes";

/**
 * Internal types used by the SEO analyzer module
 */

/**
 * Represents a page component identified for SEO analysis
 */
export interface PageComponent {
  path: string;
  component: ComponentRelation;
  route?: string;
}

/**
 * Map of page paths to their corresponding components
 */
export type PageComponentMap = Map<string, ComponentRelation>;

/**
 * Map of page paths to their meta tag analysis results
 */
export type MetaTagsMap = Map<string, MetaTagAnalysis>;

/**
 * Map of page paths to their structured data
 */
export type StructuredDataMap = Map<string, WithContext<Thing> | Graph>;

/**
 * Map of page paths to their routes
 */
export type RoutesMap = Map<string, string[]>;

/**
 * Represents an extracted link from a component
 */
export interface ExtractedLink {
  href: string;
  isInternal: boolean;
  element: "a" | "Link" | "NavLink" | "RouterLink";
}

/**
 * Normalized link information
 */
export interface NormalizedLink {
  to: string;
  isRelative: boolean;
}

/**
 * JSX Attribute information
 */
export interface AttributeInfo {
  name: string;
  value: string | null;
}

/**
 * Configuration options for the SEO analyzer
 */
export interface SEOAnalysisOptions {
  /**
   * Whether to analyze routes and internal links
   */
  analyzeRouting?: boolean;

  /**
   * Whether to analyze structured data
   */
  analyzeStructuredData?: boolean;

  /**
   * Whether to analyze accessibility aspects that affect SEO
   */
  analyzeAccessibility?: boolean;

  /**
   * Whether to analyze text content metrics
   */
  analyzeTextContent?: boolean;

  /**
   * Patterns to identify page components
   */
  pageComponentPatterns?: string[];

  /**
   * Route patterns to analyze
   */
  routePatterns?: {
    nextJs?: boolean;
    reactRouter?: boolean;
    customPatterns?: string[];
  };
}
