export const ALL_LOG_LEVELS = ["error", "warn", "log", "verbose"] as const;

export const LL_ERROR = ALL_LOG_LEVELS[0];
export const LL_WARN = ALL_LOG_LEVELS[1];
export const LL_LOG = ALL_LOG_LEVELS[2];
export const LL_VERBOSE = ALL_LOG_LEVELS[3];

export type LogLevel = (typeof ALL_LOG_LEVELS)[number];

// Default log level settings
export const DEFAULT_LOG_LEVEL: LogLevel = LL_LOG;

/**
 * @returns a valid log level given the input string, falling back to the default if not
 * @internal
 */
export function asLogLevel(
  value: string,
  fallback: LogLevel = DEFAULT_LOG_LEVEL
): LogLevel {
  const level = value as LogLevel;
  if (ALL_LOG_LEVELS.includes(level)) {
    return level;
  }
  return fallback;
}

/**
 * @returns is this log level supported by the given option level
 * @internal
 */
export function supportsLevel(
  level: LogLevel,
  optionLevel: LogLevel = DEFAULT_LOG_LEVEL
): boolean {
  const levelValue = ALL_LOG_LEVELS.indexOf(level);
  const settingValue = ALL_LOG_LEVELS.indexOf(optionLevel);
  if (levelValue >= 0 && settingValue >= 0) {
    // both settings valid, check precedence
    return levelValue <= settingValue;
  }
  // error is always supported, otherwise return false if one of the values wasn't recognized
  return level === LL_ERROR;
}
