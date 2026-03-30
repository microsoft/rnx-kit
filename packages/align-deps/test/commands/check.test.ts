import { equal, notEqual } from "node:assert/strict";
import type { PathOrFileDescriptor } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";
import { checkPackageManifest as checkPackageManifestActual } from "../../src/commands/check.ts";
import type { ConfigResult } from "../../src/config.ts";
import { defaultConfig, loadConfig } from "../../src/config.ts";
import { profile as profile_0_68 } from "../../src/presets/microsoft/react-native/profile-0.68.ts";
import { profile as profile_0_69 } from "../../src/presets/microsoft/react-native/profile-0.69.ts";
import { profile as profile_0_70 } from "../../src/presets/microsoft/react-native/profile-0.70.ts";
import type { Options } from "../../src/types.ts";
import * as mockfs from "../__mocks__/fs.ts";
import { defineRequire, packageVersion, undefineRequire } from "../helpers.ts";

const defaultOptions = {
  presets: defaultConfig.presets,
  loose: false,
  migrateConfig: false,
  noUnmanaged: false,
  verbose: false,
  write: false,
};

const writeOptions = {
  ...defaultOptions,
  write: true,
};

function checkPackageManifest(
  manifestPath: string,
  options: Options = defaultOptions,
  _inputConfig?: ConfigResult,
  logError?: (message: string) => void
) {
  const fs = mockfs as unknown as typeof import("node:fs");
  return checkPackageManifestActual(
    manifestPath,
    options,
    loadConfig(manifestPath, options, fs),
    logError,
    fs
  );
}

describe("checkPackageManifest({ kitType: 'library' })", () => {
  const mockManifest = {
    name: "@rnx-kit/align-deps",
    version: "0.0.1",
  };

  const noop = () => undefined;

  const react_v68_v69_v70 = [
    packageVersion(profile_0_68, "react"),
    packageVersion(profile_0_69, "react"),
    packageVersion(profile_0_70, "react"),
  ].join(" || ");

  const v68_v69_v70 = [
    packageVersion(profile_0_68, "core"),
    packageVersion(profile_0_69, "core"),
    packageVersion(profile_0_70, "core"),
  ].join(" || ");

  function mockConsole(t: it.TestContext) {
    return {
      logSpy: t.mock.method(console, "log", noop),
      warnSpy: t.mock.method(console, "warn", noop),
      errorSpy: t.mock.method(console, "error", noop),
    };
  }

  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  beforeEach(() => {
    mockfs.__setMockContent({});
  });

  after(() => {
    undefineRequire();
  });

  it("returns error code when reading invalid manifests", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    const result = checkPackageManifest("package.json");

    equal(result, "invalid-manifest");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("returns early if 'rnx-kit' is missing from the manifest", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "not-configured");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 1);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("prints warnings when detecting bad packages", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      peerDependencies: {
        "react-native": profile_0_70["core"],
      },
      devDependencies: {
        "react-native": profile_0_70["core"],
      },
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
        },
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 1);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("prints warnings when detecting bad packages (with version range)", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@^0.69.0 || ^0.70.0"],
        },
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 1);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("returns early if no capabilities are defined", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
        },
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("returns if no changes are needed", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("prints additional information with `--verbose`", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest("package.json", {
      ...defaultOptions,
      verbose: true,
    });

    equal(result, "success");
    equal(logSpy.mock.callCount(), 1);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("returns if no changes are needed (write: true)", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    let didWriteToPath: PathOrFileDescriptor | false = false;

    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
          capabilities: ["core-ios"],
        },
      },
    });
    mockfs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });

    equal(checkPackageManifest("package.json", writeOptions), "success");
    equal(didWriteToPath, false);
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("returns error code if changes are needed", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest(
      "package.json",
      defaultOptions,
      undefined,
      (message) => {
        equal(
          message,
          `package.json
      ├── peerDependencies["react"]: dependency is missing, expected "18.1.0"
      ├── peerDependencies["react-native"]: dependency is missing, expected "^0.70.0"
      ├── devDependencies["react"]: dependency is missing, expected "18.1.0"
      ├── devDependencies["react-native"]: dependency is missing, expected "^0.70.0"
      └── Re-run with '--write' to fix them
`
        );
      }
    );

    notEqual(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("writes changes back to 'package.json'", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    let didWriteToPath: PathOrFileDescriptor | false = false;

    mockfs.__setMockContent({
      ...mockManifest,
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
          capabilities: ["core-ios"],
        },
      },
    });
    mockfs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });

    equal(checkPackageManifest("package.json", writeOptions), "success");
    equal(didWriteToPath, "package.json");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("preserves indentation in 'package.json'", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    let output = "";

    mockfs.__setMockContent(
      {
        ...mockManifest,
        "rnx-kit": {
          alignDeps: {
            requirements: ["react-native@0.70"],
            capabilities: ["core-ios"],
          },
        },
      },
      "\t"
    );
    mockfs.__setMockFileWriter((_, content) => {
      output = content;
    });

    equal(checkPackageManifest("package.json", writeOptions), "success");
    t.assert.snapshot?.(output);
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("returns appropriate error code if package is excluded", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest("package.json", {
      ...defaultOptions,
      excludePackages: ["@rnx-kit/align-deps"],
    });

    equal(result, "excluded");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("uses minimum supported version as development version", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_68, "react"),
        "react-native": packageVersion(profile_0_68, "core"),
      },
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.68 || 0.69 || 0.70"],
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("uses declared development version", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
      "rnx-kit": {
        alignDeps: {
          requirements: {
            development: ["react-native@0.69"],
            production: ["react-native@0.68 || 0.69 || 0.70"],
          },
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("handles development version ranges", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
      "rnx-kit": {
        alignDeps: {
          requirements: {
            development: ["react-native@0.69"],
            production: ["react-native@0.68 || 0.69 || 0.70"],
          },
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("allows exact versions", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    const mods = /^[^\d]*/;
    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react").replace(mods, ""),
        "react-native": packageVersion(profile_0_69, "core").replace(mods, ""),
      },
      "rnx-kit": {
        alignDeps: {
          requirements: {
            development: ["react-native@0.69"],
            production: ["react-native@0.68 || 0.69 || 0.70"],
          },
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest("package.json", {
      ...defaultOptions,
      diffMode: "allow-subset",
    });

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("allows version range subsets", (t) => {
    const { logSpy, warnSpy, errorSpy } = mockConsole(t);

    const patch = /\.\d*$/;
    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core").replace(
          patch,
          ".9999"
        ),
      },
      "rnx-kit": {
        alignDeps: {
          requirements: {
            development: ["react-native@0.69"],
            production: ["react-native@0.68 || 0.69 || 0.70"],
          },
          capabilities: ["core-ios"],
        },
      },
    });

    const result = checkPackageManifest("package.json", {
      ...defaultOptions,
      diffMode: "allow-subset",
    });

    equal(result, "success");
    equal(logSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
    equal(errorSpy.mock.callCount(), 0);
  });
});

describe("checkPackageManifest({ kitType: 'library' }) (backwards compatibility)", () => {
  const mockManifest = {
    name: "@rnx-kit/align-deps",
    version: "0.0.1",
  };

  const react_v68_v69_v70 = [
    packageVersion(profile_0_68, "react"),
    packageVersion(profile_0_69, "react"),
    packageVersion(profile_0_70, "react"),
  ].join(" || ");

  const v68_v69_v70 = [
    packageVersion(profile_0_68, "core"),
    packageVersion(profile_0_69, "core"),
    packageVersion(profile_0_70, "core"),
  ].join(" || ");

  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  beforeEach(() => {
    mockfs.__setMockContent({});
  });

  after(() => {
    undefineRequire();
  });

  it("returns error code when reading invalid manifests", () => {
    const result = checkPackageManifest("package.json");

    notEqual(result, "success");
  });

  it("returns early if 'rnx-kit' is missing from the manifest", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "not-configured");
  });

  it("prints warnings when detecting bad packages", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      peerDependencies: {
        "react-native": profile_0_70["core"],
      },
      devDependencies: {
        "react-native": profile_0_70["core"],
      },
      "rnx-kit": {
        reactNativeVersion: "0.70.0",
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
  });

  it("prints warnings when detecting bad packages (with version range)", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      "rnx-kit": {
        reactNativeVersion: "^0.69.0 || ^0.70.0",
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
  });

  it("returns early if no capabilities are defined", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      "rnx-kit": {
        reactNativeVersion: "0.70.0",
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
  });

  it("returns if no changes are needed", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      "rnx-kit": {
        reactNativeVersion: "0.70.0",
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json");

    equal(result, "success");
  });

  it("returns if no changes are needed (write: true)", () => {
    let didWriteToPath = false;

    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      "rnx-kit": {
        reactNativeVersion: "0.70.0",
        capabilities: ["core-ios"],
      },
    });
    mockfs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });

    equal(checkPackageManifest("package.json", writeOptions), "success");
    equal(didWriteToPath, false);
  });

  it("returns error code if changes are needed", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      "rnx-kit": {
        reactNativeVersion: "0.70.0",
        capabilities: ["core-ios"],
      },
    });

    equal(checkPackageManifest("package.json"), "unsatisfied");
  });

  it("writes changes back to 'package.json'", () => {
    let didWriteToPath = false;

    mockfs.__setMockContent({
      ...mockManifest,
      "rnx-kit": {
        reactNativeVersion: "0.70.0",
        capabilities: ["core-ios"],
      },
    });
    mockfs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });

    equal(checkPackageManifest("package.json", writeOptions), "success");
    equal(didWriteToPath, "package.json");
  });

  it("preserves indentation in 'package.json'", (t) => {
    let output = "";

    mockfs.__setMockContent(
      {
        ...mockManifest,
        "rnx-kit": {
          reactNativeVersion: "0.70.0",
          capabilities: ["core-ios"],
        },
      },
      "\t"
    );
    mockfs.__setMockFileWriter((_, content) => {
      output = content;
    });

    equal(checkPackageManifest("package.json", writeOptions), "success");
    t.assert.snapshot?.(output);
  });

  it("uses minimum supported version as development version", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_68, "react"),
        "react-native": packageVersion(profile_0_68, "core"),
      },
      "rnx-kit": {
        reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
        capabilities: ["core-ios"],
      },
    });

    equal(checkPackageManifest("package.json"), "success");
  });

  it("uses declared development version", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
      "rnx-kit": {
        reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
        reactNativeDevVersion: "0.69.4",
        capabilities: ["core-ios"],
      },
    });

    equal(checkPackageManifest("package.json"), "success");
  });

  it("handles development version ranges", () => {
    mockfs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
      "rnx-kit": {
        reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
        reactNativeDevVersion: "^0.69.4",
        capabilities: ["core-ios"],
      },
    });

    equal(checkPackageManifest("package.json"), "success");
  });
});
