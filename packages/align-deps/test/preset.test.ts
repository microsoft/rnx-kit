import { deepEqual, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { filterPreset, parseRequirements } from "../src/preset.ts";
import { preset as defaultPreset } from "../src/presets/microsoft/react-native.ts";

describe("filterPreset()", () => {
  function presetWith(...versions: string[]) {
    return Object.fromEntries(
      versions.map((version) => [version, defaultPreset[version]])
    );
  }

  it("returns no profiles if requirements cannot be satisfied", () => {
    const profiles = filterPreset(defaultPreset, [
      "react@17.0",
      "react-native@>=69.0",
    ]);
    deepEqual(profiles, {});
  });

  it("returns profiles satisfying single version range", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@0.76"]);
    deepEqual(profiles, presetWith("0.76"));
  });

  it("returns profiles satisfying multiple version ranges", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@0.76 || 0.79"]);
    deepEqual(profiles, presetWith("0.76", "0.79"));
  });

  it("returns profiles satisfying wide version range", () => {
    const profiles = filterPreset(defaultPreset, ["react-native@>=0.76 <0.81"]);
    deepEqual(profiles, presetWith("0.76", "0.77", "0.78", "0.79", "0.80"));
  });

  it("returns profiles satisfying non-react-native requirements", () => {
    const profiles = filterPreset(defaultPreset, ["react@18"]);
    deepEqual(
      profiles,
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

  it("returns profiles satisfying multiple requirements", () => {
    const profiles = filterPreset(defaultPreset, [
      "react@18",
      "react-native@<0.70",
    ]);
    deepEqual(profiles, presetWith("0.69"));
  });

  it("ignores extra capabilities resolving to the same package", () => {
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
    deepEqual(profiles, presetWith("0.69"));
  });
});

describe("parseRequirements()", () => {
  it("throws if requirement is invalid", () => {
    throws(
      () => parseRequirements(["@rnx-kit/align-deps"]),
      /Invalid requirement/
    );
    throws(() => parseRequirements(["react-native"]), /Invalid requirement/);
  });

  it("throws if version is invalid", () => {
    throws(
      () => parseRequirements(["@rnx-kit/align-deps@"]),
      /Invalid version range/
    );
    throws(
      () => parseRequirements(["@rnx-kit/align-deps@latest"]),
      /Invalid version range/
    );
  });

  it("returns package name and version", () => {
    deepEqual(parseRequirements(["@rnx-kit/align-deps@1.0"]), [
      ["@rnx-kit/align-deps", "1.0"],
    ]);
    deepEqual(parseRequirements(["react-native@0.70"]), [
      ["react-native", "0.70"],
    ]);
  });
});

describe("presets should not have duplicate packages", () => {
  const allowedAliases = ["core", "core-android", "core-ios"];

  for (const [name, profile] of Object.entries(defaultPreset)) {
    it(`microsoft/react-native/${name}`, () => {
      const packages = new Set<string>();
      for (const [capability, pkg] of Object.entries(profile)) {
        if (pkg.name === "#meta" || allowedAliases.includes(capability)) {
          continue;
        }

        ok(!packages.has(pkg.name));
        packages.add(pkg.name);
      }
    });
  }
});
