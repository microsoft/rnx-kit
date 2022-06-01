import "jest-extended";
import type { KitConfig } from "../src/kitConfig";
import type { BundleConfig } from "../src/bundleConfig";
import {
  getBundleConfig,
  getPlatformBundleConfig,
} from "../src/getBundleConfig";

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
  test("returns undefined when the bundle property is not set", () => {
    expect(getBundleConfig({})).toBeUndefined();
  });

  test("returns undefined when the bundle property is set to undefined", () => {
    expect(getBundleConfig({ bundle: undefined })).toBeUndefined();
  });

  test("fails when the bundle property is set to true (no longer supported)", () => {
    expect(() =>
      getBundleConfig({ bundle: true as BundleConfig })
    ).toThrowError(
      /The rnx-kit configuration property 'bundle' no longer supports boolean values./i
    );
  });

  test("returns the bundle config associated with the given id", () => {
    const d = getBundleConfig(kitConfig, "123abc");
    expect(d.id).toEqual("123abc");
    expect(d.targets).toBeArrayOfSize(3);
    expect(d.targets).toIncludeSameMembers(["ios", "android", "windows"]);
  });

  test("returns undefined when the bundle id is not found", () => {
    expect(getBundleConfig(kitConfig, "does-not-exist")).toBeUndefined();
  });

  test("returns undefined when trying to find the first bundle and none are defined in config", () => {
    expect(getBundleConfig({ bundle: [] })).toBeUndefined();
  });

  test("returns the first bundle definition when an id is not given", () => {
    const d = getBundleConfig(kitConfig);
    expect(d.id).toEqual("8");
    expect(d.targets).toBeArrayOfSize(1);
    expect(d.targets).toIncludeSameMembers(["windows"]);
  });

  test("fails when bundle config contains renamed property experimental_treeShake", () => {
    expect(() =>
      getBundleConfig({
        bundle: { experimental_treeShake: true } as BundleConfig,
      })
    ).toThrowError(
      /The bundle configuration property 'experimental_treeShake' is no longer supported. Use 'treeShake' instead./i
    );
  });

  test("fails when bundle config contains renamed property entryPath", () => {
    expect(() =>
      getBundleConfig({
        bundle: { entryPath: "x" } as BundleConfig,
      })
    ).toThrowError(
      /The bundle configuration property 'entryPath' is no longer supported. Use 'entryFile' instead./i
    );
  });

  test("fails when bundle config contains renamed property sourceMapPath", () => {
    expect(() =>
      getBundleConfig({
        bundle: { sourceMapPath: "x" } as BundleConfig,
      })
    ).toThrowError(
      /The bundle configuration property 'sourceMapPath' is no longer supported. Use 'sourcemapOutput' instead./i
    );
  });

  test("fails when bundle config contains renamed property sourceMapSourceRootPath", () => {
    expect(() =>
      getBundleConfig({
        bundle: { sourceMapSourceRootPath: "x" } as BundleConfig,
      })
    ).toThrowError(
      /The bundle configuration property 'sourceMapSourceRootPath' is no longer supported. Use 'sourcemapSourcesRoot' instead./i
    );
  });

  test("fails when bundle config contains defunct property distPath", () => {
    expect(() =>
      getBundleConfig({
        bundle: { distPath: "x" } as BundleConfig,
      })
    ).toThrowError(
      /The bundle configuration property 'distPath' is no longer supported./i
    );
  });

  test("fails when bundle config contains defunct property bundlePrefix", () => {
    expect(() =>
      getBundleConfig({
        bundle: { bundlePrefix: "x" } as BundleConfig,
      })
    ).toThrowError(
      /The bundle configuration property 'bundlePrefix' is no longer supported./i
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
  test("returns the input bundle config when no platform overrides exist", () => {
    const d = getPlatformBundleConfig(bundleConfigWithoutPlatforms, "android");
    expect(d).toBe(bundleConfigWithoutPlatforms);
  });

  test("returns the input bundle config when the given platform doesn't have any overrides", () => {
    const d = getPlatformBundleConfig(bundleConfig, "android");
    expect(d).toBe(bundleConfig);
  });

  test("returns the a platform-specific bundle config", () => {
    const d = getPlatformBundleConfig(bundleConfig, "ios");
    expect(d.bundleOutput).toEqual("main.ios.jsbundle");
  });
});
