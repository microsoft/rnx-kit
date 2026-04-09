import { styleText } from "node:util";
import type {
  PerformanceConfiguration,
  PerfDataEntry,
  PerfDataColumn,
} from "./types.ts";

export function reportResults(
  results: PerfDataEntry[],
  config: PerformanceConfiguration = {}
) {
  let cols: PerfDataColumn[] = config.cols ?? [
    "name",
    "calls",
    "total",
    "avg",
    "errors",
  ];
  const sort = config.sort
    ? Array.isArray(config.sort)
      ? config.sort
      : [config.sort]
    : ["order"];

  // do any sorting necessary based on config, default to order of the first call
  if (sort.length > 0) {
    for (let i = sort.length - 1; i >= 0; i--) {
      const colKey = sort[i] as keyof PerfDataEntry;
      if (colKey) {
        results.sort((a, b) => compareValues(a[colKey], b[colKey]));
      }
    }
  }
  // remove the error column if there are no errors to report
  if (cols.includes("errors")) {
    const hasErrors = results.some((e) => e.errors > 0);
    if (!hasErrors) {
      cols = cols.filter((c) => c !== "errors");
    }
  }
  // now produce the final set to report with text formatting and column filtering
  const finalResults = results.map((entry) => {
    const result: Record<string, string> = {};
    for (const colKey of cols) {
      const value = entry[colKey];
      if (typeof value === "number") {
        const isError = colKey === "errors";
        const style = isError ? "redBright" : undefined;
        result[colKey] = formatNumber(value, style, isError);
      } else {
        result[colKey] = entry[colKey] as string;
      }
    }
    return result;
  });
  // use console.table for nice formatting
  console.table(finalResults);
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function formatNumber(
  value: number,
  style?: Parameters<typeof styleText>[0],
  omitZero?: boolean
): string {
  if (omitZero && value === 0) {
    return "";
  }
  return styleText(style ?? "greenBright", numberFormatter.format(value));
}

function compareValues<T extends string | number>(a: T, b: T): number {
  if (typeof a === "number") {
    return a - (b as number);
  } else {
    return a.localeCompare(b as string);
  }
}
