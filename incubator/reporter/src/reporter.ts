import {
  LOG_ERRORS,
  LOG_LOGS,
  LOG_VERBOSE,
  LOG_WARNINGS,
} from "./constants.ts";
import { ReportingRoot } from "./reportingRoot.ts";
import type { Reporter, ReporterOptions } from "./types.ts";

/**
 * @param name the name of the reporter, ideally unique within the application or it could cause confusion
 * @param options optional configuration for the reporter, used to override default settings
 * @returns a new reporter instance
 */
export function createReporter(
  name: string,
  options: Partial<Omit<ReporterOptions, "name">> = {}
): Reporter {
  const root = ReportingRoot.getInstance();
  const sourceInfo: ReporterOptions = {
    ...root.reporterDefaults,
    ...options,
    name,
  };
  const { logLevel, undecoratedOutput, formatter, stdout, stderr } = sourceInfo;

  const stdPrefix = undecoratedOutput ? "" : `${formatter.reporter(name)}: `;
  const errorPrefix = formatter.error(stdPrefix);
  const warnPrefix = formatter.warn(stdPrefix);

  const handleMsg = (
    level: number,
    msg: string,
    prefix: string,
    stream: NodeJS.WriteStream
  ) => {
    if (level >= logLevel) {
      stream.write(`${prefix}${msg}\n`);
    }
    root.notifyMsg(level, msg, sourceInfo);
  };

  return {
    error: (msg: string) => handleMsg(LOG_ERRORS, msg, errorPrefix, stderr),
    warn: (msg: string) => handleMsg(LOG_WARNINGS, msg, warnPrefix, stderr),
    log: (msg: string) => handleMsg(LOG_LOGS, msg, stdPrefix, stdout),
    verbose: (msg: string) =>
      handleMsg(LOG_VERBOSE, formatter.verbose(msg), stdPrefix, stdout),

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

    formatter,
  };
}
