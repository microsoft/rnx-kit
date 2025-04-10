# @rnx-kit/yarn-plugin-install-to

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-install-to)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-install-to)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A plugin for yarn v4, that adds an "install-to" command that executes a partial
install based on the dependencies of one or more packages inside the monorepo.

## Details

This replicates the core installation code in yarn's Project.install function.

- It forces the immutable flag internally which will error if there are any
  lockfile changes
- This will also install dependencies of the root package given that this is
  typically required for executing root level build scripts.

Internally this works by paring down the set of resolved packages to just ones
required to install, this is what drives the set of fetchers. Then the set of
`accessibleLocators` are pared down which drives the link/install behavior.

## Installation

The plugin needs to be installed via `yarn plugin install` command. This needs
to reference the produced bundle out of the dist folder.

```sh
yarn plugin import ./path/to/my/yarn-plugin-install-to.cjs
```

## Usage

Once installed the `install-to` command will appear in `yarn --help`.

`> yarn install-to @my-scope/package1 @my-scope/package2`

Optionally if `--verbose` is specified additional information about the packages
installed and what percent of the repository is being installed will be output.

`> yarn install-to --verbose @my-scope/package1`
