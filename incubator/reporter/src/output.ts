import {
  ALL_LOG_LEVELS,
  DEFAULT_LOG_LEVEL,
  LL_ERROR,
  LL_WARN,
  type LogLevel,
} from "./levels.ts";
import type { OutputFunction, OutputWriter } from "./types.ts";

const WRITE_STDOUT: OutputFunction = process.stdout.write.bind(process.stdout);
const WRITE_STDERR: OutputFunction = process.stderr.write.bind(process.stderr);

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
  outFn: OutputFunction = WRITE_STDOUT,
  errFn?: OutputFunction
): OutputWriter {
  errFn ??= outFn === WRITE_STDOUT ? WRITE_STDERR : outFn;
  return Object.fromEntries(
    getLevels(level).map((lvl) => [
      lvl,
      level === LL_ERROR || level === LL_WARN ? errFn : outFn,
    ])
  );
}

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

function getLevels(level: LogLevel = DEFAULT_LOG_LEVEL): LogLevel[] {
  const index = ALL_LOG_LEVELS.indexOf(level);
  return ALL_LOG_LEVELS.slice(0, index >= 0 ? index + 1 : 1);
}
