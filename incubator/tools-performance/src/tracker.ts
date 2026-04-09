import { reportResults } from "./report.ts";
import { createTrace, nullRecord, nullTrace } from "./trace.ts";
import type {
  PerfDataEntry,
  PerformanceConfiguration,
  TraceFunction,
  TraceRecorder,
} from "./types.ts";

export type OperationData = {
  order: number;
  calls: number;
  completions: number;
  total: number;
};

type CategoryState = {
  ops: Record<string, OperationData>;
  record: TraceRecorder;
  trace: TraceFunction;
};

export const exitHandler = (() => {
  let callbacks: (() => void)[] | undefined = undefined;

  function add(callback: () => void) {
    if (!callbacks) {
      callbacks = [];
      process.on("exit", () => {
        for (const cb of callbacks!) {
          cb();
        }
      });
    }
    callbacks.push(callback);
  }

  function remove(callback: () => void) {
    if (callbacks) {
      callbacks = callbacks.filter((cb) => cb !== callback);
    }
  }

  return { add, remove };
})();

/**
 * Performance manager that tracks the duration of operations across one or more categories.
 * Categories must be enabled before tracking begins. Provides trace and record functions
 * per category, and reports aggregated results at process exit or on demand.
 */
export class PerfManager {
  private config: PerformanceConfiguration;
  private readonly categories = new Map<string | symbol, CategoryState>();
  private readonly enabled = new Set<string | symbol>();
  private readonly unscoped = Symbol("unscoped");
  private finished = false;

  constructor(config: PerformanceConfiguration = {}) {
    this.config = { ...config };
    exitHandler.add(this.report);
  }

  updateConfig(newConfig: PerformanceConfiguration) {
    Object.assign(this.config, newConfig);
  }

  enable(category: true | string | string[]) {
    if (category === true) {
      this.enabled.add(this.unscoped);
    } else if (typeof category === "string") {
      this.enabled.add(category);
    } else {
      for (const cat of category) {
        this.enabled.add(cat);
      }
    }
  }

  isEnabled(category?: string): boolean {
    return this.enabled.has(category ?? this.unscoped);
  }

  getTrace(category?: string): TraceFunction {
    return this.getCategory(category)?.trace ?? nullTrace;
  }

  getRecorder(category?: string): TraceRecorder {
    return this.getCategory(category)?.record ?? nullRecord;
  }

  getResults(): PerfDataEntry[] {
    return [...this.categories.entries()].flatMap(([key, state]) => {
      const category = typeof key === "symbol" ? "" : key;
      return Object.entries(state.ops).map(([op, data]) =>
        produceEntry(category, op, data)
      );
    });
  }

  report = (peekOnly = false) => {
    if (!this.finished || peekOnly) {
      const allResults = this.getResults();
      if (allResults.length > 0) {
        console.log("Performance results:");
        console.log(reportResults(allResults, this.config));
      }
      if (!peekOnly) {
        this.finished = true;
        exitHandler.remove(this.report);
      }
    }
  };

  private getCategory(category?: string): CategoryState | undefined {
    const key = category ?? this.unscoped;
    if (!this.enabled.has(key)) {
      return undefined;
    }
    let state = this.categories.get(key);
    if (!state) {
      const ops: Record<string, OperationData> = {};
      const record: TraceRecorder = (op: string, duration?: number) => {
        const entry = (ops[op] ??= {
          order: performance.now(),
          calls: 0,
          completions: 0,
          total: 0,
        });
        if (duration !== undefined) {
          entry.completions++;
          entry.total += duration;
        } else {
          entry.calls++;
        }
      };
      state = { ops, record, trace: createTrace(record) };
      this.categories.set(key, state);
    }
    return state;
  }
}

function produceEntry(
  area: string,
  operation: string,
  data: OperationData
): PerfDataEntry {
  const { calls, completions, total, order } = data;
  const name = area ? `${area}: ${operation}` : operation;
  const errors = calls - completions;
  const avg = completions > 0 ? total / completions : 0;
  return { order, name, area, operation, calls, total, avg, errors };
}
