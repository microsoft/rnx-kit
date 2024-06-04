import * as timers from "node:timers/promises";

/**
 * Sleep for a specified numer of milliseconds.
 */
export function idle(ms: number): Promise<void> {
  return timers.setTimeout(ms);
}

/**
 * Wraps the function, making sure it only gets called once.
 */
export function once<R>(
  func: (...args: unknown[]) => NonNullable<R>
): (...args: unknown[]) => NonNullable<R> {
  let result: NonNullable<R>;
  return (...args) => {
    if (result == null) {
      result = func(...args);
    }
    return result;
  };
}

/**
 * Calls the specified function, retrying up to specified number of times as
 * long as the result is `null`.
 */
export async function retry<R>(
  func: () => Promise<R | null>,
  retries: number,
  counter = 0
): Promise<R | null> {
  const result = await func();
  if (result === null && retries > 1) {
    await idle(Math.pow(2, counter) * 1000);
    return retry(func, retries - 1, counter + 1);
  }
  return result;
}

/**
 * Calls the specified function, retrying up to specified number of times as
 * long as the function throws.
 */
export async function withRetry<R>(
  func: () => Promise<R>,
  retries: number,
  counter = 0
): Promise<R> {
  try {
    return await func();
  } catch (e) {
    if (retries === 1) {
      throw e;
    }
  }

  await idle(Math.pow(2, counter) * 1000);
  return withRetry(func, retries - 1, counter + 1);
}
