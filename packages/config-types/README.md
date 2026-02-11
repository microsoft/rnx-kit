# @rnx-kit/config-types

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/config-types)](https://www.npmjs.com/package/@rnx-kit/config-types)

TypeScript type definitions for rnx-kit configuration, dependency alignment, and
lint rules. This package exists to break circular dependencies between rnx-kit
packages that share these types.

## Installation

```sh
yarn add @rnx-kit/config-types --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/config-types
```

## Usage

```ts
import type {
  KitConfig,
  AlignDepsConfig,
  Capability,
} from "@rnx-kit/config-types";
```

## Types

### Configuration Types

#### `KitConfig`

Configuration for an rnx-kit package, stored in the `rnx-kit` field of
package.json.

| Name      | Type                                          | Description                                                               |
| --------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| extends   | `string \| undefined`                         | Load base config from file or module.                                     |
| kitType   | `KitType \| undefined`                        | Whether this kit is an `"app"` or a `"library"`. Defaults to `"library"`. |
| alignDeps | `AlignDepsConfig \| undefined`                | Configures how `align-deps` should align dependencies for this package.   |
| bundle    | `BundleConfig \| BundleConfig[] \| undefined` | Specifies how the package is bundled.                                     |
| server    | `ServerConfig \| undefined`                   | Specifies how the package's bundle server is configured.                  |
| lint      | `object \| undefined`                         | Configures rnx-kit linting tools and their rules.                         |

#### `KitType`

```ts
type KitType = "app" | "library";
```

#### `DependencyVersions`

A record mapping package names to version strings.

#### `GetDependencyVersions`

A function returning a `DependencyVersions` record.

### Dependency Alignment Types

#### `AlignDepsConfig`

Configuration for the `align-deps` dependency alignment tool.

| Name         | Type                                                          | Description                                                |
| ------------ | ------------------------------------------------------------- | ---------------------------------------------------------- |
| presets      | `string[] \| undefined`                                       | Presets to use for aligning dependencies.                  |
| requirements | `string[] \| { development: string[]; production: string[] }` | Requirements for this package, e.g. `react-native@>=0.66`. |
| capabilities | `Capability[] \| undefined`                                   | Capabilities used by the kit.                              |

#### `Capability`

Well-known capability names used by `align-deps` for dependency management.
Includes platform cores (`core`, `core-android`, `core-ios`, etc.), Metro
tooling (`metro`, `metro-config`), navigation (`navigation/native`,
`navigation/stack`), and many common React Native libraries.

#### `MetaCapability`

Meta-capabilities that aggregate other capabilities (e.g. `"core/testing"`).

### Lint Rule Types

#### `RuleBaseOptions`

Base options shared by all lint rules.

| Name    | Type                   | Description                                      |
| ------- | ---------------------- | ------------------------------------------------ |
| enabled | `boolean \| undefined` | Whether to enable this rule. Defaults to `true`. |

#### `NoDuplicatesRuleOptions`

Options for the `no-duplicates` lockfile lint rule. Extends `RuleBaseOptions`.

| Name     | Type                                                            | Description                               |
| -------- | --------------------------------------------------------------- | ----------------------------------------- |
| packages | `readonly (string \| readonly [string, number])[] \| undefined` | List of packages to check for duplicates. |

#### `NoWorkspacePackageFromNpmRuleOptions`

Options for the `no-workspace-package-from-npm` lockfile lint rule. Extends
`RuleBaseOptions`.
