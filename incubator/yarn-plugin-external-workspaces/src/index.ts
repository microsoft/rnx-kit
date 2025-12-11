import { type Plugin } from "@yarnpkg/core";
import { externalWorkspacesConfiguration } from "./configuration.ts";
import { ExternalWorkspaceFetcher } from "./fetcher.ts";
import { afterAllInstalled, reduceDependency } from "./hooks.ts";
import { OutputWorkspaces } from "./outputCommand.ts";
import {
  ExternalWorkspaceResolver,
  RemoteFallbackResolver,
} from "./resolvers.ts";

export type {
  DefinitionFinder,
  PackagePaths,
  WorkspaceOutputJson,
} from "./types.ts";

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
