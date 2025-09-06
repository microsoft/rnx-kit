import type { ErrorResult, FinishResult } from "./types.ts";

/**
 * Lazily initializes a value using an IIFE (Immediately Invoked Function Expression)
 * @param factory Function that creates the value to be lazily initialized
 * @returns A function that returns the initialized value
 * @internal
 */
export function lazyInit<T>(factory: () => T): () => T {
  return (() => {
    let value: T | undefined;
    return () => {
      if (value === undefined) {
        value = factory();
      }
      return value;
    };
  })();
}

/**
 * A no-operation function that does nothing.
 * @internal
 */
export function emptyFunction(): void {
  // no-op
}

/**
 * identity function, centralized so there is only one instance
 * @internal
 */
export function identity<T>(arg: T): T {
  return arg;
}

/**
 * Checks if a value is a Promise-like object.
 * @param v value to test
 * @returns true if the value is Promise-like, false otherwise
 */
export function isPromiseLike<T>(v: unknown): v is Promise<T> {
  return !!v && typeof (v as any).then === "function";
}

/**
 * Checks if the final result of an operation is an error.
 * @param final the final result of an operation, either success or failure
 * @returns true if the final result is an error, false otherwise
 */
export function isErrorResult<T>(
  final?: FinishResult<T>
): final is ErrorResult {
  return Boolean(final && (final as ErrorResult).error !== undefined);
}

/**
 * Resolves a function that may return a promise and calls the final callback with the result. Exceptions will be caught and
 * passed to the final callback as an error result.
 *
 * - In the case where this is called with a synchronous function it will execute synchronously, without yielding to the event loop.
 * - In the case where this is called with an asynchronous function it will return a promise that resolves to the final result.
 *
 * @param fn function to execute, which may be synchronous or asynchronous
 * @param final callback to call with the final result
 * @returns the result of the function or an awaited promise of the result
 */
export function resolveFunction<T>(
  fn: () => T | Promise<T>,
  final: (result: FinishResult<T>) => T
): T | Promise<T> {
  try {
    const result = fn();
    if (isPromiseLike(result)) {
      return Promise.resolve(result).then(
        (value: T) => final({ value }),
        (error: unknown) => final({ error })
      );
    } else {
      return final({ value: result });
    }
  } catch (error) {
    return final({ error });
  }
}
