import "jest-extended";
import type { BundleDefinitionWithRequiredParameters } from "@rnx-kit/config";
import {
  getKitBundleConfigs,
  getKitBundleDefinition,
} from "../../src/bundle/kit-config";
import { KitBundleConfig } from "../../src/bundle/types";

describe("CLI > Bundle > Kit Config > getKitBundleDefinition", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

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
    platforms: {
      ios: {
        entryPath: "entry.ios.js",
      },
    },
  };

  test("returns no kit bundle configs when no platforms are given", () => {
    const kitBundleConfigs = getKitBundleConfigs(definition, []);
    expect(kitBundleConfigs).toBeArrayOfSize(0);
  });

  test("returns one kit bundle config when one platform is given", () => {
    const kitBundleConfigs = getKitBundleConfigs(definition, ["ios"]);
    expect(kitBundleConfigs).toBeArrayOfSize(1);
  });

  test("sets the platform property", () => {
    const kitBundleConfigs = getKitBundleConfigs(definition, [
      "ios",
      "android",
    ]);
    expect(kitBundleConfigs).toBeArrayOfSize(2);
    expect(kitBundleConfigs[0].platform).toEqual("ios");
    expect(kitBundleConfigs[1].platform).toEqual("android");
  });

  test("sets all bundle definition properties", () => {
    const kitBundleConfigs = getKitBundleConfigs(definition, ["android"]);
    expect(kitBundleConfigs).toBeArrayOfSize(1);
    expect(kitBundleConfigs[0]).toEqual({
      ...definition,
      platform: "android",
    });
  });
});
