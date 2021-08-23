import "jest-extended";
import { BundleDefinitionWithRequiredParameters } from "../../../config/lib";
import {
  getKitBundleDefinition,
  getKitBundlePlatformDefinition,
} from "../../src/bundle/kit-config";

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

describe("CLI > Bundle > Kit Config > getKitBundlePlatformDefinition", () => {
  const definition: BundleDefinitionWithRequiredParameters = {
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    experimental_treeShake: true,
    entryPath: "dist/index.js",
    distPath: "dist",
    assetsPath: "dist",
    bundlePrefix: "main",
    platforms: {
      ios: {
        entryPath: "dist/index.ios.js",
      },
    },
  };

  test("returns bundle definition without any changes", () => {
    const platdef = getKitBundlePlatformDefinition(definition, "android", {});
    expect(platdef).toEqual(definition);
  });

  test("returns bundle definition with platform props", () => {
    const platdef = getKitBundlePlatformDefinition(definition, "ios", {});
    expect(platdef).toEqual({
      ...definition,
      entryPath: definition.platforms.ios.entryPath,
    });
  });

  function testOverride(name: string, value: unknown) {
    const platdef = getKitBundlePlatformDefinition(definition, "windows", {
      [name]: value,
    });
    expect(platdef).toEqual({
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
    const platdef = getKitBundlePlatformDefinition(definition, "windows", {
      experimentalTreeShake: true,
    });
    expect(platdef).toEqual({
      ...definition,
      experimental_treeShake: true,
    });
  });
});
