import type { ServerConfig, BundlerPlugins } from "@rnx-kit/config";
import { getKitConfig, getServerConfig } from "@rnx-kit/config";
import { getDefaultBundlerPlugins } from "../bundler-plugin-defaults";
import { pickValues } from "@rnx-kit/tools-language/properties";

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
  const maybeServerConfig = kitConfig ? getServerConfig(kitConfig) : undefined;
  const serverConfig = maybeServerConfig ?? {};

  return {
    ...getDefaultBundlerPlugins(),
    ...serverConfig,
    ...pickValues(overrides, ["projectRoot", "assetPlugins", "sourceExts"]),
  };
}
