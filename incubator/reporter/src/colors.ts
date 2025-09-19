import { WriteStream } from "node:tty";
import type { TextTransform } from "./types.ts";
import { lazyInit } from "./utils.ts";

// check whether the write stream supports color
let supportsColor =
  WriteStream.prototype.hasColors() &&
  !process.env["NODE_TEST_CONTEXT"] &&
  process.env["NODE_ENV"] !== "test";

/**
 * override color support for testing purposes
 * @internal
 */
export function overrideColorSupport(val: boolean) {
  supportsColor = val;
}

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

export type AnsiColor = (typeof ANSI_COLORS)[number];
export type AnsiBrightColors = `${AnsiColor}Bright`;

/**
 * Set of ANSI color functions, names are similar to the names used in the chalk library, though
 * aligning to the ansi names, rather than remapping gray/grey.
 */
export type AnsiColorFunctions = Record<
  AnsiColor | AnsiBrightColors,
  (s: string) => string
>;

/**
 * Set of font style functions, names are similar to the names used in the chalk library.
 */
export type FontStyleFunctions = {
  bold: TextTransform;
  dim: TextTransform;
  italic: TextTransform;
  underline: TextTransform;
  strikethrough: TextTransform;
};

/**
 * Wraps a given string with ANSI escape codes for coloring. Will be a no-op if colors are disabled in process.stdout.
 * @param s The string to colorize.
 * @param start The starting color code, either a number or raw text.
 * @param stop The stopping color code, either a number or raw text.
 */
export function encodeColor(
  s: string,
  start: string | number,
  stop: string | number
): string {
  return supportsColor ? `\u001B[${start}m${s}\u001B[${stop}m` : `${s}`;
}

/**
 * Set of ansi color functions, names are similar to the names used in the chalk library.
 */
export const ansiColor = lazyInit<AnsiColorFunctions>(() => {
  const baseColors = Object.fromEntries(
    ANSI_COLORS.map((color, index) => [
      color,
      (s: string) => encodeColor(s, index + 30, 39),
    ])
  );
  const ansiBright = Object.fromEntries(
    ANSI_COLORS.map((color, index) => [
      color + "Bright",
      (s: string) => encodeColor(s, index + 90, 39),
    ])
  );
  return { ...baseColors, ...ansiBright } as AnsiColorFunctions;
});

/**
 * Set of font style functions, names are similar to the names used in the chalk library.
 */
export const fontStyle = lazyInit<FontStyleFunctions>(() => ({
  bold: (s: string) => encodeColor(s, 1, 22),
  dim: (s: string) => encodeColor(s, 2, 22),
  italic: (s: string) => encodeColor(s, 3, 23),
  underline: (s: string) => encodeColor(s, 4, 24),
  strikethrough: (s: string) => encodeColor(s, 9, 29),
}));

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
