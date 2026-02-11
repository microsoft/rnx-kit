# @rnx-kit/config-types

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/config-types)](https://www.npmjs.com/package/@rnx-kit/config-types)

Shared TypeScript type definitions for rnx-kit packages.

This package provides core types used across the rnx-kit toolchain, including
configuration schemas, platform definitions, and package manifest types. It
enables type-safe integrations without pulling in implementation dependencies.

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
  BundleConfig,
  AllPlatforms,
  PackageManifest,
} from "@rnx-kit/config-types";
```

## Types

### Configuration Types

#### `KitConfig`

Configuration for an rnx-kit package, stored in the `rnx-kit` field of
package.json.

| Name      | Type                                          | Description                                                             |
| --------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| extends   | `string \| undefined`                         | Load base config from file or module.                                   |
| kitType   | `"app" \| "library" \| undefined`             | Whether this kit is an "app" or a "library". Defaults to `"library"`.   |
| alignDeps | `AlignDepsConfig \| undefined`                | Configures how `align-deps` should align dependencies for this package. |
| bundle    | `BundleConfig \| BundleConfig[] \| undefined` | Specifies how the package is bundled.                                   |
| server    | `ServerConfig \| undefined`                   | Specifies how the package's bundle server is configured.                |
| lint      | `object \| undefined`                         | Configures rnx-kit linting tools and their rules.                       |

#### `AlignDepsConfig`

Configuration for the `align-deps` dependency alignment tool.

| Name         | Type                                                          | Description                                                |
| ------------ | ------------------------------------------------------------- | ---------------------------------------------------------- |
| presets      | `string[] \| undefined`                                       | Presets to use for aligning dependencies.                  |
| requirements | `string[] \| { development: string[]; production: string[] }` | Requirements for this package, e.g. `react-native@>=0.66`. |
| capabilities | `Capability[] \| undefined`                                   | Capabilities used by the kit.                              |

#### `BundleConfig`

Defines how a package is bundled. Extends `BundleParameters`.

| Name      | Type                                              | Description                                            |
| --------- | ------------------------------------------------- | ------------------------------------------------------ |
| id        | `string \| undefined`                             | Unique identifier for this bundle configuration.       |
| targets   | `AllPlatforms[] \| undefined`                     | The platform(s) for which this package may be bundled. |
| platforms | `Partial<Record<AllPlatforms, BundleParameters>>` | Platform-specific overrides for bundling parameters.   |

#### `BundleParameters`

Parameters controlling how a bundle is constructed.

| Name            | Type                        | Description                                                                    |
| --------------- | --------------------------- | ------------------------------------------------------------------------------ |
| entryFile       | `string \| undefined`       | Path to the entry-point .js file. Either absolute, or relative to the package. |
| bundleOutput    | `string \| undefined`       | Path to the output bundle file.                                                |
| bundleEncoding  | `string \| undefined`       | Encoding scheme for the bundle file (UTF-8, UTF-16 LE, or 7-bit ASCII).        |
| sourcemapOutput | `string \| undefined`       | Path for the bundle source map file.                                           |
| assetsDest      | `string \| undefined`       | Path where bundle assets are written.                                          |
| treeShake       | `boolean \| EsbuildOptions` | Enable tree shaking via esbuild.                                               |
| hermes          | `boolean \| HermesOptions`  | Whether to run the Hermes compiler on the output bundle.                       |
| plugins         | `Plugin[]`                  | List of plugins to add to the bundling process.                                |

#### `ServerConfig`

Configuration for the Metro bundle server.

| Name         | Type                    | Description                                                           |
| ------------ | ----------------------- | --------------------------------------------------------------------- |
| projectRoot  | `string \| undefined`   | Path to the root of the react-native project.                         |
| assetPlugins | `string[] \| undefined` | Additional asset plugins for the Metro Babel transformer.             |
| sourceExts   | `string[] \| undefined` | Additional source-file extensions to include when generating bundles. |
| plugins      | `Plugin[]`              | List of plugins to add to the bundling process.                       |

### Bundler Plugin Types

#### `CyclicDetectorOptions`

Options for `@rnx-kit/metro-plugin-cyclic-dependencies-detector`.

| Name               | Type                   | Description                                                |
| ------------------ | ---------------------- | ---------------------------------------------------------- |
| includeNodeModules | `boolean \| undefined` | Include external packages from node_modules when scanning. |
| linesOfContext     | `number \| undefined`  | Size of the module backtrace printed with error messages.  |
| throwOnError       | `boolean \| undefined` | Whether to throw an exception when a cycle is detected.    |

#### `DuplicateDetectorOptions`

Options for `@rnx-kit/metro-plugin-duplicates-checker`.

| Name           | Type                    | Description                                                 |
| -------------- | ----------------------- | ----------------------------------------------------------- |
| ignoredModules | `string[] \| undefined` | List of modules to ignore when scanning for duplicates.     |
| bannedModules  | `string[] \| undefined` | List of modules that always cause a failure.                |
| throwOnError   | `boolean \| undefined`  | Whether to throw an exception when a duplicate is detected. |

#### `EsbuildOptions`

Options for `@rnx-kit/metro-serializer-esbuild` tree shaking.

| Name              | Type                              | Description                                  |
| ----------------- | --------------------------------- | -------------------------------------------- |
| minify            | `boolean \| undefined`            | Enable all minification.                     |
| minifyWhitespace  | `boolean \| undefined`            | Minify whitespace.                           |
| minifyIdentifiers | `boolean \| undefined`            | Minify identifiers.                          |
| minifySyntax      | `boolean \| undefined`            | Minify syntax.                               |
| target            | `string \| string[] \| undefined` | Target environment for generated code.       |
| analyze           | `boolean \| "verbose"`            | Analyze bundle composition.                  |
| metafile          | `string \| undefined`             | Path to write esbuild metafile for analysis. |

#### `TypeScriptValidationOptions`

Options for TypeScript validation during bundling.

| Name         | Type                   | Description                                          |
| ------------ | ---------------------- | ---------------------------------------------------- |
| throwOnError | `boolean \| undefined` | Whether to throw an exception when validation fails. |

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

### Package Manifest Types

#### `PackageManifest`

Type definitions for package.json files, including all standard npm fields plus
the `rnx-kit` configuration field.

#### `PackageData<T>`

Data structure representing a package's location and manifest.

| Name     | Type     | Description                               |
| -------- | -------- | ----------------------------------------- |
| root     | `string` | Directory path for the package.json file. |
| manifest | `T`      | Parsed package manifest.                  |

### Lint Rule Types

#### `NoDuplicatesRuleOptions`

Options for the `no-duplicates` lockfile lint rule.

| Name     | Type                                          | Description                                      |
| -------- | --------------------------------------------- | ------------------------------------------------ |
| enabled  | `boolean \| undefined`                        | Whether to enable this rule. Defaults to `true`. |
| packages | `(string \| [string, number])[] \| undefined` | List of packages to check for duplicates.        |

#### `NoWorkspacePackageFromNpmRuleOptions`

Options for the `no-workspace-package-from-npm` lockfile lint rule.

| Name    | Type                   | Description                                      |
| ------- | ---------------------- | ------------------------------------------------ |
| enabled | `boolean \| undefined` | Whether to enable this rule. Defaults to `true`. |

### Capability Types

#### `Capability`

Well-known capability names used by `align-deps` for dependency management.
Includes platform cores (`core`, `core-android`, `core-ios`, etc.), Metro
tooling (`metro`, `metro-config`), navigation (`navigation/native`,
`navigation/stack`), and many common React Native libraries.
