import { getKitServerConfig } from "../../src/serve/kit-config.ts";

const mockGetKitConfig = jest.fn();
const mockGetBundleConfig = jest.fn();

jest.mock("@rnx-kit/config", () => ({
  getKitConfig: (...args: unknown[]) => mockGetKitConfig(...args),
  getBundleConfig: (...args: unknown[]) => mockGetBundleConfig(...args),
}));

describe("serve/kit-config/getKitServerConfig()", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the default plugins with tree shaking disabled when there is no kit config", () => {
    mockGetKitConfig.mockReturnValueOnce(undefined);

    const config = getKitServerConfig({});

    expect(config.plugins).toEqual([
      "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
      "@rnx-kit/metro-plugin-duplicates-checker",
    ]);
    expect(config.treeShake).toBe(false);
    expect(mockGetBundleConfig).not.toHaveBeenCalled();
  });

  it("uses the `server` config when present", () => {
    mockGetKitConfig.mockReturnValueOnce({
      server: { assetPlugins: ["kit-asset-plugin"] },
    });

    const config = getKitServerConfig({});

    expect(config.assetPlugins).toEqual(["kit-asset-plugin"]);
    expect(config.treeShake).toBe(false);
    expect(mockGetBundleConfig).not.toHaveBeenCalled();
  });

  it("falls back to the bundle config when there is no `server` config", () => {
    mockGetKitConfig.mockReturnValueOnce({ bundle: {} });
    mockGetBundleConfig.mockReturnValueOnce({
      detectCyclicDependencies: true,
      detectDuplicateDependencies: false,
      typescriptValidation: true,
      plugins: ["bundle-plugin"],
      // Not part of the server config; should be ignored.
      entryFile: "index.js",
    });

    const config = getKitServerConfig({ id: "main" });

    expect(mockGetBundleConfig).toHaveBeenCalledWith({ bundle: {} }, "main");
    expect(config.plugins).toEqual(["bundle-plugin"]);
    expect(config).not.toHaveProperty("entryFile");
    expect(config.treeShake).toBe(false);
  });

  it("applies overrides on top of the resolved config", () => {
    mockGetKitConfig.mockReturnValueOnce(undefined);

    const config = getKitServerConfig({
      projectRoot: "/repo",
      assetPlugins: ["override-plugin"],
      sourceExts: ["ts", "tsx"],
    });

    expect(config.projectRoot).toBe("/repo");
    expect(config.assetPlugins).toEqual(["override-plugin"]);
    expect(config.sourceExts).toEqual(["ts", "tsx"]);
  });
});
