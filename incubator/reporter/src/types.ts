import type { InspectOptions } from "node:util";
import type { LogLevel } from "./levels.ts";

export type LogFunction = (...args: unknown[]) => void;
export type OutputFunction = (msg: string) => void;
export type TextTransform = (text: string) => string;

export type TaskState = "running" | "complete" | "error" | "process-exit";
export type FinishReason = "complete" | "error" | "process-exit";

export type CustomData = Record<string, string | number | boolean>;
export type ErrorData = unknown[];

export type OutputWriter = Partial<Record<LogLevel, OutputFunction>>;

export type TimingResults = {
  start: number;
  end: number;
  duration: number;
};
export type TimingCallback = (results: TimingResults) => void;

/**
 * An output option can either be a log level, which will write to the console, or a partial set of functions for
 * a given log level
 */
export type OutputOption = LogLevel | OutputWriter;

export type Reporter = {
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
   * Report an error and throw it, this will stop execution of the current task or reporter.
   */
  fatalError: LogFunction;

  /**
   * Tasks are hierarchical operations that can be timed. Each task is tracked separately and results
   * will not be aggregated. This is used for starting a big operations that may have multiple steps.
   *
   * A sub-reporter will be passed to the function, this can be ignored or used to report errors or
   * launch additional tasks or actions that will be associated with this task.
   *
   * @param name name of this task, or more comprehensive options object
   * @param fn function to execute as a task
   * @param cb optional callback that will be called with the final timing results
   */
  taskSync<T>(
    name: string | ReporterInfo,
    fn: (reporter: Reporter) => T,
    cb?: TimingCallback
  ): T;
  task<T>(
    name: string | ReporterInfo,
    fn: (reporter: Reporter) => Promise<T>,
    cb?: TimingCallback
  ): Promise<T>;

  /**
   * Time operations that happen within the scope of a task or reporter. These calls are aggregated by name within that scope.
   *
   * @param label label to use for this operation
   * @param fn function to execute as an operation
   * @param cb optional callback that will be called with the final timing results
   */
  measureSync<T>(label: string, fn: () => T, cb?: TimingCallback): T;
  measure<T>(
    label: string,
    fn: () => Promise<T>,
    cb?: TimingCallback
  ): Promise<T>;

  /**
   * Start a new reporter or task, based off of this reporter or task. If role is not set this will default to "task".
   */
  start: (info: ReporterInfo) => Reporter;

  /**
   * Finish execution of the reporter or task, recording the result and sending a completion event. Things will continue to work
   * but no further completion events will be sent.
   *
   * @param result result of the task or reporter, can be any type
   * @param processExit if true, records that this was finished as the result of the process exiting.
   * @param cb optional callback that will be called with the final timing results
   */
  finish: <T>(result: T, reason?: FinishReason, cb?: TimingCallback) => T;

  /**
   * Data about the session, available as it is tracked
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

  // optional data section that will be added to the reporter
  data: CustomData;
};

export type ReporterInfo = Pick<ReporterData, "name"> &
  Partial<Omit<ReporterData, "name">>;

export type ReporterConfiguration = {
  // writer used to output log messages
  output: OutputWriter;

  // inspect options that determine serialization
  inspectOptions: InspectOptions;

  // message prefixes for log types
  logPrefix: Partial<Record<LogLevel, string>>;

  // message formatting functions for log types
  logFormat: Partial<Record<LogLevel, TextTransform>>;
};

export type ReporterOptions = ReporterInfo &
  Partial<Omit<ReporterConfiguration, "output">> & {
    // output options for the reporter
    output?: OutputOption;
  };

export type SessionData = ReporterData & {
  // timing information
  timings: TimingResults;

  // depth of the task in the reporter hierarchy, 0 for reporters, 1+ for tasks
  depth: number;

  // parent session data if this is a task, undefined for reporters
  parent?: SessionData;

  // error events reported within the context of this task or session, can be empty if no errors occurred
  errors: ErrorData[];

  // operations that were recorded during the task or reporter, can be empty if no operations were recorded
  operations: Record<
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
