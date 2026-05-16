import { doesNotThrow, equal, notEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { requireSourceModule } from "./helpers.ts";

const { computeCacheKey, getCacheKey } = requireSourceModule<
  typeof import("../src/babelTransformer.ts")
>("../src/babelTransformer.ts");
const { setTransformerPluginOptions } = requireSourceModule<
  typeof import("../src/context.ts")
>("../src/context.ts");

describe("getCacheKey", () => {
  it("does not throw when computed for the first time", () => {
    setTransformerPluginOptions({});
    doesNotThrow(() => getCacheKey());
  });

  it("returns a non-empty hex string", () => {
    setTransformerPluginOptions({});
    const key = getCacheKey();
    ok(typeof key === "string");
    ok(/^[0-9a-f]+$/.test(key), `expected hex string, got: ${key}`);
    ok(key.length > 0, "cache key should be non-empty");
  });

  it("returns a stable value for identical options (cached via lazyInit)", () => {
    setTransformerPluginOptions({ handleTs: true });
    const k1 = getCacheKey();
    setTransformerPluginOptions({ handleTs: true });
    // NOTE: getCacheKey is wrapped in lazyInit, so this asserts the cached
    // value is stable. Options-sensitivity is exercised against the pure
    // helper computeCacheKey below, which sidesteps the lazyInit cache.
    equal(getCacheKey(), k1);
  });
});

describe("computeCacheKey (pure helper)", () => {
  it("produces the same digest for identical options", () => {
    const a = computeCacheKey({ handleTs: true, handleJsx: false });
    const b = computeCacheKey({ handleTs: true, handleJsx: false });
    equal(a, b);
  });

  it("changes when options change", () => {
    const a = computeCacheKey({ handleTs: true });
    const b = computeCacheKey({ handleTs: false });
    notEqual(a, b);
  });

  it("changes when a different option is toggled", () => {
    const a = computeCacheKey({ handleJsx: true });
    const b = computeCacheKey({ handleJsx: false });
    notEqual(a, b);
  });

  it("returns a hex digest", () => {
    const key = computeCacheKey({});
    ok(/^[0-9a-f]+$/.test(key));
    ok(key.length === 64, `expected sha256 hex (64 chars), got ${key.length}`);
  });
});
