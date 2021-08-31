import "jest-extended";
import {
  extendObject,
  extendObjectArray,
  hasProperty,
  pickValue,
  pickValues,
} from "../src/properties";

type BaseType = { base: string };
type ExtendedType = BaseType & { extended?: number };

const baseObj: BaseType = { base: "base object" };
const baseObj2: BaseType = { base: "another base object" };
const extendedProps: Omit<ExtendedType, keyof BaseType> = { extended: 12345 };

describe("Language > Props > pickValue", () => {
  test("returns undefined when the key is not found", () => {
    expect(pickValue({} as { x?: string }, "x")).toBeUndefined();
  });

  test("returns undefined when the key's value is undefined", () => {
    expect(pickValue({ x: undefined }, "x")).toBeUndefined();
  });

  test("returns the key's value", () => {
    expect(pickValue({ x: 123 }, "x")).toEqual({ x: 123 });
  });

  test("returns the key's value using the given name", () => {
    expect(pickValue({ x: 123 }, "x", "y")).toEqual({ y: 123 });
  });

  test("returns the key's value when it is false", () => {
    expect(pickValue({ x: false }, "x")).toEqual({ x: false });
  });

  test("returns the key's value when it is 0", () => {
    expect(pickValue({ x: 0 }, "x", "y")).toEqual({ y: 0 });
  });

  test("returns the key's value when it is null", () => {
    expect(pickValue({ x: null }, "x")).toEqual({ x: null });
  });

  test("returns the key's value when it is an empty string", () => {
    expect(pickValue({ x: "" }, "x", "y")).toEqual({ y: "" });
  });
});

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

describe("Language > Props > extendObject", () => {
  test("adds the extended props", () => {
    const copy = { ...baseObj };
    expect(extendObject<BaseType, ExtendedType>(copy, extendedProps)).toEqual({
      ...baseObj,
      ...extendedProps,
    });
  });

  test("returns the original object reference", () => {
    const copy = { ...baseObj };
    expect(extendObject<BaseType, ExtendedType>(copy, extendedProps)).toBe(
      copy
    );
  });

  test("makes no changes when extended props are optional and are not given", () => {
    const copy = { ...baseObj };
    expect(extendObject<BaseType, ExtendedType>(copy, {})).toEqual(baseObj);
  });
});

describe("Language > Props > extendObjectArray", () => {
  test("adds the extended props to each object in the 1-element array", () => {
    const copy = [{ ...baseObj }];
    const extended = extendObjectArray<BaseType, ExtendedType>(
      copy,
      extendedProps
    );
    expect(extended).toBeArrayOfSize(1);
    expect(extended).toEqual([
      {
        ...baseObj,
        ...extendedProps,
      },
    ]);
  });

  test("adds the extended props to each object in the 2-element array", () => {
    const copy = [{ ...baseObj }, { ...baseObj2 }];
    const extended = extendObjectArray<BaseType, ExtendedType>(
      copy,
      extendedProps
    );
    expect(extended).toBeArrayOfSize(2);
    expect(extended).toEqual([
      {
        ...baseObj,
        ...extendedProps,
      },
      {
        ...baseObj2,
        ...extendedProps,
      },
    ]);
  });

  test("returns the original object array reference", () => {
    const copy = [{ ...baseObj }, { ...baseObj2 }];
    const extended = extendObjectArray<BaseType, ExtendedType>(
      copy,
      extendedProps
    );
    expect(extended).toBe(copy);
  });

  test("makes no changes when extended props are optional and are not given", () => {
    const copy = [{ ...baseObj }, { ...baseObj2 }];
    const extended = extendObjectArray<BaseType, ExtendedType>(copy, {});
    expect(extended).toBeArrayOfSize(2);
    expect(extended).toEqual([baseObj, baseObj2]);
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
