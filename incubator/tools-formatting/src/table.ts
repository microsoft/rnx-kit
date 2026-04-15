import { stripVTControlCharacters, styleText } from "node:util";

export type StyleValue = Parameters<typeof styleText>[0];
export type ValueFormatter<T = unknown> = (value: T) => string;

export type TableOptions = {
  /**
   * Configuration for each column, can be a string for the column label or an object with additional formatting
   * options. If not provided, columns will be labeled Column1, Column2, etc.
   */
  columns?: (string | ColumnOptions)[];

  /**
   * Optional array of column indices to sort by, in order of precedence. If not provided, no sorting will be applied.
   */
  sort?: number[];

  /**
   * Show an index column at the start of the table with the row number. Defaults to false.
   */
  showIndex?: boolean;

  /**
   * No color styling will be applied to the table output if this is set to true. Defaults to false.
   */
  noColors?: boolean;
};

/**
 * Options for configuring column output
 */
export type ColumnOptions = {
  /** label to use for the column header. Defaults to "ColumnX" where X is the column index + 1 */
  label?: string;
  /** function to convert the column value to a string, defaults to String(value) */
  format?: ValueFormatter;
  /** digits for a numeric value, for use with toFixed */
  digits?: number;
  /** use locale format for numeric values. e.g. turn 1000 into 1,000 */
  localeFmt?: boolean;
  /** style to apply to the column value, either a style from styleText or a custom formatter */
  style?: StyleValue | ValueFormatter<string>;
  /** alignment of the column value, defaults to "left" */
  align?: "left" | "right" | "center";
  /** maximum width of the column */
  maxWidth?: number;
};

export function formatAsTable(
  values: unknown[][],
  { columns, sort, showIndex, noColors }: TableOptions = {}
): string {
  if (values.length === 0) {
    return "";
  }
  // setup the column configs and calculate initial widths based on header labels
  const colData = values[0].map((_col, index) => {
    const inputValue = columns?.[index];
    const config =
      typeof inputValue === "string"
        ? { label: inputValue }
        : (inputValue ?? {});
    return toColumnData(config, index);
  });

  // create the cell data rows, applying styling data and updating colData with widths
  const rows = values.map((row) => toRowData(row, colData, noColors));

  // sort the rows in place if requested based on one or more keys
  if (sort && sort.length > 0) {
    rows.sort((a, b) => {
      for (const index of sort) {
        const cmp = compareValues(a[index].key, b[index].key);
        if (cmp !== 0) {
          return cmp;
        }
      }
      return 0;
    });
  }

  // now render the table based on the prepared row and column data
  return drawTable(rows, colData, showIndex, noColors);
}

type ResolvedColumnOptions = Omit<ColumnOptions, "label"> & {
  label: string;
  width: number;
  intlFormatter?: Intl.NumberFormat;
};

type CellEntry = {
  /** text to display */
  text: string;
  /** width of the text, not including control characters */
  width: number;
  /** sortable value */
  key: string | number;
};

function toColumnData(
  config: ColumnOptions,
  index: number
): ResolvedColumnOptions {
  const label = config.label ?? `Column${index + 1}`;
  const width = stripVTControlCharacters(label).length;
  const { digits, localeFmt } = config;
  const intlFormatter =
    localeFmt && digits !== undefined
      ? new Intl.NumberFormat(undefined, {
          maximumFractionDigits: digits,
          minimumFractionDigits: digits,
        })
      : undefined;
  return { ...config, label, width, intlFormatter };
}

function toCellData(
  value: unknown,
  config: ResolvedColumnOptions,
  noColors = false
): CellEntry {
  const { format, style, maxWidth } = config;
  let text = format ? format(value) : undefined;
  let key: string | number;
  if (text === undefined && typeof value === "number") {
    const { digits, intlFormatter } = config;
    if (intlFormatter) {
      text = intlFormatter.format(value);
    } else {
      text = digits != null ? value.toFixed(digits) : String(value);
    }
    key = value;
  } else {
    text ??= String(value);
    key = text;
  }
  if (maxWidth != null && text.length > maxWidth) {
    text = text.slice(0, maxWidth - 3) + "...";
  }
  const width = text.length;
  if (width > config.width) {
    config.width = width;
  }
  if (style) {
    text = typeof style === "function" ? style(text) : styleText(style, text);
  }
  if (noColors) {
    text = stripVTControlCharacters(text);
  }
  return { text, width, key };
}

function toRowData(
  values: unknown[],
  columns: ResolvedColumnOptions[],
  noColors = false
): CellEntry[] {
  return values.map((value, index) =>
    toCellData(value, columns[index], noColors)
  );
}

/**
 * Draw the set of table rows with the given column data
 * @param rows processed rows to render
 * @param columns processed column data with widths and styling information
 * @param addIndex whether to add an index column at the start of the table
 * @returns a string representing the drawn table to be printed to the console
 */
function drawTable(
  rows: CellEntry[][],
  columns: ResolvedColumnOptions[],
  addIndex = false,
  noColors = false
): string {
  const indexWidth = addIndex ? Math.max(String(rows.length + 1).length, 5) : 0;
  let output = drawLine(columns, "top", indexWidth);
  const headerRow = columns.map((col) => {
    const rawText = stripVTControlCharacters(col.label);
    return {
      text: noColors ? rawText : col.label,
      width: rawText.length,
    } as CellEntry;
  });
  output += drawRow(headerRow, columns, "index", indexWidth);
  output += drawLine(columns, "mid", indexWidth);
  for (let index = 0; index < rows.length; index++) {
    output += drawRow(rows[index], columns, index + 1, indexWidth);
  }
  output += drawLine(columns, "bottom", indexWidth);
  return output;
}

const segments = {
  top: ["┌", "┬", "┐"],
  mid: ["├", "┼", "┤"],
  bottom: ["└", "┴", "┘"],
};

/**
 * Draw table lines based on column widths and the type of line (top, mid, bottom)
 * @param colData set of column data with widths to determine how long to draw each segment
 * @param type one of "top", "mid", or "bottom" to determine which line segments to use
 * @param indexWidth width of the index column, if present. Column will be skipped if width is 0.
 * @returns the drawn line as a string
 */
function drawLine(
  colData: ResolvedColumnOptions[],
  type: keyof typeof segments,
  indexWidth = 0
) {
  const seg = segments[type];
  let line = seg[0];
  if (indexWidth > 0) {
    line += "─".repeat(indexWidth + 2) + seg[1];
  }
  for (let i = 0; i < colData.length; i++) {
    line += "─".repeat(colData[i].width + 2);
    line += i === colData.length - 1 ? seg[2] : seg[1];
  }
  if (type !== "bottom") {
    line += "\n";
  }
  return line;
}

/**
 * Pad a string with spaces to reach the desired width. If width is negative or zero, no padding is added.
 */
function pad(width: number): string {
  return width > 0 ? " ".repeat(width) : "";
}

/**
 * Draw text aligned within the given cell area
 */
function alignedText(
  text: string,
  width: number,
  desiredWidth: number,
  align: "left" | "right" | "center"
) {
  const delta = desiredWidth - width;
  let leftPad = 1;
  let rightPad = 1;
  if (align === "center") {
    leftPad += Math.floor(delta / 2);
    rightPad += Math.ceil(delta / 2);
  } else if (align === "right") {
    leftPad += delta;
  } else {
    rightPad += delta;
  }
  return pad(leftPad) + text + pad(rightPad);
}

/**
 * Draw a single row of the table
 * @param cells the cell entries for this row, including text and width information
 * @param columns the column data for this table, used to determine column widths and styling
 * @param index the index of this row, used for display in the index column if present
 * @param indexWidth the width of the index column, if present
 * @returns the drawn row as a string
 */
function drawRow(
  cells: CellEntry[],
  columns: ResolvedColumnOptions[],
  index: number | string,
  indexWidth = 0
) {
  let row = "│";
  if (indexWidth > 0) {
    const indexText = String(index);
    row += alignedText(indexText, indexText.length, indexWidth, "right") + "│";
  }

  for (let i = 0; i < cells.length; i++) {
    const col = columns[i];
    const { text, width } = cells[i];
    row += alignedText(text, width, col.width, col.align ?? "left") + "│";
  }
  return row + "\n";
}

/** sort compare a string or number values, both values should be of the same type */
function compareValues<T extends string | number>(a: T, b: T): number {
  if (typeof a === "number") {
    return (b as number) - a;
  } else {
    return a.localeCompare(b as string);
  }
}
