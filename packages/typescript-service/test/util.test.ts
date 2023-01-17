import { getCanonicalFileName, getNewLine } from "../src/util";

describe("Utility", () => {
  test("getCanonicalFileName only changes upper/lower-case", () => {
    const fileNameIn = "C:\\foo/a.txt";
    const fileNameOut = getCanonicalFileName(fileNameIn);
    expect(fileNameOut.toLowerCase()).toBe(fileNameIn.toLowerCase());
  });

  test("getNewLine returns CR, LF, or CRLF", () => {
    const alternatives = ["\r", "\n", "\r\n"];
    const newLine = getNewLine();
    expect(alternatives.some((candidate) => newLine === candidate)).toBe(true);
  });
});
