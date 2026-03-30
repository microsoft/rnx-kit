import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { compare, dropPatchFromVersion } from "../src/helpers.ts";

describe("compare()", () => {
  it("compares values", () => {
    equal(compare(0, 0), 0);
    equal(compare(0, 1), -1);
    equal(compare(1, 0), 1);

    equal(compare("dutch", "dutch"), 0);
    equal(compare("dutch", "quaid"), -1);
    equal(compare("quaid", "dutch"), 1);
    equal(compare("dutch", "dutchess"), -1);
    equal(compare("dutchess", "dutch"), 1);

    equal(compare("hyphen-before-lowbar", "hyphen_before_lowbar"), -1);
  });
});

describe("dropPatchFromVersion()", () => {
  const cases = [
    ["1.2.3-rc.1", "1.2"],
    ["1.2.3", "1.2"],
    ["1.2", "1.2"],
    ["1", "1.0"],
    [">0.68.0 <=0.70.0", ">0.68 <=0.70"],
    ["0.68 - 0.70.2", "0.68 - 0.70"],
    ["0.68.1 - 0.70.2", "0.68 - 0.70"],
    ["1.0.1 - 3.0.3", "1.0 - 3.0"],
    ["", "*"],
    ["*", "*"],
    ["1.X", "1.X"],
    ["1.x", "1.x"],
    ["1.2.X", "1.2"],
    ["1.2.x", "1.2"],
    ["~0.68.1 || ^0.69.2 || >=0.70.0", "0.68 || 0.69 || >=0.70"],
    ["~1.0.1 || ^2.0.2 || >=3.0.3", "~1.0 || ^2.0 || >=3.0"],
    ["1.x || >=2.5.0 || 5.0.0 - 7.2.3", "1.x || >=2.5 || 5.0 - 7.2"],
  ] as const;
  for (const [input, expected] of cases) {
    it(`drops patch number in '${input}'`, () => {
      equal(dropPatchFromVersion(input), expected);
    });
  }
});
