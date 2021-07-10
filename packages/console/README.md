# @rnx-kit/console

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/console)](https://www.npmjs.com/package/@rnx-kit/console)

`@rnx-kit/console` is a simple console logger that is a subset of the logger in
[`@react-native-community/cli-tools`](https://github.com/react-native-community/cli/blob/6615eb30f37bec5bb25acc066c849c4aa2d8a4cd/packages/tools/src/logger.ts).
It is used by
[Metro plugins](https://github.com/microsoft/rnx-kit/tree/main/packages) to
ensure that log lines are consistent with `@react-native-community/cli`.

Ideally, we should be using the reporter that is passed to Metro but we don't
have access to it from the `customSerializer` hook. The next best thing would be
to use `@react-native-community/cli-tools` but it includes a bunch of other
tools and we cannot take a dependency on any single version since we need to
support multiple versions of `react-native` (and hence multiple versions of
`@react-native-community/cli-tools`).

Other libraries, such as
[`just-task-logger`](https://github.com/microsoft/just/tree/master/packages/just-task-logger),
were also considered. However, the purpose of this package is to match with the
output of `@react-native-community/cli`. `just-task-logger` in particular uses
its own colour scheme and doesn't allow configuring them to match the colour
scheme.

## Install

```sh
yarn add @rnx-kit/console --dev
```

## Usage

```ts
import { error, info, warn } from "@rnx-kit/console";

error("This is an error message");
info("This is an informational message");
warn("This is a warning");
```
