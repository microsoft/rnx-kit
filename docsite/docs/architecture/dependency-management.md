# Dependency Management

:::note

`dep-check` was recently renamed to `align-deps` to avoid name clashes and
general confusion. Unless noted otherwise, this document is still valid.

You can read more about the changes in this RFC:
<https://github.com/microsoft/rnx-kit/blob/rfcs/text/0001-dep-check-v2.md>

:::

[dep-check](../tools/align-deps) is a dependency manager and linter that aims to
bring alignment to all React Native developers who are working in any-size
repositories, from small self-contained repositories to big, enterprise
monorepos.

## Terminology

- **experience** — As opposed to apps that get shipped in e.g. App Store or Play
  Store, experiences may be a single screen (or multiple) integrated into an
  app. They are normally not shipped as standalone apps.
- **monorepo** — A single repository in which many projects live. These can
  range from single-purpose libraries to experiences or full-fledged apps. For
  instance, https://github.com/microsoft/rnx-kit is a monorepo containing many
  useful tools, including `dep-check`.

## Motivation

The design of `dep-check` is driven mainly by the following questions:

### 1. Which packages should I use?

There is currently no centralized place where developers can go to and get a
list of recommended modules, and which versions they should be using when
targeting a specific version of React Native. How do you know whether a module
is still maintained? Are the maintainers still around to review PRs? Is the
module being used by others?

Take `AsyncStorage` as an example. This is a module that used to ship with React
Native. It then got moved out to the React Native Community organization as
`@react-native-community/async-storage` as part of the Lean Core effort. It
later got ejected from React Native Community, and was renamed
`@react-native-async-storage/async-storage`. If you don't know the full story of
what happened here, there is little chance you know that `AsyncStorage` from
core, `@react-native-community/async-storage`, and
`@react-native-async-storage/async-storage` are all the same module. Or that
`@react-native-community/netinfo` was a fork of `react-native-netinfo` that
later became the "official" one.

### 2. How do I align all of my code on the same set of packages and versions?

Ideally, all apps are always on the latest version of `react-native` and are
using a common set of well maintained community modules. Unfortunately, the
reality is that some apps are on a two year old version of `react-native` and
some modules that are no longer maintained, while others are on a somewhat
recent version of `react-native` but on an older version of WebView than what
others use. When you're responsible for an experience that goes into many apps,
you may be forced to provide support for both scenarios (and others), and that's
where most feel the pain. How can you make sure that your experiences'
dependencies play well with each other or even other experiences? The pain is
magnified in a monorepo with many developers as breakages can come from a single
package being out of sync with the others. Breakages caused by such packages are
hard to debug and pinpoint the cause. In a monorepo, it is very important to
ensure that all packages are on the same versions.

### 3. How do I align all apps on the same set of packages and versions?

When integrating multiple experiences into an existing app, it can sometimes be
difficult to determine the dependencies that need to be installed. For example,
given two experiences with dependencies as below:

```json
{
  "name": "experience-A",
  "version": "1.0.0",
  "peerDependencies": {
    "react-native": "^0.63 || ^0.64",
    "react-native-netinfo": "^5.7.1 || ^6.0.0"
  }
}
```

```json
{
  "name": "experience-B",
  "version": "1.0.0",
  "peerDependencies": {
    "react-native": "^0.63",
    "react-native-netinfo": "^5.7.1 || ^6.0.0"
  }
}
```

In this example, it's not so hard to see that the integrating app should be
using `react-native` 0.63 and `react-native-netinfo` 6.0.0. However, imagine
that there are multiple experiences and many more dependencies. It's not hard to
see that it can quickly become very messy to go through all of them and make
sure that the app's `package.json` satisfies all of them, and without causing
any conflicts. And you'll have to do this every time one or more packages get
updated. Not all experiences will be declaring their dependencies correctly,
e.g. putting `react-native-netinfo` under `dependencies` and causing multiple
versions of `react-native-netinfo` to be bundled. When it is time to update
React Native to the latest version, can you do that and still be confident that
all your modules will still work?

`@rnx-kit/dep-check` works by reading a configuration, and suggests changes that
need to be made. It can optionally also write said changes to the
`package.json`. The configuration must be manually written by the package owner.
It declares which React Native versions the package supports, and which
capabilities it requires. For instance, lets say we have a library,
`awesome-library`, which supports React Native versions 0.63 and 0.64, and needs
something that provides network information. We would declare the following in
our `package.json`:

```json title="package.json"
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

```json title="package.json"
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

```json title="package.json"
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

## Design

`dep-check` attempts to solve these issues by aligning users on a centralized
repository of dependencies. Initially, the repository will be seeded with
popular packages, but the goal for it is to become crowd-sourced so that we all
can benefit from the latest fixes and features without all having to be
up-to-date on everything that goes within the React Native community.

### Capabilities

Modules usually provide one or more features. For instance,
`@react-native-async-storage/async-storage` provides a simple key-value storage,
`react-native-webview` provides a web view component, and so on. Knowing which
modules are providing the desired features can be tricky. With `dep-check`, we
propose the use of generic names, or capabilities as we call them, that map
directly to a package:

| Capability | Description                | Package                                   |
| :--------- | :------------------------- | :---------------------------------------- |
| netinfo    | Device network information | @react-native-community/netinfo           |
| storage    | Key-value storage          | @react-native-async-storage/async-storage |
| webview    | WebView component          | react-native-webview                      |

`dep-check` also defines a set of **core** capabilities. These are capabilities
that provide platform support, and are currently defined in the below table:

| Capability   | Platform | Package              |
| :----------- | :------- | :------------------- |
| core-android | Android  | react-native         |
| core-ios     | iOS      | react-native         |
| core-macos   | macOS    | react-native-macos   |
| core-windows | Windows  | react-native-windows |

With generic names, we are more resilient against module renames since we can
recommend the old name in one version, and the new name in the next. We could
even provide a fork with security fixes or backwards compatibility shims for
long term support. We will see how this can be achieved with profiles in the
next section.

### Profiles

We cannot force everyone to be on the latest version of `react-native`.
Sometimes it's not desirable, e.g. due to bugs, or feasible due to constraints
or lack of expertise. What we can do, however, is to try lessen the pain of
supporting multiple versions of `react-native` and community modules. To that
end, `dep-check` introduces the concept of profiles. A profile is a single set
of all capability to package@version mappings, usually tied to a single version
of `react-native`. For instance, the following table is a partial profile for
`react-native` 0.63
([full listing here](https://github.com/microsoft/rnx-kit/blob/769e9fa290929effd5111884f1637c21326b5a95/packages/dep-check/src/profiles/profile-0.63.ts#L9)):

| Capability   | Package                                       |
| :----------- | :-------------------------------------------- |
| core-android | react-native@^0.63.2                          |
| core-ios     | react-native@^0.63.2                          |
| core-macos   | react-native-macos@^0.63.0                    |
| core-windows | react-native-windows@^0.63.0                  |
| netinfo      | @react-native-community/netinfo@^5.7.1        |
| react        | react@16.13.1                                 |
| storage      | @react-native-community/async-storage@^1.12.1 |
| webview      | react-native-webview@^11.4.2                  |

Here's the partial profile for react-native 0.64
([full listing here](https://github.com/microsoft/rnx-kit/blob/769e9fa290929effd5111884f1637c21326b5a95/packages/dep-check/src/profiles/profile-0.64.ts#L8)):

| Capability   | Package                                           |
| :----------- | :------------------------------------------------ |
| core-android | react-native@^0.64.2                              |
| core-ios     | react-native@^0.64.2                              |
| core-macos   | react-native-macos@^0.64.0                        |
| core-windows | react-native-windows@^0.64.0                      |
| netinfo      | @react-native-community/netinfo@^6.0.0            |
| react        | react@17.0.1                                      |
| storage      | @react-native-async-storage/async-storage@^1.15.3 |
| webview      | react-native-webview@^11.4.2                      |

A package declares what capabilities it requires, which versions of
`react-native` it supports, and `dep-check` will populate the package's
`package.json` with the modules and versions that it should use. For instance,
if a package that supports `react-native` 0.63 requires `core-ios`, `netinfo`,
and `react`, `dep-check` will add `react-native@^0.63.2`,
`@react-native-community/netinfo@^5.7.1`, and `react@16.13.1`.

When the package is migrated from one profile version to the next, the author
should be prompted to bump a few packages. For instance, besides bumping
`react-native`, they also should bump `react` to 17.0.1, and
`@react-native-community/netinfo` to ^6.0.0. We also note that
`@react-native-community/async-storage` was renamed to
`@react-native-async-storage/async-storage`. While users are on older profiles,
they should be warned of upcoming, potentially breaking changes so they can be
prepared.

Besides package renames, we can also recommend alternative modules that provide
the same capability, or forks that include security fixes or shims for backwards
compatibility where long term support is a concern.

### Putting it all together

Now that we know the basic concepts, let's take a look at how it works. We'll
start with configuring the examples from earlier. `experience-A` depends on
`react-native` and `react-native-netinfo`. According to our list of
capabilities, they correspond to `core-android`/`core-ios` and `netinfo`:

```diff
 {
   "name": "experience-A",
   "version": "1.0.0",
   "peerDependencies": {
     "react-native": "^0.63 || ^0.64",
     "react-native-netinfo": "^5.7.1 || ^6.0.0"
   },
+  "rnx-kit": {
+    "reactNativeVersion": "^0.63 || ^0.64",
+    "capabilities": ["core-android", "core-ios", "netinfo"]
+  }
 }
```

Likewise for `experience-B`:

```diff
 {
   "name": "experience-B",
   "version": "1.0.0",
   "peerDependencies": {
     "react-native": "^0.63",
     "react-native-netinfo": "^5.7.1 || ^6.0.0"
   },
+  "rnx-kit": {
+    "reactNativeVersion": "^0.63",
+    "capabilities": ["core-android", "core-ios", "netinfo"]
+  }
 }
```

If we run `dep-check` now, it will complain because `experience-B` only needs to
support `react-native-netinfo`@^5.7.1:

```diff
 {
   "name": "experience-B",
   "version": "1.0.0",
   "peerDependencies": {
     "react-native": "^0.63",
-    "react-native-netinfo": "^5.7.1 || ^6.0.0"
+    "react-native-netinfo": "^5.7.1"
   },
   "rnx-kit": {
     "reactNativeVersion": "^0.63",
     "capabilities": ["core-android", "core-ios", "netinfo"]
   }
 }
```

We try to avoid breaking changes (major version bumps) within a single profile
version. That's why `dep-check` will recommend 5.x only for `react-native` 0.63.

If we add `webview` to capabilities now, `dep-check` will ask you to add
`react-native-webview`:

```diff
 {
   "name": "experience-B",
   "version": "1.0.0",
   "peerDependencies": {
     "react-native": "^0.63",
     "react-native-netinfo": "^5.7.1",
+    "react-native-webview": "^11.4.2"
   },
   "rnx-kit": {
     "reactNativeVersion": "^0.63",
     "capabilities": ["core-android", "core-ios", "netinfo", "webview"]
   }
 }
```

The user need not know what package to use, only the desired feature.

Let's move on to configuring our app:

```diff
 {
   "name": "app",
   "version": "1.0.0",
   "dependencies": {
     "experience-A": "^1.0.0",
     "experience-B": "^1.0.0",
     "react-native": "^0.63.2"
   },
+  "rnx-kit": {
+    "reactNativeVersion": "^0.63",
+    "kitType": "app",
+    "capabilities": ["core-android", "core-ios"]
+  }
 }
```

The first thing you should note here is that we need to declare that this is an
app by setting `"kitType": "app"`. This will tell `dep-check` to also scan
dependencies. By default, this is set to `library`.

Running `dep-check` now, the first thing it does is to scan through all your
dependencies and gather all required capabilities. `dep-check` will then resolve
all capabilities, and finally make sure the `dependencies` section in
`package.json` contains all the needed packages and at the correct versions. In
our example, our list of capabilities will contain `["netinfo", "webview"]`.
`dep-check` sees that there are missing dependencies in your `package.json` and
will output an error message telling you to add them:

```diff
 {
   "name": "app",
   "version": "1.0.0",
   "dependencies": {
     "experience-A": "^1.0.0",
     "experience-B": "^1.0.0",
     "react-native": "^0.63.2",
+    "react-native-netinfo": "^5.7.1",
+    "react-native-webview": "^11.4.2"
   },
   "rnx-kit": {
     "reactNativeVersion": "^0.63",
     "capabilities": ["core-android", "core-ios"]
   }
 }
```

Re-running the command with `--write` will let `dep-check` add them for you.

`dep-check` makes sure that your declared dependencies always matches your list
of capabilities. It will make sure that your dependencies are declare in the
right sections, i.e. under `dependencies` if you're an app, and under
`peerDependencies` if you're a library. It will also report partial ones,
meaning it will catch scenarios such as when you declare support for 0.63 and
0.64, but are missing `react-native-netinfo`@^6.0.0.

### Zero-config

`dep-check` is currently opt-in. Packages need to have a configuration that
`dep-check` can run against. However, there is still a need to align packages
across repositories without having to configure all packages. `dep-check` should
still be useful without a configuration.

- `--init` — When configuring a package, it can be cumbersome to know what
  packages map to what capabilities. `--init` is a best-effort command that
  scans all your dependencies and adds a configuration with all the capabilities
  it thinks are required. You'll likely have to clean up the list, but at least
  you won't have to start from scratch.
- `--vigilant` — Without configuring any packages, you can still benefit from
  `dep-check` with `--vigilant`. This mode will scan all dependencies and make
  sure that their dependencies align with the specified profiles. For instance,
  `--vigilant 0.63,0.64` will compare dependencies against all known modules in
  profile version 0.63 and 0.64.

:::note

In `align-deps`, we've changed the configuration schema to make it more generic
and not tied to a specific dependency (i.e. `react-native`). The `--vigilant`
flag had to be replaced as well. The equivalent of `--vigilant 0.63,0.64` in the
new schema is `--requirements 'react-native@0.63 || 0.64'`.

You can read more about the changes in this RFC:
<https://github.com/microsoft/rnx-kit/blob/rfcs/text/0001-dep-check-v2.md>

:::

### Extensions

The list of capabilities may be limited for some usage scenarios. `dep-check`
therefore also allows users to specify additional profiles via configuration,
`customProfiles`, or the equivalent flag, `--custom-profiles`. The value can be
a path to a `.js`, `.json`, or module name, e.g.
`my-custom-capability-resolver`, and must default export an object containing
profiles keyed by its version number. Example:

```typescript
module.exports = {
  "0.63": {
    "my-capability": {
      name: "my-module",
      version: "1.0.0",
    },
  },
  "0.64": {
    "my-capability": {
      name: "my-module",
      version: "1.1.0",
    },
  },
};
```

The profiles are appended to the default ones and may override capabilities.
This format is explicitly chosen to be compatible with `--vigilant`.

:::note

In `align-deps`, we've deprecated `customProfiles` in favour of `presets`. A
preset is just a collection of profiles like in the example above. This new
property allows you to specify multiple presets and/or replace the built-in
`react-native` preset. The command line flag, `--custom-profiles`, was replaced
with `--presets`.

You can read more about the changes in this RFC:
<https://github.com/microsoft/rnx-kit/blob/rfcs/text/0001-dep-check-v2.md>

:::

## Alternatives

- `peerDependencies` — What's the difference between `dep-check` and just using
  the `peerDependencies` field in `package.json`?
  - JS package managers are inconsistent when it comes to installing peer
    dependencies. npm has been
    [back](https://blog.npmjs.org/post/110924823920/npm-weekly-5.html) and
    [forth](https://github.blog/2021-02-02-npm-7-is-now-generally-available/#peer-dependencies)
    on this. Yarn only emits warnings when they are unsatisfied. The only sure
    way to get them installed is ensure that the dependencies are added
    appropriately. However, people tend to ignore warnings in our experience.
  - There is no central control over what gets added to `peerDependencies`. One
    package could add `react-native-webview`@^11.4.2, while another has
    `react-native-webview`@^10.10.2. Or worse, they could be adding them under
    `dependencies` instead, potentially causing two copies to be bundled with
    your app.
  - Similarly, package managers don't care whether you're using
    `@react-native-community/netinfo` or `react-native-netinfo`.
- [syncpack](https://github.com/JamieMason/syncpack/) — syncpack is a tool to
  manage dependencies within a monorepo. It has some overlap with `dep-check`
  but doesn't cover everything we need. In particular:
  - It doesn't have a central repository of dependencies, so it cannot align
    multiple repositories on the same packages and versions for the same set of
    capabilities.
  - From a cursory glance, it doesn't allow packages to support multiple
    versions of react-native.
  - It supports version groups, which may be useful for some usage scenarios,
    but are potentially dangerous within react-native repos.
