<!--remove-block start-->

# @rnx-kit/cli

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/cli)](https://www.npmjs.com/package/@rnx-kit/cli)

<!--remove-block end-->

Command-line interface for working with packages in your repo.

<!--remove-block start-->

- [Bundle a package](#bundle-a-package)
- [Start a bundle server](#start-a-bundle-server)
- [Manage dependencies](#manage-dependencies)
- [Generate a 3rd-party notice for a package](#generate-a-third%2dparty-notice-for-a-package)
- [Clean a React Native project](#clean-a-react-native-project)

<!--remove-block end-->

## Bundle a Package

Bundle a package using [Metro](https://facebook.github.io/metro). The bundling
process uses optional
[configuration](https://github.com/microsoft/rnx-kit/tree/main/packages/config)
parameters and command-line overrides.

The command `react-native rnx-bundle` is meant to be a drop-in replacement for
`react-native bundle`. If `rnx-bundle` ever becomes widely accepted, we will
work on upstreaming it to `@react-native-community/cli`, along with supporting
libraries for package configuration and Metro plugins.

### Example Commands

```bash
yarn react-native rnx-bundle
```

```bash
yarn react-native rnx-bundle --entry-file src/index.ts --bundle-output main.jsbundle --platform ios --dev false --minify true
```

### Example Configuration (Optional)

```json
{
  "rnx-kit": {
    "bundle": {
      "entryFile": "entry.js",
      "assetsDest": "dist",
      "detectCyclicDependencies": true,
      "detectDuplicateDependencies": {
        "ignoredModules": ["react-is"]
      },
      "typescriptValidation": true,
      "targets": ["ios", "android", "windows", "macos"],
      "platforms": {
        "android": {
          "assetsDest": "dist/res"
        },
        "macos": {
          "typescriptValidation": false
        }
      }
    }
  }
}
```

### Bundle Defaults

When certain parameters aren't specified in configuration or on the
command-line, they are explicitly set to default values.

| Parameter                   | Default Value                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| entryFile                   | "index.js"                                                                                    |
| bundleOutput                | "index.<`platform`>.bundle" (Windows, Android), or "index.<`platform`>.jsbundle" (iOS, MacOS) |
| detectCyclicDependencies    | `true`                                                                                        |
| detectDuplicateDependencies | `true`                                                                                        |
| typescriptValidation        | `true`                                                                                        |
| treeShake                   | `false`                                                                                       |

Other parameters have implicit defaults, buried deep in Metro or its
dependencies.

### Command-Line Overrides

| Override                                                           | Description                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| --id [id]                                                          | Target bundle definition. This is only needed when the rnx-kit configuration has multiple bundle definitions.                                          |
| --entry-file [file]                                                | Path to the root JavaScript or TypeScript file, either absolute or relative to the package.                                                            |
| --platform [`ios` \| `android` \| `windows` \| `win32` \| `macos`] | Target platform. When not given, all platforms in the rnx-kit configuration are bundled.                                                               |
| --dev [boolean]                                                    | If false, warnings are disabled and the bundle is minified (default: true).                                                                            |
| --minify [boolean]                                                 | Controls whether or not the bundle is minified. Disabling minification is useful for test builds.                                                      |
| --bundle-output [path]                                             | Path to the output bundle file, either absolute or relative to the package.                                                                            |
| --bundle-encoding [`utf8` \| `utf16le` \| `ascii`]                 | [Character encoding](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) to use when writing the bundle file.                   |
| --max-workers [number]                                             | Specifies the maximum number of parallel worker threads to use for transforming files. This defaults to the number of cores available on your machine. |
| --sourcemap-output [string]                                        | Path where the bundle source map is written, either absolute or relative to the package.                                                               |
| --sourcemap-sources-root [string]                                  | Path to use when relativizing file entries in the bundle source map.                                                                                   |
| --assets-dest [path]                                               | Path where bundle assets like images are written, either absolute or relative to the package. If not given, assets are ignored.                        |
| --tree-shake [boolean]                                             | Enable tree shaking to remove unused code and reduce the bundle size.                                                                                  |
| --reset-cache                                                      | Reset the Metro cache.                                                                                                                                 |
| --config [string]                                                  | Path to the Metro configuration file.                                                                                                                  |
| -h, --help                                                         | Show usage information.                                                                                                                                |

## Start a Bundle Server

Start a bundle server for a package using
[Metro](https://facebook.github.io/metro). The bundle server uses optional
[configuration](https://github.com/microsoft/rnx-kit/tree/main/packages/config)
parameters and command-line overrides.

The command `react-native rnx-start` is meant to be a drop-in replacement for
`react-native start`. If `rnx-start` ever becomes widely accepted, we will work
on upstreaming it to `@react-native-community/cli`, along with supporting
libraries for package configuration and Metro plugins.

### Example Commands

```bash
yarn react-native rnx-start
```

```bash
yarn react-native rnx-start --host localhost --port 8812
```

### Example Configuration

```json
{
  "rnx-kit": {
    "server": {
      "projectRoot": "src",
      "detectCyclicDependencies": true,
      "detectDuplicateDependencies": {
        "ignoredModules": ["react-is"],
        "throwOnError": false
      },
      "typescriptValidation": true
    }
  }
}
```

### Server Defaults

If the server configuration is not defined, it is implicitly created at runtime
from the bundle configuration (or its [defaults](#bundle-defaults)).

### Command-Line Overrides

| Override                            | Description                                                                                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --port [number]                     | Host port to use when listening for incoming server requests.                                                                                                    |
| --host [string]                     | Host name or address to bind when listening for incoming server requests. When not given, requests from all addresses are accepted.                              |
| --projectRoot [path]                | Path to the root of your react-native project. The bundle server uses this root path to resolve all web requests.                                                |
| --watchFolders [paths]              | Additional folders which will be added to the file-watch list. Comma-separated. By default, Metro watches all project files.                                     |
| --assetPlugins [list]               | Additional asset plugins to be used by the Metro Babel transformer. Comma-separated list containing plugin module names or absolute paths to plugin packages.    |
| --sourceExts [list]                 | Additional source-file extensions to include when generating bundles. Comma-separated list, excluding the leading dot.                                           |
| --max-workers [number]              | Specifies the maximum number of parallel worker threads to use for transforming files. This defaults to the number of cores available on your machine.           |
| --reset-cache                       | Reset the Metro cache.                                                                                                                                           |
| --custom-log-reporter-path [string] | Path to a JavaScript file which exports a Metro `TerminalReporter` function. This replaces the default reporter, which writes all messages to the Metro console. |
| --https                             | Use a secure (https) web server. When not specified, an insecure (http) web server is used.                                                                      |
| --key [path]                        | Path to a custom SSL private key file to use for secure (https) communication.                                                                                   |
| --cert [path]                       | Path to a custom SSL certificate file to use for secure (https) communication.                                                                                   |
| --config [string]                   | Path to the Metro configuration file.                                                                                                                            |
| --no-interactive                    | Disables interactive mode.                                                                                                                                       |

## Manage Dependencies

Manage dependencies within a repository and across many repositories.

```
$ yarn react-native rnx-align-deps [options] [/path/to/package.json]
```

Refer to
[@rnx-kit/align-deps](https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps)
for details.

## Generate a Third-Party Notice for a Package

Generate a 3rd-party notice, which is an aggregation of all the LICENSE files
from your package's dependencies.

> NOTE: A 3rd-party notice is a **legal document**. You are solely responsble
> for its content, even if you use `@rnx-kit` to assist you in generating it.
> You should consult with an attorney to ensure your notice meets all legal
> requirements.

```
$ yarn react-native rnx-write-third-party-notices [options]
```

| Option                    | Description                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| --root-path [path]        | The root of the repo. This is the starting point for finding each module in the source map dependency graph.                                   |
| --source-map-file [file]  | The source map file associated with the package's entry file. This source map eventually leads to all package dependencies and their licenses. |
| --json                    | Format the 3rd-party notice file as JSON instead of text.                                                                                      |
| --output-file [file]      | The path to use when writing the 3rd-party notice file.                                                                                        |
| --ignore-scopes [string]  | Comma-separated list of `npm` scopes to ignore when traversing the source map dependency graph.                                                |
| --ignore-modules [string] | Comma-separated list of modules to ignore when traversing the source map dependency graph.                                                     |
| --preamble-text [string]  | A string to prepend to the start of the 3rd-party notice.                                                                                      |
| --additional-text [path]  | A string to append to the end of the 3rd-party notice.                                                                                         |

## Clean a React Native Project

Cleans your project by removing React Native related caches and modules.

```
$ yarn react-native rnx-clean [options]
```

| Option                | Description                                                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --include [string]    | Comma-separated flag of caches to clear e.g npm,yarn . When not specified , only non-platform specific caches are cleared. [android,cocoapods,npm,metro,watchman,yarn] |
| --project-root [path] | Root path to your React Native project. When not specified, defaults to current working directory                                                                      |
