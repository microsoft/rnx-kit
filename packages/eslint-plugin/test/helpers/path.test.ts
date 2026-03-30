import * as fs from "node:fs";
import { realname } from "../../src/helpers/path.js";

describe("realname()", () => {
  const thisFile = __filename;

  it("returns the file name on disk", () => {
    const cases = [
      "../../README.md",
      "../../package.json",
      "../../../../README.md",
      "../../../../package.json",
    ];
    for (const c of cases) {
      expect(realname(c, thisFile)).toEqual(c);
    }
  });

  // The following tests only work on case-sensitive file systems
  const isCaseSensitive = !fs.existsSync(thisFile.toUpperCase());
  const iit = isCaseSensitive ? it.skip : it;

  iit("returns the file name on disk (case-insensitive)", () => {
    const cases = [
      ["../../rEaDmE.md", "../../README.md"],
      ["../../PaCkAgE.json", "../../package.json"],
      ["../../../../PaCkAgE.json", "../../../../package.json"],
    ] as const;
    for (const [input, expected] of cases) {
      expect(realname(input, thisFile)).toEqual(expected);
    }
  });
});
