# @rnx-kit/dep-check

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/dep-check)](https://www.npmjs.com/package/@rnx-kit/dep-check)

`@rnx-kit/dep-check` manages React Native dependencies for a package, based on
its needs and requirements.

## Usage

```sh
rnx-dep-check [options] [/path/to/package.json]
```

Providing a path to `package.json` is optional. If omitted, it will look for one
using Node module resolution.

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

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/dep-check/capabilities start -->

| Capability        | 0.65                                              | 0.64                                              | 0.63                                          | 0.62                                          | 0.61                                          |
| ----------------- | ------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| core              | react-native@^0.65.0-0                            | react-native@^0.64.2                              | react-native@^0.63.2                          | react-native@^0.62.3                          | react-native@^0.61.5                          |
| core-android      | react-native@^0.65.0-0                            | react-native@^0.64.2                              | react-native@^0.63.2                          | react-native@^0.62.3                          | react-native@^0.61.5                          |
| core-ios          | react-native@^0.65.0-0                            | react-native@^0.64.2                              | react-native@^0.63.2                          | react-native@^0.62.3                          | react-native@^0.61.5                          |
| core-macos        | react-native-macos@^0.65.0-0                      | react-native-macos@^0.64.0                        | react-native-macos@^0.63.0                    | react-native-macos@^0.62.0                    | react-native-macos@^0.61.0                    |
| core-windows      | react-native-windows@^0.65.0-0                    | react-native-windows@^0.64.0                      | react-native-windows@^0.63.0                  | react-native-windows@^0.62.0                  | react-native-windows@^0.61.0                  |
| animation         | react-native-reanimated@^2.1.0                    | react-native-reanimated@^2.1.0                    | react-native-reanimated@^1.13.3               | react-native-reanimated@^1.13.3               | react-native-reanimated@^1.13.3               |
| base64            | react-native-base64@^0.2.1                        | react-native-base64@^0.2.1                        | react-native-base64@^0.2.1                    | react-native-base64@^0.2.1                    | react-native-base64@^0.2.1                    |
| checkbox          | @react-native-community/checkbox@^0.5.8           | @react-native-community/checkbox@^0.5.8           | @react-native-community/checkbox@^0.5.7       | @react-native-community/checkbox@^0.5.7       | @react-native-community/checkbox@^0.5.7       |
| clipboard         | @react-native-clipboard/clipboard@^1.7.3          | @react-native-clipboard/clipboard@^1.7.3          | @react-native-community/clipboard@^1.5.1      | @react-native-community/clipboard@^1.5.1      | @react-native-community/clipboard@^1.5.1      |
| datetime-picker   | @react-native-community/datetimepicker@^3.4.6     | @react-native-community/datetimepicker@^3.4.6     | @react-native-community/datetimepicker@^3.0.9 | @react-native-community/datetimepicker@^3.0.9 | @react-native-community/datetimepicker@^3.0.9 |
| filesystem        | react-native-fs@^2.17.0                           | react-native-fs@^2.17.0                           | react-native-fs@^2.16.6                       | react-native-fs@^2.16.6                       | react-native-fs@^2.16.6                       |
| floating-action   | react-native-floating-action@^1.21.0              | react-native-floating-action@^1.21.0              | react-native-floating-action@^1.21.0          | react-native-floating-action@^1.18.0          | react-native-floating-action@^1.18.0          |
| gestures          | react-native-gesture-handler@^1.10.3              | react-native-gesture-handler@^1.10.3              | react-native-gesture-handler@^1.10.3          | react-native-gesture-handler@^1.9.0           | react-native-gesture-handler@^1.9.0           |
| hermes            | hermes-engine@~0.8.1                              | hermes-engine@~0.7.0                              | hermes-engine@~0.5.0                          | hermes-engine@~0.4.0                          | hermes-engine@^0.2.1                          |
| hooks             | @react-native-community/hooks@^2.6.0              | @react-native-community/hooks@^2.6.0              | @react-native-community/hooks@^2.6.0          | @react-native-community/hooks@^2.6.0          | @react-native-community/hooks@^2.6.0          |
| html              | react-native-render-html@^5.1.0                   | react-native-render-html@^5.1.0                   | react-native-render-html@^5.1.0               | react-native-render-html@^5.1.0               | react-native-render-html@^5.1.0               |
| lazy-index        | react-native-lazy-index@^2.1.1                    | react-native-lazy-index@^2.1.1                    | react-native-lazy-index@^2.1.1                | react-native-lazy-index@^2.1.1                | react-native-lazy-index@^2.1.1                |
| masked-view       | @react-native-masked-view/masked-view@^0.2.4      | @react-native-masked-view/masked-view@^0.2.4      | @react-native-masked-view/masked-view@^0.2.4  | @react-native-masked-view/masked-view@^0.2.4  | @react-native-masked-view/masked-view@^0.2.4  |
| modal             | react-native-modal@^11.10.0                       | react-native-modal@^11.10.0                       | react-native-modal@^11.5.6                    | react-native-modal@^11.5.6                    | react-native-modal@^11.5.6                    |
| navigation/native | @react-navigation/native@^5.9.4                   | @react-navigation/native@^5.9.4                   | @react-navigation/native@^5.9.4               | @react-navigation/native@^5.7.6               | @react-navigation/native@^5.7.6               |
| navigation/stack  | @react-navigation/stack@^5.14.4                   | @react-navigation/stack@^5.14.4                   | @react-navigation/stack@^5.14.4               | @react-navigation/stack@^5.9.3                | @react-navigation/stack@^5.9.3                |
| netinfo           | @react-native-community/netinfo@^6.0.0            | @react-native-community/netinfo@^6.0.0            | @react-native-community/netinfo@^5.9.10       | @react-native-community/netinfo@^5.9.10       | @react-native-community/netinfo@^5.7.1        |
| popover           | react-native-popover-view@^4.0.0                  | react-native-popover-view@^4.0.0                  | react-native-popover-view@^3.1.1              | react-native-popover-view@^3.1.1              | react-native-popover-view@^3.1.1              |
| react             | react@17.0.2                                      | react@17.0.1                                      | react@16.13.1                                 | react@16.11.0                                 | react@16.9.0                                  |
| safe-area         | react-native-safe-area-context@^3.2.0             | react-native-safe-area-context@^3.2.0             | react-native-safe-area-context@^3.2.0         | react-native-safe-area-context@^3.1.9         | react-native-safe-area-context@^3.1.9         |
| screens           | react-native-screens@^3.1.1                       | react-native-screens@^3.1.1                       | react-native-screens@^2.18.1                  | react-native-screens@^2.10.1                  | react-native-screens@^2.10.1                  |
| shimmer           | react-native-shimmer@^0.5.0                       | react-native-shimmer@^0.5.0                       | react-native-shimmer@^0.5.0                   | react-native-shimmer@^0.5.0                   | react-native-shimmer@^0.5.0                   |
| sqlite            | react-native-sqlite-storage@^5.0.0                | react-native-sqlite-storage@^5.0.0                | react-native-sqlite-storage@^3.3.11           | react-native-sqlite-storage@^3.3.11           | react-native-sqlite-storage@^3.3.11           |
| storage           | @react-native-async-storage/async-storage@^1.15.5 | @react-native-async-storage/async-storage@^1.15.5 | @react-native-community/async-storage@^1.12.1 | @react-native-community/async-storage@^1.12.1 | @react-native-community/async-storage@^1.12.1 |
| svg               | react-native-svg@^12.1.1                          | react-native-svg@^12.1.1                          | react-native-svg@^12.1.1                      | react-native-svg@^12.1.1                      | react-native-svg@^12.1.1                      |
| test-app          | react-native-test-app@^0.7.0                      | react-native-test-app@^0.7.0                      | react-native-test-app@^0.7.0                  | react-native-test-app@^0.7.0                  | react-native-test-app@^0.7.0                  |
| webview           | react-native-webview@^11.4.2                      | react-native-webview@^11.4.2                      | react-native-webview@^11.4.2                  | react-native-webview@^11.0.3                  | react-native-webview@^11.0.3                  |

<!-- @rnx-kit/dep-check/capabilities end -->

## Terminology

| Terminology      | Definition (as used in `dep-check`'s context)                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| capability       | A capability is in essence a feature that the kit uses. A capability is usually mapped to an npm package. Which versions of the package is determined by a profile (see below).   |
| package manifest | This normally refers to a package's `package.json`.                                                                                                                               |
| profile          | A profile is a mapping of capabilities to npm packages at a specific version or version range. Versions will vary depending on which React Native version a profile is meant for. |

## Motivation

There is currently no centralised place where developers can go to and get a
list of recommended packages, and which versions they should be using when
targeting a specific version of React Native. We are trying to address this gap
with this tool.

`@rnx-kit/dep-check` works by reading a configuration, and suggests changes that
need to be made. It can optionally also write said changes to the
`package.json`. The configuration must be manually written by the package owner.
It declares which React Native versions the package supports, and which
capabilities it requires. For instance, lets say we have a library,
`awesome-library`, which supports React Native versions 0.63 and 0.64, and needs
something that provides network information. We would declare the following in
our `package.json`:

```json
// package.json
{
  "name": "awesome-library",
  "version": "1.0.0",
  ...
  "rnx-kit": {
    "reactNativeVersion": "^0.63 || ^0.64",
    "capabilities": [
      "core-android",
      "core-ios",
      "netinfo"
    ]
  }
}
```

If we run `@rnx-kit/dep-check` now, it will suggest that we change
`peerDependencies` and `devDependencies` to the following:

```json
// package.json
{
  "name": "awesome-library",
  "version": "1.0.0",
  ...
  "peerDependencies": {
    "@react-native-community/netinfo": "^5.7.1 || ^6.0.0",
    "react-native": "^0.63.2 || ^0.64.1"
  },
  "devDependencies": {
    "@react-native-community/netinfo": "^5.7.1",
    "react-native": "^0.63.2"
  },
  "rnx-kit": {
    "reactNativeVersion": "^0.63 || ^0.64",
    "capabilities": [
      "core-android",
      "core-ios",
      "netinfo"
    ]
  }
}
```

Now our `package.json` correctly declares that it supports React Native 0.63 and
0.64 to consumers. It also added `@react-native-community/netinfo`, a package
that provides network information. At the same time, it also sets the versions
we'll need during development.

For apps that use `@rnx-kit/dep-check`, the process is similar but you'll also
need to declare that the package is an app by adding `"kitType": "app"`:

```json
// package.json
{
  "name": "awesome-app",
  "version": "1.0.0",
  ...
  "dependencies": {
    "@react-native-community/netinfo": "^6.0.0",
    "awesome-library": "1.0.0",
    "react-native": "^0.64.1"
  },
  "rnx-kit": {
    "reactNativeVersion": "^0.64",
    "kitType": "app",
    "capabilities": [
      "core-android",
      "core-ios"
    ]
  }
}
```

Now, we see that `@rnx-kit/dep-check` added `@react-native-community/netinfo`
even though it wasn't declared in capabilities. This is because when a package
is an app, it needs to fulfill the requirements of its dependencies. In this
example, because `awesome-library` needs the `netinfo` capability, it gets added
to `awesome-app`.

For a more detailed design document, see [`DESIGN.md`](./DESIGN.md).
