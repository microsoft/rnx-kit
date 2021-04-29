import { checkPackageManifest, isManifest } from "../src/check";

jest.mock("fs");

describe("isManifest()", () => {
  test("returns true when something resembles a package manifest", () => {
    expect(isManifest(undefined)).toBe(false);
    expect(isManifest(null)).toBe(false);
    expect(isManifest("string")).toBe(false);
    expect(isManifest(9000)).toBe(false);
    expect(isManifest(() => 0)).toBe(false);
    expect(isManifest({})).toBe(false);
    expect(isManifest({ name: "@rnx-kit/dep-check" })).toBe(false);
    expect(isManifest({ version: "0.0.1" })).toBe(false);
    expect(isManifest({ name: "@rnx-kit/dep-check", version: "0.0.1" })).toBe(
      true
    );
  });
});

describe("checkPackageManifest()", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleLogSpy = jest.spyOn(global.console, "log");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  const mockManifest = {
    name: "@rnx-kit/dep-check",
    version: "0.0.1",
  };

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
    expect(checkPackageManifest("package.json")).not.toBe(0);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("returns early if 'rnx-kit' is missing from the manifest", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });

    expect(checkPackageManifest("package.json")).toBe(0);
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("returns error code if profile version is undefined", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({});

    expect(checkPackageManifest("package.json")).not.toBe(0);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("returns error code if development version is invalid", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.62 || ^0.63 || ^0.64",
      reactNativeDevVersion: "0.61.5",
    });

    expect(checkPackageManifest("package.json")).not.toBe(0);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("prints warnings when detecting bad packages", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "0.64.0" });

    expect(checkPackageManifest("package.json")).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).toBeCalledTimes(2);
  });

  test("prints warnings when detecting bad packages (with version range)", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "^0.63.0 || ^0.64.0" });

    expect(checkPackageManifest("package.json")).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).toBeCalledTimes(2);
  });

  test("returns early if no capabilities are defined", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "0.64.0" });

    expect(checkPackageManifest("package.json")).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("returns if no changes are needed", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        "react-native": "^0.64.0",
      },
      devDependencies: {
        "react-native": "^0.64.0",
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.64.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json")).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("returns if no changes are needed (write: true)", () => {
    let didWriteToPath = false;

    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        "react-native": "^0.64.0",
      },
      devDependencies: {
        "react-native": "^0.64.0",
      },
    });
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.64.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", { write: true })).toBe(0);
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

    expect(checkPackageManifest("package.json")).not.toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
    expect(consoleLogSpy).toBeCalledTimes(1);
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

    expect(checkPackageManifest("package.json", { write: true })).toBe(0);
    expect(didWriteToPath).toBe("package.json");
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
  });

  test("uses minimum supported version as development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        "react-native": "^0.62.2 || ^0.63.4 || ^0.64.0",
      },
      devDependencies: {
        "react-native": "^0.62.2",
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.62 || ^0.63 || ^0.64",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json")).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("uses declared development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        "react-native": "^0.62.2 || ^0.63.4 || ^0.64.0",
      },
      devDependencies: {
        "react-native": "^0.63.4",
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.62 || ^0.63 || ^0.64",
      reactNativeDevVersion: "0.63.4",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json")).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleLogSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });
});
