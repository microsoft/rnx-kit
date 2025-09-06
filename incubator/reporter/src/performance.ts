import fs from "node:fs";
import { subscribeToFinish, subscribeToStart } from "./events.ts";
import { getFormatter } from "./formatting.ts";
import { LL_LOG, LL_VERBOSE } from "./levels.ts";
import { createOutput, mergeOutput } from "./output.ts";
import { ReporterImpl } from "./reporter.ts";
import type { OutputWriter, SessionData } from "./types.ts";
import { isErrorResult } from "./utils.ts";

/**
 * Environment variable key used to enable performance tracking
 */
export const PERF_TRACKING_ENV_KEY = "RNX_PERF_TRACKING";

const DISABLED_MODE = "disabled";
const ENABLED_MODE = "enabled";
const VERBOSE_MODE = LL_VERBOSE;
const FILE_ONLY_MODE = "file-only";

const PERF_MODES = [
  DISABLED_MODE,
  ENABLED_MODE,
  VERBOSE_MODE,
  FILE_ONLY_MODE,
] as const;

/**
 * The different modes for performance tracking
 * - disabled: performance tracking is disabled (default)
 * - enabled: performance tracking is enabled, but only logs start and end of tasks
 * - verbose: performance tracking is enabled, logs start and end of tasks and operations
 * - file-only: performance tracking is enabled, logs to a file only, no console output
 */
export type PerfTrackMode = (typeof PERF_MODES)[number];

/**
 * Performance tracker implementation. This creates a reporter and listens for reporter events, logging
 * performance information. It can log to the console, a file, or both.
 */
class PerformanceTracker {
  private reporter: ReporterImpl;
  private verbose: boolean;
  private formatter = getFormatter();
  private perfTag = this.formatter.cyan("PERF:");

  constructor(mode: PerfTrackMode, file?: string, fromEnv?: boolean) {
    this.verbose = mode === VERBOSE_MODE || mode === FILE_ONLY_MODE;
    const level = this.verbose ? LL_VERBOSE : LL_LOG;
    const outputs: OutputWriter[] = [];

    // create a console output unless in file only mode
    if (mode !== FILE_ONLY_MODE) {
      outputs.push(createOutput(level));
    }

    if (file) {
      const flags = fromEnv ? "a" : "w";
      const fileStream = fs.createWriteStream(file, { flags });
      outputs.push(
        createOutput(LL_VERBOSE, (msg: string) => {
          fileStream.write(msg + "\n");
        })
      );
    }

    const output = mergeOutput(...outputs);
    this.reporter = new ReporterImpl({ name: "PerfTracker", output });

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
 * Enable performance tracing. This will set the appropriate environment variable
 * so that child processes will also enable performance tracing with the same settings.
 * @param mode mode to use for performance tracking, defaults to "enabled"
 * @param file optional file path to log performance data
 */
export function enablePerformanceTracing(
  mode: PerfTrackMode = ENABLED_MODE,
  file?: string
) {
  process.env[PERF_TRACKING_ENV_KEY] = serializePerfOptions(mode, file);
  if (mode !== DISABLED_MODE) {
    performanceTracker = new PerformanceTracker(mode, file);
  }
}

/**
 * Ensure that performance tracing is started if specified in the environment variables.
 *
 * This can be called multiple times safely and will do nothing unless
 * performance tracing is enabled. If enabling performance tracing across child processes
 * this should be called in your createReporter function to ensure that child processes
 * also enable performance tracing.
 */
export function checkForPerfTracing() {
  if (!checkedEnv && !performanceTracker) {
    checkedEnv = true;
    const env = process.env[PERF_TRACKING_ENV_KEY];
    if (env) {
      const [mode, file] = decodePerformanceOptions(env);
      if (mode !== DISABLED_MODE) {
        performanceTracker = new PerformanceTracker(mode, file, true);
      }
    }
  }
}

/**
 * @internal
 */
export function serializePerfOptions(
  mode: PerfTrackMode,
  file?: string
): string {
  return file ? `${mode},${file}` : mode;
}

/**
 * @internal
 */
export function decodePerformanceOptions(
  serialized?: string
): [PerfTrackMode, string | undefined] {
  if (serialized) {
    const [mode, file] = serialized.split(",") as [
      PerfTrackMode,
      string | undefined,
    ];
    return [PERF_MODES.includes(mode) ? mode : DISABLED_MODE, file];
  }
  return [DISABLED_MODE, undefined];
}
