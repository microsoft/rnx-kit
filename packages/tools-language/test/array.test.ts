import { toIndex, addRange, isNonEmptyArray } from "../src/array";

describe("Language > Array > toIndex()", () => {
  const testArray = ["a", "b", "c"];

  test("index matches offset when offset is zero", () => {
    expect(toIndex(testArray, 0)).toEqual(0);
  });

  test("index matches offset when offset is positive", () => {
    expect(toIndex(testArray, 2)).toEqual(2);
  });

  test("index matches offset when offset is positive and exceeds array length", () => {
    expect(toIndex(testArray, 100)).toEqual(100);
  });

  test("index maps from the back of the array when offset is negative", () => {
    expect(toIndex(testArray, -1)).toEqual(testArray.length - 1);
  });

  test("index maps from the back of the array when offset is negative and exceeds array length", () => {
    expect(toIndex(testArray, -100)).toEqual(testArray.length - 100);
  });
});

describe("Language > Array > addRange()", () => {
  const from = [7, 8, 9];

  test("undefined when 'to' and 'from' are undefined", () => {
    expect(addRange(undefined, undefined)).toBeUndefined();
  });

  test("returns 'to' when 'from' is undefined", () => {
    const to = [1, 2];
    const copy = [...to];
    const r = addRange(to, undefined);
    expect(r).toBe(to);
    expect(r).toEqual(copy);
  });

  test("returns 'to' when 'from' is empty", () => {
    const to = [1, 2];
    const copy = [...to];
    const r = addRange(to, undefined);
    expect(r).toBe(to);
    expect(r).toEqual(copy);
  });

  test("adds all 'from' elements in-place", () => {
    const to = [1, 2];
    const copy = [...to];
    const r = addRange(to, from);
    expect(r).toBe(to);
    expect(r).toEqual([...copy, ...from]);
  });

  test("skips undefined 'from' elements", () => {
    const fromUndefined = [6, undefined, 7, undefined];
    const to = [1, 2];
    const copy = [...to];
    const r = addRange(to, fromUndefined);
    expect(r).toBe(to);
    expect(r).toEqual([...copy, 6, 7]);
  });

  test("keeps undefined 'to' elements", () => {
    const to = [1, undefined, 2, undefined];
    const copy = [...to];
    const r = addRange(to, from);
    expect(r).toBe(to);
    expect(r).toEqual([...copy, ...from]);
  });

  test("adds range of 'from' elements in-place", () => {
    const to = [1, 2];
    const copy = [...to];
    const r = addRange(to, from, 0, 1);
    expect(r).toBe(to);
    expect(r).toEqual([...copy, ...from.slice(0, 1)]);
  });

  test("returns all 'from' elements in new array when 'to' is undefined", () => {
    const r = addRange(undefined, from);
    expect(r).not.toBe(from);
    expect(r).toEqual([...from]);
  });

  test("returns range of 'from' elements in new array when 'to' is undefined", () => {
    const r = addRange(undefined, from, -2);
    expect(r).not.toBe(from);
    expect(r).toEqual(from.slice(-2));
  });
});

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
