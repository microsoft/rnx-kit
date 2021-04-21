# @rnx-kit/dep-check

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

## Usage

```sh
rnx-dep-check [options] [/path/to/package.json]
```

Providing a path to `package.json` is optional. If omitted, it will look for one
using node module resolution.

### `--check`

This is a useful flag to use on CI pipelines to make sure your dependencies are
conforming. Adding this flag will make `rnx-dep-check` return a non-zero exit
code when changes are needed.

#### Exit codes

| Code | Description                    |
| :--- | :----------------------------- |
| 0    | Everything is fine and dandy.  |
| 1    | Something needs to be changed. |

### `--write`

Writes all changes to the specified `package.json`.

## Terminology

| Terminology      | Definition (as used in `dep-check`'s context)                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| capability       | A capability is in essence a feature that the kit uses. A capability is usually mapped to an npm package. Which versions of the package is determined by a profile (see below).   |
| package manifest | This normally refers to a package's `package.json`.                                                                                                                               |
| profile          | A profile is a mapping of capabilities to npm packages at a specific version or version range. Versions will vary depending on which React Native version a profile is meant for. |
