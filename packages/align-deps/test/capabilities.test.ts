import type { Capability } from "@rnx-kit/types-kit-config";
import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  capabilitiesFor,
  capabilityProvidedBy,
  resolveCapabilities,
  resolveCapabilitiesUnchecked,
} from "../src/capabilities.ts";
import { filterPreset } from "../src/preset.ts";
import { preset as defaultPreset } from "../src/presets/microsoft/react-native.ts";
import { profile as profile_0_62 } from "../src/presets/microsoft/react-native/profile-0.62.ts";
import { profile as profile_0_63 } from "../src/presets/microsoft/react-native/profile-0.63.ts";
import { profile as profile_0_64 } from "../src/presets/microsoft/react-native/profile-0.64.ts";
import type { Preset } from "../src/types.ts";
import { pickPackage } from "./helpers.ts";

function mergePresets(...presets: Preset[]): Preset {
  const mergedPreset: Preset = {};
  for (const preset of presets) {
    for (const [profileName, profile] of Object.entries(preset)) {
      mergedPreset[profileName] = {
        ...mergedPreset[profileName],
        ...profile,
      };
    }
  }

  return mergedPreset;
}

describe("capabilitiesFor()", () => {
  it("returns an empty array when there are no dependencies", () => {
    const manifest = { name: "@rnx-kit/align-deps", version: "1.0.0" };
    deepEqual(capabilitiesFor(manifest, defaultPreset), []);
  });

  it("returns capabilities for dependencies declared under `dependencies`", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies: {
        react: "^17.0.1",
        "react-native": "^0.64.1",
      },
    };
    deepEqual(capabilitiesFor(manifest, defaultPreset), [
      "core",
      "core-android",
      "core-ios",
      "react",
    ]);
  });

  it("returns capabilities for dependencies declared under `peerDependencies`", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      peerDependencies: {
        react: "^17.0.1",
        "react-native": "^0.64.1",
      },
    };
    deepEqual(capabilitiesFor(manifest, defaultPreset), [
      "core",
      "core-android",
      "core-ios",
      "react",
    ]);
  });

  it("returns capabilities for dependencies declared under `devDependencies`", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      devDependencies: {
        react: "^17.0.1",
        "react-native": "^0.64.1",
      },
    };
    deepEqual(capabilitiesFor(manifest, defaultPreset), [
      "core",
      "core-android",
      "core-ios",
      "react",
    ]);
  });

  it("ignores packages that are not managed by align-deps", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      peerDependencies: {
        react: "17.0.1",
        "react-native": "^0.64.1",
      },
      devDependencies: {
        "@rnx-kit/babel-preset-metro-react-native": "*",
        "@rnx-kit/cli": "*",
      },
    };
    deepEqual(capabilitiesFor(manifest, defaultPreset), [
      "core",
      "core-android",
      "core-ios",
      "react",
    ]);
  });
});

describe("resolveCapabilities()", () => {
  it("annotates copies of frozen packages while preserving shared-object metadata", () => {
    const symbol = Symbol.for("provides");
    const original = Object.freeze({
      name: "shared",
      version: "1.0.0",
      [symbol]: "original",
    });
    const preset = { first: { first: original, second: original } };
    const { dependencies, unresolvedCapabilities } =
      resolveCapabilitiesUnchecked(["first", "second"] as Capability[], preset);
    deepEqual(Object.keys(dependencies), ["shared"]);
    equal(dependencies.shared.length, 1);
    equal(capabilityProvidedBy(dependencies.shared[0]), "second");
    equal(capabilityProvidedBy(original), "original");
    deepEqual(unresolvedCapabilities, {});
    const again = resolveCapabilitiesUnchecked(
      ["first"] as Capability[],
      preset
    );
    equal(capabilityProvidedBy(again.dependencies.shared[0]), "first");
    equal(capabilityProvidedBy(dependencies.shared[0]), "second");
  });

  it("retains declared provenance before package-version deduplication", () => {
    const preset = {
      first: {
        nested: { name: "shared", version: "1.0.0" },
        bundle: { name: "#meta", capabilities: ["nested"] },
        alias: { name: "shared", version: "1.0.0", devOnly: true },
      },
      second: { nested: { name: "shared", version: "2.0.0" } },
    };
    const provenance: string[] = [];
    const { dependencies, unresolvedCapabilities } =
      resolveCapabilitiesUnchecked(
        ["bundle", "alias", "missing", "missing"] as Capability[],
        preset,
        (pkg, declared) => provenance.push(`${declared}:${pkg.version}`)
      );
    deepEqual(provenance, ["bundle:1.0.0", "alias:1.0.0"]);
    deepEqual(
      dependencies.shared.map(({ version, devOnly }) => [version, devOnly]),
      [["1.0.0", undefined]]
    );
    deepEqual(unresolvedCapabilities, {
      bundle: ["second"],
      alias: ["second"],
      missing: ["first", "second", "first", "second"],
    });
  });

  it("safely resolves package names that shadow Object.prototype", () => {
    const { dependencies } = resolveCapabilitiesUnchecked(
      ["target", "other"] as Capability[],
      {
        first: {
          target: { name: "__proto__", version: "1.0.0" },
          other: { name: "constructor", version: "1.0.0" },
        },
      }
    );
    equal(Object.getPrototypeOf(dependencies), Object.prototype);
    equal(dependencies.__proto__[0].name, "__proto__");
    equal(dependencies.constructor[0].name, "constructor");
  });

  it("ignores keywords pointing to `Object.prototype`", (t) => {
    const consoleWarnSpy = t.mock.method(console, "warn", () => undefined);

    const packages = resolveCapabilities(
      "package.json",
      ["__proto__", "prototype", "constructor"] as unknown as Capability[],
      { "0.64": profile_0_64 }
    );

    deepEqual(packages, {});
    equal(consoleWarnSpy.mock.callCount(), 0);
  });

  it("dedupes packages", (t) => {
    const consoleWarnSpy = t.mock.method(console, "warn", () => undefined);

    const packages = resolveCapabilities(
      "package.json",
      ["core", "core", "test-app"],
      { "0.64": profile_0_64 }
    );

    const { name } = profile_0_64["core"];
    const { name: reactName } = profile_0_64["react"];
    const { name: testAppName } = profile_0_64["test-app"];
    deepEqual(packages, {
      [name]: [pickPackage(profile_0_64, "core")],
      [reactName]: [pickPackage(profile_0_64, "react")],
      [testAppName]: [pickPackage(profile_0_64, "test-app")],
    });

    equal(consoleWarnSpy.mock.callCount(), 0);
  });

  it("dedupes package versions", (t) => {
    const consoleWarnSpy = t.mock.method(console, "warn", () => undefined);

    const packages = resolveCapabilities("package.json", ["webview"], {
      "0.62": profile_0_62,
      "0.63": profile_0_63,
      "0.64": profile_0_64,
    });

    const { name } = profile_0_64["webview"];
    deepEqual(packages, {
      [name]: [
        pickPackage(profile_0_62, "webview"),
        pickPackage(profile_0_64, "webview"),
      ],
    });

    equal(consoleWarnSpy.mock.callCount(), 0);
  });

  it("ignores missing/unknown capabilities", (t) => {
    const consoleWarnSpy = t.mock.method(console, "warn", () => undefined);

    const packages = resolveCapabilities(
      "package.json",
      ["skynet" as Capability, "svg"],
      {
        "0.62": profile_0_62,
        "0.63": profile_0_63,
        "0.64": profile_0_64,
      }
    );

    const { name } = profile_0_64["svg"];
    deepEqual(packages, { [name]: [pickPackage(profile_0_64, "svg")] });
    equal(consoleWarnSpy.mock.callCount(), 1);
  });

  it("resolves custom capabilities", () => {
    const skynet = { name: "skynet", version: "1.0.0" };
    const preset = filterPreset(
      mergePresets(defaultPreset, { "0.62": { [skynet.name]: skynet } }),
      ["react-native@0.62 || 0.63 || 0.64"]
    );

    const packages = resolveCapabilities(
      "package.json",
      ["skynet" as Capability, "svg"],
      preset
    );

    const { name } = profile_0_64["svg"];
    deepEqual(packages, {
      [name]: [pickPackage(profile_0_64, "svg")],
      [skynet.name]: [{ ...skynet, [Symbol.for("provides")]: "skynet" }],
    });
  });

  it("resolves capabilities required by capabilities", (t) => {
    const consoleWarnSpy = t.mock.method(console, "warn", () => undefined);

    const packages = resolveCapabilities("package.json", ["core-windows"], {
      "0.63": profile_0_63,
      "0.64": profile_0_64,
    });

    deepEqual(packages, {
      react: [
        pickPackage(profile_0_63, "react"),
        pickPackage(profile_0_64, "react"),
      ],
      "react-native": [
        pickPackage(profile_0_63, "core"),
        pickPackage(profile_0_64, "core"),
      ],
      "react-native-windows": [
        pickPackage(profile_0_63, "core-windows"),
        pickPackage(profile_0_64, "core-windows"),
      ],
    });

    equal(consoleWarnSpy.mock.callCount(), 0);
  });

  it("resolves meta packages", () => {
    const preset = filterPreset(
      mergePresets(defaultPreset, {
        "0.64": {
          "core/all": {
            name: "#meta",
            capabilities: [
              "core-android",
              "core-ios",
              "core-macos",
              "core-windows",
            ],
          },
        },
      }),
      ["react-native@0.64"]
    );

    const packages = resolveCapabilities(
      "package.json",
      ["core/all" as Capability],
      preset
    );

    deepEqual(packages, {
      react: [pickPackage(profile_0_64, "react")],
      "react-native": [pickPackage(profile_0_64, "core")],
      "react-native-macos": [pickPackage(profile_0_64, "core-macos")],
      "react-native-windows": [pickPackage(profile_0_64, "core-windows")],
    });
  });

  it("resolves meta packages with loops", () => {
    const preset = filterPreset(
      mergePresets(defaultPreset, {
        "0.64": {
          connor: {
            name: "#meta",
            capabilities: ["core", "reese"],
          },
          reese: {
            name: "#meta",
            capabilities: ["t-800"],
          },
          "t-800": {
            name: "#meta",
            capabilities: ["connor"],
          },
        },
      }),
      ["react-native@0.64"]
    );

    const packages = resolveCapabilities(
      "package.json",
      ["reese" as Capability],
      preset
    );

    deepEqual(packages, {
      react: [pickPackage(profile_0_64, "react")],
      "react-native": [pickPackage(profile_0_64, "core")],
    });
  });
});
