import { hasProperty, pickValues } from "../src/properties";

describe("Language > Props > pickValues", () => {
  test("returns undefined when no keys are found", () => {
    expect(pickValues({} as { x?: string }, ["x"])).toBeUndefined();
  });

  test("returns undefined when no keys are given", () => {
    expect(pickValues({ x: 123 }, [])).toBeUndefined();
  });

  test("picks a single value", () => {
    expect(pickValues({ x: 123 }, ["x"])).toEqual({ x: 123 });
  });

  test("picks a single value from an object with multiple values", () => {
    expect(pickValues({ x: 123, y: "test", z: true }, ["y"])).toEqual({
      y: "test",
    });
  });

  test("picks a single value using the given name", () => {
    expect(
      pickValues({ x: 123, y: "test", z: true }, ["y"], ["picked"])
    ).toEqual({ picked: "test" });
  });

  test("picks all keys", () => {
    expect(pickValues({ x: 123, y: "test", z: true }, ["x", "y", "z"])).toEqual(
      {
        x: 123,
        y: "test",
        z: true,
      }
    );
  });

  test("picks some keys using different names", () => {
    expect(
      pickValues({ x: 123, y: "test", z: true }, ["x", "z"], ["a", "b-b"])
    ).toEqual({
      a: 123,
      "b-b": true,
    });
  });

  test("picks some keys", () => {
    expect(
      pickValues(
        { x: 123, y: "test", z: true } as {
          x: number;
          y: string;
          z: boolean;
          foo?: string;
        },
        ["x", "y", "foo"]
      )
    ).toEqual({ x: 123, y: "test" });
  });
});

describe("Language > Props > hasProperty", () => {
  test("returns false for primitives", () => {
    expect(hasProperty("string", "0")).toBe(false);
    expect(hasProperty(0, "0")).toBe(false);
    expect(hasProperty(true, "0")).toBe(false);
    expect(hasProperty(null, "0")).toBe(false);
    expect(hasProperty(undefined, "0")).toBe(false);
  });

  test("returns true for objects with specified property", () => {
    const testObj = { message: "code", code: 0 };
    expect(hasProperty(testObj, "code")).toBe(true);
    expect(hasProperty(testObj, "message")).toBe(true);
    expect(hasProperty(testObj, "stack")).toBe(false);
  });

  test("returns true for objects with inherited property", () => {
    const testProto = { message: "code", code: 0 };
    const testObj = Object.create(testProto);
    expect(hasProperty(testObj, "code")).toBe(true);
    expect(hasProperty(testObj, "message")).toBe(true);
    expect(hasProperty(testObj, "stack")).toBe(false);
  });
});
