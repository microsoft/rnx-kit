import {
  ALL_LOG_LEVELS,
  DEFAULT_LOG_LEVEL,
  LL_ERROR,
  LL_WARN,
  supportsLevel,
  type LogLevel,
} from "./levels.ts";
import type { OutputFunction, OutputWriter } from "./types.ts";

const WRITE_STDOUT: OutputFunction = process.stdout.write.bind(process.stdout);
const WRITE_STDERR: OutputFunction = process.stderr.write.bind(process.stderr);

export type OutputConfig = {
  /**
   * Output writer to use, if specified will be used as is
   */
  output?: OutputWriter;

  /**
   * Log level to use, will default to the default log level. If nothing else is specified
   * will create a console writer with this log level
   */
  level?: LogLevel;

  /**
   * Function to write output messages, if specified will be combined with the log level to
   * produce a writer
   */
  outputFn?: OutputFunction;

  /**
   * Optional error output function, if specified error/warn messages will route to this output
   */
  errorOutputFn?: OutputFunction;
};

/**
 * Output option type, either a log level or a configuration object
 */
export type CreateOutputOption = LogLevel | OutputConfig;

export function createOutput(...options: CreateOutputOption[]): OutputWriter {
  if (options.length === 0) {
    options = [DEFAULT_LOG_LEVEL];
  }
  const writers = options.map((option) => toWriter(toConfig(option)));
  const result: OutputWriter = {};
  for (const logLevel of ALL_LOG_LEVELS) {
    const writes = writers
      .map((writer) => writer[logLevel])
      .filter((write) => write !== undefined);
    if (writes.length === 1) {
      result[logLevel] = writes[0];
    } else if (writes.length > 1) {
      result[logLevel] = (msg: string) => {
        writes.forEach((write) => write(msg));
      };
    }
  }
  return result;
}

function toConfig(option: CreateOutputOption): OutputConfig {
  return typeof option === "string" ? { level: option } : option;
}

function toWriter(config: OutputConfig): OutputWriter {
  const { level = DEFAULT_LOG_LEVEL, output } = config;
  if (output) {
    return output;
  }

  // set up the output functions as appropriate, console if none are specified
  let { outputFn, errorOutputFn } = config;
  if (!outputFn) {
    outputFn = WRITE_STDOUT;
    errorOutputFn = WRITE_STDERR;
  }
  errorOutputFn ??= outputFn;

  // now create and return the writer
  const writer: OutputWriter = {};
  for (const logLevel of ALL_LOG_LEVELS) {
    if (supportsLevel(logLevel, level)) {
      writer[logLevel] = pickStream(logLevel, outputFn, errorOutputFn);
    }
  }
  return writer;
}

/**
 * @returns should this level be sent to the error stream
 * @internal
 */
function pickStream(
  level: LogLevel,
  stdWrite: OutputFunction,
  errWrite: OutputFunction
): OutputFunction {
  return level === LL_ERROR || level === LL_WARN ? errWrite : stdWrite;
}
