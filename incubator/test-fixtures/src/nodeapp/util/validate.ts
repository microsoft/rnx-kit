/**
 * Runtime type guards. Exercises type predicates and narrowing.
 */

import type { AppRecord } from "../types.ts";

export function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.length > 0;
}

export function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}

export function isRecord(x: unknown): x is AppRecord {
  if (!isPlainObject(x)) return false;
  const r = x as Record<string, unknown>;
  if (!isNonEmptyString(r["id"])) return false;
  if (!isNonEmptyString(r["group"])) return false;
  if (!isFiniteNumber(r["value"])) return false;
  if (!isFiniteNumber(r["ts"])) return false;
  if (r["tags"] !== undefined && !isStringArray(r["tags"])) return false;
  return true;
}

export function assertNever(value: never, hint = "unreachable"): never {
  throw new Error(`${hint}: ${String(value)}`);
}
