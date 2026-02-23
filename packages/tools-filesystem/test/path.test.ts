import { equal } from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { realname } from "../src/path.ts";

describe("realname()", () => {
  const thisFile = fileURLToPath(import.meta.url);
  const isCaseSensitive = !fs.existsSync(thisFile.toUpperCase());

  it("returns the file name on disk", () => {
    const cases = [
      "../README.md",
      "../package.json",
      "../../../README.md",
      "../../../package.json",
    ];
    for (const c of cases) {
      equal(realname(c, thisFile), c);
    }
  });

  // These tests only work on case-sensitive file systems
  it(
    "returns the file name on disk (case-insensitive)",
    { skip: isCaseSensitive },
    () => {
      const cases = [
        ["../rEaDmE.md", "../README.md"],
        ["../PaCkAgE.json", "../package.json"],
        ["../../../PaCkAgE.json", "../../../package.json"],
      ] as const;
      for (const [input, expected] of cases) {
        equal(realname(input, thisFile), expected);
      }
    }
  );
});
