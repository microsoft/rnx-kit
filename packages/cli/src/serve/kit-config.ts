import type { ServerConfig } from "@rnx-kit/config";
import { getBundleConfig, getKitConfig } from "@rnx-kit/config";
import { pickValues } from "@rnx-kit/tools-language/properties";
import { getDefaultBundlerPlugins } from "../bundle/defaultPlugins";

type ServerConfigOverrides = {
  projectRoot?: string;
  assetPlugins?: string[];
  sourceExts?: string[];
  id?: string;
};

type CliServerConfig = ServerConfig & {
  plugins: Required<ServerConfig>["plugins"];
  treeShake: false;
};

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
    const maybeBundleConfig = getBundleConfig(kitConfig, overrides?.id);
    if (maybeBundleConfig) {
      serverConfig = pickValues(maybeBundleConfig, [
        "detectCyclicDependencies",
        "detectDuplicateDependencies",
        "typescriptValidation",
        "plugins",
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
