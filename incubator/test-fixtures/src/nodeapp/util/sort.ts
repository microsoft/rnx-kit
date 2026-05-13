/**
 * Stable sort + comparator builders. Exercises higher-order functions,
 * spread/rest, and default parameters.
 */

import type { Comparator } from "./heap.ts";

export type SortDirection = "asc" | "desc";

export function stableSort<T>(
  items: readonly T[],
  compare: Comparator<T>
): T[] {
  const indexed = items.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => {
    const c = compare(a.value, b.value);
    return c !== 0 ? c : a.index - b.index;
  });
  return indexed.map(({ value }) => value);
}

export function byKey<T, K extends number | string>(
  keyFn: (item: T) => K,
  direction: SortDirection = "asc"
): Comparator<T> {
  const sign = direction === "asc" ? 1 : -1;
  return (a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    if (ka < kb) return -sign;
    if (ka > kb) return sign;
    return 0;
  };
}

export function chain<T>(
  ...comparators: readonly Comparator<T>[]
): Comparator<T> {
  return (a, b) => {
    for (const c of comparators) {
      const r = c(a, b);
      if (r !== 0) return r;
    }
    return 0;
  };
}

export function reverse<T>(compare: Comparator<T>): Comparator<T> {
  return (a, b) => -compare(a, b);
}
