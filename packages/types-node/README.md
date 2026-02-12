# @rnx-kit/types-node

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/types-node)](https://www.npmjs.com/package/@rnx-kit/types-node)

TypeScript type definitions for package.json manifests and package data
structures. This package exists to break circular dependencies between rnx-kit
packages that share these types.

## Installation

```sh
yarn add @rnx-kit/types-node --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/types-node
```

## Usage

```ts
import type { PackageManifest, PackageData } from "@rnx-kit/types-node";
```

## Types

### Package Manifest Types

#### `PackageManifest`

Comprehensive type definitions for `package.json` files, including all standard
npm fields plus the `rnx-kit` configuration field (typed as `KitConfig` from
`@rnx-kit/types-kit-config`).

Covers identity and metadata (`name`, `version`, `license`, `author`), entry
points (`main`, `module`, `types`, `exports`), dependencies, scripts, engines,
workspaces, and more.

#### `PackageData<T>`

Data structure representing a package's location and manifest.

| Name     | Type     | Description                               |
| -------- | -------- | ----------------------------------------- |
| root     | `string` | Directory path for the package.json file. |
| manifest | `T`      | Parsed package manifest.                  |

### Supporting Types

#### `PackageExports`

A record mapping export paths to string entry points or `ExportsGroup` objects.

#### `ExportsGroup`

Conditional export map with `types`, `import`, `require`, and `default` fields.

#### `PackagePerson`

A package author or contributor, either as a string or a `PersonEntry` object
with `name`, `email`, and `url` fields.

#### `FundingEntry`

A funding source, either as a URL string or an object with `type` and `url`.
