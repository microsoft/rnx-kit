export type LogType = "error" | "warn" | "info" | "trace";
export type LogLevel = LogType | "none" | "all";

export type LogFunction = (message: string) => void;

export type TaskState = "running" | "complete" | "error" | "process-exit";

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
   * Report an error to any listeners/telemetry, but don't log it to the error output
   * @param error error to record
   * @param rethrow if true and an error type, rethrow the error after recording it
   */
  recordError: (error: string | Error, rethrow?: boolean) => void;

  /**
   * Send a warning message to the error output. This is equivalent to console.warn
   */
  warn: LogFunction;

  /**
   * General purpose logging function, on by default. Similar in scope to console.log or console.info
   */
  info: LogFunction;

  /**
   * Tracing output, used for verbose logging, requires a higher log level to be enabled.
   */
  trace: LogFunction;

  /**
   * Tasks are hierarchical operations that can be timed. Each task is tracked separately and results
   * will not be aggregated. This is used for starting a big operations that may have multiple steps.
   *
   * @param label label to use for this task
   * @param fn function to execute as a task
   */
  task<T>(label: string, fn: () => T): T;
  asyncTask<T>(label: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Actions are operations that can be timed within a task. Each action is tracked as part of the task
   * and results will be aggregated, with information on total time and number of calls provided.
   *
   * @param label label to use for this action
   * @param fn function to execute as an action
   */
  action<T>(label: string, fn: () => T): T;
  asyncAction<T>(label: string, fn: () => Promise<T>): Promise<T>;
}>;

export type OutputWriter = {
  // write function to use for logging
  write: LogFunction;

  // don't add colors to the output, used for log files or other streams that don't support colors
  plainText?: boolean;
};

/**
 * Colorizer is used to colorize the output of the reporter. Override these functions to customize the colors
 */
export type Colorizer = {
  // are colors enabled
  colorsEnabled: boolean;

  // colors for various parts of the output
  packageName: (moduleName: string) => string;
  packageScope: (moduleName: string) => string;
  path: (path: string) => string;
  durationNumber: (duration: string) => string;
  durationUnit: (unit: string) => string;

  task: (task: string) => string;
  action: (action: string) => string;
  reporter: (reporter: string) => string;

  // colors for Warning: or Error: prefixes before the messages
  errorPrefix: (text: string) => string;
  warnPrefix: (text: string) => string;

  // colors for the message text
  msgText: (text: string, logType: LogType) => string;
};

/**
 * The formatter formats various kinds of log output, applying colors via the colorizer
 */
export type Formatter = {
  /**
   * Formats the message prefix for all messages. Generally the format will be:
   * `<ReporterName>: <Message>` - this routine returns the `<ReporterName>: ` portion
   */
  messagePrefix: (reporterName: string, colorizer: Colorizer) => string;

  /**
   * Format and colorize the duration that comes from the performance timer, will
   * be in the form of `1.37ms` or `1.37s` or `1.37m`, digits will auto adjust by default
   */
  duration: (duration: number, colorizer: Colorizer) => string;

  /**
   * Format error and warning message prefixes, typically "Error: " or "Warning: "
   */
  messageTypePrefix: (messageType: LogType, colorizer: Colorizer) => string;

  /**
   * Format a package name, handling scoped packages as well as non-scoped packages
   */
  module: (moduleName: string, colorizer: Colorizer) => string;
};

/**
 * Information about a reporter, used to identify the reporter in events and filter messages
 */
export type ReporterInfo = {
  /**
   * Name of the reporter, used to identify the reporter in logs
   * and to filter messages to listeners
   */
  name: string;

  /**
   * Log level for this reporter
   */
  logLevel: LogLevel;

  /**
   * Additional context for this reporter, used if additional information such as telemetry IDs need to be
   * passed to listeners
   */
  context?: string;
};

/**
 * Options which define the behavior of the reporter.
 */
export type ReporterOptions = ReporterInfo & {
  /**
   * Channel to use for info/verbose/trace messages
   */
  stdOutput: OutputWriter;

  /**
   * Channel to use for error/warn messages.
   */
  errOutput: OutputWriter;

  /**
   * Colorizer to use for the reporter
   */
  colorizer: Colorizer;

  /**
   * Override formatter for the reporter
   */
  formatter: Formatter;
};

/**
 * Base reporter event, included as part of all events. The source property contains the reporter that was
 * the source of the event. The label is the event name for tasks/actions, and the message for messages.
 */
export type ReporterEvent = {
  /**
   * Source reporter that created this event
   */
  source: Readonly<ReporterInfo>;

  /**
   * Event label, used as the event name
   */
  label: string;
};

/**
 * Notification of an error sent to the reporter.
 */
export type ErrorEvent = ReporterEvent & {
  /**
   * Message type, one of log, warn, error, verbose
   */
  error: string | Error;
};

/**
 * Information about actions taken as part of task execution. Action information is only sent as part of the task
 * completion event. During the task execution, actions are tracked and their results are aggregated. Given that
 * these are used for high frequency operations the action codepath is optimized for performance.
 */
export type ActionEvent = ReporterEvent & {
  /**
   * Label for this action
   */
  label: string;

  /**
   * Number of times this action was called
   */
  calls: number;

  /**
   * Total inclusive time across all calls
   */
  elapsed: number;
};

/**
 * Information about a task being executed. This includes the task label, the time taken for the task, and
 * any actions that were called while this task was the active task. The error property is only set if the task failed via
 * an exception.
 */
export type TaskEvent = ReporterEvent & {
  /**
   * Total time for this task
   */
  elapsed: number;

  /**
   * Actions that were called as part of this task, keyed by label
   */
  actions: Record<string, ActionEvent>;

  /**
   * Error if the task failed via an exception
   */
  error?: Error;

  /**
   * Reason this task was marked as completed
   */
  state: TaskState;
};

export type ReporterListener = {
  /**
   * Does the listener care about this reporter, used to filter messages
   */
  acceptsSource(source: ReporterInfo): boolean;

  /**
   * Notify of an error
   */
  onError(event: ErrorEvent): void;

  /**
   * Called when a task is started
   */
  onTaskStarted(event: ReporterEvent): void;

  /**
   * Called when a task is completed
   */
  onTaskCompleted(event: TaskEvent): void;
};
