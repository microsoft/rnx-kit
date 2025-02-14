<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/external-workspaces

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-external-workspaces)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-external-workspaces)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This is the shared code module for `@rnx-kit/yarn-plugin-external-workspaces`.
This contains the core of the implementation for how the list of external
workspaces should be loaded from .json or .js configuration files as well as any
supporting utilities for this functionality.

## Motivation

This has been pulled into a separate package as there will need to be a set of
utilities provided to automate the process of setting up and maintaining these
relationships. Things to add in the future:

- Scan a repo and generate the list of packages in that repo, inject them into a
  .json file, or create a .js implementation.
- Scan a repo and set up the resolutions field in the root package.json to
  reference dependencies (and likely transitive dependencies)
- Validate dependency version numbers for external packages are within the right
  range.

## Installation

```sh
yarn add @rnx-kit/yarn-plugin-external-workspaces --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/yarn-plugin-external-workspaces
```

## Usage
