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
