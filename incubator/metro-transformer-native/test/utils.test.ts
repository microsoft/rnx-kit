import { deepEqual, equal, ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  getTransformerPluginOptions,
  isPromiseLike,
  lazyInit,
  setTransformerPluginOptions,
  toArray,
} from "../src/utils";

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
    const arr = [1, 2, 3];
    deepEqual(toArray(arr), [1, 2, 3]);
  });

  it("wraps a single number", () => {
    deepEqual(toArray(42), [42]);
  });

  it("returns empty array as-is", () => {
    deepEqual(toArray([]), []);
  });
});
