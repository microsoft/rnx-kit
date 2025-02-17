import { type Plugin } from "@yarnpkg/core";
import { getConfiguration } from "./configuration";
import { afterAllInstalled } from "./hooks";
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

  /**
   * Add a hook to write out the workspaces if requested
   */
  hooks: {
    afterAllInstalled,
  },
};

// eslint-disable-next-line no-restricted-exports
export default plugin;
