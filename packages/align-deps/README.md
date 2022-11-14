<!--remove-block start-->

# @rnx-kit/align-deps

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/align-deps)](https://www.npmjs.com/package/@rnx-kit/align-deps)

<!--remove-block end-->

`@rnx-kit/align-deps` is a tool for managing dependencies within a repository
and across many repositories. It ensures that your packages are using compatible
dependencies and versions, given a set of [requirements](#requirements), based
on [customizable presets](#presets) with known good packages and versions that
are curated from real apps. You can even bring your own presets that are
tailored to your needs.

Note that this tool was previously known as `dep-check`, but it was renamed to
avoid name clashes and other reasons. For more details, you can read the RFC:
<https://github.com/microsoft/rnx-kit/pull/1757>.

If you want to learn how `align-deps` is used at Microsoft, and see a demo of
how it works in a monorepo, you can watch the
["Improve all the repos – exploring Microsoft’s DevExp"](https://youtu.be/DAEnPV78rQc?t=1085)
talk by [@kelset](https://github.com/kelset) and
[@tido64](https://github.com/tido64) at React Native Europe 2021.

To learn more about how `align-deps` works, please read the
[design document](https://microsoft.github.io/rnx-kit/docs/architecture/dependency-management).

## Installation

```sh
yarn add @rnx-kit/align-deps --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/align-deps
```

## Usage

```sh
yarn rnx-align-deps [options] [packages...]
```

Listing paths to packages that should be checked is optional. If omitted,
`align-deps` will look for the closest `package.json` using Node module
resolution. If the target package is a root package defining workspaces, they
will all be included.

Examples:

- Ensure dependencies are compatible with react-native 0.70 without a config:
  ```sh
  yarn rnx-align-deps --requirements react-native@0.70
  ```
- Initialize a config for your app (or library):
  ```sh
  yarn rnx-align-deps --init app
  # or specify `library` for a library
  ```
- Apply changes suggested by `align-deps`:
  ```sh
  yarn rnx-align-deps --write
  ```
- Interactively update supported react-native versions (or bump version used for
  development):
  ```sh
  yarn rnx-align-deps --set-version
  ```

### `--exclude-packages`

Comma-separated list of package names to exclude from inspection.

> #### Note
>
> `--exclude-packages` will only exclude packages that do not have a
> configuration. Packages that have a configuration, will still be checked.

### `--init <app | library>`

When integrating `@rnx-kit/align-deps` for the first time, it may be a
cumbersome to manually add all capabilities yourself. You can run this tool with
`--init`, and it will try to add a sensible configuration based on what is
currently defined in the specified `package.json`.

### `--presets`

Comma-separated list of presets. This can be names to built-in presets, or paths
to external presets. Paths can point to a JSON file, a `.js` file, or a module
name. The module must default export an object similar to the one below:

```js
module.exports = {
  0.69: {
    "my-capability": {
      name: "my-module",
      version: "1.0.0",
    },
  },
  "0.70": {
    "my-capability": {
      name: "my-module",
      version: "1.1.0",
    },
  },
};
```

For a more complete example, have a look at the
[default preset](https://github.com/microsoft/rnx-kit/blob/e1d4b2484303cac04e0ec6a4e79d854c694b96b4/packages/align-deps/src/presets/microsoft/react-native.ts).

See [Presets](#presets) for more details.

> #### Note
>
> This flag is only be considered when a package is not configured. The presets
> specified in the [configuration](#configure) will always take precedence.

### `--requirements`

Comma-separated list of requirements to apply if a package is _not configured_.

For example, `--requirements react-native@0.70` will make sure your packages are
compatible with `react-native` 0.70.

See [Requirements](#requirements) for more details.

### `--set-version`

Sets production and development `react-native` version requirements for any
configured package. The value should be a comma-separated list of `react-native`
versions to set. The first number specifies the development version. For
example, `--set-version 0.70,0.69` will set the following values:

```json
{
  "rnx-kit": {
    "alignDeps": {
      "requirements": {
        "development": ["react-native@0.70"],
        "production": ["react-native@0.69 || 0.70"]
      }
    }
  }
}
```

If the version numbers are omitted, an _interactive prompt_ will appear.

> #### Note
>
> A `rnx-align-deps --write` run will be invoked right after changes have been
> made. As such, this flag will fail if changes are needed before making any
> modifications.

### `--write`

Writes all proposed changes to the specified `package.json`.

## Configure

While `@rnx-kit/align-deps` can ensure your dependencies are aligned without a
configuration, you can only get the more advanced features, such as dependencies
section re-ordering (`dependencies` vs `peerDependencies`) and transitive
dependency detection (A -> B -> C), by adding a configuration. Your
configuration must be in an `"rnx-kit"` section of your `package.json`, and have
the following shapes depending on the package type:

```ts
export type AppConfig = {
  kitType: "app";
  alignDeps: {
    /**
     * Presets to use for aligning dependencies.
     * @default ["microsoft/react-native"]
     */
    presets?: string[];

    /**
     * Requirements for this package, e.g.
     * `react-native@>=0.70`.
     */
    requirements: string[];

    /**
     * Capabilities used by the kit.
     */
    capabilities: Capability[];
  };
};

export type LibraryConfig = {
  kitType: "library";
  alignDeps: {
    /**
     * Presets to use for aligning dependencies.
     * @default ["microsoft/react-native"]
     */
    presets?: string[];

    /**
     * Requirements for this package, e.g.
     * `react-native@>=0.70`. `development` is for
     * package authors, and `production` is for
     * consumers.
     */
    requirements: { development: string[]; production: string[] };

    /**
     * Capabilities used by the kit.
     */
    capabilities: Capability[];
  };
};
```

For example, this is a config for a library that supports `react-native` 0.69
and 0.70, and uses 0.70 internally:

```js
{
  "name": "useful-library",
  "version": "1.0",
  ...
  "rnx-kit": {
    "kitType": "library",
    "alignDeps": {
      "requirements": {
        "development": ["react-native@0.70"],
        "production": ["react-native@0.69 || 0.70"]
      }
      "capabilities": [
        "core-android",
        "core-ios"
      ]
    }
  }
}
```

## Capabilities

The following table contains the currently supported capabilities and what they
resolve to:

<details>
<summary>Capabilities Table</summary>

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/align-deps/capabilities start -->

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

<!-- @rnx-kit/align-deps/capabilities end -->

</details>

To add new capabilities, first add it to
[`packages/config/src/kitConfig.ts`](https://github.com/microsoft/rnx-kit/blob/e1d4b2484303cac04e0ec6a4e79d854c694b96b4/packages/config/src/kitConfig.ts#L6),
then update the
[preset](https://github.com/microsoft/rnx-kit/blob/e1d4b2484303cac04e0ec6a4e79d854c694b96b4/packages/align-deps/src/presets/microsoft/react-native.ts).
For an example, have a look at how the
[`hermes` capability was added](https://github.com/microsoft/rnx-kit/commit/c79828791a6ac5cf19b4abfff6347542af49eaec).

If you're looking to update capabilities to a more recent version, run
`yarn update-profile` to help determine whether we need to bump any packages.

## Presets

A profile is a list of capabilities that map to specific versions of packages. A
preset is a collection of such profiles. It can be a JSON file, or a JS file
that default exports it. Presets are consumed via the `presets` key in your
[configuration](#configure), or the [`--presets`](#--presets) flag.

### Extending Built-in Presets

The built-in preset, `microsoft/react-native`, contains a profile for every
supported version of react-native. The profiles are named after every minor
release, e.g. `0.69` or `0.70`.

To add a new capability, e.g. `my-capability`, to the built-in profiles `0.69`
and `0.70`, create a custom preset like below:

```js
// my-preset/index.js
module.exports = {
  0.69: {
    "my-capability": {
      name: "my-module",
      version: "1.0.0",
    },
  },
  "0.70": {
    "my-capability": {
      name: "my-module",
      version: "1.1.0",
    },
  },
};
```

Then add it to your configuration:

```diff
 {
   "name": "my-package",
   ...
   "rnx-kit": {
     "alignDeps": {
       "presets": [
         "microsoft/react-native",
+        "my-preset"
       ],
       "requirements": ["react-native@0.70"],
       "capabilities": [
         ...
       ]
     }
   }
 }
```

Or if you need to align unconfigured packages, specify
`--presets microsoft/react-native,my-preset`.

Make sure that `microsoft/react-native` is declared before your custom preset.
This will tell `align-deps` to append capabilities when the profile names match.

You can also use this feature to _override_ capabilities. For instance:

```js
// my-preset/index.js
module.exports = {
  "0.70": {
    core: {
      name: "react-native",
      version: "^0.70.3-myCustomFork.1",
    },
  },
};
```

With this preset, `core` will be resolved to your custom fork of `react-native`
instead of the official version.

Note that profile names are only needed when you want to extend or override
presets. Otherwise, you can name your profiles whatever you want.

For a complete example of a preset, have a look at
[`microsoft/react-native`](https://github.com/microsoft/rnx-kit/blob/e1d4b2484303cac04e0ec6a4e79d854c694b96b4/packages/align-deps/src/presets/microsoft/react-native.ts).

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
     "alignDeps": {
       "presets": ["microsoft/react-native", "my-preset"],
       "requirements": ["react-native@0.70"],
       "capabilities": [
+        "core/all"
       ]
     }
   }
 }
```

## Requirements

Requirements are what determines which profiles should be used. This is how it
roughly works:

- The list of presets are loaded and _merged_ into a giant preset
- For each profile in the _merged_ preset, check whether they fulfill the
  requirements
  - Profiles that do not fulfill the requirements are discarded
- Use the remaining profiles to align the target package

For example, given the following configuration:

```js
{
  "name": "useful-library",
  "version": "1.0",
  ...
  "rnx-kit": {
    "kitType": "library",
    "alignDeps": {
      "requirements": {
        "development": ["react-native@0.70"],
        "production": ["react-native@0.69 || 0.70"]
      }
      "capabilities": [
        "core-android",  // `core-android` resolves to `react-native`
        "core-ios"       // `core-ios` also resolves to `react-native`
      ]
    }
  }
}
```

`microsoft/react-native/0.70` will be used for development since it is the only
profile that fulfills the requirement, `react-native@0.70`. `align-deps` ensures
that `react-native` is correctly declared under `devDependencies`.

```diff
 {
   "name": "useful-library",
   "version": "1.0",
+  "devDependencies" {
+    "react-native": "^0.70.0"
+  }
   ...
 }
```

For production, there are two profiles that fulfill the requirements,
`microsoft/react-native/0.69` and `microsoft/react-native/0.70`. Since this
package is a library, `align-deps` ensures that `react-native` is correctly
declared under `peerDependencies`:

```diff
 {
   "name": "useful-library",
   "version": "1.0",
+  "peerDependencies": {
+    "react-native": "^0.69.0 || ^0.70.0"
+  },
   "devDependencies" {
     "react-native": "^0.70.0"
   }
   ...
 }
```

If the package was an app, `align-deps` would've ensured that `react-native` is
only declared under `dependencies`.

You can read more about the usage of the different dependencies sections in
[Dependency Management](https://microsoft.github.io/rnx-kit/docs/architecture/dependency-management).

One important thing to note here is that if there are multiple capabilities
resolving to the same package, only the first occurrence of the package is
checked. To illustrate this scenario, consider the following:

```ts
const builtInPreset = {
  "0.69": {
    core: {
      name: "react-native",
      version: "^0.69.0",
    },
  },
  "0.70": {
    core: {
      name: "react-native",
      version: "^0.70.0",
    },
  },
};

const customPreset = {
  "0.69": {
    "custom-capability": {
      name: "react-native",
      version: "^0.70.0-fork.1",
    },
  },
};

const megaPreset = mergePresets([builtInPreset, customPreset]);
/*
{
  "0.69": {
    core: {
      name: "react-native",
      version: "^0.69.0",
    },
    "custom-capability": {
      name: "react-native",
      version: "^0.70.0-fork.1",
    },
  },
  "0.70": {
    core: {
      name: "react-native",
      version: "^0.70.0",
    },
  },
}
 */

const filteredPreset = filterPreset(megaPreset, ["react-native@0.70"]);
/* ??? */
```

If `filterPreset` checked all capabilities in the profiles, it would return both
`0.69` and `0.70` here because `custom-capability` would satisfy
`react-native@0.70`. This is unexpected behaviour. Instead, `align-deps` looks
for the first package matching the name and _then_ checks whether it fulfills
the requirement. With this algorithm, only `0.70` is returned.

## Migrating From `dep-check`

Changes from `dep-check` to `align-deps` mostly surrounds the configuration
schema, and renaming of a couple of flags:

- In most cases, your old configuration will still work as before. `align-deps`
  will tell you how to convert the old config, but you can also specify
  `--migrate-config` to let `align-deps` do it for you.

- The following flags were renamed:

  | Old                  | New                                 |
  | -------------------- | ----------------------------------- |
  | `--custom-profiles`  | [`--presets`](#--presets)           |
  | `--exclude-packages` | _no change_                         |
  | `--init`             | _no change_                         |
  | `--vigilant`         | [`--requirements`](#--requirements) |
  | `--set-version`      | _no change_                         |
  | `--write`            | _no change_                         |

- Because the new config schema no longer relies on profile names to determine a
  profile, we had to _drop support_ for declaring capabilities at the root level
  because we cannot reliably detect whether an entry is a package or a profile.
  You will have to add those capabilities to all the profiles you want them
  added to.

## Terminology

| Terminology      | Definition (as used in `align-deps`'s context)                                                                                                                                  |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| capability       | A capability is in essence a feature that the kit uses. A capability is usually mapped to an npm package. Which versions of the package is determined by a profile (see below). |
| package manifest | This normally refers to a package's `package.json`.                                                                                                                             |
| preset           | A collection of profiles.                                                                                                                                                       |
| profile          | A profile is a mapping of capabilities to npm packages at a specific version or version range.                                                                                  |

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
be set to, and write to `src/presets/microsoft/react-native/profile-0.69.ts`.
Please verify that this profile looks correct before checking it in.
