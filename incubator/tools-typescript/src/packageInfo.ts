import type { BundleConfig } from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node";
import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import type { PackageInfo } from "./types";

import { getKitConfigFromPackageJson } from "@rnx-kit/config";
import { findPackage, readPackage } from "@rnx-kit/tools-node";
import { readConfigFile } from "@rnx-kit/typescript-service";

import path from "path";
import ts from "typescript";

/**
 * Load the tsconfig.json file for the package
 * @param pkgRoot - the root directory of the package
 * @returns the parsed tsconfig.json file, if found
 */
function loadTypescriptConfig(
  pkgRoot: string
): ts.ParsedCommandLine | undefined {
  const configPath = ts.findConfigFile(
    pkgRoot,
    ts.sys.fileExists,
    "tsconfig.json"
  );
  if (configPath) {
    return readConfigFile(configPath);
  }
  return undefined;
}

/**
 * See if any of the react-native platform dependencies are present in the given dependencies object
 * @param deps - an object containing the package's dependencies, can be one of [peer|dev]dependencies
 * @param foundPlatforms - adds any react-native platform dependencies to the foundPlatforms object
 */
function findReactNativePlatformsFromDeps(
  manifest: PackageManifest,
  foundPlatforms: { [key in AllPlatforms]?: boolean }
) {
  const deps = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
  ];
  deps.forEach((dep) => {
    if (dep) {
      if (dep["react-native"]) {
        foundPlatforms.android = true;
        foundPlatforms.ios = true;
      }
      if (dep["react-native-windows"]) {
        foundPlatforms.windows = true;
      }
      if (dep["react-native-macos"]) {
        foundPlatforms.macos = true;
      }
      if (dep["@office-iss/react-native-win32"]) {
        foundPlatforms.win32 = true;
      }
    }
  });
}

/**
 * Extract applicable platform from config.targets or config.platforms
 * @param config bundle config for the resolved rnx-kit configuration
 * @param foundPlatforms platform map to update with the platforms found in the bundle config
 */
function findReactNativePlatformsFromBundleConfig(
  config: BundleConfig,
  foundPlatforms: { [key in AllPlatforms]?: boolean }
) {
  const allPlatforms: AllPlatforms[] = [
    "android",
    "ios",
    "windows",
    "macos",
    "win32",
  ];
  if (config.platforms && typeof config.platforms === "object") {
    allPlatforms.forEach((platform) => {
      if (config.platforms![platform]) {
        foundPlatforms[platform] = true;
      }
    });
  }
  const targets =
    config.targets && Array.isArray(config.targets) ? config.targets : [];
  targets.forEach((target) => {
    if (
      typeof target === "string" &&
      allPlatforms.find((platform) => platform === target)
    ) {
      foundPlatforms[target] = true;
    }
  });
}

function getReactNativePlatforms(
  manifest: PackageManifest,
  packageRoot: string
): AllPlatforms[] | undefined {
  const foundPlatforms: { [key in AllPlatforms]?: boolean } = {};

  const rnxKit = manifest["rnx-kit"];
  if (
    rnxKit &&
    typeof rnxKit.kitType === "string" &&
    rnxKit.kitType === "app"
  ) {
    // for packages marked as an 'app', determine available platforms based on the bundle configuration
    const kitConfig = getKitConfigFromPackageJson(manifest, packageRoot) || {};
    const bundleConfigs = Array.isArray(kitConfig.bundle)
      ? kitConfig.bundle
      : [kitConfig.bundle];
    bundleConfigs.forEach((bundleConfig) => {
      if (bundleConfig && typeof bundleConfig === "object") {
        findReactNativePlatformsFromBundleConfig(bundleConfig, foundPlatforms);
      }
    });
    findReactNativePlatformsFromBundleConfig(kitConfig, foundPlatforms);
  } else {
    // for all other packages, determine available platforms based on dependencies
    findReactNativePlatformsFromDeps(manifest, foundPlatforms);
  }
  const platforms = Object.keys(foundPlatforms) as AllPlatforms[];
  return platforms.length > 0 ? platforms : undefined;
}

export function getPackageInfo(
  startDir: string = process.cwd(),
  loadPlatforms = true
): PackageInfo {
  // load the base package json
  const pkgJsonPath = findPackage(startDir);
  if (!pkgJsonPath) {
    throw new Error("Unable to find package.json");
  }
  const manifest = readPackage(pkgJsonPath);
  const root = path.dirname(pkgJsonPath);

  // find and load the typescript config file
  const tsconfig = loadTypescriptConfig(root);

  // determine available react-native platforms if requested
  const platforms = loadPlatforms
    ? getReactNativePlatforms(manifest, root)
    : undefined;

  // return the package info
  return { name: manifest.name, root, tsconfig, platforms };
}
