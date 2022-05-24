import "jest-extended";
import type { KitConfig } from "../src/kitConfig";
import type { BundleDefinition } from "../src/bundleConfig";
import {
  getBundleDefinition,
  getBundlePlatformDefinition,
} from "../src/getBundleDefinition";

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

describe("getBundleDefinition()", () => {
  test("fails when bundle property is not set", () => {
    expect(() => getBundleDefinition({})).toThrowError(
      /Bundling is not enabled/i
    );
  });

  test("fails when bundle is set to undefined", () => {
    expect(() => getBundleDefinition({ bundle: undefined })).toThrowError(
      /Bundling is explicitly disabled/i
    );
  });

  test("fails when bundle is set to null", () => {
    expect(() => getBundleDefinition({ bundle: null })).toThrowError(
      /Bundling is explicitly disabled/i
    );
  });

  test("fails when bundle is set to false", () => {
    expect(() => getBundleDefinition({ bundle: false })).toThrowError(
      /Bundling is explicitly disabled/i
    );
  });

  test("returns default config (empty) when bundle is set to true", () => {
    expect(getBundleDefinition({ bundle: true })).toEqual({});
  });

  test("returns the bundle definition associated with the given id", () => {
    const d = getBundleDefinition(kitConfig, "123abc");
    expect(d.id).toEqual("123abc");
    expect(d.targets).toBeArrayOfSize(3);
    expect(d.targets).toIncludeSameMembers(["ios", "android", "windows"]);
  });

  test("fails when bundle id is not found", () => {
    expect(() => getBundleDefinition(kitConfig, "does-not-exist")).toThrowError(
      /Bundle definition with id 'does-not-exist'/i
    );
  });

  test("fails when trying to find the first bundle and none are defined in config", () => {
    expect(() => getBundleDefinition({ bundle: [] })).toThrowError(
      /No bundle definitions were found/i
    );
  });

  test("returns the first bundle definition when an id is not given", () => {
    const d = getBundleDefinition(kitConfig);
    expect(d.id).toEqual("8");
    expect(d.targets).toBeArrayOfSize(1);
    expect(d.targets).toIncludeSameMembers(["windows"]);
  });

  test("fails when config contains renamed property experimental_treeShake", () => {
    expect(() =>
      getBundleDefinition({
        bundle: { experimental_treeShake: true } as BundleDefinition,
      })
    ).toThrowError(
      /The 'experimental_treeShake' configuration property is no longer supported. Use 'treeShake' instead./i
    );
  });

  test("fails when config contains renamed property entryPath", () => {
    expect(() =>
      getBundleDefinition({
        bundle: { entryPath: "x" } as BundleDefinition,
      })
    ).toThrowError(
      /The 'entryPath' configuration property is no longer supported. Use 'entryFile' instead./i
    );
  });

  test("fails when config contains renamed property sourceMapPath", () => {
    expect(() =>
      getBundleDefinition({
        bundle: { sourceMapPath: "x" } as BundleDefinition,
      })
    ).toThrowError(
      /The 'sourceMapPath' configuration property is no longer supported. Use 'sourcemapOutput' instead./i
    );
  });

  test("fails when config contains renamed property sourceMapSourceRootPath", () => {
    expect(() =>
      getBundleDefinition({
        bundle: { sourceMapSourceRootPath: "x" } as BundleDefinition,
      })
    ).toThrowError(
      /The 'sourceMapSourceRootPath' configuration property is no longer supported. Use 'sourcemapSourcesRoot' instead./i
    );
  });

  test("fails when config contains defunct property distPath", () => {
    expect(() =>
      getBundleDefinition({
        bundle: { distPath: "x" } as BundleDefinition,
      })
    ).toThrowError(
      /The 'distPath' configuration property is no longer supported./i
    );
  });

  test("fails when config contains defunct property bundlePrefix", () => {
    expect(() =>
      getBundleDefinition({
        bundle: { bundlePrefix: "x" } as BundleDefinition,
      })
    ).toThrowError(
      /The 'bundlePrefix' configuration property is no longer supported./i
    );
  });
});

const bundleDefinitionWithoutPlatforms: BundleDefinition = {
  entryFile: "main.js",
  bundleOutput: "main.bundle",
};

const bundleDefinition: BundleDefinition = {
  ...bundleDefinitionWithoutPlatforms,
  platforms: {
    ios: {
      bundleOutput: "main.ios.jsbundle",
    },
  },
};

describe("getBundlePlatformDefinition()", () => {
  test("returns the input bundle definition when no platform overrides exist", () => {
    const d = getBundlePlatformDefinition(
      bundleDefinitionWithoutPlatforms,
      "android"
    );
    expect(d).toBe(bundleDefinitionWithoutPlatforms);
  });

  test("returns the input bundle definition when the given platform doesn't have any overrides", () => {
    const d = getBundlePlatformDefinition(bundleDefinition, "android");
    expect(d).toBe(bundleDefinition);
  });

  test("returns the an overridden bundle definition", () => {
    const d = getBundlePlatformDefinition(bundleDefinition, "ios");
    expect(d.bundleOutput).toEqual("main.ios.jsbundle");
  });
});
