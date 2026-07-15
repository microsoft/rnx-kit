import { errorEvent, finishEvent, onExit, startEvent } from "./events.ts";
import type {
  FinishResult,
  LogFunction,
  Reporter,
  ReporterInfo,
  ReporterOptions,
  SessionData,
} from "./types.ts";
import {
  createTraceFunction,
  finalizeResult,
  isErrorResult,
  isPromiseLike,
  resolveFunction,
} from "./utils.ts";

export type Session = Pick<
  Reporter,
  "start" | "finish" | "task" | "measure"
> & {
  readonly session: SessionData;
  onError: (args: unknown[]) => void;
};

type CreateReporter = (
  options: ReporterOptions,
  parent?: SessionData
) => Reporter;

export function createSession(
  options: ReporterOptions,
  parent: SessionData | undefined,
  createReporter: CreateReporter,
  report?: LogFunction
): Session {
  const { name, role = "reporter", packageName, data = {} } = options;
  const startTime = startTimer(name, report);
  const session: SessionData = {
    name,
    role,
    packageName,
    data,
    elapsed: 0,
    depth: parent ? parent.depth + 1 : 0,
    parent,
    errors: [],
    operations: {},
  };
  const ops = session.operations;

  if (startEvent().hasSubscribers()) {
    startEvent().publish(session);
  }

  const createSubReporter = (
    info: string | ReporterInfo,
    role: "task" | "reporter"
  ) => createReporter(formReporterOptions(options, info, role), session);

  const onError = (args: unknown[]) => onErrorImpl(session, args);

  let unregisterOnExit: (() => void) | undefined = undefined;
  const finish = <T>(result?: FinishResult<T>) => {
    if (!session.result) {
      session.result = result;
      session.elapsed = finishTimer(name, startTime, report);
      // if this is an error, call the onError handler
      if (isErrorResult(result)) {
        onError([result.error]);
      }
      // now publish the session finish event if there are any subscribers
      if (finishEvent().hasSubscribers()) {
        finishEvent().publish(session);
      }
      unregisterOnExit?.();
    }
    // always return the first finished result, needs type assertion as T isn't linked to session.result
    return (session.result ? finalizeResult(session.result) : undefined) as T;
  };

  // call finish on process exit with an undefined result
  unregisterOnExit = onExit(finish);

  function recordMeasure(op: string, elapsed?: number) {
    const operation = (ops[op] ??= { elapsed: 0, start: 0, stop: 0 });
    if (elapsed === undefined) {
      operation.start++;
      report?.(`⌚ Starting: ${op}`);
    } else {
      operation.elapsed += elapsed;
      operation.stop++;
      report?.(`⌚ Finished: ${op} in ${elapsed.toFixed()}ms`);
    }
  }

  return {
    session,
    onError,
    start: (info: string | ReporterInfo) => createSubReporter(info, "reporter"),
    finish,
    measure: createTraceFunction(recordMeasure),
    task: <T>(
      info: string | ReporterInfo,
      fn: (reporter: Reporter) => T | Promise<T>
    ) => {
      const task = createSubReporter(info, "task");
      const result = resolveFunction(
        () => fn(task),
        (result: FinishResult<T>) => {
          return task.finish(result);
        }
      );
      return isPromiseLike(result) ? result : Promise.resolve(result);
    },
  };
}

function startTimer(label: string, report?: LogFunction): number {
  report?.(`⌚ Starting: ${label}`);
  return performance.now();
}

function finishTimer(
  label: string,
  start: number,
  report?: LogFunction
): number {
  const elapsed = performance.now() - start;
  report?.(`⌚ Finished: ${label} in ${elapsed.toFixed()}ms`);
  return elapsed;
}

function onErrorImpl(session: SessionData, args: unknown[]) {
  session.errors.push(args);
  const event = errorEvent();

  if (event.hasSubscribers()) {
    event.publish({ session, args });
  }
}

function toReporterOptions(options: string | ReporterOptions): ReporterOptions {
  return typeof options === "string" ? { name: options } : options;
}

function formReporterOptions(
  base: ReporterOptions,
  overrides: string | ReporterInfo,
  role: "task" | "reporter"
): ReporterOptions {
  overrides = toReporterOptions(overrides);
  return {
    ...base,
    ...overrides,
    role: overrides.role ?? role,
    data: overrides.data ?? {},
  };
}
