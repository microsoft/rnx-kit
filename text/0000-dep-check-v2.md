- Title: dep-check v2
- Date: 2022-07-21
- RFC PR: (leave this empty)
- rnx-kit Issue: (leave this empty)

# Summary

This proposal wants to cover a set of substantial changes we want to apply to
`dep-check` to expand and reshape its core logic and make it easier to use. We
have set a few goals for ourselves:

- To make it easier to relate to profiles, especially for web only consumers
- To make it easier to provide custom presets (collection of
  [profiles](https://microsoft.github.io/rnx-kit/docs/architecture/dependency-management#profiles))
  - This used to be hidden from the public, but will be exposed in this
    proposal. One example of a preset is the
    [built-in one](https://github.com/microsoft/rnx-kit/blob/main/packages/dep-check/src/presets/microsoft/index.ts).
- The old configuration scheme will still be supported and take precedence

# Motivation

While `dep-check` is a tech agnostic solution for managing dependencies, its
configuration schema is currently very coupled with React Native versions. This
makes the configuration look out of place when used in web only packages.
Further, users have expressed a desire to centralize their configuration around
arbitrary dependencies (e.g. `react` or `@fluentui/react` instead of
`react-native`). They also want the ability to bring their own presets.

# Guide-level explanation

This is how the new config will live in a `package.json`:

```json
{
  "rnx-kit": {
    "kitType": "app",
    "bundle":{
        ...
    },
    "dep-check": {
        "presets": [
          "microsoft",
          "/path/to/my-collection-of-multiple-profiles"
        ],
        "requirements": [
          "react@^18.0"
        ],
        "capabilities": [
          "core-android",
          "core-ios",
          "core-macos",
          "core-windows",
          "react",
          "test-app"
        ],
        "exclude-packages":{
            "folder-name"
        },
      }
  }
}
```

There are a few main differences with how the config exists currently:

- the config livs within the `dep-check` section of the `rnx-kit` section (not
  on its own on top level)
- there's no more `reactNativeVersion` and `reactNativeDevVersion`, replaced by
  more generic `requirements` (see details in the next section)
- no `profiles` option - it would just add confusion.

Moreover, we will enforce both `presets` and `requirements` to not be empty.

As a final note, the current "default" preset existing in the repo, `microsoft`
will be renamed `microsoft-react-native` to open the door to have a more
generic/web based one such as `microsoft-web`.

# Reference-level explanation

Taking inspiration from
[browserslist](https://github.com/browserslist/browserslist), we want to
introduce queries as a way to pick profiles.

For example, to ensure that all packages are aligned on React 18.x:

```json
{
  "dep-check": {
    "requirements": ["react@^18.0"]
  }
}
```

To ensure all packages declare compatibility with React >=16, and align on 18.x
for development:

```json
{
  "dep-check": {
    "requirements": {
      "development": ["react@^18.0"],
      "production": ["react@>=16.13"]
    }
  }
}
```

You can bring your own presets to enrich the built-in one:

```json
{
  "dep-check": {
    "presets": ["microsoft", "/path/to/my-collection-of-multiple-profiles"],
    "requirements": ["react@^18.0"]
  }
}
```

Or replace the built-in preset entirely:

```json
{
  "dep-check": {
    "presets": ["/path/to/my-collection-of-multiple-profiles"],
    "requirements": ["react@^18.0"]
  }
}
```

In this new configuration shape, we are removing the `profiles` entry: it would
just add confusion. Also, what we've been calling "custom profile" so far is
actually a preset, so the custom preset is expected as an extra element in the
presets array.

Note that this config is just a different "frontend" to the tool. Everything
else still works the same. For instance, the following configurations are
equivalent:

```json
{
  "rnx-kit": {
    "reactNativeVersion": "^0.66 || ^0.67 || ^0.68",
    "reactNativeDevVersion": "0.66"
  }
}
```

```json
{
  "dep-check": {
    "requirements": {
      "development": ["core@0.66"],
      "production": ["core@^0.66 || ^0.67 || ^0.68"]
    }
  }
}
```

## A Note on Conflict Resolution

What happens in the case of conflicts? For instance, React Native is not
compatible with React 18 until 0.69. What happens if we require both React 18
and React Native below 0.69:

```json
{
  "dep-check": {
    "requirements": ["core@<0.69", "react@^18.0"]
  }
}
```

In this case, `dep-check` will throw an error since the built-in preset cannot
fulfill the requirements. To resolve the conflict, we recommend that users move
one of the requirements to the relevant packages. For instance:

```js
// global config
{
  "dep-check": {
    "requirements": [
      "react@^18.0"
    ]
  }
}
```

```js
// package config
{
  "rnx-kit": {
    "reactNativeVersion": "^0.66 || ^0.67 || ^0.68",
    "reactNativeDevVersion": "0.66",
  }
}
```

In short, `dep-check` will not try to resolve conflicts. It is up to users to
build presets/profiles that fit their needs.

# Drawbacks

Not many drawbacks, just the one-off cost for developers to migrate to the new
shape. But given the footprint of the change, it's a few lines per each
package.json so not a massive migration cost.

# Rationale, alternatives, and prior art

N/A

# Adoption strategy

As mentioned above, we want this new configuration to be rolled out as a new
major release (2.0) - while still supporting the old shape: the old
configuration scheme will still be supported and take precedence.

We can then consider removing support for the old shape in a potential version
3.0.

We'll pair the rollout with a migration guide and a blogpost in the rnx-kit
repo.

# Unresolved questions

N/A
