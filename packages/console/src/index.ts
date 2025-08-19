import { WriteStream } from "node:tty";

// check whether the write stream supports color
export const supportsColor =
  WriteStream.prototype.hasColors() &&
  !process.env["NODE_TEST_CONTEXT"] &&
  process.env["NODE_ENV"] !== "test";

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
 * Encodes a string with ANSI 16 color codes given the base color values. Color values are the 0 rooted standard values so:
 * - 0: black
 * - 1: red
 * - 2: green
 * - 3: yellow
 * - 4: blue
 * - 5: magenta
 * - 6: cyan
 * - 7: white
 * @param s The string to colorize.
 * @param color The color code (0-7).
 * @returns The colorized string if colors are enabled, the original string otherwise.
 */
export function encodeAnsi16(s: string, color: number) {
  return encodeColor(s, 30 + color, 39);
}

/**
 * Encodes a string with ANSI 16 bright color codes. These take one of the base color values from 0 to 7 and represents
 * them as their bright color equivalents.
 * @param s The string to colorize.
 * @param color The color code (0-7).
 * @returns The colorized string if colors are enabled, the original string otherwise.
 */
export function encodeAnsi16Bright(s: string, color: number) {
  return encodeColor(s, 90 + color, 39);
}

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

/**
 * Bold and dim functions, explicitly implemented as they are used in the log functions below and the stop code
 * is slightly different than for color values.
 */
export const bold = (s: string) => encodeColor(s, 1, 22);
export const dim = (s: string) => encodeColor(s, 2, 22);

type Log = typeof console.log;

const errorTag = encodeAnsi16(bold("error"), 1);
const infoTag = encodeAnsi16(bold("info"), 6);
const warnTag = encodeAnsi16(bold("warn"), 3);

/**
 * Logs an error message to the console, in a format that is consistent with the metro logging
 * @param args The message to log.
 */
export const error: Log = (...args) => console.error(errorTag, ...args);
export const info: Log = (...args) => console.log(infoTag, ...args);
export const warn: Log = (...args) => console.warn(warnTag, ...args);
