/**
 * Input parsing — basic validation + shape coercion.
 *
 * TypeScript parser that imports raw JS error classes to exercise
 * named-import-from-CommonJS interop in bundlers.
 */

import { ParseError } from "../errors.cjs";
import type { AppInput, AppRecord, Tag } from "../types.ts";
import {
  isFiniteNumber,
  isNonEmptyString,
  isPlainObject,
} from "../util/validate.ts";

export function parse(input: unknown): AppInput {
  if (!isPlainObject(input)) {
    throw new ParseError("input must be an object", []);
  }
  const { records, options } = input as {
    records?: unknown;
    options?: unknown;
  };
  if (!Array.isArray(records)) {
    throw new ParseError("input.records must be an array", ["records"]);
  }
  const parsedRecords = records.map((r, i) => parseRecord(r, i));
  return options === undefined
    ? { records: parsedRecords }
    : { records: parsedRecords, options: parseOptions(options) };
}

function parseRecord(raw: unknown, index: number): AppRecord {
  if (!isPlainObject(raw)) {
    throw new ParseError("record must be an object", ["records", index]);
  }
  const r = raw as Record<string, unknown>;
  const id = r["id"];
  if (!isNonEmptyString(id)) {
    throw new ParseError("record.id must be a non-empty string", [
      "records",
      index,
      "id",
    ]);
  }
  const group = r["group"];
  if (!isNonEmptyString(group)) {
    throw new ParseError("record.group must be a non-empty string", [
      "records",
      index,
      "group",
    ]);
  }
  const value = r["value"];
  if (!isFiniteNumber(value)) {
    throw new ParseError("record.value must be a finite number", [
      "records",
      index,
      "value",
    ]);
  }
  const ts = r["ts"];
  if (!isFiniteNumber(ts)) {
    throw new ParseError("record.ts must be a finite number", [
      "records",
      index,
      "ts",
    ]);
  }
  const tagsRaw = r["tags"];
  const tags = parseTags(tagsRaw, ["records", index, "tags"]);
  return tags === undefined
    ? { id, group, value, ts }
    : { id, group, value, ts, tags };
}

function parseTags(
  raw: unknown,
  path: (string | number)[]
): readonly Tag[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new ParseError("tags must be an array of strings", path);
  }
  return raw.map((t, i) => {
    if (!isNonEmptyString(t)) {
      throw new ParseError("tag must be a non-empty string", [...path, i]);
    }
    return t;
  });
}

function parseOptions(raw: unknown): NonNullable<AppInput["options"]> {
  if (!isPlainObject(raw)) {
    throw new ParseError("options must be an object", ["options"]);
  }
  const o = raw as Record<string, unknown>;
  const result: {
    -readonly [K in keyof NonNullable<AppInput["options"]>]: NonNullable<
      AppInput["options"]
    >[K];
  } = {};
  if (o["windowSize"] !== undefined) {
    if (!isFiniteNumber(o["windowSize"]) || o["windowSize"] <= 0) {
      throw new ParseError("options.windowSize must be > 0", [
        "options",
        "windowSize",
      ]);
    }
    result.windowSize = o["windowSize"];
  }
  if (o["topK"] !== undefined) {
    if (!isFiniteNumber(o["topK"]) || o["topK"] < 0) {
      throw new ParseError("options.topK must be >= 0", ["options", "topK"]);
    }
    result.topK = o["topK"];
  }
  if (o["stddevMode"] !== undefined) {
    if (o["stddevMode"] !== "population" && o["stddevMode"] !== "sample") {
      throw new ParseError(
        "options.stddevMode must be 'population' or 'sample'",
        ["options", "stddevMode"]
      );
    }
    result.stddevMode = o["stddevMode"];
  }
  return result;
}
