import { LOG_ERRORS, LOG_LOGS, LOG_NONE } from "./constants.ts";
import type {
  MessageEvent,
  ReporterInfo,
  ReporterListener,
  TaskEvent,
  TaskInfo,
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
  logLevel = LOG_LOGS;
  private reportLogLevel = LOG_NONE;
  private stdout: NodeJS.WriteStream = process.stdout;
  private stderr: NodeJS.WriteStream = process.stderr;

  // Listeners and filters
  private listeners: ReporterListener[] = [];
  private tasks: TaskEvent[] = [];

  private constructor(
    stdout?: NodeJS.WriteStream,
    stderr?: NodeJS.WriteStream
  ) {
    this.stdout = stdout ?? process.stdout;
    this.stderr = stderr ?? process.stderr;
  }

  addListener(listener: ReporterListener) {
    this.listeners.push(listener);
    if (listener.messageLevel > this.reportLogLevel) {
      // remember the highest reporting level to filter out chatty messages
      this.reportLogLevel = listener.messageLevel;
    }
  }

  /**
   * Write out a message to the appropriate output stream based on the log level
   * @param messageType type of message to log out
   * @param msg message to log
   */
  writeMsg(logType: number, msg: string) {
    if (logType <= this.logLevel) {
      if (logType === LOG_ERRORS) {
        this.stderr.write(msg);
      } else {
        this.stdout.write(msg);
      }
    }
  }

  /**
   * Notify any listeners about the message
   * @param messageType type of message
   * @param message message text, this should be pre-formatted
   * @param reporter reporter that is sending the message
   */
  notifyMsg(logType: number, message: string, reporter: ReporterInfo) {
    if (logType <= this.reportLogLevel) {
      const msg: MessageEvent = {
        logType,
        message,
        reporter,
        task: this.activeTask(),
      };
      for (const listener of this.listeners) {
        if (
          logType <= listener.messageLevel &&
          acceptListener(reporter.name, listener.reporterFilter)
        ) {
          listener.onMessage(msg);
        }
      }
    }
  }

  notifyAction(label: string, time: number) {
    const task = this.activeTask();
    if (task) {
      const collector = (task.actions[label] ??= {
        label,
        calls: 0,
        time: 0,
      });
      collector.calls++;
      collector.time += time;
    }
  }

  private notifyTaskStart(task: TaskInfo) {
    if (this.listeners.length > 0) {
      for (const listener of this.listeners) {
        if (acceptListener(task.reporter.name, listener.reporterFilter)) {
          listener.onTaskStarted(task);
        }
      }
    }
  }

  private notifyTaskEnd(task: TaskEvent) {
    if (this.listeners.length > 0) {
      for (const listener of this.listeners) {
        if (acceptListener(task.reporter.name, listener.reporterFilter)) {
          listener.onTaskCompleted(task);
        }
      }
    }
  }

  private finishTask(task: TaskEvent, error?: Error) {
    task.time = performance.now() - task.time;
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

  task<T>(label: string, reporter: ReporterInfo, fn: () => T): T {
    const task: TaskEvent = {
      label,
      reporter,
      actions: {},
      time: performance.now(),
    };
    this.tasks.push(task);
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
    const task: TaskEvent = {
      label,
      reporter,
      actions: {},
      time: performance.now(),
    };
    this.tasks.push(task);
    this.notifyTaskStart(task);
    try {
      const result = await fn();
      this.finishTask(task);
      return result;
    } catch (e) {
      this.finishTask(task, e as Error);
      throw e;
    }
  }

  private activeTask(): TaskEvent | undefined {
    if (this.tasks.length > 0) {
      return this.tasks[this.tasks.length - 1];
    }
    return undefined;
  }
}

function acceptListener(
  reporter: string,
  reporterFilter: Set<string> | undefined
) {
  return !reporterFilter || reporterFilter.has(reporter);
}
