# @rnx-kit/cli

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/cli)](https://www.npmjs.com/package/@rnx-kit/cli)

Command-line interface for working with `kit` packages in your repo.

- [Bundle a kit](#Bundle-a-Kit)
- [Start a bundle server](#Start-a-Bundle-Server)
- [Manage kit dependencies](#Manage-Kit-Dependencies)
- [Generate a 3rd-party notice for a kit](#Generate-a-Third%2dParty-Notice-for-a-Kit)

## Bundle a Kit

Bundle a `kit` package using [Metro](https://facebook.github.io/metro). The
bundling process is controlled by
[kit configuration](https://github.com/microsoft/rnx-kit/tree/main/packages/config)
and optional command-line overrides.

```
$ yarn react-native rnx-bundle [options]
```

| Override                                                                           | Description                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --id [id]                                                                          | Target bundle definition. This is only needed when the kit configuration has multiple bundle definitions.                                                           |
| --platform [`ios` &#124; `android` &#124; `windows` &#124; `win32` &#124; `macos`] | Target platform. When not given, all platforms in the kit configuration are bundled.                                                                                |
| --entry-path [file]                                                                | Path to the root JavaScript file, either absolute or relative to the kit package.                                                                                   |
| --dist-path [path]                                                                 | Path where the bundle is written, either absolute or relative to the kit package.                                                                                   |
| --assets-path [path]                                                               | Path where bundle assets like images are written, either absolute or relative to the kit package.                                                                   |
| --bundle-prefix [prefix]                                                           | Bundle file prefix. This is followed by the platform and bundle file extension.                                                                                     |
| --bundle-encoding [`utf8` &#124; `utf16le` &#124; `ascii`]                         | [Character encoding](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) to use when writing the bundle file.                                |
| --dev [boolean]                                                                    | If false, warnings are disabled and the bundle is minified (default: true).                                                                                         |
| --minify [boolean]                                                                 | Controls whether or not the bundle is minified. Disabling minification is useful for test builds.                                                                   |
| --experimental-tree-shake [boolean]                                                | Controls whether or not the bundle is tree shaken. Enabling it turns on dead-code elimination, potentially making the bundle smaller. This feature is experimental. |
| --max-workers [number]                                                             | Specifies the maximum number of parallel worker threads to use for transforming files. This defaults to the number of cores available on your machine.              |
| --sourcemap-output [string]                                                        | Path where the bundle source map is written, either absolute or relative to the dist-path.                                                                          |
| --sourcemap-sources-root [string]                                                  | Path to use when relativizing file entries in the bundle source map.                                                                                                |
| --reset-cache                                                                      | Reset the Metro cache.                                                                                                                                              |
| --config [string]                                                                  | Path to the Metro configuration file.                                                                                                                               |
| -h, --help                                                                         | Show usage information.                                                                                                                                             |

## Start a Bundle Server

Start a bundle server for a `kit` package using
[Metro](https://facebook.github.io/metro). The server is controlled by
[kit configuration](https://github.com/microsoft/rnx-kit/tree/main/packages/config)
and optional command-line overrides.

```
$ yarn react-native rnx-start [options]
```

| Override                            | Description                                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --host [string]                     | Host name or address to bind when listening for incoming server requests. When not given, requests from all addresses are accepted.                                              |
| --port [number]                     | Host port to use when listening for incoming server requests.                                                                                                                    |
| --project-root [path]               | Path to the root of your react-native experience project. The bundle server uses this root path to resolve all web requests.                                                     |
| --watch-folders [paths]             | Additional folders which will be added to the file-watch list. Comma-separated. By default, Metro watches all project files, and triggers a bundle-reload when anything changes. |
| --asset-plugins [list]              | Additional asset plugins to be used by the Metro Babel transformer. Comma-separated list containing plugin modules and/or absolute paths to plugin packages.                     |
| --source-exts [list]                | Additional source-file extensions to include when generating bundles. Comma-separated list, excluding the leading dot.                                                           |
| --max-workers [number]              | Specifies the maximum number of parallel worker threads to use for transforming files. This defaults to the number of cores available on your machine.                           |
| --custom-log-reporter-path [string] | Path to a JavaScript file which exports a Metro 'TerminalReporter' function. This replaces the default reporter, which writes all messages to the Metro console.                 |
| --https                             | Use a secure (https) web server. When not specified, an insecure (http) web server is used.                                                                                      |
| --key [path]                        | Path to a custom SSL private key file to use for secure (https) communication.                                                                                                   |
| --cert [path]                       | Path to a custom SSL certificate file to use for secure (https) communication.                                                                                                   |
| --reset-cache                       | Reset the Metro cache.                                                                                                                                                           |
| --config [string]                   | Path to the Metro configuration file.                                                                                                                                            |
| --no-interactive                    | Disables interactive mode.                                                                                                                                                       |

## Manage Kit Dependencies

Manage your `kit` package's dependencies.

```
$ yarn react-native rnx-dep-check [options] [/path/to/package.json]
```

Refer to
[@rnx-kit/dep-check](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check)
for details.

## Generate a Third-Party Notice for a Kit

Generate a 3rd-party notice, which is an aggregation of all the LICENSE files
from your `kit` package's dependencies.

> NOTE: A 3rd-party notice is a **legal document**. You are solely responsble
> for its content, even if you use `@rnx-kit` to assist you in generating it.
> You should consult with an attorney to ensure your notice meets all legal
> requirements.

```
$ yarn react-native rnx-write-third-party-notices [options]
```

| Option                    | Description                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| --source-map-file [file]  | The source map file associated with the `kit` package's entry file. This source map eventually leads to all `kit` dependencies. |
| --output-file [file]      | The path to use when writing the 3rd-party notice file.                                                                         |
| --root-path [path]        | The root of the repo. This is the starting point for finding each module in the source map dependency graph.                    |
| --ignore-scopes [string]  | Comma-separated list of `npm` scopes to ignore when traversing the source map dependency graph.                                 |
| --ignore-modules [string] | Comma-separated list of modules to ignore when traversing the source map dependency graph.                                      |
| --preamble-text [string]  | A string to prepend to the start of the 3rd-party notice.                                                                       |
| --additional-text [path]  | A string to append to the end of the 3rd-party notice.                                                                          |
