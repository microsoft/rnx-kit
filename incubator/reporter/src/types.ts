import type { WriteStream } from "node:fs";
import type { InspectOptions } from "node:util";

export type LogLevel = "error" | "warn" | "log" | "verbose";

export type LogFunction = (...args: unknown[]) => void;
export type TextTransform = (text: string) => string;

export type TaskState = "running" | "complete" | "error" | "process-exit";
export type FinishReason = "complete" | "error" | "process-exit";

/**
 * An output option can either be a function used to write to a stream or logfile, or a string which will be
 * used to open a logfile.
 */
export type OutputOption = string | LogFunction;

export type Reporter = Readonly<{
  /**
   * Report an error, logging it to the error output and notifying any listeners
   */
  error: LogFunction;

  /**
   * Send a warning message to the error output. This is equivalent to console.warn
   */
  warn: LogFunction;

  /**
   * General purpose logging function, on by default. Similar in scope to console.log or console.info
   */
  log: LogFunction;

  /**
   * Tracing output, used for verbose logging, requires a higher log level to be enabled.
   */
  verbose: LogFunction;

  /**
   * Tasks are hierarchical operations that can be timed. Each task is tracked separately and results
   * will not be aggregated. This is used for starting a big operations that may have multiple steps.
   *
   * A sub-reporter will be passed to the function, this can be ignored or used to report errors or
   * launch additional tasks or actions that will be associated with this task.
   *
   * @param name name of this task, or more comprehensive options object
   * @param fn function to execute as a task
   */
  task<T>(name: string | TaskOptions, fn: (reporter: Reporter) => T): T;
  asyncTask<T>(
    name: string | TaskOptions,
    fn: (reporter: Reporter) => Promise<T>
  ): Promise<T>;

  /**
   * Actions are operations that can be timed within a task or reporter. Each action is tracked as part of the parent
   * and results will be aggregated, with information on total time and number of calls provided.
   *
   * @param label label to use for this action
   * @param fn function to execute as an action
   */
  action<T>(label: string, fn: () => T): T;
  asyncAction<T>(label: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Helper for formatting parts of the output, such as package names, paths, durations, and timestamps.
   * Will apply colors and formatting based on the reporter's settings.
   */
  format: {
    packageFull: (pkg: string) => string;
    packageParts: (name: string, scope?: string) => string;
    path: TextTransform;
    duration: (time: number) => string;
  };

  /**
   * Finish execution of the reporter or task, recording the result and sending a completion event. Things will continue to work
   * but no further completion events will be sent.
   *
   * @param result result of the task or reporter, can be any type
   * @param processExit if true, records that this was finished as the result of the process exiting.
   */
  finish: (result: unknown, reason?: FinishReason) => void;

  /**
   * Record additional metadata for the reporter, will be reported in events and can be used for telemetry or additional context.
   * @param entry named entry to set
   * @param value value which will be set, overwriting any existing value for that entry.
   */
  setData: (entry: string, value: unknown) => void;
}>;

export type FormatHelper = Reporter["format"];

type MessageColors = {
  // color for any prefix, like "Error:" or "Warning:"
  prefix: TextTransform;
  // color for the optional label, like the task name or reporter name
  label: TextTransform;
  // color to apply to the overall message before output
  text: TextTransform;
};

export type ReporterSettings = {
  // logging settings for the reporter
  level: LogLevel;

  // optional file output settings, if provided will log to a file in addition to the console
  file?: {
    // file path or an open write stream to log to, if a string is provided it will be opened as a write stream
    target: string | WriteStream;
    // log level for the file, if omitted will share the same level as the console logger
    level?: LogLevel;
    // write flags for the file, defaults to 'w' (write), can be 'a' (append) or others
    writeFlags?: string;
    // if true, the log file will support colors, otherwise it will strip them
    colors?: boolean;
  };

  // options used to serialize args to strings, this is the internal mechanism used in console.log and similar functions
  inspectOptions: InspectOptions;

  // color settings for the reporter, used to format output
  color: {
    // settings for the message colors, keyed by log level and falling back to default
    message: { default: MessageColors } & Record<
      LogLevel,
      Partial<MessageColors>
    >;

    // colors for the package name and scope
    pkgName: TextTransform;
    pkgScope: TextTransform;

    // color to use when formatting paths
    path: TextTransform;

    // colors for times and time units
    duration: TextTransform;
    durationUnits: TextTransform;
  };

  prefixes: Partial<Record<LogLevel, string>>;
};

export type ColorSettings = ReporterSettings["color"];
export type FileSettings = Required<ReporterSettings["file"]>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ReporterOptions = {
  // package name, including scope, e.g. @my-scope/my-package
  packageName: string;

  // optional name for the reporter
  name?: string;

  // optional label for the reporter, if set will be prepended to all log output
  label?: string;

  // additional metadata that will be passed to events, useful for telemetry or additional context
  metadata?: Record<string, unknown>;

  // override settings for the reporter, merged with the defaults
  settings?: DeepPartial<ReporterSettings>;
};

export type TaskOptions = {
  // name, used to identify the task in logs, ideally unique, at least within the reporter's scope
  name: string;

  // optional package name, if set will be used to format the task output
  packageName?: string;

  // optional label for the task, if set will be prepended to all log output
  label?: string;

  // additional metadata for the task, will be available in task events
  metadata?: Record<string, unknown>;
};

export type EventSource = {
  role: "reporter" | "task";

  /**
   * Friendly name of the source reporter, used to identify the source in logs. If not set will default to the package name.
   * If a package uses multiple reporters can be used to differentiate them.
   */
  name: string;

  /**
   * Package name of the source reporter, including scope, used to identify the source in logs. '@my-scope/my-package'
   */
  packageName: string;

  /**
   * Start time of the task or reporter, used to calculate elapsed time.
   */
  startTime: number;

  /**
   * Depth of the task in the reporter hierarchy, or 0 for a reporter
   */
  depth: number;

  /**
   * Global depth amongst all running tasks at the time the reporter or task was started
   */
  globalDepth: number;

  /**
   * Parent source if this is a task, undefined if this is a reporter
   */
  parent?: EventSource;

  /**
   * Additional metadata that can be stored with the source reporter.
   */
  metadata?: Record<string, unknown>;
};

export type ErrorEvent = {
  /**
   * Source of the error, typically a reporter or task
   */
  source: EventSource;

  /**
   * Arguments passed to the error, typically an error message or an Error object
   */
  args: unknown[];
};

export type ActionData = {
  name: string; // name of the action
  elapsed: number; // elapsed time in milliseconds
  calls: number; // number of times the action was called
};

export type CompleteEvent = EventSource & {
  // duration in milliseconds, uses the performance counter
  duration: number;

  // list of actions that were executed during the task
  actions: ActionData[];

  // any errors that occurred during the task
  errors?: ErrorEvent[];

  // return result (or Error exception) of the task, can be any type, undefined for reporters
  result: unknown;

  // reason for finishing the task, can be 'complete', 'error', or 'process-exit'
  reason: FinishReason;
};
