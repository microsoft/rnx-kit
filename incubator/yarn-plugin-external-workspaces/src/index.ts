import { type Plugin } from "@yarnpkg/core";
import { CheckResolutions, OutputWorkspaces } from "./commands";
import { ExternalFetcher } from "./fetcher";
import { afterAllInstalled } from "./hooks";
import { ExternalResolver } from "./resolver";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  /**
   * Hook up the custom fetcher and resolver
   */
  fetchers: [ExternalFetcher],
  resolvers: [ExternalResolver],

  /**
   * Add a hook to write out the workspaces if requested
   */
  hooks: {
    afterAllInstalled,
  },

  commands: [OutputWorkspaces, CheckResolutions],
};

// eslint-disable-next-line no-restricted-exports
export default plugin;
