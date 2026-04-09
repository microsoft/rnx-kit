import { stripVTControlCharacters, styleText } from "node:util";
import type {
  PerformanceConfiguration,
  PerfDataEntry,
  PerfDataColumn,
} from "./types.ts";

/**
 * Report performance results in a human readable table format.
 * @param input array of data entries to report, unsorted
 * @param config options that drive how the report is sorted and arranged
 * @returns a formatted string representing the performance results to be printed to the console
 */
export function reportResults(
  input: PerfDataEntry[],
  config: PerformanceConfiguration = {}
) {
  let results = input;
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

  // sort by all keys in precedence order with a single pass
  if (sort.length > 0) {
    results = [...results].sort((a, b) => {
      for (const key of sort) {
        const colKey = key as keyof PerfDataEntry;
        const cmp = compareValues(a[colKey], b[colKey]);
        if (cmp !== 0) {
          return cmp;
        }
      }
      return 0;
    });
  }
  // remove the error column if there are no errors to report
  if (cols.includes("errors")) {
    const hasErrors = results.some((e) => e.errors > 0);
    if (!hasErrors) {
      cols = cols.filter((c) => c !== "errors");
    }
  }
  const maxOpWidth = config.maxOperationWidth ?? 50;
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
        result[colKey] = styleColumn(colKey, entry, maxOpWidth);
      }
    }
    return result;
  });
  // use console.table for nice formatting
  return formatTable(finalResults, cols);
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

function truncateOp(op: string, maxWidth: number): string {
  return op.length > maxWidth ? `${op.slice(0, maxWidth - 3)}...` : op;
}

function styleColumn(
  colKey: string,
  entry: PerfDataEntry,
  maxOpWidth: number
): string {
  switch (colKey) {
    case "name": {
      const styledOp = styleText(
        "cyan",
        truncateOp(entry.operation, maxOpWidth)
      );
      return entry.area
        ? `${styleText("cyanBright", entry.area)}: ${styledOp}`
        : styledOp;
    }
    case "area":
      return entry.area ? styleText("cyanBright", entry.area) : "";
    case "operation":
      return styleText("cyan", truncateOp(entry.operation, maxOpWidth));
    default:
      return entry[colKey as keyof PerfDataEntry] as string;
  }
}

/**
 * The console.table implementation in node does now allow for formatted text so this is a slightly less
 * flexible but more visually appealing table formatter that does allow for styling.
 * @param data An array of objects representing the rows to be displayed in order
 * @param cols An array of strings representing the column headers and keys to pull from the data objects
 * @returns a single string representing the formatted table to be printed to the console
 */
export function formatTable(data: Record<string, string>[], cols: string[]) {
  const numCols = cols.length;
  const maxWidths: number[] = Array.from(
    { length: numCols },
    (_, i) => cols[i].length
  );
  const widths: number[][] = Array.from({ length: data.length });
  // calculate widths of each column based on content, calculate the max width at the same time
  for (let iRow = 0; iRow < data.length; iRow++) {
    const row = data[iRow];
    widths[iRow] = Array.from({ length: numCols });
    for (let iCol = 0; iCol < numCols; iCol++) {
      const colKey = cols[iCol];
      const width = (widths[iRow][iCol] = stripVTControlCharacters(
        row[colKey]
      ).length);
      maxWidths[iCol] = Math.max(maxWidths[iCol], width);
    }
  }
  // top line + header + mid line
  let table = drawLine(maxWidths, "top");
  table += drawRow(
    cols,
    cols.map((c) => c.length),
    maxWidths
  );
  table += drawLine(maxWidths, "mid");
  // data rows
  for (let iRow = 0; iRow < data.length; iRow++) {
    table += drawRow(
      cols.map((c) => data[iRow][c]),
      widths[iRow],
      maxWidths
    );
  }
  // bottom line
  table += drawLine(maxWidths, "bottom");
  return table;
}

const segments = {
  top: ["┌", "┬", "┐"],
  mid: ["├", "┼", "┤"],
  bottom: ["└", "┴", "┘"],
};

function drawLine(maxWidths: number[], type: keyof typeof segments) {
  const seg = segments[type];
  let line = seg[0];
  for (let i = 0; i < maxWidths.length; i++) {
    line += "─".repeat(maxWidths[i] + 2);
    line += i === maxWidths.length - 1 ? seg[2] : seg[1];
  }
  return line + "\n";
}

function drawRow(values: string[], widths: number[], maxWidths: number[]) {
  let row = "│";
  for (let i = 0; i < values.length; i++) {
    const padding = " ".repeat(maxWidths[i] - widths[i]);
    row += i === 0 ? ` ${values[i]}${padding} ` : ` ${padding}${values[i]} `;
    row += "│";
  }
  return row + "\n";
}
