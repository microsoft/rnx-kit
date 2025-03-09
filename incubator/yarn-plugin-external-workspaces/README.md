<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/yarn-plugin-external-workspaces

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-external-workspaces)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-external-workspaces)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A plugin for yarn v4, that allows multiple monorepos to reference one another
when present on disk, automatically falling back to npm semver lookups when the
local files are not present. This is particularly useful for enterprise scale
monorepos that contain multiple JS project roots.

In the case where the large scale monorepos support some form of project
scoping, where the various projects may or may not be present on disk, this
allows dynamic fallback to standard npm resolution in the case a project is not
present. This happens without lockfile modification.

## Details

This plugin works by creating two new protocols, `external:` which is a soft
link type, used to create the local file links, and `fallback:` a hard link type
protocol which routes to the `npm:` protocol. The `external:` entries are
supported by the `ExternalResolver` and `ExternalFetcher` classes. The
`fallback:` protocol is supported by the `FallbackResolver` class which takes
the `fallback:` descriptors and binds them to `npm:` locators. In this way the
`fallback:` entries in the lockfile share their resolution with the `npm:`
entries and the `NpmSemverFetcher` will end up being the one to drive the cache
behavior.

This is all driven by use of the `reduceDependencies` hook which will
automatically process dependencies during resolution, routing local dependencies
to the `external:` protocol, and non-local dependencies to the `fallback:`
protocol. To avoid lockfile mutation the resolvers set up a dependency chain via
the `Resolver.getResolutionDependencies` method to chain the three protocols
(external, fallback, and npm). The chain ordering is:

- For local projects: `external:` -> `fallback:` -> `npm:`
- For remote projects: `fallback:` -> `external:` -> `npm:`

This chaining ensures that all three protocols exist in the lockfile, regardless
of their presence on disk. Because the lockfile entries are alphabetical, the
lockfile remains identical, even if projects on disk change their local/remote
state.

## Installation

The plugin needs to be installed via yarn plugin install command. This needs to
reference the produced bundle out of the dist folder.

```sh
yarn plugin import ./path/to/my/external-workspaces.cjs
```

The package itself also has a bin command that can be used as a self-installer,
so if you add the plugin as a dependency to your scripts folder, you can tell it
to install itself by executing `install-external-workspaces-plugin` from within
the yarn repo where the plugin should be installed.

## Usage

There are two parts to using the plugin, which are effectively configuring the
inputs and outputs.

### Inputs

To be able to determine the external workspaces the plugin needs to have the
`externalWorkspacesProvider` configuration option set. This can either point to
a .json file or a .js/.cjs file.

#### JSON Configuration

The format of the JSON is derived from the `WorkspaceOutputJson` type which has
the following format:

```ts
/**
 * Format of the output file for repo and workspace information. Anything outside of the generated
 * section will be maintained as-is.
 */
export type WorkspaceOutputJson = {
  generated: {
    /**
     * The version of the output format
     */
    version: string;

    /**
     * Relative path from the recorded file to the root of the repository root for the workspaces
     */
    repoPath: string;

    /**
     * Set of workspaces in the repository, with paths relative to the repo root in the form of:
     * - Record<"@scope/package-name", "./path/to/package">
     */
    workspaces: Record<string, string>;
  };
};
```

As mentioned in the comments, anything outside of the generated section is
ignored. When looking up the workspace paths to see if they exist on disk, the
path is constructed via joining the path to the config file, the repo path, and
the relative paths within.

#### JS Configuration

To configure via JavaScript, the specified JS file will be loaded via `require`
and should return a function as the default export with the following type:

```ts
/**
 * Data needed to resolve an external package.
 */
export type PackagePaths = {
  /**
   * Relative path to the package location from wherever the definition is defined. If these are loaded from
   * a .json file, this will be relative to the location of the .json file. These can be absolute if the JS loader
   * will handling resolving everything itself.
   */
  path: string | null;
};

/**
 * Default export signature, package name includes scope if it exists. e.g. @my-scope/package-name
 */
export type FindPackage = (packageName: string) => PackagePaths | null;
```

The existence of returned `PackagePaths` will cause this package to be treated
as external, even if the path is null. If the path is set the plugin will check
for the existence of a `package.json` file at that location to treat it as
local. Each package name will only be checked once per session, caching will
happen within the plugin.

### Outputs

The plugin also has the ability to write out .json files in the format of
`WorkspaceOutputJson` by using a command or during yarn install. The output
location is set via the `externalWorkspacesOutputPath`. If it is set to a .json
file it will write to that file, if it is a directory name, it will create a
file with a the name of the root package in the repo. So if your root
package.json has the name set to `my-repo`, it will write out a file
`my-repo-workspaces.json` at the specified directory.

By default this output will happen automatically on install. It will check the
contents of the file before writing and will skip the write if no changes are
required. This automatic write behavior can be suppressed by setting
`externalWorkspacesOutputOnlyOnCommand` to true via
`yarn config set externalWorkspacesOutputOnlyOnCommand true`.

The output can be triggered explicitly by running
`yarn external-workspaces output` with the ability to override settings or check
for changes.

See the command `--help` entry for options.
