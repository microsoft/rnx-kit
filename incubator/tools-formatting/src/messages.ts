import { styleText as nodeStyleText } from "node:util";
import { SEVERITY_LEVELS } from "./const.ts";
import { normalizePath } from "./paths.ts";
import type { ColorOptions, FileMessage, Severity } from "./types.ts";

const SEVERITY_TO_COLOR: Record<Severity, Parameters<typeof nodeStyleText>[0]> =
  {
    error: "red",
    warn: "yellow",
    info: "cyan",
  };

/**
 * Compare two severity levels and return a number indicating their relative order.
 * @param a The first severity level
 * @param b The second severity level
 * @returns A negative number if `a` is less severe than `b`, a positive number if `a` is more severe than `b`, or 0 if they are equal
 */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_LEVELS[a] - SEVERITY_LEVELS[b];
}

/**
 * A wrapper around node's styleText that will respect the color options (if passed in)
 * @param style The style to apply, as accepted by node's styleText function
 * @param text The text to style
 * @param options Optional color options to determine whether to apply styling or not
 * @returns The styled text if colors are enabled, otherwise the original text
 */
export function colorText(
  style: Parameters<typeof nodeStyleText>[0],
  text: string,
  options?: ColorOptions
): string {
  return options?.noColors ? text : nodeStyleText(style, text);
}

/**
 * Format a console message with the given severity and message, applying color options if provided.
 * @param severity The severity of the message (error, warn, info)
 * @param message The message to format
 * @param options Optional color options for styling the message
 * @returns The formatted console message string
 */
export function formatConsoleMessage(
  severity: Severity,
  message: string,
  options?: ColorOptions
): string {
  const prefixColor = SEVERITY_TO_COLOR[severity];
  if (!severity || !prefixColor) {
    return message;
  }
  return `${colorText(prefixColor, severity, options)}: ${message}`;
}

/**
 * Format a file message for console output, with or without colors depending on the options. The resulting message will be:
 *   severity: filePath:line:col: [title] message
 *
 * @param severity The severity of the message (error, warn, info)
 * @param fileMsg The file message object containing details about the message
 * @param options Optional color options for styling the message
 * @returns The formatted file message string
 */
export function formatConsoleFileMessage(
  severity: Severity,
  fileMsg: FileMessage,
  options?: ColorOptions
): string {
  const { message, file, root, line, col, title } = fileMsg;
  const filePath = normalizePath(file, root);
  let fileMsgPart = colorText("magenta", filePath, options) + ":";
  if (line !== undefined) {
    fileMsgPart += colorText("dim", `${line}:`, options);
    if (col !== undefined) {
      fileMsgPart += colorText("dim", `${col}:`, options);
    }
  }
  if (title) {
    fileMsgPart += ` [${colorText("bold", title, options)}]`;
  }
  return formatConsoleMessage(severity, `${fileMsgPart} ${message}`, options);
}
