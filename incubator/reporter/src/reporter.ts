import { plainTextColorizer } from "./output.ts";
import { checkPerformanceEnv } from "./performance.ts";
import { ReportingRoot } from "./reportingRoot.ts";
import type {
  Colorizer,
  LogFunction,
  LogLevel,
  LogType,
  Reporter,
  ReporterOptions,
} from "./types.ts";

/**
 * @param name the name of the reporter, ideally unique within the application or it could cause confusion
 * @param options optional configuration for the reporter, used to override default settings
 * @returns a new reporter instance
 */
export function createReporter(
  name: string,
  optionOverrides: Partial<Omit<ReporterOptions, "name">> = {}
): Reporter {
  checkPerformanceEnv();
  const root = ReportingRoot.getInstance();
  const sourceInfo: ReporterOptions = {
    ...root.reporterDefaults,
    ...optionOverrides,
    name,
  };

  // function to notify any listeners of an error
  const recordError = (error: string | Error, rethrow?: boolean) => {
    root.notifyError(error, sourceInfo);
    if (error instanceof Error && rethrow) {
      throw error;
    }
  };

  // write function for error output
  const writeError = createWriteFunction("error", sourceInfo);

  // return a reporter instance
  return {
    error: (error: string) => {
      recordError(error);
      writeError(error);
    },
    warn: createWriteFunction("warn", sourceInfo),
    info: createWriteFunction("info", sourceInfo),
    trace: createWriteFunction("trace", sourceInfo),
    recordError,

    // tasks are hierarchical operations that can be timed and tracked
    task: function <T>(label: string, fn: () => T) {
      return root.task<T>(label, sourceInfo, fn);
    },
    asyncTask: async function <T>(label: string, fn: () => Promise<T>) {
      return await root.asyncTask<T>(label, sourceInfo, fn);
    },

    // action is a timed operation that can be executed within a task. Each action is tracked as part of the task
    action: function <T>(label: string, fn: () => T) {
      return root.action<T>(label, sourceInfo, fn);
    },
    asyncAction: async function <T>(label: string, fn: () => Promise<T>) {
      return await root.asyncAction<T>(label, sourceInfo, fn);
    },
  };
}

const logTypeOrdering: LogLevel[] = [
  "none",
  "error",
  "warn",
  "info",
  "trace",
  "all",
];
function supportedLogType(logType: LogType, logLevel: LogLevel) {
  for (const entry of logTypeOrdering) {
    if (entry === logType) {
      return true;
    }
    if (entry === logLevel) {
      return false;
    }
  }
  return false;
}

function noopWrite(_msg: string) {
  // no-op
}

function configurateOutput(
  logType: LogType,
  options: ReporterOptions
): [LogFunction, Colorizer] {
  const output =
    logType === "error" || logType === "warn"
      ? options.errOutput
      : options.stdOutput;
  return [
    output.write,
    output.plainText ? plainTextColorizer : options.colorizer,
  ];
}

function createWriteFunction(logType: LogType, options: ReporterOptions) {
  if (supportedLogType(logType, options.logLevel)) {
    // grab the right output stream and colorizer for that stream
    const [write, colorizer] = configurateOutput(logType, options);

    // now set up the prefixes, this can be done once and reused for all messages
    const { formatter, name } = options;
    // type prefix (like Warning: or Error:)
    const prefix = `${formatter.messageTypePrefix(logType, colorizer)}${formatter.messagePrefix(name, colorizer)}`;
    const colorMsgText = colorizer.msgText;

    return (msg: string) => {
      write(`${prefix}${colorMsgText(msg, logType)}\n`);
    };
  }
  return noopWrite;
}
