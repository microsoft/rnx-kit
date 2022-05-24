import type { KitConfig } from "./kitConfig";
import type { ServerConfig } from "./serverConfig";
import { pickValues } from "@rnx-kit/tools-language";
import { getBundleDefinition } from "./getBundleDefinition";

/**
 * Get server configuration from the rnx-kit configuration.
 *
 * @param config rnx-kit configuration
 * @returns Server configuration
 */
export function getServerConfig(config: KitConfig): ServerConfig {
  // 'server' property not set?
  if (!Object.prototype.hasOwnProperty.call(config, "server")) {
    // if bundling is enabled, use the bundle definition to control the server
    try {
      const bundleDefinition = getBundleDefinition(config);
      return {
        ...pickValues(bundleDefinition, [
          "detectCyclicDependencies",
          "detectDuplicateDependencies",
          "typescriptValidation",
          "treeShake",
        ]),
      };
    } catch {
      throw new Error(
        "Bundle serving is not enabled. The rnx-kit configuration for this package has no server config, nor does it have bundling config to use as a baseline for running the bundle server."
      );
    }
  }

  // 'server' property explicitly set to undefined?
  if (config.server === undefined) {
    throw new Error(
      "Bundle serving is explicitly disabled in the rnx-kit configuration for this package."
    );
  }

  return config.server;
}
