// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * File logging module for CLI scripts.
 *
 * Writes log messages to a log file.
 *
 * ## Log Levels
 *
 * - `none`: No file logging at all
 * - `error`: Only errors logged to file
 * - `default`: error + warn + info logged to file
 * - `debug`: Everything including debug/verbose details
 *
 * ## Usage
 *
 * ```typescript
 * import { initLogger, info, debug, warn, error } from './modules/log.ts';
 *
 * initLogger({
 *   name: 'sync',
 *   logDir: args['log-dir'],
 *   logLevel: args['log-level'],
 * });
 *
 * info('Starting sync...');
 * debug('Detailed info here');
 * warn('Something unusual');
 * error('Something failed');
 * ```
 *
 * @module log
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { LazyString, MessageLevel } from "./common.ts";
import { resolve } from "./common.ts";

// =============================================================================
// Types
// =============================================================================

/**
 * Log level for file logging.
 * - 'none': No file logging at all
 * - 'error': Only errors logged to file
 * - 'default': error + warn + info logged to file
 * - 'debug': Everything including debug/verbose details
 */
export type LogLevel = "none" | "error" | "default" | "debug";

export type { MessageLevel } from "./common.ts";

/**
 * Configuration for logger initialization.
 */
export interface LoggerConfig {
  /** Script name for log filename (e.g., 'sync', 'ai-merge') */
  name?: string;

  /** Directory for log files (default: '.logs' at repo root) */
  logDir?: string;

  /** Log level for file output (default: 'default') */
  logLevel?: LogLevel;
}

// =============================================================================
// Constants
// =============================================================================

/** Valid log levels for validation. */
export const VALID_LOG_LEVELS: readonly LogLevel[] = [
  "none",
  "error",
  "default",
  "debug",
];

/** Priority order for log levels. Higher number = more verbose. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  none: 0,
  error: 1,
  default: 2,
  debug: 3,
};

// =============================================================================
// Module State
// =============================================================================

let initialized = false;
let logName = "";
let logDir = "";
let logLevel: LogLevel = "default";
let logFilePath: string | null = null;
let fileCreated = false;

// =============================================================================
// Public API
// =============================================================================

/**
 * Initialize the logger. Must be called once at script startup.
 * @throws Error if called more than once without closing
 */
export function initLogger(config: LoggerConfig): void {
  if (initialized) {
    throw new Error("Logger already initialized. Call closeLogger() first.");
  }

  // Validate log level if provided
  if (config.logLevel && !VALID_LOG_LEVELS.includes(config.logLevel)) {
    throw new Error(
      `Invalid log level: ${config.logLevel}. Valid levels: ${VALID_LOG_LEVELS.join(", ")}`
    );
  }

  logName = config.name?.trim() || "log";
  logLevel = config.logLevel ?? "default";
  logDir = path.resolve(process.cwd(), config.logDir ?? ".logs");
  initialized = true;
  fileCreated = false;

  if (logLevel !== "none") {
    logFilePath = generateLogFilePath(logDir, logName);
  } else {
    logFilePath = null;
  }
}

/**
 * Close the logger and reset state.
 * Can be called before process exit for explicit cleanup.
 */
export async function closeLogger(): Promise<void> {
  initialized = false;
  logName = "";
  logDir = "";
  logLevel = "default";
  logFilePath = null;
  fileCreated = false;
}

/** Check if the logger is initialized. */
export function isLoggerInitialized(): boolean {
  return initialized;
}

/** Get the current log file path (if any). Returns null if logging is disabled or not initialized. */
export function getLogFilePath(): string | null {
  return logFilePath;
}

/** Get the current log level. */
export function getLogLevel(): LogLevel {
  return logLevel;
}

/**
 * Validate and return a log level from a string.
 * Exits with error message if invalid.
 */
export function validateLogLevel(level: string): LogLevel {
  if (!VALID_LOG_LEVELS.includes(level as LogLevel)) {
    console.error(
      `Error: Invalid log level: ${level}. Valid levels: ${VALID_LOG_LEVELS.join(", ")}`
    );
    process.exit(1);
  }
  return level as LogLevel;
}

// =============================================================================
// Logging Functions (file only, no console output)
// =============================================================================

/** Log error message to file. */
export function error(message: LazyString): void {
  appendToLog(LEVEL_PRIORITY.error, "ERROR", message);
}

/** Log warning message to file. */
export function warn(message: LazyString): void {
  appendToLog(LEVEL_PRIORITY.default, "WARN", message);
}

/** Log info message to file. */
export function info(message: LazyString): void {
  appendToLog(LEVEL_PRIORITY.default, "INFO", message);
}

/** Log debug message to file. Only writes when log level is 'debug'. */
export function debug(message: LazyString): void {
  appendToLog(LEVEL_PRIORITY.debug, "DEBUG", message);
}

/**
 * Log a message with specified level.
 * Convenience function for use with logger callbacks.
 */
export function logMessage(level: MessageLevel, message: LazyString): void {
  switch (level) {
    case "error":
      error(message);
      break;
    case "warn":
      warn(message);
      break;
    case "info":
      info(message);
      break;
    case "debug":
      debug(message);
      break;
  }
}

// =============================================================================
// Testing Helpers
// =============================================================================

/** Reset logger state for testing purposes. @internal */
export function _resetForTesting(): void {
  initialized = false;
  logName = "";
  logDir = "";
  logLevel = "default";
  logFilePath = null;
  fileCreated = false;
}

/** Generate timestamp safe for filenames. Format: YYYY-MM-DD_HH-MM-SS */
export function getTimestampForFile(): string {
  return getTimestamp().replace(/ /g, "_").replace(/:/g, "-");
}

// =============================================================================
// Private Implementation
// =============================================================================

/** Format and append a log message to file if current log level permits. */
function appendToLog(
  minPriority: number,
  level: string,
  message: LazyString
): void {
  if (
    !initialized ||
    logFilePath === null ||
    LEVEL_PRIORITY[logLevel] < minPriority
  )
    return;
  const text = resolve(message);
  if (!fileCreated) {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
  }
  fs.appendFileSync(
    logFilePath,
    `[${getTimestamp()}] [${level}] ${text}\n`,
    "utf-8"
  );
  fileCreated = true;
}

/** Generate human-readable timestamp for log entries. Format: YYYY-MM-DD HH:MM:SS */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/** Generate full log file path. Example: .logs/sync-2026-01-26_14-30-45.log */
function generateLogFilePath(dir: string, name: string): string {
  const timestamp = getTimestampForFile();
  const filename = `${name}-${timestamp}.log`;
  return path.join(dir, filename);
}
