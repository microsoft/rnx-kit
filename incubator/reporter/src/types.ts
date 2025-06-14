import type { WriteStream } from "node:fs";
import type { InspectOptions } from "node:util";

export type LogLevel = "error" | "warn" | "log" | "verbose";

export type LogFunction = (...args: unknown[]) => void;
export type TextTransform = (text: string) => string;

export type TaskState = "running" | "complete" | "error" | "process-exit";
export type FinishReason = "complete" | "error" | "process-exit";

export type CustomData = Record<string, unknown>;
export type ErrorData = unknown[];

/**
 * An output option can either be a function used to write to a stream or logfile, or a string which will be
 * used to open a logfile.
 */
export type OutputOption = string | LogFunction;

export type Reporter<TData extends CustomData = CustomData> = {
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
   * Report an error and throw it, this will stop execution of the current task or reporter.
   */
  throwError: LogFunction;

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
  taskAsync<T>(
    name: string | TaskOptions,
    fn: (reporter: Reporter) => Promise<T>
  ): Promise<T>;

  /**
   * Time operations that happen within the scope of a task or reporter. These calls are aggregated by name within that scope.
   *
   * @param label label to use for this operation
   * @param fn function to execute as an operation
   */
  time<T>(label: string, fn: () => T): T;
  timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Finish execution of the reporter or task, recording the result and sending a completion event. Things will continue to work
   * but no further completion events will be sent.
   *
   * @param result result of the task or reporter, can be any type
   * @param processExit if true, records that this was finished as the result of the process exiting.
   */
  finish: (result: unknown, reason?: FinishReason) => void;

  /**
   * Helper for formatting parts of the output, such as package names, paths, durations, and timestamps.
   * Will apply colors and formatting based on the reporter's settings.
   */
  readonly format: FormatHelper;

  /**
   * Color settings, provided to help color input string in a standard way.
   */
  readonly colors: ColorSettings;

  /**
   * Data about the session, available as it is tracked
   */
  readonly data: SessionData<TData>;
};

export type FormatHelper = {
  serialize: (args: unknown[]) => string;
  packageFull: (pkg: string) => string;
  packageParts: (name: string, scope?: string) => string;
  path: TextTransform;
  duration: (time: number) => string;
};

export type OutputSettings = {
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
};
export type OutputOptions = Partial<OutputSettings>;

export type ColorSettings = Record<
  LogLevel,
  { prefix?: TextTransform; text?: TextTransform }
> & {
  // label coloring for the reporter and tasks labels
  labels: TextTransform;

  // colors for the package name and scope
  pkgName: TextTransform;
  pkgScope: TextTransform;

  // color to use when formatting paths
  path: TextTransform;

  // colors for times and time units
  duration: TextTransform;
  durationUnits: TextTransform;
};
export type ColorOptions = Partial<ColorSettings>;

export type FormattingSettings = {
  // options used to serialize args to strings, this is the internal mechanism used in console.log and similar functions
  inspectOptions: InspectOptions;

  // color settings for the reporter, used to format output
  colors: ColorSettings;

  // prefixes for each log level, used to format output
  prefixes: Partial<Record<LogLevel, string>>;
};
export type FormattingOptions = DeepPartial<FormattingSettings>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ReporterDetails = {
  // package name, including scope, e.g. @my-scope/my-package
  packageName: string;

  // optional name and detail for the reporter
  name?: string;
  detail?: string;

  // optional label for the reporter, if set will be prepended to all log output
  label?: string;
};

export type ReporterCustomData<T extends CustomData> = {
  // allows setting custom data for the reporter, can be used for telemetry or additional context
  custom?: T;
};

export type ReporterData<T extends CustomData> = ReporterDetails &
  ReporterCustomData<T>;
export type ReadonlyReporterData<T extends CustomData> =
  Readonly<ReporterDetails> & ReporterCustomData<T>;

export type ReporterOptions<T extends CustomData = CustomData> =
  ReporterData<T> & {
    // override settings for the reporter, merged with the defaults
    settings?: FormattingOptions & OutputOptions;
  };

export type TaskOptions<T extends CustomData = CustomData> = Partial<
  Omit<ReporterData<T>, "name" | "settings">
> & {
  // name of the task is required
  name: string;
};

export type SessionDetails = {
  // is this a reporter or task session?
  role: "reporter" | "task";

  // start time of the session, obtained from performance.now()
  startTime: number;

  // duration of the session in milliseconds, set when finish is called, 0 until then
  duration: number;

  // depth of the task in the reporter hierarchy, 0 for reporters, 1+ for tasks
  depth: number;

  // parent session data if this is a task, undefined for reporters
  parent?: SessionData;

  // error events reported within the context of this task or session, can be empty if no errors occurred
  errors?: ErrorData[];

  // operations that were recorded during the task or reporter, can be empty if no operations were recorded
  operations?: Record<
    string,
    {
      elapsed: number; // total elapsed time for this operation
      calls: number; // number of times this operation was called
    }
  >;

  // result of the task or reporter, set when finish is called
  result?: unknown;

  // reason for finishing the task, can be 'complete', 'error', or 'process-exit', unset until finish is called
  reason?: FinishReason;
};

export type SessionData<T extends CustomData = CustomData> =
  ReadonlyReporterData<T> & Readonly<SessionDetails>;

export type ErrorEvent = {
  /**
   * Source of the error, either a reporter or task
   */
  source: SessionData;

  /**
   * Arguments passed to the error, typically an error message or an Error object
   */
  args: ErrorData;
};
