// colors
export { ansiColor, encodeAnsi256, encodeColor, fontStyle } from "./colors.ts";
export type {
  AnsiColor,
  AnsiColorFunctions,
  FontStyleFunctions,
} from "./colors.ts";

// event subscription
export {
  createEventHandler,
  subscribeToError,
  subscribeToFinish,
  subscribeToStart,
} from "./events.ts";

// output creation
export { createOutput, mergeOutput } from "./output.ts";

// reporter creation
export { createReporter } from "./reporter.ts";

// utilities
export {
  isErrorResult,
  isPromiseLike,
  lazyInit,
  resolveFunction,
} from "./utils.ts";

// formatting
export {
  colorPackage,
  createFormatter,
  formatDuration,
  getFormatter,
  padString,
} from "./formatting.ts";
export type { Formatter, FormattingOptions } from "./formatting.ts";

// session creation
export { createSession } from "./session.ts";
export type { Session } from "./session.ts";

// common types
export type {
  ErrorEvent,
  ErrorResult,
  FinishResult,
  LogLevel,
  Logger,
  LoggerOptions,
  NormalResult,
  OutputOption,
  OutputWriter,
  Reporter,
  ReporterOptions,
  SessionData,
  TextTransform,
} from "./types.ts";
