import type { styleText } from "node:util";

/**
 * The type of value that can be passed to `styleText` to apply styling to text output.
 */
export type StyleValue = Parameters<typeof styleText>[0];

/**
 * Baseline color formatting options
 */
export type ColorOptions = {
  /**
   * Disable color formatting in the output
   */
  noColors?: boolean;
};

/**
 * Baseline text formatting options
 */
export type TextOptions = {
  /**
   * Use ASCII output only, disable unicode character output
   */
  asciiOnly?: boolean;
};

/**
 * Tree formatting options
 */
export type TreeFormattingOptions = TextOptions & {
  /**
   * Customizable parts of the tree view to use when rendering each row and the last row
   * of the tree. If not specified, a default set of unicode tree characters will be used.
   */
  treeParts?: TreeViewParts;

  /**
   * Indent the tree output by a number of spaces or prefix each line with a string.
   */
  indent?: number | string;
};

/**
 * The result of parsing a string for formatting, which includes the original text, its visible width,
 * and optionally the individual lines and their widths if the string is multiline. This is used to
 * handle strings that may contain control codes (e.g. ANSI color codes) that affect the visible width
 * but are not part of the displayed text.
 */
export type ParsedString = {
  /** The original string, control codes included */
  text: string;
  /** The visible width of the string, excluding control codes */
  width: number;
  /** The individual lines of the string, control codes valid for each line if the string is multiline */
  lines?: string[];
  /** The visible width of each line, excluding control codes */
  lineWidths?: number[];
};

/**
 * A ParsedString is a MultilineString if it has both the lines and lineWidth properties
 */
export type MultilineString = Required<ParsedString>;

/**
 * Parts of a tree view.
 *
 * Each row of the tree has a first-line prefix and a continuation prefix used for any extra lines
 * produced when the row text contains a `\n`. The last row is treated separately so the trunk
 * character can be dropped once the branch closes. All four prefixes should have the same width
 * so columns line up.
 *
 *   {
 *     row: ["├── ", "│   "],  // [first-line prefix, continuation prefix]
 *     last: ["└── ", "    "], // same shape, used for the final row
 *   }
 *
 * With rows that include `\n`, the above produces:
 *
 *   Header
 *   ├── single-line row
 *   ├── row with a newline
 *   │   continuation of the previous row
 *   └── last row, which also
 *       wraps onto a second line
 */
export type TreeViewParts = {
  row: [string, string];
  last: [string, string];
};

/**
 * Parts of a table view, each consisting of three strings representing the left, middle, and right
 * segments of the table border or row. For example, the top border of a table would be composed of
 * the left corner, the column separator, and the right corner, which are represented by the three
 * strings in the `top` tuple.
 */
export type TableViewParts = {
  /** top line of the table */
  top: [string, string, string];
  /** middle line of the table, typically used as a separator between header and body rows */
  mid: [string, string, string];
  /** a standard row of the table */
  row: [string, string, string];
  /** bottom line of the table */
  bottom: [string, string, string];
  /** line fill character */
  fill: string;
};
