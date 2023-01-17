import { isApproximatelyEqual } from "../src/math";

describe("Language > Math", () => {
  test("isApproximatelyEqual(1.25, 1.2499, tolerance=0.001) returns true", () => {
    expect(isApproximatelyEqual(1.25, 1.2499, 0.001)).toBe(true);
  });

  test("isApproximatelyEqual(1.25, 1.2499, tolerance=0.000001) returns false", () => {
    expect(isApproximatelyEqual(1.25, 1.2499, 0.000001)).toBe(false);
  });

  test("isApproximatelyEqual(10, 11, tolerance=2) returns true", () => {
    expect(isApproximatelyEqual(10, 11, 2)).toBe(true);
  });

  test("isApproximatelyEqual(10, 11, tolerance=0.5) returns false", () => {
    expect(isApproximatelyEqual(10, 11, 0.5)).toBe(false);
  });
});
