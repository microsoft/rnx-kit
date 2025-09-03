import { inspect, type InspectOptions } from "node:util";
import { ansiColor, dim } from "./colors.ts";
import { errorEvent, finishEvent, onExit, startEvent } from "./events.ts";
import {
  DEFAULT_LOG_LEVEL,
  LL_ERROR,
  LL_LOG,
  LL_VERBOSE,
  LL_WARN,
  type LogLevel,
} from "./levels.ts";
import { createOutput } from "./output.ts";
import type {
  CustomData,
  FinishReason,
  LogFunction,
  OutputOption,
  OutputWriter,
  Reporter,
  ReporterInfo,
  ReporterOptions,
  SessionData,
  TextTransform,
  TimingCallback,
  TimingResults,
} from "./types.ts";

type ReporterConfig = {
  // writer used to output log messages
  output: OutputWriter;

  // inspect options that determine serialization
  inspectOptions: InspectOptions;

  // message prefixes for log types
  logPrefix: Partial<Record<LogLevel, string>>;

  // message formatting functions for log types
  logFormat: Partial<Record<LogLevel, TextTransform>>;
};

const defaultConfiguration: ReporterConfig = {
  output: createOutput(DEFAULT_LOG_LEVEL),
  inspectOptions: {
    colors: true,
    depth: 2,
    maxArrayLength: 100,
    compact: true,
  },
  logPrefix: {
    error: ansiColor.red("ERROR: ⛔"),
    warn: ansiColor.yellowBright("WARNING: ⚠️"),
  },
  logFormat: {
    verbose: dim,
  },
};

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
  private config: ReporterConfig;
  private session: SessionData;
  private clearOnExit?: () => void;

  constructor(options: ReporterOptions, parent?: ReporterImpl) {
    const { inspectOptions: inspect, output, logFormat, logPrefix } = options;
    const baseConfig = parent?.config ?? defaultConfiguration;
    this.config = {
      output: ensureOutput(output ?? baseConfig.output),
      inspectOptions: inspect ?? baseConfig.inspectOptions,
      logPrefix: logPrefix ?? baseConfig.logPrefix,
      logFormat: logFormat ?? baseConfig.logFormat,
    };

    const { name, role = "reporter", packageName, data = {} } = options;
    this.session = {
      name,
      role,
      packageName,
      data,
      depth: parent && role === "task" ? parent.session.depth + 1 : 0,
      timings: initTimings(),
      parent: parent?.session,
      errors: [],
      operations: {},
    };

    // register for being notified to process exit
    this.clearOnExit = onExit(() => this.finish(undefined, "process-exit"));

    // send a start event if anyone is listening
    if (startEvent.hasSubscribers()) {
      startEvent.publish(this.session);
    }
  }

  error: LogFunction = this.createLogFn(LL_ERROR);
  errorRaw: LogFunction = this.createLogFn(LL_ERROR, true);
  warn: LogFunction = this.createLogFn(LL_WARN);
  log: LogFunction = this.createLogFn(LL_LOG);
  verbose: LogFunction = this.createLogFn(LL_VERBOSE);

  fatalError(...args: unknown[]): never {
    this.error(...args);
    throw new Error(serialize(this.config.inspectOptions, ...args));
  }

  taskSync<TReturn>(
    info: string | ReporterInfo,
    fn: (reporter: Reporter) => TReturn,
    cb?: TimingCallback
  ): TReturn {
    const taskReporter = this.start(toTaskOptions(info));
    try {
      const result = fn(taskReporter);
      taskReporter.finish(result, "complete", cb);
      return result;
    } catch (e) {
      taskReporter.finish(e, LL_ERROR);
      throw e;
    }
  }

  async task<TReturn>(
    info: string | ReporterInfo,
    fn: (reporter: Reporter) => Promise<TReturn>,
    cb?: TimingCallback
  ): Promise<TReturn> {
    const taskReporter = this.start(toTaskOptions(info));
    try {
      const result = await fn(taskReporter);
      taskReporter.finish(result, "complete", cb);
      return result;
    } catch (e) {
      taskReporter.finish(e, LL_ERROR, cb);
      throw e;
    }
  }

  measureSync<TReturn>(
    label: string,
    fn: () => TReturn,
    cb?: TimingCallback
  ): TReturn {
    const timings = initTimings();
    const result = fn();
    return this.finishOperation(label, timings, result, cb);
  }

  async measure<TReturn>(
    label: string,
    fn: () => Promise<TReturn>,
    cb?: TimingCallback
  ): Promise<TReturn> {
    const timings = initTimings();
    const result = await fn();
    return this.finishOperation(label, timings, result, cb);
  }

  start(info: ReporterInfo): Reporter {
    return new ReporterImpl(info, this);
  }

  finish<T>(result: T, reason: FinishReason = "complete", cb?: TimingCallback) {
    // record the finish state only once
    if (this.clearOnExit) {
      // record the updated session info
      const session = this.session;
      finishTiming(session.timings, cb);
      session.reason = reason;
      session.result = result;

      // send the event if listeners are present
      if (finishEvent.hasSubscribers()) {
        finishEvent.publish(session);
      }

      // clear the on-process-exit callback, also marking that the session is finished
      this.clearOnExit();
    }
    return result;
  }

  get data(): CustomData {
    return this.session.data;
  }

  private createLogFn(level: LogLevel, raw?: boolean): LogFunction {
    const { inspectOptions, output, logPrefix, logFormat } = this.config;
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

  private finishOperation<T>(
    name: string,
    timings: TimingResults,
    result: T,
    cb?: TimingCallback
  ) {
    finishTiming(timings, cb);
    const op = (this.session.operations[name] ??= { elapsed: 0, calls: 0 });
    op.elapsed += timings.duration;
    op.calls += 1;
    return result;
  }
}

function initTimings(): TimingResults {
  return {
    start: performance.now(),
    end: 0,
    duration: 0,
  };
}

function finishTiming(timing: TimingResults, cb?: TimingCallback) {
  timing.end = performance.now();
  timing.duration = timing.end - timing.start;
  cb?.(timing);
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

function emptyFunction(): void {
  // no-op
}

function identity<T>(arg: T): T {
  return arg;
}
