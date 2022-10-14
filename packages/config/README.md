<!--remove-block start-->

# @rnx-kit/config

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/config)](https://www.npmjs.com/package/@rnx-kit/config)

<!--remove-block end-->

Query for a package's configuration.

Configuration influences how the CLI behaves. If you're not using the CLI, and
instead using a specific tool programmatically, you can use this library to read
configuration data and use it as tool input.

## Schema

Package configuration is under the top-level `rnx-kit` entry in package.hson. It
is of type `KitConfig`.

### `KitConfig`

Configuration information for an rnx-kit package. This is retrieved from
'rnx-kit' in package.json.

| Name                  | Type                                        | Description                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kitType               | "app", "library", undefined                 | Library or App package. Used by the dependency manager when projecting capabilities into `dependencies`, `devDependencies`, and `peerDependencies`. Library package dependencies are private, in dev and peer. App package dependencies are public. |
| reactNativeVersion    | string, undefined                           | React Native version (or range) which this package supports.                                                                                                                                                                                        |
| reactNativeDevVersion | string, undefined                           | React Native version to use during development of this package. If not specified, the minimum `reactNativeVersion` is used.                                                                                                                         |
| bundle                | `BundleConfig`, `BundleConfig[]`, undefined | Specifies how the package is bundled.                                                                                                                                                                                                               |
| server                | `ServerConfig`, undefined                   | Specifies how the package's bundle server is configured.                                                                                                                                                                                            |
| capabilities          | `Capability[]`, undefined                   | List of [capabilities](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check#capabilities) that this package needs. A capability is a well-known name (string).                                                                         |
| customProfiles        | string, undefined                           | Path to a file containing [custom profiles](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check#custom-profiles).                                                                                                                     |

### `BundleConfig` inherits `BundleParameters`

Defines how a package is bundled. Includes shared bundling parameters with
platform-specific overrides.

| Name      | Type                                                   | Description                                                                                                                                                               |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id        | string, undefined                                      | Unique identifier for this bundle definition. Only used as a reference within the build system.                                                                           |
| targets   | `AllPlatforms[]`, undefined                            | The platform(s) for which this package may be bundled.                                                                                                                    |
| platforms | {[K in `AllPlatforms`]: `BundleDefinition`}, undefined | Platform-specific overrides for bundling parameters. Any parameter not listed in an override gets its value from the shared bundle definition, or falls back to defaults. |

### `AllPlatforms`

Union of: "ios", "android", "windows", "win32", "macos"

### `BundleParameters` inherits `BundlerPlugins`

Parameters controlling how a bundle is constructed.

| Name                     | Type               | Description                                                                                                                                                                                            |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| entryFile                | string, undefined  | Path to the .js file which is the entry-point for building the bundle. Either absolute, or relative to the package.                                                                                    |
| bundleOutput             | string, undefined  | Path to the output bundle file. Either absolute or relative to the package.                                                                                                                            |
| bundleEncoding           | string, undefined  | [Encoding scheme](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) to use when writing the bundle file. Currently limited to UTF-8, UTF-16 (little endian), and 7-bit ASCII. |
| sourcemapOutput          | string, undefined  | Path to use when creating the bundle source map file. Either absolute, or relative to the package.                                                                                                     |
| sourcemapSourcesRoot     | string, undefined  | Path to the package's source files. Used to make source-map paths relative and therefore portable.                                                                                                     |
| sourcemapUseAbsolutePath | boolean, undefined | Controls whether or not SourceMapURL is reported as a full path or just a file name.                                                                                                                   |
| assetsDest               | string, undefined  | Path where all bundle assets (strings, images, fonts, sounds, ...) are written. Either absolute, or relative to the package.                                                                           |
| indexedBundleFormat      | boolean, undefined | Force the "Indexed RAM" bundle file format, even when targeting Android. Only applies to the `rnx-ram-bundle` command.                                                                                 |

### `BundlerPlugins`

Parameters controlling bundler plugins.

| Name                        | Type                                              | Description                                                                                                                                                         |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| detectCyclicDependencies    | boolean, `CyclicDetectorOptions`, undefined       | Choose whether to detect cycles in the dependency graph. `true` uses defaults, while `CyclicDetectorOptions` lets you control the detection process.                |
| detectDuplicateDependencies | boolean, `DuplicateDetectorOptions`, undefined    | Choose whether to detect duplicate packages in the dependency graph. `true` uses defaults, while `DuplicateDetectorOptions` lets you control the detection process. |
| typescriptValidation        | boolean, `TypeScriptValidationOptions`, undefined | Choose whether to type-check source files using TypeScript. `true` uses defaults, while `TypeScriptValidationOptions` lets you control the validation process.      |
| treeShake                   | boolean, undefined                                | Choose whether to enable tree shaking.                                                                                                                              |

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

### `TypeScriptValidationOptions`

| Name         | Type               | Default | Description                                                     |
| ------------ | ------------------ | ------- | --------------------------------------------------------------- |
| throwOnError | boolean, undefined | true    | Controls whether an error is thrown when type-validation fails. |

### `ServerConfig` inherits `BundlerPlugins`

| Name         | Type                | Description                                                                                                                                                                                                                                                  |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| projectRoot  | string, undefined   | Path to the root of your react-native application. The bundle server uses this root path to resolve all web requests. The root path should contain your Babel config, otherwise Metro won't be able to find it. Either absolute, or relative to the package. |
| assetPlugins | string[], undefined | Additional asset plugins to be used by the Metro Babel transformer. Comma-separated list containing plugin modules and/or absolute paths to plugin packages.                                                                                                 |
| sourceExts   | string[], undefined | Additional source-file extensions to include when generating bundles. Comma-separated list, excluding the leading dot.                                                                                                                                       |

## API

### `getKitConfig({module, cwd})`

Query for a package's rnx-kit configuration.

| Parameter | Type              | Description                                                                                     |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| module    | string, undefined | Read package configuration from the named module. When given, this takes precedence over `cwd`. |
| cwd       | string, undefined | Read package configuration from the given directory. Ignored when `module` is given.            |
| [Return]  | `KitConfig`, null | Package configuration, or `null` if nothing was found.                                          |

### `getBundleConfig(config, id)`

Get a bundle configuration from the rnx-kit configuration.

If an id is given, search for the matching bundle definition. Otherwise, use the
first bundle definition.

| Parameter | Type               | Description                                               |
| --------- | ------------------ | --------------------------------------------------------- |
| config    | `KitConfig`        | The package's rnx-kit configuration                       |
| id        | string, undefined  | Optional identity of the target bundle configuration      |
| [Return]  | `BundleDefinition` | Bundle configuration, or `undefined` if nothing was found |

### `getPlatformBundleConfig(bundle, platform)`

Resolves the platform selector for a bundle configuration.

| Parameter | Type               | Description                                                         |
| --------- | ------------------ | ------------------------------------------------------------------- |
| bundle    | `BundleConfig`     | Bundle config to resolve (includes the optional platform selectors) |
| platform  | `AllPlatforms`     | Target platform                                                     |
| [Return]  | `BundleDefinition` | Bundle config containing platform-specific overrides                |

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
