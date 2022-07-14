import path from "path";
import { readPackage } from "@rnx-kit/tools-node";
import { KitConfig } from "./kitConfig";

/**
 * Options for retrieving a kit config. The default is equivalent to passing { cwd: process.cwd() }
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

/**
 * Query for a package's rnx-kit configuration.
 *
 * @param options Options for retrieving the configuration.
 * @returns
 */
export function getKitConfig(
  options: GetKitConfigOptions = {}
): KitConfig | undefined {
  // find the package dir that holds the rnx-kit configuration
  const packageDir = options.module
    ? path.dirname(require.resolve(options.module + "/package.json"))
    : options.cwd || process.cwd();

  // try to read package.json
  try {
    const packageJson = readPackage(packageDir);
    return packageJson["rnx-kit"];
  } catch {
    return undefined;
  }
}
