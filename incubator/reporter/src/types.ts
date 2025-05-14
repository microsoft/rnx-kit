export type LogFunction = (message: string) => void;

export type Reporter = Readonly<{
  /**
   * Equivalent to console.log
   */
  log: LogFunction;

  /**
   * Equivalent to console.warn
   */
  warn: LogFunction;

  /**
   * Equivalent to console.error
   */
  error: LogFunction;

  /**
   * Only outputs logs in verbose mode
   */
  verbose: LogFunction;

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

  /**
   * Formatting utilities for the reporter, used for formatting output
   */
  formatter: Formatter;
}>;

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
   * Log level for this reporter, 0 for no messages, verbose for all
   */
  logLevel: number;

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
   * Standard output stream
   */
  stdout: NodeJS.WriteStream;

  /**
   * Standard error stream
   */
  stderr: NodeJS.WriteStream;

  /**
   * Output messages undecorated, by default messages are decorated with the reporter name or output name
   */
  undecoratedOutput?: boolean;

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
 * Information about a message being logged. For these types of events the label property is contains the message.
 *
 * Note that the message may be formatted with colors. Use stripVTControlCharacters from node:util if these
 * need to be removed (Node 16+: https://nodejs.org/api/util.html#util_util_stripvtcontrolcharacters_string)
 */
export type MessageEvent = ReporterEvent & {
  /**
   * Message type, one of log, warn, error, verbose
   */
  logType: number;
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
};

export type ReporterListener = {
  /**
   * Only messages of this type or lower will be sent to the listener. 0 for no messages, verbose for all
   */
  messageLevel: number;

  /**
   * Does the listener care about this reporter, used to filter messages
   */
  acceptsSource(source: ReporterInfo): boolean;

  /**
   * Called when a message is logged
   */
  onMessage(event: MessageEvent): void;

  /**
   * Called when a task is started
   */
  onTaskStarted(event: ReporterEvent): void;

  /**
   * Called when a task is completed
   */
  onTaskCompleted(event: TaskEvent): void;
};

export type Formatter = {
  // formatting functions for types of content
  module: (moduleName: string) => string;
  path: (path: string) => string;
  duration: (duration: number) => string;
  task: (task: string) => string;
  action: (action: string) => string;
  reporter: (reporter: string) => string;

  // formatting functions for types of logging
  log: (text: string) => string;
  error: (text: string) => string;
  warn: (text: string) => string;
  verbose: (text: string) => string;

  // formatting helper for cleaning formatting
  clean: (message: string) => string;
};
