import {
  containsValidPresets,
  containsValidRequirements,
  defaultConfig,
  loadPresetsOverrideFromPackage,
} from "../src/config";

jest.mock("@rnx-kit/config");

describe("containsValidPresets()", () => {
  test("is valid when 'presets' is unset", () => {
    expect(containsValidPresets({})).toBe(true);
  });

  test("is invalid when 'presets' is empty", () => {
    expect(containsValidPresets({ presets: [] })).toBe(false);
  });

  test("is invalid when 'presets' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    expect(containsValidPresets({ presets: "[]" })).toBe(false);
  });
});

describe("containsValidRequirements()", () => {
  test("is invalid when 'requirements' is unset", () => {
    expect(containsValidRequirements({})).toBe(false);
  });

  test("is invalid when 'requirements' is empty", () => {
    expect(containsValidRequirements({ requirements: [] })).toBe(false);
    expect(
      // @ts-expect-error intentionally passing an invalid type
      containsValidRequirements({ requirements: { production: [] } })
    ).toBe(false);
    expect(
      containsValidRequirements({
        requirements: { development: [], production: [] },
      })
    ).toBe(false);
  });

  test("is invalid when 'requirements' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    expect(containsValidRequirements({ requirements: "[]" })).toBe(false);
  });

  test("is valid when 'requirements' contains at least one requirement", () => {
    expect(
      containsValidRequirements({ requirements: ["react-native@*"] })
    ).toBe(true);
    expect(
      containsValidRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { production: ["react-native@*"] },
      })
    ).toBe(true);
  });
});

describe("loadPresetsOverrideFromPackage()", () => {
  const config = require("@rnx-kit/config");

  afterEach(() => {
    config.__setMockConfig({});
  });

  test("returns `null` when no config is found", () => {
    expect(loadPresetsOverrideFromPackage("package.json")).toBe(null);
  });

  test("returns `null` when no presets are found", () => {
    config.__setMockConfig({ alignDeps: {} });
    expect(loadPresetsOverrideFromPackage("package.json")).toBe(null);
  });

  test("returns presets declared in `alignDeps`", () => {
    config.__setMockConfig({ alignDeps: { presets: ["test"] } });
    expect(loadPresetsOverrideFromPackage("package.json")).toEqual(["test"]);
  });

  test("returns preset declared in `customProfiles`", () => {
    config.__setMockConfig({ customProfiles: "test" });
    expect(loadPresetsOverrideFromPackage("package.json")).toEqual([
      ...defaultConfig.presets,
      "test",
    ]);
  });

  test("prefers presets declared in `alignDeps`", () => {
    config.__setMockConfig({
      alignDeps: { presets: ["test"] },
      customProfiles: "test",
    });
    expect(loadPresetsOverrideFromPackage("package.json")).toEqual(["test"]);
  });
});
