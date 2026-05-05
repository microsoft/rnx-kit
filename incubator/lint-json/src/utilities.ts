import path from "node:path";
import { styleText } from "node:util";
import type { JSONValuePath } from "./types.ts";

/**
 * Utility function to safely parse a JSONValuePath into an array of path segments, while blocking potentially dangerous segments
 * such as "__proto__", "constructor", and "prototype" which could lead to prototype pollution vulnerabilities if allowed
 * to be walked or set on the JSON object.
 * @param path the JSONValuePath to parse into segments
 * @returns an array of path segments if the path is valid
 * @throws an error if any blocked segments are found in the path
 */
export const getJSONPathSegments = (() => {
  const blocked = new Set(["__proto__", "constructor", "prototype"]);
  return (path: JSONValuePath): string[] => {
    const segments = Array.isArray(path) ? path : path.split(".");
    for (const segment of segments) {
      if (blocked.has(segment)) {
        throw new Error(
          `Blocked JSON path segment: ${segment} in "${segments.join(".")}"`
        );
      }
    }
    return segments;
  };
})();

/** plain object type assertion checker */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Format a validation message showing the expected and current values for a given JSON path.
 */
export function valueMessage(
  path: string[],
  expected: unknown,
  current: unknown
): string {
  return `${styleText("cyan", path.join("."))} should be: ${formatValue(expected)} [current: ${formatValue(current)}]`;
}
/**
 * Formats a value for display in error messages, highlighting undefined values in red
 * and other values in green.
 */
export function formatValue(value: unknown): string {
  if (value === undefined) {
    return styleText("red", "UNSET");
  }
  if (typeof value === "object" && value !== null) {
    return styleText("green", JSON.stringify(value));
  }
  return styleText("green", String(value));
}

export function formatHeader(filePath: string): string {
  return `${styleText("red", "errors")} in: ${path.relative(process.cwd(), filePath)}`;
}
