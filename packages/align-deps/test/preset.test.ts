import { filterPreset, parseRequirements } from "../src/preset";
import { preset as defaultPreset } from "../src/presets/microsoft/react-native";

describe("filterPreset()", () => {
  function presetWith(...versions: string[]) {
    return Object.fromEntries(
      versions.map((version) => [version, defaultPreset[version]])
    );
  }

  test("returns no profiles if requirements cannot be satisfied", () => {
    const profiles = filterPreset(defaultPreset, [
      "react@17.0",
      "react-native@>=69.0",
    ]);
    expect(profiles).toEqual({});
  });

  test("returns profiles satisfying single version range", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@0.76"]);
    expect(profiles).toEqual(presetWith("0.76"));
  });

  test("returns profiles satisfying multiple version ranges", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@0.76 || 0.79"]);
    expect(profiles).toEqual(presetWith("0.76", "0.79"));
  });

  test("returns profiles satisfying wide version range", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@>=0.76 <0.81"]);
    expect(profiles).toEqual(
      presetWith("0.76", "0.77", "0.78", "0.79", "0.80")
    );
  });

  test("returns profiles satisfying non-react-native requirements", () => {
    const profiles = filterPreset(defaultPreset, ["react@18"]);
    expect(profiles).toEqual(
      presetWith(
        "0.69",
        "0.70",
        "0.71",
        "0.72",
        "0.73",
        "0.74",
        "0.75",
        "0.76",
        "0.77"
      )
    );
  });

  test("returns profiles satisfying multiple requirements", () => {
    const profiles = filterPreset(defaultPreset, [
      "react@18",
      "react-native@<0.70",
    ]);
    expect(profiles).toEqual(presetWith("0.69"));
  });

  test("ignores extra capabilities resolving to the same package", () => {
    const presetWithExtraCapabilities = {
      ...defaultPreset,
      "0.70": {
        ...defaultPreset["0.70"],
        "should-be-ignored": defaultPreset["0.69"].core,
      },
    };
    const profiles = filterPreset(presetWithExtraCapabilities, [
      "react-native@0.69",
    ]);
    expect(profiles).toEqual(presetWith("0.69"));
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
