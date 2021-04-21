import { findBadPackages } from "../src/findBadPackages";

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

  test("finds bad packages in all dependencies", () => {
    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
      })
    ).toBeUndefined();

    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
      })?.length
    ).toBe(1);

    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        peerDependencies: dependenciesWithOneBadPackage,
      })?.length
    ).toBe(1);

    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        devDependencies: dependenciesWithOneBadPackage,
      })?.length
    ).toBe(1);
  });

  test("dedupes bad packages", () => {
    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        peerDependencies: dependenciesWithOneBadPackage,
      })?.length
    ).toBe(1);

    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        devDependencies: dependenciesWithOneBadPackage,
      })?.length
    ).toBe(1);

    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        peerDependencies: dependenciesWithOneBadPackage,
        devDependencies: dependenciesWithOneBadPackage,
      })?.length
    ).toBe(1);

    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        peerDependencies: dependenciesWithOneBadPackage,
        devDependencies: dependenciesWithOneBadPackage,
      })?.length
    ).toBe(1);
  });

  test("finds all bad packages", () => {
    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithMoreBadPackages,
      })?.length
    ).toBe(2);

    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        peerDependencies: dependenciesWithMoreBadPackages,
      })?.length
    ).toBe(2);

    expect(
      findBadPackages({
        name: "Test",
        version: "0.0.1",
        dependencies: dependenciesWithOneBadPackage,
        peerDependencies: dependenciesWithMoreBadPackages,
        devDependencies: dependenciesWithMoreBadPackages,
      })?.length
    ).toBe(2);
  });
});
