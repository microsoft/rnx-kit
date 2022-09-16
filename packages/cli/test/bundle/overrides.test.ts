import "jest-extended";
import {
  applyBundleConfigOverrides,
  overridableCommonBundleOptions,
} from "../../src/bundle/overrides";
import type { CliPlatformBundleConfig } from "../../src/bundle/types";

describe("CLI > Bundle > Overrides > applyBundleConfigOverrides", () => {
  const config: CliPlatformBundleConfig = {
    entryFile: "src/index.js",
    bundleOutput: "main.jsbundle",
    sourcemapUseAbsolutePath: false,
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    treeShake: true,
    indexedRamBundle: false,
    platform: "ios",
  };

  test("has no effect when no overrides are given", () => {
    const copy = { ...config };
    applyBundleConfigOverrides(
      {},
      [copy],
      [...overridableCommonBundleOptions, "treeShake"]
    );
    expect(copy).toEqual(config);
  });

  function testOverride(name: string, value: unknown) {
    const copy = { ...config };
    if (name in copy) {
      if (name !== undefined && name !== null) {
        expect(copy[name]).not.toEqual(value);
      }
    }
    applyBundleConfigOverrides(
      { [name]: value },
      [copy],
      [...overridableCommonBundleOptions, "treeShake", "indexedRamBundle"]
    );
    expect(copy).toEqual({
      ...config,
      [name]: value,
    });
  }

  test("changes `entryFile` using an override", () => {
    testOverride("entryFile", "foo.js");
  });

  test("changes `bundleOutput` using an override", () => {
    testOverride("bundleOutput", "foo.bundle");
  });

  test("sets `bundleEncoding` using an override", () => {
    testOverride("bundleEncoding", "utf8");
  });

  test("sets `sourcemapOutput` using an override", () => {
    testOverride("sourcemapOutput", "out/foo.map");
  });

  test("sets `sourcemapSourcesRoot` using an override", () => {
    testOverride("sourcemapSourcesRoot", "/myrepo/packags/foo");
  });

  test("changes `sourcemapUseAbsolutePath` using an override", () => {
    testOverride("sourcemapUseAbsolutePath", true);
  });

  test("sets `assetsDest` using an override", () => {
    testOverride("assetsDest", "dist");
  });

  test("changes `treeShake` using an override", () => {
    testOverride("treeShake", false);
  });

  test("changes `indexedRamBundle` using an override", () => {
    testOverride("indexedRamBundle", true);
  });
});
