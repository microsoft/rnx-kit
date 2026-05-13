/**
 * Pure statistical math. No I/O, no async — feeds deterministic numbers.
 */

import type { StddevMode, Summary } from "../types.ts";
import { stableSort } from "../util/sort.ts";

export function computeSummary(
  values: readonly number[],
  mode: StddevMode = "population"
): Summary {
  const count = values.length;
  if (count === 0) {
    return { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0, stddev: 0 };
  }
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const mean = sum / count;
  const median = computeMedian(values);
  const stddev = computeStddev(values, mean, mode);
  return { count, sum, mean, median, min, max, stddev };
}

export function computeMedian(values: readonly number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const sorted = stableSort(values, (a, b) => a - b);
  const mid = n >>> 1;
  return n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function computeStddev(
  values: readonly number[],
  mean: number,
  mode: StddevMode
): number {
  const n = values.length;
  if (n === 0) return 0;
  if (mode === "sample" && n < 2) return 0;
  let sumSquares = 0;
  for (const v of values) {
    const diff = v - mean;
    sumSquares += diff * diff;
  }
  const denom = mode === "population" ? n : n - 1;
  return Math.sqrt(sumSquares / denom);
}

export function computePercentile(
  values: readonly number[],
  p: number
): number {
  if (values.length === 0) return 0;
  if (p <= 0) return Math.min(...values);
  if (p >= 100) return Math.max(...values);
  const sorted = stableSort(values, (a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo]!;
  const frac = rank - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}
