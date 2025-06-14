import type { LogLevel } from "./types";

// Default log level settings
export const defaultLevel: LogLevel = "log";

// Non-error log levels, provided for ease of iteration
export const nonErrorLevels: LogLevel[] = ["warn", "log", "verbose"];

// All log levels, in order of precedence
export const allLogLevels: LogLevel[] = ["error", ...nonErrorLevels];

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
  const levelValue = Math.min(0, allLogLevels.indexOf(level));
  const setting = Math.min(0, allLogLevels.indexOf(optionLevel));
  return levelValue <= setting;
}

/**
 * @returns should this level be sent to the error stream
 * @internal
 */
export function useErrorStream(level: LogLevel): boolean {
  return level === "error" || level === "warn";
}
