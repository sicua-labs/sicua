/**
 * Constants for accessibility analysis
 * Comprehensive arrays of values used across the accessibility analyzer
 */

/**
 * Complete list of HTML elements for identifying HTML vs React components
 */
export const HTML_TAGS = [
  // Document metadata
  "html",
  "head",
  "title",
  "base",
  "link",
  "meta",
  "style",

  // Content sectioning
  "address",
  "article",
  "aside",
  "footer",
  "header",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "main",
  "nav",
  "section",

  // Text content
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "ul",

  // Inline text semantics
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "br",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "i",
  "kbd",
  "mark",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
  "wbr",

  // Image and multimedia
  "area",
  "audio",
  "img",
  "map",
  "track",
  "video",

  // Embedded content
  "embed",
  "iframe",
  "object",
  "picture",
  "portal",
  "source",

  // SVG and MathML
  "svg",
  "math",

  // Scripting
  "canvas",
  "noscript",
  "script",

  // Demarcating edits
  "del",
  "ins",

  // Table content
  "caption",
  "col",
  "colgroup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",

  // Forms
  "button",
  "datalist",
  "fieldset",
  "form",
  "input",
  "label",
  "legend",
  "meter",
  "optgroup",
  "option",
  "output",
  "progress",
  "select",
  "textarea",

  // Interactive elements
  "details",
  "dialog",
  "summary",

  // Web Components
  "slot",
  "template",

  // Obsolete and deprecated (but still might be found)
  "acronym",
  "applet",
  "basefont",
  "bgsound",
  "big",
  "blink",
  "center",
  "command",
  "content",
  "dir",
  "element",
  "font",
  "frame",
  "frameset",
  "isindex",
  "keygen",
  "listing",
  "marquee",
  "menuitem",
  "multicol",
  "nextid",
  "nobr",
  "noembed",
  "noframes",
  "plaintext",
  "shadow",
  "spacer",
  "strike",
  "tt",
  "xmp",
];

/**
 * Meaningless alt text patterns that should be flagged
 */
export const MEANINGLESS_ALT_PATTERNS = [
  // Generic image terms
  "image",
  "img",
  "picture",
  "pic",
  "photo",
  "photograph",
  "graphic",
  "illustration",
  "figure",
  "diagram",
  "chart",
  "graph",

  // Generic UI elements
  "icon",
  "logo",
  "button",
  "link",
  "banner",
  "header",
  "footer",

  // File-related terms
  "jpeg",
  "jpg",
  "png",
  "gif",
  "svg",
  "webp",
  "bitmap",
  "file",

  // Placeholder text
  "placeholder",
  "dummy",
  "sample",
  "example",
  "test",

  // Generic descriptors
  "visual",
  "element",
  "content",
  "item",
  "object",
  "thing",

  // Common lazy descriptions
  "untitled",
  "unnamed",
  "default",
  "blank",
  "empty",

  // Decorative indicators
  "decoration",
  "decorative",
  "ornament",
  "border",
  "spacer",
  "separator",
];

/**
 * Non-descriptive link text patterns that should be flagged
 */
export const NON_DESCRIPTIVE_LINK_PATTERNS = [
  // Generic calls to action
  "click here",
  "click",
  "here",
  "this",
  "that",

  // Vague continuations
  "more",
  "read more",
  "learn more",
  "see more",
  "view more",
  "show more",
  "continue",
  "continue reading",
  "keep reading",

  // Generic navigation
  "next",
  "previous",
  "prev",
  "back",
  "forward",
  "go",

  // Non-specific references
  "link",
  "url",
  "website",
  "page",
  "site",
  "document",
  "file",

  // Action words without context
  "download",
  "open",
  "view",
  "see",
  "watch",
  "listen",

  // Placeholder text
  "lorem ipsum",
  "placeholder",
  "example",
  "sample",
  "test",

  // Single characters or numbers
  ">",
  "<",
  "»",
  "«",
  "x",
  "+",
  "-",
  "1",
  "2",
  "3",

  // Generic references
  "article",
  "post",
  "item",
  "content",
  "details",
  "info",
  "information",
];

/**
 * Complete list of valid ARIA roles
 * Based on ARIA 1.2 specification
 */
export const VALID_ARIA_ROLES = [
  // Document structure roles
  "application",
  "article",
  "banner",
  "complementary",
  "contentinfo",
  "definition",
  "directory",
  "document",
  "feed",
  "figure",
  "group",
  "heading",
  "img",
  "list",
  "listitem",
  "main",
  "math",
  "navigation",
  "none",
  "note",
  "presentation",
  "region",
  "search",
  "separator",
  "toolbar",

  // Landmark roles
  "banner",
  "complementary",
  "contentinfo",
  "form",
  "main",
  "navigation",
  "region",
  "search",

  // Live region roles
  "alert",
  "log",
  "marquee",
  "status",
  "timer",

  // Window roles
  "alertdialog",
  "dialog",

  // Widget roles - Form
  "button",
  "checkbox",
  "gridcell",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "progressbar",
  "radio",
  "scrollbar",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "tabpanel",
  "textbox",
  "tooltip",
  "treeitem",

  // Widget roles - Composite
  "combobox",
  "grid",
  "listbox",
  "menu",
  "menubar",
  "radiogroup",
  "tablist",
  "tree",
  "treegrid",

  // Widget roles - Range
  "progressbar",
  "scrollbar",
  "slider",
  "spinbutton",

  // Widget roles - Select
  "listbox",
  "menu",
  "radiogroup",
  "tree",

  // Abstract roles (should not be used directly but included for completeness)
  "command",
  "composite",
  "input",
  "landmark",
  "range",
  "roletype",
  "section",
  "sectionhead",
  "select",
  "structure",
  "widget",

  // ARIA 1.2 additions
  "cell",
  "columnheader",
  "row",
  "rowgroup",
  "rowheader",
  "table",

  // Additional roles
  "term",
  "generic",
];

/**
 * ARIA roles that indicate interactive elements
 */
export const INTERACTIVE_ARIA_ROLES = [
  // Basic interactive roles
  "button",
  "link",
  "checkbox",
  "radio",
  "switch",
  "textbox",
  "searchbox",

  // Menu roles
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",

  // Selection roles
  "option",
  "tab",
  "treeitem",

  // Input roles
  "slider",
  "spinbutton",
  "scrollbar",

  // Composite interactive roles
  "combobox",
  "listbox",
  "menu",
  "menubar",
  "radiogroup",
  "tablist",
  "tree",
  "treegrid",
  "grid",
  "gridcell",
];

/**
 * HTML elements that are inherently interactive
 */
export const INTERACTIVE_HTML_ELEMENTS = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "details",
  "summary",
];

/**
 * Input types that don't require labels (hidden, submit buttons, etc.)
 */
export const INPUT_TYPES_WITHOUT_LABELS = [
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
];

/**
 * ARIA attributes that should not be empty
 */
export const ARIA_LABELING_ATTRIBUTES = [
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-description",
  "title",
];

/**
 * ARIA attributes with boolean values
 */
export const ARIA_BOOLEAN_ATTRIBUTES = [
  "aria-atomic",
  "aria-busy",
  "aria-checked",
  "aria-current",
  "aria-disabled",
  "aria-expanded",
  "aria-grabbed",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-pressed",
  "aria-readonly",
  "aria-required",
  "aria-selected",
];

/**
 * Valid values for specific ARIA attributes
 */
export const ARIA_ATTRIBUTE_VALUES = {
  "aria-hidden": ["true", "false"],
  "aria-expanded": ["true", "false", "undefined"],
  "aria-pressed": ["true", "false", "mixed", "undefined"],
  "aria-checked": ["true", "false", "mixed", "undefined"],
  "aria-selected": ["true", "false", "undefined"],
  "aria-current": ["page", "step", "location", "date", "time", "true", "false"],
  "aria-disabled": ["true", "false"],
  "aria-invalid": ["true", "false", "grammar", "spelling"],
  "aria-haspopup": [
    "true",
    "false",
    "menu",
    "listbox",
    "tree",
    "grid",
    "dialog",
  ],
  "aria-live": ["off", "polite", "assertive"],
  "aria-orientation": ["horizontal", "vertical", "undefined"],
  "aria-sort": ["ascending", "descending", "none", "other"],
  "aria-autocomplete": ["inline", "list", "both", "none"],
};

/**
 * Heading tags for hierarchy validation
 */
export const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

/**
 * Form-related elements that should have labels
 */
export const FORM_CONTROLS = [
  "input",
  "select",
  "textarea",
  "meter",
  "progress",
  "output",
];

/**
 * Elements that can contain clickable content but aren't inherently interactive
 */
export const CLICKABLE_NON_INTERACTIVE_ELEMENTS = [
  "div",
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "td",
  "th",
  "tr",
];

/**
 * Common event handler prop names in React
 */
export const INTERACTIVE_EVENT_HANDLERS = [
  "onClick",
  "onPress",
  "onTap",
  "onKeyDown",
  "onKeyPress",
  "onKeyUp",
  "onMouseDown",
  "onMouseUp",
  "onTouchStart",
  "onTouchEnd",
];

/**
 * Screen reader only class patterns
 * Used to identify content that is visually hidden but accessible to screen readers
 */
export const SCREEN_READER_ONLY_PATTERNS = [
  /\bsr-only\b/,
  /\bscreen-reader-only\b/,
  /\bvisually-hidden\b/,
  /\ba11y-hidden\b/,
  /\baccessibility-hidden\b/,
  /\boffscreen\b/,
  /\bclip\b/,
];

/**
 * Hidden element class patterns
 * Used to identify elements that are completely hidden
 */
export const HIDDEN_ELEMENT_PATTERNS = [
  /\bhidden\b/,
  /\binvisible\b/,
  /\bopacity-0\b/,
  /\bdisplay-none\b/,
  /\bd-none\b/,
];

/**
 * Style-based hiding patterns
 * CSS properties that indicate hidden content
 */
export const HIDDEN_STYLE_PATTERNS = [
  /display:\s*none/,
  /visibility:\s*hidden/,
  /opacity:\s*0/,
  /width:\s*0/,
  /height:\s*0/,
  /position:\s*absolute.*left:\s*-\d+/,
  /clip:\s*rect\(0,\s*0,\s*0,\s*0\)/,
];

/**
 * Common icon component patterns
 * Used to identify React icon components
 */
export const ICON_COMPONENT_PATTERNS = [
  /Icon$/,
  /^Icon/,
  /^Fa[A-Z]/, // FontAwesome
  /^Md[A-Z]/, // Material Design
  /^Fi[A-Z]/, // Feather
  /^Hi[A-Z]/, // Heroicons
  /^Lu[A-Z]/, // Lucide
  /^Bs[A-Z]/, // Bootstrap Icons
  /^Ai[A-Z]/, // Ant Design Icons
  /^Tb[A-Z]/, // Tabler Icons
];

/**
 * Icon class patterns
 * CSS classes that indicate icon content
 */
export const ICON_CLASS_PATTERNS = [
  /\bicon\b/,
  /\bfa-/,
  /\bmaterial-icons\b/,
  /\blucide\b/,
  /\bfeather\b/,
  /\bheroicons\b/,
  /\btabler-icon\b/,
  /\bbootstrap-icon\b/,
  /\banticon\b/,
];

/**
 * Decorative element tag names
 * Elements that are typically decorative and don't need text
 */
export const DECORATIVE_ELEMENTS = [
  "svg",
  "img",
  "icon",
  "loader",
  "spinner",
  "hr",
  "br",
];

/**
 * Variable names that likely contain text content
 * Used for static analysis when we can't evaluate expressions
 */
export const TEXT_VARIABLE_PATTERNS = [
  /\b(text|label|title|message|content|name|value)\b/i,
  /\b\w*Text\b/i,
  /\b\w*Label\b/i,
  /\b\w*Title\b/i,
  /\b\w*Message\b/i,
  /\b\w*Content\b/i,
  /\b\w*String\b/i,
];

/**
 * Common labeling prop names in component libraries
 * Props that often contain accessibility labels
 */
export const LABELING_PROP_NAMES = [
  "label",
  "labelText",
  "inputLabel",
  "fieldLabel",
  "aria",
  "ariaLabel",
  "accessibilityLabel",
  "description",
  "hint",
  "helperText",
  "children",
];

/**
 * Common spread prop patterns
 * Prop names that suggest spread operators containing accessibility attributes
 */
export const SPREAD_PROP_PATTERNS = [
  "props",
  "rest",
  "otherProps",
  "additionalProps",
  "a11yProps",
  "accessibility",
  "attributes",
  "attrs",
];
