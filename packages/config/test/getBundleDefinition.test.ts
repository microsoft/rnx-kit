import "jest-extended";
import { BundleConfig, BundleDefinition } from "../src/bundleConfig";
import {
  BundleDefinitionWithRequiredParameters,
  getBundleDefinition,
  getBundlePlatformDefinition,
} from "../src/getBundleDefinition";

const consoleWarnSpy = jest.spyOn(global.console, "warn");

const bundleConfig: BundleConfig = [
  {
    id: "8",
    targets: ["windows"],
  },
  {
    id: "123abc",
    targets: ["ios", "android", "windows"],
  },
];

function validateDefaultDefinition(d: BundleDefinition) {
  expect(d).toContainAllKeys([
    "entryPath",
    "distPath",
    "assetsPath",
    "bundlePrefix",
    "detectCyclicDependencies",
    "detectDuplicateDependencies",
    "typescriptValidation",
    "treeShake",
  ]);
  expect(d.entryPath).toEqual("lib/index.js");
  expect(d.distPath).toEqual("dist");
  expect(d.assetsPath).toEqual("dist");
  expect(d.bundlePrefix).toEqual("index");
  expect(d.detectCyclicDependencies).toBeTruthy();
  expect(d.detectDuplicateDependencies).toBeTruthy();
  expect(d.typescriptValidation).toBeTruthy();
  expect(d.treeShake).toBeFalsy();
}

describe("getBundleDefinition()", () => {
  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

  test("returns defaults when bundle config is a boolean", () => {
    const d = getBundleDefinition(true);
    validateDefaultDefinition(d);
  });

  test("returns the bundle definition associated with the given id", () => {
    const d = getBundleDefinition(bundleConfig, "123abc");
    expect(d.id).toEqual("123abc");
    expect(d.targets).toBeArrayOfSize(3);
    expect(d.targets).toIncludeSameMembers(["ios", "android", "windows"]);
  });

  test("returns default when the given bundle id is does not exist", () => {
    const d = getBundleDefinition(bundleConfig, "does-not-exist");
    validateDefaultDefinition(d);
  });

  test("returns the first bundle definition when an id is not given", () => {
    const d = getBundleDefinition(bundleConfig);
    expect(d.id).toEqual("8");
    expect(d.targets).toBeArrayOfSize(1);
    expect(d.targets).toIncludeSameMembers(["windows"]);
  });

  test("returns the value for experimental_treeShake in property treeShake", () => {
    const bundleConfigCopy = [...bundleConfig];
    (bundleConfigCopy[0] as Record<string, unknown>).experimental_treeShake =
      true;

    const d = getBundleDefinition(bundleConfigCopy);
    expect(d.id).toEqual("8");
    expect(d).toContainKey("treeShake");
    expect(d).not.toContainKey("experimental_treeShake");
    expect(d.treeShake).toEqual(true);
    expect(consoleWarnSpy).toBeCalledTimes(1);
    expect(consoleWarnSpy).toBeCalledWith(
      expect.stringContaining("deprecated")
    );
    expect(consoleWarnSpy).toBeCalledWith(
      expect.stringContaining("experimental_treeShake")
    );
  });
});

const bundleDefinitionWithoutPlatforms: BundleDefinitionWithRequiredParameters =
  {
    entryPath: "entry.js",
    distPath: "dist",
    assetsPath: "assets",
    bundlePrefix: "mybundle",
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    treeShake: true,
  };

const bundleDefinition: BundleDefinitionWithRequiredParameters = {
  ...bundleDefinitionWithoutPlatforms,
  platforms: {
    ios: {
      bundlePrefix: "ios-bundle",
    },
  },
};

describe("getBundlePlatformDefinition()", () => {
  test("returns the input bundle definition when no platform overrides exist", () => {
    const d = getBundlePlatformDefinition(
      bundleDefinitionWithoutPlatforms,
      "android"
    );
    expect(d).toBe(bundleDefinitionWithoutPlatforms);
  });

  test("returns the input bundle definition when the given platform doesn't have any overrides", () => {
    const d = getBundlePlatformDefinition(bundleDefinition, "android");
    expect(d).toBe(bundleDefinition);
  });

  test("returns the an overridden bundle definition", () => {
    const d = getBundlePlatformDefinition(bundleDefinition, "ios");
    expect(d.bundlePrefix).toEqual("ios-bundle");
  });
});
