import type { KitConfig } from "./kitConfig";
import type { ServerConfig } from "./serverConfig";

/**
 * Get server configuration from the rnx-kit configuration.
 *
 * @param config The package's rnx-kit configuration
 * @returns Server configuration, or `undefined` if nothing was found.
 */
export function getServerConfig(config: KitConfig): ServerConfig | undefined {
  if (!config.server) {
    return undefined;
  }

  return config.server;
}
