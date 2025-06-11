import chalk from "chalk";
import { channel, subscribe, unsubscribe } from "node:diagnostics_channel";
import {
  createFormatHelper,
  disableColorOptions,
  mergeSettings,
  noChange,
} from "./formatting.ts";
import {
  allLogLevels,
  getWriteFunctions,
  outputSettingsChanging,
  serializeArgs,
  type WriteFunctions,
} from "./output.ts";
import type {
  ActionData,
  CompleteEvent,
  DeepPartial,
  ErrorEvent,
  EventSource,
  FinishReason,
  FormatHelper,
  LogLevel,
  Reporter,
  ReporterOptions,
  ReporterSettings,
  TaskOptions,
} from "./types.ts";

process.on("exit", () => {
  ReporterImpl.handleProcessExit();
});

type LogParts = {
  prefixes: string[];
  color: (msg: string) => string;
};

const errorChannelName = Symbol("rnx-reporter:errors");
const taskStartChannelName = Symbol("rnx-reporter:tasks");
const taskCompleteChannelName = Symbol("rnx-reporter:task-complete");

export class ReporterImpl implements Reporter {
  static defaultSettings: ReporterSettings = {
    level: "log",
    inspectOptions: {
      colors: true,
      depth: 2,
      compact: true,
    },
    color: {
      message: {
        default: {
          prefix: noChange,
          label: chalk.bold,
          text: noChange,
        },
        error: {
          prefix: chalk.red.bold,
        },
        warn: {
          prefix: chalk.yellowBright.bold,
        },
        log: {},
        verbose: {
          text: chalk.dim,
        },
      },
      pkgName: chalk.bold.cyan,
      pkgScope: chalk.bold.blue,
      path: chalk.blue,
      duration: chalk.green,
      durationUnits: chalk.greenBright,
    },
    prefixes: {
      error: "ERROR: ⛔",
      warn: "WARNING: ⚠️",
    },
  };

  static updateDefaults(options: DeepPartial<ReporterSettings>) {
    const updateWrites = outputSettingsChanging(
      ReporterImpl.defaultSettings,
      options
    );
    mergeSettings(ReporterImpl.defaultSettings, options);
    if (updateWrites) {
      ReporterImpl.baseWrites = getWriteFunctions(
        ReporterImpl.defaultSettings,
        false
      );
    }
  }

  static disableColors() {
    ReporterImpl.updateDefaults(disableColorOptions);
  }

  static handleProcessExit() {
    // send process exit event to active tasks
    let task = ReporterImpl.taskStack.pop();
    while (task) {
      task.finish(undefined, "process-exit");
      task = ReporterImpl.taskStack.pop();
    }
    // send process exit event to all reporters
    for (const reporter of ReporterImpl.reporterList) {
      reporter.finish(undefined, "process-exit");
    }
  }

  private static errorChannel = channel(errorChannelName);
  private static startChannel = channel(taskStartChannelName);
  private static completeChannel = channel(taskCompleteChannelName);

  private static baseWrites: WriteFunctions = getWriteFunctions(
    ReporterImpl.defaultSettings,
    false
  );
  private static taskStack: ReporterImpl[] = [];
  private static reporterList: ReporterImpl[] = [];

  private readonly settings: ReporterSettings;
  private readonly writes: WriteFunctions;
  private readonly msgParams: Record<LogLevel, LogParts>;
  private actions: Record<string, ActionData> = {};

  private source: EventSource;
  format: FormatHelper;

  constructor(options: ReporterOptions, parent?: ReporterImpl) {
    const { label } = options;
    const baseSettings = parent?.settings || ReporterImpl.defaultSettings;
    const baseWrites = parent?.writes || ReporterImpl.baseWrites;
    const outputChanging = outputSettingsChanging(
      baseSettings,
      options.settings
    );
    this.settings = mergeSettings(baseSettings, options.settings, true);
    this.writes = getWriteFunctions(this.settings, outputChanging, baseWrites);
    this.msgParams = this.buildLogParts(label);
    this.source = this.initializeEventSource(options, parent?.source);
    this.sendStartEvent();
    if (parent) {
      this.source.globalDepth = ReporterImpl.taskStack.length;
      ReporterImpl.taskStack.push(this);
    } else {
      ReporterImpl.reporterList.push(this);
    }
    this.format = parent?.format || createFormatHelper(this.settings.color);
  }

  error(...args: unknown[]): void {
    const { prefixes, color } = this.msgParams.error;
    this.sendErrorEvent(args);
    this.writes.error(color(this.serialize(...prefixes, ...args)));
  }

  errorRaw(...args: unknown[]): void {
    this.sendErrorEvent(args);
    this.writes.error(this.serialize(...args));
  }

  throwError(...args: unknown[]): never {
    const { prefixes, color } = this.msgParams.error;
    this.sendErrorEvent(args);
    const msg = color(this.serialize(...prefixes, ...args));
    this.writes.error(msg);
    throw new Error(msg);
  }

  warn(...args: unknown[]): void {
    const { prefixes, color } = this.msgParams.warn;
    this.writes.warn?.(color(this.serialize(...prefixes, ...args)));
  }

  log(...args: unknown[]): void {
    const { prefixes, color } = this.msgParams.log;
    this.writes.log?.(color(this.serialize(...prefixes, ...args)));
  }

  verbose(...args: unknown[]): void {
    const { prefixes, color } = this.msgParams.verbose;
    this.writes.verbose?.(color(this.serialize(...prefixes, ...args)));
  }

  task<T>(label: string | TaskOptions, fn: (reporter: Reporter) => T): T {
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

  async asyncTask<T>(
    name: string | TaskOptions,
    fn: (reporter: Reporter) => Promise<T>
  ): Promise<T> {
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

  action<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    this.finishAction(label, performance.now() - start);
    return result;
  }

  async asyncAction<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    this.finishAction(label, performance.now() - start);
    return result;
  }

  setData(entry: string, value: unknown) {
    this.source.metadata ??= {};
    this.source.metadata[entry] = value;
  }

  finish(result: unknown, reason: FinishReason = "complete") {
    // if anyone is listening, send the complete event
    if (ReporterImpl.completeChannel.hasSubscribers) {
      const completeEvent: CompleteEvent = {
        ...this.source,
        result,
        reason,
        duration: performance.now() - this.source.startTime,
        actions: Object.values(this.actions),
      };
      ReporterImpl.completeChannel.publish(completeEvent);
    }

    // remove this reporter from the task stack or reporter list
    if (this.source.role === "task") {
      ReporterImpl.taskStack = ReporterImpl.taskStack.filter(
        (task) => task.source !== this.source
      );
    } else {
      ReporterImpl.reporterList = ReporterImpl.reporterList.filter(
        (reporter) => reporter.source !== this.source
      );
    }
  }

  private createTask(options: string | TaskOptions): ReporterImpl {
    if (typeof options === "string") {
      options = { name: options };
    }
    return new ReporterImpl(
      {
        ...options,
        packageName: options.packageName || this.source.packageName,
      },
      this
    );
  }

  private sendErrorEvent(args: unknown[]): void {
    if (ReporterImpl.errorChannel.hasSubscribers) {
      ReporterImpl.errorChannel.publish({
        source: this.source,
        args,
      });
    }
  }

  private sendStartEvent(): void {
    if (ReporterImpl.startChannel.hasSubscribers) {
      ReporterImpl.startChannel.publish(this.source);
    }
  }

  private finishAction(name: string, duration: number) {
    this.actions[name] ??= {
      name,
      elapsed: 0,
      calls: 0,
    };
    this.actions[name].elapsed += duration;
    this.actions[name].calls += 1;
  }

  private buildLogParts(label?: string) {
    const parts: Record<LogLevel, LogParts> = {} as Record<LogLevel, LogParts>;
    const colors = this.settings.color.message;
    for (const level of allLogLevels) {
      parts[level] = {
        color: colors[level].text || colors.default.text,
        prefixes: [],
      };
      const prefix = this.settings.prefixes[level];
      if (prefix) {
        parts[level].prefixes.push(prefix);
      }
      if (label) {
        parts[level].prefixes.push(label);
      }
    }
    return parts;
  }

  private serialize(...args: unknown[]): string {
    return serializeArgs(this.settings.inspectOptions, ...args);
  }

  private initializeEventSource(
    options: ReporterOptions,
    parentSource?: EventSource
  ): EventSource {
    const { name, packageName, metadata } = options;
    return {
      role: parentSource ? "task" : "reporter",
      name: name || packageName,
      packageName,
      metadata,
      startTime: performance.now(),
      parent: parentSource,
      depth: parentSource ? parentSource.depth + 1 : 0,
      globalDepth: 0,
    };
  }
}

export function onStartEvent(callback: (event: EventSource) => void) {
  const handler = (event: unknown, name: symbol | string) => {
    if (name === taskStartChannelName) {
      callback(event as EventSource);
    }
  };
  subscribe(taskStartChannelName, handler);
  return () => unsubscribe(taskStartChannelName, handler);
}

export function onCompleteEvent(callback: (event: CompleteEvent) => void) {
  const handler = (event: unknown, name: symbol | string) => {
    if (name === taskCompleteChannelName) {
      callback(event as CompleteEvent);
    }
  };
  subscribe(taskCompleteChannelName, handler);
  return () => unsubscribe(taskCompleteChannelName, handler);
}

export function onErrorEvent(callback: (event: ErrorEvent) => void) {
  const handler = (event: unknown, name: symbol | string) => {
    if (name === errorChannelName) {
      callback(event as ErrorEvent);
    }
  };
  subscribe(errorChannelName, handler);
  return () => unsubscribe(errorChannelName, handler);
}
