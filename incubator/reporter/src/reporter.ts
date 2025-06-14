import { errorEvent, finishEvent, startEvent } from "./events.ts";
import { getFormatting, noChange, type Formatting } from "./formatting.ts";
import { allLogLevels } from "./levels.ts";
import { getOutput, type Output } from "./output.ts";
import type {
  ColorSettings,
  CustomData,
  FinishReason,
  FormatHelper,
  LogLevel,
  Reporter,
  ReporterData,
  ReporterOptions,
  SessionData,
  SessionDetails,
  TaskOptions,
  TextTransform,
} from "./types.ts";

process.on("exit", () => {
  ReporterImpl.handleProcessExit();
});

type PrepareArgs = (args: unknown[]) => unknown[];

export type InternalSessionData<T extends CustomData = CustomData> =
  ReporterData<T> & SessionDetails;

export class ReporterImpl<T extends CustomData = CustomData>
  implements Reporter<T>
{
  private static activeReporters: ReporterImpl[] = [];

  static handleProcessExit() {
    // send process exit event to all reporters and tasks
    while (ReporterImpl.activeReporters.length > 0) {
      ReporterImpl.activeReporters.pop()?.finish(undefined, "process-exit");
    }
  }

  static removeReporter(reporter: ReporterImpl) {
    const index = ReporterImpl.activeReporters.indexOf(reporter);
    if (index !== -1) {
      ReporterImpl.activeReporters.splice(index, 1);
    }
  }

  private output: Output;
  private formatting: Formatting;
  private prepArgs: Record<LogLevel, PrepareArgs>;

  private source: InternalSessionData<T>;

  constructor(options: ReporterOptions<T>, parent?: ReporterImpl<T>) {
    const { settings, ...sourceOptions } = options;

    this.output = parent?.output || getOutput(settings);
    this.formatting = parent?.formatting || getFormatting(settings);

    this.prepArgs = this.buildPrefixes(options.label);
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
    this.output.error(
      this.prepareMessage(this.colors.error.text, this.prepArgs.error(args))
    );
  }

  errorRaw(...args: unknown[]): void {
    this.onError(args);
    this.output.error(this.prepareMessage(undefined, args));
  }

  throwError(...args: unknown[]): never {
    this.onError(args);
    const msg = this.prepareMessage(
      this.colors.error.text,
      this.prepArgs.error(args)
    );
    this.output.error(msg);
    throw new Error(msg);
  }

  warn(...args: unknown[]): void {
    this.output.warn?.(
      this.prepareMessage(this.colors.warn.text, this.prepArgs.warn(args))
    );
  }

  log(...args: unknown[]): void {
    this.output.log?.(
      this.prepareMessage(this.colors.log.text, this.prepArgs.log(args))
    );
  }

  verbose(...args: unknown[]): void {
    this.output.verbose?.(
      this.prepareMessage(this.colors.verbose.text, this.prepArgs.verbose(args))
    );
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
    fn: (reporter: Reporter) => Promise<TReturn>
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

  get format(): FormatHelper {
    return this.formatting.format;
  }

  get colors(): ColorSettings {
    return this.formatting.colors;
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

  private buildPrefixes(label?: string) {
    // color the label if requested
    if (label && this.colors.labels) {
      label = this.colors.labels(label);
    }
    const prefixes = {} as Record<LogLevel, PrepareArgs>;
    for (const level of allLogLevels) {
      const prefix = this.formatting.prefixes[level];
      if (prefix || label) {
        const colorPrefix = this.colors[level].prefix ?? noChange;
        const prepend: unknown[] = prefix ? [colorPrefix(prefix)] : [];
        if (label) {
          prepend.push(label);
        }
        prefixes[level] = (args: unknown[]) => {
          return prepend.concat(...args);
        };
      } else {
        prefixes[level] = noChange;
      }
    }
    return prefixes;
  }

  private prepareMessage(
    colorText: TextTransform | undefined,
    args: unknown[]
  ): string {
    const color = colorText ?? noChange;
    return color(this.format.serialize(args));
  }
}
