import type { Reporter, Timer } from "./types";

/**
 * @returns a new timer object that will capture call count and timings for calls
 */
export function getTimer(): Timer {
  const timers: Record<string, { count: number; time: number }> = {};

  const finishTiming = (label: string, time: number) => {
    timers[label] ??= { count: 0, time: 0 };
    timers[label].count++;
    timers[label].time += time;
  };

  return {
    time<T>(label: string, fn: () => T): T {
      const start = performance.now();
      const result = fn();
      finishTiming(label, performance.now() - start);
      return result;
    },
    async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const start = performance.now();
      const result = await fn();
      finishTiming(label, performance.now() - start);
      return result;
    },
    results() {
      return timers;
    },
  };
}

/**
 * @returns a new timer object that will not capture any timings but will still execute the calls
 */
export function getNullTimer(): Timer {
  return {
    time<T>(_s: string, fn: () => T): T {
      return fn();
    },
    async timeAsync<T>(_s: string, fn: () => Promise<T>): Promise<T> {
      return await fn();
    },
    results() {
      return {};
    },
  };
}

/**
 * Create a reporter that can log, time, and report errors
 * @param name tag that will be prepended to all log/trace messages
 * @param log turn on logging, otherwise log calls will do nothing
 * @param trace turn on tracing and timing.
 * @returns
 */
export function createReporter(
  name: string,
  logging?: boolean,
  tracing?: boolean
): Reporter {
  const timer = tracing ? getTimer() : getNullTimer();
  let errors = 0;

  // set up the logging functions
  const warn = (...args: unknown[]) => console.warn(`${name}:`, ...args);
  const log = (...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logging ? console.log(`${name}:`, ...args) : () => {};
  };
  const error = (...args: unknown[]) => {
    errors++;
    console.error(...args);
  };
  const trace = (...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    tracing ? console.log(`${name}:`, ...args) : () => {};
  };

  // create the reporter we will return
  const reporter = {
    ...timer,
    log,
    warn,
    error,
    trace,
    report: () => {
      const results = timer.results() || {};
      for (const label in results) {
        const { count, time } = results[label];
        trace(`${label}: time: ${time.toFixed(2)}ms, calls: ${count}`);
      }
    },
    errors: () => errors,
  } as Reporter;
  reporter.createSubReporter = (tag: string) => {
    return createReporter(`${name} (${tag})`, logging, tracing);
  };
  return reporter;
}
