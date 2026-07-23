# @rnx-kit/yarn-plugin-dynamic-overrides

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-dynamic-overrides)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-dynamic-overrides)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This is a Yarn plugin that lets you override a package's dependencies to allow
greater version ranges than the package declares.

## Motivation

A number of packages use explicit version numbers instead of version ranges,
forcing package managers to install multiple copies of a dependency even though
a more recent version is still compatible.

The plugin attempts to address this by replacing the explicit version with a
version range. This is useful for deduping and allows for updating dependencies
to a more recent version.

## Installation

```sh
yarn plugin import https://raw.githubusercontent.com/microsoft/rnx-kit/main/incubator/yarn-plugin-dynamic-overrides/index.js
```

## Usage

List the packages that you want to override in `.yarnrc.yml`. For example, to
override dependencies of `@appium/base-driver`:

```yml
dynamicPackageOverrides:
  overrides:
    - id: "@appium/base-driver"
```

Next time you run `yarn install`, its dependencies will be overridden:

```
"@appium/support": "npm:7.2.5"
"@appium/types": "npm:1.5.1"
async-lock: "npm:1.4.1" -> "npm:^1.4.1"
asyncbox: "npm:6.3.0" -> "npm:^6.3.0"
axios: "npm:1.18.0" -> "npm:^1.18.0"
```

Note that `@appium` packages are untouched. The plugin will try to detect
inter-dependencies and leave them alone.

If you want to use a different specifier than `^`, you can configure it like
below:

```yml
dynamicPackageOverrides:
  overrides:
    - id: "@appium/base-driver"
      specifier: "~"
```

Or you can change the default specifier:

```yml
dynamicPackageOverrides:
  defaultSpecifier: "~"
  overrides:
    - id: "@appium/base-driver"
```
