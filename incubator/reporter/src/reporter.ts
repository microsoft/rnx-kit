import { createLogger, ensureOutput } from "./logger.ts";
import { type Session, createSession } from "./session.ts";
import type { Reporter, ReporterOptions, SessionData } from "./types.ts";

/**
 * Creates a new reporter instance.
 * @param options The options for the reporter, either as a string (name) or as a ReporterOptions object.
 * @returns A new Reporter instance.
 */
export function createReporter(options: string | ReporterOptions): Reporter {
  const opts = typeof options === "string" ? { name: options } : options;
  return createReporterWorker(opts);
}

/**
 * Internal worker function to create reporters, passed as a callback to createSession.
 * @param options The options for the reporter.
 * @param parent The parent session data.
 * @returns A new Reporter instance.
 */
function createReporterWorker(
  options: ReporterOptions,
  parent?: SessionData
): Reporter {
  // onError handler needs to be assigned after the session is created
  let sessionOnError: Session["onError"] | undefined = undefined;
  const onError = (args: unknown[]) => {
    sessionOnError?.(args);
  };

  // ensure output is valid and create a logger
  options = { ...options, output: ensureOutput(options.output) };
  const { output, prefix } = options;
  const logger = createLogger({ output, prefix, onError });

  // create the session, passing in a report function if timer reporting is enabled
  const report = options.reportTimers ? logger.verbose : undefined;
  const sessionWorker = createSession(
    options,
    parent,
    createReporterWorker,
    report
  );
  sessionOnError = sessionWorker.onError;

  // return the reporter interface, exposing the logger methods and session methods
  const data = sessionWorker.session.data;
  const { task, measure, start, finish } = sessionWorker;
  return {
    ...logger,
    task,
    measure,
    start,
    finish,
    data,
  };
}
