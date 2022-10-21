import { compare, dropPatchFromVersion } from "../src/helpers";

describe("compare()", () => {
  test("compares values", () => {
    expect(compare(0, 0)).toBe(0);
    expect(compare(0, 1)).toBe(-1);
    expect(compare(1, 0)).toBe(1);

    expect(compare("dutch", "dutch")).toBe(0);
    expect(compare("dutch", "quaid")).toBe(-1);
    expect(compare("quaid", "dutch")).toBe(1);
    expect(compare("dutch", "dutchess")).toBe(-1);
    expect(compare("dutchess", "dutch")).toBe(1);

    expect(compare("hyphen-before-lowbar", "hyphen_before_lowbar")).toBe(-1);
  });
});

describe("dropPatchFromVersion()", () => {
  [
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
  ].forEach(([input, expected]) => {
    test(`drops patch number in '${input}'`, () => {
      expect(dropPatchFromVersion(input)).toBe(expected);
    });
  });
});
