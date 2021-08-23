import "jest-extended";
import { isApproximatelyEqual } from "../src/math";

describe("Language > Math", () => {
  test("isApproximatelyEqual(1.25, 1.2499, tolerance=0.001) returns true", () => {
    expect(isApproximatelyEqual(1.25, 1.2499, 0.001)).toBeTrue();
  });

  test("isApproximatelyEqual(1.25, 1.2499, tolerance=0.000001) returns false", () => {
    expect(isApproximatelyEqual(1.25, 1.2499, 0.000001)).toBeFalse();
  });

  test("isApproximatelyEqual(10, 11, tolerance=2) returns true", () => {
    expect(isApproximatelyEqual(10, 11, 2)).toBeTrue();
  });

  test("isApproximatelyEqual(10, 11, tolerance=0.5) returns false", () => {
    expect(isApproximatelyEqual(10, 11, 0.5)).toBeFalse();
  });
});
