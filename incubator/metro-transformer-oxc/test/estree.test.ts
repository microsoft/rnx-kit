import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { getLineNumber, getNewlines } from "../src/estree.ts";

const TEXT = `
Line 1
Line 2
Line 3
`;

describe("getNewlines()", () => {
  it("returns all newlines", () => {
    const newlines = getNewlines(TEXT);
    deepEqual(newlines, [0, 7, 14, 21]);
  });
});

describe("getLineNumber()", () => {
  it("returns line number and start byte position", () => {
    const newlines = getNewlines(TEXT);
    deepEqual(getLineNumber(0, newlines), [1, 0]);
    deepEqual(getLineNumber(1, newlines), [2, 1]);
    deepEqual(getLineNumber(7, newlines), [2, 1]);
    deepEqual(getLineNumber(8, newlines), [3, 8]);
    deepEqual(getLineNumber(14, newlines), [3, 8]);
    deepEqual(getLineNumber(15, newlines), [4, 15]);
    deepEqual(getLineNumber(21, newlines), [4, 15]);
    deepEqual(getLineNumber(22, newlines), [5, 22]);
    deepEqual(getLineNumber(100, newlines), [5, 22]);
  });
});
