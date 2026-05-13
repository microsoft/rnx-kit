// Mix of ES2020+ syntax that varies in support across JSC vintages.
export function demo(a: { b?: { c: number } } | null, fallback: number) {
  const value = a?.b?.c ?? fallback;
  let acc = 0;
  acc ??= 1;
  acc ||= 2;
  return value + acc;
}

export class Counter {
  #count = 0;
  inc() {
    this.#count++;
    return this.#count;
  }
}
