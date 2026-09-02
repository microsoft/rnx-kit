import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findBadPackages,
  resolveBannedPackages,
} from "../src/bannedPackages.ts";

describe("findBadPackages()", () => {
  const dependenciesWithOneBadPackage = {
    "react-native": "0.0.0",
    "react-native-linear-gradient": "0.0.0",
  };

  const dependenciesWithMoreBadPackages = {
    "react-native": "0.0.0",
    "react-native-linear-gradient": "0.0.0",
    "react-native-netinfo": "0.0.0",
  };

  it("finds bad packages in all dependencies", () => {
    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
      }),
      undefined
    );

    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
      })?.length,
      1
    );

    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        peerDependencies: dependenciesWithOneBadPackage,
      })?.length,
      1
    );

    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        devDependencies: dependenciesWithOneBadPackage,
      })?.length,
      1
    );
  });

  it("dedupes bad packages", () => {
    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        peerDependencies: dependenciesWithOneBadPackage,
      })?.length,
      1
    );

    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        devDependencies: dependenciesWithOneBadPackage,
      })?.length,
      1
    );

    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        peerDependencies: dependenciesWithOneBadPackage,
        devDependencies: dependenciesWithOneBadPackage,
      })?.length,
      1
    );

    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        peerDependencies: dependenciesWithOneBadPackage,
        devDependencies: dependenciesWithOneBadPackage,
      })?.length,
      1
    );
  });

  it("finds all bad packages", () => {
    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithMoreBadPackages,
      })?.length,
      2
    );

    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        peerDependencies: dependenciesWithMoreBadPackages,
      })?.length,
      2
    );

    equal(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        peerDependencies: dependenciesWithMoreBadPackages,
        devDependencies: dependenciesWithMoreBadPackages,
      })?.length,
      2
    );
  });
});

describe("resolveBannedPackages()", () => {
  it("returns nothing when no capabilities are managed", () => {
    deepEqual(resolveBannedPackages([]), []);
  });

  it("resolves stale packages only when the capability is managed", () => {
    deepEqual(resolveBannedPackages(["storage"]), [
      "@react-native-community/async-storage",
    ]);
    deepEqual(resolveBannedPackages(["clipboard"]), [
      "@react-native-community/clipboard",
    ]);
    deepEqual(resolveBannedPackages(["storage", "hermes"]), [
      "@react-native-community/async-storage",
      "hermes-engine",
    ]);
  });

  it("does not resolve banned packages without a capability", () => {
    // `@types/react-native` is banned but has no superseding capability
    deepEqual(resolveBannedPackages(["core"]), []);
  });
});
