import type { ServerConfig, BundlerPlugins } from "@rnx-kit/config";
import { getKitConfig, getBundleConfig } from "@rnx-kit/config";
import { pickValues } from "@rnx-kit/tools-language/properties";
import { getDefaultBundlerPlugins } from "../bundle/defaultPlugins";

export type ServerConfigOverrides = {
  projectRoot?: string;
  assetPlugins?: string[];
  sourceExts?: string[];
};

export type CliServerConfig = ServerConfig & Required<BundlerPlugins>;

/**
 * Get the server configuration from the rnx-kit configuration. Apply any overrides.
 *
 * @param overrides Overrides to apply. These take precedence over the values in the rnx-kit configuration.
 * @returns Server configuration
 */
export function getKitServerConfig(
  overrides: ServerConfigOverrides
): CliServerConfig {
  const kitConfig = getKitConfig();
  let serverConfig = kitConfig?.server;
  if (!serverConfig && kitConfig) {
    const maybeBundleConfig = getBundleConfig(kitConfig);
    if (maybeBundleConfig) {
      serverConfig = pickValues(maybeBundleConfig, [
        "detectCyclicDependencies",
        "detectDuplicateDependencies",
        "typescriptValidation",
        //"treeShake",  // don't pull in treeShake yet, since it doesn't work with the server
      ]);
    }
  }

  return {
    ...getDefaultBundlerPlugins(),
    ...serverConfig,
    treeShake: false, // tree shaking does not work with the bundle server
    ...pickValues(overrides, ["projectRoot", "assetPlugins", "sourceExts"]),
  };
}
