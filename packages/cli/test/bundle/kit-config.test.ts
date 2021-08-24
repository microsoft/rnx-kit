import "jest-extended";
import type { BundleDefinitionWithRequiredParameters } from "@rnx-kit/config";
import {
  getKitBundleConfigs,
  getKitBundleDefinition,
  getTargetPlatforms,
} from "../../src/bundle/kit-config";

const rnxKitConfig = require("@rnx-kit/config");
const consoleWarnSpy = jest.spyOn(global.console, "warn");

describe("CLI > Bundle > Kit Config > getKitBundleDefinition", () => {
  beforeEach(() => {
    rnxKitConfig.__setMockConfig(undefined);
    consoleWarnSpy.mockReset();
  });

  test("throws when kit config is not found", () => {
    expect(() => getKitBundleDefinition()).toThrowError();
  });

  test("returns undefined with a warning message when bundle configuration is missing", () => {
    rnxKitConfig.__setMockConfig({});
    expect(getKitBundleDefinition()).toBeUndefined();
    expect(consoleWarnSpy).toBeCalledTimes(1);
    expect(consoleWarnSpy).toBeCalledWith(
      expect.anything(),
      expect.stringContaining("No bundle configuration found")
    );
  });

  test("returns undefined with a warning message when bundling is disabled", () => {
    rnxKitConfig.__setMockConfig({ bundle: false });
    expect(getKitBundleDefinition()).toBeUndefined();
    expect(consoleWarnSpy).toBeCalledTimes(1);
    expect(consoleWarnSpy).toBeCalledWith(
      expect.anything(),
      expect.stringContaining("Bundling is disabled")
    );
  });

  test("returns a bundle definition when bundling is enabled", () => {
    rnxKitConfig.__setMockConfig({ bundle: true });
    const definition = getKitBundleDefinition();
    expect(consoleWarnSpy).not.toBeCalled();
    expect(definition).toBeObject();
    expect(definition.entryPath).toBeString();
    expect(definition.entryPath.length).toBeGreaterThan(0);
  });
});

describe("CLI > Bundle > Kit Config > getTargetPlatforms  ", () => {
  test("returns the override platform", () => {
    const platforms = getTargetPlatforms("ios", ["android", "ios", "windows"]);
    expect(platforms).toBeArrayOfSize(1);
    expect(platforms).toIncludeSameMembers(["ios"]);
  });

  test("returns the target platforms", () => {
    const platforms = getTargetPlatforms(undefined, [
      "android",
      "ios",
      "windows",
    ]);
    expect(platforms).toBeArrayOfSize(3);
    expect(platforms).toIncludeSameMembers(["android", "ios", "windows"]);
  });

  test("throws when no override or target platform is given", () => {
    expect(() => getTargetPlatforms()).toThrowError();
  });
});

describe("CLI > Bundle > Kit Config > getKitBundleConfigs", () => {
  const definition: BundleDefinitionWithRequiredParameters = {
    entryPath: "start.js",
    distPath: "out",
    assetsPath: "out/assets",
    bundlePrefix: "fabrikam",
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    experimental_treeShake: true,
    targets: ["ios", "android"],
    platforms: {
      ios: {
        entryPath: "entry.ios.js",
      },
    },
  };

  beforeEach(() => {
    rnxKitConfig.__setMockConfig({
      bundle: {
        ...definition,
      },
    });
    consoleWarnSpy.mockReset();
  });

  test("returns one kit bundle config when an override platform is given", () => {
    const kitBundleConfigs = getKitBundleConfigs(undefined, "ios");
    expect(kitBundleConfigs).toBeArrayOfSize(1);
  });

  test("sets the platform property", () => {
    const kitBundleConfigs = getKitBundleConfigs();
    expect(kitBundleConfigs).toBeArrayOfSize(2);
    expect(kitBundleConfigs[0].platform).toEqual("ios");
    expect(kitBundleConfigs[1].platform).toEqual("android");
  });

  test("sets all bundle definition properties", () => {
    const kitBundleConfigs = getKitBundleConfigs();
    expect(kitBundleConfigs).toBeArrayOfSize(2);
    expect(kitBundleConfigs[0]).toEqual({
      ...definition,
      entryPath: "entry.ios.js",
      platform: "ios",
    });
    expect(kitBundleConfigs[1]).toEqual({
      ...definition,
      platform: "android",
    });
  });
});
