import { type Plugin } from "@yarnpkg/core";
import { getConfiguration } from "./options";
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

export default plugin;
