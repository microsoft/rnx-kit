import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { compareValues } from "../src/compare.ts";

describe("compareValues", () => {
  it("compares primitives by value", () => {
    equal(compareValues(1, 1), true);
    equal(compareValues("a", "a"), true);
    equal(compareValues(null, null), true);
    equal(compareValues(true, true), true);
    equal(compareValues(true, false), false);
    equal(compareValues(1, "1"), false);
    equal(compareValues(null, undefined), false);
  });

  it("returns false when mixing object and primitive", () => {
    equal(compareValues({}, null), false);
    equal(compareValues([], null), false);
    equal(compareValues({}, []), false);
    equal(compareValues({ a: 1 }, "a"), false);
  });

  it("compares arrays elementwise", () => {
    equal(compareValues([1, 2, 3], [1, 2, 3]), true);
    equal(compareValues([], []), true);
    equal(compareValues([1, 2], [1, 2, 3]), false);
    equal(compareValues([1, 2, 3], [3, 2, 1]), false);
    equal(compareValues([{ a: 1 }], [{ a: 1 }]), true);
  });

  it("compares objects with key order significance", () => {
    equal(compareValues({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
    equal(compareValues({ a: 1, b: 2 }, { b: 2, a: 1 }), false);
    equal(compareValues({ a: 1 }, { a: 1, b: 2 }), false);
    equal(compareValues({ a: 1, b: 2 }, { a: 1 }), false);
  });

  it("recurses into nested structures", () => {
    equal(compareValues({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), true);
    equal(compareValues({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] }), false);
    equal(compareValues({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } }), true);
  });

  it("treats identical references as equal", () => {
    const obj = { a: 1 };
    equal(compareValues(obj, obj), true);
  });
});
