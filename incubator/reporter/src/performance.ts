import { subscribeToFinish, subscribeToStart } from "./events.ts";
import { padString } from "./formatting.ts";
import { ReporterImpl } from "./reporter.ts";
import type { ReporterOptions, SessionData } from "./types.ts";

export const PERF_TRACKING_ENV_KEY = "RNX_PERF_TRACKING";

export type PerformanceTrackingMode =
  | "disabled"
  | "enabled"
  | "verbose"
  | "file-only";

export type PerformanceTrackerOptions = {
  enabled?: boolean;
  file?: string;
  verbose?: boolean;
  subProcesses?: boolean;
};

class PerformanceTracker {
  private reporter: ReporterImpl;
  private verbose: boolean;
  private clearStart: () => boolean;
  private clearComplete: () => boolean;

  constructor(mode: PerformanceTrackingMode, file?: string, fromEnv?: boolean) {
    this.verbose = mode === "verbose" || mode === "file-only";
    const settings: ReporterOptions["settings"] = {
      level: this.verbose ? "verbose" : "log",
      colors: {
        label: 163,
      },
    };
    // set up file logging if requested, if loading from env open the stream in append mode
    if (file) {
      settings.file = {
        target: file,
        writeFlags: fromEnv ? "a" : "w",
        level: "verbose",
      };
    }
    // in file only mode suppress the console output
    if (mode === "file-only") {
      settings.level = "error";
    }
    // now create the reporter instance
    this.reporter = new ReporterImpl({
      name: "PerformanceTracker",
      label: "PERF:",
      packageName: "@rnx-kit/reporter",
      settings,
    });

    this.clearStart = subscribeToStart((event) => this.onTaskStarted(event));
    this.clearComplete = subscribeToFinish((event) =>
      this.onTaskCompleted(event)
    );
  }

  private getName(event: SessionData) {
    const name = event.name
      ? `${this.reporter.color(event.name, "highlight2")}:`
      : "";
    if (event.role === "reporter") {
      return `${this.reporter.formatPackage(event.packageName)}: ${name}`;
    }
    return name;
  }

  private getLabel(event: SessionData) {
    const prefix =
      event.role === "reporter"
        ? `${this.reporter.color("Reporter", "highlight1")}:`
        : `${"+".repeat(event.depth)}${this.reporter.color("Task", "highlight2")}:`;
    return `${prefix} ${this.getName(event)}`;
  }

  private getParentSource(event: SessionData) {
    if (this.verbose && event.parent) {
      return ` (from ${this.getName(event.parent)})`;
    }
    return "";
  }

  /**
   * Called when a task is started, omitted in non-verbose mode
   */
  private onTaskStarted(event: SessionData) {
    if (this.verbose) {
      this.reporter.log(
        this.getLabel(event),
        `Started${this.getParentSource(event)}`
      );
    }
  }

  /**
   * Called when a task is completed
   */
  private onTaskCompleted(event: SessionData) {
    const reporter = this.reporter;
    const args: unknown[] = [this.getLabel(event)];
    args.push(`Finished (${this.reporter.formatDuration(event.duration)})`);
    if (event.errors && event.errors.length > 0) {
      args.push(`with ${event.errors.length} error(s)`);
    }
    if (event.reason === "process-exit") {
      args.push(this.reporter.color("(process exit)", "verboseText"));
    } else if (event.reason === "error") {
      if (this.verbose) {
        args.push(this.reporter.color("on error:\n", "errorPrefix"));
      } else {
        args.push(`(${this.reporter.color("error result", "errorPrefix")})`);
      }
    }
    const opKeys = Object.keys(event.operations || {});
    if (opKeys.length > 0) {
      args.push(`[${opKeys.length} sub-ops]`);
    }
    reporter.log(...args);
    if (event.operations && opKeys.length > 0) {
      for (const key of opKeys) {
        const { elapsed, calls } = event.operations[key];
        const duration = padString(reporter.formatDuration(elapsed), 7);
        reporter.log(
          `${" ".repeat(event.depth)}- ${duration} |${padString(String(calls), 5)} | ${this.reporter.color(key, "highlight3")}`
        );
      }
    }
  }

  finish() {
    this.clearStart();
    this.clearComplete();
  }
}

let performanceTracker: PerformanceTracker | null = null;
let checkedEnv = false;

export function enablePerformanceTracing(
  mode: PerformanceTrackingMode = "enabled",
  file?: string
) {
  process.env[PERF_TRACKING_ENV_KEY] = serializePerfOptions(mode, file);
  if (performanceTracker) {
    performanceTracker.finish();
  }
  if (mode !== "disabled") {
    performanceTracker = new PerformanceTracker(mode, file);
  }
}

export function checkPerformanceEnv() {
  if (!checkedEnv) {
    checkedEnv = true;
    const env = process.env[PERF_TRACKING_ENV_KEY];
    if (env && typeof env === "string") {
      const [mode, file] = decodePerformanceOptions(env);
      if (mode !== "disabled") {
        performanceTracker = new PerformanceTracker(mode, file, true);
      }
    }
  }
}

export function serializePerfOptions(
  mode: PerformanceTrackingMode,
  file?: string
): string {
  return file ? `${mode},${file}` : mode;
}

function validMode(mode: string): PerformanceTrackingMode {
  const enabledModes = new Set(["enabled", "verbose", "file-only"]);
  if (enabledModes.has(mode)) {
    return mode as PerformanceTrackingMode;
  }
  return "disabled";
}

export function decodePerformanceOptions(
  serialized?: string
): [PerformanceTrackingMode, string | undefined] {
  if (serialized) {
    const parts = serialized.split(",");
    const mode = validMode(parts[0]);
    const file = parts.length > 1 ? parts[1] : undefined;
    return [mode, file];
  }
  return ["disabled", undefined];
}
