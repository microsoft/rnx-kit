<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/yarn-plugin-external-workspaces

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-external-workspaces)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-external-workspaces)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A plugin for yarn v4, that allows multiple monorepos to reference one another
when inside of an enterprise scale monorepo. This is particularly valuable when
there is a way to only have a portion of the outer repo present on the user's
machine at a given time. When the code is present locally the package resolution
should point to the local files, when it is not present it should be routed to
npm.

## Details

This works by creating a custom yarn `Resolver` which handles the `external:`
range protocol, looks up the references and transforms them into `portal:`
references if they are local, or `npm:` references if they need to be
downloaded.

The list of external packages is loaded from the `externalWorkspacesConfig`
which can point to either a .json file or a .js/.cjs file.

The range protocol should be put in the `resolutions` entry in the root
package.json file in the format:

```json
{
  "resolutions": {
    "@some-scope/some-package": "external:*"
  }
}
```

### JSON Configuration

This takes a path to a .json file which should contain a
`Record<string, PackageDefinition>` where package definition has the following
signature:

```ts
export type PackageDefinition = {
  /**
   * The path to the root of the package on the local filesystem, relative to the
   * location of the configuration file. Absolute paths will be supported but are are
   * not recommended unless the configuration is dynamically generated.
   */
  path?: string;

  /**
   * The version of the package to install if it does not exist in the local file system.
   */
  version: string;
};
```

Note that the .json file can have an optional key-path that denotes sub-entries
within an existing .json file. Examples:

- (default) `package.json/external-workspaces` - will look for the
  `"external-workspaces"` key within the root package.json file
- `../external-workspaces.json` - will look up a directory and treat the
  specified file as being of type `Record<string, PackageDefinition>`
- `script/myOtherConfig.json/key1/key2` - will traverse multiple keys to load
  the workspace lookup table.

### JS Configuration

The js file specified in the config path will be loaded via
`require(configPath)` and should return a function of the form:

```ts
/**
 * Signature of the function to retrieve information about a given package. If the configuration setting routes
 * to a .js or .cjs file instead of .json, the default export should be a function of this signature.
 */
export type DefinitionFinder = (pkgName: string) => PackageDefinition | null;
```

## Installation

```sh
yarn add @rnx-kit/yarn-plugin-external-workspaces --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/yarn-plugin-external-workspaces
```

## Usage
