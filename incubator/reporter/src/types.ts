export type LogFunction = (message: string) => void;
export type Timer<T> = (label: string, fn: () => T) => T;
export type AsyncTimer<T> = (label: string, fn: () => Promise<T>) => Promise<T>;

export type Reporter = {
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
};

export type ReporterInfo = {
  /**
   * Name reporter was created with
   */
  name: string;

  /**
   * Output name, used for writing to the console
   */
  outputName?: string;

  /**
   * Log level for this reporter, 0 for no messages, verbose for all
   */
  logLevel: number;

  /**
   * Output messages undecorated, by default messages are decorated with the reporter name or output name
   */
  undecoratedOutput?: boolean;
};

export type TaskInfo = {
  /**
   * Reporter that created this task
   */
  reporter: ReporterInfo;

  /**
   * Label for this task
   */
  label: string;
};

export type MessageEvent = {
  /**
   * Message type, one of log, warn, error, verbose
   */
  logType: number;

  /**
   * Message to log
   */
  message: string;

  /**
   * Reporter that created this message
   */
  reporter: ReporterInfo;

  /**
   * Task that this message is associated with, if any
   */
  task?: TaskInfo;
};

export type ActionAggregation = {
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
  time: number;
};

export type TaskEvent = TaskInfo & {
  /**
   * Total time for this task
   */
  time: number;

  /**
   * Actions that were called as part of this task, keyed by label
   */
  actions: Record<string, ActionAggregation>;

  /**
   * Error if the task failed via an exception
   */
  error?: Error;
};

export type ReporterListener = {
  /**
   * Reporter filter, only messages from these reporters will be sent to the listener, if not specified will
   * include all reporters
   */
  reporterFilter?: Set<string>;

  /**
   * Only messages of this type or lower will be sent to the listener. 0 for no messages, verbose for all
   */
  messageLevel: number;

  /**
   * Called when a message is logged
   */
  onMessage(event: MessageEvent): void;

  /**
   * Called when a task is started
   */
  onTaskStarted(event: TaskInfo): void;

  /**
   * Called when a task is completed
   */
  onTaskCompleted(event: TaskEvent): void;
};
