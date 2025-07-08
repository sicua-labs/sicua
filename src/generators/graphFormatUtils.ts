/**
 * Get a color for a node based on its type
 */
export function getNodeColor(nodeProps: {
  isNextRoute?: boolean;
  isComponent?: boolean;
  routeType?: string;
  isDynamicRoute?: boolean;
}): string {
  // Priority color assignment

  // Dynamic route segments get highest priority
  if (nodeProps.isDynamicRoute) {
    if (nodeProps.routeType === "optional-catch-all") {
      return "#9C27B0"; // Purple for optional catch-all routes
    } else if (nodeProps.routeType === "catch-all") {
      return "#673AB7"; // Deep purple for catch-all routes
    } else {
      return "#E91E63"; // Pink for dynamic routes
    }
  }

  // Then Next.js route files
  if (nodeProps.isNextRoute) {
    // Different colors based on route type
    switch (nodeProps.routeType) {
      case "page":
        return "#4CAF50"; // Green for page
      case "layout":
        return "#00BCD4"; // Cyan for layout
      case "loading":
        return "#FFC107"; // Amber for loading
      case "error":
        return "#F44336"; // Red for error
      case "not-found":
        return "#FF9800"; // Orange for not-found
      case "api":
        return "#3F51B5"; // Indigo for API routes
      case "default":
        return "#009688"; // Teal for default
      default:
        return "#4CAF50"; // Default green for other route files
    }
  }

  // Then React components
  else if (nodeProps.isComponent) {
    return "#2196F3"; // Blue for components
  }

  // Then directories
  else if (nodeProps.routeType === "directory") {
    return "#9E9E9E"; // Gray for directories
  }

  // Default color for other files
  return "#757575"; // Dark gray default
}

/**
 * Get a color for an edge based on its type
 */
export function getEdgeColor(
  type?: "import" | "export" | "dynamic" | "parent-child"
): string {
  switch (type) {
    case "import":
      return "#666666"; // Dark gray for imports
    case "export":
      return "#FF5722"; // Orange for exports
    case "dynamic":
      return "#9C27B0"; // Purple for dynamic imports
    case "parent-child":
      return "#BDBDBD"; // Light gray for structure
    default:
      return "#BDBDBD"; // Light gray default
  }
}

/**
 * Get a node size based on its type
 */
export function getNodeSize(nodeProps: {
  isNextRoute?: boolean;
  isComponent?: boolean;
  routeType?: string;
  isDynamicRoute?: boolean;
}): number {
  // Dynamic routes get slightly larger size
  if (nodeProps.isDynamicRoute) {
    return 9;
  }

  // Differentiate sizes by node type
  if (nodeProps.isNextRoute) {
    switch (nodeProps.routeType) {
      case "page":
        return 8;
      case "layout":
        return 8;
      case "api":
        return 7;
      default:
        return 6;
    }
  } else if (nodeProps.isComponent) {
    return 6; // Standard size for components
  } else if (nodeProps.routeType === "directory") {
    return 5; // Smaller for directories
  }

  return 4; // Default smaller size for utility files
}

/**
 * Get an edge size based on its type
 */
export function getEdgeSize(
  type?: "import" | "export" | "dynamic" | "parent-child"
): number {
  switch (type) {
    case "import":
      return 1.5;
    case "export":
      return 2;
    case "dynamic":
      return 1;
    case "parent-child":
      return 0.8; // Thinner for structure
    default:
      return 1;
  }
}
