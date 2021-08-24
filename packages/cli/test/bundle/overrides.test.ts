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

  test("returns bundle definition without any changes", () => {
    const copy = { ...config };
    applyKitBundleConfigOverrides({}, copy);
    expect(copy).toEqual(config);
  });

  function testOverride(name: string, value: unknown) {
    const copy = { ...config };
    applyKitBundleConfigOverrides(
      {
        [name]: value,
      },
      copy
    );
    expect(copy).toEqual({
      ...config,
      [name]: value,
    });
  }

  test("returns bundle definition with entryPath override", () => {
    testOverride("entryPath", "out/entry.js");
  });

  test("returns bundle definition with distPath override", () => {
    testOverride("distPath", "out");
  });

  test("returns bundle definition with assetsPath override", () => {
    testOverride("assetsPath", "out/assets");
  });

  test("returns bundle definition with bundlePrefix override", () => {
    testOverride("bundlePrefix", "main");
  });

  test("returns bundle definition with bundleEncoding override", () => {
    testOverride("bundleEncoding", "utf8");
  });

  test("returns bundle definition with sourcemapOutput override", () => {
    testOverride("sourcemapOutput", "out/entry.map");
  });

  test("returns bundle definition with sourcemapSourcesRoot override", () => {
    testOverride("sourcemapSourcesRoot", "out");
  });

  test("returns bundle definition with experimentalTreeShake override", () => {
    const copy = { ...config };
    applyKitBundleConfigOverrides(
      {
        experimentalTreeShake: true,
      },
      copy
    );
    expect(copy).toEqual({
      ...config,
      experimental_treeShake: true,
    });
  });
});
