import { checkPerformanceEnv } from "./performance.ts";
import { ReporterImpl } from "./reporter.ts";
import type { CustomData, Reporter, ReporterOptions } from "./types.ts";

export {
  createEventHandler,
  subscribeToError,
  subscribeToFinish,
  subscribeToStart,
} from "./events.ts";
export {
  colorText,
  formatDuration,
  formatPackage,
  padString,
  serializeArgs,
  updateDefaultFormatting,
} from "./formatting.ts";
export { updateDefaultOutput } from "./output.ts";
export {
  enablePerformanceTracing,
  type PerformanceTrackingMode,
} from "./performance.ts";
export { allLogLevels } from "./types.ts";
export type {
  ErrorEvent,
  FormattingOptions,
  LogLevel,
  OutputOptions,
  Reporter,
  ReporterOptions,
  SessionData,
  TaskOptions,
} from "./types.ts";

export function createReporter<T extends CustomData = CustomData>(
  options: ReporterOptions<T>
): Reporter<T> {
  checkPerformanceEnv();
  return new ReporterImpl<T>(options);
}

export function globalReporter(): Reporter {
  checkPerformanceEnv();
  return ReporterImpl.globalReporter();
}
