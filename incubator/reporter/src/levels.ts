import { type LogLevel, allLogLevels } from "./types";

// Default log level settings
export const defaultLevel: LogLevel = "log";

// Non-error log levels, provided for ease of iteration
export const nonErrorLevels: LogLevel[] = allLogLevels.slice(
  allLogLevels.indexOf("error") + 1
);

/**
 * @returns a valid log level given the input string, falling back to the default if not
 * @internal
 */
export function asLogLevel(
  value: string,
  fallback: LogLevel = defaultLevel
): LogLevel {
  const level = value as LogLevel;
  if (allLogLevels.includes(level)) {
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
  optionLevel: LogLevel = defaultLevel
): boolean {
  const levelValue = allLogLevels.indexOf(level);
  const settingValue = allLogLevels.indexOf(optionLevel);
  if (levelValue >= 0 && settingValue >= 0) {
    // both settings valid, check precedence
    return levelValue <= settingValue;
  }
  // error is always supported, otherwise return false if one of the values wasn't recognized
  return level === "error";
}

/**
 * @returns should this level be sent to the error stream
 * @internal
 */
export function useErrorStream(level: LogLevel): boolean {
  return level === "error" || level === "warn";
}
