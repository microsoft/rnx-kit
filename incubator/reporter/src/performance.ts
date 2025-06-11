import chalk from "chalk";
import { onCompleteEvent, onStartEvent, ReporterImpl } from "./reporter.ts";
import type {
  ActionData,
  CompleteEvent,
  DeepPartial,
  EventSource,
  ReporterSettings,
} from "./types.ts";

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
    const settings: DeepPartial<ReporterSettings> = {
      level: this.verbose ? "verbose" : "log",
      color: {
        message: {
          default: {
            label: chalk.green.bold,
          },
        },
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
      label: chalk.magenta("PERF:"),
      packageName: "@rnx-kit/reporter",
      settings,
    });

    this.clearStart = onStartEvent((event) => this.onTaskStarted(event));
    this.clearComplete = onCompleteEvent((event) =>
      this.onTaskCompleted(event)
    );
  }

  private getName(event: EventSource) {
    const name = event.name ? `${chalk.bold(event.name)}:` : "";
    if (event.role === "reporter") {
      return `${this.reporter.format.packageFull(event.packageName)}:${name}`;
    }
    return name;
  }

  private getLabel(event: EventSource) {
    const prefix =
      event.role === "reporter"
        ? `${chalk.bold.blue("Reporter")}:`
        : `${"+".repeat(event.globalDepth)}${chalk.bold.green("Task")}:`;
    return `${prefix} ${this.getName(event)}`;
  }

  private getParentSource(event: EventSource) {
    if (this.verbose && event.parent) {
      return ` (from ${this.getName(event.parent)})`;
    }
    return "";
  }

  private getActionMessage(action: ActionData) {
    const format = this.reporter.format;
    const { elapsed, name, calls } = action;
    return `  ${chalk.bold(name)}: ${calls} calls in ${format.duration(elapsed)}`;
  }

  /**
   * Called when a task is started, omitted in non-verbose mode
   */
  private onTaskStarted(event: EventSource) {
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
  private onTaskCompleted(event: CompleteEvent) {
    const args: unknown[] = [this.getLabel(event)];
    args.push(`Finished (${this.reporter.format.duration(event.duration)})`);
    if (event.errors && event.errors.length > 0) {
      args.push(`with ${event.errors.length} error(s)`);
    }
    if (event.reason === "process-exit") {
      args.push(chalk.dim("(process exit)"));
    } else if (event.reason === "error") {
      if (this.verbose) {
        args.push(chalk.red("on error:\n", event.result));
      } else {
        args.push(`(${chalk.red("error result")})`);
      }
    }
    this.reporter.log(...args);
    if (event.actions && event.actions.length > 0) {
      this.reporter.log(
        `Logged ${event.actions.length} distinct sub-operations:`
      );
      for (const action of event.actions) {
        this.reporter.log(this.getActionMessage(action));
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
