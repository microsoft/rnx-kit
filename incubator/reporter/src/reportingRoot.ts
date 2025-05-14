import { LOG_LOGS, LOG_NONE } from "./constants.ts";
import { defaultFormatter } from "./formatter.ts";
import type {
  MessageEvent,
  ReporterInfo,
  ReporterListener,
  ReporterOptions,
  TaskEvent,
} from "./types.ts";

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

  // Logging options, default log level and output streams
  reporterDefaults: ReporterOptions = {
    name: "",
    logLevel: LOG_LOGS,
    stdout: process.stdout,
    stderr: process.stderr,
    formatter: defaultFormatter,
    undecoratedOutput: false,
  };

  // Listeners and filters
  private listeners: ReporterListener[] = [];
  private tasks: TaskEvent[] = [];
  private reportLogLevel = LOG_NONE;

  addListener(listener: ReporterListener) {
    this.listeners.push(listener);
    if (listener.messageLevel > this.reportLogLevel) {
      // remember the highest reporting level to filter out chatty messages
      this.reportLogLevel = listener.messageLevel;
    }
  }

  removeListener(listener: ReporterListener) {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
      // reset the report log level and recalculate it since we removed a listener
      this.reportLogLevel = LOG_NONE;
      for (const l of this.listeners) {
        if (l.messageLevel > this.reportLogLevel) {
          this.reportLogLevel = l.messageLevel;
        }
      }
    }
  }

  /**
   * Notify any listeners about the message
   */
  notifyMsg(logType: number, label: string, source: ReporterInfo) {
    if (logType <= this.reportLogLevel) {
      const msg: MessageEvent = {
        logType,
        label,
        source,
      };
      for (const listener of this.listeners) {
        if (
          logType <= listener.messageLevel &&
          listener.acceptsSource(source)
        ) {
          listener.onMessage(msg);
        }
      }
    }
  }

  /**
   * Notify listeners about an action being performed
   */
  notifyAction(label: string, time: number, source: ReporterInfo) {
    const task = this.activeTask();
    if (task) {
      const actionEvent = (task.actions[`${source.name}-${task.label}`] ??= {
        source,
        label,
        calls: 0,
        elapsed: 0,
      });
      actionEvent.calls++;
      actionEvent.elapsed += time;
    }
  }

  private notifyTaskStart(label: string, source: ReporterInfo) {
    if (this.listeners.length > 0) {
      for (const listener of this.listeners) {
        if (listener.acceptsSource(source)) {
          listener.onTaskStarted({ label, source });
        }
      }
    }
  }

  private notifyTaskEnd(task: TaskEvent) {
    if (this.listeners.length > 0) {
      for (const listener of this.listeners) {
        if (listener.acceptsSource(task.source)) {
          listener.onTaskCompleted(task);
        }
      }
    }
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

  private activeTask(): TaskEvent | undefined {
    if (this.tasks.length > 0) {
      return this.tasks[this.tasks.length - 1];
    }
    return undefined;
  }
}

export function updateReportingDefaults(options: Partial<ReporterOptions>) {
  const root = ReportingRoot.getInstance();
  root.reporterDefaults = {
    ...root.reporterDefaults,
    ...options,
  };
}
