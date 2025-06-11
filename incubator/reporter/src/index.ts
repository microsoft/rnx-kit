import { checkPerformanceEnv } from "./performance.ts";
import { ReporterImpl } from "./reporter.ts";
import type {
  DeepPartial,
  Reporter,
  ReporterOptions,
  ReporterSettings,
} from "./types.ts";

export { enablePerformanceTracing } from "./performance.ts";
export { onCompleteEvent, onErrorEvent, onStartEvent } from "./reporter.ts";
export type {
  CompleteEvent,
  ErrorEvent,
  EventSource,
  Reporter,
  ReporterOptions,
  ReporterSettings,
  TaskOptions,
} from "./types.ts";

export function createReporter(options: ReporterOptions): Reporter {
  checkPerformanceEnv();
  return new ReporterImpl(options);
}

export function updateDefaultReporterSettings(
  options: DeepPartial<ReporterSettings>
): void {
  ReporterImpl.updateDefaults(options);
}

export function disableColors(): void {
  ReporterImpl.disableColors();
}
