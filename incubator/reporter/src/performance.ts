import { type CascadeSettings, createCascadingReporter } from "./cascade.ts";
import { subscribeToFinish, subscribeToStart } from "./events.ts";
import { getFormatter } from "./formatting.ts";
import type { Reporter, SessionData } from "./types.ts";
import { isErrorResult } from "./utils.ts";

/**
 * Environment variable key used to enable performance tracking
 */
export const PERF_TRACKING_ENV_KEY = "RNX_PERF_TRACKING";

/**
 * Performance tracker implementation. This creates a reporter and listens for reporter events, logging
 * performance information. It can log to the console, a file, or both.
 */
class PerformanceTracker {
  private reporter: Reporter;
  private formatter = getFormatter();
  private perfTag = this.formatter.cyan("PERF:");

  constructor(reporter: Reporter) {
    this.reporter = reporter;
    subscribeToStart((event) => this.onTaskStarted(event));
    subscribeToFinish((event) => this.onTaskCompleted(event));
  }

  /**
   * Get the prefix for an event log message
   * @param event event that is starting
   * @returns an array of strings to use as the log message prefix
   */
  private eventPrefix(event: SessionData) {
    return [
      this.perfTag,
      `${"+".repeat(event.depth)}${this.formatter.bold(event.name)} (${event.role}):`,
    ];
  }

  /**
   * Get the prefix for an operation log message
   * @param event event that is being reported
   * @returns an array of strings to use as the log message prefix
   */
  private opPrefix(event: SessionData) {
    return [this.perfTag, `${" ".repeat(event.depth + 2)}-`];
  }

  /**
   * Called when a task is started, omitted in non-verbose mode
   */
  private onTaskStarted(event: SessionData) {
    this.reporter.verbose(...this.eventPrefix(event), "Started");
  }

  /**
   * Called when a task is completed. Will log the time spent in a task. In verbose mode
   * will also log the time spent in each operation.
   */
  private onTaskCompleted(event: SessionData) {
    const prefix = this.eventPrefix(event);
    const opPrefix = this.opPrefix(event);
    const formatter = this.formatter;
    const reason = isErrorResult(event.result)
      ? "error"
      : event.result
        ? "success"
        : "process-exit";

    this.reporter.log(
      ...prefix,
      `Finished (${reason}) in [${formatter.duration(event.elapsed ?? 0)}]:`,
      event.result
    );
    const ops = event.operations || {};
    Object.keys(ops).forEach((key) => {
      const { elapsed, calls } = ops[key];
      const duration = formatter.pad(formatter.duration(elapsed), 7);
      this.reporter.verbose(
        ...opPrefix,
        `${duration} |${formatter.pad(String(calls), 5)} calls | ${formatter.highlight3(key)}`
      );
    });
  }
}

let checkedEnv = false;
let performanceTracker: PerformanceTracker | undefined = undefined;

/**
 * Checks the environment to enable performance tracing if it has been enabled in this process tree.
 * If it has not been enabled, then it will be turned on if settings are provided
 * in the call to this function.
 *
 * @param settings Optional settings, used to enable performance tracing if it is not already enabled via the environment
 */
export function checkOrEnablePerfTracing(settings?: CascadeSettings) {
  if (!checkedEnv && !performanceTracker) {
    checkedEnv = true;
    const reporter = createCascadingReporter(PERF_TRACKING_ENV_KEY, settings, {
      name: "PerfTracker",
    });
    if (reporter) {
      performanceTracker = new PerformanceTracker(reporter);
    }
  }
}
