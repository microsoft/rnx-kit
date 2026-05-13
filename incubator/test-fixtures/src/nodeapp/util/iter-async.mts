/**
 * Asynchronous iterator helpers.
 *
 * Authored as `.mts` so it emits as `.mjs`. Exercises `async function*` and
 * `for await…of` — common downlevel targets.
 */

export async function* asyncMap<T, U>(
  source: AsyncIterable<T> | Iterable<T>,
  fn: (item: T, index: number) => U | Promise<U>
): AsyncGenerator<U, void, void> {
  let i = 0;
  for await (const item of source) {
    yield await fn(item, i++);
  }
}

export async function* asyncChunk<T>(
  source: AsyncIterable<T> | Iterable<T>,
  size: number
): AsyncGenerator<T[], void, void> {
  if (size <= 0) {
    throw new RangeError(`asyncChunk: size must be > 0 (got ${size})`);
  }
  let buf: T[] = [];
  for await (const item of source) {
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

export async function* asyncFilter<T>(
  source: AsyncIterable<T> | Iterable<T>,
  predicate: (item: T) => boolean | Promise<boolean>
): AsyncGenerator<T, void, void> {
  for await (const item of source) {
    if (await predicate(item)) {
      yield item;
    }
  }
}

export async function collect<T>(
  source: AsyncIterable<T> | Iterable<T>
): Promise<T[]> {
  const out: T[] = [];
  for await (const item of source) {
    out.push(item);
  }
  return out;
}

export async function* fromArray<T>(
  items: readonly T[]
): AsyncGenerator<T, void, void> {
  for (const item of items) {
    yield item;
  }
}
