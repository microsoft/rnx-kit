# Dependencies

The React Native ecosystem is vast, and it changes all the time. This makes it
hard to find **actively maintained** packages which are **compatible** with each
other, and with the React Native version you are using. Keeping up means regular
package.json maintenance and thorough compatibility testing.

When you're ready to upgrade React Native itself, you need to start the whole
process over again. Find a new set of package versions. Make sure they don't
break each other or your app. It's a never-ending, time-consuming cycle.

The [dependency manager](/docs/guides/dependency-management) solves these
problems. It knows which React Native package versions work well together, and
it uses that knowledge to keep your app healthy and up-to-date.

## Capabilities and Profiles

The magic is in the data that comes with the dependency manager -- capabilities
and profiles. Together, they describe a _curated_ and _tested_ list of packages
that work with each major release of React Native; you can find the full list of
capabilities (_name & corresponding package_) that are supported by default
[in this table](https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps#capabilities).

A capability is something your app needs to function. It has a well-known name,
and it maps to a specific package and version:

```typescript
const capability = {
  react: {
    name: "react",
    version: "17.0.2",
  },
};
```

Capabilities can depend on each other, creating a tree:

```typescript
const capabilities = {
  react: {
    name: "react",
    version: "17.0.2",
  },
  "react-dom": {
    name: "react-dom",
    version: "17.0.2",
    capabilities: ["react"],
  },
};
```

A profile is a collection of capabilities, known to work well with a specific
release of React Native:

```typescript
const reactNative: Package = {
  name: "react-native",
  version: "^0.68.0",
  capabilities: ["react"],
};

const profile_0_68: Profile = {
  react: {
    name: "react",
    version: "17.0.2",
  },
  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  // ... etc ...
};
```

Each React Native release >= 0.61 has its own
[base profile](https://github.com/microsoft/rnx-kit/blob/main/packages/align-deps/src/presets/microsoft/react-native.ts),
and you can tailor your local configuration by following this
[customization guide](/docs/guides/dependency-management#customization).

## Meta Capabilities

Meta capabilities let you group capabilities together:

```typescript
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

Meta capabilities aren't versioned, and always have `#meta` in the name
property.

## Configuration

A package tells the dependency manager about itself using configuration. It
answers questions such as: Is the package an `app` or a `library`? Which
version(s) of React Native is the package targeting? What capabilities does the
package require?

```json title=package.json
{
  "rnx-kit": {
    "kitType": "app",
    "alignDeps": {
      "requirements": ["react-native@0.68"],
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

The dependency manager uses this configuration when validating or updating the
package's dependency list.

## Validating Dependencies

The dependency manager scans a package's dependencies, reporting anything that
is incompatible or missing. It normally only validates _configured_ packages,
though it can be used to validate unconfigured packages.

Configured package validation starts with the target React Native version(s).
The dependency manager gets the corresponding profile(s) and cross-references
them with the package's capabilities. Now it knows which dependencies (and
versions) the package _should_ have. It checks `dependencies`,
`devDependencies`, and `peerDependencies`, looking for incompatible or missing
packages. If anything is wrong, it reports detailed information to the console.

Validating an unconfigured package isn't as precise, though it is very useful as
a transitional tool when on-boarding large monorepos. You tell the dependency
manager which React Native version(s) to target. It looks at the package's
dependencies, and reverse-maps them to known capabilities. From there, it can
validate using the inferred capability list, reporting any incompatible or
missing dependencies.

Use the [dependency manager guide](/docs/guides/dependency-management) to learn
how to on-board existing repos incrementally, and run validation on configured
and unconfigured packages.

## Updating Dependencies

The dependency manager can automatically update a package's dependencies,
resolving compatibility problems and adding missing dependencies.

This is a very powerful tool for developers, especially when used in monorepos
with many packages.

The [dependency manager guide](/docs/guides/dependency-management) shows you how
to keep your packages up-to-date as dependencies change or capabilities are
added/removed. It also shows you how to automate a React Native upgrade,
changing every package and its dependencies, to known/good versions that work
well together.
