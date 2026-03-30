import { parseSync as babelParse } from "@babel/core";
import { deepEqual, equal } from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { parseSync as oxcParse } from "oxc-parser";
import { getLineNumber, getNewlines, toBabelAST } from "../src/estree.ts";

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

describe("toBabelAST()", () => {
  const SOURCE = `// @ts-check
process.exitCode = 0;
// trailing comment
`;

  it("ensures start/end values match Babel's AST", () => {
    const { program } = oxcParse(path.basename(import.meta.url), SOURCE);

    equal(program.start, SOURCE.indexOf("process"));
    equal(program.end, SOURCE.length);

    const { program: oxcBabelProgram } = toBabelAST(program, SOURCE);
    const babelProgram = babelParse(SOURCE);

    equal(oxcBabelProgram.start, babelProgram?.start);
    equal(oxcBabelProgram.end, babelProgram?.end);
  });
});
