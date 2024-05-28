import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { hasProperty, pickValues } from "../src/properties";

describe("Language > Props > pickValues", () => {
  it("returns undefined when no keys are found", () => {
    equal(pickValues({} as { x?: string }, ["x"]), undefined);
  });

  it("returns undefined when no keys are given", () => {
    equal(pickValues({ x: 123 }, []), undefined);
  });

  it("picks a single value", () => {
    deepEqual(pickValues({ x: 123 }, ["x"]), { x: 123 });
  });

  it("picks a single value from an object with multiple values", () => {
    deepEqual(pickValues({ x: 123, y: "test", z: true }, ["y"]), {
      y: "test",
    });
  });

  it("picks a single value using the given name", () => {
    deepEqual(pickValues({ x: 123, y: "test", z: true }, ["y"], ["picked"]), {
      picked: "test",
    });
  });

  it("picks all keys", () => {
    deepEqual(pickValues({ x: 123, y: "test", z: true }, ["x", "y", "z"]), {
      x: 123,
      y: "test",
      z: true,
    });
  });

  it("picks some keys using different names", () => {
    deepEqual(
      pickValues({ x: 123, y: "test", z: true }, ["x", "z"], ["a", "b-b"]),
      {
        a: 123,
        "b-b": true,
      }
    );
  });

  it("picks some keys", () => {
    deepEqual(
      pickValues(
        { x: 123, y: "test", z: true } as {
          x: number;
          y: string;
          z: boolean;
          foo?: string;
        },
        ["x", "y", "foo"]
      ),
      { x: 123, y: "test" }
    );
  });
});

describe("Language > Props > hasProperty", () => {
  it("returns false for primitives", () => {
    equal(hasProperty("string", "0"), false);
    equal(hasProperty(0, "0"), false);
    equal(hasProperty(true, "0"), false);
    equal(hasProperty(null, "0"), false);
    equal(hasProperty(undefined, "0"), false);
  });

  it("returns true for objects with specified property", () => {
    const testObj = { message: "code", code: 0 };
    equal(hasProperty(testObj, "code"), true);
    equal(hasProperty(testObj, "message"), true);
    equal(hasProperty(testObj, "stack"), false);
  });

  it("returns true for objects with inherited property", () => {
    const testProto = { message: "code", code: 0 };
    const testObj = Object.create(testProto);
    equal(hasProperty(testObj, "code"), true);
    equal(hasProperty(testObj, "message"), true);
    equal(hasProperty(testObj, "stack"), false);
  });
});
