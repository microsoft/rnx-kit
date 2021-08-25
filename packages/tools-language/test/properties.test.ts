import "jest-extended";
import {
  pickValue,
  pickValues,
  extendObject,
  extendObjectArray,
} from "../src/properties";

describe("Language > Props", () => {
  test("pickValue returns undefined when the key is not found", () => {
    expect(pickValue({} as { x?: string }, "x")).toBeUndefined();
  });

  test("pickValue returns undefined when the key's value is undefined", () => {
    expect(pickValue({ x: undefined }, "x")).toBeUndefined();
  });

  test("pickValue returns the key's value", () => {
    expect(pickValue({ x: 123 }, "x")).toEqual({ x: 123 });
  });

  test("pickValue returns the key's value using the given name", () => {
    expect(pickValue({ x: 123 }, "x", "y")).toEqual({ y: 123 });
  });

  test("pickValue returns the key's value when it is false", () => {
    expect(pickValue({ x: false }, "x")).toEqual({ x: false });
  });

  test("pickValue returns the key's value when it is 0", () => {
    expect(pickValue({ x: 0 }, "x", "y")).toEqual({ y: 0 });
  });

  test("pickValue returns the key's value when it is null", () => {
    expect(pickValue({ x: null }, "x")).toEqual({ x: null });
  });

  test("pickValue returns the key's value when it is an empty string", () => {
    expect(pickValue({ x: "" }, "x", "y")).toEqual({ y: "" });
  });

  test("pickValues returns undefined when no keys are found", () => {
    expect(pickValues({} as { x?: string }, ["x"])).toBeUndefined();
  });

  test("pickValues returns undefined when no keys are given", () => {
    expect(pickValues({ x: 123 }, [])).toBeUndefined();
  });

  test("pickValues picks a single value", () => {
    expect(pickValues({ x: 123 }, ["x"])).toEqual({ x: 123 });
  });

  test("pickValues picks a single value from an object with multiple values", () => {
    expect(pickValues({ x: 123, y: "test", z: true }, ["y"])).toEqual({
      y: "test",
    });
  });

  test("pickValues picks a single value using the given name", () => {
    expect(
      pickValues({ x: 123, y: "test", z: true }, ["y"], ["picked"])
    ).toEqual({ picked: "test" });
  });

  test("pickValues picks all keys", () => {
    expect(pickValues({ x: 123, y: "test", z: true }, ["x", "y", "z"])).toEqual(
      {
        x: 123,
        y: "test",
        z: true,
      }
    );
  });

  test("pickValues picks some keys using different names", () => {
    expect(
      pickValues({ x: 123, y: "test", z: true }, ["x", "z"], ["a", "b-b"])
    ).toEqual({
      a: 123,
      "b-b": true,
    });
  });

  test("pickValues picks some keys", () => {
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

  type BaseType = { base: string };
  type ExtendedType = BaseType & { extended?: number };

  const baseObj: BaseType = { base: "base object" };
  const baseObj2: BaseType = { base: "another base object" };
  const extendedProps: Omit<ExtendedType, keyof BaseType> = { extended: 12345 };

  test("extendObject adds the extended props", () => {
    const copy = { ...baseObj };
    expect(extendObject<BaseType, ExtendedType>(copy, extendedProps)).toEqual({
      ...baseObj,
      ...extendedProps,
    });
  });

  test("extendObject returns the original object reference", () => {
    const copy = { ...baseObj };
    expect(extendObject<BaseType, ExtendedType>(copy, extendedProps)).toBe(
      copy
    );
  });

  test("extendObject makes no changes when extended props are optional and are not given", () => {
    const copy = { ...baseObj };
    expect(extendObject<BaseType, ExtendedType>(copy, {})).toEqual(baseObj);
  });

  test("extendObjectArray adds the extended props to each object in the 1-element array", () => {
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

  test("extendObjectArray adds the extended props to each object in the 2-element array", () => {
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

  test("extendObjectArray returns the original object array reference", () => {
    const copy = [{ ...baseObj }, { ...baseObj2 }];
    const extended = extendObjectArray<BaseType, ExtendedType>(
      copy,
      extendedProps
    );
    expect(extended).toBe(copy);
  });

  test("extendObjectArray makes no changes when extended props are optional and are not given", () => {
    const copy = [{ ...baseObj }, { ...baseObj2 }];
    const extended = extendObjectArray<BaseType, ExtendedType>(copy, {});
    expect(extended).toBeArrayOfSize(2);
    expect(extended).toEqual([baseObj, baseObj2]);
  });
});
