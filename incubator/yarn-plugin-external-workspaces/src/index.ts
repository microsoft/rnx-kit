import { getConfiguration } from "@rnx-kit/external-workspaces/options";
import { type Plugin } from "@yarnpkg/core";
import { ExternalResolver } from "./resolver";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  /**
   * Add a new configurable setting in yarn's configuration.
   */
  configuration: getConfiguration(),

  /**
   * Hook up the custom resolver
   */
  resolvers: [ExternalResolver],
};

// eslint-disable-next-line no-restricted-exports
export default plugin;
