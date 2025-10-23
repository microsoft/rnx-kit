import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { findBadPackages } from "../src/findBadPackages.ts";

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
