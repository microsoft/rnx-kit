type ResultOrError<T> = [T, undefined] | [undefined, unknown];

/**
 * Invoke the given function, returning its result or a thrown error.
 *
 * @param fn Function to invoke. Assumed to take no parameters.
 * @returns Array with two elements. On success, the first element is the function result and the second is `undefined`. On failure, the first element is `undefined` and the second is the thrown error.
 */
export function tryInvoke<T>(fn: () => T): ResultOrError<T> {
  try {
    return [fn(), undefined];
  } catch (e) {
    return [undefined, e];
  }
}
