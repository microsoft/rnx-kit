# @rnx-kit/dep-check

`@rnx-kit/dep-check` manages React Native dependencies for a package, based on
its needs and requirements.

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

## Usage

```sh
rnx-dep-check [options] [/path/to/package.json]
```

Providing a path to `package.json` is optional. If omitted, it will look for one
using node module resolution.

### `--write`

Writes all changes to the specified `package.json`.

## Configure

`@rnx-kit/dep-check` must first be configured before it can be used. It uses
`@rnx-kit/config` to retrieve your kit configuration. Your configuration can be
specified either in a file, `rnx-kit.config.js`, or in an `"rnx-kit"` section of
your `package.json`.

| Option                  | Type                   | Default               | Description                                                                                                                                                        |
| :---------------------- | :--------------------- | :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kitType`               | `"app"` \| `"library"` | `"library"`           | Whether this kit is an "app" or a "library". Determines how dependencies are declared.                                                                             |
| `reactNativeVersion`    | string                 | (required)            | Supported versions of React Native. The value can be a specific version or a range.                                                                                |
| `reactNativeDevVersion` | string                 | `minVersion(version)` | The version of React Native to use for development. If omitted, the minimum supported version will be used.                                                        |
| `capabilities`          | Capabilities[]         | `[]`                  | List of used/provided capabilities. A full list can be found in [`kitConfig.ts`](https://github.com/microsoft/rnx-kit/blob/main/packages/config/src/kitConfig.ts). |

## Terminology

| Terminology      | Definition (as used in `dep-check`'s context)                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| capability       | A capability is in essence a feature that the kit uses. A capability is usually mapped to an npm package. Which versions of the package is determined by a profile (see below).   |
| package manifest | This normally refers to a package's `package.json`.                                                                                                                               |
| profile          | A profile is a mapping of capabilities to npm packages at a specific version or version range. Versions will vary depending on which React Native version a profile is meant for. |
