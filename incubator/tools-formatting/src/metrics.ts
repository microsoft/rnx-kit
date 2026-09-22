/**
 * Calculated text metrics for a formatted string
 */
export type TextMetrics = {
  /**
   * The number of lines in the formatted string.
   */
  lineCount: number;

  /**
   * The terminal width of the longest line in the formatted string. Note that this will
   * omit control characters while taking into account characters such as emoji and other wide
   * characters.
   */
  width: number;
};

/**
 * Formatted text, split into lines if necessary, with text metric information included.
 */
export type TextOutput = TextMetrics & {
  /**
   * The formatted text, split into lines if necessary.
   */
  lines: string[];
};

/**
 * Get the text metrics for the given text. Undefined text will be treated as an empty string.
 * @param text The text to calculate metrics for. Can be a string or an array of strings.
 */
export function getTextMetrics(text?: string | string[]): TextMetrics {}

/**
 * Get the formatted text output for the given text, including text metrics. Undefined text will
 * return a single line with an empty string.
 * @param text The text to format and calculate metrics for. Can be a string or an array of strings.
 */
export function getTextOutput(text?: string | string[]): TextOutput {}
