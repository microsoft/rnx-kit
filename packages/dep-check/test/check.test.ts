import semverCoerce from "semver/functions/coerce";
import { checkPackageManifest, getCheckConfig } from "../src/check";
import profile_0_62 from "../src/presets/microsoft/profile-0.62";
import profile_0_63 from "../src/presets/microsoft/profile-0.63";
import profile_0_64 from "../src/presets/microsoft/profile-0.64";
import { packageVersion } from "./helpers";

jest.mock("fs");

describe("checkPackageManifest({ kitType: 'library' })", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleLogSpy = jest.spyOn(global.console, "log");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  const defaultOptions = { loose: false, write: false };

  const mockManifest = {
    name: "@rnx-kit/dep-check",
    version: "0.0.1",
  };

  const react_v62_v63_v64 = [
    packageVersion(profile_0_62, "react"),
    packageVersion(profile_0_63, "react"),
    packageVersion(profile_0_64, "react"),
  ].join(" || ");

  const v62_v63_v64 = [
    packageVersion(profile_0_62, "core"),
    packageVersion(profile_0_63, "core"),
    packageVersion(profile_0_64, "core"),
  ].join(" || ");

  beforeEach(() => {
    consoleErrorSpy.mockReset();
    consoleLogSpy.mockReset();
    consoleWarnSpy.mockReset();
    fs.__setMockContent({});
    rnxKitConfig.__setMockConfig();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns error code when reading invalid manifests", () => {
    expect(checkPackageManifest("package.json", defaultOptions)).not.toBe(0);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("returns early if 'rnx-kit' is missing from the manifest", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });

    const options = { ...defaultOptions, uncheckedReturnCode: -1 };
    expect(checkPackageManifest("package.json", options)).toBe(-1);
    expect(consoleWarnSpy).toBeCalled();
  });

  test("prints warnings when detecting bad packages", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      peerDependencies: {
        "react-native": profile_0_64["core"],
      },
      devDependencies: {
        "react-native": profile_0_64["core"],
      },
    });
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "0.64.0" });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy.mock.calls).toMatchSnapshot();
  });

  test("prints warnings when detecting bad packages (with version range)", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "^0.63.0 || ^0.64.0" });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy.mock.calls).toMatchSnapshot();
  });

  test("returns early if no capabilities are defined", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "0.64.0" });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("returns if no changes are needed", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_64, "react"),
        "react-native": packageVersion(profile_0_64, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_64, "react"),
        "react-native": packageVersion(profile_0_64, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.64.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("returns if no changes are needed (write: true)", () => {
    let didWriteToPath = false;

    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_64, "react"),
        "react-native": packageVersion(profile_0_64, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_64, "react"),
        "react-native": packageVersion(profile_0_64, "core"),
      },
    });
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.64.0",
      capabilities: ["core-ios"],
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe(0);
    expect(didWriteToPath).toBe(false);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("returns error code if changes are needed", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.64.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).not.toBe(0);
    expect(consoleErrorSpy).toBeCalledTimes(1);
    expect(consoleWarnSpy).not.toBeCalled();
    expect(consoleLogSpy).toBeCalledTimes(2);
  });

  test("writes changes back to 'package.json'", () => {
    let didWriteToPath = false;

    fs.__setMockContent(mockManifest);
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.64.0",
      capabilities: ["core-ios"],
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe(0);
    expect(didWriteToPath).toBe("package.json");
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
  });

  test("preserves indentation in 'package.json'", () => {
    let output = "";

    fs.__setMockContent(mockManifest, "\t");
    fs.__setMockFileWriter((_, content) => {
      output = content;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.64.0",
      capabilities: ["core-ios"],
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe(0);
    expect(output).toMatchSnapshot();
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
  });

  test("uses minimum supported version as development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v62_v63_v64,
        "react-native": v62_v63_v64,
      },
      devDependencies: {
        react: packageVersion(profile_0_62, "react"),
        "react-native": packageVersion(profile_0_62, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.62 || ^0.63 || ^0.64",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("uses declared development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v62_v63_v64,
        "react-native": v62_v63_v64,
      },
      devDependencies: {
        react: packageVersion(profile_0_63, "react"),
        "react-native": packageVersion(profile_0_63, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.62 || ^0.63 || ^0.64",
      reactNativeDevVersion: "0.63.4",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("handles development version ranges", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v62_v63_v64,
        "react-native": v62_v63_v64,
      },
      devDependencies: {
        react: packageVersion(profile_0_63, "react"),
        "react-native": packageVersion(profile_0_63, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.62 || ^0.63 || ^0.64",
      reactNativeDevVersion: "^0.63.4",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });
});

describe("getCheckConfig", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const mockManifest = {
    name: "@rnx-kit/dep-check",
    version: "0.0.1",
  };

  const defaultOptions = { loose: false, write: false };

  beforeEach(() => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns early if the package is unconfigured", () => {
    expect(getCheckConfig("package.json", defaultOptions)).toBe(0);
  });

  test("returns default values given react-native version", () => {
    const reactNativeVersion = "^0.64";
    rnxKitConfig.__setMockConfig({ reactNativeVersion });

    expect(getCheckConfig("package.json", defaultOptions)).toEqual({
      capabilities: [],
      kitType: "library",
      manifest: mockManifest,
      reactNativeVersion,
      reactNativeDevVersion: semverCoerce(reactNativeVersion).version,
    });
  });

  test("uses react-native version provided by vigilant flag if unspecified", () => {
    const reactNativeVersion = "^0.64";
    rnxKitConfig.__setMockConfig({ customProfiles: "" });

    expect(
      getCheckConfig("package.json", {
        ...defaultOptions,
        supportedVersions: reactNativeVersion,
        targetVersion: reactNativeVersion,
      })
    ).toEqual({
      capabilities: [],
      kitType: "library",
      manifest: mockManifest,
      reactNativeVersion,
      reactNativeDevVersion: reactNativeVersion,
    });
  });

  test("does not overwrite existing config with the version provided by vigilant flag", () => {
    const reactNativeVersion = "^0.64";
    rnxKitConfig.__setMockConfig({ reactNativeVersion });

    expect(
      getCheckConfig("package.json", {
        ...defaultOptions,
        supportedVersions: "1000.0",
        targetVersion: "1000.0",
      })
    ).toEqual({
      capabilities: [],
      kitType: "library",
      manifest: mockManifest,
      reactNativeVersion,
      reactNativeDevVersion: semverCoerce(reactNativeVersion).version,
    });
  });
});
