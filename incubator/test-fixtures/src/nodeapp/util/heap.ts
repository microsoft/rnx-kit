/**
 * Binary min-heap. Exercises private fields, accessor pairs, and
 * `Symbol.iterator` — features commonly downleveled by bundlers.
 */

export type Comparator<T> = (a: T, b: T) => number;

export class MinHeap<T> {
  #items: T[];
  #compare: Comparator<T>;

  constructor(compare: Comparator<T>, initial?: Iterable<T>) {
    this.#items = [];
    this.#compare = compare;
    if (initial) {
      for (const item of initial) {
        this.push(item);
      }
    }
  }

  get size(): number {
    return this.#items.length;
  }

  get isEmpty(): boolean {
    return this.#items.length === 0;
  }

  peek(): T | undefined {
    return this.#items[0];
  }

  push(item: T): void {
    this.#items.push(item);
    this.#bubbleUp(this.#items.length - 1);
  }

  pop(): T | undefined {
    const items = this.#items;
    if (items.length === 0) {
      return undefined;
    }
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      this.#sinkDown(0);
    }
    return top;
  }

  pushAndMaybePop(item: T, maxSize: number): T | undefined {
    if (this.#items.length < maxSize) {
      this.push(item);
      return undefined;
    }
    const top = this.#items[0];
    if (top !== undefined && this.#compare(item, top) <= 0) {
      return item;
    }
    this.push(item);
    return this.pop();
  }

  toSortedArray(): T[] {
    const out: T[] = [];
    const clone = new MinHeap<T>(this.#compare);
    clone.#items = this.#items.slice();
    while (!clone.isEmpty) {
      out.push(clone.pop()!);
    }
    return out;
  }

  *[Symbol.iterator](): Generator<T, void, void> {
    for (const item of this.#items) {
      yield item;
    }
  }

  #bubbleUp(start: number): void {
    const items = this.#items;
    const compare = this.#compare;
    let i = start;
    while (i > 0) {
      const parent = (i - 1) >>> 1;
      if (compare(items[i]!, items[parent]!) < 0) {
        [items[i], items[parent]] = [items[parent]!, items[i]!];
        i = parent;
      } else {
        return;
      }
    }
  }

  #sinkDown(start: number): void {
    const items = this.#items;
    const compare = this.#compare;
    const length = items.length;
    let i = start;
    while (true) {
      const left = i * 2 + 1;
      const right = left + 1;
      let smallest = i;
      if (left < length && compare(items[left]!, items[smallest]!) < 0) {
        smallest = left;
      }
      if (right < length && compare(items[right]!, items[smallest]!) < 0) {
        smallest = right;
      }
      if (smallest === i) {
        return;
      }
      [items[i], items[smallest]] = [items[smallest]!, items[i]!];
      i = smallest;
    }
  }
}
