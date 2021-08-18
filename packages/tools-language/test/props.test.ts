import "jest-extended";
import { pickValue, pickValues } from "../src/props";

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
});
