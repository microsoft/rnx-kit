/**
 * Sliding-window aggregation over time-sorted records.
 *
 * Exercises generator functions (function*) and yield*.
 */

import type { AppRecord, Window } from "../types.ts";

export function* slidingWindows(
  records: readonly AppRecord[],
  size: number
): Generator<readonly AppRecord[], void, void> {
  if (size <= 0) {
    throw new RangeError(`slidingWindows: size must be > 0 (got ${size})`);
  }
  if (records.length === 0) return;
  if (records.length <= size) {
    yield records;
    return;
  }
  for (let i = 0; i + size <= records.length; i++) {
    yield records.slice(i, i + size);
  }
}

export function windowedAverages(
  records: readonly AppRecord[],
  size: number
): Window[] {
  const out: Window[] = [];
  for (const w of slidingWindows(records, size)) {
    if (w.length === 0) continue;
    let sum = 0;
    for (const r of w) sum += r.value;
    out.push({
      start: w[0]!.ts,
      end: w[w.length - 1]!.ts,
      avg: sum / w.length,
    });
  }
  return out;
}
