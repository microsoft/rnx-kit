---
"@rnx-kit/config": none
---

## Breaking Changes

### Schema: align property names with @react-native-community/cli

Add, rename, and remove properties in @rnx-kit/config to fully align with the
well-known names used in @react-native-community/cli. This change will ripple
outward to @rnx-kit/cli as well.

In doing this, we'll be making it easier for developers to migrate to using our
config/cli combination, and our cli will become a "drop in" replacement
@react-native-community/cli. The longer-term goal is to upstream our work into
the community CLI, but until it is proven and accepted, we will continue to
maintain our wrapper commands.

To assist with this change, we detect the use of _old_ property names, and
report detailed failure messages. This will highlight app config that needs to
be updated (which seems better than silently ignoring it).

Add:

- bundleOutput

Remove:

- distPath

Rename:

- entryPath -> entryFile
- sourceMapPath -> sourcemapOutput
- sourceMapSourcesRootPath -> sourcemapSourcesRoot
- assetsPath -> assetsDest

### getKitConfig(): only search for rnx-kit configuration in package.json

We no longer search for config in places like rnx-kit.config.js (e.g. no more
`cosmiconfig`).

**Why this change?** In all the places we use rnx-kit internally, no one is
using this mechanism. Further, in external forums, there have been general
complaints from JS devs about having too many config files -- package.json is
the preferred "single source". In light of this, it didn't seem worthwhile to
continue carrying `comsmiconfig` as a dependency.

### getBundleDefinition() -> getBundleConfig()

Now takes rnx-kit configuration as input, and outputs a bundle configuration
(which has changed in this release).

No longer provides default values. Returns only what is in configuration.
Defaults have moved into the CLI, which is our opinionated view of how config
should be interpreted.

Drops support for a previously deprecated property `experimental_treeShake`,
which has since been replaced with `treeShake`.

### getBundlePlatformDefinition() -> getPlatformBundleConfig()

Now requires a bundle configuration as input, and outputs a platform-specific
bundle configuration.

No longer provides default values. Returns only what is in configuration.
Defaults have moved into the CLI, which is our opinionated view of how config
should be interpreted.

### getServerConfig()

No longer provides default values. Returns only what is in configuration.
Defaults have moved into the CLI, which is our opinionated view of how config
should be interpreted.

## Non-breaking Changes

### Add fine-grained control for typescriptValidation

Give developers fine-grained control over how TypeScript validation behaves.
