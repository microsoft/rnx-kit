/**
 * Tag frequency counting. Exercises optional chaining, Map iteration.
 */

import type { AppRecord } from "../types.ts";

export function tagFrequencies(
  records: readonly AppRecord[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of records) {
    const tags = r.tags ?? [];
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

export function uniqueTags(records: readonly AppRecord[]): Set<string> {
  const seen = new Set<string>();
  for (const r of records) {
    for (const tag of r.tags ?? []) {
      seen.add(tag);
    }
  }
  return seen;
}
