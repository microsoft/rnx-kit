export const ALL_LOG_LEVELS = Object.freeze([
  "error",
  "warn",
  "log",
  "verbose",
] as const);

export const LL_ERROR = ALL_LOG_LEVELS[0];
export const LL_WARN = ALL_LOG_LEVELS[1];
export const LL_LOG = ALL_LOG_LEVELS[2];
export const LL_VERBOSE = ALL_LOG_LEVELS[3];

export type LogLevel = (typeof ALL_LOG_LEVELS)[number];

// Default log level settings
export const DEFAULT_LOG_LEVEL: LogLevel = LL_LOG;
