export { PerfDomain } from "./domain.ts";

export {
  getDomain,
  getTrace,
  isTrackingEnabled,
  reportPerfData,
  trackPerformance,
} from "./perf.ts";

export type { TableOptions, ColumnOptions } from "./table.ts";
export { formatAsTable } from "./table.ts";

export type { TraceRecorder } from "./trace.ts";
export { createTrace, nullTrace } from "./trace.ts";

export { PerfTracker } from "./tracker.ts";
export type {
  EventFrequency,
  PerfArea,
  PerfDomainOptions,
  PerfReportColumn,
  PerformanceOptions,
  TraceFunction,
  TraceStrategy,
} from "./types.ts";
