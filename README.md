# rnx-kit

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/microsoft/rnx-kit)
[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)

Tools which help developers build, deliver, and maintain React Native apps and
libraries.

- [The Basics](#The-Basics)
- [Working with Kits](#Working-with-Kits)
  - [Dependency Management](#Dependency-Management)
  - [Bundling](#Bundling)
  - [Licensing and Attribution](#Licensing-and-Attribution)
- [Using Individual @rnx-kit Packages](#Using-Individual-rnx%2Dkit-Packages)
- [Contributing](#Contributing)

## The Basics

React Native engineering is complicated, and the ecosystem changes quickly. The
tools here aim to improve the developer experience throughout the lifecycle of
React Native apps and libraries.

An `rnx` is a **React Native user experience**. It's any code you've written
using React Native. A `kit` is **the package you use to deliver this code**. For
most common scenarios, such as a greenfield React Native app or a React Native
libary, you can say that your project's folder is a `kit`, since you are writing
the code and releasing it.

A `kit` has
[configuration](https://github.com/microsoft/rnx-kit/tree/main/packages/config)
which informs how its dependencies are managed, and how it is bundled,
published, delivered, and hosted. Configuration comes from `rnx-kit.config.js`,
an `rnx-kit` section of `package.json`, or any of the other
[standard ways of supplying configuration](https://github.com/davidtheclark/cosmiconfig).

## Working with Kits

We have a
[command-line interface](https://github.com/microsoft/rnx-kit/tree/main/packages/cli)
which is the front-end for common `kit` tasks. It uses the `kit` configuration
to control how it operates, as well as command-line overrides. The CLI is useful
as a development tool and in automated CI loops.

### Dependency Management

React Native is a moving target, as is the ecosystem of dependencies designed to
work with it. Finding dependencies that are **actively maintained** _and_
**compatible** can be challenging. On top of that, once you know what
dependencies to use, keeping them aligned across your repo(s) is a significant
burden.

The
[dependency manager](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check)
aims to bring alignment to all React Native developers who are working in
any-size repositories, from small self-contained repositories to big, enterprise
monorepos.

You can manage dependencies using the
[command-line interface](https://github.com/microsoft/rnx-kit/tree/main/packages/cli):

```
$ yarn react-native rnx-dep-check [options] [/path/to/package.json]
```

### Bundling

Shipping your `kit` starts with bundling it into a single JavaScript file.
Bundling is done using [Metro](https://facebook.github.io/metro), the official
React Native bundling system.

_Consistently_ configuring Metro to produce a type-safe, minimal bundle, across
all of your `kit` packages, is difficult. `@rnx-kit` has a number of plugins,
presets, services to make this easier, all wrapped up in the
[command-line interface](https://github.com/microsoft/rnx-kit/tree/main/packages/cli):

```
$ yarn react-native rnx-bundle
```

The bundling process is controlled by
[kit configuration](https://github.com/microsoft/rnx-kit/tree/main/packages/config)
and optional command-line overrides. This eliminates the need for boiler-plate
Metro and Babel configuration files/code.

### Licensing and Attribution

Releasing your `kit` to customers may require distribution of a 3rd-party
notice. This notice might include licenses and attribution for external
dependencies your `kit` uses.
[example](https://www.microsoft.com/en-us/legal/products/notices).

You can use the
[command-line interface](https://github.com/microsoft/rnx-kit/tree/main/packages/cli)
to _assist you_ in building this 3rd-party notice:

```
$ yarn react-native rnx-write-third-party-notices
```

> NOTE: A 3rd-party notice is a **legal document**. You are solely responsble
> for its content, even if you use `@rnx-kit` to assist you in generating it.
> You should consult with an attorney to ensure your notice meets all legal
> requirements.

## Using Individual @rnx-kit Packages

If you only need a specific plugin, preset, tool or service, and don't want to
use `kit` configuration of the CLI, you can use individual `@rnx-kit` packages.
Most packages are designed to be used on their own, having a documented API, a
suite of tests, and a log of changes. Packages are updated and released
individually, as features are added and fixes are made.

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit start -->

| Name                                                                                                                                                    | Description                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [@rnx-kit/babel-plugin-import-path-remapper](https://github.com/microsoft/rnx-kit/tree/main/packages/babel-plugin-import-path-remapper)                 | Babel plugin for remapping 'lib/' imports to 'src/'                                    |
| [@rnx-kit/babel-preset-metro-react-native](https://github.com/microsoft/rnx-kit/tree/main/packages/babel-preset-metro-react-native)                     | Babel preset for React Native applications                                             |
| [@rnx-kit/bundle-diff](https://github.com/microsoft/rnx-kit/tree/main/packages/bundle-diff)                                                             | Simple tool for diffing the content of two bundles                                     |
| [@rnx-kit/cli](https://github.com/microsoft/rnx-kit/tree/main/packages/cli)                                                                             | Command-line interface for working with kit packages in your repo                      |
| [@rnx-kit/config](https://github.com/microsoft/rnx-kit/tree/main/packages/config)                                                                       | Define and query information about a kit package                                       |
| [@rnx-kit/console](https://github.com/microsoft/rnx-kit/tree/main/packages/console)                                                                     | Simple console logger                                                                  |
| [@rnx-kit/dep-check](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check)                                                                 | Dependency checker for React Native apps                                               |
| [@rnx-kit/jest-out-of-tree-resolver](https://github.com/microsoft/rnx-kit/tree/main/packages/jest-out-of-tree-resolver)                                 | Jest resolver that supports out-of-tree platforms                                      |
| [@rnx-kit/metro-config](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-config)                                                           | Metro config for monorepos                                                             |
| [@rnx-kit/metro-plugin-cyclic-dependencies-detector](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-plugin-cyclic-dependencies-detector) | Cyclic dependencies detector for Metro                                                 |
| [@rnx-kit/metro-plugin-duplicates-checker](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-plugin-duplicates-checker)                     | Duplicate packages checker                                                             |
| [@rnx-kit/metro-plugin-typescript-validation](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-plugin-typescript-validation)               | Typescript validation during Metro bundling                                            |
| [@rnx-kit/metro-serializer](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer)                                                   | Metro's default JavaScript bundle serializer but with plugin support                   |
| [@rnx-kit/metro-serializer-esbuild](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer-esbuild)                                   | Experimental esbuild serializer for Metro                                              |
| [@rnx-kit/metro-service](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-service)                                                         | Metro service for bundling and bundle-serving                                          |
| [@rnx-kit/third-party-notices](https://github.com/microsoft/rnx-kit/tree/main/packages/third-party-notices)                                             | Library and tool to build a third party notices file based on a js bundle's source map |
| [@rnx-kit/typescript-service](https://github.com/microsoft/rnx-kit/tree/main/packages/typescript-service)                                               | TypeScript language services with support for custom module resolution                 |

<!-- @rnx-kit end -->

## Contributing

This project welcomes contributions and suggestions. See
[CONTRIBUTING](https://github.com/microsoft/rnx-kit/tree/main/CONTRIBUTING.md)
for details.

> NOTE: `@rnx-kit` is still in the early stages of development. We are hard at
> work, adding new packages and features on a regular basis. Given our focus on
> building out the first "complete" version of `@rnx-kit`, supporting external
> users is not currently a high priority, so we unfortunately cannot guarantee
> prompt responses at this time.
