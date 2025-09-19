import {
  ALL_LOG_LEVELS,
  DEFAULT_LOG_LEVEL,
  LL_ERROR,
  LL_WARN,
  type LogLevel,
} from "./levels.ts";
import { getConsoleWrite } from "./streams.ts";
import type { OutputFunction, OutputWriter } from "./types.ts";

/**
 * Create a new OutputWriter instance. If no functions are specified, will create a writer for
 * the console, otherwise will create a writer based on the specified functions.
 *
 * @param level log level to use, defaults to DEFAULT_LOG_LEVEL if not specified
 * @param outFn output function to use, defaults to WRITE_STDOUT if not specified
 * @param errFn error output function to use, will default to outFn or WRITE_STDERR if not specified
 * @returns a new OutputWriter instance
 */
export function createOutput(
  level: LogLevel = DEFAULT_LOG_LEVEL,
  outFn?: OutputFunction,
  errFn?: OutputFunction
): OutputWriter {
  const writeOut = outFn ?? getConsoleWrite("stdout");
  const writeErr = errFn ?? outFn ?? getConsoleWrite("stderr");
  return Object.fromEntries(
    getLevels(level).map((lvl) => [
      lvl,
      lvl === LL_ERROR || lvl === LL_WARN ? writeErr : writeOut,
    ])
  );
}

/**
 * Merge multiple OutputWriter instances into one.
 * @param outputs the OutputWriter instances to merge
 * @returns a new OutputWriter instance that writes to all provided writers
 */
export function mergeOutput(...outputs: OutputWriter[]): OutputWriter {
  const mergedWrites = ALL_LOG_LEVELS.map((level) => getWrite(level, outputs));
  const result: OutputWriter = {};
  for (let i = 0; i < ALL_LOG_LEVELS.length; i++) {
    if (mergedWrites[i]) {
      result[ALL_LOG_LEVELS[i]] = mergedWrites[i];
    }
  }
  return result;
}

/**
 * Get a merged write function for a specific log level from a list of OutputWriter instances.
 * @param level the log level to get the write function for
 * @param outputs the OutputWriter instances to search
 * @returns the write function for the specified log level, or undefined if not found
 */
function getWrite(
  level: LogLevel,
  outputs: OutputWriter[]
): OutputFunction | undefined {
  const writes = outputs
    .map((output) => output[level])
    .filter((o) => o !== undefined);
  return writes.length === 0
    ? undefined
    : writes.length === 1
      ? writes[0]
      : (msg: string) => {
          writes.forEach((write) => write(msg));
        };
}

/**
 * Get the log levels for a specific log level.
 * @param level the log level to get levels for
 * @returns an array of log levels that are equal to or more severe than the specified level
 */
function getLevels(level: LogLevel = DEFAULT_LOG_LEVEL): LogLevel[] {
  const index = ALL_LOG_LEVELS.indexOf(level);
  return ALL_LOG_LEVELS.slice(0, index >= 0 ? index + 1 : 1);
}
