/**
 * Signature for any generic function type. Used for type parameters
 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any;

/**
 * Signature for a trace function that will record information about a call and its duration. This can trace both sync
 * and async functions and behave according to the function passed in.
 *
 * The tag parameter is identifier of this tracing event. It defaults to a string but can be a more complex type if
 * desired. That type parameter is set at the time of creating the trace function.
 *
 * The function itself is generic over the type of function being traced, allowing it to infer the correct parameter
 * and return types based on the function passed in. It can be used with or without closures, e.g.:
 *
 * // with closure, return type of trace is the return type of the closure
 * trace("myFunction", () => myFunction(arg1, arg2));
 *
 * // without closure, return type is from myFunction, parameters types will be enforced based on myFunction's signature
 * trace("myFunction", myFunction, arg1, arg2);
 *
 * NOTE: ...unknown[] is not equivalent to ...any[] for purposes of acceptance, the use of any is intentional
 */
export type TraceFunction<TTag = string> = <TFunc extends AnyFunction>(
  tag: TTag,
  fn: TFunc,
  ...args: Parameters<TFunc>
) => ReturnType<TFunc>;

/**
 * Signature for a recorder of trace information. Trace functions will call the recorder twice for each trace event.
 * - before: record(tag) - called with no time information
 * - after: record(tag, durationMs) - called with the duration of the traced function in milliseconds
 */
export type TraceRecorder<TTag = string> = (
  tag: TTag,
  durationMs?: number
) => void;

export type PerfArea = "metro" | "resolve" | "transform" | "serialize";

export type PerformanceConfiguration = {
  /**
   * Columns to sort the report by, in order of precedence.
   * @default: undefined, will appear in order of the first call
   */
  sort?: PerfDataColumn | PerfDataColumn[];
  /**
   * Columns and order to display in the report. Errors will be omitted if not present.
   * @default ["name", "calls", "total", "avg", "errors"]
   */
  cols?: PerfDataColumn[];
  /**
   * Max width of the operation column, to ensure things don't overflow. Longer names will be truncated with ellipsis.
   * @default 50
   */
  maxOperationWidth?: number;
};

/**
 * Data structure for reporting performance information
 */
export type PerfDataEntry = {
  /** first call time, for merging */
  order: number;
  /** Merged field in the format of "area: operation" */
  name: string;
  /** Area name */
  area: string;
  /** Operation name */
  operation: string;
  /** Number of times the operation was called */
  calls: number;
  /** Total duration of the operation in milliseconds */
  total: number;
  /** Average duration of the operation in milliseconds */
  avg: number;
  /** Number of errors encountered during the operation */
  errors: number;
};

export type PerfDataColumn = keyof Omit<PerfDataEntry, "order">;
