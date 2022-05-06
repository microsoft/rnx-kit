import "jest-extended";
import { applyKitBundleConfigOverrides } from "../../src/bundle/overrides";
import type { KitBundleConfig } from "../../src/bundle/types";

describe("CLI > Bundle > Overrides > applyKitBundleConfigOverrides", () => {
  const config: KitBundleConfig = {
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    experimental_treeShake: true,
    entryPath: "dist/index.js",
    distPath: "dist",
    assetsPath: "dist",
    bundlePrefix: "main",
    platform: "ios",
  };

  test("has no effect when no overrides are given", () => {
    const copy = { ...config };
    applyKitBundleConfigOverrides({}, [copy]);
    expect(copy).toEqual(config);
  });

  function testOverride(name: string, value: unknown) {
    const copy = { ...config };
    applyKitBundleConfigOverrides(
      {
        [name]: value,
      },
      [copy]
    );
    expect(copy).toEqual({
      ...config,
      [name]: value,
    });
  }

  test("changes entryPath using an override", () => {
    testOverride("entryPath", "out/entry.js");
  });

  test("changes distPath using an override", () => {
    testOverride("distPath", "out");
  });

  test("changes assetsPath using an override", () => {
    testOverride("assetsPath", "out/assets");
  });

  test("changes bundlePrefix using an override", () => {
    testOverride("bundlePrefix", "main");
  });

  test("changes bundleEncoding using an override", () => {
    testOverride("bundleEncoding", "utf8");
  });

  test("changes sourcemapOutput using an override", () => {
    testOverride("sourcemapOutput", "out/entry.map");
  });

  test("changes sourcemapSourcesRoot using an override", () => {
    testOverride("sourcemapSourcesRoot", "out");
  });

  test("set experimental_treeShake using override treeShake", () => {
    const copy = { ...config };
    applyKitBundleConfigOverrides(
      {
        treeShake: true,
      },
      [copy]
    );
    expect(copy).toEqual({
      ...config,
      experimental_treeShake: true,
    });
  });
});
