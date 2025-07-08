/**
 * Common UI component patterns used to identify reusable UI components
 * vs page/route components in React applications
 */
export const UI_COMPONENT_PATTERNS = [
  // Form components
  "Button",
  "Input",
  "Select",
  "Checkbox",
  "Radio",
  "Textarea",
  "Form",
  "FormField",
  "FormGroup",
  "Label",
  "Dropdown",
  "DatePicker",
  "TimePicker",
  "Slider",
  "Switch",
  "SearchBox",

  // Layout components
  "Layout",
  "Header",
  "Footer",
  "Sidebar",
  "Nav",
  "Navbar",
  "Menu",
  "MenuItem",
  "Breadcrumb",
  "Container",
  "Grid",
  "Row",
  "Column",
  "Section",
  "Wrapper",

  // Display components
  "Card",
  "Table",
  "List",
  "ListItem",
  "Avatar",
  "Badge",
  "Tag",
  "Chip",
  "Progress",
  "Spinner",
  "Loader",
  "Image",
  "Icon",
  "Divider",
  "Separator",

  // Interactive components
  "Modal",
  "Dialog",
  "Tooltip",
  "Popover",
  "Accordion",
  "Tab",
  "TabPanel",
  "Carousel",
  "Gallery",
  "Drawer",
  "Sheet",

  // Feedback components
  "Alert",
  "Toast",
  "Notification",
  "Banner",
  "ErrorBoundary",
  "SkeletonLoader",
  "EmptyState",

  // Data components
  "Chart",
  "Graph",
  "Calendar",
  "Timeline",
  "DataTable",
  "Pagination",
  "Filter",
  "Sort",
] as const;

/**
 * Directory patterns that typically contain UI components
 */
export const UI_COMPONENT_DIRECTORIES = [
  "/components/",
  "\\components\\",
  "/ui/",
  "\\ui\\",
  "/shared/",
  "\\shared\\",
  "/common/",
  "\\common\\",
] as const;

/**
 * File patterns that indicate page components (should NOT be considered UI components)
 */
export const PAGE_COMPONENT_PATTERNS = [
  "page.tsx",
  "page.jsx",
  "Page.tsx",
  "Page.jsx",
  "index.tsx",
  "index.jsx",
] as const;

/**
 * Content patterns that indicate page components
 */
export const PAGE_COMPONENT_CONTENT_PATTERNS = [
  "generateMetadata",
  "export const metadata",
  "export default function Page",
  "getServerSideProps",
  "getStaticProps",
] as const;
