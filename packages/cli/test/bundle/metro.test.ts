import { mockFS } from "@rnx-kit/tools-filesystem/mocks";
import { metroBundle } from "../../src/bundle/metro";
import type { CliPlatformBundleConfig } from "../../src/bundle/types";

describe("bundle/metro/metroBundle()", () => {
  const { getDefaultConfig } = require("metro-config");

  const bundle = jest.fn(() => Promise.resolve());

  afterEach(() => {
    bundle.mockReset();
  });

  const bundleConfigNoPlugins: CliPlatformBundleConfig = {
    entryFile: "out/entry.js",
    bundleOutput: "src/main.jsbundle",
    treeShake: false,
    plugins: [],
    platform: "ios",
    sourcemapOutput: "map/main.map",
    sourcemapSourcesRoot: "root-path-for-source-maps",
    sourcemapUseAbsolutePath: false,
    assetsDest: "dist",
  };

  const bundleConfig: CliPlatformBundleConfig = {
    ...bundleConfigNoPlugins,
    treeShake: true,
    plugins: [
      "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
      "@rnx-kit/metro-plugin-duplicates-checker",
      "@rnx-kit/metro-plugin-typescript",
    ],
  };

  const dev = true;
  const minify = true;

  it("does not use a custom serializer when all plugins are disabled", async () => {
    const metroConfig = await getDefaultConfig();

    expect(metroConfig.serializer.customSerializer).toBeFalsy();

    await metroBundle(
      metroConfig,
      bundleConfigNoPlugins,
      dev,
      minify,
      bundle,
      mockFS({})
    );

    expect(metroConfig.serializer.customSerializer).toBeFalsy();
  });

  it("uses a custom serializer when at least one plugin is enabled", async () => {
    const metroConfig = await getDefaultConfig();

    expect(metroConfig.serializer.customSerializer).toBeFalsy();

    await metroBundle(
      metroConfig,
      bundleConfig,
      dev,
      minify,
      bundle,
      mockFS({})
    );

    expect(metroConfig.serializer.customSerializer).toBeTruthy();
  });

  it("creates directories for the bundle, the source map, and assets", async () => {
    const files = {};
    const metroConfig = await getDefaultConfig();
    await metroBundle(
      metroConfig,
      bundleConfig,
      dev,
      minify,
      bundle,
      mockFS(files)
    );

    expect(Object.keys(files)).toEqual(["src", "map", "dist"]);
  });

  it("invokes the Metro bundler using all input parameters", async () => {
    await metroBundle(
      await getDefaultConfig(),
      bundleConfig,
      dev,
      minify,
      bundle,
      mockFS({})
    );

    expect(bundle).toHaveBeenCalledTimes(1);
    expect(bundle.mock.calls[0][0]).toEqual({
      ...bundleConfig,
      dev,
      minify,
    });
  });
});
