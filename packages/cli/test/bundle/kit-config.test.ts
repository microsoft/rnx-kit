import "jest-extended";
import {
  getTargetPlatforms,
  getCliPlatformBundleConfigs,
} from "../../src/bundle/kit-config";

const rnxKitConfig = require("@rnx-kit/config");

describe("CLI > Bundle > Kit Config > getTargetPlatforms", () => {
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

describe("CLI > Bundle > Kit Config > getCliPlatformBundleConfigs", () => {
  const defaultConfig = {
    entryFile: "index.js",
    sourcemapUseAbsolutePath: false,
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    treeShake: false,
  };

  const defaultConfigIOS = {
    ...defaultConfig,
    bundleOutput: "index.ios.jsbundle",
    platform: "ios",
  };

  const defaultConfigMacOS = {
    ...defaultConfig,
    bundleOutput: "index.macos.jsbundle",
    platform: "macos",
  };

  const defaultConfigAndroid = {
    ...defaultConfig,
    bundleOutput: "index.android.bundle",
    platform: "android",
  };

  const defaultConfigWindows = {
    ...defaultConfig,
    bundleOutput: "index.windows.bundle",
    platform: "windows",
  };

  beforeEach(() => {
    rnxKitConfig.__setMockConfig(undefined);
  });

  test("returns defaults for iOS when package has no config", () => {
    const configs = getCliPlatformBundleConfigs(undefined, "ios");
    expect(configs).toBeArrayOfSize(1);
    expect(configs[0]).toEqual(defaultConfigIOS);
  });

  test("returns defaults for MacOS when package has no config", () => {
    const configs = getCliPlatformBundleConfigs(undefined, "macos");
    expect(configs).toBeArrayOfSize(1);
    expect(configs[0]).toEqual(defaultConfigMacOS);
  });

  test("returns defaults for Android when package has no config", () => {
    const configs = getCliPlatformBundleConfigs(undefined, "android");
    expect(configs).toBeArrayOfSize(1);
    expect(configs[0]).toEqual(defaultConfigAndroid);
  });

  test("returns defaults for Windows when package has no config", () => {
    const configs = getCliPlatformBundleConfigs(undefined, "windows");
    expect(configs).toBeArrayOfSize(1);
    expect(configs[0]).toEqual(defaultConfigWindows);
  });

  const testConfig = {
    bundle: {
      entryFile: "entry.js",
      typescriptValidation: false,
      assetsDest: "dist",
      targets: ["ios", "macos", "android", "windows"],
    },
  };

  test("returns config with defaults for all target platforms", () => {
    rnxKitConfig.__setMockConfig(testConfig);
    const configs = getCliPlatformBundleConfigs();
    expect(configs).toBeArrayOfSize(4);
    expect(configs[0]).toEqual({ ...defaultConfigIOS, ...testConfig.bundle });
    expect(configs[1]).toEqual({ ...defaultConfigMacOS, ...testConfig.bundle });
    expect(configs[2]).toEqual({
      ...defaultConfigAndroid,
      ...testConfig.bundle,
    });
    expect(configs[3]).toEqual({
      ...defaultConfigWindows,
      ...testConfig.bundle,
    });
  });

  const testMultiConfig = {
    bundle: [
      {
        id: "first",
        entryFile: "first.js",
      },
      {
        id: "second",
        entryFile: "second.js",
      },
    ],
  };

  test("returns the first config when no id is given", () => {
    rnxKitConfig.__setMockConfig(testMultiConfig);
    const configs = getCliPlatformBundleConfigs(undefined, "ios");
    expect(configs).toBeArrayOfSize(1);
    expect(configs[0]).toEqual({
      ...defaultConfigIOS,
      ...testMultiConfig.bundle[0],
    });
  });

  test("returns the selected config when an id is given", () => {
    rnxKitConfig.__setMockConfig(testMultiConfig);
    const configs = getCliPlatformBundleConfigs("second", "android");
    expect(configs).toBeArrayOfSize(1);
    expect(configs[0]).toEqual({
      ...defaultConfigAndroid,
      ...testMultiConfig.bundle[1],
    });
  });
});
