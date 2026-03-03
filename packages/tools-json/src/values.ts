import { JSON_VALUE_TYPES } from "./const.ts";
import type { JSONObject, JSONValueType } from "./types.ts";

/**
 * Finalization options for JSON records and arrays. Finalization is the process of preparing a JSON structure for output,
 * reordering entries and optionally removing empty records or arrays based on the provided options.
 *
 * If no options are provided no changes will be made to the input record or array.
 */

/**
 * Ordering strategy for finalization, can be a predefined strategy or a custom function.
 */
export type OrderStrategy = "alphabetical" | "none";
export type OrderFunction<T> = (entry: T) => T;

export function tryValueType(value: unknown): JSONValueType | undefined {
  if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "array";
  }
  const typeValue = typeof value;
  if (JSON_VALUE_TYPES.includes(typeValue as JSONValueType)) {
    return typeValue as JSONValueType;
  }
  return undefined;
}

export function getValueType(value: unknown): JSONValueType {
  const type = tryValueType(value);
  if (!type) {
    throw new Error(`Unsupported JSON value type: ${typeof value}`);
  }
  return type;
}

export function asJsonObject<T extends JSONObject>(
  value: unknown
): T | undefined {
  if (tryValueType(value) !== "object") {
    return undefined;
  }
  return value as T;
}

export function asJsonArray<T = unknown>(value: unknown): T[] | undefined {
  if (tryValueType(value) !== "array") {
    return undefined;
  }
  return value as T[];
}
