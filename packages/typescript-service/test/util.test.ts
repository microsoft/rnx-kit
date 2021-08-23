import "jest-extended";
import { getCanonicalFileName, getNewLine, isNonEmptyArray } from "../src/util";

describe("Utility", () => {
  test("getCanonicalFileName only changes upper/lower-case", () => {
    const fileNameIn = "C:\\foo/a.txt";
    const fileNameOut = getCanonicalFileName(fileNameIn);
    expect(fileNameOut).toEqualCaseInsensitive(fileNameIn);
  });

  test("getNewLine returns CR, LF, or CRLF", () => {
    expect(getNewLine()).toBeOneOf(["\r", "\n", "\r\n"]);
  });

  test("isNonEmptyArray returns false when given object is undefined", () => {
    expect(isNonEmptyArray(undefined)).toBeFalse();
  });

  test("isNonEmptyArray returns false when given object is null", () => {
    expect(isNonEmptyArray(null)).toBeFalse();
  });

  test("isNonEmptyArray returns false when given object is not an array", () => {
    expect(isNonEmptyArray({ a: true })).toBeFalse();
  });

  test("isNonEmptyArray returns false when given object is an array of length 0", () => {
    expect(isNonEmptyArray([])).toBeFalse();
  });

  test("isNonEmptyArray returns true when given object is an array with an empty string", () => {
    expect(isNonEmptyArray([""])).toBeTrue();
  });

  test("isNonEmptyArray returns true when given object is an array with an undefined value", () => {
    expect(isNonEmptyArray([undefined])).toBeTrue();
  });

  test("isNonEmptyArray returns true when given object is an array with 2 elements", () => {
    expect(isNonEmptyArray([true, false])).toBeTrue();
  });
});
