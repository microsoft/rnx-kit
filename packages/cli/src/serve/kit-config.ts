import type { ServerWithRequiredParameters } from "@rnx-kit/config";
import { getKitConfig, getServerConfig } from "@rnx-kit/config";
import { pickValues } from "@rnx-kit/tools-language/properties";

export type ServerConfigOverrides = {
  projectRoot?: string;
  assetPlugins?: string[];
  sourceExts?: string[];
};

/**
 * Get the kit's server configuration. Apply any overrides.
 *
 * @param overrides Overrides to apply to the output server configuration. These take precedence over the values in the kit config.
 * @returns Overridden server configuration
 */
export function getKitServerConfig(
  overrides: ServerConfigOverrides
): ServerWithRequiredParameters {
  const kitConfig = getKitConfig();
  if (!kitConfig) {
    throw new Error(
      "No kit configuration found for this react-native experience"
    );
  }

  return {
    ...getServerConfig(kitConfig),
    ...pickValues(overrides, ["projectRoot", "assetPlugins", "sourceExts"]),
  };
}
