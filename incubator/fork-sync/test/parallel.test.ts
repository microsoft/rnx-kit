// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Tests for modules/parallel.ts module.
 *
 * Run with: node --test scripts/tests/parallel.test.ts
 */

import assert from "node:assert";
import { test } from "node:test";

import * as parallel from "../src/modules/parallel.ts";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to collect all items from an async generator
async function collect<T>(gen: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) {
    results.push(item);
  }
  return results;
}

// =============================================================================
// parallel.map - Basic functionality
// =============================================================================

test("map processes all items", async () => {
  const results = await collect(
    parallel.map([1, 2, 3, 4], async (x) => x * 2, { concurrency: 2 })
  );

  assert.strictEqual(results.length, 4);
  assert.deepStrictEqual(
    results.sort((a, b) => a - b),
    [2, 4, 6, 8]
  );
});

test("map handles empty input", async () => {
  const results = await collect(parallel.map([], async (x: number) => x * 2));

  assert.deepStrictEqual(results, []);
});

test("map works with async iterables", async () => {
  async function* asyncInput() {
    yield 1;
    await delay(5);
    yield 2;
    await delay(5);
    yield 3;
  }

  const results = await collect(
    parallel.map(asyncInput(), async (x) => x * 10, { concurrency: 2 })
  );

  assert.strictEqual(results.length, 3);
  assert.deepStrictEqual(
    results.sort((a, b) => a - b),
    [10, 20, 30]
  );
});

// =============================================================================
// parallel.map - Concurrency control
// =============================================================================

test("map respects concurrency limit", async () => {
  let currentActive = 0;
  let maxActive = 0;

  await collect(
    parallel.map(
      [1, 2, 3, 4, 5, 6],
      async (x) => {
        currentActive++;
        maxActive = Math.max(maxActive, currentActive);
        await delay(20);
        currentActive--;
        return x;
      },
      { concurrency: 2 }
    )
  );

  assert.ok(maxActive <= 2, `concurrency exceeded: maxActive=${maxActive}`);
});

test("map uses default concurrency of 8", async () => {
  let currentActive = 0;
  let maxActive = 0;

  await collect(
    parallel.map(
      Array.from({ length: 20 }, (_, i) => i),
      async (x) => {
        currentActive++;
        maxActive = Math.max(maxActive, currentActive);
        await delay(10);
        currentActive--;
        return x;
      }
    )
  );

  assert.ok(
    maxActive <= 8,
    `default concurrency exceeded: maxActive=${maxActive}`
  );
  assert.ok(maxActive >= 4, `concurrency too low: maxActive=${maxActive}`);
});

// =============================================================================
// parallel.map - Error handling
// =============================================================================

test("map propagates errors immediately", async () => {
  const gen = parallel.map([1, 2, 3], async (x) => {
    if (x === 2) throw new Error("boom");
    return x;
  });

  await assert.rejects(async () => await collect(gen), /boom/);
});

// =============================================================================
// parallel.map - AbortSignal support
// =============================================================================

test("map throws AbortError when signal is pre-aborted", async () => {
  const controller = new AbortController();
  controller.abort();

  const gen = parallel.map([1, 2, 3], async (x) => x, {
    signal: controller.signal,
  });

  await assert.rejects(
    async () => await collect(gen),
    (err: Error) => err.name === "AbortError"
  );
});

test("map stops on abort signal", async () => {
  const controller = new AbortController();
  const processed: number[] = [];

  const gen = parallel.map(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    async (x) => {
      await delay(20);
      processed.push(x);
      return x;
    },
    { concurrency: 2, signal: controller.signal }
  );

  // Abort after a short delay
  setTimeout(() => controller.abort(), 30);

  await assert.rejects(
    async () => await collect(gen),
    (err: Error) => err.name === "AbortError"
  );

  // Should have processed some but not all items
  assert.ok(processed.length < 10, `processed too many: ${processed.length}`);
  assert.ok(processed.length > 0, "should have processed some items");
});

test("map allows in-flight operations to complete after abort", async () => {
  const controller = new AbortController();
  let completedCount = 0;

  const gen = parallel.map(
    [1, 2, 3, 4],
    async (x) => {
      await delay(30);
      completedCount++;
      return x;
    },
    { concurrency: 2, signal: controller.signal }
  );

  // Abort quickly - some operations may be in flight
  setTimeout(() => controller.abort(), 10);

  try {
    await collect(gen);
  } catch {
    // Expected to throw AbortError
  }

  // Wait a bit for in-flight to complete
  await delay(50);

  // In-flight operations should have completed
  assert.ok(completedCount >= 1, "at least one in-flight should complete");
});

// =============================================================================
// parallel.flatMap - Basic functionality
// =============================================================================

test("flatMap flattens nested iterables", async () => {
  const results = await collect(
    parallel.flatMap(
      [1, 2, 3],
      async function* (x) {
        yield x;
        yield x * 10;
      },
      { concurrency: 2 }
    )
  );

  assert.strictEqual(results.length, 6);
  const sorted = results.sort((a, b) => a - b);
  assert.deepStrictEqual(sorted, [1, 2, 3, 10, 20, 30]);
});

test("flatMap handles empty input", async () => {
  const results = await collect(
    parallel.flatMap([], async function* (_x: number) {
      yield 1;
    })
  );

  assert.deepStrictEqual(results, []);
});

test("flatMap handles sub-iterables that yield nothing", async () => {
  const results = await collect(
    parallel.flatMap(
      [1, 2, 3],
      async function* (_x) {
        // yields nothing
      },
      { concurrency: 2 }
    )
  );

  assert.deepStrictEqual(results, []);
});

test("flatMap works with sync sub-iterables", async () => {
  const results = await collect(
    parallel.flatMap(
      ["ab", "cd"],
      async (str) => str.split(""), // Returns sync iterable (array)
      { concurrency: 2 }
    )
  );

  assert.strictEqual(results.length, 4);
  assert.deepStrictEqual(results.sort(), ["a", "b", "c", "d"]);
});

// =============================================================================
// parallel.flatMap - Concurrency control
// =============================================================================

test("flatMap respects concurrency limit", async () => {
  let currentActive = 0;
  let maxActive = 0;

  await collect(
    parallel.flatMap(
      [1, 2, 3, 4, 5, 6],
      async function* (x) {
        currentActive++;
        maxActive = Math.max(maxActive, currentActive);
        await delay(20);
        yield x;
        currentActive--;
      },
      { concurrency: 2 }
    )
  );

  assert.ok(maxActive <= 2, `concurrency exceeded: maxActive=${maxActive}`);
});

// =============================================================================
// parallel.flatMap - AbortSignal support
// =============================================================================

test("flatMap throws AbortError when signal is pre-aborted", async () => {
  const controller = new AbortController();
  controller.abort();

  const gen = parallel.flatMap(
    [1, 2, 3],
    async function* (x) {
      yield x;
    },
    { signal: controller.signal }
  );

  await assert.rejects(
    async () => await collect(gen),
    (err: Error) => err.name === "AbortError"
  );
});

test("flatMap stops on abort signal", async () => {
  const controller = new AbortController();
  const processed: number[] = [];

  const gen = parallel.flatMap(
    [1, 2, 3, 4, 5],
    async function* (x) {
      await delay(30);
      processed.push(x);
      yield x;
    },
    { concurrency: 2, signal: controller.signal }
  );

  // Abort after a short delay
  setTimeout(() => controller.abort(), 40);

  await assert.rejects(
    async () => await collect(gen),
    (err: Error) => err.name === "AbortError"
  );

  // Should have processed some but not all items
  assert.ok(processed.length < 5, `processed too many: ${processed.length}`);
});

// =============================================================================
// parallel.flatMap - Error handling
// =============================================================================

test("flatMap propagates errors from sub-iterables", async () => {
  const gen = parallel.flatMap(
    [1, 2, 3],
    async function* (x) {
      if (x === 2) throw new Error("sub-boom");
      yield x;
    },
    { concurrency: 2 }
  );

  await assert.rejects(async () => await collect(gen), /sub-boom/);
});

// =============================================================================
// parallel.filter - Basic functionality
// =============================================================================

test("filter keeps items matching predicate", async () => {
  const results = await collect(
    parallel.filter([1, 2, 3, 4, 5], (x) => x % 2 === 0)
  );

  assert.deepStrictEqual(results, [2, 4]);
});

test("filter handles empty input", async () => {
  const results = await collect(parallel.filter([], (x: number) => x > 0));

  assert.deepStrictEqual(results, []);
});

test("filter handles no matches", async () => {
  const results = await collect(parallel.filter([1, 2, 3], (x) => x > 10));

  assert.deepStrictEqual(results, []);
});

test("filter handles all matches", async () => {
  const results = await collect(parallel.filter([1, 2, 3], (x) => x > 0));

  assert.deepStrictEqual(results, [1, 2, 3]);
});

test("filter works with async iterables", async () => {
  async function* asyncInput() {
    yield 1;
    yield 2;
    yield 3;
    yield 4;
  }

  const results = await collect(
    parallel.filter(asyncInput(), (x) => x % 2 === 1)
  );

  assert.deepStrictEqual(results, [1, 3]);
});

test("filter with type predicate narrows type", async () => {
  const input: (string | null)[] = ["a", null, "b", null, "c"];

  const results = await collect(
    parallel.filter(input, (x): x is string => x !== null)
  );

  // TypeScript knows results is string[], not (string | null)[]
  assert.deepStrictEqual(results, ["a", "b", "c"]);
});

test("filter can chain with map", async () => {
  const mapped = parallel.map(
    [1, 2, 3, 4],
    async (x) => (x % 2 === 0 ? x * 10 : null),
    {
      concurrency: 2,
    }
  );
  const filtered = parallel.filter(mapped, (x): x is number => x !== null);
  const results = await collect(filtered);

  assert.deepStrictEqual(
    results.sort((a, b) => a - b),
    [20, 40]
  );
});
