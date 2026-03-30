# @rnx-kit/yarn-plugin-ignore

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-ignore)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-ignore)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A Yarn plugin for excluding packages from being installed.

## Installation

```sh
yarn plugin import https://raw.githubusercontent.com/microsoft/rnx-kit/main/incubator/yarn-plugin-ignore/dist/yarn-plugin-ignore.cjs
```

## Usage

In the root `package.json`, add a `resolutions` section and use the `ignore:`
protocol to exclude packages. For example, to exclude `node-gyp`:

```diff
+  "resolutions": {
+    "node-gyp": "ignore:"
+  },
```
