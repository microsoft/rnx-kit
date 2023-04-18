import { isNonEmptyArray } from "../src/array";

describe("Language > Array > isNonEmptyArray()", () => {
  test("isNonEmptyArray returns false when given object is undefined", () => {
    expect(isNonEmptyArray(undefined)).toBe(false);
  });

  test("isNonEmptyArray returns false when given object is null", () => {
    expect(isNonEmptyArray(null)).toBe(false);
  });

  test("isNonEmptyArray returns false when given object is not an array", () => {
    expect(isNonEmptyArray({ a: true })).toBe(false);
  });

  test("isNonEmptyArray returns false when given object is an array of length 0", () => {
    expect(isNonEmptyArray([])).toBe(false);
  });

  test("isNonEmptyArray returns true when given object is an array with an empty string", () => {
    expect(isNonEmptyArray([""])).toBe(true);
  });

  test("isNonEmptyArray returns true when given object is an array with an undefined value", () => {
    expect(isNonEmptyArray([undefined])).toBe(true);
  });

  test("isNonEmptyArray returns true when given object is an array with 2 elements", () => {
    expect(isNonEmptyArray([true, false])).toBe(true);
  });
});
