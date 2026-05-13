/**
 * Top-K selection via min-heap. Deterministic tiebreak by tag name (ascending).
 */

import type { TagCount } from "../types.ts";
import { MinHeap } from "../util/heap.ts";
import { byKey, chain } from "../util/sort.ts";

export function topK(
  counts: ReadonlyMap<string, number>,
  k: number
): TagCount[] {
  if (k <= 0 || counts.size === 0) return [];
  // Min-heap orders smallest at the top so we evict the smallest when full.
  // For equal counts we want to keep alphabetically-earlier tags, so the
  // comparator considers tag desc as a secondary key (smaller-by-name should
  // be considered "larger" so it never gets evicted prematurely).
  const heap = new MinHeap<TagCount>(
    chain<TagCount>(
      byKey((c) => c.count),
      byKey((c) => c.tag, "desc")
    )
  );
  for (const [tag, count] of counts) {
    heap.pushAndMaybePop({ tag, count }, k);
  }
  const top = heap.toSortedArray();
  // toSortedArray emits in min-first order. Reverse for "highest first" and
  // re-sort with a stable comparator so equal counts are ordered by tag asc.
  return top.reverse().sort(
    chain<TagCount>(
      byKey((c) => c.count, "desc"),
      byKey((c) => c.tag, "asc")
    )
  );
}
