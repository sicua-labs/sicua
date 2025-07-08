/**
 * Types for component deduplication and similarity analysis
 */
import { PropSignature, JSXStructure } from "./component.types";

// New types for AI-driven suggestions
export interface ComponentDeduplicationData {
  components: {
    name: string;
    path: string;
    content: string; // Original component code
    componentId?: string;
  }[];
  commonalities: {
    props: PropSimilarity[];
    structure: JSXSimilarity;
  };
  differences: {
    props: PropDifference[];
    structure: JSXDifference[];
  };
}

export interface PropSimilarity {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
  usedInComponents: string[]; // Component names that use this prop
}

export interface PropDifference {
  componentName: string;
  uniqueProps: {
    name: string;
    type: string;
    isRequired: boolean;
    defaultValue?: string;
  }[];
}

export interface JSXSimilarity {
  sharedRootElement: string; // e.g., "Card"
  sharedStructure: string[]; // e.g., ["CardHeader", "CardTitle", "CardContent"]
  sharedClassNames: string[]; // Common CSS classes
}

export interface JSXDifference {
  componentName: string;
  uniqueElements: {
    element: string;
    location: string; // e.g., "CardContent.children[0]"
    props?: Record<string, string>;
  }[];
}

// Updated ComponentSimilarity
export interface ComponentSimilarity {
  groupId: string;
  components: string[];
  commonProps: PropSignature[];
  commonJSXStructure: JSXStructure[];
  similarityScore: number;
  deduplicationData: ComponentDeduplicationData; // New field
}
