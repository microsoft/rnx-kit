import { type Plugin } from "@yarnpkg/core";
import { externalWorkspacesConfiguration } from "./cofiguration";
import { ExternalWorkspaceFetcher } from "./fetcher";
import { afterAllInstalled, reduceDependency } from "./hooks";
import { OutputWorkspaces } from "./outputCommand";
import { ExternalWorkspaceResolver, RemoteFallbackResolver } from "./resolvers";

export type {
  DefinitionFinder,
  PackagePaths,
  WorkspaceOutputJson,
} from "./types";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  /**
   * Add the plugin configuration options
   */
  configuration: externalWorkspacesConfiguration,

  /**
   * Hook up the custom fetcher and resolver
   */
  fetchers: [ExternalWorkspaceFetcher],
  resolvers: [ExternalWorkspaceResolver, RemoteFallbackResolver],

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
