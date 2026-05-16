/**
 * Synchronous iterator helpers.
 *
 * TypeScript generator helpers that exercise ESM module resolution and
 * bundler handling of generator syntax.
 */

export function* chunk<T>(
  source: Iterable<T>,
  size: number
): Generator<T[], void, void> {
  if (size <= 0) {
    throw new RangeError(`chunk: size must be > 0 (got ${size})`);
  }
  let buf: T[] = [];
  for (const item of source) {
    buf.push(item);
    if (buf.length === size) {
      yield buf;
      buf = [];
    }
  }
  if (buf.length > 0) {
    yield buf;
  }
}

export function* take<T>(
  source: Iterable<T>,
  n: number
): Generator<T, void, void> {
  if (n <= 0) {
    return;
  }
  let remaining = n;
  for (const item of source) {
    yield item;
    if (--remaining === 0) {
      return;
    }
  }
}

export function* enumerate<T>(
  source: Iterable<T>,
  start = 0
): Generator<[number, T], void, void> {
  let i = start;
  for (const item of source) {
    yield [i++, item];
  }
}

export function* zip<A, B>(
  a: Iterable<A>,
  b: Iterable<B>
): Generator<[A, B], void, void> {
  const ia = a[Symbol.iterator]();
  const ib = b[Symbol.iterator]();
  while (true) {
    const ra = ia.next();
    const rb = ib.next();
    if (ra.done || rb.done) {
      return;
    }
    yield [ra.value, rb.value];
  }
}

export function* range(
  startOrEnd: number,
  end?: number,
  step = 1
): Generator<number, void, void> {
  const [start, stop] = end === undefined ? [0, startOrEnd] : [startOrEnd, end];
  if (step === 0) {
    throw new RangeError("range: step must be non-zero");
  }
  const ascending = step > 0;
  for (let i = start; ascending ? i < stop : i > stop; i += step) {
    yield i;
  }
}

export function* concat<T>(
  ...sources: Iterable<T>[]
): Generator<T, void, void> {
  for (const source of sources) {
    yield* source;
  }
}

export function toArray<T>(source: Iterable<T>): T[] {
  return Array.from(source);
}
