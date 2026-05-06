import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";
import {
  type PackageInfo,
  createPackageValueLoader,
  getPackageInfoFromPath,
} from "@rnx-kit/tools-packages";
import type { KitConfig } from "@rnx-kit/types-kit-config";
import type { PackageManifest } from "@rnx-kit/types-node";
import merge from "lodash.merge";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Options for retrieving a kit config. The default is equivalent to passing
 * `{ cwd: process.cwd() }`.
 */
export type GetKitConfigOptions = {
  /**
   * Retrieve the rnx-kit configuration from a package module.
   */
  module?: string;

  /**
   * Retrive the rnx-kit configuration from a directory containing 'package.json'.
   */
  cwd?: string;
};

// loader function for the package info accessor, used when it isn't already cached
function loadConfigFromPackageInfo(pkgInfo: PackageInfo): KitConfig {
  const packageJson = pkgInfo.manifest;
  return loadBaseConfig(packageJson["rnx-kit"], pkgInfo.root) || {};
}

export const getKitConfigFromPackageInfo = createPackageValueLoader(
  "kitConfig",
  loadConfigFromPackageInfo
);

function findPackageDir({
  module,
  cwd = process.cwd(),
}: GetKitConfigOptions): string {
  if (!module) {
    return cwd;
  }

  return findPackageDependencyDir(module, { startDir: cwd }) ?? cwd;
}

function loadBaseConfig(
  config: PackageManifest["rnx-kit"],
  packageDir: string
): PackageManifest["rnx-kit"] {
  const base = config?.extends;
  if (typeof base !== "string") {
    return config;
  }

  const baseConfigPath = path.resolve(packageDir, base);
  const spec = fs.existsSync(baseConfigPath)
    ? baseConfigPath
    : require.resolve(base, { paths: [packageDir] });

  let baseConfig: KitConfig;
  if (path.basename(spec).toLowerCase() === "package.json") {
    // if the reference is to a package.json file, load the config from the package info
    const pkgInfo = getPackageInfoFromPath(spec);
    baseConfig = getKitConfigFromPackageInfo(pkgInfo);
  } else {
    // require the file, then recurse so that any `extends` declared in the
    // loaded module is resolved relative to its own directory
    const loaded = require(spec) as KitConfig;
    baseConfig = loadBaseConfig(loaded, path.dirname(spec)) ?? {};
  }

  // Clone the base before merging: `baseConfig` may be a cached object
  // (require cache for JS files, package-info cache for package.json refs),
  // and `lodash.merge` mutates its target — without the clone, every
  // subsequent extender would see the previous extender's overrides.
  const mergedConfig = merge(structuredClone(baseConfig), config);
  delete mergedConfig["extends"];
  return mergedConfig;
}

/**
 * Query for a package's rnx-kit configuration.
 * @param options Options for retrieving the configuration.
 */
export function getKitConfig(
  options: GetKitConfigOptions = {}
): KitConfig | undefined {
  const packageDir = findPackageDir(options);

  try {
    const packageJson = readPackage(packageDir);
    return loadBaseConfig(packageJson["rnx-kit"], packageDir);
  } catch {
    return undefined;
  }
}

/**
 * Helper for loading the KitConfig for cases where the package.json has already been loaded for other reasons.
 * @param packageJson The loaded and parsed package.json file for this package.
 * @param packageDir The directory containing the package.json file.
 * @returns The rnx-kit configuration for this package, merged with any base configuration.
 */
export function getKitConfigFromPackageManifest(
  packageJson: PackageManifest,
  packageDir: string
): KitConfig | undefined {
  return loadBaseConfig(packageJson["rnx-kit"], packageDir);
}
