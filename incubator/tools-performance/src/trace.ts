import type { AnyFunction, TraceFunction, TraceRecorder } from "./types.ts";

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<unknown>).then === "function"
  );
}

/** single empty implementation of a trace recorder */
export function nullRecord<TTag = string>(
  _tag: TTag,
  _durationMs?: number
): void {
  // no-op
}

/**
 * Empty trace implementation that just calls the functions with the specified arguments and returns the result.
 * @param _tag The tag for the trace event (ignored in this implementation)
 * @param fn The function to be called
 * @param args The arguments to be passed to the function
 * @returns The result of the function call
 */
export function nullTrace<TFunc extends AnyFunction>(
  _tag: unknown,
  fn: TFunc,
  ...args: Parameters<TFunc>
): ReturnType<TFunc> {
  return fn(...args);
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
export function createTrace<TTag = string>(
  record: TraceRecorder<TTag>
): TraceFunction<TTag> {
  return <TFunc extends AnyFunction>(
    tag: TTag,
    fn: TFunc,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc> => {
    record(tag);
    const start = performance.now();
    const result = fn(...args);
    if (isPromiseLike(result)) {
      return result.then((res) => {
        record(tag, performance.now() - start);
        return res;
      }) as ReturnType<TFunc>;
    }
    record(tag, performance.now() - start);
    return result;
  };
}
