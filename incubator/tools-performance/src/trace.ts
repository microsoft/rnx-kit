import type { AcceptAnyFn, TraceFunction } from "./types.ts";

/**
 * Signature for a recorder of trace information. Trace functions will call the recorder twice for each trace event.
 * - before: const handoff = record(tag) - called with no time information
 * - after: record(tag, handoff) - record function determines what to do with it
 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export type TraceRecorder<THandoff = any> = (
  operation: string,
  handoff?: THandoff
) => THandoff;

/**
 * Check if the provided value is a Promise-like object by checking if it is an object and has a "then" method that
 * is a function. Slightly more robust than just checking for instanceof Promise, as it can handle cases where the promise is
 * from a different realm.
 * @param value The value to be checked
 * @returns True if the value is Promise-like, false otherwise
 */
function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<unknown>).then === "function"
  );
}

/** simple identity function */
export function nullPassthrough<T>(value: T): T {
  return value;
}

/** no-op function matching the recordTime signature */
export function nullRecordTime(_tag: string, _duration?: number): void {
  // intentionally empty
}

/**
 * Empty trace implementation that just calls the functions with the specified arguments and returns the result.
 * @param _tag The tag for the trace event (ignored in this implementation)
 * @param fn The function to be called
 * @param args The arguments to be passed to the function
 * @returns The result of the function call
 */
export function nullTrace<TFunc extends AcceptAnyFn>(
  _tag: unknown,
  fn: TFunc,
  ...args: Parameters<TFunc>
): ReturnType<TFunc> {
  return callFunction(fn, args);
}

/**
 * Create a trace function that will call the provided recorder with the tag and duration of each trace event. The
 * recorder will be called twice for each trace event:
 * - once before the function is called (with no duration)
 * - once after (with the duration in milliseconds).
 *
 * The trace function can handle both synchronous and asynchronous functions, and will measure the duration accordingly. It
 * will not incur promise overhead for synchronous functions and operate based on the value returned.
 *
 * NOTE:
 *   To avoid exception overhead this implementation does not catch exceptions thrown by the traced function. On process end
 *   the error count can be inferred by the difference between start and end usage.
 *
 * @param record The recorder function to be called with trace information
 * @returns A trace function that can be used to wrap any function and record its execution time
 */
export function createTrace(record: TraceRecorder): TraceFunction {
  return <TFunc extends AcceptAnyFn>(
    tag: string,
    fn: TFunc,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc> => {
    const handoff = record(tag);
    const result = callFunction<TFunc>(fn, args);
    if (isPromiseLike(result)) {
      return result.then((res: Awaited<ReturnType<TFunc>>) => {
        record(tag, handoff);
        return res;
      });
    }
    record(tag, handoff);
    return result;
  };
}

/**
 * Helper to call a function with variable arguments avoiding the overhead of apply for common cases where
 * there are a low number of arguments. Generally the collection of arguments in parameters is highly optimized
 * in modern JS engines. The fn(...args) is the more expensive operation.
 * @param fn The function to be called
 * @param args The arguments to be passed to the function
 * @returns The result of the function call
 */
function callFunction<TFunc extends AcceptAnyFn>(
  fn: TFunc,
  args: Parameters<TFunc>
): ReturnType<TFunc> {
  // avoid the apply/iteration overhead for common cases of low number of arguments
  switch (args.length) {
    case 0:
      return fn();
    case 1:
      return fn(args[0]);
    case 2:
      return fn(args[0], args[1]);
    case 3:
      return fn(args[0], args[1], args[2]);
    default:
      return fn(...args);
  }
}
