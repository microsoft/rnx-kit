import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import path from "path";
import { createMetroBundleArgs } from "../../src/bundle/metro";
import type { BundleConfig } from "../../src/bundle/types";

describe("CLI > Bundle > Metro > createMetroBundleArgs", () => {
  const bundleConfig: BundleConfig = {
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    experimental_treeShake: true,
    entryPath: "out/entry.js",
    distPath: "out",
    assetsPath: "out/assets",
    bundlePrefix: "my-app",
    platform: "ios",
    dev: true,
    minify: true,
    sourceMapPath: "abc.map",
    sourceMapSourceRootPath: "root-path-for-source-maps",
  };

  test("sets assetsDest", () => {
    expect(createMetroBundleArgs(bundleConfig).assetsDest).toEqual(
      bundleConfig.assetsPath
    );
  });

  test("sets entryFile", () => {
    expect(createMetroBundleArgs(bundleConfig).entryFile).toEqual(
      bundleConfig.entryPath
    );
  });

  test("sets minify", () => {
    expect(createMetroBundleArgs(bundleConfig).minify).toEqual(
      bundleConfig.minify
    );
  });

  test("sets platform", () => {
    expect(createMetroBundleArgs(bundleConfig).platform).toEqual(
      bundleConfig.platform
    );
  });

  test("sets dev", () => {
    expect(createMetroBundleArgs(bundleConfig).dev).toEqual(bundleConfig.dev);
  });

  function testBundleFileExtension(
    platform: AllPlatforms,
    expectedExtension: string
  ): void {
    const copy: BundleConfig = { ...bundleConfig, platform };
    const args = createMetroBundleArgs(copy);
    expect(path.extname(args.bundleOutput).toLowerCase()).toEqual(
      expectedExtension
    );
  }

  test("sets bundle file extension to .bundle for android", () => {
    testBundleFileExtension("android", ".bundle");
  });

  test("sets bundle file extension to .jsbundle for ios", () => {
    testBundleFileExtension("ios", ".jsbundle");
  });

  test("sets bundle file extension to .jsbundle for macos", () => {
    testBundleFileExtension("macos", ".jsbundle");
  });

  test("sets bundle file extension to .bundle for windows", () => {
    testBundleFileExtension("windows", ".bundle");
  });

  test("sets bundle file extension to .bundle for win32", () => {
    testBundleFileExtension("win32", ".bundle");
  });

  test("sets bundleOutput to prefix + platform + extension under distPath", () => {
    expect(createMetroBundleArgs(bundleConfig).bundleOutput).toEqual(
      path.join(bundleConfig.distPath, "my-app.ios.jsbundle")
    );
  });

  test("sets bundleEncoding", () => {
    expect(createMetroBundleArgs(bundleConfig).bundleEncoding).toEqual(
      bundleConfig.bundleEncoding
    );
  });

  test("always sets sourcemapOutput in dev mode", () => {
    const copy: BundleConfig = { ...bundleConfig, dev: true };
    delete copy.sourceMapPath;

    const args = createMetroBundleArgs(copy);
    expect(args.sourcemapOutput).toEqual(args.bundleOutput + ".map");
  });

  test("sets sourcemapOutput in production mode", () => {
    const copy: BundleConfig = { ...bundleConfig, dev: false };
    const args = createMetroBundleArgs(copy);
    expect(args.sourcemapOutput).toEqual(
      path.join(bundleConfig.distPath, bundleConfig.sourceMapPath)
    );
  });

  test("sets sourcemapSourcesRoot", () => {
    expect(createMetroBundleArgs(bundleConfig).sourcemapSourcesRoot).toEqual(
      bundleConfig.sourceMapSourceRootPath
    );
  });
});
