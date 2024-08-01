import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import type { BundleConfig } from "../src/bundleConfig";
import {
  getBundleConfig,
  getPlatformBundleConfig,
} from "../src/getBundleConfig";
import type { KitConfig } from "../src/kitConfig";

const kitConfig: KitConfig = {
  bundle: [
    {
      id: "8",
      targets: ["windows"],
    },
    {
      id: "123abc",
      targets: ["ios", "android", "windows"],
    },
  ],
};

describe("getBundleConfig()", () => {
  it("returns undefined when the bundle property is not set", () => {
    ok(!getBundleConfig({}));
  });

  it("returns undefined when the bundle property is set to undefined", () => {
    ok(!getBundleConfig({ bundle: undefined }));
  });

  it("fails when the bundle property is set to true (no longer supported)", () => {
    throws(
      () => getBundleConfig({ bundle: true as unknown as BundleConfig }),
      new Error(
        "The rnx-kit configuration property 'bundle' no longer supports boolean values. Bundling is always enabled with sensible defaults. You should remove the 'bundle' property to make use of the defaults, or specify the bundle configuration as an object."
      )
    );
  });

  it("returns the bundle config associated with the given id", () => {
    const d = getBundleConfig(kitConfig, "123abc");
    equal(d?.id, "123abc");
    ok(Array.isArray(d?.targets));
    equal(d?.targets?.length, 3);
    deepEqual(d?.targets, ["ios", "android", "windows"]);
  });

  it("returns undefined when the bundle id is not found", () => {
    ok(!getBundleConfig(kitConfig, "does-not-exist"));
  });

  it("returns undefined when trying to find the first bundle and none are defined in config", () => {
    ok(!getBundleConfig({ bundle: [] }));
  });

  it("returns the first bundle definition when an id is not given", () => {
    const d = getBundleConfig(kitConfig);
    equal(d?.id, "8");
    ok(Array.isArray(d?.targets));
    equal(d?.targets?.length, 1);
    deepEqual(d?.targets, ["windows"]);
  });

  it("fails when bundle config contains renamed property experimental_treeShake", () => {
    throws(
      () =>
        getBundleConfig({
          bundle: { experimental_treeShake: true } as BundleConfig,
        }),
      new Error(
        "The bundle configuration property 'experimental_treeShake' is no longer supported. Use 'treeShake' instead."
      )
    );
  });

  it("fails when bundle config contains renamed property entryPath", () => {
    throws(
      () => getBundleConfig({ bundle: { entryPath: "x" } as BundleConfig }),
      new Error(
        "The bundle configuration property 'entryPath' is no longer supported. Use 'entryFile' instead."
      )
    );
  });

  it("fails when bundle config contains renamed property sourceMapPath", () => {
    throws(
      () => getBundleConfig({ bundle: { sourceMapPath: "x" } as BundleConfig }),
      new Error(
        "The bundle configuration property 'sourceMapPath' is no longer supported. Use 'sourcemapOutput' instead."
      )
    );
  });

  it("fails when bundle config contains renamed property sourceMapSourceRootPath", () => {
    throws(
      () =>
        getBundleConfig({
          bundle: { sourceMapSourceRootPath: "x" } as BundleConfig,
        }),
      new Error(
        "The bundle configuration property 'sourceMapSourceRootPath' is no longer supported. Use 'sourcemapSourcesRoot' instead."
      )
    );
  });

  it("fails when bundle config contains defunct property distPath", () => {
    throws(
      () => getBundleConfig({ bundle: { distPath: "x" } as BundleConfig }),
      new Error(
        "The bundle configuration property 'distPath' is no longer supported. You can control the bundle path and source-map path using 'bundleOutput' and 'sourcemapOutput', respectively."
      )
    );
  });

  it("fails when bundle config contains defunct property bundlePrefix", () => {
    throws(
      () => getBundleConfig({ bundle: { bundlePrefix: "x" } as BundleConfig }),
      new Error(
        "The bundle configuration property 'bundlePrefix' is no longer supported. You can control the bundle file name using 'bundleOutput'."
      )
    );
  });
});

const bundleConfigWithoutPlatforms: BundleConfig = {
  entryFile: "main.js",
  bundleOutput: "main.bundle",
};

const bundleConfig: BundleConfig = {
  ...bundleConfigWithoutPlatforms,
  platforms: {
    ios: {
      bundleOutput: "main.ios.jsbundle",
    },
  },
};

describe("getBundlePlatformConfig()", () => {
  it("returns the input bundle config when no platform overrides exist", () => {
    const d = getPlatformBundleConfig(bundleConfigWithoutPlatforms, "android");
    equal(d, bundleConfigWithoutPlatforms);
  });

  it("returns the input bundle config when the given platform doesn't have any overrides", () => {
    const d = getPlatformBundleConfig(bundleConfig, "android");
    equal(d, bundleConfig);
  });

  it("returns the a platform-specific bundle config", () => {
    const d = getPlatformBundleConfig(bundleConfig, "ios");
    equal(d.bundleOutput, "main.ios.jsbundle");
  });
});
