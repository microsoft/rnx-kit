import {
  type ConfigurationDefinitionMap,
  type ConfigurationValueMap,
  type Plugin,
} from "@yarnpkg/core";
import { externalWorkspacesConfiguration } from "./cofiguration";
import { ExternalFetcher } from "./fetcher";
import { afterAllInstalled, reduceDependency } from "./hooks";
import { OutputWorkspaces } from "./outputCommand";
import { ExternalResolver, FallbackResolver } from "./resolvers";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  configuration: {
    ...externalWorkspacesConfiguration,
  } as Partial<ConfigurationDefinitionMap<ConfigurationValueMap>>,
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

  commands: [OutputWorkspaces],
};

// eslint-disable-next-line no-restricted-exports
export default plugin;
