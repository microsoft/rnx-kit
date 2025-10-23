import { deepEqual, notDeepEqual, notEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  removeKeys,
  updateDependencies,
  updatePackageManifest,
} from "../src/manifest.ts";
import { profile as profile_0_63 } from "../src/presets/microsoft/react-native/profile-0.63.ts";
import { profile as profile_0_64 } from "../src/presets/microsoft/react-native/profile-0.64.ts";
import type { Package } from "../src/types.ts";
import { packageVersion, pickPackage } from "./helpers.ts";

const mockDependencies = {
  typescript: "0.0.0",
  react: "0.0.0",
  "react-native-test-app": "0.0.0",
  "react-native": "0.0.0",
};

describe("removeKeys()", () => {
  it("returns a new copy of object with specified keys removed", () => {
    const original = { x: "1", y: "2", z: "3" };
    const originalKeys = Object.keys(original);
    const modified = removeKeys(original, ["x", "z"]);

    notEqual(modified, original);
    deepEqual(Object.keys(original), originalKeys);
    deepEqual(modified, { y: original.y });
  });

  it("returns a new copy of object even if no keys are removed", () => {
    const original = { x: "1", y: "2", z: "3" };
    const originalKeys = Object.keys(original);
    const modified = removeKeys(original, ["a", "b"]);

    notEqual(modified, original);
    deepEqual(Object.keys(original), originalKeys);
    deepEqual(modified, original);
  });

  it("handles undefined objects", () => {
    ok(!removeKeys(undefined, ["x", "y"]));
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

  it("bumps dependencies to maximum supported version", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "direct"
    );

    deepEqual(updated, {
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
      "react-native-macos": packageVersion(profile_0_64, "core-macos"),
      "react-native-test-app": "0.0.0",
      "react-native-windows": packageVersion(profile_0_64, "core-windows"),
      typescript: "0.0.0",
    });
  });

  it("bumps dependencies to minimum supported version", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "development"
    );

    deepEqual(updated, {
      react: packageVersion(profile_0_63, "react"),
      "react-native": packageVersion(profile_0_63, "core"),
      "react-native-macos": packageVersion(profile_0_63, "core-macos"),
      "react-native-test-app": packageVersion(profile_0_63, "test-app"),
      "react-native-windows": packageVersion(profile_0_63, "core-windows"),
      typescript: "0.0.0",
    });
  });

  it("bumps dependencies to widest possible version range", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "peer"
    );

    deepEqual(updated, {
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

  it("sorts keys", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "development"
    );
    const updatedKeys = Object.keys(updated);
    const originalKeys = Object.keys(mockDependencies);

    notDeepEqual(updatedKeys, originalKeys);
    notDeepEqual(updatedKeys.sort(), originalKeys);
  });

  it("sets undefined dependencies", () => {
    deepEqual(updateDependencies(undefined, resolvedPackages, "development"), {
      react: packageVersion(profile_0_63, "react"),
      "react-native": packageVersion(profile_0_63, "core"),
      "react-native-macos": packageVersion(profile_0_63, "core-macos"),
      "react-native-test-app": packageVersion(profile_0_63, "test-app"),
      "react-native-windows": packageVersion(profile_0_63, "core-windows"),
    });
  });
});

describe("updatePackageManifest()", () => {
  it("sets direct dependencies for apps", () => {
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

    deepEqual(dependencies, {
      ...mockDependencies,
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    ok(!peerDependencies);
    ok(!devDependencies);
  });

  it("removes dependencies from devDependencies for apps", () => {
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

    deepEqual(dependencies, {
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    ok(!peerDependencies);
    deepEqual(devDependencies, {
      "react-native-test-app": "0.0.0",
      typescript: "0.0.0",
    });
  });

  it("removes dependencies from peerDependencies for apps", () => {
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

    deepEqual(dependencies, {
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    deepEqual(peerDependencies, {
      "react-native-test-app": "0.0.0",
      typescript: "0.0.0",
    });
    ok(!devDependencies);
  });

  it("sets dev/peer dependencies for libraries", () => {
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

    deepEqual(dependencies, { "@rnx-kit/align-deps": "^1.0.0" });
    deepEqual(peerDependencies, {
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
    deepEqual(devDependencies, {
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
  });

  it("removes dependencies from direct dependencies for libraries", () => {
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

    deepEqual(dependencies, { "@rnx-kit/align-deps": "^1.0.0" });
    deepEqual(peerDependencies, {
      ...mockDependencies,
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    deepEqual(devDependencies, {
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
  });

  it("always sets dev-only dependencies", () => {
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

    deepEqual(dependencies, {
      ...mockDependencies,
      react: packageVersion(profile_0_64, "react"),
      "react-native": packageVersion(profile_0_64, "core"),
    });
    ok(!peerDependencies);
    deepEqual(devDependencies, {
      "react-native-test-app": packageVersion(profile_0_64, "test-app"),
    });
  });
});
