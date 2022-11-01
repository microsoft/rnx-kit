import { initializeConfig } from "../src/initialize";

jest.mock("fs");

describe("initializeConfig()", () => {
  const fs = require("fs");

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

  const mockManifest = {
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
  };

  const mockCapabilities = [
    "core",
    "core-android",
    "core-ios",
    "netinfo",
    "webview",
  ];

  beforeEach(() => {
    const unset = () => {
      throw new Error("unset");
    };
    fs.__setMockContent(unset);
    fs.__setMockFileWriter(unset);
  });

  test("returns early if capabilities are declared", () => {
    fs.__setMockContent({ "rnx-kit": { capabilities: [] } });

    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    initializeConfig("package.json", {});
    expect(didWrite).toBe(false);
  });

  test("returns early if no capabilities are found", () => {
    fs.__setMockContent({ name: "@rnx-kit/dep-check", version: "1.0.0-test" });

    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    initializeConfig("package.json", {});
    expect(didWrite).toBe(false);
  });

  test("keeps existing config", () => {
    fs.__setMockContent({
      dependencies: {
        "react-native": "^0.64.1",
      },
      "rnx-kit": {
        platformBundle: false,
        bundle,
      },
    });

    let content = {};
    fs.__setMockFileWriter((_: string, data: string) => {
      content = JSON.parse(data);
    });

    initializeConfig("package.json", {});

    const kitConfig = content["rnx-kit"];
    if (!kitConfig) {
      fail();
    }

    expect(kitConfig["platformBundle"]).toBe(false);
    expect(kitConfig["bundle"]).toEqual(bundle);
  });

  test('adds config with type "app"', () => {
    fs.__setMockContent(mockManifest);

    let content = {};
    fs.__setMockFileWriter((_: string, data: string) => {
      content = JSON.parse(data);
    });

    initializeConfig("package.json", { kitType: "app" });

    const kitConfig = content["rnx-kit"];
    if (!kitConfig) {
      fail();
    }

    expect(kitConfig["bundle"]).toEqual(bundle);
    expect(kitConfig["reactNativeVersion"]).toEqual("^0.64");
    expect(kitConfig["reactNativeDevVersion"]).toBeUndefined();
    expect(kitConfig["kitType"]).toEqual("app");
    expect(kitConfig["capabilities"]).toEqual(mockCapabilities);
    expect(kitConfig["customProfiles"]).toBeUndefined();
  });

  test('adds config with type "library"', () => {
    fs.__setMockContent(mockManifest);

    let content = {};
    fs.__setMockFileWriter((_: string, data: string) => {
      content = JSON.parse(data);
    });

    initializeConfig("package.json", { kitType: "library" });

    const kitConfig = content["rnx-kit"];
    if (!kitConfig) {
      fail();
    }

    expect(kitConfig["bundle"]).toEqual(bundle);
    expect(kitConfig["reactNativeVersion"]).toEqual("^0.64");
    expect(kitConfig["reactNativeDevVersion"]).toEqual("0.64.0");
    expect(kitConfig["kitType"]).toEqual("library");
    expect(kitConfig["capabilities"]).toEqual(mockCapabilities);
    expect(kitConfig["customProfiles"]).toBeUndefined();
  });

  // Test disabled because custom profile now depends on align-deps
  xtest("adds config with custom profiles", () => {
    fs.__setMockContent(mockManifest);

    let content = {};
    fs.__setMockFileWriter((_: string, data: string) => {
      content = JSON.parse(data);
    });

    initializeConfig("package.json", {
      kitType: "library",
      customProfilesPath: "@rnx-kit/scripts/rnx-align-deps.js",
    });

    const kitConfig = content["rnx-kit"];
    if (!kitConfig) {
      fail();
    }

    expect(kitConfig["customProfiles"]).toEqual(
      "@rnx-kit/scripts/rnx-align-deps.js"
    );
  });
});
