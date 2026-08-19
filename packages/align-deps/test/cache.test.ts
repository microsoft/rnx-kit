import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { BoundedCache } from "../src/cache.ts";

describe("BoundedCache", () => {
  it("stores and retrieves values", () => {
    const cache = new BoundedCache<string, number>(2);
    cache.set("a", 1);

    equal(cache.has("a"), true);
    equal(cache.get("a"), 1);
    equal(cache.has("b"), false);
    equal(cache.get("b"), undefined);
  });

  it("evicts the least recently used entry once max size is exceeded", () => {
    const cache = new BoundedCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);

    equal(cache.get("a"), 1);
    equal(cache.get("b"), 2);

    cache.set("c", 3);

    // "a" was the least recently used entry when "c" was inserted, so it
    // should have been evicted.
    equal(cache.has("a"), false);
    equal(cache.get("b"), 2);
    equal(cache.get("c"), 3);
  });

  it("treats reads as usage", () => {
    const cache = new BoundedCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);

    // Accessing "a" makes it the most-recently used entry.
    equal(cache.get("a"), 1);

    cache.set("c", 3);

    // "b" was the least recently used entry, so it should have been evicted
    // instead of "a".
    equal(cache.has("b"), false);
    equal(cache.get("a"), 1);
    equal(cache.get("c"), 3);
  });
});
