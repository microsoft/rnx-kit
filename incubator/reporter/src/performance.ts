import {
  createFileWriter,
  createStreamWriter,
  plainTextColorizer,
} from "./output.ts";
import { ReportingRoot } from "./reportingRoot.ts";
import type {
  ActionEvent,
  Colorizer,
  Formatter,
  LogFunction,
  ReporterEvent,
  ReporterInfo,
  ReporterListener,
  TaskEvent,
} from "./types.ts";

export const PERF_TRACKING_ENV_KEY = "RNX_PERF_TRACKING";

export type PerformanceTrackerOptions = {
  sources?: Set<string>;
  logfile?: string;
};

class PerformanceTracker {
  private reporterFilter?: Set<string>;
  private taskDepth = 0;
  private format: Formatter;
  private report: LogFunction;
  private colorize: Colorizer = plainTextColorizer;

  private listener: ReporterListener = {
    acceptsSource: (source: ReporterInfo) =>
      !this.reporterFilter || this.reporterFilter.has(source.name),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onError: () => {},
    onTaskStarted: (event: ReporterEvent) => this.onTaskStarted(event),
    onTaskCompleted: (event: TaskEvent) => this.onTaskCompleted(event),
  };

  constructor(options: PerformanceTrackerOptions) {
    this.reporterFilter = options.sources;

    const root = ReportingRoot.getInstance();
    if (options.logfile) {
      this.report = createFileWriter(options.logfile).write;
    } else {
      this.report = createStreamWriter(process.stdout).write;
      this.colorize = root.reporterDefaults.colorizer;
    }
    this.format = root.reporterDefaults.formatter;
    root.addListener(this.listener);
  }

  acceptsSource(source: ReporterInfo): boolean {
    return !this.reporterFilter || this.reporterFilter.has(source.name);
  }

  /**
   * Called when a task is started
   */
  onTaskStarted(event: ReporterEvent) {
    this.report(this.taskPrefix(event) + "Started");
    this.taskDepth++;
  }

  /**
   * Called when a task is completed
   */
  onTaskCompleted(event: TaskEvent) {
    const duration = this.format.duration;
    this.taskDepth--;
    const taskPrefix = this.taskPrefix(event);

    const actions = Object.values(event.actions);
    if (actions.length > 0) {
      // report a header for the actions if any are present
      this.report(`${taskPrefix} ${actions.length} action types logged:`);
      // now report each action found
      for (const action of actions) {
        this.report(
          `${this.actionPrefix(action)} calls in ${duration(action.elapsed, this.colorize)}`
        );
      }
    }
    // finish with reporting the task completed
    if (event.error) {
      this.report(
        `${taskPrefix} Failed (${duration(event.elapsed, this.colorize)}) with error: ${event.error.message}`
      );
    } else {
      const finishState =
        event.state === "process-exit"
          ? "Completed (Process Exit)"
          : "Completed";
      this.report(
        `${taskPrefix} ${finishState} (${duration(event.elapsed, this.colorize)}`
      );
    }
  }

  private taskPrefix(event: ReporterEvent) {
    const source = this.colorize.reporter(event.source.name);
    const task = this.colorize.task(event.label);
    return `${"=".repeat(this.taskDepth)}> ${source}:${task}:`;
  }

  private actionPrefix(event: ActionEvent) {
    const source = this.colorize.reporter(event.source.name);
    const action = this.colorize.action(event.label);
    const actionCount = String(event.calls).padStart(this.taskDepth + 6, " ");
    return `${actionCount} ${source}:${action}:`;
  }

  finish() {
    ReportingRoot.getInstance().removeListener(this.listener);
  }
}

export function enablePerformanceTracing(
  options: PerformanceTrackerOptions = {},
  setEnvironment = true
) {
  const performanceReporter = new PerformanceTracker(options);
  if (setEnvironment) {
    process.env[PERF_TRACKING_ENV_KEY] = encodePerformanceOptions(options);
  }
  return {
    finish: () => {
      performanceReporter.finish();
    },
  };
}

let checkedEnv = false;
export function checkPerformanceEnv() {
  if (!checkedEnv) {
    checkedEnv = true;
    const env = process.env[PERF_TRACKING_ENV_KEY];
    if (env) {
      const options = decodePerformanceOptions(env);
      if (options) {
        enablePerformanceTracing(options, false);
      }
    }
  }
}

export const allSources = "all";
type SerializedPerformanceTrackerOptions = {
  sources: string;
  logfile?: string;
};

export function encodePerformanceOptions(
  options: PerformanceTrackerOptions
): string {
  const serializedOptions: SerializedPerformanceTrackerOptions = {
    sources: options.sources
      ? Array.from(options.sources).join("|")
      : allSources,
  };
  if (options.logfile) {
    serializedOptions.logfile = options.logfile;
  }
  return JSON.stringify(serializedOptions);
}

export function decodePerformanceOptions(
  serialized?: string
): PerformanceTrackerOptions | null {
  if (serialized) {
    const serializedOptions = JSON.parse(serialized);
    const { sources, logfile } = serializedOptions;
    if (
      typeof sources === "string" &&
      (!logfile || typeof logfile === "string")
    ) {
      const sourcesSet =
        sources === allSources ? undefined : new Set(sources.split("|"));
      return { sources: sourcesSet, logfile };
    }
  }
  return null;
}
