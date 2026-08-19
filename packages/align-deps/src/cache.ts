const MAX_CACHE_ENTRIES = 10_000;

export class BoundedCache<K, V> {
  private map: Map<K, V>;
  private maxEntries: number;

  constructor(maxEntries = MAX_CACHE_ENTRIES) {
    this.map = new Map<K, V>();
    this.maxEntries = maxEntries;
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.update(key, value);
    }
    return value;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  set(key: K, value: V): void {
    this.update(key, value);
    if (this.map.size > this.maxEntries) {
      const lruKey = this.leastRecentlyUsed();
      if (lruKey !== undefined) {
        this.map.delete(lruKey);
      }
    }
  }

  private leastRecentlyUsed(): K | undefined {
    // Least recently used items bubble towards the front
    return this.map.keys().next().value;
  }

  private update(key: K, value: V): void {
    // By deleting and re-inserting the value, we ensure the entry remains at
    // the end and treated as most recently used
    this.map.delete(key);
    this.map.set(key, value);
  }
}
