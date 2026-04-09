import { styleText } from "node:util";
import { createTrace } from "./trace.ts";
import type { PerfDataEntry } from "./types.ts";

export type OperationData = {
  order: number;
  start: number;
  end: number;
  total: number;
};

/**
 * Simple performance tracker that can be used to record the duration of operations. It provides a trace function
 * and a record function that can be used to record the duration of operations.
 */
export class PerformanceTracker {
  private ops: Record<string, OperationData> = {};
  private category: string | undefined;
  private maxOperationWidth: number;

  constructor(category?: string, maxOperationWidth = 50) {
    this.category = category;
    this.maxOperationWidth = maxOperationWidth;
  }

  record = (op: string, duration?: number) => {
    const entry = (this.ops[op] ??= {
      order: performance.now(),
      start: 0,
      end: 0,
      total: 0,
    });
    entry.start++;
    if (duration !== undefined) {
      entry.end++;
      entry.total += duration;
    }
  };

  getResults(): PerfDataEntry[] {
    const area = this.category ? styleText("cyanBright", this.category) : "";
    return Object.entries(this.ops).map(([op, data]) =>
      this.produceEntry(area, op, data)
    );
  }

  trace = createTrace(this.record);

  private produceEntry(
    area: string,
    operation: string,
    data: OperationData
  ): PerfDataEntry {
    const { start: calls, total, order } = data;
    // check the length of text and truncate before styling
    if (operation.length > this.maxOperationWidth) {
      operation = `${operation.slice(0, this.maxOperationWidth - 3)}...`;
    }
    operation = styleText("greenBright", operation);
    const name = area ? `${area}: ${operation}` : operation;
    const avg = calls > 0 ? total / calls : 0;
    const errors = calls - data.end;
    return {
      order,
      name,
      area,
      operation,
      calls,
      total,
      avg,
      errors,
    };
  }
}
