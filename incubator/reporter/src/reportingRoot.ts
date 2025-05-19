import {
  createStreamWriter,
  defaultColorizer,
  defaultFormatter,
} from "./output.ts";
import type {
  ReporterInfo,
  ReporterListener,
  ReporterOptions,
  TaskEvent,
} from "./types.ts";

export const ROOT_REPORTER_NAME = "ProcessRoot";
export const ROOT_SESSION_TASK_NAME = "Session";

export class ReportingRoot {
  /**
   * The root reporter that will be used to report messages
   */
  private static instance: ReportingRoot;

  /**
   * Get the singleton instance of the ReportingRoot, creating it if it doesn't exist
   * @returns the singleton instance of the ReportingRoot
   */
  static getInstance(): ReportingRoot {
    if (!ReportingRoot.instance) {
      ReportingRoot.instance = new ReportingRoot();
    }
    return ReportingRoot.instance;
  }

  // default reporter options, inherited by all reporters
  reporterDefaults: ReporterOptions = {
    name: ROOT_REPORTER_NAME,
    logLevel: "info",
    stdOutput: createStreamWriter(process.stdout),
    errOutput: createStreamWriter(process.stderr),
    formatter: defaultFormatter,
    colorizer: defaultColorizer,
  };

  // session task, baseline task to collect all unassociated actions
  private sessionTask: TaskEvent = {
    label: ROOT_SESSION_TASK_NAME,
    source: this.reporterDefaults,
    actions: {},
    elapsed: performance.now(),
  };

  // Listeners and filters
  private listeners: ReporterListener[] = [];
  private tasks: TaskEvent[] = [this.sessionTask];

  addListener(listener: ReporterListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: ReporterListener) {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  private broadcast(
    source: ReporterInfo,
    fn: (listener: ReporterListener) => void
  ) {
    for (const listener of this.listeners) {
      if (listener.acceptsSource(source)) {
        fn(listener);
      }
    }
  }

  /**
   * Notify any listeners about the message
   */
  notifyError(error: string | Error, source: ReporterInfo) {
    const label = typeof error === "string" ? error : error.message;
    this.broadcast(source, (listener) => {
      listener.onError({ label, error, source });
    });
  }

  /**
   * Notify listeners about an action being performed
   */
  notifyAction(label: string, time: number, source: ReporterInfo) {
    const task = this.activeTask();
    const actionEvent = (task.actions[`${source.name}-${task.label}`] ??= {
      source,
      label,
      calls: 0,
      elapsed: 0,
    });
    actionEvent.calls++;
    actionEvent.elapsed += time;
  }

  private notifyTaskStart(label: string, source: ReporterInfo) {
    this.broadcast(source, (listener) => {
      listener.onTaskStarted({ label, source });
    });
  }

  private notifyTaskEnd(task: TaskEvent) {
    this.broadcast(task.source, (listener) => {
      listener.onTaskCompleted(task);
    });
  }

  private startTask(label: string, source: ReporterInfo) {
    const task: TaskEvent = {
      label,
      source,
      actions: {},
      elapsed: performance.now(),
    };
    this.tasks.push(task);
    this.notifyTaskStart(label, source);
    return task;
  }

  private finishTask(task: TaskEvent, error?: Error) {
    task.elapsed = performance.now() - task.elapsed;
    task.error = error;
    this.notifyTaskEnd(task);
    if (task === this.activeTask()) {
      this.tasks.pop();
    } else {
      // this is unlikely to happen but is possible if asynchronous tasks are used in certain ways
      const index = this.tasks.findIndex((t) => t === task);
      if (index >= 0) {
        this.tasks.splice(index, 1);
      }
    }
  }

  task<T>(label: string, source: ReporterInfo, fn: () => T): T {
    const task = this.startTask(label, source);
    try {
      const result = fn();
      this.finishTask(task);
      return result;
    } catch (e) {
      this.finishTask(task, e as Error);
      throw e;
    }
  }

  async asyncTask<T>(
    label: string,
    reporter: ReporterInfo,
    fn: () => Promise<T>
  ): Promise<T> {
    const task = this.startTask(label, reporter);
    try {
      const result = await fn();
      this.finishTask(task);
      return result;
    } catch (e) {
      this.finishTask(task, e as Error);
      throw e;
    }
  }

  action<T>(label: string, source: ReporterInfo, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    this.notifyAction(label, performance.now() - start, source);
    return result;
  }

  async asyncAction<T>(
    label: string,
    source: ReporterInfo,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const result = await fn();
    this.notifyAction(label, performance.now() - start, source);
    return result;
  }

  private activeTask(): TaskEvent {
    if (this.tasks.length > 0) {
      return this.tasks[this.tasks.length - 1];
    }
    return this.sessionTask;
  }
}

export function updateReportingDefaults(options: Partial<ReporterOptions>) {
  const root = ReportingRoot.getInstance();
  root.reporterDefaults = {
    ...root.reporterDefaults,
    ...options,
  };
}
