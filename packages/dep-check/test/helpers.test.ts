import { compare } from "../src/helpers";

describe("compare", () => {
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
