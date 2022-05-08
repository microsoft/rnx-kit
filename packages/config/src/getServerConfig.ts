import type { KitConfig } from "./kitConfig";
import type { ServerConfig, ServerRequiredParameters } from "./serverConfig";

export type ServerWithRequiredParameters = ServerConfig &
  ServerRequiredParameters;

/**
 * Get the server config from the kit config.
 *
 * @param config kit configuration
 * @returns server configuration with defaults for any missing values
 */
export function getServerConfig(
  config: KitConfig
): ServerWithRequiredParameters {
  const defaultConfig: ServerWithRequiredParameters = {
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    treeShake: false,
  };

  return { ...defaultConfig, ...(config.server ?? {}) };
}
