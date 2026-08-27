import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { rnxBundle } from "../../src/bundle.ts";
import type { CLIPlatformBundleConfig } from "../../src/bundle/types.ts";

const mockLoadMetroConfig = jest.fn(() => Promise.resolve({ metro: true }));
jest.mock("@rnx-kit/metro-service", () => ({
  loadMetroConfig: (...args: unknown[]) => mockLoadMetroConfig(...args),
}));

let mockBundleConfigs: CLIPlatformBundleConfig[] = [];
jest.mock("../../src/bundle/kit-config.ts", () => ({
  getCliPlatformBundleConfigs: () => mockBundleConfigs,
}));

const mockMetroBundle = jest.fn(() => Promise.resolve());
jest.mock("../../src/bundle/metro.ts", () => ({
  metroBundle: (...args: unknown[]) => mockMetroBundle(...args),
}));

const mockEmitBytecode = jest.fn();
jest.mock("../../src/bundle/hermes.ts", () => ({
  emitBytecode: (...args: unknown[]) => mockEmitBytecode(...args),
}));

describe("rnxBundle", () => {
  const config = {} as CLIConfig;

  function makeBundleConfig(
    overrides: Partial<CLIPlatformBundleConfig> = {}
  ): CLIPlatformBundleConfig {
    return {
      platform: "ios",
      bundleOutput: "main.jsbundle",
      ...overrides,
    } as CLIPlatformBundleConfig;
  }

  afterEach(() => {
    jest.clearAllMocks();
    mockBundleConfigs = [];
  });

  it("bundles each platform configuration with Metro", async () => {
    mockBundleConfigs = [
      makeBundleConfig({ platform: "ios" }),
      makeBundleConfig({ platform: "android" }),
    ];

    await rnxBundle([], config, { dev: false });

    expect(mockLoadMetroConfig).toHaveBeenCalledTimes(1);
    expect(mockMetroBundle).toHaveBeenCalledTimes(2);
    expect(mockEmitBytecode).not.toHaveBeenCalled();
  });

  it("disables tree shaking for dev bundles", async () => {
    const bundleConfig = makeBundleConfig({ treeShake: true });
    mockBundleConfigs = [bundleConfig];

    await rnxBundle([], config, { dev: true });

    expect(bundleConfig.treeShake).toBe(false);
  });

  it("configures tree shaking metafile and minify for production bundles", async () => {
    const bundleConfig = makeBundleConfig({ treeShake: true });
    mockBundleConfigs = [bundleConfig];

    await rnxBundle([], config, { dev: false, metafile: true, minify: true });

    expect(bundleConfig.treeShake).toEqual({
      metafile: "main.jsbundle.meta.json",
      minify: true,
    });
  });

  it("uses a custom metafile path when provided as a string", async () => {
    const bundleConfig = makeBundleConfig({ treeShake: true });
    mockBundleConfigs = [bundleConfig];

    await rnxBundle([], config, { dev: false, metafile: "stats.json" });

    expect(bundleConfig.treeShake).toEqual({ metafile: "stats.json" });
  });

  it("emits Hermes bytecode when the bundle enables it", async () => {
    mockBundleConfigs = [
      makeBundleConfig({
        hermes: true,
        sourcemapOutput: "main.jsbundle.map",
      }),
    ];

    await rnxBundle([], config, { dev: false });

    expect(mockEmitBytecode).toHaveBeenCalledWith(
      config,
      "main.jsbundle",
      "main.jsbundle.map",
      {}
    );
  });

  it("forwards Hermes options when provided as an object", async () => {
    const hermes = { command: "hermesc" };
    mockBundleConfigs = [makeBundleConfig({ hermes })];

    await rnxBundle([], config, { dev: false });

    expect(mockEmitBytecode).toHaveBeenCalledWith(
      config,
      "main.jsbundle",
      undefined,
      hermes
    );
  });
});
