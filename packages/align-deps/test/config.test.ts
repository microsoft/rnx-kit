import type { Capability, KitConfig } from "@rnx-kit/types-kit-config";
import type { PackageManifest } from "@rnx-kit/types-node";
import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsValidPresets,
  findEmptyRequirements,
  findLegacyKeys,
  isPackageManifest,
  loadConfig,
  sanitizeCapabilities,
} from "../src/config.ts";

describe("containsValidPresets()", () => {
  it("is valid when 'presets' is unset", () => {
    ok(containsValidPresets({}));
  });

  it("is invalid when 'presets' is empty", () => {
    ok(!containsValidPresets({ presets: [] }));
  });

  it("is invalid when 'presets' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    ok(!containsValidPresets({ presets: "[]" }));
  });
});

describe("findLegacyKeys()", () => {
  it("returns nothing when there are no legacy keys", () => {
    deepEqual(findLegacyKeys({}), []);
    deepEqual(findLegacyKeys({ kitType: "library" }), []);
  });

  it("returns all legacy keys", () => {
    const legacyConfig = {
      capabilities: ["core-ios"],
      customProfiles: "./profiles.js",
      reactNativeDevVersion: "0.72.0",
      reactNativeVersion: "^0.72.0",
    } as KitConfig;

    deepEqual(findLegacyKeys(legacyConfig), [
      "capabilities",
      "customProfiles",
      "reactNativeDevVersion",
      "reactNativeVersion",
    ]);

    deepEqual(findLegacyKeys({ reactNativeVersion: "^0.72.0" } as KitConfig), [
      "reactNativeVersion",
    ]);
  });
});

describe("findEmptyRequirements()", () => {
  it("is invalid when 'requirements' is unset", () => {
    equal(findEmptyRequirements({}), "requirements");
  });

  it("is invalid when 'requirements' is empty", () => {
    equal(findEmptyRequirements({ requirements: [] }), "requirements");

    equal(
      // @ts-expect-error intentionally passing an invalid type
      findEmptyRequirements({ requirements: { production: [] } }),
      "requirements.development"
    );

    equal(
      findEmptyRequirements({
        requirements: { development: [], production: [] },
      }),
      "requirements.development"
    );

    equal(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: ["react-native@*"] },
      }),
      "requirements.production"
    );

    equal(
      findEmptyRequirements({
        requirements: { development: ["react-native@*"], production: [] },
      }),
      "requirements.production"
    );
  });

  it("is invalid when 'requirements' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    equal(findEmptyRequirements({ requirements: "[]" }), "requirements");

    equal(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: "[]", production: "[]" },
      }),
      "requirements.development"
    );

    equal(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: ["react-native@*"], production: "[]" },
      }),
      "requirements.production"
    );
  });

  it("is valid when 'requirements' contains at least one requirement", () => {
    equal(
      findEmptyRequirements({ requirements: ["react-native@*"] }),
      undefined
    );

    equal(
      findEmptyRequirements({
        requirements: {
          development: ["react-native@*"],
          production: ["react-native@*"],
        },
      }),
      undefined
    );
  });
});

describe("isPackageManifest()", () => {
  it("returns true when the object is a PackageManifest", () => {
    const manifest: PackageManifest = {
      name: "package name",
      version: "1.0.0",
    };
    ok(isPackageManifest(manifest));
  });

  it("returns false when the object is not a PackageManifest", () => {
    ok(!isPackageManifest(undefined));
    ok(!isPackageManifest({}));
    ok(!isPackageManifest("hello"));
    ok(!isPackageManifest({ name: "name but no version" }));
    ok(!isPackageManifest({ version: "version but no name" }));
  });
});

describe("loadConfig()", () => {
  const options = { excludePackages: undefined };

  const manifest: PackageManifest = {
    name: "@rnx-kit/align-deps",
    version: "1.0.0",
  };

  it("returns 'not-configured' when there is no config", () => {
    equal(
      loadConfig({ path: "package.json", manifest }, options),
      "not-configured"
    );

    equal(
      loadConfig(
        { path: "package.json", manifest: { ...manifest, "rnx-kit": {} } },
        options
      ),
      "not-configured"
    );
  });

  it("returns 'legacy-configuration' when the old schema is used", () => {
    const legacyManifest = {
      ...manifest,
      "rnx-kit": {
        reactNativeVersion: "^0.72.0",
        capabilities: ["core-ios"],
      },
    } as PackageManifest;

    equal(
      loadConfig({ path: "package.json", manifest: legacyManifest }, options),
      "legacy-configuration"
    );
  });

  it("warns about leftover legacy keys", (t) => {
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const mixedManifest = {
      ...manifest,
      "rnx-kit": {
        reactNativeVersion: "^0.72.0",
        alignDeps: { requirements: ["react-native@0.72"] },
      },
    } as PackageManifest;

    const config = loadConfig(
      { path: "package.json", manifest: mixedManifest },
      options
    );

    ok(typeof config === "object");
    equal(warnSpy.mock.callCount(), 1);
    ok(
      warnSpy.mock.calls[0].arguments.join(" ").includes("reactNativeVersion")
    );
  });
});

describe("sanitizeCapabilities()", () => {
  it("removes illegal names", () => {
    const capabilities = [
      "__proto__",
      "constructor",
      "prototype",
      "core",
    ] as Capability[];

    deepEqual(sanitizeCapabilities(capabilities), ["core"]);
  });

  it("handles empty array", () => {
    deepEqual(sanitizeCapabilities(undefined), []);
    deepEqual(sanitizeCapabilities([]), []);
  });
});
