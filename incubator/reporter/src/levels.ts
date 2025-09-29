export const LL_ERROR = "error" as const;
export const LL_WARN = "warn" as const;
export const LL_LOG = "log" as const;
export const LL_VERBOSE = "verbose" as const;

export const ALL_LOG_LEVELS = Object.freeze([
  LL_ERROR,
  LL_WARN,
  LL_LOG,
  LL_VERBOSE,
] as const);

// Default log level settings
export const DEFAULT_LOG_LEVEL = LL_LOG;
