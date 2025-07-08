/**
 * Constants for the General Analyzer - Magic Number Detection
 */

/**
 * Common numbers that are typically not considered magic numbers
 */
export const COMMON_NUMBERS = new Set([
  // Basic numbers
  0,
  1,
  -1,
  2,
  3,
  4,
  5,
  10,
  100,
  1000,

  // Mathematical constants (integers)
  360, // degrees in circle
  180, // half circle degrees
  90, // quarter circle degrees
  45, // eighth circle degrees

  // Time-related constants
  24, // hours in day
  60, // minutes in hour, seconds in minute
  1000, // milliseconds in second
  3600, // seconds in hour
  86400, // seconds in day

  // Date/time related
  7, // days in week
  12, // months in year
  30, // approximate days in month
  31, // max days in month
  365, // days in year
  366, // days in leap year

  // HTTP status codes
  200,
  201,
  202,
  204, // success codes
  300,
  301,
  302,
  304, // redirect codes
  400,
  401,
  403,
  404,
  405,
  409,
  422,
  429, // client error codes
  500,
  501,
  502,
  503,
  504, // server error codes

  // Common percentages as integers
  25,
  50,
  75, // quarter percentages

  // Common array/collection sizes
  16,
  32,
  64,
  128,
  256,
  512,
  1024, // powers of 2

  // Common UI values
  8,
  16,
  24,
  32,
  48,
  64, // common spacing/sizing in design systems
]);

/**
 * CSS property names (both camelCase and kebab-case)
 */
export const CSS_PROPERTIES = new Set([
  // Layout & Box Model
  "width",
  "height",
  "min-width",
  "minWidth",
  "max-width",
  "maxWidth",
  "min-height",
  "minHeight",
  "max-height",
  "maxHeight",
  "top",
  "bottom",
  "left",
  "right",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",

  // Border
  "border",
  "borderWidth",
  "border-width",
  "borderTopWidth",
  "border-top-width",
  "borderBottomWidth",
  "border-bottom-width",
  "borderLeftWidth",
  "border-left-width",
  "borderRightWidth",
  "border-right-width",
  "borderRadius",
  "border-radius",
  "borderTopLeftRadius",
  "border-top-left-radius",
  "borderTopRightRadius",
  "border-top-right-radius",
  "borderBottomLeftRadius",
  "border-bottom-left-radius",
  "borderBottomRightRadius",
  "border-bottom-right-radius",

  // Position & Z-Index
  "z-index",
  "zIndex",
  "position",

  // Typography
  "font-size",
  "fontSize",
  "line-height",
  "lineHeight",
  "font-weight",
  "fontWeight",
  "letter-spacing",
  "letterSpacing",
  "word-spacing",
  "wordSpacing",
  "text-indent",
  "textIndent",

  // Visual Effects
  "opacity",
  "background-opacity",
  "backgroundOpacity",
  "filter",
  "backdrop-filter",
  "backdropFilter",

  // Flexbox
  "flex",
  "flex-grow",
  "flexGrow",
  "flex-shrink",
  "flexShrink",
  "flex-basis",
  "flexBasis",
  "order",

  // Grid
  "grid",
  "grid-template-columns",
  "gridTemplateColumns",
  "grid-template-rows",
  "gridTemplateRows",
  "grid-column",
  "gridColumn",
  "grid-row",
  "gridRow",
  "grid-column-start",
  "gridColumnStart",
  "grid-column-end",
  "gridColumnEnd",
  "grid-row-start",
  "gridRowStart",
  "grid-row-end",
  "gridRowEnd",
  "grid-gap",
  "gridGap",
  "column-gap",
  "columnGap",
  "row-gap",
  "rowGap",

  // Transform
  "transform",
  "scale",
  "scaleX",
  "scaleY",
  "scaleZ",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "translate",
  "translateX",
  "translateY",
  "translateZ",
  "skew",
  "skewX",
  "skewY",

  // Animation & Transition
  "animation",
  "animation-duration",
  "animationDuration",
  "animation-delay",
  "animationDelay",
  "animation-iteration-count",
  "animationIterationCount",
  "transition",
  "transition-duration",
  "transitionDuration",
  "transition-delay",
  "transitionDelay",

  // Scroll
  "scroll-margin",
  "scrollMargin",
  "scroll-padding",
  "scrollPadding",

  // Misc
  "outline",
  "outline-width",
  "outlineWidth",
  "outline-offset",
  "outlineOffset",
  "box-shadow",
  "boxShadow",
  "text-shadow",
  "textShadow",
]);

/**
 * Patterns for constant-style variable names
 */
export const CONSTANT_PATTERNS = [
  // Prefixes indicating constants
  /^(MAX|MIN|DEFAULT|INITIAL|BASE|ROOT)_/i,
  /^(API|CONFIG|CONSTANT|SETTING|OPTION)_/i,
  /^(ERROR|SUCCESS|WARNING|INFO)_/i,
  /^(CACHE|STORAGE|DATABASE|DB)_/i,
  /^(HTTP|HTTPS|WS|WSS)_/i,
  /^(ENV|ENVIRONMENT)_/i,

  // Suffixes indicating constants
  /_(LIMIT|DELAY|TIMEOUT|DURATION|INTERVAL)$/i,
  /_(SIZE|COUNT|LENGTH|AMOUNT|QUANTITY)$/i,
  /_(RATE|RATIO|PERCENTAGE|PERCENT)$/i,
  /_(CODE|STATUS|STATE|MODE|TYPE)$/i,
  /_(URL|URI|PATH|ROUTE|ENDPOINT)$/i,
  /_(KEY|SECRET|TOKEN|ID|IDENTIFIER)$/i,

  // Time-related suffixes
  /_(MILLISECONDS|SECONDS|MINUTES|HOURS|DAYS|WEEKS|MONTHS|YEARS)$/i,
  /_(MS|S|MIN|H|D|W|M|Y)$/i,

  // Unit suffixes
  /_(PX|EM|REM|VW|VH|PERCENT|DEG|RAD)$/i,
  /_(BYTES|KB|MB|GB|TB)$/i,

  // Common constant naming patterns
  /^[A-Z][A-Z0-9_]*[A-Z0-9]$/, // UPPER_CASE constants
];

/**
 * UI-related prop names commonly used in React components
 */
export const UI_PROPS = new Set([
  // Size and dimensions
  "size",
  "width",
  "height",
  "radius",
  "diameter",
  "strokeWidth",
  "stroke-width",
  "lineWidth",
  "line-width",

  // Visual properties
  "opacity",
  "fillOpacity",
  "fill-opacity",
  "strokeOpacity",
  "stroke-opacity",
  "alpha",
  "transparency",

  // Timing and animation
  "delay",
  "duration",
  "delayDuration",
  "animationDuration",
  "animation-duration",
  "transitionDuration",
  "transition-duration",
  "timeout",

  // Layout and positioning
  "cols",
  "columns",
  "rows",
  "span",
  "colSpan",
  "rowSpan",
  "offset",
  "gap",
  "spacing",
  "gutter",

  // Grid system
  "gridCols",
  "grid-cols",
  "gridRows",
  "grid-rows",
  "gridSpan",
  "grid-span",
  "colStart",
  "col-start",
  "colEnd",
  "col-end",
  "rowStart",
  "row-start",
  "rowEnd",
  "row-end",

  // Flex properties
  "flex",
  "flexGrow",
  "flex-grow",
  "flexShrink",
  "flex-shrink",
  "flexBasis",
  "flex-basis",
  "order",

  // UI state and interaction
  "tabIndex",
  "tab-index",
  "zIndex",
  "z-index",
  "step",
  "max",
  "min",
  "maxLength",
  "max-length",
  "minLength",
  "min-length",
  "rows",
  "cols",
  "size",
  "span",

  // Progress and loading
  "value",
  "progress",
  "percentage",
  "percent",

  // Scroll and viewport
  "threshold",
  "rootMargin",
  "root-margin",

  // Component-specific props
  "speed",
  "sensitivity",
  "precision",
  "tolerance",
  "segments",
  "divisions",
  "steps",
  "levels",
  "depth",

  // Media and responsive
  "breakpoint",
  "viewport",
  "aspect",
  "ratio",
]);

/**
 * Function names that typically receive UI-related numeric arguments
 */
export const UI_FUNCTIONS = new Set([
  // Timing functions
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",

  // Animation and transition functions
  "animate",
  "transition",
  "transform",
  "scale",
  "rotate",
  "translate",
  "fadeIn",
  "fadeOut",
  "slideIn",
  "slideOut",
  "bounce",
  "pulse",

  // Delay and throttling
  "delay",
  "debounce",
  "throttle",
  "wait",

  // Scroll functions
  "scrollTo",
  "scrollBy",
  "scrollIntoView",

  // Resize and positioning
  "resize",
  "move",
  "position",
  "offset",

  // Canvas and graphics
  "arc",
  "circle",
  "rect",
  "ellipse",
  "line",
  "curve",
  "fillRect",
  "strokeRect",
  "clearRect",
  "moveTo",
  "lineTo",
  "quadraticCurveTo",
  "bezierCurveTo",

  // Audio/Video
  "play",
  "pause",
  "seek",
  "volume",
  "playbackRate",

  // Math functions commonly used in UI
  "Math.sin",
  "Math.cos",
  "Math.tan",
  "Math.atan2",
  "Math.sqrt",
  "Math.pow",
  "Math.abs",
  "Math.round",
  "Math.floor",
  "Math.ceil",
  "Math.random",
  "Math.min",
  "Math.max",

  // String manipulation for UI display
  "slice",
  "substring",
  "substr",
  "split",
  "join",
  "toString",
  "toFixed",
  "toPrecision",

  // Array methods for UI data processing
  "filter",
  "map",
  "reduce",
  "find",
  "some",
  "every",

  // Common utility functions
  "clamp",
  "lerp",
  "map",
  "range",
  "normalize",
]);

/**
 * Additional animation and motion-related property patterns
 */
export const ANIMATION_PATTERNS = [
  // Framer Motion specific
  /^(initial|animate|exit|whileHover|whileTap|whileInView)$/i,
  /^(transition|variants|layout)$/i,

  // Animation timing
  /^(delay|duration|repeatDelay|stagger)$/i,
  /^(staggerChildren|delayChildren)$/i,

  // Transform properties
  /^(x|y|z|scale|scaleX|scaleY|scaleZ)$/i,
  /^(rotate|rotateX|rotateY|rotateZ)$/i,
  /^(skew|skewX|skewY)$/i,

  // Spring physics
  /^(stiffness|damping|mass|tension|friction)$/i,
  /^(velocity|restSpeed|restDelta)$/i,

  // Easing and curves
  /^(ease|easeIn|easeOut|easeInOut)$/i,
  /^(bezier|cubic)$/i,
];

/**
 * Chart and visualization related properties
 */
export const CHART_PROPS = new Set([
  // Chart dimensions
  "outerRadius",
  "innerRadius",
  "radius",
  "cx",
  "cy",
  "barSize",
  "barThickness",
  "maxBarThickness",
  "strokeWidth",
  "stroke-width",
  "lineWidth",
  "line-width",

  // Data visualization
  "dataKey",
  "domain",
  "range",
  "tick",
  "tickSize",
  "labelDensity",
  "threshold",
  "sensitivity",

  // Graph/Network layout
  "nodeSize",
  "nodeSeparation",
  "linkDistance",
  "linkStrength",
  "centerForce",
  "collideForce",
  "forceStrength",
  "idealEdgeLength",
  "edgeElasticity",
  "gravity",
  "gravityRange",
  "gravityCompound",
  "nestingFactor",
  "componentSpacing",

  // Simulation parameters
  "barnesHutTheta",
  "alpha",
  "alphaDecay",
  "velocityDecay",
  "iterations",
  "convergence",
  "attraction",
  "repulsion",

  // Zoom and interaction
  "wheelSensitivity",
  "zoomToNode",
  "minCameraRatio",
  "maxCameraRatio",
  "minZoom",
  "maxZoom",
  "zoomSpeed",
  "panSpeed",
]);

/**
 * Algorithm and mathematical constants that shouldn't be flagged
 */
export const ALGORITHM_CONSTANTS = new Set([
  // Color/RGB values
  255,
  256,
  16,
  8, // Bit operations and color channels

  // Mathematical constants (common algorithm values)
  0.2126,
  0.7152,
  0.0722, // Luminance calculation coefficients
  0.03928,
  12.92,
  0.055,
  1.055,
  2.4, // sRGB gamma correction
  0.05, // WCAG contrast calculation
  4.5,
  7, // WCAG AA/AAA contrast ratios

  // Physics/Animation constants
  0.01,
  0.02,
  0.05,
  0.1,
  0.15,
  0.2,
  0.25,
  0.3, // Common interpolation values

  // Percentage thresholds
  0.7,
  0.8,
  0.85,
  0.9,
  0.95, // Common percentage cutoffs

  // Data processing limits
  6,
  9,
  11,
  15,
  17,
  20,
  22, // Common display/truncation limits
]);

/**
 * Additional patterns that indicate business/configuration data
 */
export const BUSINESS_DATA_PATTERNS = [
  // Pricing and financial
  /^(price|cost|fee|rate|amount)$/i,
  /^(credits|points|tokens|balance)$/i,

  // Percentages and metrics
  /^(percentage|percent|ratio|score)$/i,

  // Configuration values
  /^(config|setting|option|param)$/i,
];

/**
 * Patterns for layout and positioning calculations
 */
export const LAYOUT_CALCULATION_PATTERNS = [
  // Arithmetic operations
  /[+\-*/]/,

  // Assignment with calculation
  /\+=|\-=|\*=|\/=/,

  // Coordinate/positioning
  /^(x|y|z|top|left|right|bottom|width|height)$/i,
];

/**
 * Color system constants that shouldn't be flagged
 */
export const COLOR_CONSTANTS = new Set([
  // OKLCH/Color system values
  0.557,
  0.18,
  0.2, // Common OKLCH lightness/chroma values
  250,
  245, // Common hue values

  // HSL common values
  360,
  180,
  120,
  240,
  300, // Hue wheel positions
]);

/**
 * Context patterns that indicate non-magic number usage
 */
export const CONTEXT_PATTERNS = [
  // Mathematical operations
  /Math\.(min|max|floor|ceil|round|abs)/,
  /\.(toFixed|toPrecision|toString)/,

  // Array/String manipulation
  /\.(slice|substring|substr)/,
  /\.length\s*[><=]/,

  // Bitwise operations (often for colors/flags)
  /[>><&|^]/,

  // Comparison operations with thresholds
  /[><=!]==?\s*\d/,
  /\d\s*[><=!]=?/,

  // Ternary conditions
  /\?\s*\d|\d\s*:/,

  // Default parameter assignments
  /=\s*\d+\.?\d*/,

  // Arithmetic operations
  /[+\-*/]\s*\d+\.?\d*|\d+\.?\d*\s*[+\-*/]/,

  // UPPERCASE constant definitions
  /^[A-Z_]+\s*[:=]/,

  // Color functions
  /oklch|rgb|hsl|hsla|rgba/i,
];
