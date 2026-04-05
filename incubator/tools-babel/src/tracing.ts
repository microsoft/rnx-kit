import {
  isPromiseLike,
  lazyInit,
  getFormatter,
  type Formatter,
} from "@rnx-kit/reporter";
import type { TraceFunction, TransformerSettings } from "./types";

export const tracePassthrough: TraceFunction = <T>(
  _op: string,
  fn: (...args: unknown[]) => T,
  ...args: unknown[]
) => fn(...args);

export function getTrace(
  settings: Partial<
    Pick<TransformerSettings, "trace" | "tracePerformance">
  > = {}
) {
  return (settings.trace ??= settings.tracePerformance
    ? traceCache().trace
    : tracePassthrough);
}

type PerfData = { total: number; calls: number; longest: number };
type ReportData = {
  name: string;
  sortKey: number;
  total: string;
  calls: string;
  avgTime: string;
  longest: string;
};

function toReportData(
  formatter: Formatter,
  name: string,
  entry: PerfData
): ReportData {
  const { total, calls, longest } = entry;
  return {
    name: formatter.cyanBright(name),
    sortKey: total,
    total: formatter.greenBright(total.toFixed(1)),
    calls: formatter.greenBright(String(calls)),
    avgTime: formatter.greenBright(
      (entry.calls > 0 ? entry.total / entry.calls : 0).toFixed(1)
    ),
    longest: formatter.greenBright(longest.toFixed(1)),
  };
}

export const traceCache = lazyInit(() => {
  const data: Record<string, PerfData> = {};
  const formatter = getFormatter();
  let reported = false;

  /**
   * Record a data point, with null time forcing the cache addition maintaining call enter order
   */
  function record(name: string, time?: number) {
    const entry = (data[name] ??= { total: 0, calls: 0, longest: 0 });
    if (time != null) {
      entry.total += time;
      if (time > entry.longest) {
        entry.longest = time;
      }
      entry.calls++;
    }
  }

  function trace(
    op: string,
    fn: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ) {
    const start = performance.now();
    // add the entry to make the report appear in call order
    record(op);
    const result = fn(...args);
    if (isPromiseLike(result)) {
      return result.then((res) => {
        record(op, performance.now() - start);
        return res;
      });
    } else {
      record(op, performance.now() - start);
      return result;
    }
  }

  function report() {
    if (!reported) {
      let longestName = 0;
      const maxSize = 60;
      // convert to the report entry format and sort the entries.
      const sortedEntries = Object.entries(data)
        .map(([name, entry]) => toReportData(formatter, name, entry))
        .sort((a, b) => b.sortKey - a.sortKey);

      // figure out the max name length for formatting the report, capping it at a reasonable size
      for (const entry of sortedEntries) {
        if (entry.name.length > longestName) {
          longestName = Math.min(entry.name.length, maxSize);
        }
      }

      const headerLength = outputRow(formatter, longestName, {
        name: "Name",
        calls: "Calls",
        total: "Total (ms)",
        avgTime: "Avg (ms)",
        longest: "Longest (ms)",
        sortKey: 0,
      });
      console.log("-".repeat(headerLength));
      for (const entry of sortedEntries) {
        outputRow(formatter, longestName, entry);
      }
      reported = true;
    }
  }

  process.on("exit", report);
  return { trace, record, report };
});

function outputRow(
  formatter: Formatter,
  nameMinWidth: number,
  entry: ReportData
): number {
  const { name, calls, total, avgTime, longest } = entry;
  const msg = [
    formatter.cyanBright(name.padEnd(nameMinWidth, " ")),
    formatter.pad(calls, 10, "right"),
    formatter.pad(total, 10, "right"),
    formatter.pad(avgTime, 10, "right"),
    formatter.pad(longest, 10, "right"),
  ].join(" | ");
  console.log(msg);
  return msg.length;
}
