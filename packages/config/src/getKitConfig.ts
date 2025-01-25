import type { PackageManifest } from "@rnx-kit/tools-node/package";
import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";
import merge from "lodash.merge";
import * as fs from "node:fs";
import * as path from "node:path";
import type { KitConfig } from "./kitConfig";

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
  const mergedConfig = merge(require(spec), config);
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
