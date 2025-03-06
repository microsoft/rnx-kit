import { type Plugin } from "@yarnpkg/core";
import { CheckResolutions, OutputWorkspaces } from "./commands";
import { ExternalFetcher } from "./fetcher";
import { afterAllInstalled, reduceDependency } from "./hooks";
import { ExternalResolver, FallbackResolver } from "./resolver";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  /**
   * Hook up the custom fetcher and resolver
   */
  fetchers: [ExternalFetcher],
  resolvers: [ExternalResolver, FallbackResolver],

  /**
   * Add a hook to write out the workspaces if requested
   */
  hooks: {
    afterAllInstalled,
    reduceDependency,
  },

  commands: [OutputWorkspaces, CheckResolutions],
};

// eslint-disable-next-line no-restricted-exports
export default plugin;
