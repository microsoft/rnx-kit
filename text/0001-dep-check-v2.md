- Title: dep-check v2
- Date: 2022-07-21
- RFC PR: https://github.com/microsoft/rnx-kit/pull/1757
- rnx-kit Issue: https://github.com/microsoft/rnx-kit/issues/1890

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

Aside from all these changes, we also want to rename it to distance it more from
other existing tools such as [`depcheck`](https://github.com/depcheck/depcheck)
(without the `-`).

The current new name proposed is `align-deps`
([npmjs search](https://www.npmjs.com/search?q=align-deps)). Feel free to
discuss as part of this RFC if you have other preferences, as comments to this
line. This was previously discussed in
[issue #484](https://github.com/microsoft/rnx-kit/issues/484).

# Motivation

While `dep-check` (now `align-deps`) is a tech agnostic solution for managing
dependencies, its configuration schema is currently tightly coupled with React
Native versions. This makes the configuration look out of place when used in web
only packages. Further, users have expressed a desire to centralize their
configuration around arbitrary dependencies (e.g. `react` or `@fluentui/react`
instead of `react-native`). They also want the ability to bring their own
presets.

# Guide-level Explanation

This is how the new config will live in a `package.json`:

```json
{
  "rnx-kit": {
    "kitType": "app",
    "align-deps": {
      "presets": ["microsoft", "/path/to/my-collection-of-multiple-profiles"],
      "requirements": ["react@18.0"],
      "capabilities": [
        "core-android",
        "core-ios",
        "core-macos",
        "core-windows",
        "react",
        "test-app"
      ]
    }
  }
}
```

There are a few main differences with how the config exists currently:

- the config lives within the `align-deps` section of the `rnx-kit` section (not
  on its own on top level)
- `reactNativeVersion` and `reactNativeDevVersion` are replaced by a more
  generic `requirements` (see details in the next section)
- no `profiles` option — it has been superseded by `presets`

We will enforce both `presets` and `requirements` to not be empty.

Finally, the current default preset, `microsoft`, will be renamed
`microsoft/react-native` to open the door to have a more generic/web based one
such as `microsoft/web`, or community based ones such as
`community/react-native`.

# Reference-level Explanation

Taking inspiration from
[browserslist](https://github.com/browserslist/browserslist), we want to
introduce queries as a way to pick profiles.

For example, to ensure that all packages are aligned on React 18.x:

```json
{
  "rnx-kit": {
    "align-deps": {
      "requirements": ["react@18.0"]
    }
  }
}
```

To ensure all packages declare compatibility with React >=16, and align on 18.x
for development:

```json
{
  "rnx-kit": {
    "align-deps": {
      "requirements": {
        "development": ["react@18.0"],
        "production": ["react@>=16.13"]
      }
    }
  }
}
```

You can bring your own presets to enrich the built-in one:

```json
{
  "rnx-kit": {
    "align-deps": {
      "presets": [
        "microsoft/react-native",
        "/path/to/my-collection-of-multiple-profiles"
      ],
      "requirements": ["react@18.0"]
    }
  }
}
```

This is roughly the same as adding `customProfiles` today. New with 2.0 is that
you can add multiple presets, and the ability to exclude the default preset:

```json
{
  "rnx-kit": {
    "align-deps": {
      "presets": ["/path/to/my-collection-of-multiple-profiles"],
      "requirements": ["react@18.0"]
    }
  }
}
```

In this new configuration shape, `profiles` has been replaced by `presets`. What
we've been calling a "custom profile" so far is actually a preset. This means
that existing custom profiles can be an entry in the new `presets` array.

Note that this config is just a more generic "frontend" to the tool. Where we
used to assume everything is related to `react-native`, the new schema makes no
such assumptions. Everything else still works the same. For instance, the
following configurations are equivalent:

```js
// 1.0
{
  "rnx-kit": {
    "reactNativeVersion": "0.66 || 0.67 || 0.68",
    "reactNativeDevVersion": "0.66",
    "customProfiles": "/path/to/custom-profiles"
  }
}
```

```js
// 2.0
{
  "rnx-kit": {
    "align-deps": {
      "presets": [
        "microsoft/react-native",
        "/path/to/custom-profiles"
      ],
      "requirements": {
        "development": ["core@0.66"],
        // └── equivalent to `reactNativeDevVersion`

        "production": ["core@0.66 || 0.67 || 0.68"]
        // └── equivalent to `reactNativeVersion`
      }
    }
  }
}
```

## About Flags

For consistency sake, we will remove the existing `--vigilant` flag since it
currently implies a requirement on `react-native` — in 2.0, both `presets` and
`requirements` will also be available as flags:

```sh
yarn rnx-align-deps                                  \
    --presets /path/to/profile-1,/path/to/profile-2  \
    --requirements react@18.0
```

Besides the syntax change, the behaviour is mostly the same. You can assume that
the following flags behave similarly:

| Old                  | New              |
| -------------------- | ---------------- |
| `--custom-profiles`  | `--presets`      |
| `--exclude-packages` | _no change_      |
| `--init`             | _no change_      |
| `--vigilant`         | `--requirements` |
| `--set-version`      | _no change_      |
| `--write`            | _no change_      |

## A Note on Conflict Resolution

What happens in the case of conflicts? For instance, React Native is not
compatible with React 18 until 0.69. What happens if we require both React 18
and React Native below 0.69:

```json
{
  "rnx-kit": {
    "align-deps": {
      "requirements": ["core@<0.69", "react@18.0"]
    }
  }
}
```

In this case, `align-deps` will throw an error since no presets can fulfill the
requirements. To resolve the conflict, we recommend that users move one of the
requirements to the relevant packages. For instance:

```json
{
  "rnx-kit": {
    "align-deps": {
      "requirements": ["react@18.0"]
    }
  }
}
```

```json
{
  "rnx-kit": {
    "align-deps": {
      "requirements": ["core@<0.69"]
    }
  }
}
```

In short, `align-deps` will not try to resolve conflicts. It is up to users to
build presets/profiles that fit their needs.

# Drawbacks

Not many drawbacks, just the one-off cost for developers to migrate to the new
shape. But given the footprint of the change, it's a few lines per each
`package.json` so not a massive migration cost.

Changing the name with the release will also help ensure that there's a clear
cut transition to the new configuration, and reduce the risk of
misconfiguration.

# Rationale, Alternatives, and Prior Art

N/A

# Adoption Strategy

As mentioned above, we want this new configuration to be rolled out as a new
major release (2.0) while still supporting the old shape. However, as we want
people to migrate, we are proposing the following checks:

- If the old configuration scheme is detected, we will translate it into the new
  scheme and tell the user what they need to do
- If both the old and the new schemes are present, the user will be asked to
  remove the old one

Further, since we will be renaming the package, we will also take steps to
ensure a smooth transition:

1. Rename the `dep-check` to `align-deps`
2. Change the old `dep-check` package to wrap the new package with a warning
   about the name change
   - `dep-check` will still work as is — it will call into `align-deps`, where
     the old config will be converted into the new shape as mentioned above
3. Delete `dep-check` as its usage number goes to zero

We can then consider removing support for the old shape in a potential version
3.0.

We'll pair the rollout with a migration guide and a blog post in the rnx-kit
repo.

# Unresolved Questions

N/A
