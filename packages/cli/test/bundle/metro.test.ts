import { metroBundle } from "../../src/bundle/metro";
import type { CliPlatformBundleConfig } from "../../src/bundle/types";

jest.mock("fs");

describe("CLI > Bundle > Metro > metroBundle", () => {
  const { getDefaultConfig } = require("metro-config");

  afterEach(() => {
    jest.resetAllMocks();
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
    await metroBundle(metroConfig, bundleConfigNoPlugins, dev, minify);
    expect(metroConfig.serializer.customSerializer).toBeFalsy();
  });

  it("uses a custom serializer when at least one plugin is enabled", async () => {
    const metroConfig = await getDefaultConfig();
    expect(metroConfig.serializer.customSerializer).toBeFalsy();
    await metroBundle(metroConfig, bundleConfig, dev, minify);
    expect(metroConfig.serializer.customSerializer).toBeTruthy();
  });

  it("creates directories for the bundle, the source map, and assets", async () => {
    await metroBundle(await getDefaultConfig(), bundleConfig, dev, minify);

    const fs = require("fs");
    expect(Object.keys(fs.__toJSON())).toEqual(
      expect.arrayContaining([
        expect.stringContaining("/packages/cli/dist"),
        expect.stringContaining("/packages/cli/map"),
        expect.stringContaining("/packages/cli/src"),
      ])
    );
  });

  it("invokes the Metro bundler using all input parameters", async () => {
    const metroService = require("@rnx-kit/metro-service");
    const mockBundle = metroService.bundle;

    await metroBundle(await getDefaultConfig(), bundleConfig, dev, minify);

    expect(mockBundle).toHaveBeenCalledTimes(1);
    expect(mockBundle.mock.calls[0][0]).toEqual({
      ...bundleConfig,
      dev,
      minify,
    });
  });
});
