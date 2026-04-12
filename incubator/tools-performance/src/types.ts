/** Call frequency level for categorizing operations */
export type EventFrequency = "low" | "medium" | "high";

/** Tracing strategy for recording performance events, either in memory timings or node performance marks */
export type TraceStrategy = "timing" | "node";

/** Report columns available for performance reporting */
export type PerfReportColumn =
  | "session" // session time for the first call of this operation, default sort
  | "name" // the name of the operation, in the format of "domain: operation"
  | "calls" // how many times this operation was started
  | "total" // total time spent in this operation across all calls
  | "avg" // average time per call for this operation
  | "errors"; // inferred error count based on how many calls failed to complete

/**
 * Areas of performance tracking. This is not an exhaustive list, but a starting point for categorizing different types of operations.
 * Custom areas can be added as needed by using arbitrary strings.
 */
export type PerfArea =
  | "metro"
  | "resolve"
  | "transform"
  | "serialize"
  | (string & {});

/** Acceptance signature for functions, use of any is required here for voids and empty functions */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export type AcceptAnyFn = (...args: any[]) => any;

/**
 * Signature for a trace function that will record information about a call and its duration. This can trace both sync
 * and async functions and behave according to the function passed in. Can be used in various ways:
 * - with closure, return type of trace is the return type of the closure
 *     trace("myFunction", () => myFunction(arg1, arg2));
 *
 * - without closure, return type is from myFunction, parameters types will be enforced based on myFunction's signature
 *     trace("myFunction", myFunction, arg1, arg2);
 *
 * @template TFunc the type of function being traced, used to infer parameter and return types
 * @param tag a string identifier for this trace event
 * @param fn the function being traced, can be passed with or without a closure
 * @returns the result of the function call, with the correct type inferred from the function being traced
 */
export type TraceFunction = <TFunc extends AcceptAnyFn>(
  tag: string,
  fn: TFunc,
  ...args: Parameters<TFunc>
) => ReturnType<TFunc>;

/**
 * Options for configuration a performance domain, which is a logical grouping of performance events.
 */
export type PerfDomainOptions = {
  frequency?: EventFrequency;
  waitOnStart?: boolean;
  recordTime?: (tag: string, durationMs?: number) => void;
};

/**
 * Options for performance tracking on a broader level
 */
export type PerformanceOptions = Omit<PerfDomainOptions, "recordTime"> & {
  /**
   * What performance areas to enable tracking for. This defaults to true, which will enable all tracking.
   */
  enable?: true | PerfArea | PerfArea[];

  /**
   * Tracing strategy to use for recording performance events. Either in-memory timings or node performance marks.
   *
   * "timing"
   *   - records times in memory. Lower overhead and suitable for high frequency events.
   *   - will output to the console on process exit by default
   * "node"
   *   - uses node's performance.mark and performance.measure APIs to record events.
   *   - Higher overhead, but allows for integration with node's performance tools.
   */
  strategy?: TraceStrategy;

  /**
   * Set of columns to include in the performance report and their order.
   * Defaults to ["name", "calls", "total", "avg", "errors"].
   */
  reportColumns?: PerfReportColumn[];

  /** Columns to sort on, must be part of reportColumns */
  reportSort?: PerfReportColumn[];

  /** Show the index column in the report */
  showIndex?: boolean;

  /** Max width of the name column to keep things readable */
  maxNameWidth?: number;

  /** Optional function that receives the report string. Defaults to console.log */
  reportHandler?: (report: string) => void;
};
