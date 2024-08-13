# @rnx-kit/cli

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/cli)](https://www.npmjs.com/package/@rnx-kit/cli)

Command-line interface for working with packages in your repo.

> [!NOTE]
>
> All commands below are also a plugin to `@react-native-community/cli`, meaning
> they will work with both `react-native` and `rnc-cli` commands. Just make sure
> to prefix the command with `rnx-` e.g., `rnx-cli start` becomes
> `react-native rnx-start`. The prefix is to avoid name clashes.

## `rnx-cli bundle`

Bundle a package using [Metro][]. The bundling process uses optional
[configuration][] parameters and command-line overrides.

> [!NOTE]
>
> This command is meant to be a drop-in replacement for `react-native bundle`.
> If `rnx-bundle` ever becomes widely accepted, we will work on upstreaming it
> to `@react-native-community/cli`, along with supporting libraries for package
> configuration and Metro plugins.

### Example Usages

```sh
yarn rnx-cli bundle
```

```sh
yarn rnx-cli bundle                \
    --entry-file src/index.ts      \
    --bundle-output main.jsbundle  \
    --platform ios                 \
    --dev false                    \
    --minify true
```

### Example Configuration (Optional)

```json
{
  "rnx-kit": {
    "bundle": {
      "entryFile": "entry.js",
      "assetsDest": "dist",
      "plugins": [
        "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
        [
          "@rnx-kit/metro-plugin-duplicates-checker",
          { "ignoredModules": ["react-is"] }
        ],
        "@rnx-kit/metro-plugin-typescript"
      ],
      "targets": ["android", "ios", "macos", "windows"],
      "platforms": {
        "android": {
          "assetsDest": "dist/res"
        },
        "macos": {
          "plugins": [
            "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
            [
              "@rnx-kit/metro-plugin-duplicates-checker",
              { "ignoredModules": ["react-is"] }
            ]
          ]
        }
      }
    }
  }
}
```

### Bundle Defaults

When certain parameters aren't specified in configuration or on the
command-line, they are explicitly set to default values.

| Parameter    | Default Value                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| entryFile    | `"index.js"`                                                                                                                             |
| bundleOutput | `"index.<platform>.bundle"` (Windows, Android) or `"index.<platform>.jsbundle"` (iOS, macOS)                                             |
| hermes       | `false`                                                                                                                                  |
| treeShake    | `false`                                                                                                                                  |
| plugins      | `["@rnx-kit/metro-plugin-cyclic-dependencies-detector", "@rnx-kit/metro-plugin-duplicates-checker", "@rnx-kit/metro-plugin-typescript"]` |

Other parameters have implicit defaults, buried deep in Metro or its
dependencies.

### Command-Line Overrides

<!-- @rnx-kit/cli/bundle start -->

| Option                                                                         | Description                                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| --id &lt;id&gt;                                                                | Target bundle definition; only needed when the rnx-kit configuration has multiple bundle definitions                                             |
| --entry-file &lt;path&gt;                                                      | Path to the root JavaScript or TypeScript file, either absolute or relative to the package                                                       |
| --platform &lt;ios&verbar;android&verbar;windows&verbar;win32&verbar;macos&gt; | Target platform; when unspecified, all platforms in the rnx-kit configuration are bundled                                                        |
| --dev [boolean]                                                                | If false, warnings are disabled and the bundle is minified                                                                                       |
| --minify [boolean]                                                             | Controls whether or not the bundle is minified (useful for test builds)                                                                          |
| --bundle-output &lt;string&gt;                                                 | Path to the output bundle file, either absolute or relative to the package                                                                       |
| --bundle-encoding &lt;utf8&verbar;utf16le&verbar;ascii&gt;                     | Character encoding to use when writing the bundle file                                                                                           |
| --max-workers &lt;number&gt;                                                   | Specifies the maximum number of parallel worker threads to use for transforming files; defaults to the number of cores available on your machine |
| --sourcemap-output &lt;string&gt;                                              | Path where the bundle source map is written, either absolute or relative to the package                                                          |
| --sourcemap-sources-root &lt;string&gt;                                        | Path to use when relativizing file entries in the bundle source map                                                                              |
| --sourcemap-use-absolute-path                                                  | Report SourceMapURL using its full path                                                                                                          |
| --assets-dest &lt;path&gt;                                                     | Path where bundle assets like images are written, either absolute or relative to the package; if unspecified, assets are ignored                 |
| --unstable-transform-profile &lt;string&gt;                                    | [Experimental] Transform JS for a specific JS engine; currently supported: hermes, hermes-canary, default                                        |
| --reset-cache                                                                  | Reset the Metro cache                                                                                                                            |
| --config &lt;string&gt;                                                        | Path to the Metro configuration file                                                                                                             |
| --tree-shake [boolean]                                                         | Enable tree shaking to remove unused code and reduce the bundle size                                                                             |

<!-- @rnx-kit/cli/bundle end -->

## `rnx-cli config`

Routes to
[`react-native config`](https://github.com/react-native-community/cli/blob/main/packages/cli-config#readme).

## `rnx-cli doctor`

Routes to
[`react-native doctor`](https://github.com/react-native-community/cli/blob/main/packages/cli-doctor#readme).

## `rnx-cli info`

Routes to
[`react-native info`](https://github.com/react-native-community/cli/blob/main/packages/cli-doctor#info).

## `rnx-cli build-android`

Routes to
[`react-native build-android`](https://github.com/react-native-community/cli/blob/main/packages/cli-platform-android#build-android).

## `rnx-cli build-ios`

Routes to
[`react-native build-ios`](https://github.com/react-native-community/cli/blob/main/packages/cli-platform-ios#build-ios).

## `rnx-cli log-android`

Routes to
[`react-native log-android`](https://github.com/react-native-community/cli/blob/main/packages/cli-platform-android#log-android).

## `rnx-cli log-ios`

Routes to
[`react-native log-ios`](https://github.com/react-native-community/cli/blob/main/packages/cli-platform-ios#log-ios).

## `rnx-cli run-android`

Routes to
[`react-native run-android`](https://github.com/react-native-community/cli/blob/main/packages/cli-platform-android#run-android).

## `rnx-cli run-ios`

Routes to
[`react-native run-ios`](https://github.com/react-native-community/cli/blob/main/packages/cli-platform-ios#run-ios).

## `rnx-cli start`

Start a bundle server for a package using [Metro][]. The bundle server uses
optional [configuration][] parameters and command-line overrides.

> [!NOTE]
>
> This command is meant to be a drop-in replacement for `react-native start`. If
> `rnx-start` ever becomes widely accepted, we will work on upstreaming it to
> `@react-native-community/cli`, along with supporting libraries for package
> configuration and Metro plugins.

### Example Commands

```sh
yarn rnx-cli start
```

```sh
yarn rnx-cli start --host 127.0.0.1 --port 8812
```

### Example Configuration

```json
{
  "rnx-kit": {
    "server": {
      "projectRoot": "src",
      "plugins": [
        "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
        [
          "@rnx-kit/metro-plugin-duplicates-checker",
          {
            "ignoredModules": ["react-is"],
            "throwOnError": false
          }
        ],
        "@rnx-kit/metro-plugin-typescript"
      ]
    }
  }
}
```

### Server Defaults

If the server configuration is not defined, it is implicitly created at runtime
from the bundle configuration (or its [defaults](#bundle-defaults)).

### Command-Line Overrides

<!-- @rnx-kit/cli/start start -->

| Option                                    | Description                                                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --port &lt;number&gt;                     | Host port to use when listening for incoming server requests                                                                                               |
| --host &lt;string&gt;                     | Host name or address to bind when listening for incoming server requests; when not specified, requests from all addresses are accepted                     |
| --project-root &lt;path&gt;               | Path to the root of your react-native project; the bundle server uses this path to resolve all web requests                                                |
| --watch-folders &lt;paths&gt;             | Additional folders which will be added to the watched files list, comma-separated; by default, Metro watches all project files                             |
| --asset-plugins &lt;list&gt;              | Additional asset plugins to be used by Metro's Babel transformer; comma-separated list containing plugin module names or absolute paths to plugin packages |
| --source-exts &lt;list&gt;                | Additional source file extensions to include when generating bundles; comma-separated list, excluding the leading dot                                      |
| --max-workers &lt;number&gt;              | Specifies the maximum number of parallel worker threads to use for transforming files; defaults to the number of cores available on your machine           |
| --reset-cache                             | Reset the Metro cache                                                                                                                                      |
| --custom-log-reporter-path &lt;string&gt; | Path to a JavaScript file which exports a Metro 'TerminalReporter' function; replaces the default reporter that writes all messages to the Metro console   |
| --https                                   | Use a secure (https) web server; when not specified, an insecure (http) web server is used                                                                 |
| --key &lt;path&gt;                        | Path to a custom SSL private key file to use for secure (https) communication                                                                              |
| --cert &lt;path&gt;                       | Path to a custom SSL certificate file to use for secure (https) communication                                                                              |
| --config &lt;string&gt;                   | Path to the Metro configuration file                                                                                                                       |
| --no-interactive                          | Disables interactive mode                                                                                                                                  |
| --id &lt;string&gt;                       | Specify which bundle configuration to use if server configuration is missing                                                                               |

<!-- @rnx-kit/cli/start end -->

## `rnx-cli align-deps`

Manage dependencies within a repository and across many repositories.

```sh
yarn rnx-cli align-deps [options] [/path/to/package.json]
```

Refer to [@rnx-kit/align-deps][] for details.

## `rnx-cli clean`

Cleans your project by removing React Native related caches and modules.

```sh
yarn rnx-cli clean [options]
```

<!-- @rnx-kit/cli/clean start -->

| Option                                                      | Description                                              |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| --include &lt;android,cocoapods,metro,npm,watchman,yarn&gt; | Comma-separated flag of caches to clear e.g., `npm,yarn` |
| --project-root &lt;path&gt;                                 | Root path to your React Native project                   |
| --verify-cache                                              | Whether to verify the integrity of the cache             |

<!-- @rnx-kit/cli/clean end -->

## `rnx-cli write-third-party-notices`

Generate a third-party notice, an aggregation of all the LICENSE files from your
package's dependencies.

> [!NOTE]
>
> A third-party notice is a **legal document**. You are solely responsble for
> its content, even if you use this command to assist you in generating it. You
> should consult with an attorney to ensure your notice meets all legal
> requirements.

```sh
yarn rnx-cli write-third-party-notices [options]
```

<!-- @rnx-kit/cli/write-third-party-notices start -->

| Option                           | Description                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| --root-path &lt;path&gt;         | The root of the repo — the starting point for finding each module in the source map dependency graph                                           |
| --source-map-file &lt;file&gt;   | The source map file associated with the package's entry file — this source map eventually leads to all package dependencies and their licenses |
| --json                           | Format the 3rd-party notice file as JSON instead of text                                                                                       |
| --output-file &lt;file&gt;       | The path to use when writing the 3rd-party notice file                                                                                         |
| --ignore-scopes &lt;string&gt;   | Comma-separated list of npm scopes to ignore when traversing the source map dependency graph                                                   |
| --ignore-modules &lt;string&gt;  | Comma-separated list of modules to ignore when traversing the source map dependency graph                                                      |
| --preamble-text &lt;string&gt;   | A string to prepend to the start of the 3rd-party notice                                                                                       |
| --additional-text &lt;string&gt; | A string to append to the end of the 3rd-party notice                                                                                          |

<!-- @rnx-kit/cli/write-third-party-notices end -->

<!-- References -->

[@rnx-kit/align-deps]:
  https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps#readme
[Metro]: https://facebook.github.io/metro
[configuration]:
  https://github.com/microsoft/rnx-kit/tree/main/packages/config#readme
