import { filterPreset, parseRequirements } from "../src/preset";
import defaultPreset from "../src/presets/microsoft/react-native";
import profile_0_68 from "../src/presets/microsoft/react-native/profile-0.68";
import profile_0_69 from "../src/presets/microsoft/react-native/profile-0.69";
import profile_0_70 from "../src/presets/microsoft/react-native/profile-0.70";

describe("filterPreset()", () => {
  test("returns no profiles if requirements cannot be satisfied", () => {
    const profiles = filterPreset(defaultPreset, [
      "react@17.0",
      "react-native@>=69.0",
    ]);
    expect(profiles).toEqual({});
  });

  test("returns profiles satisfying single version range", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@0.70"]);
    expect(profiles).toEqual({ "0.70": profile_0_70 });
  });

  test("returns profiles satisfying multiple version ranges", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@0.68 || 0.70"]);
    expect(profiles).toEqual({ "0.68": profile_0_68, "0.70": profile_0_70 });
  });

  test("returns profiles satisfying wide version range", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@>=0.68"]);
    expect(profiles).toEqual({
      "0.68": profile_0_68,
      "0.69": profile_0_69,
      "0.70": profile_0_70,
    });
  });

  test("returns profiles satisfying non-react-native requirements", () => {
    const profiles = filterPreset(defaultPreset, ["react@18"]);
    expect(profiles).toEqual({
      "0.69": profile_0_69,
      "0.70": profile_0_70,
    });
  });

  test("returns profiles satisfying multiple requirements", () => {
    const profiles = filterPreset(defaultPreset, [
      "react@18",
      "react-native@<0.70",
    ]);
    expect(profiles).toEqual({ "0.69": profile_0_69 });
  });

  test("ignores extra capabilities resolving to the same package", () => {
    const presetWithExtraCapabilities = {
      ...defaultPreset,
      "0.70": {
        ...defaultPreset["0.70"],
        "should-be-ignored": profile_0_69.core,
      },
    };
    const profiles = filterPreset(presetWithExtraCapabilities, [
      "react-native@0.69",
    ]);
    expect(profiles).toEqual({ "0.69": profile_0_69 });
  });
});

describe("parseRequirements()", () => {
  test("throws if requirement is invalid", () => {
    expect(() => parseRequirements(["@rnx-kit/align-deps"])).toThrow(
      "Invalid requirement"
    );
    expect(() => parseRequirements(["react-native"])).toThrow(
      "Invalid requirement"
    );
  });

  test("throws if version is invalid", () => {
    expect(() => parseRequirements(["@rnx-kit/align-deps@"])).toThrow(
      "Invalid version range"
    );
    expect(() => parseRequirements(["@rnx-kit/align-deps@latest"])).toThrow(
      "Invalid version range"
    );
  });

  test("returns package name and version", () => {
    expect(parseRequirements(["@rnx-kit/align-deps@1.0"])).toEqual([
      ["@rnx-kit/align-deps", "1.0"],
    ]);
    expect(parseRequirements(["react-native@0.70"])).toEqual([
      ["react-native", "0.70"],
    ]);
  });
});

describe("presets should not have duplicate packages", () => {
  const allowedAliases = ["core", "core-android", "core-ios"];

  for (const [name, profile] of Object.entries(defaultPreset)) {
    test(`microsoft/react-native/${name}`, () => {
      const packages = new Set<string>();
      for (const [capability, pkg] of Object.entries(profile)) {
        if (pkg.name === "#meta" || allowedAliases.includes(capability)) {
          continue;
        }

        expect(packages.has(pkg.name)).toBe(false);
        packages.add(pkg.name);
      }
    });
  }
});
