# @react-native-webapis/scan

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@react-native-webapis/scan)](https://www.npmjs.com/package/@react-native-webapis/scan)

`@react-native-webapis/scan` is a tool for scanning your code bases for
potential uses of [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API).

## Build

1. [Install Rust](https://www.rust-lang.org/learn/get-started)
2. Build: `cargo build --release`

A binary will be output at `target/release/scan`. Make note of this location or
copy the binary somewhere that you can easily access later.

## Usage

```sh
./scan
```

This is currently a very simple tool. It takes no arguments and simply scans all
`.js` and `.ts` files it finds in the current working directory. For each file
it finds, it tries to parse using [SWC](https://swc.rs/). Once parsed, it will
try to count all references to `navigator.*` and any identifiers listed in
`src/web_apis.rs`. Files or directories that are listed in `src/ignored_dirs.rs`
are skipped.

You can see examples of output in `merge.mjs`. This is a script we use to
aggregate the output from multiple repositories.
