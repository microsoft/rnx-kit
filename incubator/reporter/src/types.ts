import type { LogLevel } from "./levels.ts";

export type LogFunction = (...args: unknown[]) => void;

export type TextTransform = (text: string) => string;

export type CustomData = Record<string, string | number | boolean>;
export type ErrorData = unknown[];

export type OutputFunction = (msg: string) => void;
export type OutputWriter = Partial<Record<LogLevel, OutputFunction>>;

export type OperationTotals = {
  elapsed: number; // total elapsed time for this operation
  calls: number; // number of times this operation was called
  errors: number; // number of errors that occurred during this operation
};

export type ErrorResult = { error: unknown };
export type NormalResult<T> = { value: T };

export type FinishResult<T> = NormalResult<T> | ErrorResult;
export type AnyResult<T> = Partial<NormalResult<T> & ErrorResult>;

/**
 * An output option can either be a log level, which will write to the console, or a partial set of functions for
 * a given log level
 */
export type OutputOption = LogLevel | OutputWriter;

/**
 * A simple logging interface, similar to console with a few additions.
 */
export type Logger = {
  /**
   * Report an error, logging it to the error output and notifying any listeners
   */
  error: LogFunction;

  /**
   * Report an error, but without any text decoration
   */
  errorRaw: LogFunction;

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
   * Log the provided message to error output, then throw an error with the same message.
   * @throws An error with the provided message.
   */
  fatalError: (...args: unknown[]) => never;
};

/**
 * Options for configuring simple loggers
 */
export type LoggerOptions = {
  /**
   * The output option can be a log level string (e.g., "error", "warn", "info", "verbose") or an OutputWriter instance.
   * If a string is provided, it will create an OutputWriter that logs to the console at the specified level.
   * If not provided, it defaults to console output at the default log level.
   */
  output?: OutputOption;

  /**
   * Optional prefixes for each log level. If not provided, default prefixes will be used for "error" and "warn" levels.
   * Set this to an empty object to disable all prefixes.
   */
  prefix?: Partial<Record<LogLevel, string | (() => string)>>;

  /**
   * Optional callback function that is called when an error occurs during logging.
   * @param args The arguments passed to the logger.error() method.
   * @returns void
   */
  onError?: (args: unknown[]) => void;
};

export type Reporter = Logger & {
  /**
   * Tasks are hierarchical operations that can be timed. Each task is tracked separately and results
   * will not be aggregated. This is used for starting a big operation that may have multiple steps.
   *
   * A sub-reporter will be passed to the function, this can be ignored or used to report errors or
   * launch additional tasks or actions that will be associated with this task.
   *
   * @param name name of this task, or more comprehensive options object
   * @param fn function to execute as a task
   */
  task<T>(name: TaskOption, fn: (task: Reporter) => T): T;
  task<T>(name: TaskOption, fn: (task: Reporter) => Promise<T>): Promise<T>;

  /**
   * Time operations that happen within the scope of a task or reporter. These calls are aggregated by name within that scope.
   *
   * @param label label to use for this operation
   * @param fn function to execute as an operation
   */
  measure<T>(label: string, fn: () => T): T;
  measure<T>(label: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Start a new reporter or task, based off of this reporter or task. If role is not set this will default to "task".
   */
  start: (info: ReporterInfo) => Reporter;

  /**
   * Finish execution of the reporter or task, recording the result and sending a completion event. Things will continue to work
   * but no further completion events will be sent. This will be called automatically if the reporter is created via the task method.
   *
   * @param result result of the task or reporter, should be either a { value: T } or { error: unknown } object
   * @returns the value of the result if not a caught error, otherwise throws the error
   */
  finish: <T>(result: FinishResult<T>) => T;

  /**
   * Data about the session, can be used to set things like telemetry properties. This will be included in logged events.
   */
  readonly data: CustomData;
};

export type ReporterData = {
  // name of the reporter, ideally unique as it will be routed to session data
  name: string;

  // optional override for the role of a reporter
  role: "reporter" | "task";

  // package name, including scope, e.g. @my-scope/my-package
  packageName?: string;

  // report start and end messages for task and measure operations when verbose logging is enabled
  reportTimers?: boolean;

  // optional data section that will be added to the reporter
  data: CustomData;
};

export type ReporterInfo = Pick<ReporterData, "name"> &
  Partial<Omit<ReporterData, "name">>;

export type TaskOption = string | ReporterInfo;

export type ReporterConfiguration = {
  // writer used to output log messages
  output: OutputWriter;

  // message prefixes for log types
  logPrefix: Partial<Record<LogLevel, string | (() => string)>>;

  // message formatting functions for log types
  logFormat: Partial<Record<LogLevel, TextTransform>>;
};

export type ReporterOptions = ReporterInfo & Omit<LoggerOptions, "onError">;

/**
 * Data associated with a reporter or task session. This includes hierarchical information about
 * parent tasks, errors that were reported, and operations that were measured.
 */
export type SessionData = ReporterData & {
  // depth of the task in the reporter hierarchy, 0 for reporters, 1+ for tasks
  depth: number;

  // elapsed time in milliseconds since the reporter or task was started
  elapsed: number;

  // parent session data if this is a task, undefined for reporters
  parent?: SessionData;

  // error events reported within the context of this task or session, can be empty if no errors occurred
  errors: ErrorData[];

  // operations that were recorded during the task or reporter, can be empty if no operations were recorded
  operations: Record<string, OperationTotals>;

  // result of the task or reporter, set when finish is called. This will be undefined if finished due to process exit.
  result?: FinishResult<unknown>;
};

export type ErrorEvent = {
  /**
   * Source of the error, either a reporter or task
   */
  session: SessionData;

  /**
   * Arguments passed to the error, typically an error message or an Error object
   */
  args: ErrorData;
};
