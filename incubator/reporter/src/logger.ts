import { ALL_LOG_LEVELS, type LogLevel } from "./levels.ts";
import { createOutput } from "./output.ts";
import type {
  LogFunction,
  Logger,
  LoggerOptions,
  OutputFunction,
  OutputOption,
  OutputWriter,
} from "./types.ts";
import { emptyFunction, inspectOptions, lazyInit, serialize } from "./utils.ts";

/**
 * Create a logger instance with the specified options.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const { output, prefix, onError } = options;
  const outputs = ensureOutput(output);
  const prefixes = prefix ?? defaultPrefix();

  // create logging functions for each log level
  const coreLogs = Object.fromEntries(
    ALL_LOG_LEVELS.map((level) => {
      const pfx = prefixes[level];
      return [
        level,
        createLog(outputs[level], pfx, level === "error" ? onError : undefined),
      ];
    })
  ) as Record<LogLevel, LogFunction>;

  // return the full object with the additional errorRaw and fatalError methods
  return {
    ...coreLogs,
    errorRaw: createLog(outputs.error, undefined, onError),
    fatalError: (...args: unknown[]) => {
      coreLogs.error(...args);
      throw new Error(serialize(inspectOptions(), ...args));
    },
  };
}

/** default prefixes for log levels, lazy-init to not load color functions unless requested */
const defaultPrefix = lazyInit<Partial<Record<LogLevel, string>>>(() => ({
  error: "ERROR: ⛔",
  warn: "WARNING: ⚠️",
}));

/**
 * Ensure the output option is a valid OutputWriter.
 * @param option The output option, either a log level string or an OutputWriter instance.
 * @returns The corresponding OutputWriter instance.
 * @internal
 */
export function ensureOutput(option: OutputOption = "log"): OutputWriter {
  return typeof option === "string" ? createOutput(option as LogLevel) : option;
}

/**
 * Create a logging function for a specific log level.
 * @param write The output function to use for logging.
 * @param prefix The prefix to use for the log messages.
 * @param onError Optional callback for handling errors during logging.
 * @returns A logging function that writes to the specified output.
 */
function createLog(
  write?: OutputFunction,
  prefix?: string,
  onError?: (args: unknown[]) => void
): LogFunction {
  if (write) {
    return onError
      ? (...args: unknown[]) => {
          onError(args);
          write(
            serialize(inspectOptions(), ...(prefix ? [prefix, ...args] : args))
          );
        }
      : (...args: unknown[]) => {
          write(
            serialize(inspectOptions(), ...(prefix ? [prefix, ...args] : args))
          );
        };
  }
  return emptyFunction;
}
