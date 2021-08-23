import "jest-extended";
import type { BundleDefinitionWithRequiredParameters } from "@rnx-kit/config";
import { applyBundleDefinitionOverrides } from "../../src/bundle/overrides";

describe("CLI > Bundle > Overrides > applyBundleDefinitionOverrides", () => {
  const definition: BundleDefinitionWithRequiredParameters = {
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    experimental_treeShake: true,
    entryPath: "dist/index.js",
    distPath: "dist",
    assetsPath: "dist",
    bundlePrefix: "main",
  };

  test("returns bundle definition without any changes", () => {
    const copy = { ...definition };
    applyBundleDefinitionOverrides({}, copy);
    expect(copy).toEqual(definition);
  });

  function testOverride(name: string, value: unknown) {
    const copy = { ...definition };
    applyBundleDefinitionOverrides(
      {
        [name]: value,
      },
      copy
    );
    expect(copy).toEqual({
      ...definition,
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
    const copy = { ...definition };
    applyBundleDefinitionOverrides(
      {
        experimentalTreeShake: true,
      },
      copy
    );
    expect(copy).toEqual({
      ...definition,
      experimental_treeShake: true,
    });
  });
});
