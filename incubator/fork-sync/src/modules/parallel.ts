// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Async iterator utilities for parallel processing.
 *
 * Provides functions to process items in parallel with concurrency control:
 * - map() - parallel map over async/sync iterables
 * - flatMap() - parallel flatMap for nested iteration
 * - filter() - filter async iterables with sync predicate
 *
 * @module parallel
 */

import { Queue } from "./queue.ts";

// =============================================================================
// Types
// =============================================================================

/** Options for parallel processing functions */
export interface ParallelOptions {
  /** Maximum concurrent operations (default: 8) */
  concurrency?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

// =============================================================================
// Helpers
// =============================================================================

const DEFAULT_CONCURRENCY = 8;

/**
 * Throws AbortError if signal is aborted.
 */
function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Operation aborted", "AbortError");
  }
}

/**
 * Normalize sync/async iterable to async iterable.
 */
async function* toAsyncIterable<T>(
  input: AsyncIterable<T> | Iterable<T>
): AsyncIterable<T> {
  // Check if it's an async iterable
  if (Symbol.asyncIterator in input) {
    yield* input as AsyncIterable<T>;
  } else {
    yield* input as Iterable<T>;
  }
}

// =============================================================================
// map
// =============================================================================

/**
 * Process items in parallel with concurrency control.
 * Yields results as they complete (order may differ from input).
 *
 * @param input - Sync or async iterable of items to process
 * @param fn - Async function to apply to each item
 * @param options - Concurrency and abort signal options
 * @yields Results as they complete
 * @throws {DOMException} name='AbortError' when signal is aborted
 *
 * @example
 * ```typescript
 * import * as parallel from './modules/parallel.ts';
 *
 * for await (const result of parallel.map(items, processItem, { concurrency: 4 })) {
 *   console.log(result);
 * }
 * ```
 */
export async function* map<T, R>(
  input: AsyncIterable<T> | Iterable<T>,
  fn: (item: T) => Promise<R>,
  options?: ParallelOptions
): AsyncGenerator<R> {
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  const signal = options?.signal;

  // Check if already aborted before starting
  checkAborted(signal);

  const results = new Queue<R>();
  const errors = new Queue<unknown>();
  let pending = 0;
  let inputDone = false;
  let aborted = false;
  let resolver: (() => void) | null = null;

  // Set up abort listener
  const onAbort = () => {
    aborted = true;
    if (resolver) {
      const r = resolver;
      resolver = null;
      r();
    }
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  const iterator = toAsyncIterable(input)[Symbol.asyncIterator]();

  const startNext = async () => {
    while (pending < concurrency && !inputDone && !aborted) {
      const next = await iterator.next();
      if (next.done) {
        inputDone = true;
        break;
      }

      if (aborted) break;

      const item = next.value;
      pending++;

      // Start the async operation
      (async () => {
        try {
          const result = await fn(item);
          if (!aborted) {
            results.enqueue(result);
          }
        } catch (err) {
          if (!aborted) {
            errors.enqueue(err);
          }
        } finally {
          pending--;
          if (resolver) {
            const r = resolver;
            resolver = null;
            r();
          }
        }
      })();
    }
  };

  try {
    await startNext();

    while (pending > 0 || !results.isEmpty() || !errors.isEmpty()) {
      // Yield any available results
      while (!results.isEmpty()) {
        yield results.dequeue()!;
        if (!aborted && !inputDone) {
          await startNext();
        }
      }

      // Re-throw any errors
      while (!errors.isEmpty()) {
        throw errors.dequeue();
      }

      // Check for abort after processing results
      if (aborted && pending === 0) {
        checkAborted(signal);
      }

      // Wait for more results if still processing
      if (pending > 0 && results.isEmpty() && errors.isEmpty()) {
        await new Promise<void>((r) => {
          resolver = r;
        });
      }
    }

    // Final abort check
    if (aborted) {
      checkAborted(signal);
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

// =============================================================================
// flatMap
// =============================================================================

/**
 * Process items that each produce iterables, interleaving results.
 * Useful for parallel file reading where each file yields multiple items.
 *
 * @param input - Sync or async iterable of items to process
 * @param fn - Function that returns an iterable for each item
 * @param options - Concurrency and abort signal options
 * @yields Results from all sub-iterables as they complete
 * @throws {DOMException} name='AbortError' when signal is aborted
 *
 * @example
 * ```typescript
 * import * as parallel from './modules/parallel.ts';
 *
 * // Read multiple files in parallel, each yielding lines
 * const allLines = parallel.flatMap(files, async function*(file) {
 *   const content = await readFile(file);
 *   for (const line of content.split('\n')) {
 *     yield { file, line };
 *   }
 * }, { concurrency: 3 });
 *
 * for await (const { file, line } of allLines) {
 *   console.log(`${file}: ${line}`);
 * }
 * ```
 */
export async function* flatMap<T, R>(
  input: AsyncIterable<T> | Iterable<T>,
  fn: (
    item: T
  ) => AsyncIterable<R> | Iterable<R> | Promise<AsyncIterable<R> | Iterable<R>>,
  options?: ParallelOptions
): AsyncGenerator<R> {
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  const signal = options?.signal;

  // Check if already aborted before starting
  checkAborted(signal);

  const results = new Queue<R>();
  const errors = new Queue<unknown>();
  let pending = 0;
  let inputDone = false;
  let aborted = false;
  let resolver: (() => void) | null = null;

  // Set up abort listener
  const onAbort = () => {
    aborted = true;
    if (resolver) {
      const r = resolver;
      resolver = null;
      r();
    }
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  const iterator = toAsyncIterable(input)[Symbol.asyncIterator]();

  const notify = () => {
    if (resolver) {
      const r = resolver;
      resolver = null;
      r();
    }
  };

  const startNext = async () => {
    while (pending < concurrency && !inputDone && !aborted) {
      const next = await iterator.next();
      if (next.done) {
        inputDone = true;
        break;
      }

      if (aborted) break;

      const item = next.value;
      pending++;

      // Start the async operation
      (async () => {
        try {
          const subIterable = await fn(item);
          // Iterate through the sub-iterable and collect results
          for await (const subItem of toAsyncIterable(subIterable)) {
            if (aborted) break;
            results.enqueue(subItem);
            notify();
          }
        } catch (err) {
          if (!aborted) {
            errors.enqueue(err);
            notify();
          }
        } finally {
          pending--;
          notify();
        }
      })();
    }
  };

  try {
    await startNext();

    while (pending > 0 || !results.isEmpty() || !errors.isEmpty()) {
      // Yield any available results
      while (!results.isEmpty()) {
        yield results.dequeue()!;
        if (!aborted && !inputDone) {
          await startNext();
        }
      }

      // Re-throw any errors
      while (!errors.isEmpty()) {
        throw errors.dequeue();
      }

      // Check for abort after processing results
      if (aborted && pending === 0) {
        checkAborted(signal);
      }

      // Wait for more results if still processing
      if (pending > 0 && results.isEmpty() && errors.isEmpty()) {
        await new Promise<void>((r) => {
          resolver = r;
        });
      }
    }

    // Final abort check
    if (aborted) {
      checkAborted(signal);
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

// =============================================================================
// filter
// =============================================================================

/**
 * Filter an async iterable using a synchronous predicate.
 * Supports TypeScript type predicates for type narrowing.
 *
 * @param input - Sync or async iterable of items to filter
 * @param predicate - Sync function that returns true to keep the item
 * @yields Items that pass the predicate
 *
 * @example
 * ```typescript
 * import * as parallel from './modules/parallel.ts';
 *
 * // Filter out null values with type narrowing
 * const results = parallel.map(items, transform, { concurrency: 4 });
 * const nonNull = parallel.filter(results, (x): x is string => x !== null);
 *
 * for await (const item of nonNull) {
 *   console.log(item); // item is typed as string, not string | null
 * }
 * ```
 */
export function filter<T, S extends T>(
  input: AsyncIterable<T> | Iterable<T>,
  predicate: (item: T) => item is S
): AsyncGenerator<S>;
export function filter<T>(
  input: AsyncIterable<T> | Iterable<T>,
  predicate: (item: T) => boolean
): AsyncGenerator<T>;
export async function* filter<T>(
  input: AsyncIterable<T> | Iterable<T>,
  predicate: (item: T) => boolean
): AsyncGenerator<T> {
  for await (const item of toAsyncIterable(input)) {
    if (predicate(item)) {
      yield item;
    }
  }
}
