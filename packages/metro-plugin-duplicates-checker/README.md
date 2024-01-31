# @rnx-kit/metro-plugin-duplicates-checker

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-plugin-duplicates-checker)](https://www.npmjs.com/package/@rnx-kit/metro-plugin-duplicates-checker)

`@rnx-kit/metro-plugin-duplicates-checker` checks for duplicate packages in your
bundle.

## Usage

There are several ways to use this package.

The **recommended** way is to add it as a plugin in your `metro.config.js` using
`@rnx-kit/metro-serializer`:

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
+const {
+  DuplicateDependencies,
+} = require("@rnx-kit/metro-plugin-duplicates-checker");
+const { MetroSerializer } = require("@rnx-kit/metro-serializer");

 module.exports = makeMetroConfig({
   serializer: {
+    customSerializer: MetroSerializer([DuplicateDependencies()]),
   },
 });
```

You can also check for duplicate packages after a bundle is created:

```js
const {
  checkForDuplicatePackagesInFile,
} = require("@rnx-kit/metro-plugin-duplicates-checker");

checkForDuplicatePackagesInFile(pathToSourceMapFile, {
  ignoredModules: [],
  bannedModules: [],
});
```

If you have a source map object, you can pass that directly to
`checkForDuplicatePackages()`:

```js
const {
  checkForDuplicatePackages,
} = require("@rnx-kit/metro-plugin-duplicates-checker");

checkForDuplicatePackages(mySourceMap, {
  ignoredModules: [],
  bannedModules: [],
});
```

## Options

| Key            | Type     | Default | Description                                 |
| :------------- | :------- | :------ | :------------------------------------------ |
| bannedModules  | string[] | `[]`    | List of modules that are banned.            |
| ignoredModules | string[] | `[]`    | List of modules that can be ignored.        |
| throwOnError   | boolean  | `true`  | Whether to throw when duplicates are found. |

## Resolving Duplicates

So you have duplicates in your bundle, now what? Depending on your specific
needs, we have several options.

Let's use a specific example:

```
error @fluentui-react-native/text (found 2 copies)
warn   0.21.14 /~/node_modules/@fluentui-react-native/text
warn   0.22.7 /~/node_modules/@fluentui-react-native/link/node_modules/@fluentui-react-native/text
```

This one occurs because `@fluentui-react-native/link` declares a dependency on
`@fluentui-react-native/text` using a wide version range, `>=0.21.14 <1.0.0`.

Our project depends on `@fluentui-react-native/text@^0.21.14`, but package
managers will typically still try to resolve `>=0.21.14 <1.0.0` instead of using
the existing resolution. This results in the duplicate error we see above.

From here, we have several options:

- [Manual Dedupe](#manual-dedupe)
- [Using Tools](#using-tools)
- [Help Metro Resolve Correct Version](#help-metro-resolve-correct-version)
- [Last Resort: Force Resolution](#last-resort-force-resolution)

### Manual Dedupe

This method is error-prone, especially if you have a lot of duplicates. It works
if you have very few entries. It varies a lot depending on the package manager
you're using.

The project in our example uses Yarn Classic: Open `yarn.lock` and look for
`@fluentui-react-native/text`:

```yaml
"@fluentui-react-native/text@0.21.14", "@fluentui-react-native/text@^0.21.14":
  version "0.21.14"
  resolved "https://registry.yarnpkg.com/@fluentui-react-native/text/-/text-0.21.14.tgz#04918a9558770ec551cbdac87ca1534bfccaeffb"
  integrity sha1-BJGKlVh3DsVRy9rIfKFTS/zK7/s=
  dependencies:
    "@fluentui-react-native/adapters" ">=0.11.3 <1.0.0"
    "@fluentui-react-native/framework" "0.11.10"
    "@fluentui-react-native/interactive-hooks" ">=0.24.12 <1.0.0"
    "@fluentui-react-native/theme-tokens" ">=0.25.4 <1.0.0"
    "@fluentui-react-native/tokens" ">=0.21.6 <1.0.0"
    "@uifabricshared/foundation-compose" "^1.14.12"
    tslib "^2.3.1"

"@fluentui-react-native/text@>=0.21.14 <1.0.0":
  version "0.22.7"
  resolved "https://registry.yarnpkg.com/@fluentui-react-native/text/-/text-0.22.7.tgz#bd11768d3cd69337ad2ec4be76ee88d6749ca24f"
  integrity sha1-vRF2jTzWkzetLsS+du6I1nScok8=
  dependencies:
    "@fluentui-react-native/adapters" ">=0.12.0 <1.0.0"
    "@fluentui-react-native/framework" "0.13.6"
    "@fluentui-react-native/interactive-hooks" ">=0.25.7 <1.0.0"
    "@fluentui-react-native/theme-tokens" ">=0.26.5 <1.0.0"
    "@fluentui-react-native/tokens" ">=0.22.5 <1.0.0"
    "@uifabricshared/foundation-compose" "^1.14.20"
    tslib "^2.3.1"
```

We can see there are two entries, one being resolved to 0.21.14 and the other to
0.22.7. In this case, since we want to keep 0.21.x and the version ranges just
happens to be satisfied by this. We can merge the two entries like below:

```yaml
"@fluentui-react-native/text@0.21.14", "@fluentui-react-native/text@>=0.21.14 <1.0.0", "@fluentui-react-native/text@^0.21.14":
  version "0.21.14"
  resolved "https://registry.yarnpkg.com/@fluentui-react-native/text/-/text-0.21.14.tgz#04918a9558770ec551cbdac87ca1534bfccaeffb"
  integrity sha1-BJGKlVh3DsVRy9rIfKFTS/zK7/s=
  dependencies:
    "@fluentui-react-native/adapters" ">=0.11.3 <1.0.0"
    "@fluentui-react-native/framework" "0.11.10"
    "@fluentui-react-native/interactive-hooks" ">=0.24.12 <1.0.0"
    "@fluentui-react-native/theme-tokens" ">=0.25.4 <1.0.0"
    "@fluentui-react-native/tokens" ">=0.21.6 <1.0.0"
    "@uifabricshared/foundation-compose" "^1.14.12"
    tslib "^2.3.1"
```

Now we should only have one copy of `@fluentui-react-native/text`.

Our example is relatively simple. Sometimes you have to go further up the
dependency chain and dedupe dependees.

Fortunately, we can use tools in most cases.

### Using Tools

If you're using Yarn Classic, there is a tool, [`yarn-deduplicate`][], for
deduplicating everything in `yarn.lock`. You can run it like so:

```sh
npx yarn-deduplicate
```

By default, it will try to dedupe to the highest version. In our example,
however, we want to keep using 0.21.x. We should also limit the number of
packages that get deduped to make it easier to review later. `yarn-deduplicate`
provides many options, but we'll be using the `fewer` strategy and the
`--scopes` flag to only target `@fluentui-react-native` packages:

```sh
npx yarn-deduplicate --strategy fewer --scopes @fluentui-react-native
```

You can read more about `yarn-deduplicate` and available options here:
https://github.com/scinos/yarn-deduplicate#readme

If you're using modern Yarn or other package managers, check out their built-in
dedupe command:

- **Yarn:** https://yarnpkg.com/cli/dedupe
- **npm:** https://docs.npmjs.com/cli/commands/npm-dedupe
- **pnpm:** https://pnpm.io/cli/dedupe

### Help Metro Resolve Correct Version

If, for some reason, you cannot dedupe the package, you can instead configure
Metro to resolve the correct version by telling it which version to use (with
[`resolver.extraNodeModules`][]) and blocking every other copy (with
[`resolver.blockList`][]):

```js
module.exports = {
  resolver: {
    extraNodeModules: {
      "@fluentui-react-native/text":
        "/~/my-project/node_modules/@fluentui-react-native/text",
    },
    blockList: [
      /(?<!\/~\/my-project)\/node_modules\/@fluentui-react-native\/text\/.*/,
    ],
  },
};
```

You don't have to write these entries manually. We have helper functions in
[`@rnx-kit/metro-config`][] for generating them dynamically.

### Last Resort: Force Resolution

As a last resort, if everything else fails, you can manually override package
resolutions. We don't recommend this solution because it forces a single version
in all workspaces. For example, if you have two projects that have nothing to do
with each other, they will both be forced to use the same version even though
they could be using different versions. It also adds maintenance overhead
because you will have to manually update the version as dependees update theirs.

If you've decided that you have no other options, you can find the appropriate
documentation for your package manager below:

- **Yarn:** https://yarnpkg.com/configuration/manifest#resolutions
- **npm:** https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides
- **pnpm:** https://pnpm.io/package_json#pnpmoverrides

<!-- References -->

[`@rnx-kit/metro-config`]:
  https://github.com/microsoft/rnx-kit/blob/main/packages/metro-config/README.md#ensuring-a-single-instance-of-a-package
[`resolver.blockList`]: https://metrobundler.dev/docs/configuration/#blocklist
[`resolver.extraNodeModules`]:
  https://metrobundler.dev/docs/configuration/#extranodemodules
[`yarn-deduplicate`]: https://github.com/scinos/yarn-deduplicate
