import { stripVTControlCharacters } from "node:util";
import type { Alignment } from "./formatting.ts";
import { padString } from "./formatting.ts";

export type ColumnConfigObject = {
  /** title to put in the header */
  title: string;
  /** alignment, @default "left" for first column, "right" for other columns */
  align?: Alignment;
  /** maximum width of the column */
  maxWidth?: number;
};

/** string values are the title values */
export type ColumnConfig = string | ColumnConfigObject;

export type TableConfig = {
  /** column configurations */
  columns: ColumnConfig[];
  /**
   * sort the table by the first column (if true), or by a specific column index
   * @default false
   */
  sort?: boolean | number;
  /**
   * whether to include a header row with column titles.
   * @default true
   */
  header?: boolean;
  /**
   * table style.
   * @default "markdown"
   */
  style?: "ascii" | "markdown" | "csv";
  /**
   * wrap text over max size.
   * @default true
   */
  wrap?: boolean;
  /**
   * default alignment for the first column
   * @default "left"
   */
  alignFirst?: Alignment;
  /**
   * default alignment for columns after the first column
   * @default "right"
   */
  alignOther?: Alignment;
};

export function formatTable<TRow extends (string | number)[]>(
  rows: TRow[],
  config: TableConfig
): string | null {
  // fill out the column options
  const colOpts = resolveColumnOptions(config);
  // no rows or non array rows means we can't format a table, return null
  if (rows.length === 0 || !Array.isArray(rows[0])) {
    return null;
  }
  // sort if necessary
  if (config.sort !== false) {
    const sortColumn = typeof config.sort === "number" ? config.sort : 0;
    rows.sort((a, b) => sortCompars(a[sortColumn], b[sortColumn]));
  }
  // calculate column widths
  for (const row of rows) {
    for (let i = 0; i < colOpts.length; i++) {
      if (i < row.length) {
        recordColWidth(row[i], colOpts[i]);
      }
    }
  }

  const style = config.style ?? "markdown";
  const header = config.header !== false;
  const wrap = config.wrap !== false;

  switch (style) {
    case "csv":
      return renderCsv(rows, colOpts, header);
    case "ascii":
      return renderAscii(rows, colOpts, header, wrap);
    case "markdown":
      return renderMarkdown(rows, colOpts, header);
  }
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function sortCompars<T>(val1: T, val2: T): number {
  if (typeof val1 === "number") {
    return (val1 as number) - (val2 as number);
  } else {
    return String(val1).localeCompare(String(val2));
  }
}

// ---------------------------------------------------------------------------
// Column option helpers
// ---------------------------------------------------------------------------

type ResolvedColumnConfig = ColumnConfigObject & { longest: number };

function resolveColumnOptions(config: TableConfig): ResolvedColumnConfig[] {
  const { columns, alignFirst = "left", alignOther = "right" } = config;
  return columns.map((col, index) => {
    const base = typeof col === "string" ? { title: col } : col;
    return {
      ...base,
      longest: stripVTControlCharacters(String(base.title)).length,
      align: base.align ?? (index === 0 ? alignFirst : alignOther),
    };
  });
}

function recordColWidth(val: unknown, options: ResolvedColumnConfig): void {
  const maxWidth = options.maxWidth ?? 1000;
  const length = Math.min(
    stripVTControlCharacters(String(val)).length,
    maxWidth
  );
  if (length > options.longest) {
    options.longest = length;
  }
}

// ---------------------------------------------------------------------------
// ANSI-aware text wrapping and truncation
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;]*m/;
const ANSI_RESET = "\x1b[0m";

/**
 * Wrap a string that may contain ANSI escape codes into lines of at most
 * `width` visible characters. Active ANSI styles are closed at line breaks
 * and re-opened on the next line so colors carry across wrapped lines.
 */
function wrapAnsiString(text: string, width: number): string[] {
  if (width <= 0) {
    return [text];
  }
  const visible = stripVTControlCharacters(text);
  if (visible.length <= width) {
    return [text];
  }

  const lines: string[] = [];
  let line = "";
  let visWidth = 0;
  let activeAnsi = "";
  let i = 0;

  while (i < text.length) {
    // match ANSI escape at current position
    const ansiMatch = text.slice(i).match(ANSI_PATTERN);
    if (ansiMatch && ansiMatch.index === 0) {
      const code = ansiMatch[0];
      line += code;
      if (code === ANSI_RESET) {
        activeAnsi = "";
      } else {
        activeAnsi += code;
      }
      i += code.length;
      continue;
    }

    // start a new line when the current one is full
    if (visWidth >= width) {
      lines.push(activeAnsi ? line + ANSI_RESET : line);
      line = activeAnsi;
      visWidth = 0;
    }

    line += text[i];
    visWidth++;
    i++;
  }

  if (line) {
    lines.push(line);
  }
  return lines;
}

/**
 * Truncate a string with ANSI codes to `width` visible characters,
 * appending an ellipsis if truncation occurred.
 */
function truncateAnsiString(text: string, width: number): string {
  const visible = stripVTControlCharacters(text);
  if (visible.length <= width) {
    return text;
  }
  if (width <= 0) {
    return "…";
  }

  let result = "";
  let visWidth = 0;
  let i = 0;
  const target = width - 1; // leave room for ellipsis

  while (i < text.length && visWidth < target) {
    const ansiMatch = text.slice(i).match(ANSI_PATTERN);
    if (ansiMatch && ansiMatch.index === 0) {
      result += ansiMatch[0];
      i += ansiMatch[0].length;
      continue;
    }
    result += text[i];
    visWidth++;
    i++;
  }

  return result + ANSI_RESET + "…";
}

/**
 * Prepare a cell value for rendering: wrap or truncate based on the
 * column width and wrap setting.
 */
function prepareCellLines(
  text: string,
  col: ResolvedColumnConfig,
  wrap: boolean
): string[] {
  const visLen = stripVTControlCharacters(text).length;
  if (visLen <= col.longest) {
    return [text];
  }
  return wrap
    ? wrapAnsiString(text, col.longest)
    : [truncateAnsiString(text, col.longest)];
}

// ---------------------------------------------------------------------------
// CSV renderer
// ---------------------------------------------------------------------------

function renderCsv(
  rows: (string | number)[][],
  colOpts: ResolvedColumnConfig[],
  header: boolean
): string {
  const lines: string[] = [];
  if (header) {
    lines.push(colOpts.map((c) => csvEscape(c.title)).join(","));
  }
  for (const row of rows) {
    lines.push(
      colOpts
        .map((_, i) =>
          csvEscape(stripVTControlCharacters(String(row[i] ?? "")))
        )
        .join(",")
    );
  }
  return lines.join("\n");
}

function csvEscape(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

function renderMarkdown(
  rows: (string | number)[][],
  colOpts: ResolvedColumnConfig[],
  header: boolean
): string {
  const lines: string[] = [];
  const padCell = (text: string, col: ResolvedColumnConfig): string =>
    padString(text, col.longest, col.align);

  if (header) {
    lines.push(
      "| " +
        colOpts.map((c) => padCell(c.title, c)).join(" | ") +
        " |"
    );
    lines.push(
      "| " +
        colOpts
          .map((c) => {
            const w = Math.max(c.longest, 3);
            if (c.align === "right") {
              return "-".repeat(w - 1) + ":";
            }
            if (c.align === "center") {
              return ":" + "-".repeat(w - 2) + ":";
            }
            return "-".repeat(w);
          })
          .join(" | ") +
        " |"
    );
  }

  for (const row of rows) {
    const cells = colOpts.map((c, i) => {
      let text = String(row[i] ?? "");
      const visLen = stripVTControlCharacters(text).length;
      if (visLen > c.longest) {
        text = truncateAnsiString(text, c.longest);
      }
      return padCell(text, c);
    });
    lines.push("| " + cells.join(" | ") + " |");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// ASCII box-drawing renderer
// ---------------------------------------------------------------------------

function renderAscii(
  rows: (string | number)[][],
  colOpts: ResolvedColumnConfig[],
  header: boolean,
  wrap: boolean
): string {
  const widths = colOpts.map((c) => c.longest);
  const hLine = (
    left: string,
    mid: string,
    right: string,
    fill: string
  ): string =>
    left +
    widths.map((w) => fill.repeat(w + 2)).join(mid) +
    right;

  // prepare all cell content (potentially multi-line per row)
  const preparedRows: string[][][] = [];

  if (header) {
    preparedRows.push(
      colOpts.map((c) => prepareCellLines(c.title, c, wrap))
    );
  }

  for (const row of rows) {
    preparedRows.push(
      colOpts.map((c, i) => prepareCellLines(String(row[i] ?? ""), c, wrap))
    );
  }

  const lines: string[] = [];
  lines.push(hLine("┌", "┬", "┐", "─"));

  for (let r = 0; r < preparedRows.length; r++) {
    const cellLines = preparedRows[r];
    const maxLines = Math.max(...cellLines.map((c) => c.length));

    for (let l = 0; l < maxLines; l++) {
      const cells = colOpts.map((c, i) => {
        const text = cellLines[i][l] ?? "";
        return padString(text, c.longest, c.align);
      });
      lines.push("│ " + cells.join(" │ ") + " │");
    }

    // separator after header
    if (header && r === 0) {
      lines.push(hLine("├", "┼", "┤", "─"));
    }
  }

  lines.push(hLine("└", "┴", "┘", "─"));
  return lines.join("\n");
}
