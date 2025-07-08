export const STATE_PATTERNS = {
  PREFIXES: new Set([
    "state.",
    "setState",
    "useState",
    "useReducer",
    "store.",
    "getState",
    "useSelector",
    "useStore",
  ]),

  BOOLEAN_PREFIXES: new Set([
    "is",
    "has",
    "should",
    "can",
    "will",
    "did",
    "was",
  ]),

  STATE_TERMS: new Set([
    "state",
    "status",
    "loading",
    "error",
    "data",
    "value",
    "count",
    "selected",
    "active",
    "enabled",
    "visible",
    "pending",
  ]),
} as const;
