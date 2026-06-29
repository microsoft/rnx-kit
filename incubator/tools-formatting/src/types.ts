import type { styleText } from "node:util";
import type { BUILTIN_FORMATTERS, SEVERITY_LEVELS } from "./const.ts";

/**
 * The severity level of a message which is used to determine how it should be formatted and displayed.
 */
export type Severity = keyof typeof SEVERITY_LEVELS;

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
 * Payload for a file-related message
 */
export type FileMessage = {
  /**
   * Message to display for the given file.
   */
  message: string;

  /**
   * File path related to the message. Will be displayed as-is unless root is also set, in which case
   * it will be made relative to the root path and normalized into the correct format for the environment.
   */
  file: string;

  /**
   * Repo root path. If provided file paths will be made relative to the repo root and normalized
   * into the correct format such that links will work in GitHub and Azure DevOps. If not provided,
   * for links to work correctly the file path should be:
   * - relative to the repo root
   * - posix normalized (forward slashes)
   */
  root?: string;

  /** 1-based line number. */
  line?: number;
  /** 1-based column number. */
  col?: number;

  /** 1-based end line number. Ignored on Azure Pipelines */
  endLine?: number;
  /** 1-based end column number. Ignored on Azure Pipelines */
  endCol?: number;
  /** Optional short title shown above the message in the GitHub Actions UI. */
  title?: string;
};

export type BuiltinFormatter = (typeof BUILTIN_FORMATTERS)[number];

/**
 * A stylistic set of options for handling output formatting for particular targets.
 */
export type Formatter = ColorOptions &
  TextOptions & {
    /** name of the formatter, for convenience */
    readonly name: string;

    /** format an annotation message */
    formatMessage(severity: Severity, message: string): string;

    /** format a file-related message */
    formatFileMessage(severity: Severity, fileMessage: FileMessage): string;

    /** format a group of messages */
    formatGroup(header: string, children: string[]): string;
  };

export type FormatterPropOverrides = Partial<
  Pick<Formatter, "noColors" | "asciiOnly" | "name">
>;

/**
 * Specify a built-in formatter by name or a custom formatter instance to use for formatting output.
 * If not specified, the default formatter will be used, which is determined based on environment variables
 * and CI detection.
 */
export type FormatterOption = BuiltinFormatter | Formatter | (string & {});

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
