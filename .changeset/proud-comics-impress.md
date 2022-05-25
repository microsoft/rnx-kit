---
"@rnx-kit/cli": minor
---

## Breaking Changes

### Only search for rnx-kit configuration in package.json

We no longer search for config in places like rnx-kit.config.js (e.g. no more
`cosmiconfig`).

**Why this change?** In all the places we use rnx-kit internally, no one is
using this mechanism. Further, in external forums, there have been general
complaints about JS devs having to manage too many config files -- package.json
is the preferred "single source". In light of this, it didn't seem worthwhile to
continue carrying `comsmiconfig` as a dependency.

### Align property names with @react-native-community/cli

Add, rename, and remove properties in @rnx-kit/config to fully align with the
well-known names used in @react-native-community/cli. This change will ripple
outward to @rnx-kit/cli as well.

In doing this, we'll be making it easier for developers to migrate to using our
config/cli combination, and our cli will become a "drop in" replacement
@react-native-community/cli. The longer-term goal is to upstream our work into
the community CLI, but until it is proven and accepted, we will continue to
maintain our wrapper commands.

Add:

- bundleOutput

Remove:

- distPath

Rename:

- entryPath -> entryFile
- sourceMapPath -> sourcemapOutput
- sourceMapSourcesRootPath -> sourcemapSourcesRoot
- assetsPath -> assetsDest

### Add migration error messages

When developers take this breaking change, they will need to update their config
files and code to use the new property names. To help with this, we are adding
logic to detect use of _old_ property names, and report detailed failure
messages. This should assist with rooting out anything that might have been
overlooked.

### Server config derived from bundle config

When server config is not present, and bundle config is, server config will now
be derived from bundle config. Properties common to both, such as
`detectCyclicDependencies` and `treeShake`, will be carried over from bundle
config.

This is a convenience, and will help devs avoid duplicating config between
bundle and server props.

### Remove deprecated `experimental_treeShake`

Remove support for a previously deprecated property `experimental_treeShake`. It
has since been replaced with `treeShake`.

### Remove defaults from @rnx-kit/config

The defaults will still be the same, but they are moving to @rnx-kit/cli where
they can be conditionally defined based on variables like the current platform.
This is needed for `bundleOutput`. As a result, all config props are now marked
as optional.

### getKitConfig(), getBundleDefinition(), getServerConfig() throw errors

These functions now validate input and fail with thrown exceptions. The
exception message explains what went wrong so developers can easily diagnose
errors.

## Non-breaking Changes

### Add fine-grained control for typescriptValidation

Give developers fine-grained control over how TypeScript validation behaves.
