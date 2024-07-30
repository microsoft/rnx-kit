import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { getCanonicalFileName, getNewLine } from "../src/util";

describe("Utility", () => {
  it("getCanonicalFileName() only changes upper/lower-case", () => {
    const fileNameIn = "C:\\foo/a.txt";
    const fileNameOut = getCanonicalFileName(fileNameIn);

    equal(fileNameOut.toLowerCase(), fileNameIn.toLowerCase());
  });

  it("getNewLine() returns CR, LF, or CRLF", () => {
    const alternatives = ["\r", "\n", "\r\n"];
    const newLine = getNewLine();

    ok(alternatives.some((candidate) => newLine === candidate));
  });
});
