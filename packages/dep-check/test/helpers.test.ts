import { compare } from "../src/helpers";

describe("compare", () => {
  test("null/undefined are always equal", () => {
    expect(compare(null, null)).toBe(0);
    expect(compare(null, undefined)).toBe(0);
    expect(compare(undefined, null)).toBe(0);
    expect(compare(undefined, undefined)).toBe(0);
  });

  test("null/undefined are always less", () => {
    expect(compare(null, 0)).toBe(-1);
    expect(compare(undefined, 0)).toBe(-1);
    expect(compare(0, null)).toBe(1);
    expect(compare(0, undefined)).toBe(1);
  });

  test("compares values", () => {
    expect(compare(0, 0)).toBe(0);
    expect(compare(0, 1)).toBe(-1);
    expect(compare(1, 0)).toBe(1);
    expect(compare("dutch", "dutch")).toBe(0);
    expect(compare("dutch", "quaid")).toBe(-1);
    expect(compare("quaid", "dutch")).toBe(1);
  });
});
