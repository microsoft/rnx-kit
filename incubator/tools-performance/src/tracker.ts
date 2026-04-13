import { styleText } from "node:util";
import { PerfDomain } from "./domain.ts";
import { type ColumnOptions, formatAsTable } from "./table.ts";
import type {
  EventFrequency,
  PerfDomainOptions,
  PerformanceOptions,
  PerfReportColumn,
} from "./types.ts";

type OperationData = {
  name: string;
  session: number;
  calls: number;
  completions: number;
  total: number;
};

const ENABLE_ALL = Symbol("enabled");

/**
 * Performance manager that tracks the duration of operations across one or more categories.
 * Categories must be enabled before tracking begins. Provides trace and record functions
 * per category, and reports aggregated results at process exit or on demand.
 */
export class PerfTracker {
  static startTime = performance.now();
  static exitHandlers?: Set<() => void> = undefined;

  static addExitHandler(callback: () => void) {
    if (!this.exitHandlers) {
      const exitHandlers = (this.exitHandlers = new Set<() => void>());
      process.on("exit", () => {
        for (const cb of exitHandlers) {
          cb();
        }
      });
    }
    this.exitHandlers.add(callback);
  }

  static removeExitHandler(callback: () => void) {
    this.exitHandlers?.delete(callback);
  }

  private timings = new Map<string, OperationData>();
  private enabled = new Set<string | symbol>();
  private config: PerformanceOptions;
  private domains: Record<string, PerfDomain> = {};
  private onExit: (() => void) | undefined;

  constructor(config: PerformanceOptions = {}) {
    this.config = { ...config };
    this.config.enable ??= true;
    this.enable(this.config.enable);

    this.onExit = () => this.finish(true);
    PerfTracker.addExitHandler(this.onExit);
  }

  updateConfig(newConfig: PerformanceOptions) {
    Object.assign(this.config, newConfig);
    if (newConfig.enable) {
      this.enable(newConfig.enable);
    }
  }

  enable(domain: true | string | string[]) {
    if (domain === true) {
      this.enabled.add(ENABLE_ALL);
    } else if (typeof domain === "string") {
      this.enabled.add(domain);
    } else if (Array.isArray(category)) {
      for (const cat of category) {
        this.enabled.add(cat);
      }
    } else {
      throw new Error(`invalid category: ${category}`);
    }
  }

  isEnabled(domain: string, frequency?: EventFrequency): boolean {
    if (this.enabled.has(ENABLE_ALL) || this.enabled.has(domain)) {
      const existing = this.domains[domain];
      return existing
        ? existing.enabled(frequency)
        : PerfDomain.frequencyEnabled(frequency, this.config.frequency);
    }
    return false;
  }

  private recordTime = (tag: string, duration?: number) => {
    const timings = this.timings;
    const current = timings.get(tag);
    const entry = current ?? {
      name: tag,
      session: performance.now() - PerfTracker.startTime,
      calls: 0,
      completions: 0,
      total: 0,
    };
    if (duration != null) {
      entry.completions++;
      entry.total += duration;
    } else {
      entry.calls++;
    }
    if (!current) {
      timings.set(tag, entry);
    }
  };

  private getDomainOptions(): PerfDomainOptions {
    const { strategy, frequency, waitOnStart } = this.config;
    return strategy === "timing"
      ? { recordTime: this.recordTime, frequency, waitOnStart }
      : { frequency, waitOnStart };
  }

  domain(name: string): PerfDomain | undefined {
    if (this.enabled.has(ENABLE_ALL) || this.enabled.has(name)) {
      return (this.domains[name] ??= new PerfDomain(
        name,
        this.getDomainOptions()
      ));
    }
    return undefined;
  }

  finish(processExit = false) {
    if (this.onExit) {
      for (const domain of Object.values(this.domains)) {
        domain.stop(processExit);
      }
      if (this.timings.size > 0) {
        this.report();
      }
      if (!processExit) {
        PerfTracker.removeExitHandler(this.onExit);
      }
      this.onExit = undefined;
    }
  }

  private report() {
    const config = this.config;
    const { reportColumns, reportSort, showIndex, maxNameWidth } = config;
    const cols = reportColumns ?? ["name", "calls", "total", "avg"];
    // configure the column configs
    const columnConfigs = cols.map((col) => ({
      ...(COL_OPTIONS[col] ?? { label: col }),
    }));
    if (maxNameWidth && cols.includes("name")) {
      columnConfigs[cols.indexOf("name")].maxWidth = maxNameWidth;
    }
    // filter the sort to include columns in the report
    const sort: number[] = [];
    if (reportSort && reportSort.length > 0) {
      for (const sortCol of reportSort) {
        const index = cols.indexOf(sortCol);
        if (index >= 0) {
          sort.push(index);
        }
      }
    }
    // maps the column keys to entries
    const rows = Array.from(this.timings.values()).map(
      (entry: OperationData) => {
        return cols.map((col: PerfReportColumn) => getCellValue(entry, col));
      }
    );
    const reportTo = config.reportHandler ?? console.log;
    reportTo(formatAsTable(rows, { columns: columnConfigs, sort, showIndex }));
  }
}

type SyntheticColumns = Exclude<PerfReportColumn, keyof OperationData>;
type GetColumnValue<T> = (entry: OperationData) => T;

const SYNTHETIC_VALUES: Record<SyntheticColumns, GetColumnValue<number>> = {
  avg: (entry) => (entry.completions > 0 ? entry.total / entry.completions : 0),
  errors: (entry) => entry.calls - entry.completions,
};

function getCellValue(
  entry: OperationData,
  column: PerfReportColumn
): string | number {
  if (column in entry) {
    return entry[column as keyof OperationData];
  } else if (column in SYNTHETIC_VALUES) {
    return SYNTHETIC_VALUES[column as SyntheticColumns](entry);
  }
  return "";
}

const NUM_COL_OPTIONS: ColumnOptions = {
  digits: 0,
  style: "green",
  localeFmt: true,
  align: "right",
};

function styleName(name: string): string {
  const firstColon = name.indexOf(":");
  if (firstColon === -1) {
    return styleText("cyan", name);
  }
  const prefix = name.substring(0, firstColon);
  const op = name.substring(firstColon + 1);
  return `${styleText("blue", prefix)}:${styleText("cyan", op)}`;
}

const COL_OPTIONS: Record<PerfReportColumn, ColumnOptions> = {
  name: { label: "operation", align: "left", style: styleName, maxWidth: 50 },
  session: { label: "session", ...NUM_COL_OPTIONS },
  calls: { label: "calls", ...NUM_COL_OPTIONS },
  total: { label: "total", ...NUM_COL_OPTIONS },
  avg: { label: "avg", ...NUM_COL_OPTIONS },
  errors: { label: "errors", ...NUM_COL_OPTIONS },
};
