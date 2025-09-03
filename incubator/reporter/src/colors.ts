import { WriteStream } from "node:tty";

// check whether the write stream supports color
export const supportsColor =
  WriteStream.prototype.hasColors() &&
  !process.env["NODE_TEST_CONTEXT"] &&
  process.env["NODE_ENV"] !== "test";

const ANSI_COLORS = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
] as const;

type AnsiColor = (typeof ANSI_COLORS)[number];

export type AnsiColorFunctions = Record<
  AnsiColor | `${AnsiColor}Bright`,
  (s: string) => string
>;

/**
 * Wraps a given string with ANSI escape codes for coloring. Will be a no-op if colors are disabled in process.stdout.
 * @param s The string to colorize.
 * @param start The starting color code, either a number or raw text.
 * @param stop The stopping color code, either a number or raw text.
 */
export const encodeColor: (
  s: string,
  start: string | number,
  stop: string | number
) => string = supportsColor
  ? (s, start, stop) => `\u001B[${start}m${s}\u001B[${stop}m`
  : (s, _start, _stop) => s;

/**
 * ANSI color functions for text formatting
 */
export const ansiColor: AnsiColorFunctions = Object.fromEntries(
  ANSI_COLORS.map((color, index) => [
    [color, (s: string) => encodeColor(s, index + 30, 39)],
    [color + "Bright", (s: string) => encodeColor(s, index + 90, 39)],
  ])
);

export const bold = (s: string) => encodeColor(s, 1, 22);
export const dim = (s: string) => encodeColor(s, 2, 22);

/**
 * Encodes a string with ANSI 256 color codes. Note that not all terminals support 256 colors but they have automatic
 * mapping tables to fallback to 16 colors.
 * @param s The string to colorize.
 * @param color The color code (0-255).
 * @returns The colorized string if colors are enabled, the original string otherwise.
 */
export function encodeAnsi256(s: string, color: number) {
  return encodeColor(s, `38;5;${color}`, 39);
}
