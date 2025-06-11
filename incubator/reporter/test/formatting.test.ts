import {
  createFormatHelper,
  disableColorOptions,
  formatDuration,
  mergeSettings,
  noChange,
} from "../src/formatting.ts";
import type { ColorSettings } from "../src/types";

// Mock ColorSettings for testing
const mockColorSettings = {
  path: (s: string) => `[path]${s}`,
  duration: (n: string | number) => `[duration]${n}`,
  durationUnits: (u: string) => `[unit]${u}`,
  pkgName: (n: string) => `[pkg]${n}`,
  pkgScope: (s: string) => `[scope]${s}`,
} as ColorSettings;

describe("noChange", () => {
  it("returns the argument unchanged", () => {
    expect(noChange(123)).toBe(123);
    expect(noChange("abc")).toBe("abc");
    const obj = { a: 1 };
    expect(noChange(obj)).toBe(obj);
  });
});

describe("mergeSettings", () => {
  it("returns target if source is undefined", () => {
    const target = { a: 1 };
    expect(mergeSettings(target, undefined)).toBe(target);
  });

  it("merges shallow properties", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3 };
    expect(mergeSettings({ ...target }, source)).toEqual({ a: 1, b: 3 });
  });

  it("deep merges nested objects", () => {
    const target = { a: 1, b: { c: 2, d: 3 } };
    const source = { b: { d: 4 } };
    expect(mergeSettings({ ...target }, source)).toEqual({
      a: 1,
      b: { c: 2, d: 4 },
    });
  });

  it("does not mutate target if immutable is true", () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: { c: 3 } };
    const result = mergeSettings(target, source, true);
    expect(result).not.toBe(target);
    expect(result.b).not.toBe(target.b);
    expect(result).toEqual({ a: 1, b: { c: 3 } });
  });

  it("mutates target if immutable is false or omitted", () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: { c: 3 } };
    const result = mergeSettings(target, source);
    expect(result).toBe(target);
    expect(result.b).toBe(target.b);
    expect(result).toEqual({ a: 1, b: { c: 3 } });
  });

  it("skips undefined properties in source", () => {
    const target = { a: 1, b: 2 };
    const source = { a: undefined, b: 3 };
    expect(mergeSettings({ ...target }, source)).toEqual({ a: 1, b: 3 });
  });
});

describe("disableColorOptions", () => {
  it("has inspectOptions.colors set to false", () => {
    expect(disableColorOptions.inspectOptions?.colors).toBe(false);
  });

  it("has color.message with all log levels", () => {
    const msg = disableColorOptions.color?.message;
    expect(msg).toBeDefined();
    expect(msg?.default).toBeDefined();
    expect(msg?.error).toBeDefined();
    expect(msg?.warn).toBeDefined();
    expect(msg?.log).toBeDefined();
    expect(msg?.verbose).toBeDefined();
  });

  it("message color functions strip VT control characters", () => {
    const settings = mergeSettings<ColorSettings>(
      mockColorSettings,
      disableColorOptions.color,
      true
    );
    const colored = "\u001b[31mred\u001b[0m";
    expect(settings.message.default.text(colored)).toBe("red");
  });
});

describe("createFormatHelper", () => {
  const helper = createFormatHelper(mockColorSettings);

  it("formats packageFull for unscoped package", () => {
    expect(helper.packageFull("foo")).toBe("[pkg]foo");
  });

  it("formats packageFull for scoped package", () => {
    expect(helper.packageFull("@scope/foo")).toBe("[scope]@scope/[pkg]foo");
  });

  it("formats packageParts with scope", () => {
    expect(helper.packageParts("foo", "@scope")).toBe("[scope]@scope/[pkg]foo");
  });

  it("formats packageParts without scope", () => {
    expect(helper.packageParts("foo")).toBe("[pkg]foo");
  });

  it("formats path", () => {
    expect(helper.path("abc/def")).toBe("[path]abc/def");
  });

  it("formats duration", () => {
    expect(helper.duration(1234)).toMatch(/^\[duration\]1\.23\[unit\]s$/);
  });
});

describe("formatDuration", () => {
  const colors = {
    duration: (n) => `*${n}*`,
    durationUnits: (u) => `_${u}_`,
    path: noChange,
    pkgName: noChange,
    pkgScope: noChange,
  } as ColorSettings;

  it("formats milliseconds < 1000 as ms", () => {
    expect(formatDuration(colors, 500)).toBe("*500*_ms_");
  });

  it("formats milliseconds > 1000 as s", () => {
    expect(formatDuration(colors, 1500)).toBe("*1.50*_s_");
  });

  it("formats milliseconds > cutoff as m", () => {
    expect(formatDuration(colors, 121000, 120)).toBe("*2.02*_m_");
  });

  it("uses default color functions if not provided", () => {
    const c = { path: noChange } as ColorSettings;
    expect(formatDuration(c, 500)).toBe("500ms");
  });

  it("handles decimal places correctly", () => {
    expect(formatDuration(colors, 12345)).toBe("*12.3*_s_");
    expect(formatDuration(colors, 1234567)).toBe("*20.6*_m_");
  });
});
