import {
  colorText,
  createFormattingFunctions,
  formatDuration,
  formatPackage,
  getFormatting,
  noChange,
  padString,
  serializeArgs,
  updateDefaultFormatting,
} from "../src/formatting";

describe("formatting", () => {
  it("noChange returns the argument unchanged", () => {
    expect(noChange(123)).toBe(123);
    expect(noChange("abc")).toBe("abc");
    const obj = { a: 1 };
    expect(noChange(obj)).toBe(obj);
  });

  it("getFormatting returns a formatting object and respects overrides", () => {
    const fmt = getFormatting({ disableColors: true });
    expect(fmt.disableColors).toBe(true);
    expect(typeof fmt.color).toBe("function");
  });

  it("updateDefaultFormatting does not throw", () => {
    expect(() =>
      updateDefaultFormatting({ disableColors: true })
    ).not.toThrow();
  });

  it("colorText applies color or noChange", () => {
    const text = "test";
    expect(typeof colorText(text, "label")).toBe("string");
  });

  it("formatDuration formats ms, s, m", () => {
    expect(formatDuration(10)).toMatch(/ms/);
    expect(formatDuration(2000)).toMatch(/s/);
    expect(formatDuration(200000)).toMatch(/m/);
  });

  it("formatPackage colors scoped and unscoped packages", () => {
    expect(typeof formatPackage("@scope/pkg")).toBe("string");
    expect(typeof formatPackage("plainpkg")).toBe("string");
  });

  it("serializeArgs joins and stringifies arguments", () => {
    expect(serializeArgs(["a", 1, { b: 2 }])).toMatch(/a 1/);
  });

  it("padString pads left, right, center", () => {
    expect(padString("abc", 5, "left")).toBe("abc  ");
    expect(padString("abc", 5, "right")).toBe("  abc");
    expect(padString("abc", 5, "center")).toBe(" abc ");
  });

  it("createFormattingFunctions returns formatting helpers", () => {
    const helpers = createFormattingFunctions({
      inspectOptions: { colors: false, depth: 1, compact: true },
      colors: {},
      prefixes: {},
    });
    expect(typeof helpers.color).toBe("function");
    expect(typeof helpers.serializeArgs).toBe("function");
    expect(typeof helpers.formatDuration).toBe("function");
    expect(typeof helpers.formatPackage).toBe("function");
  });
});
