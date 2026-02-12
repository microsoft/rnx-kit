# @rnx-kit/types-bundle-config

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/types-bundle-config)](https://www.npmjs.com/package/@rnx-kit/types-bundle-config)

TypeScript type definitions for Metro bundling configuration, bundler plugins,
server configuration, and React Native platform targets. This package exists to
break circular dependencies between rnx-kit packages that share these types.

## Installation

```sh
yarn add @rnx-kit/types-bundle-config --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/types-bundle-config
```

## Usage

```ts
import type {
  BundleConfig,
  BundleParameters,
  ServerConfig,
  AllPlatforms,
  Plugin,
} from "@rnx-kit/types-bundle-config";
```

## Types

### Bundle Configuration

#### `BundleConfig`

Defines how a package is bundled. Extends `BundleParameters` with
platform-specific overrides.

| Name      | Type                                              | Description                                            |
| --------- | ------------------------------------------------- | ------------------------------------------------------ |
| id        | `string \| undefined`                             | Unique identifier for this bundle configuration.       |
| targets   | `AllPlatforms[] \| undefined`                     | The platform(s) for which this package may be bundled. |
| platforms | `Partial<Record<AllPlatforms, BundleParameters>>` | Platform-specific overrides for bundling parameters.   |

#### `BundleParameters`

Parameters controlling how a bundle is constructed. Extends `BundlerPlugins` and
`BundleOutputOptions`.

| Name       | Type                                  | Description                                                               |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------- |
| entryFile  | `string \| undefined`                 | Path to the entry-point .js file. Either absolute or relative to package. |
| assetsDest | `string \| undefined`                 | Path where bundle assets are written.                                     |
| treeShake  | `boolean \| SerializerEsbuildOptions` | Enable tree shaking via esbuild.                                          |
| hermes     | `boolean \| HermesOptions`            | Whether to run the Hermes compiler on the output bundle.                  |
| plugins    | `Plugin[]`                            | List of plugins to add to the bundling process.                           |

#### `BundleOutputOptions`

Output path and encoding options for a bundle, derived from Metro's
`OutputOptions`.

| Name                     | Type                   | Description                                                          |
| ------------------------ | ---------------------- | -------------------------------------------------------------------- |
| bundleOutput             | `string \| undefined`  | Path to the output bundle file.                                      |
| bundleEncoding           | `string \| undefined`  | Encoding scheme (UTF-8, UTF-16 LE, or 7-bit ASCII).                  |
| sourcemapOutput          | `string \| undefined`  | Path for the bundle source map file.                                 |
| sourcemapSourcesRoot     | `string \| undefined`  | Path to package source files for portable source-map paths.          |
| sourcemapUseAbsolutePath | `boolean \| undefined` | Whether SourceMapURL is reported as a full path or just a file name. |

#### `HermesOptions`

Options for the Hermes bytecode compiler.

| Name    | Type                    | Description                    |
| ------- | ----------------------- | ------------------------------ |
| command | `string \| undefined`   | Path to `hermesc` binary.      |
| flags   | `string[] \| undefined` | Arguments passed to `hermesc`. |

### Server Configuration

#### `ServerConfig`

Configuration for the Metro bundle server. Extends `BundlerPlugins`.

| Name         | Type                    | Description                                                           |
| ------------ | ----------------------- | --------------------------------------------------------------------- |
| projectRoot  | `string \| undefined`   | Path to the root of the react-native project.                         |
| assetPlugins | `string[] \| undefined` | Additional asset plugins for the Metro Babel transformer.             |
| sourceExts   | `string[] \| undefined` | Additional source-file extensions to include when generating bundles. |
| plugins      | `Plugin[]`              | List of plugins to add to the bundling process.                       |

### Bundler Plugin Types

#### `Plugin`

A plugin is either a module name string or a tuple of `[name, options]`.

### Platform Types

#### `AllPlatforms`

Union type of supported React Native platforms:

```ts
type AllPlatforms =
  | "android"
  | "ios"
  | "macos"
  | "visionos"
  | "web"
  | "win32"
  | "windows";
```

#### `ALL_PLATFORM_VALUES`

Constant array containing all platform values (useful for iteration):

```ts
const ALL_PLATFORM_VALUES = [
  "android",
  "ios",
  "macos",
  "visionos",
  "web",
  "win32",
  "windows",
] as const;
```
