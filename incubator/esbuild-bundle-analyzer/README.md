# @rnx-kit/esbuild-bundle-analyzer

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/esbuild-bundle-analyzer)](https://www.npmjs.com/package/@rnx-kit/esbuild-bundle-analyzer)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

## Motivation

This tool provides simple analysis of bundles based on
[esbuild's metafile](https://esbuild.github.io/api/#metafile). It allows users
to analyze a bundle/metafile, compare two metafiles, and generate a limited, but
compatible Webpack stats file. This file can then be used with more advanced
Webpack-based analysis and comparison tools such as
[@mixer/webpack-bundle-compare](https://github.com/microsoft/webpack-bundle-compare).
This tool could allow developers quickly and easily gain insights into their
bundle size and composition.

## Installation

```sh
yarn add @rnx-kit/esbuild-bundle-analyzer --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/esbuild-bundle-analyzer
```

## Usage

This tool has three commands, `analyze`, `compare`, and `transform`. You can
find the full list of functionalities by invoking the command
`npx @rnx-kit/esbuild-bundle-analyzer --help`.

### analyze

This command will output a simple analysis of the input and output files and
in-depth detail about the duplicate dependencies. This tool consumes esbuild's
metafile and then analyzes the data to provide a simple analysis of the bundle.
For all the duplicates the tool will present full path from the entry-point to
the duplicated file to showcase why and how the duplicated files are being added
in the bundle.

Generate simple analysis of a bundle by consuming esbuild's metafile:

```sh
npx @rnx-kit/esbuild-bundle-analyzer analyze <path-to-esbuild-metafile>
```

Along with these core options, you might want to pass the following params:

- `--show-duplicates`, Boolean flag to output how each duplicated file is being
  added to the bundle
- `--json`, Outputs the analysis in JSON format and sets the output file to
  write the analysis information to. If not set the analysis will be output to
  the console
- `--namespace`, Every module has an associated namespace. By default esbuild
  operates in the file namespace, which corresponds to files on the `file`
  system.
  [@rnx-kit/metro-serializer-esbuild](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer-esbuild)
  uses the `virtual:metro` namespace. This flag allows you to specify the
  namespace of the metafile. This is useful if you want cleaner output without
  the namespace prefix.

A complete example of this script is the following:

```sh
npx @rnx-kit/esbuild-bundle-analyzer analyze meta.json --json --show-duplicates --namespace virtual:metro
```

### compare

This command will compare two metafiles and outputs the difference between the
two.

```sh
npx @rnx-kit/esbuild-bundle-analyzer compare --baseline <path-to-esbuild-metafile> --candidate <path-to-esbuild-metafile>
```

### compare

This command will compare two metafiles and outputs the difference between the
two.

```sh
npx @rnx-kit/esbuild-bundle-analyzer compare --baseline <path-to-esbuild-metafile> --candidate <path-to-esbuild-metafile>
```

This command consumes the esbuild metafile and transforms it into a compatible
Webpack stats file containing only the relevant data for
[@mixer/webpack-bundle-compare](https://github.com/microsoft/webpack-bundle-compare).
Then, the Webpack stats file can be consumed by @mixer/webpack-bundle-compare
which presents a visual analysis of Webpack based bundles and allows you to
track and compare the bundle size over time.

Generate a webpack stats file:

```sh
npx @rnx-kit/esbuild-bundle-analyzer transform <path-to-esbuild-metafile> --output <path-to-webpack-stats-file>
```

Then, you can upload the generated Webpack stats file to
[here](https://happy-water-0887b0b1e.azurestaticapps.net/#/) to visualize the
bundle.
