import { errorEvent, finishEvent, startEvent } from "./events.ts";
import { getFormatting, type Formatting } from "./formatting.ts";
import { allLogLevels } from "./levels.ts";
import { getOutput, type Output } from "./output.ts";
import type {
  ColorType,
  CustomData,
  FinishReason,
  LogLevel,
  Reporter,
  ReporterData,
  ReporterOptions,
  SessionData,
  SessionDetails,
  TaskOptions,
} from "./types.ts";

process.on("exit", () => {
  ReporterImpl.handleProcessExit();
});

type PrepareMsg = (args: unknown[]) => string;

type InternalSessionData<T extends CustomData = CustomData> = ReporterData<T> &
  SessionDetails;

/**
 * The default implementation of the Reporter interface.
 * This class handles logging, task management, and session data tracking.
 * It supports both synchronous and asynchronous tasks, and provides
 * formatting and output capabilities.
 * @internal
 */
export class ReporterImpl<T extends CustomData = CustomData>
  implements Reporter<T>
{
  private static activeReporters: ReporterImpl[] = [];
  private static processReporter: ReporterImpl | undefined = undefined;

  static handleProcessExit() {
    // send process exit event to all reporters and tasks
    const activeReporters = ReporterImpl.activeReporters;
    ReporterImpl.activeReporters = [];
    for (const reporter of activeReporters) {
      reporter.finish(undefined, "process-exit");
    }
  }

  static removeReporter(reporter: ReporterImpl) {
    const index = ReporterImpl.activeReporters.indexOf(reporter);
    if (index !== -1) {
      ReporterImpl.activeReporters.splice(index, 1);
    }
  }

  static globalReporter(): ReporterImpl {
    if (!ReporterImpl.processReporter) {
      ReporterImpl.processReporter = new ReporterImpl({
        name: `Process: ${process.pid}`,
        packageName: "@rnx-kit/reporter",
      });
    }
    return ReporterImpl.processReporter;
  }

  private output: Output;
  private formatting: Formatting;
  private prep: Record<LogLevel, PrepareMsg>;
  private source: InternalSessionData<T>;

  // Formatting helpers
  color: Reporter<T>["color"];
  serializeArgs: Reporter<T>["serializeArgs"];
  formatPackage: Reporter<T>["formatPackage"];
  formatDuration: Reporter<T>["formatDuration"];

  constructor(options: ReporterOptions<T>, parent?: ReporterImpl<T>) {
    const { settings, ...sourceOptions } = options;

    this.output = parent?.output || getOutput(settings);
    this.formatting = parent?.formatting || getFormatting(settings);

    // pull in the formatting helpers
    this.color = this.formatting.color;
    this.serializeArgs = this.formatting.serializeArgs;
    this.formatPackage = this.formatting.formatPackage;
    this.formatDuration = this.formatting.formatDuration;

    this.prep = this.buildMsgPrepFunctions(options.label);
    const parentSource = parent?.source;

    this.source = {
      ...sourceOptions,
      role: parentSource ? "task" : "reporter",
      startTime: performance.now(),
      duration: 0,
      parent: parentSource,
      depth: parentSource ? parentSource.depth + 1 : 0,
    };

    ReporterImpl.activeReporters.push(this);
    if (startEvent.hasSubscribers()) {
      startEvent.publish(this.source);
    }
  }

  error(...args: unknown[]): void {
    this.onError(args);
    this.output.error(this.prep.error(args));
  }

  errorRaw(...args: unknown[]): void {
    this.onError(args);
    this.output.error(this.serializeArgs(args));
  }

  throwError(...args: unknown[]): never {
    this.onError(args);
    const msg = this.prep.error(args);
    this.output.error(msg);
    throw new Error(msg);
  }

  warn(...args: unknown[]): void {
    this.output.warn?.(this.prep.warn(args));
  }

  log(...args: unknown[]): void {
    this.output.log?.(this.prep.log(args));
  }

  verbose(...args: unknown[]): void {
    this.output.verbose?.(this.prep.verbose(args));
  }

  task<TReturn>(
    label: string | TaskOptions<T>,
    fn: (reporter: Reporter<T>) => TReturn
  ): TReturn {
    const taskReporter = this.createTask(label);
    try {
      const result = fn(taskReporter);
      taskReporter.finish(result, "complete");
      return result;
    } catch (e) {
      taskReporter.finish(e, "error");
      throw e;
    }
  }

  async taskAsync<TReturn>(
    name: string | TaskOptions<T>,
    fn: (reporter: Reporter<T>) => Promise<TReturn>
  ): Promise<TReturn> {
    const taskReporter = this.createTask(name);
    try {
      const result = await fn(taskReporter);
      taskReporter.finish(result, "complete");
      return result;
    } catch (e) {
      taskReporter.finish(e, "error");
      throw e;
    }
  }

  time<TReturn>(label: string, fn: () => TReturn): TReturn {
    const start = performance.now();
    const result = fn();
    this.finishOperation(label, performance.now() - start);
    return result;
  }

  async timeAsync<TReturn>(
    label: string,
    fn: () => Promise<TReturn>
  ): Promise<TReturn> {
    const start = performance.now();
    const result = await fn();
    this.finishOperation(label, performance.now() - start);
    return result;
  }

  finish(result: unknown, reason: FinishReason = "complete") {
    // record the finish state only once
    if (!this.source.reason) {
      this.source.reason = reason;
      this.source.result = result;
      this.source.duration = performance.now() - this.source.startTime;
      // if there are event listeners send the event
      if (finishEvent.hasSubscribers()) {
        finishEvent.publish(this.source);
      }
    }

    // remove this reporter from the active reporters list
    ReporterImpl.removeReporter(this);
  }

  // get function for data
  get data(): SessionData<T> {
    return this.source;
  }

  private createTask(options: string | TaskOptions<T>): ReporterImpl<T> {
    if (typeof options === "string") {
      options = { name: options };
    }
    return new ReporterImpl<T>(
      {
        ...options,
        packageName: options.packageName || this.source.packageName,
      },
      this
    );
  }

  private onError(args: unknown[]): void {
    const errors = (this.source.errors ??= []);
    errors.push(args);

    if (errorEvent.hasSubscribers()) {
      errorEvent.publish({
        source: this.source,
        args,
      });
    }
  }

  private finishOperation(name: string, duration: number) {
    this.source.operations ??= {};
    const op = (this.source.operations[name] ??= { elapsed: 0, calls: 0 });
    op.elapsed += duration;
    op.calls += 1;
  }

  private buildMsgPrepFunctions(label?: string): Record<LogLevel, PrepareMsg> {
    // color the label if requested
    if (label) {
      label = this.color(label, "label");
    }
    const serialize = this.serializeArgs;
    const colorText = this.color;
    const prefixes: Record<LogLevel, PrepareMsg> = {};
    for (const level of allLogLevels) {
      const prefix = this.formatting.prefixes[level];
      const colorTextType = (level + "Text") as ColorType;
      if (prefix || label) {
        const prepend: unknown[] = [];
        if (prefix) {
          prepend.push(this.color(prefix, (level + "Prefix") as ColorType));
        }
        if (label) {
          prepend.push(label);
        }
        prefixes[level] = (args: unknown[]) => {
          return colorText(serialize([...prepend, ...args]), colorTextType);
        };
      } else {
        prefixes[level] = (args: unknown[]) => {
          return colorText(serialize(args), colorTextType);
        };
      }
    }
    return prefixes;
  }
}
