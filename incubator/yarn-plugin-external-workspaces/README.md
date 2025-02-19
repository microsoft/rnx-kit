<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/yarn-plugin-external-workspaces

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-external-workspaces)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-external-workspaces)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A plugin for yarn v4, that allows multiple monorepos to reference one another
when inside of an enterprise scale monorepo that has multiple JS project roots
within it.

In the case where the large scale monorepos support some form of project
scoping, where the various projects may or may not be present on disk, this
allows dynamic fallback to standard npm resolution in the case a project is not
present. This happens without lockfile modification.

## Details

This works by creating a custom yarn `Resolver` which handles the `external:`
range protocol, looks up the references and transforms them into `portal:`
references if they are local, or `npm:` references if they need to be
downloaded.

## Installation

The plugin needs to be installed via yarn plugin install command. This needs to
reference the produced bundle out of the dist folder.

```sh
yarn plugin import ./path/to/my/external-workspaces.cjs
```

## Usage

### Configuration

The configuration is loaded from the root `package.json` in the
`external-workspaces` key and has the format:

```ts
/**
 * Format for package.json : "external-workspaces"
 */
export type ExternalWorkspacesConfig = {
  /**
   * One of:
   * - relative path to .json file - ./path/to/file.json
   * - relative path to .json file with subkeys - ./path/to/file.json/externals
   * - relative path to .js or .cjs file which returns a `DefinitionFinder` function
   * - a collection of package name to { path, version } mappings
   */
  externalDependencies?:
    | string
    | Record<string, { path: string; version: string }>;

  // path to a json file (with optional sub-keys) to write out workspace info
  outputPath?: string;

  // leverage the output path, but write out via the `yarn external-workspaces output` command
  outputOnlyOnCommand?: boolean;

  // include private workspaces in the output, off by default
  outputPrivateWorkspaces?: boolean;

  // Log file path or 'console' to print to console.
  logTo?: string;
};

/**
 * Signature of the function to retrieve information about a given package. If externalDependencies routes
 * to a .js or .cjs file instead of .json, the default export should be a function of this signature.
 */
export type DefinitionFinder = (pkgName: string) => PackageDefinition | null;
```

### Consuming External Workspaces

To leverage the external workspaces:

- the plugin must be able to load the set from some .json or .js file
- the root package.json needs to have a resolutions entry for each package with
  the version set to `"external:*"`

This is the range protocol this plugin uses to intercept resolutions and
transform them. To make this easier to manage this plugin provides a command to
set this up automatically. To see what the command will do run:

`yarn external-workspaces resolutions --check-only`

This will load the configured external workspaces, look through this repo's
workspaces, and add any external workspaces to the resolutions field. With
--check-only mode it will only list the changes that will be made. Omit that to
write out the updated resolutions in sorted order.

### Producing External Workspace Definitions

Setting the output path above will cause the plugin to write out the current
workspaces for this repo to a .json file automatically on yarn install. This
file will not be modified unless information has changed in some fashion
(package add, delete, rename, or version change). The paths will automatically
be relative to the target file location.

Note that setting the `outputOnlyOnCommand` option will disable the automatic
behavior. In that case this can be done manually with the following command:

`yarn external-workspaces output`

See the command `--help` entry for options.
