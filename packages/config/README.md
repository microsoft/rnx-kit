# @rnx-kit/config

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/config)](https://www.npmjs.com/package/@rnx-kit/config)

Query for a package's configuration.

Configuration influences how the CLI behaves. If you're not using the CLI, and
instead using a specific tool programmatically, you can use this library to read
configuration data and use it as tool input.

## Schema

Package configuration is under the top-level `rnx-kit` entry in package.hson. It
is of type `KitConfig`.

### `KitConfig`

| Name                  | Type                        | Description                                                                                                                                                                                                                                               |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kitType               | "app", "library", undefined | Library or App package. Used by the dependency manager when projecting capabilities into `dependencies`, `devDependencies`, and `peerDependencies`. Library package dependencies are private, in dev and peer. App package dependencies are public.       |
| reactNativeVersion    | string, undefined           | React Native version (or range) which this package supports.                                                                                                                                                                                              |
| reactNativeDevVersion | string, undefined           | React Native version to use during development of this package. If not specified, the minimum `reactNativeVersion` is used.                                                                                                                               |
| bundle                | `BundleConfig`, undefined   | Bundler configuration for a package. If true, then all defaults will be used. If a `BundleDefinition` (or array) is given, the object(s) are a detailed specification of the bundling configurtion. If undefined, this package does not support bundling. |
| server                | `ServerConfig`, undefined   | Bundle server configuration. If not specified, this package does not support bundle serving.                                                                                                                                                              |
| capabilities          | `Capability[]`, undefined   | List of [capabilities](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check#capabilities) that this package needs. A capability is a well-known name (string).                                                                               |
| customProfiles        | string, undefined           | Path to a file containing [custom profiles](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check#custom-profiles).                                                                                                                           |

### `BundleConfig`

Union of: boolean, `BundleDefinition`, `BundleDefinition[]`

### `BundleDefinition` inherits `BundlerRuntimeParameters`

| Name                    | Type                                                   | Default      | Description                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                      | string, undefined                                      |              | Unique identifier for this bundle definition. Only used as a reference within the build system.                                                                                                        |
| targets                 | `AllPlatforms[]`, undefined                            |              | The platform(s) for which this package may be bundled.                                                                                                                                                 |
| platforms               | {[K in `AllPlatforms`]: `BundleDefinition`}, undefined |              | Platform-specific overrides for bundling parameters. Any parameter not listed in an override gets its value from the shared bundle definition, or falls back to defaults.                              |
| entryPath               | string, undefined                                      | lib/index.js | Path to the .js file which is the entry-point for building the bundle. Either absolute, or relative to the package.                                                                                    |
| distPath                | string, undefined                                      | dist         | Path where the bundle and source map files are written. Either absolute, or relative to the package.                                                                                                   |
| assetsPath              | string, undefined                                      | dist         | Path where all bundle assets (strings, images, fonts, sounds, ...) are written. Either absolute, or relative to the package.                                                                           |
| bundlePrefix            | string, undefined                                      | index        | Prefix for the bundle name, followed by the platform and either ".bundle" (win, android) or ".jsbundle" (mac, ios).                                                                                    |
| bundleEncoding          | string, undefined                                      |              | [Encoding scheme](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) to use when writing the bundle file. Currently limited to UTF-8, UTF-16 (little endian), and 7-bit ASCII. |
| sourceMapPath           | string, undefined                                      |              | Path to use when creating the bundle source map file. Either absolute, or relative to the package.                                                                                                     |
| sourceMapSourceRootPath | string, undefined                                      |              | Path to the package's source files. Used to make source-map paths relative and therefore portable.                                                                                                     |

### `AllPlatforms`

Union of: "ios", "android", "windows", "win32", "macos"

### `BundlerRuntimeParameters`

| Name                        | Type                                           | Default | Description                                                                                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| detectCyclicDependencies    | boolean, `CyclicDetectorOptions`, undefined    | true    | Choose whether to detect cycles in the dependency graph. If true, then a default set of options will be used. If `CyclicDetectorOptions` is given, the object is a detailed specification of cyclic detector configuration.                       |
| detectDuplicateDependencies | boolean, `DuplicateDetectorOptions`, undefined | true    | Choose whether to detect duplicate packages in the dependency graph. If true, then a default set of options will be used. If `DuplicateDetectorOptions` is given, the object is a detailed specification of the duplicate detector configuration. |
| typescriptValidation        | boolean, undefined                             | true    | Choose whether to type-check the application during bundling and serving.                                                                                                                                                                         |
| experimental_treeShake      | boolean, undefined                             | false   | **EXPERIMENTAL** -- Choose whether to enable tree-shaking.                                                                                                                                                                                        |

### `CyclicDetectorOptions`

| Name               | Type               | Default | Description                                                                                                      |
| ------------------ | ------------------ | ------- | ---------------------------------------------------------------------------------------------------------------- |
| includeNodeModules | boolean, undefined | false   | When scanning for circular dependencies, include all external packages from node_modules.                        |
| linesOfContext     | number, undefined  | 1       | When a cycle is detected, this controls the size of the module backtrace that is printed with the error message. |
| throwOnError       | boolean, undefined | true    | Whether or not to throw an exception when a cycle is detected.                                                   |

### `DuplicateDetectorOptions`

| Name           | Type                | Default | Description                                                                                    |
| -------------- | ------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| ignoredModules | string[], undefined |         | List of modules to ignore when scanning for duplicate dependencies.                            |
| bannedModules  | string[], undefined |         | List of modules that always cause a failure, regardless of whether or not they are duplicated. |
| throwOnError   | boolean, undefined  | true    | Whether or not to throw an exception when a duplicate or banned module is detected.            |

### `ServerConfig` inherits `BundlerRuntimeParameters`

| Name         | Type                | Default | Description                                                                                                                                                                                                                                                  |
| ------------ | ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| projectRoot  | string, undefined   |         | Path to the root of your react-native application. The bundle server uses this root path to resolve all web requests. The root path should contain your Babel config, otherwise Metro won't be able to find it. Either absolute, or relative to the package. |
| assetPlugins | string[], undefined |         | Additional asset plugins to be used by the Metro Babel transformer. Comma-separated list containing plugin modules and/or absolute paths to plugin packages.                                                                                                 |
| sourceExts   | string[], undefined |         | Additional source-file extensions to include when generating bundles. Comma-separated list, excluding the leading dot.                                                                                                                                       |

## API

### `getKitConfig({module, cwd})`

Query for a package's configuration.

| Parameter | Type              | Description                                                                                     |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| module    | string, undefined | Read package configuration from the named module. When given, this takes precedence over `cwd`. |
| cwd       | string, undefined | Read package configuration from the given directory. Ignored when `module` is given.            |
| [Return]  | `KitConfig`, null | Package configuration, or `null` if nothing was found.                                          |

### `getBundleDefinition(config, id)`

Get a "complete" bundle definition from the package configuration.

If `id` is given, search for the matching bundle and return it. Otherwise,
return the first bundle definition found.

| Parameter | Type               | Description                                                                                             |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| config    | `BundleConfig`     | The bundle configuration, typically retrieved from the package configuration field `rnx-kit.bundle`.    |
| id        | string, undefined  | The id of the target bundle definition to use. This is not needed if only one bundle definition exists. |
| [Return]  | `BundleDefinition` | A "complete" bundle definition, with defaults applied for any missing values that have them.            |

### `getBundlePlatformDefinition(bundle, platform)`

Get a platform bundle definition, applying any platform-specific overrides.

| Parameter | Type               | Description                                                               |
| --------- | ------------------ | ------------------------------------------------------------------------- |
| bundle    | `BundleDefinition` | A "complete" bundle definition, typically from `getBundleDefinition()`.   |
| platform  | `AllPlatforms`     | The platform to resolve.                                                  |
| [Return]  | `BundleDefinition` | The input bundle definition with all platform-specific overrides applied. |

### `getKitCapabilities(config)`

Get capability information from the package configuration.

| Parameter | Type              | Description             |
| --------- | ----------------- | ----------------------- |
| config    | `KitConfig`       | Package configuration.  |
| [Return]  | `KitCapabilities` | Capability information. |

#### `KitCapabilities`

| Name                  | Type                        | Default                           | Description                                                                                                                                                                                                                                         |
| --------------------- | --------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kitType               | "app", "library", undefined | "library"                         | Library or App package. Used by the dependency manager when projecting capabilities into `dependencies`, `devDependencies`, and `peerDependencies`. Library package dependencies are private, in dev and peer. App package dependencies are public. |
| reactNativeVersion    | string                      |                                   | React Native version (or range) which this package supports.                                                                                                                                                                                        |
| reactNativeDevVersion | string                      | Min version in reactNativeVersion | React Native version to use during development of this package. If not specified, the minimum `reactNativeVersion` is used.                                                                                                                         |
| capabilities          | `Capability[]`              | `[]`                              | List of [capabilities](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check#capabilities) that this package needs. A capability is a well-known name (string).                                                                         |
| customProfiles        | string, undefined           |                                   | Path to a file containing [custom profiles](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check#custom-profiles).                                                                                                                     |

### `getServerConfig(config)`

Get a "complete" server configuration from the package configuration.

| Parameter | Type           | Description                                                                                     |
| --------- | -------------- | ----------------------------------------------------------------------------------------------- |
| config    | `KitConfig`    | The package configuration, typically retrieved from with `getKitConfig()`.                      |
| [Return]  | `ServerConfig` | A "complete" server configuration, with defaults applied for any missing values that have them. |
