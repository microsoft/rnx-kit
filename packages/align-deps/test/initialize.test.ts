import {
  initializeConfig,
  makeInitializeCommand,
} from "../src/commands/initialize";
import { defaultConfig } from "../src/config";

const defaultOptions = {
  presets: defaultConfig.presets,
  loose: false,
  migrateConfig: false,
  verbose: false,
  write: false,
};

describe("initializeConfig()", () => {
  const bundle = {
    entryPath: "src/index.ts",
    distPath: "dist",
    assetsPath: "dist",
    bundlePrefix: "main",
    targets: ["ios", "android", "macos", "windows"],
    platforms: {
      android: {
        assetsPath: "dist/res",
      },
    },
  };

  test("returns early if capabilities are declared", () => {
    const result = initializeConfig(
      {
        name: "@rnx-kit/align-deps",
        version: "0.0.0-test",
        "rnx-kit": { alignDeps: {} },
      },
      ".",
      "library",
      { ...defaultOptions, presets: [] }
    );

    expect(result).toBeNull();
  });

  test("returns early if no capabilities are found", () => {
    const result = initializeConfig(
      {
        name: "@rnx-kit/align-deps",
        version: "0.0.0-test",
      },
      ".",
      "library",
      { ...defaultOptions, presets: [] }
    );

    expect(result).toBeNull();
  });

  test("keeps existing config", () => {
    const result = initializeConfig(
      {
        name: "@rnx-kit/align-deps",
        version: "0.0.0-test",
        dependencies: {
          "react-native": "^0.64.1",
        },
        "rnx-kit": {
          platformBundle: false,
          bundle,
        },
      },
      ".",
      "library",
      defaultOptions
    );

    const kitConfig = result?.["rnx-kit"];
    if (!kitConfig) {
      fail();
    }

    expect(kitConfig["platformBundle"]).toBe(false);
    expect(kitConfig["bundle"]).toEqual(bundle);
  });

  test('adds config with type "app"', () => {
    const result = initializeConfig(
      {
        name: "@rnx-kit/align-deps",
        version: "0.0.0-test",
        dependencies: {
          "react-native": "^0.64.1",
        },
        peerDependencies: {
          "@react-native-community/netinfo": "^5.9.10",
          "react-native-webview": "^10.10.2",
        },
        "rnx-kit": {
          bundle,
        },
      },
      ".",
      "app",
      defaultOptions
    );

    const kitConfig = result?.["rnx-kit"];
    if (!kitConfig) {
      fail();
    }

    expect(kitConfig.bundle).toEqual(bundle);
    expect(kitConfig.kitType).toEqual("app");
    expect(kitConfig.alignDeps).toEqual({
      requirements: ["react-native@0.64"],
      capabilities: ["core", "core-android", "core-ios", "netinfo", "webview"],
    });
  });

  test('adds config with type "library"', () => {
    const result = initializeConfig(
      {
        name: "@rnx-kit/align-deps",
        version: "0.0.0-test",
        dependencies: {
          "react-native": "^0.64.1",
        },
        peerDependencies: {
          "@react-native-community/netinfo": "^5.9.10",
          "react-native-webview": "^10.10.2",
        },
        "rnx-kit": {
          bundle,
        },
      },
      ".",
      "library",
      defaultOptions
    );

    const kitConfig = result?.["rnx-kit"];
    if (!kitConfig) {
      fail();
    }

    expect(kitConfig.bundle).toEqual(bundle);
    expect(kitConfig.kitType).toEqual("library");
    expect(kitConfig.alignDeps).toEqual({
      requirements: {
        development: ["react-native@0.64"],
        production: ["react-native@0.64"],
      },
      capabilities: ["core", "core-android", "core-ios", "netinfo", "webview"],
    });
  });

  test("adds config with custom profiles", () => {
    const presets = [
      ...defaultConfig.presets,
      "@rnx-kit/scripts/align-deps-preset.js",
    ];
    const result = initializeConfig(
      {
        name: "@rnx-kit/align-deps",
        version: "0.0.0-test",
        dependencies: {
          "react-native": "^0.64.1",
        },
        peerDependencies: {
          "@react-native-community/netinfo": "^5.9.10",
          "react-native-webview": "^10.10.2",
        },
        "rnx-kit": {
          bundle,
        },
      },
      ".",
      "library",
      { ...defaultOptions, presets }
    );

    const alignDeps = result?.["rnx-kit"]?.alignDeps;
    if (!alignDeps) {
      fail();
    }

    expect(alignDeps["presets"]).toEqual(presets);
  });
});

describe("makeInitializeCommand()", () => {
  const options = { ...defaultOptions, presets: [] };

  test("returns undefined for invalid kit types", () => {
    const command = makeInitializeCommand("random", options);
    expect(command).toBeUndefined();
  });

  test("returns command for kit types", () => {
    expect(makeInitializeCommand("app", options)).toBeDefined();
    expect(makeInitializeCommand("library", options)).toBeDefined();
  });
});
