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
});
