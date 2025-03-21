import {
  bold,
  error as consoleError,
  warn as consoleWarn,
  dim,
  info,
} from "@rnx-kit/console";
import type { Reporter, Timer } from "./types.ts";

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
      return fn();
    },
    results() {
      return {};
    },
  };
}

/**
 * Create a reporter that can log, time, and report errors
 * @param name tag that will be prepended to all log/trace messages
 * @param logging turn on logging, otherwise log calls will do nothing
 * @param tracing turn on tracing and timing.
 * @returns
 */
export function createReporter(
  name: string,
  logging?: boolean,
  tracing?: boolean
): Reporter {
  name = bold(name);
  const timer = tracing ? getTimer() : getNullTimer();
  let errors = 0;

  // set up the logging functions
  const warn = (...args: unknown[]) => consoleWarn(`${name}:`, ...args);
  const log = logging
    ? (...args: unknown[]) => {
        info(`${name}:`, ...args);
      }
    : () => undefined;
  const error = (...args: unknown[]) => {
    errors++;
    consoleError(...args);
  };
  const trace = tracing
    ? (...args: unknown[]) => {
        info(`${name}:`, ...args);
      }
    : () => undefined;

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
        trace(
          `${label}: time: ${bold(time.toFixed(2))}ms, calls: ${bold(count.toString())}`
        );
      }
    },
    errors: () => errors,
  } as Reporter;
  reporter.createSubReporter = (tag: string) => {
    return createReporter(`${name} (${dim(tag)})`, logging, tracing);
  };
  return reporter;
}
