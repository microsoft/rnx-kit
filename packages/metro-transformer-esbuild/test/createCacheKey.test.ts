import { equal, notEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { createCacheKey } from "../src/createCacheKey";

describe("createCacheKey", () => {
  it("returns a hex string", () => {
    const key = createCacheKey({});
    ok(/^[0-9a-f]+$/.test(key));
  });

  it("returns a SHA-256 length hex string (64 chars)", () => {
    const key = createCacheKey({});
    equal(key.length, 64);
  });

  it("returns the same key for the same options", () => {
    const key1 = createCacheKey({ handleJs: true });
    const key2 = createCacheKey({ handleJs: true });
    equal(key1, key2);
  });

  it("returns different keys for different options", () => {
    const key1 = createCacheKey({ handleJs: true });
    const key2 = createCacheKey({ handleJs: false });
    notEqual(key1, key2);
  });

  it("returns different keys for different dynamicKey values", () => {
    const key1 = createCacheKey({ dynamicKey: "a" });
    const key2 = createCacheKey({ dynamicKey: "b" });
    notEqual(key1, key2);
  });

  it("returns different keys when handleJsx differs", () => {
    const key1 = createCacheKey({ handleJsx: true });
    const key2 = createCacheKey({ handleJsx: false });
    notEqual(key1, key2);
  });

  it("returns different keys when upstreamDelegates differ", () => {
    const key1 = createCacheKey({
      upstreamDelegates: { "./a": ".json" },
    });
    const key2 = createCacheKey({
      upstreamDelegates: { "./b": ".json" },
    });
    notEqual(key1, key2);
  });
});
