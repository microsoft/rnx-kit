<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/react-native-error-trace-decorator

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/react-native-error-trace-decorator)](https://www.npmjs.com/package/@rnx-kit/react-native-error-trace-decorator)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

An experimental tool to symbolicate error stack traces for react-native apps
containing multiple bundles.

## Motivation

For react-native apps which are split across multiple bundles, the generated
stack traces can be a bit confusing as the traces often points across multiple
bundles.

This is how an error stack trace looks like for a react native app split into
two bundles:

```txt
Error: Test Error Here
at value (address at /data/bundles/firstBundle/hermes.android.first.bundle:1:448970)
at ol (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:83916)
at ul (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:83778)
at ql (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:114629)
at Fa (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:101389)
at Ua (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:101247)
at La (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:101131)
at Ea (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:98552)
at dt (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:66522)
at _a (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:96208)
at li (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:106463)
at anonymous (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:116075)
at anonymous (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:438794)
at run (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:435789)
at runApplication (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:436267)
at apply (native)
at value (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:42976)
at anonymous (address at/data/bundles/secondBundle/hermes.android.second.bundle:1:41459)
at value (address at /data/bundles/secondBundle/hermes.android.second.bundle:1:42422)
at value (address at/data/bundles/secondBundle/hermes.android.second.bundle:1:41417)
```

As we can see, the above error stack refers to two separate bundles namely,
`hermes.android.first.bundle` and `hermes.android.second.bundle`. In order to
symbolicate this stack trace, we need to do the following:

- Pick one line at a time from the stack trace file.
- Figure out which bundle the current error line corresponds to.(in this case,
  either `hermes.android.first.bundle` or `hermes.android.second.bundle`).
- Symbolicate the line using the corresponding sourcemap file.(e.g.
  `hermes.android.first.bundle.map` or `hermes.android.second.bundle.map`).
- Continue the process for all the lines in the stack trace.

This following process can get increasingly difficult, as the number of bundles
increase. This tool aims at simplifying the process.

## Installation

```sh
yarn add @rnx-kit/react-native-error-trace-decorator --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/react-native-error-trace-decorator
```

## Usage

In order to work, this tool requires some basic information, namely, a text file
containing the error stack trace and a configuration file in the following
format:

config.json

```json
{
  "configs": [
    {
      "bundleIdentifier": "hermes.android.first.bundle",
      "sourcemap": "./hermes.android.first.bundle.map"
    },
    {
      "bundleIdentifier": "hermes.android.second.bundle",
      "sourcemap": "./hermes.android.second.bundle.map"
    }
  ]
}
```

Each entry in the `configs` array should contain a `bundleIdentifier` and a
`sourcemap` parameter. Each config corresponds to a bundle.

- `bundleIdentifier` - This should contain a string which can be used to
  identify a particular bundle in the error stack. For instance,
  `firstBundle/hermes.android.first.bundle` can be an identifier for the first
  bundle in the error stack and similarly
  `secondBundle/hermes.android.second.bundle` can be an identifier for the
  second bundle and so on.
- `sourcemap` - This should contain a path to the sourcemap file corresponding
  to the bundle passed in the `bundleIdentifier` field.

If the tool is added as a dependency in your package, run the following:

```sh
yarn react-native-error-trace-decorator --errorFile <path_to_the_error_file> --configFile <path_to_the_config_file>
```
