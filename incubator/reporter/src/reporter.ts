import { inspect, type InspectOptions } from "node:util";
import { ansiColor } from "./colors.ts";
import { errorEvent, finishEvent, onExit, startEvent } from "./events.ts";
import {
  LL_ERROR,
  LL_LOG,
  LL_VERBOSE,
  LL_WARN,
  type LogLevel,
} from "./levels.ts";
import { createOutput } from "./output.ts";
import type {
  CustomData,
  FinishResult,
  LogFunction,
  OperationTotals,
  OutputOption,
  OutputWriter,
  Reporter,
  ReporterInfo,
  ReporterOptions,
  SessionData,
  TextTransform,
} from "./types.ts";
import {
  emptyFunction,
  identity,
  isErrorResult,
  isPromiseLike,
  lazyInit,
  resolveFunction,
} from "./utils.ts";

/** default to console output, don't create it unless it is required though */
const defaultOutput = lazyInit<OutputWriter>(() => createOutput());

/** default options for using inspect to serialize */
const defaultInspectOptions: InspectOptions = {
  colors: true,
  depth: 2,
  maxArrayLength: 100,
  compact: true,
};

/** default prefixes for log levels, lazy-init to not load color functions unless requested */
const defaultPrefix = lazyInit<Partial<Record<LogLevel, string>>>(() => ({
  error: ansiColor().red("ERROR: ⛔"),
  warn: ansiColor().yellowBright("WARNING: ⚠️"),
}));

/**
 * Creates a new reporter instance.
 * @param options The options for the reporter, either as a string (name) or as a ReporterOptions object.
 * @returns A new Reporter instance.
 */
export function createReporter(options: string | ReporterOptions): Reporter {
  const opts = typeof options === "string" ? { name: options } : options;
  return new ReporterImpl(opts);
}

/**
 * The default implementation of the Reporter interface.
 * This class handles logging, task management, and session data tracking.
 * It supports both synchronous and asynchronous tasks, and provides
 * formatting and output capabilities.
 * @internal
 */
export class ReporterImpl implements Reporter {
  // configuration options, either from options, a parent, or defaults
  private output: OutputWriter;
  private inspectOptions: InspectOptions;
  private logPrefix: Partial<Record<LogLevel, string>>;
  private logFormat: Partial<Record<LogLevel, TextTransform>>;
  private reportTimers: boolean;

  private session: SessionData;
  private clearOnExit?: () => void;
  private startTime = performance.now();

  constructor(options: ReporterOptions, parent?: ReporterImpl) {
    const {
      inspectOptions: inspect,
      output,
      logFormat,
      logPrefix,
      reportTimers,
    } = options;
    this.output = output
      ? ensureOutput(output)
      : (parent?.output ?? defaultOutput());
    this.inspectOptions =
      inspect ?? parent?.inspectOptions ?? defaultInspectOptions;
    this.logFormat = logFormat ?? parent?.logFormat ?? {};
    this.logPrefix = logPrefix ?? parent?.logPrefix ?? defaultPrefix();
    this.reportTimers = reportTimers ?? parent?.reportTimers ?? false;

    const { name, role = "reporter", packageName, data = {} } = options;
    this.session = {
      name,
      role,
      packageName,
      data,
      elapsed: 0,
      depth: parent && role === "task" ? parent.session.depth + 1 : 0,
      parent: parent?.session,
      errors: [],
      operations: {},
    };

    // register for being notified to process exit
    this.clearOnExit = onExit(() => {
      this.finishTask(this, this.startTime);
    });

    // send a start event if anyone is listening
    if (startEvent.hasSubscribers()) {
      startEvent.publish(this.session);
    }
  }

  // Log functions for each level
  error: LogFunction = this.createLogFn(LL_ERROR);
  errorRaw: LogFunction = this.createLogFn(LL_ERROR, true);
  warn: LogFunction = this.createLogFn(LL_WARN);
  log: LogFunction = this.createLogFn(LL_LOG);
  verbose: LogFunction = this.createLogFn(LL_VERBOSE);

  // Log an error and then throw an exception with that error message
  fatalError(...args: unknown[]): never {
    this.error(...args);
    throw new Error(serialize(this.inspectOptions, ...args));
  }

  task<T>(
    info: string | ReporterInfo,
    fn: (reporter: Reporter) => T | Promise<T>
  ): T | Promise<T> {
    const [start, task] = this.initTask(info);
    const result = resolveFunction(
      () => fn(task),
      (result: FinishResult<T>) => {
        return this.finishTask(task, start, result);
      }
    );
    return isPromiseLike(result) ? result : Promise.resolve(result);
  }

  measure<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
    const [start, op] = this.initOperation(label);
    const result = resolveFunction(fn, (result: FinishResult<T>) => {
      return this.finishOperation(label, start, op, result);
    });
    return isPromiseLike(result) ? result : Promise.resolve(result);
  }

  start(info: ReporterInfo): Reporter {
    return new ReporterImpl(info, this);
  }

  finish<T>(value: T) {
    return this.finishTask(this, this.startTime, { value });
  }

  get data(): CustomData {
    return this.session.data;
  }

  private initTimer(label: string): number {
    this.reportTimers && this.verbose(`⌚ Starting: ${label}`);
    return performance.now();
  }

  private initOperation(label: string): [number, OperationTotals] {
    const op = (this.session.operations[label] ??= newOperation());
    return [this.initTimer(label), op];
  }

  private initTask(info: string | ReporterInfo): [number, ReporterImpl] {
    const taskReporter = new ReporterImpl(toTaskOptions(info), this);
    return [this.initTimer(taskReporter.session.name), taskReporter];
  }

  private finishTimer(label: string, start: number): number {
    const elapsed = performance.now() - start;
    this.reportTimers &&
      this.verbose(`⌚ Finished: ${label} in ${elapsed.toFixed()}ms`);
    return elapsed;
  }

  private finishOperation<T>(
    label: string,
    start: number,
    op: OperationTotals,
    result: FinishResult<T>
  ) {
    op.elapsed += this.finishTimer(label, start);
    op.calls += 1;
    if (isErrorResult(result)) {
      op.errors += 1;
      throw result.error;
    }
    return result.value;
  }

  private finishTask<T>(
    task: ReporterImpl,
    start: number,
    result?: FinishResult<T>
  ): T {
    const session = task.session;
    session.elapsed = this.finishTimer(session.name, start);
    session.result = result;

    // only send the event once
    if (task.clearOnExit) {
      // send the event if listeners are present
      if (finishEvent.hasSubscribers()) {
        finishEvent.publish(session);
      }

      // clear the on-process-exit callback, also marking that the session is finished
      task.clearOnExit();
      task.clearOnExit = undefined;
    }

    if (isErrorResult(result)) {
      throw result.error;
    }
    return result?.value as T;
  }

  private createLogFn(level: LogLevel, raw?: boolean): LogFunction {
    const { inspectOptions, output, logPrefix, logFormat } = this;
    const write = output[level];
    if (!write) {
      return emptyFunction;
    }
    const prefix = raw ? undefined : logPrefix[level];
    const format = (!raw && logFormat[level]) || identity;
    // error functions need to send the onError event
    if (level === "error") {
      return (...args: unknown[]) => {
        this.onError(args);
        write(format(serialize(inspectOptions, prefix, ...args)));
      };
    }
    // otherwise create a log function that injects prefix and formats as appropriate
    return (...args: unknown[]) => {
      write(format(serialize(inspectOptions, prefix, ...args)));
    };
  }

  private onError(args: unknown[]): void {
    const session = this.session;
    session.errors.push(args);

    if (errorEvent.hasSubscribers()) {
      errorEvent.publish({ session, args });
    }
  }
}

function newOperation(): OperationTotals {
  return { elapsed: 0, calls: 0, errors: 0 };
}

function serialize(inspectOptions: InspectOptions, ...args: unknown[]): string {
  return (
    args
      .filter((arg) => arg != null)
      .map((arg) => inspect(arg, inspectOptions))
      .join(" ") + "\n"
  );
}

function toTaskOptions(options: string | ReporterInfo): ReporterInfo {
  if (typeof options === "string") {
    return { name: options, role: "task" };
  }
  return options;
}

function ensureOutput(option: OutputOption): OutputWriter {
  if (typeof option === "string") {
    return createOutput(option as LogLevel);
  }
  return option;
}
