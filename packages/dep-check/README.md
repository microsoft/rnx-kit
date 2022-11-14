# `@rnx-kit/dep-check` has been renamed to `@rnx-kit/align-deps`

For more details, read the RFC: https://github.com/microsoft/rnx-kit/pull/1757

<!--remove-block start-->

# @rnx-kit/dep-check

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/dep-check)](https://www.npmjs.com/package/@rnx-kit/dep-check)

<!--remove-block end-->

`@rnx-kit/dep-check` manages React Native dependencies for a package, based on
its needs and requirements.

If you want to learn how dep-check is used at Microsoft, and see a demo of how
it works in a monorepo - you can watch the
["Improve all the repos – exploring Microsoft’s DevExp"](https://youtu.be/DAEnPV78rQc?t=1085)
talk by @kelset and @tido64 from React Native Europe 2021.

## Installation

```sh
yarn add @rnx-kit/dep-check --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/dep-check
```

## Usage

```sh
yarn rnx-dep-check [options] [packages...]
```

Listing paths to packages that should be checked is optional. If omitted,
dep-check will look for the closest `package.json` using Node module resolution.
If the target package is a root package defining workspaces, they will all be
included.

Examples:

- Ensure dependencies are compatible with react-native 0.64 without a config:
  ```sh
  yarn rnx-dep-check --vigilant 0.64
  ```
- Initialize a config for your app (or library):
  ```sh
  yarn rnx-dep-check --init app
  # or specify `library` for a library
  ```
- Apply changes suggested by dep-check:
  ```sh
  yarn rnx-dep-check --write
  ```
- Interactively update supported react-native versions (or bump version used for
  development):
  ```sh
  yarn rnx-dep-check --set-version
  ```

### `--custom-profiles <module>`

Path to custom profiles. This can be a path to a JSON file, a `.js` file, or a
module name. The module must default export an object similar to the one below:

```js
module.exports = {
  0.63: {
    "my-capability": {
      name: "my-module",
      version: "1.0.0",
    },
  },
  0.64: {
    "my-capability": {
      name: "my-module",
      version: "1.1.0",
    },
  },
};
```

For a more complete example, have a look at the
[default profiles](https://github.com/microsoft/rnx-kit/blob/769e9fa290929effd5111884f1637c21326b5a95/packages/dep-check/src/profiles.ts#L11).

> #### Note
>
> This specific flag may only be used with `--vigilant`. You can specify custom
> profiles in normal mode by adding `customProfiles` to your package
> [configuration](#configure).

### `--exclude-packages`

Comma-separated list of package names to exclude from inspection.

> #### Note
>
> `--exclude-packages` will only exclude packages that do not have a
> configuration. Packages that have a configuration, will still be checked. This
> flag may only be used with `--vigilant`.

### `--init <app | library>`

When integrating `@rnx-kit/dep-check` for the first time, it may be a cumbersome
to manually add all capabilities yourself. You can run this tool with `--init`,
and it will try to add a sensible configuration based on what is currently
defined in the specified `package.json`.

### `--set-version`

Sets `reactNativeVersion` and `reactNativeDevVersion` for any configured
package. The value should be a comma-separated list of `react-native` versions
to set. The first number specifies the development version. For example,
`0.64,0.63` will set the following values:

```json
{
  "rnx-kit": {
    "reactNativeVersion": "^0.63.0 || ^0.64.0",
    "reactNativeDevVersion": "^0.64.0"
  }
}
```

If the version numbers are omitted, an _interactive prompt_ will appear.

> #### Note
>
> A `rnx-dep-check --write` run will be invoked right after changes have been
> made. As such, this flag will fail if changes are needed before making any
> modifications.

### `--vigilant`

Also inspect packages that are not configured. Specify a comma-separated list of
profile versions to compare against, e.g. `0.63,0.64`. The first number
specifies the target version.

### `--write`

Writes all proposed changes to the specified `package.json`.

## Configure

`@rnx-kit/dep-check` must first be configured before it can be used. It uses
`@rnx-kit/config` to retrieve your kit configuration. Your configuration can be
specified either in a file, `rnx-kit.config.js`, or in an `"rnx-kit"` section of
your `package.json`.

| Option                  | Type                   | Default               | Description                                                                                                 |
| :---------------------- | :--------------------- | :-------------------- | :---------------------------------------------------------------------------------------------------------- |
| `kitType`               | `"app"` \| `"library"` | `"library"`           | Whether this kit is an "app" or a "library". Determines how dependencies are declared.                      |
| `reactNativeVersion`    | string                 | (required)            | Supported versions of React Native. The value can be a specific version or a range.                         |
| `reactNativeDevVersion` | string                 | `minVersion(version)` | The version of React Native to use for development. If omitted, the minimum supported version will be used. |
| `capabilities`          | Capabilities[]         | `[]`                  | List of used/provided capabilities. A full list can be found below.                                         |
| `customProfiles`        | string                 | `undefined`           | Path to custom profiles. This can be a path to a JSON file, a `.js` file, or a module name.                 |

## Capabilities

The following table contains the currently supported capabilities and what they
resolve to:

<details>
<summary>Capabilities Table</summary>

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/dep-check/capabilities start -->

| Capability                           | 0.70                                                              | 0.69                                                              | 0.68                                                              | 0.67                                                              | 0.66                                                              | 0.65                                                              | 0.64                                                              | 0.63                                                              | 0.62                                                              | 0.61                                                              |
| ------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| core                                 | react-native@^0.70.0                                              | react-native@^0.69.0                                              | react-native@^0.68.0                                              | react-native@^0.67.0                                              | react-native@^0.66.0                                              | react-native@^0.65.0                                              | react-native@^0.64.2                                              | react-native@^0.63.2                                              | react-native@^0.62.3                                              | react-native@^0.61.5                                              |
| core-android                         | react-native@^0.70.0                                              | react-native@^0.69.0                                              | react-native@^0.68.0                                              | react-native@^0.67.0                                              | react-native@^0.66.0                                              | react-native@^0.65.0                                              | react-native@^0.64.2                                              | react-native@^0.63.2                                              | react-native@^0.62.3                                              | react-native@^0.61.5                                              |
| core-ios                             | react-native@^0.70.0                                              | react-native@^0.69.0                                              | react-native@^0.68.0                                              | react-native@^0.67.0                                              | react-native@^0.66.0                                              | react-native@^0.65.0                                              | react-native@^0.64.2                                              | react-native@^0.63.2                                              | react-native@^0.62.3                                              | react-native@^0.61.5                                              |
| core-macos                           | react-native-macos@^0.70.0                                        | react-native-macos@^0.69.0                                        | react-native-macos@^0.68.0                                        | react-native-macos@^0.67.0                                        | react-native-macos@^0.66.0                                        | react-native-macos@^0.65.0                                        | react-native-macos@^0.64.0                                        | react-native-macos@^0.63.0                                        | react-native-macos@^0.62.0                                        | react-native-macos@^0.61.0                                        |
| core-windows                         | react-native-windows@^0.70.0                                      | react-native-windows@^0.69.0                                      | react-native-windows@^0.68.0                                      | react-native-windows@^0.67.0                                      | react-native-windows@^0.66.0                                      | react-native-windows@^0.65.0                                      | react-native-windows@^0.64.0                                      | react-native-windows@^0.63.0                                      | react-native-windows@^0.62.0                                      | react-native-windows@^0.61.0                                      |
| animation                            | react-native-reanimated@^2.10.0                                   | react-native-reanimated@^2.9.0                                    | react-native-reanimated@^2.5.0                                    | react-native-reanimated@^2.2.4                                    | react-native-reanimated@^2.2.3                                    | react-native-reanimated@^2.2.1                                    | react-native-reanimated@^2.1.0                                    | react-native-reanimated@^1.13.3                                   | react-native-reanimated@^1.13.3                                   | react-native-reanimated@^1.13.3                                   |
| babel-preset-react-native            | metro-react-native-babel-preset@^0.72.1                           | metro-react-native-babel-preset@^0.70.3                           | metro-react-native-babel-preset@^0.67.0                           | metro-react-native-babel-preset@^0.66.2                           | metro-react-native-babel-preset@^0.66.2                           | metro-react-native-babel-preset@^0.66.0                           | metro-react-native-babel-preset@^0.64.0                           | metro-react-native-babel-preset@^0.59.0                           | metro-react-native-babel-preset@^0.58.0                           | metro-react-native-babel-preset@^0.56.0                           |
| base64                               | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        | react-native-base64@^0.2.1                                        |
| checkbox                             | @react-native-community/checkbox@^0.5.8                           | @react-native-community/checkbox@^0.5.8                           | @react-native-community/checkbox@^0.5.8                           | @react-native-community/checkbox@^0.5.8                           | @react-native-community/checkbox@^0.5.8                           | @react-native-community/checkbox@^0.5.8                           | @react-native-community/checkbox@^0.5.8                           | @react-native-community/checkbox@^0.5.7                           | @react-native-community/checkbox@^0.5.7                           | @react-native-community/checkbox@^0.5.7                           |
| clipboard                            | @react-native-clipboard/clipboard@^1.10.0                         | @react-native-clipboard/clipboard@^1.10.0                         | @react-native-clipboard/clipboard@^1.10.0                         | @react-native-clipboard/clipboard@^1.9.0                          | @react-native-clipboard/clipboard@^1.9.0                          | @react-native-clipboard/clipboard@^1.9.0                          | @react-native-clipboard/clipboard@^1.8.3                          | @react-native-community/clipboard@^1.5.1                          | @react-native-community/clipboard@^1.5.1                          | @react-native-community/clipboard@^1.5.1                          |
| core/testing                         | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` | Meta package for installing `core`, `jest`, `react-test-renderer` |
| datetime-picker                      | @react-native-community/datetimepicker@^6.3.3                     | @react-native-community/datetimepicker@^6.0.2                     | @react-native-community/datetimepicker@^6.0.2                     | @react-native-community/datetimepicker@^3.5.2                     | @react-native-community/datetimepicker@^3.5.2                     | @react-native-community/datetimepicker@^3.5.2                     | @react-native-community/datetimepicker@^3.4.6                     | @react-native-community/datetimepicker@^3.0.9                     | @react-native-community/datetimepicker@^3.0.9                     | @react-native-community/datetimepicker@^3.0.9                     |
| filesystem                           | react-native-fs@^2.18.0                                           | react-native-fs@^2.18.0                                           | react-native-fs@^2.18.0                                           | react-native-fs@^2.18.0                                           | react-native-fs@^2.18.0                                           | react-native-fs@^2.18.0                                           | react-native-fs@^2.17.0                                           | react-native-fs@^2.16.6                                           | react-native-fs@^2.16.6                                           | react-native-fs@^2.16.6                                           |
| floating-action                      | react-native-floating-action@^1.22.0                              | react-native-floating-action@^1.22.0                              | react-native-floating-action@^1.22.0                              | react-native-floating-action@^1.22.0                              | react-native-floating-action@^1.22.0                              | react-native-floating-action@^1.22.0                              | react-native-floating-action@^1.21.0                              | react-native-floating-action@^1.21.0                              | react-native-floating-action@^1.18.0                              | react-native-floating-action@^1.18.0                              |
| gestures                             | react-native-gesture-handler@^2.6.0                               | react-native-gesture-handler@^2.5.0                               | react-native-gesture-handler@^2.3.2                               | react-native-gesture-handler@^1.10.3                              | react-native-gesture-handler@^1.10.3                              | react-native-gesture-handler@^1.10.3                              | react-native-gesture-handler@^1.10.3                              | react-native-gesture-handler@^1.10.3                              | react-native-gesture-handler@^1.9.0                               | react-native-gesture-handler@^1.9.0                               |
| hermes                               | hermes-engine@~0.11.0                                             | hermes-engine@~0.11.0                                             | hermes-engine@~0.11.0                                             | hermes-engine@~0.9.0                                              | hermes-engine@~0.9.0                                              | hermes-engine@~0.8.1                                              | hermes-engine@~0.7.0                                              | hermes-engine@~0.5.0                                              | hermes-engine@~0.4.0                                              | hermes-engine@^0.2.1                                              |
| hooks                                | @react-native-community/hooks@^2.8.0                              | @react-native-community/hooks@^2.8.0                              | @react-native-community/hooks@^2.8.0                              | @react-native-community/hooks@^2.8.0                              | @react-native-community/hooks@^2.8.0                              | @react-native-community/hooks@^2.8.0                              | @react-native-community/hooks@^2.6.0                              | @react-native-community/hooks@^2.6.0                              | @react-native-community/hooks@^2.6.0                              | @react-native-community/hooks@^2.6.0                              |
| html                                 | react-native-render-html@^6.1.0                                   | react-native-render-html@^6.1.0                                   | react-native-render-html@^6.1.0                                   | react-native-render-html@^6.1.0                                   | react-native-render-html@^6.1.0                                   | react-native-render-html@^5.1.1                                   | react-native-render-html@^5.1.1                                   | react-native-render-html@^5.1.0                                   | react-native-render-html@^5.1.0                                   | react-native-render-html@^5.1.0                                   |
| jest                                 | jest@^26.6.3                                                      | jest@^26.6.3                                                      | jest@^26.6.3                                                      | jest@^26.6.3                                                      | jest@^26.6.3                                                      | jest@^26.6.3                                                      | jest@^26.5.2                                                      | jest@^24.9.0                                                      | jest@^24.8.0                                                      | jest@^24.8.0                                                      |
| lazy-index                           | @rnx-kit/react-native-lazy-index@^2.1.7                           | @rnx-kit/react-native-lazy-index@^2.1.7                           | @rnx-kit/react-native-lazy-index@^2.1.7                           | @rnx-kit/react-native-lazy-index@^2.1.7                           | @rnx-kit/react-native-lazy-index@^2.1.7                           | react-native-lazy-index@^2.1.1                                    | react-native-lazy-index@^2.1.1                                    | react-native-lazy-index@^2.1.1                                    | react-native-lazy-index@^2.1.1                                    | react-native-lazy-index@^2.1.1                                    |
| masked-view                          | @react-native-masked-view/masked-view@^0.2.7                      | @react-native-masked-view/masked-view@^0.2.7                      | @react-native-masked-view/masked-view@^0.2.6                      | @react-native-masked-view/masked-view@^0.2.6                      | @react-native-masked-view/masked-view@^0.2.6                      | @react-native-masked-view/masked-view@^0.2.6                      | @react-native-masked-view/masked-view@^0.2.4                      | @react-native-masked-view/masked-view@^0.2.4                      | @react-native-masked-view/masked-view@^0.2.4                      | @react-native-masked-view/masked-view@^0.2.4                      |
| metro                                | metro@^0.72.1                                                     | metro@^0.70.1                                                     | metro@^0.67.0                                                     | metro@^0.66.2                                                     | metro@^0.66.2                                                     | metro@^0.66.0                                                     | metro@^0.64.0                                                     | metro@^0.59.0                                                     | metro@^0.58.0                                                     | metro@^0.56.0                                                     |
| metro-config                         | metro-config@^0.72.1                                              | metro-config@^0.70.1                                              | metro-config@^0.67.0                                              | metro-config@^0.66.2                                              | metro-config@^0.66.2                                              | metro-config@^0.66.0                                              | metro-config@^0.64.0                                              | metro-config@^0.59.0                                              | metro-config@^0.58.0                                              | metro-config@^0.56.0                                              |
| metro-core                           | metro-core@^0.72.1                                                | metro-core@^0.70.1                                                | metro-core@^0.67.0                                                | metro-core@^0.66.2                                                | metro-core@^0.66.2                                                | metro-core@^0.66.0                                                | metro-core@^0.64.0                                                | metro-core@^0.59.0                                                | metro-core@^0.58.0                                                | metro-core@^0.56.0                                                |
| metro-react-native-babel-transformer | metro-react-native-babel-transformer@^0.72.1                      | metro-react-native-babel-transformer@^0.70.1                      | metro-react-native-babel-transformer@^0.67.0                      | metro-react-native-babel-transformer@^0.66.2                      | metro-react-native-babel-transformer@^0.66.2                      | metro-react-native-babel-transformer@^0.66.0                      | metro-react-native-babel-transformer@^0.64.0                      | metro-react-native-babel-transformer@^0.59.0                      | metro-react-native-babel-transformer@^0.58.0                      | metro-react-native-babel-transformer@^0.56.0                      |
| metro-resolver                       | metro-resolver@^0.72.1                                            | metro-resolver@^0.70.1                                            | metro-resolver@^0.67.0                                            | metro-resolver@^0.66.2                                            | metro-resolver@^0.66.2                                            | metro-resolver@^0.66.0                                            | metro-resolver@^0.64.0                                            | metro-resolver@^0.59.0                                            | metro-resolver@^0.58.0                                            | metro-resolver@^0.56.0                                            |
| metro-runtime                        | metro-runtime@^0.72.1                                             | metro-runtime@^0.70.1                                             | metro-runtime@^0.67.0                                             | metro-runtime@^0.66.2                                             | metro-runtime@^0.66.2                                             | metro-runtime@^0.66.0                                             | metro-runtime@^0.64.0                                             | metro-runtime@^0.59.0                                             | metro-runtime@^0.58.0                                             | metro-runtime@^0.56.0                                             |
| modal                                | react-native-modal@^13.0.0                                        | react-native-modal@^13.0.0                                        | react-native-modal@^13.0.0                                        | react-native-modal@^13.0.0                                        | react-native-modal@^13.0.0                                        | react-native-modal@^13.0.0                                        | react-native-modal@^11.10.0                                       | react-native-modal@^11.5.6                                        | react-native-modal@^11.5.6                                        | react-native-modal@^11.5.6                                        |
| navigation/native                    | @react-navigation/native@^6.0.8                                   | @react-navigation/native@^6.0.8                                   | @react-navigation/native@^6.0.8                                   | @react-navigation/native@^6.0.8                                   | @react-navigation/native@^6.0.8                                   | @react-navigation/native@^5.9.8                                   | @react-navigation/native@^5.9.8                                   | @react-navigation/native@^5.9.4                                   | @react-navigation/native@^5.7.6                                   | @react-navigation/native@^5.7.6                                   |
| navigation/stack                     | @react-navigation/stack@^6.2.0                                    | @react-navigation/stack@^6.2.0                                    | @react-navigation/stack@^6.2.0                                    | @react-navigation/stack@^6.2.0                                    | @react-navigation/stack@^6.2.0                                    | @react-navigation/stack@^5.14.9                                   | @react-navigation/stack@^5.14.9                                   | @react-navigation/stack@^5.14.4                                   | @react-navigation/stack@^5.9.3                                    | @react-navigation/stack@^5.9.3                                    |
| netinfo                              | @react-native-community/netinfo@^9.0.0                            | @react-native-community/netinfo@^8.0.0                            | @react-native-community/netinfo@^7.0.0                            | @react-native-community/netinfo@^7.0.0                            | @react-native-community/netinfo@^7.0.0                            | @react-native-community/netinfo@^7.0.0                            | @react-native-community/netinfo@^6.0.2                            | @react-native-community/netinfo@^5.9.10                           | @react-native-community/netinfo@^5.9.10                           | @react-native-community/netinfo@^5.7.1                            |
| popover                              | react-native-popover-view@^5.0.0                                  | react-native-popover-view@^5.0.0                                  | react-native-popover-view@^4.0.3                                  | react-native-popover-view@^4.0.3                                  | react-native-popover-view@^4.0.3                                  | react-native-popover-view@^4.0.3                                  | react-native-popover-view@^4.0.3                                  | react-native-popover-view@^3.1.1                                  | react-native-popover-view@^3.1.1                                  | react-native-popover-view@^3.1.1                                  |
| react                                | react@18.1.0                                                      | react@18.0.0                                                      | react@17.0.2                                                      | react@17.0.2                                                      | react@17.0.2                                                      | react@17.0.2                                                      | react@17.0.1                                                      | react@16.13.1                                                     | react@16.11.0                                                     | react@16.9.0                                                      |
| react-dom                            | react-dom@^18.1.0                                                 | react-dom@^18.0.0                                                 | react-dom@17.0.2                                                  | react-dom@17.0.2                                                  | react-dom@17.0.2                                                  | react-dom@17.0.2                                                  | react-dom@17.0.1                                                  | react-dom@16.13.1                                                 | react-dom@16.11.0                                                 | react-dom@16.9.0                                                  |
| react-test-renderer                  | react-test-renderer@18.1.0                                        | react-test-renderer@18.0.0                                        | react-test-renderer@17.0.2                                        | react-test-renderer@17.0.2                                        | react-test-renderer@17.0.2                                        | react-test-renderer@17.0.2                                        | react-test-renderer@17.0.1                                        | react-test-renderer@16.13.1                                       | react-test-renderer@16.11.0                                       | react-test-renderer@16.9.0                                        |
| safe-area                            | react-native-safe-area-context@^4.4.1                             | react-native-safe-area-context@^4.3.1                             | react-native-safe-area-context@^3.2.0                             | react-native-safe-area-context@^3.2.0                             | react-native-safe-area-context@^3.2.0                             | react-native-safe-area-context@^3.2.0                             | react-native-safe-area-context@^3.2.0                             | react-native-safe-area-context@^3.2.0                             | react-native-safe-area-context@^3.1.9                             | react-native-safe-area-context@^3.1.9                             |
| screens                              | react-native-screens@^3.18.2                                      | react-native-screens@^3.14.1                                      | react-native-screens@^3.13.1                                      | react-native-screens@^3.9.0                                       | react-native-screens@^3.9.0                                       | react-native-screens@^3.7.0                                       | react-native-screens@^3.1.1                                       | react-native-screens@^2.18.1                                      | react-native-screens@^2.10.1                                      | react-native-screens@^2.10.1                                      |
| shimmer                              | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       | react-native-shimmer@^0.5.0                                       |
| sqlite                               | react-native-sqlite-storage@^6.0.1                                | react-native-sqlite-storage@^6.0.1                                | react-native-sqlite-storage@^5.0.0                                | react-native-sqlite-storage@^5.0.0                                | react-native-sqlite-storage@^5.0.0                                | react-native-sqlite-storage@^5.0.0                                | react-native-sqlite-storage@^5.0.0                                | react-native-sqlite-storage@^3.3.11                               | react-native-sqlite-storage@^3.3.11                               | react-native-sqlite-storage@^3.3.11                               |
| storage                              | @react-native-async-storage/async-storage@^1.17.10                | @react-native-async-storage/async-storage@^1.17.7                 | @react-native-async-storage/async-storage@^1.17.3                 | @react-native-async-storage/async-storage@^1.15.16                | @react-native-async-storage/async-storage@^1.15.9                 | @react-native-async-storage/async-storage@^1.15.8                 | @react-native-async-storage/async-storage@^1.15.8                 | @react-native-community/async-storage@^1.12.1                     | @react-native-community/async-storage@^1.12.1                     | @react-native-community/async-storage@^1.12.1                     |
| svg                                  | react-native-svg@^12.3.0                                          | react-native-svg@^12.3.0                                          | react-native-svg@^12.3.0                                          | react-native-svg@^12.1.1                                          | react-native-svg@^12.1.1                                          | react-native-svg@^12.1.1                                          | react-native-svg@^12.1.1                                          | react-native-svg@^12.1.1                                          | react-native-svg@^12.1.1                                          | react-native-svg@^12.1.1                                          |
| test-app                             | react-native-test-app@^1.6.9                                      | react-native-test-app@^1.3.10                                     | react-native-test-app@^1.3.5                                      | react-native-test-app@^1.1.7                                      | react-native-test-app@^1.0.6                                      | react-native-test-app@^0.11.4                                     | react-native-test-app@^0.11.4                                     | react-native-test-app@^0.11.4                                     | react-native-test-app@^0.11.4                                     | react-native-test-app@^0.11.4                                     |
| webview                              | react-native-webview@^11.23.0                                     | react-native-webview@^11.23.0                                     | react-native-webview@^11.22.6                                     | react-native-webview@^11.13.0                                     | react-native-webview@^11.13.0                                     | react-native-webview@^11.13.0                                     | react-native-webview@^11.4.2                                      | react-native-webview@^11.4.2                                      | react-native-webview@^11.0.3                                      | react-native-webview@^11.0.3                                      |

<!-- @rnx-kit/dep-check/capabilities end -->

</details>

To add new capabilities, first add it to
[`/packages/config/src/kitConfig.ts`](https://github.com/microsoft/rnx-kit/blob/62da26011c9ff86a24eed63356c68f6999034d34/packages/config/src/kitConfig.ts#L4),
then update the
[profiles](https://github.com/microsoft/rnx-kit/tree/main/packages/dep-check/src/profiles).
For an example, have a look at how the
[`hermes` capability was added](https://github.com/microsoft/rnx-kit/commit/c79828791a6ac5cf19b4abfff6347542af49eaec).

If you're looking to update capabilities to a more recent version, run
`yarn update-profile` to help determine whether we need to bump any packages.

## Custom Profiles

A custom profile is a list of capabilities that map to specific versions of
packages. It can be a JSON file, or a JS file that default exports it. Custom
profiles are consumed via the [`--custom-profiles`](#--custom-profiles-module)
flag.

For example, this custom profile adds `my-capability` to profile versions 0.63
and 0.64:

```js
module.exports = {
  0.63: {
    "my-capability": {
      name: "my-module",
      version: "1.0.0",
    },
  },
  0.64: {
    "my-capability": {
      name: "my-module",
      version: "1.1.0",
    },
  },
};
```

If you have capabilities that should be the same across all versions, you can
declare them at the root level like below:

```js
module.exports = {
  "my-capability": {
    name: "my-module",
    version: "1.0.0",
  },
  0.64: {
    // This entry will override the common version
    "my-capability": {
      name: "my-module",
      version: "1.1.0",
    },
  },
};
```

For a more complete example, have a look at the
[default profiles](https://github.com/microsoft/rnx-kit/blob/769e9fa290929effd5111884f1637c21326b5a95/packages/dep-check/src/profiles.ts#L11).

### Custom Capabilities

Normally, a capability resolves to a version of a package. For instance, `core`
is a capability that resolves to `react-native`:

```js
{
  "core": {
    name: "react-native",
    version: "0.0.0",
  },
}
```

A capability can depend on other capabilities. For example, we can ensure that
`react-native` gets installed along with `react-native-windows` by declaring
that `core-windows` depends on `core`:

```js
{
  "core-windows": {
    name: "react-native-windows",
    version: "0.0.0",
    capabilities: ["core"],
  },
}
```

You can also create capabilities that don't resolve to a package, but to a list
of capabilities instead:

```js
{
  "core/all": {
    name: "#meta",
    capabilities: [
      "core-android",
      "core-ios",
      "core-macos",
      "core-windows",
    ],
  },
}
```

We call these **meta** capabilities. To make it easier to identify them (both
for humans and machines), the `name` field must be set to `#meta`, and the
`capabilities` field must be a non-empty array of other capabilities. The
`version` field is no longer used and can be dropped. To use a meta capability
in your rnx-kit configuration, there's nothing specific to be done — for
instance:

```diff
 {
   "name": "my-package",
   ...
   "rnx-kit": {
     "reactNativeVersion": "0.64",
     "capabilities": [
+      "core/all"
     ],
     "customProfiles": "my-custom-profiles"
   }
 }
```

## Terminology

| Terminology      | Definition (as used in `dep-check`'s context)                                                                                                                                     |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| capability       | A capability is in essence a feature that the kit uses. A capability is usually mapped to an npm package. Which versions of the package is determined by a profile (see below).   |
| package manifest | This normally refers to a package's `package.json`.                                                                                                                               |
| profile          | A profile is a mapping of capabilities to npm packages at a specific version or version range. Versions will vary depending on which React Native version a profile is meant for. |

## Contribution

### Updating an Existing Profile

Updating an existing profile is unfortunately a manual process.

We have a script that fetches the latest version of all capabilities and
presents them in a table together with the current versions.

```sh
yarn update-profile
```

Outputs something like:

```
| Capability   | Name          | Version   | Latest | Homepage                                        |
| ------------ | ------------- | --------- | ------ | ----------------------------------------------- |
| core         | react-native  | ^0.68.0-0 | 0.68.2 | https://github.com/facebook/react-native#readme |
| core-android | react-native  | ^0.68.0-0 | 0.68.2 | https://github.com/facebook/react-native#readme |
| core-ios     | react-native  | ^0.68.0-0 | 0.68.2 | https://github.com/facebook/react-native#readme |
| hermes       | hermes-engine | ~0.11.0   | =      |                                                 |
| react        | react         | 17.0.2    | 18.1.0 | https://reactjs.org/                            |
| ...                                                                                                 |
```

With this information, we can see which packages have been updated since the
last profile, and scan their change logs for interesting changes that may affect
compatibility.

### Adding a Profile for a New Version of `react-native`

The `update-profile` script can also be used to add a profile. For instance, to
add a profile for `react-native` 0.69, run:

```sh
yarn update-profile 0.69
```

The script will try to figure out what version of `react`, `metro`, etc. should
be set to, and write to `src/profiles/profile-0.69.ts`. Please verify that this
profile looks correct before checking it in.
