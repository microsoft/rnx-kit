import { deepEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { optionalModule, toArray } from "../src/utils";

describe("toArray", () => {
  it("returns empty array for null", () => {
    deepEqual(toArray(null), []);
  });

  it("returns empty array for undefined", () => {
    deepEqual(toArray(undefined), []);
  });

  it("wraps a single value in an array", () => {
    deepEqual(toArray("hello"), ["hello"]);
  });

  it("returns the same array if already an array", () => {
    deepEqual(toArray([1, 2, 3]), [1, 2, 3]);
  });

  it("wraps a single number", () => {
    deepEqual(toArray(42), [42]);
  });

  it("returns empty array as-is", () => {
    deepEqual(toArray([]), []);
  });
});

describe("optionalModule", () => {
  it("returns available=true and get() for an installed module", () => {
    const mod = optionalModule<typeof import("node:path")>("node:path");
    ok(mod.available());
    ok(mod.get() != null);
  });

  it("returns available=false for a non-existent module", () => {
    const mod = optionalModule("@nonexistent/fake-module-xyz");
    ok(!mod.available());
  });

  it("caches the result across calls", () => {
    const mod = optionalModule<typeof import("node:fs")>("node:fs");
    ok(mod.get() === mod.get());
  });
});
