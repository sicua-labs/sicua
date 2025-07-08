import { ComponentRelation } from "../../types";

interface DictionaryMapping {
  [key: string]: string;
}

interface ProcessingDictionary {
  keywords: DictionaryMapping;
  patterns: DictionaryMapping;
  attributes: DictionaryMapping;
  styles: DictionaryMapping;
}

type Category = keyof ProcessingDictionary;

interface ProcessedContent {
  d: ProcessingDictionary;
  i: string[];
  l: string;
  j: string;
}

export class ContentProcessor {
  private dictionary: ProcessingDictionary = {
    keywords: {
      import: "1e",
      from: "1f",
      const: "1c",
      function: "1n",
      return: "r",
      export: "x",
      default: "d",
      interface: "i",
      type: "t",
      class: "cl",
    },
    patterns: {
      useState: "1",
      useEffect: "2",
      useCallback: "3",
      useMemo: "4",
      "try\\s*{": "t{", // Escaped
      "catch\\s*\\(": "c(", // Escaped with parenthesis
      "await\\s+": "w", // Added word boundary
      "async\\s+": "a", // Added word boundary
      props: "p",
      state: "s",
    },
    attributes: {
      className: "c",
      onClick: "o",
      onChange: "h",
      value: "v",
      type: "t",
      disabled: "d",
      placeholder: "p",
      id: "i",
      name: "n",
      role: "r",
      "aria-label": "al",
    },
    styles: {
      flex: "f",
      "items-center": "ic",
      "justify-between": "jb",
      gap: "g",
      grid: "gr",
      "font-bold": "fb",
      "text-": "t",
      "space-": "s",
      "bg-": "b",
      rounded: "rd",
      border: "br",
    },
  };

  private extractImports(content: string): string[] {
    const importRegex = /import[\s\S]*?from\s+['"].*?['"]/g;
    const matches = content.match(importRegex) || [];
    return matches.map((imp) => this.compressContent(imp));
  }

  private extractLogic(content: string): string {
    // Remove imports
    let logic = content.replace(/import[\s\S]*?from\s+['"].*?['"]\s*;/g, "");
    // Remove exports and declarations
    logic = logic.replace(
      /export\s+(?:default\s+)?(?:function|const|class)\s+\w+/g,
      ""
    );
    // Extract function bodies and class methods
    const functionRegex =
      /(?:function|const|class)\s+\w+\s*(?:=|\(|\{)[\s\S]*?(?:\}|\));?/g;
    const matches = logic.match(functionRegex) || [];
    return this.compressContent(matches.join(";"));
  }

  private extractJSX(content: string): string {
    const jsxRegex = /return\s*\(([\s\S]*?)\);/;
    const match = content.match(jsxRegex);
    return match ? this.compressContent(match[1].trim()) : "";
  }

  processComponent(component: ComponentRelation): ComponentRelation {
    if (!component.content) return component;

    const processed: ProcessedContent = {
      d: this.dictionary,
      i: this.extractImports(component.content),
      l: this.extractLogic(component.content),
      j: this.extractJSX(component.content),
    };

    return {
      ...component,
      content: JSON.stringify(processed),
    };
  }

  private compressContent(content: string): string {
    let compressed = content;

    Object.entries(this.dictionary).forEach(([categoryKey, mappings]) => {
      const category = categoryKey as Category;
      Object.entries(mappings as DictionaryMapping).forEach(
        ([original, shortened]) => {
          let regex: RegExp;
          switch (category) {
            case "keywords":
              regex = new RegExp(`\\b${original}\\b`, "g");
              break;
            case "patterns":
              regex = new RegExp(original, "g");
              break;
            case "attributes":
              regex = new RegExp(`${original}=`, "g");
              break;
            case "styles":
              regex = new RegExp(`"${original}"`, "g");
              break;
            default:
              return;
          }
          const replacement =
            category === "attributes" ? `${shortened}=` : shortened;
          compressed = compressed.replace(regex, () => replacement);
        }
      );
    });

    return compressed;
  }

  decompressComponent(compressed: string): string {
    const processed = JSON.parse(compressed) as ProcessedContent;
    const reverseMappings = new Map<string, string>();

    Object.values(processed.d as ProcessingDictionary).forEach(
      (mappings: DictionaryMapping) => {
        Object.entries(mappings).forEach(([original, shortened]) => {
          reverseMappings.set(shortened, original);
        });
      }
    );

    let logic = processed.l;
    let jsx = processed.j;

    reverseMappings.forEach((original, shortened) => {
      const regex = new RegExp(shortened, "g");
      logic = logic.replace(regex, () => original);
      jsx = jsx.replace(regex, () => original);
    });

    return [processed.i.join(";\n"), logic, jsx].join("\n\n");
  }

  processComponents(components: ComponentRelation[]): ComponentRelation[] {
    return components.map((comp) => this.processComponent(comp));
  }
}
