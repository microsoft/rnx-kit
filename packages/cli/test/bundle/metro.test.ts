import "jest-extended";
import { metroBundle } from "../../src/bundle/metro";
import type { CliPlatformBundleConfig } from "../../src/bundle/types";

const { getDefaultConfig } = require("metro-config");

const mockCreateDirectory = jest.fn();
const toolsNodeFS = require("@rnx-kit/tools-node/fs");
toolsNodeFS.createDirectory = mockCreateDirectory;

const metroService = require("@rnx-kit/metro-service");
const mockBundle = metroService.bundle;

describe("CLI > Bundle > Metro > metroBundle", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const bundleConfigNoPlugins: CliPlatformBundleConfig = {
    entryFile: "out/entry.js",
    bundleOutput: "src/main.jsbundle",
    detectCyclicDependencies: false,
    detectDuplicateDependencies: false,
    typescriptValidation: false,
    treeShake: false,
    platform: "ios",
    sourcemapOutput: "map/main.map",
    sourcemapSourcesRoot: "root-path-for-source-maps",
    sourcemapUseAbsolutePath: false,
    assetsDest: "dist",
  };

  const bundleConfig: CliPlatformBundleConfig = {
    ...bundleConfigNoPlugins,
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    treeShake: true,
  };

  const dev = true;
  const minify = true;

  it("does not use a custom serializer when all plugins are disabled", async () => {
    const metroConfig = await getDefaultConfig();
    expect(metroConfig.serializer.customSerializer).toBeNil();
    await metroBundle(metroConfig, bundleConfigNoPlugins, dev, minify);
    expect(metroConfig.serializer.customSerializer).toBeNil();
  });

  it("uses a custom serializer when at least one plugin is enabled", async () => {
    const metroConfig = await getDefaultConfig();
    expect(metroConfig.serializer.customSerializer).toBeNil();
    await metroBundle(metroConfig, bundleConfig, dev, minify);
    expect(metroConfig.serializer.customSerializer).not.toBeNil();
  });

  it("creates directories for the bundle, the source map, and assets", async () => {
    await metroBundle(await getDefaultConfig(), bundleConfig, dev, minify);
    expect(mockCreateDirectory).toHaveBeenCalledTimes(3);
    expect(mockCreateDirectory).toHaveBeenNthCalledWith(1, "src");
    expect(mockCreateDirectory).toHaveBeenNthCalledWith(2, "map");
    expect(mockCreateDirectory).toHaveBeenNthCalledWith(3, "dist");
  });

  it("invokes the Metro bundler using all input parameters", async () => {
    await metroBundle(await getDefaultConfig(), bundleConfig, dev, minify);
    expect(mockBundle).toHaveBeenCalledTimes(1);
    expect(mockBundle.mock.calls[0][0]).toEqual({
      ...bundleConfig,
      dev,
      minify,
    });
  });
});
