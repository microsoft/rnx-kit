import { checkPerformanceEnv } from "./performance.ts";
import { ReporterImpl } from "./reporter.ts";
import type { CustomData, Reporter, ReporterOptions } from "./types.ts";

export {
  subscribeToError,
  subscribeToFinish,
  subscribeToStart,
} from "./events.ts";
export {
  defaultColors,
  defaultFormat,
  disableColors,
  updateDefaultFormatting,
} from "./formatting.ts";
export { enablePerformanceTracing } from "./performance.ts";
export type {
  ErrorEvent,
  LogLevel,
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
