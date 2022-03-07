# config

Define and query information about a `kit` package.

This is designed to be part of the tooling pipeline, so it assumes it is running
in a node environment.

## `getKitConfig([options]): KitConfig | null`

Read configuration data for a `kit` package.

| Option   | Description                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `module` | Module name of the `kit` package. The module is located via `require.resolve`, which means it needs to be a visible dependency of some sort. |
| `cwd`    | Path to the `kit` package, or a directory within it.                                                                                         |

The `kit` package is located via `options.module`, `options.cwd`, or the current
working directory (in that order). The location is then used as a starting-point
for a `cosmiconfig` search using the key **"rnx-kit"**. `cosmiconfig` will match
either `rnx-kit.config.js`, an "rnx-kit" section of `package.json`, or any of
the other
[standard ways of supplying configuration](https://github.com/davidtheclark/cosmiconfig#cosmiconfig).

## Future Work

This package is a work in progress. Future work may include:

- Dependency gathering, both deep and direct. Required for platform bundling in
  both dynamic metro configs as well as the babel transform. For performance
  (and flexibility) the platform bundling step should produce generated output
  to track the explicit list included.
- Definitions of how a platform bundle was produced, including where a shipped
  version can be found.
- Configuration of how a platform bundle should be consumed
- Platform masking of configurations, likely needed for specialized out of tree
  platform handling in metro configs
- Special handling instructions for bundling
- Special handling instructions for testing
