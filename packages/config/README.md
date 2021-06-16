# @rnx-kit/config

A package for configuring and extracting configuration information about
rnx-kits.

This is designed to be part of the tooling pipeline, thus it runs in the node
environment.

## `getKitConfig([options]): KitConfig | null`

This is the core routine to retrieve information about an rnx-kit. By default
this will load information about the current package. It will look for kit
information in the current working directory using `cosmiconfig` to match either
rnx-kit.config.js, a "rnx-kit" section of package.json, or any of the other
standard ways of supplying configuration.

### Additional Options

The routine can also be configured with the following options:

| Option   | Description                                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `module` | Name of a module to look up kit information for. Note that this will be loaded via require, which means it needs to be a visible dependency of some sort. |
| `cwd`    | Do the lookup from the specified working directory                                                                                                        |

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
