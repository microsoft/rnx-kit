import {
  asBoolean,
  asNumber,
  asStringArray,
  asTransformProfile,
} from "../../src/helpers/parsers";

describe("asBoolean()", () => {
  it("returns boolean for string", () => {
    expect(asBoolean("false")).toBe(false);
    expect(asBoolean("true")).toBe(true);
  });

  it("throws when encountering non-boolean strings", () => {
    // @ts-expect-error intentional use of non-string
    expect(() => asBoolean(0)).toThrow();
    // @ts-expect-error intentional use of non-string
    expect(() => asBoolean(1)).toThrow();
    // @ts-expect-error intentional use of non-string
    expect(() => asBoolean(false)).toThrow();
    // @ts-expect-error intentional use of non-string
    expect(() => asBoolean(true)).toThrow();
    expect(() => asBoolean("")).toThrow();
  });
});

describe("asNumber()", () => {
  it("returns the numerical representation of number", () => {
    expect(asNumber("0")).toBe(0);
    expect(asNumber("1")).toBe(1);
    expect(asNumber("1.1")).toBe(1.1);
  });

  it("returns NaN if string is not a number", () => {
    expect(asNumber("")).toBe(0);
    expect(asNumber("number")).toBe(NaN);
  });
});

describe("asStringArray()", () => {
  it("splits a string by ','", () => {
    expect(asStringArray("")).toStrictEqual([""]);
    expect(asStringArray(",")).toStrictEqual(["", ""]);
    expect(asStringArray("a,b")).toStrictEqual(["a", "b"]);
    expect(asStringArray("a, b")).toStrictEqual(["a", " b"]);
  });
});

describe("asTransformProfile()", () => {
  it("returns the profile if valid", () => {
    expect(asTransformProfile("hermes-stable")).toBe("hermes-stable");
    expect(asTransformProfile("hermes-canary")).toBe("hermes-canary");
    expect(asTransformProfile("default")).toBe("default");
  });

  it("throws if the profile is invalid", () => {
    expect(() => asTransformProfile("performance")).toThrow();
  });
});
