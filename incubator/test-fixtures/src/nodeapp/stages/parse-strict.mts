/**
 * Strict parsing — refuses unknown fields, requires explicit options.
 *
 * Same module-system topology as `parse.mts` but with tighter rules. Exposed
 * as a separate API surface; not part of the default pipeline.
 */

import { ParseError, ValidationError } from "../errors.cjs";
import type { AppInput, AppRecord } from "../types.ts";
import {
  isFiniteNumber,
  isNonEmptyString,
  isPlainObject,
} from "../util/validate.ts";

const ALLOWED_RECORD_KEYS = new Set(["id", "group", "value", "ts", "tags"]);
const ALLOWED_OPTION_KEYS = new Set(["windowSize", "topK", "stddevMode"]);

export function parseStrict(input: unknown): AppInput {
  if (!isPlainObject(input)) {
    throw new ParseError("input must be an object");
  }
  const inputKeys = Object.keys(input);
  for (const key of inputKeys) {
    if (key !== "records" && key !== "options") {
      throw new ValidationError(`input.${key}`, "unexpected key");
    }
  }
  const records = (input as { records?: unknown }).records;
  if (!Array.isArray(records)) {
    throw new ParseError("input.records must be an array");
  }
  const ids = new Set<string>();
  const parsedRecords: AppRecord[] = records.map((r, i) => {
    const rec = parseRecordStrict(r, i);
    if (ids.has(rec.id)) {
      throw new ValidationError(`records[${i}].id`, `duplicate id "${rec.id}"`);
    }
    ids.add(rec.id);
    return rec;
  });
  const options = (input as { options?: unknown }).options;
  if (options === undefined) {
    return { records: parsedRecords };
  }
  return { records: parsedRecords, options: parseOptionsStrict(options) };
}

function parseRecordStrict(raw: unknown, index: number): AppRecord {
  if (!isPlainObject(raw)) {
    throw new ParseError("record must be an object", ["records", index]);
  }
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_RECORD_KEYS.has(key)) {
      throw new ValidationError(`records[${index}].${key}`, "unexpected key");
    }
  }
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r["id"])) {
    throw new ValidationError(
      `records[${index}].id`,
      "required, non-empty string"
    );
  }
  if (!isNonEmptyString(r["group"])) {
    throw new ValidationError(
      `records[${index}].group`,
      "required, non-empty string"
    );
  }
  if (!isFiniteNumber(r["value"])) {
    throw new ValidationError(
      `records[${index}].value`,
      "required, finite number"
    );
  }
  if (!isFiniteNumber(r["ts"])) {
    throw new ValidationError(
      `records[${index}].ts`,
      "required, finite number"
    );
  }
  let tags: readonly string[] | undefined;
  if (r["tags"] !== undefined) {
    if (!Array.isArray(r["tags"])) {
      throw new ValidationError(`records[${index}].tags`, "must be an array");
    }
    tags = r["tags"].map((t, ti) => {
      if (!isNonEmptyString(t)) {
        throw new ValidationError(
          `records[${index}].tags[${ti}]`,
          "non-empty string"
        );
      }
      return t;
    });
  }
  return tags === undefined
    ? { id: r["id"], group: r["group"], value: r["value"], ts: r["ts"] }
    : { id: r["id"], group: r["group"], value: r["value"], ts: r["ts"], tags };
}

function parseOptionsStrict(raw: unknown): NonNullable<AppInput["options"]> {
  if (!isPlainObject(raw)) {
    throw new ParseError("options must be an object", ["options"]);
  }
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_OPTION_KEYS.has(key)) {
      throw new ValidationError(`options.${key}`, "unexpected key");
    }
  }
  const o = raw as Record<string, unknown>;
  const out: {
    windowSize?: number;
    topK?: number;
    stddevMode?: "population" | "sample";
  } = {};
  if (o["windowSize"] !== undefined) {
    if (!isFiniteNumber(o["windowSize"]) || o["windowSize"] <= 0) {
      throw new ValidationError("options.windowSize", "must be > 0");
    }
    out.windowSize = o["windowSize"];
  }
  if (o["topK"] !== undefined) {
    if (!isFiniteNumber(o["topK"]) || o["topK"] < 0) {
      throw new ValidationError("options.topK", "must be >= 0");
    }
    out.topK = o["topK"];
  }
  if (o["stddevMode"] !== undefined) {
    if (o["stddevMode"] !== "population" && o["stddevMode"] !== "sample") {
      throw new ValidationError(
        "options.stddevMode",
        "must be 'population' or 'sample'"
      );
    }
    out.stddevMode = o["stddevMode"];
  }
  return out;
}
