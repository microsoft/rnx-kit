import {
  removeKeys,
  updateDependencies,
  updatePackageManifest,
} from "../src/manifest";
import profile_0_63 from "../src/presets/microsoft/react-native/profile-0.63";
import profile_0_64 from "../src/presets/microsoft/react-native/profile-0.64";
import type { Package } from "../src/types";
import { packageVersion, pickPackage } from "./helpers";

const mockDependencies = {
  typescript: "0.0.0",
  react: "0.0.0",
  "react-native-test-app": "0.0.0",
  "react-native": "0.0.0",
};

describe("removeKeys()", () => {
  test("returns a new copy of object with specified keys removed", () => {
    const original = { x: "1", y: "2", z: "3" };
    const originalKeys = Object.keys(original);
    const modified = removeKeys(original, ["x", "z"]);
    expect(modified).not.toBe(original);
    expect(Object.keys(original)).toEqual(originalKeys);
    expect(modified).toEqual({ y: original.y });
  });

  test("returns a new copy of object even if no keys are removed", () => {
    const original = { x: "1", y: "2", z: "3" };
    const originalKeys = Object.keys(original);
    const modified = removeKeys(original, ["a", "b"]);
    expect(modified).not.toBe(original);
    expect(Object.keys(original)).toEqual(originalKeys);
    expect(modified).toEqual(original);
  });

  test("handles undefined objects", () => {
    expect(removeKeys(undefined, ["x", "y"])).toBeUndefined();
  });
});

describe("updateDependencies()", () => {
  const resolvedPackages: Record<string, Package[]> = {
    react: [
      pickPackage(profile_0_63, "react"),
      pickPackage(profile_0_64, "react"),
    ],
    "react-native": [
      pickPackage(profile_0_63, "core"),
      pickPackage(profile_0_64, "core"),
    ],
    "react-native-macos": [
      pickPackage(profile_0_63, "core-macos"),
      pickPackage(profile_0_64, "core-macos"),
    ],
    "react-native-test-app": [pickPackage(profile_0_64, "test-app")],
    "react-native-windows": [
      pickPackage(profile_0_63, "core-windows"),
      pickPackage(profile_0_64, "core-windows"),
    ],
  };

  test("bumps dependencies to maximum supported version", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "direct"
    );
    expect(updated).toEqual({
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
      "react-native-macos": packageVersion(profile_0_64, "core-macos"),
      "react-native-test-app": "0.0.0",
      "react-native-windows": packageVersion(profile_0_64, "core-windows"),
      typescript: "0.0.0",
    });
  });

  test("bumps dependencies to minimum supported version", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "development"
    );
    expect(updated).toEqual({
      react: packageVersion(profile_0_63, "react"),
      "react-native": packageVersion(profile_0_63, "core"),
      "react-native-macos": packageVersion(profile_0_63, "core-macos"),
      "react-native-test-app": packageVersion(profile_0_63, "test-app"),
      "react-native-windows": packageVersion(profile_0_63, "core-windows"),
      typescript: "0.0.0",
    });
  });

  test("bumps dependencies to widest possible version range", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "peer"
    );
    expect(updated).toEqual({
      react: `${packageVersion(profile_0_63, "react")} || ${packageVersion(
        profile_0_64,
        "react"
      )}`,
      "react-native": `${packageVersion(
        profile_0_63,
        "core"
      )} || ${packageVersion(profile_0_64, "core")}`,
      "react-native-macos": `${packageVersion(
        profile_0_63,
        "core-macos"
      )} || ${packageVersion(profile_0_64, "core-macos")}`,
      "react-native-test-app": "0.0.0",
      "react-native-windows": `${packageVersion(
        profile_0_63,
        "core-windows"
      )} || ${packageVersion(profile_0_64, "core-windows")}`,
      typescript: "0.0.0",
    });
  });

  test("sorts keys", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "development"
    );
    const updatedKeys = Object.keys(updated);
    const originalKeys = Object.keys(mockDependencies);
    expect(updatedKeys).not.toEqual(originalKeys);
    expect(updatedKeys.sort()).not.toEqual(originalKeys);
  });

  test("sets undefined dependencies", () => {
    expect(
      updateDependencies(undefined, resolvedPackages, "development")
    ).toEqual({
      react: packageVersion(profile_0_63, "react"),
      "react-native": packageVersion(profile_0_63, "core"),
      "react-native-macos": packageVersion(profile_0_63, "core-macos"),
      "react-native-test-app": packageVersion(profile_0_63, "test-app"),
      "react-native-windows": packageVersion(profile_0_63, "core-windows"),
    });
  });
});

describe("updatePackageManifest()", () => {
  test("sets direct dependencies for apps", () => {
    const { dependencies, devDependencies, peerDependencies } =
      updatePackageManifest(
        "package.json",
        {
          name: "Test",
          version: "0.0.1",
          dependencies: mockDependencies,
          peerDependencies: {},
          devDependencies: {},
        },
        ["core-android", "core-ios"],
        { "0.63": profile_0_63, "0.64": profile_0_64 },
        { "0.64": profile_0_64 },
        "app"
      );
    expect(dependencies).toEqual({
      ...mockDependencies,
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    expect(peerDependencies).toBeUndefined();
    expect(devDependencies).toBeUndefined();
  });

  test("removes dependencies from devDependencies for apps", () => {
    const { dependencies, devDependencies, peerDependencies } =
      updatePackageManifest(
        "package.json",
        {
          name: "Test",
          version: "0.0.1",
          dependencies: {},
          peerDependencies: {},
          devDependencies: mockDependencies,
        },
        ["core-android", "core-ios", "react"],
        { "0.63": profile_0_63, "0.64": profile_0_64 },
        { "0.64": profile_0_64 },
        "app"
      );
    expect(dependencies).toEqual({
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    expect(peerDependencies).toBeUndefined();
    expect(devDependencies).toEqual({
      "react-native-test-app": "0.0.0",
      typescript: "0.0.0",
    });
  });

  test("removes dependencies from peerDependencies for apps", () => {
    const { dependencies, devDependencies, peerDependencies } =
      updatePackageManifest(
        "package.json",
        {
          name: "Test",
          version: "0.0.1",
          dependencies: {},
          peerDependencies: mockDependencies,
          devDependencies: {},
        },
        ["core-android", "core-ios", "react"],
        { "0.63": profile_0_63, "0.64": profile_0_64 },
        { "0.64": profile_0_64 },
        "app"
      );
    expect(dependencies).toEqual({
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    expect(peerDependencies).toEqual({
      "react-native-test-app": "0.0.0",
      typescript: "0.0.0",
    });
    expect(devDependencies).toBeUndefined();
  });

  test("sets dev/peer dependencies for libraries", () => {
    const { dependencies, devDependencies, peerDependencies } =
      updatePackageManifest(
        "package.json",
        {
          name: "Test",
          version: "0.0.1",
          dependencies: { "@rnx-kit/align-deps": "^1.0.0" },
          peerDependencies: mockDependencies,
        },
        ["core-android", "core-ios"],
        { "0.63": profile_0_63, "0.64": profile_0_64 },
        { "0.64": profile_0_64 },
        "library"
      );
    expect(dependencies).toEqual({ "@rnx-kit/align-deps": "^1.0.0" });
    expect(peerDependencies).toEqual({
      ...mockDependencies,
      react: [
        packageVersion(profile_0_63, "react"),
        packageVersion(profile_0_64, "react"),
      ].join(" || "),
      "react-native": [
        packageVersion(profile_0_63, "core"),
        packageVersion(profile_0_64, "core"),
      ].join(" || "),
    });
    expect(devDependencies).toEqual({
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
  });

  test("removes dependencies from direct dependencies for libraries", () => {
    const { dependencies, devDependencies, peerDependencies } =
      updatePackageManifest(
        "package.json",
        {
          name: "Test",
          version: "0.0.1",
          dependencies: {
            "@rnx-kit/align-deps": "^1.0.0",
            "react-native": "0.0.0",
          },
          peerDependencies: mockDependencies,
          devDependencies: {},
        },
        ["core-android", "core-ios"],
        { "0.64": profile_0_64 },
        { "0.64": profile_0_64 },
        "library"
      );
    expect(dependencies).toEqual({ "@rnx-kit/align-deps": "^1.0.0" });
    expect(peerDependencies).toEqual({
      ...mockDependencies,
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    expect(devDependencies).toEqual({
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
  });

  test("always sets dev-only dependencies", () => {
    const { dependencies, devDependencies, peerDependencies } =
      updatePackageManifest(
        "package.json",
        {
          name: "Test",
          version: "0.0.1",
          dependencies: mockDependencies,
          peerDependencies: {},
          devDependencies: {},
        },
        ["core-android", "core-ios", "test-app"],
        { "0.63": profile_0_63, "0.64": profile_0_64 },
        { "0.64": profile_0_64 },
        "app"
      );
    expect(dependencies).toEqual({
      ...mockDependencies,
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    expect(peerDependencies).toBeUndefined();
    expect(devDependencies).toEqual({
      "react-native-test-app": packageVersion(profile_0_64, "test-app"),
    });
  });
});
