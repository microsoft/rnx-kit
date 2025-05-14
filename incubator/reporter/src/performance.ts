import { LOG_NONE, LOG_VERBOSE } from "./constants.ts";
import { createReporter } from "./reporter.ts";
import { ReportingRoot } from "./reportingRoot.ts";
import type {
  ActionEvent,
  Formatter,
  Reporter,
  ReporterEvent,
  ReporterInfo,
  ReporterListener,
  TaskEvent,
} from "./types.ts";

class PerformanceReporter {
  // Filter for reporters to monitor, undefined for all
  reporterFilter?: Set<string>;

  // we don't care about messages, ignore them
  messageLevel: number = LOG_NONE;

  //
  private taskDepth = 0;
  private reporter: Reporter;
  private format: Formatter;

  private listener: ReporterListener = {
    messageLevel: LOG_NONE,
    acceptsSource: (source: ReporterInfo) =>
      !this.reporterFilter || this.reporterFilter.has(source.name),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onMessage: () => {},
    onTaskStarted: (event: ReporterEvent) => this.onTaskStarted(event),
    onTaskCompleted: (event: TaskEvent) => this.onTaskCompleted(event),
  };

  constructor(
    reporterFilter?: Set<string>,
    stdout?: NodeJS.WriteStream,
    stderr?: NodeJS.WriteStream
  ) {
    this.reporterFilter = reporterFilter;
    this.reporter = createReporter("PerformanceReporter", {
      logLevel: LOG_VERBOSE,
      undecoratedOutput: true,
      stdout,
      stderr,
    });
    this.format = this.reporter.formatter;
    ReportingRoot.getInstance().addListener(this.listener);
  }

  acceptsSource(source: ReporterInfo): boolean {
    return !this.reporterFilter || this.reporterFilter.has(source.name);
  }

  /**
   * Called when a task is started
   */
  onTaskStarted(event: ReporterEvent) {
    this.reporter.log(this.taskPrefix(event) + "Started");
    this.taskDepth++;
  }

  /**
   * Called when a task is completed
   */
  onTaskCompleted(event: TaskEvent) {
    const { duration } = this.reporter.formatter;
    this.taskDepth--;
    const taskPrefix = this.taskPrefix(event);

    const actions = Object.values(event.actions);
    if (actions.length > 0) {
      // report a header for the actions if any are present
      this.reporter.log(`${taskPrefix} ${actions.length} action types logged:`);
      // now report each action found
      for (const action of actions) {
        this.reporter.log(
          `${this.actionPrefix(action)} calls in ${duration(action.elapsed)}`
        );
      }
    }
    // finish with reporting the task completed
    if (event.error) {
      this.reporter.log(
        `${taskPrefix} Failed (${duration(event.elapsed)}) with error: ${event.error.message}`
      );
    } else {
      this.reporter.log(`${taskPrefix} Completed (${duration(event.elapsed)}`);
    }
  }

  private taskPrefix(event: ReporterEvent) {
    const source = this.format.reporter(event.source.name);
    const task = this.format.task(event.label);
    return `${"=".repeat(this.taskDepth)}> ${source}:${task}:`;
  }

  private actionPrefix(event: ActionEvent) {
    const source = this.format.reporter(event.source.name);
    const action = this.format.action(event.label);
    const actionCount = String(event.calls).padStart(this.taskDepth + 6, " ");
    return `${actionCount} ${source}:${action}:`;
  }

  finish() {
    ReportingRoot.getInstance().removeListener(this.listener);
  }
}

export function enablePerformanceTracing(
  reporterFilter?: Set<string>,
  stdout?: NodeJS.WriteStream,
  stderr?: NodeJS.WriteStream
) {
  const performanceReporter = new PerformanceReporter(
    reporterFilter,
    stdout,
    stderr
  );
  return {
    finish: () => {
      performanceReporter.finish();
    },
  };
}
