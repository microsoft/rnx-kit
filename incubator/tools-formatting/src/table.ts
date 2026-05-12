import { stripVTControlCharacters, styleText } from "node:util";
import { TABLE_STYLES } from "./const.ts";
import type {
  StyleValue,
  TextOptions,
  ColorOptions,
  TableViewParts,
} from "./types.ts";

export type ValueFormatter<T = unknown> = (value: T) => string;

export type TableOptions = TextOptions &
  ColorOptions & {
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
     * Optional custom parts to use when drawing the table, such as row separators, header separators, etc.
     */
    tableParts?: TableViewParts;
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
  options: TableOptions = {}
): string {
  const { columns, sort, noColors } = options;
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
  return drawTable(rows, colData, options);
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
 * @param options table rendering options
 * @returns a string representing the drawn table to be printed to the console
 */
function drawTable(
  rows: CellEntry[][],
  columns: ResolvedColumnOptions[],
  { showIndex, noColors, tableParts, asciiOnly }: TableOptions = {}
): string {
  const style =
    tableParts ?? (asciiOnly ? TABLE_STYLES.ascii : TABLE_STYLES.default);
  const fill = style.fill;
  const indexWidth = showIndex
    ? Math.max(String(rows.length + 1).length, 5)
    : 0;
  let output = drawLine(columns, style.top, fill, indexWidth) + "\n";
  const headerRow = columns.map((col) => {
    const rawText = stripVTControlCharacters(col.label);
    return {
      text: noColors ? rawText : col.label,
      width: rawText.length,
    } as CellEntry;
  });
  output += drawRow(headerRow, columns, style.row, "index", indexWidth);
  output += drawLine(columns, style.mid, fill, indexWidth) + "\n";
  for (let index = 0; index < rows.length; index++) {
    output += drawRow(rows[index], columns, style.row, index + 1, indexWidth);
  }
  output += drawLine(columns, style.bottom, fill, indexWidth);
  return output;
}

/**
 * Draw table lines based on column widths and the type of line (top, mid, bottom)
 * @param colData set of column data with widths to determine how long to draw each segment
 * @param seg the set of line segments to use for this line, in the order [left, middle, right]
 * @param indexWidth width of the index column, if present. Column will be skipped if width is 0.
 * @returns the drawn line as a string
 */
function drawLine(
  colData: ResolvedColumnOptions[],
  seg: [string, string, string],
  fill: string,
  indexWidth = 0
) {
  let line = seg[0];
  if (indexWidth > 0) {
    line += fill.repeat(indexWidth + 2) + seg[1];
  }
  for (let i = 0; i < colData.length; i++) {
    line += fill.repeat(colData[i].width + 2);
    line += i === colData.length - 1 ? seg[2] : seg[1];
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
  segments: [string, string, string],
  index: number | string,
  indexWidth = 0
) {
  let row = segments[0];
  if (indexWidth > 0) {
    const indexText = String(index);
    row +=
      alignedText(indexText, indexText.length, indexWidth, "right") +
      segments[1];
  }

  for (let i = 0; i < cells.length; i++) {
    const col = columns[i];
    const segment = i === cells.length - 1 ? segments[2] : segments[1];
    const { text, width } = cells[i];
    row += alignedText(text, width, col.width, col.align ?? "left") + segment;
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
