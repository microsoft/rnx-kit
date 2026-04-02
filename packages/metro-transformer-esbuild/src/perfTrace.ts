import { info } from "@rnx-kit/console";
import type { MeasureFunction } from "./types";
import { lazyInit, isPromiseLike } from "./utils";

export const getPerfTracer = lazyInit(() => {
  type PerfData = {
    totalTime: number;
    calls: number;
    longestCall: number;
  };
  const data: Record<string, PerfData> = {};
  let reported = false;

  function record(name: string, time: number) {
    const entry = (data[name] ??= { totalTime: 0, calls: 0, longestCall: 0 });
    entry.totalTime += time;
    entry.calls++;
    if (time > entry.longestCall) {
      entry.longestCall = time;
    }
  }

  const trace: MeasureFunction = <T>(
    name: string,
    fn: (...args: unknown[]) => T | Promise<T>,
    ...args: unknown[]
  ) => {
    const start = performance.now();
    // add the entry to make the report appear in call order
    data[name] ??= { totalTime: 0, calls: 0, longestCall: 0 };

    const result = fn(...args);
    if (isPromiseLike(result)) {
      return result.then((res) => {
        record(name, performance.now() - start);
        return res;
      });
    } else {
      record(name, performance.now() - start);
      return result;
    }
  };

  function report() {
    if (!reported) {
      let maxNameLength = 0;
      const maxSize = 60;
      const sortedEntries = Object.entries(data)
        .map(([name, entry]) => {
          if (name.length > maxNameLength) {
            maxNameLength = Math.min(name.length, maxSize);
          }
          const { totalTime, calls, longestCall } = entry;
          const avgTime = totalTime / calls;
          return { name, totalTime, calls, avgTime, longestCall };
        })
        .sort((a, b) => b.totalTime - a.totalTime);

      const header = formatRow(
        "Name",
        maxNameLength,
        "Calls",
        "Total (ms)",
        "Avg (ms)",
        "Longest (ms)"
      );
      info(header);
      info("-".repeat(header.length));
      for (const entry of sortedEntries) {
        const { name, totalTime, calls, avgTime, longestCall } = entry;
        info(
          formatRow(name, maxNameLength, calls, totalTime, avgTime, longestCall)
        );
      }
      reported = true;
    }
  }

  process.on("exit", report);
  return { record, trace, report };
});

function formatRow(
  name: string,
  nameMinWidth: number,
  ...columns: (string | number)[]
): string {
  const paddedName = name.padEnd(nameMinWidth, " ");
  const formattedColumns = columns.map(formatColumn).join(" | ");
  return `${paddedName} | ${formattedColumns}`;
}

function formatColumn(value: string | number): string {
  if (typeof value === "number") {
    value = `${value.toFixed(1)}`;
  }
  return value.toString().padStart(10, " ");
}

export const measurePassthrough: MeasureFunction = <T>(
  _name: string,
  fn: (...args: unknown[]) => T,
  ...args: unknown[]
) => fn(...args);
