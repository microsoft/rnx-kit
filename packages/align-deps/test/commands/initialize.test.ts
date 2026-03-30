import { deepEqual, equal, ok } from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  initializeConfig,
  makeInitializeCommand,
} from "../../src/commands/initialize.ts";
import { defaultConfig } from "../../src/config.ts";
import { defineRequire, undefineRequire } from "../helpers.ts";

const defaultOptions = {
  presets: defaultConfig.presets,
  loose: false,
  migrateConfig: false,
  noUnmanaged: false,
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

  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
  });

  it("returns early if capabilities are declared", () => {
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

    equal(result, null);
  });

  it("returns early if no capabilities are found", () => {
    const result = initializeConfig(
      {
        name: "@rnx-kit/align-deps",
        version: "0.0.0-test",
      },
      ".",
      "library",
      { ...defaultOptions, presets: [] }
    );

    equal(result, null);
  });

  it("keeps existing config", () => {
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

    ok(!kitConfig["platformBundle"]);
    deepEqual(kitConfig["bundle"], bundle);
  });

  it('adds config with type "app"', () => {
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

    deepEqual(kitConfig.bundle, bundle);
    equal(kitConfig.kitType, "app");
    deepEqual(kitConfig.alignDeps, {
      presets: undefined,
      requirements: ["react-native@0.64"],
      capabilities: ["core", "core-android", "core-ios", "netinfo", "webview"],
    });
  });

  it('adds config with type "library"', () => {
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

    deepEqual(kitConfig.bundle, bundle);
    equal(kitConfig.kitType, "library");
    deepEqual(kitConfig.alignDeps, {
      presets: undefined,
      requirements: {
        development: ["react-native@0.64"],
        production: ["react-native@0.64"],
      },
      capabilities: ["core", "core-android", "core-ios", "netinfo", "webview"],
    });
  });

  it("adds config with custom profiles", () => {
    const presets = [
      ...defaultConfig.presets,
      "@rnx-kit/scripts/align-deps-preset.cjs",
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

    deepEqual(alignDeps["presets"], presets);
  });
});

describe("makeInitializeCommand()", () => {
  const options = { ...defaultOptions, presets: [] };

  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
  });

  it("returns undefined for invalid kit types", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    ok(!makeInitializeCommand("random", options));
    equal(errorSpy.mock.callCount(), 1);
  });

  it("returns command for kit types", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    ok(makeInitializeCommand("app", options));
    ok(makeInitializeCommand("library", options));
    equal(errorSpy.mock.callCount(), 0);
  });
});
