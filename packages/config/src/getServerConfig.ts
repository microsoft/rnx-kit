import type { KitConfig } from "./kitConfig";
import type { ServerConfig } from "./serverConfig";
import { pickValues } from "@rnx-kit/tools-language";
import { getBundleConfig } from "./getBundleConfig";

/**
 * Get server configuration from the rnx-kit configuration. If no server
 * configuration is found, a default server configuration is created from
 * the package's bundle configuration.
 *
 * @param config The package's rnx-kit configuration
 * @returns Server configuration, or `undefined` if bundle serving is disabled
 */
export function getServerConfig(config: KitConfig): ServerConfig | undefined {
  // 'server' property not set?
  if (!Object.prototype.hasOwnProperty.call(config, "server")) {
    // no explicit server config, which means we can only run the server when
    // bundling is enabled. use bundle config as server config.
    const bundleConfig = getBundleConfig(config);
    if (bundleConfig) {
      return {
        ...pickValues(bundleConfig, [
          "detectCyclicDependencies",
          "detectDuplicateDependencies",
          "typescriptValidation",
          "treeShake",
        ]),
      };
    }
  }

  // 'server' property explicitly set to undefined?
  if (config.server === undefined) {
    return undefined;
  }

  return config.server;
}
