# @rnx-kit/tools-workspaces

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-workspaces)](https://www.npmjs.com/package/@rnx-kit/tools-workspaces)

`@rnx-kit/tools-workspaces` is a collection of tools for working with
workspaces.

It currently supports:

- [Bun](https://bun.sh/)
- [Lerna](https://lerna.js.org/docs/configuration)
- [npm](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [pnpm](https://pnpm.io/pnpm-workspace_yaml)
- [Rush](https://rushjs.io/pages/configs/rush_json/)
- [Yarn](https://yarnpkg.com/configuration/manifest#workspaces)

This also contains a submodule that can be referenced via
`import { ... } from "@rnx-kit/tools-workspaces/external"` that adds the concept
of external workspaces. This concept is really for large scale monorepos that
may contain multiple yarn projects within them. For more information see the
information in `@rnx-kit/yarn-plugin-external-workspaces`.

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Type Name                | Description                                                                                                                                                                                                                                                                           |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| types    | DefinitionFinder         | Signature of the function to retrieve information about a given package. If the configuration setting routes to a .js or .cjs file instead of .json, the default export should be a function of this signature.                                                                       |
| types    | ExternalDeps             | Format of the config file in JSON format, this is a set of package definitions where the keys are the package names. E.g.: { "my-package": { "path": "./path/to/my-package", "version": "1.2.3" }, "my-other-package": { "path": "./path/to/my-other-package", "version": "1.2.3" } } |
| types    | ExternalWorkspacesConfig | Full configuration options for external workspaces. Stored in the root package.json under the "external-workspaces" key.                                                                                                                                                              |
| types    | PackageDefinition        | Data needed to resolve an external package.                                                                                                                                                                                                                                           |
| types    | TraceFunc                | Trace function used to log messages if logging is enabled. If logOnly is set to true, the message will only be written to the log file and not to the console. In essence log files are equivalent to verbose mode.                                                                   |
| types    | WorkspacesInfo           | Helper interface that caches results in-between calls and can test if a package is in the workspace without having to load all the packages (in most cases)                                                                                                                           |

| Category | Function                                                       | Description                                                                                                                                                                                                |
| -------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| find     | `findWorkspacePackages()`                                      | Returns a list of all packages declared under workspaces.                                                                                                                                                  |
| find     | `findWorkspacePackagesSync()`                                  | Returns a list of all packages declared under workspaces synchronously.                                                                                                                                    |
| find     | `findWorkspaceRoot()`                                          | Returns the root of the workspace; `undefined` if not a workspace.                                                                                                                                         |
| find     | `findWorkspaceRootSync()`                                      | Returns the root of the workspace synchronously; `undefined` if not a workspace.                                                                                                                           |
| finder   | `loadExternalDeps(externalDependencies, cwd, trace)`           | Create a definition finder from the specified config file. This lookup will include checking whether it is a local package or not, making sure the paths are absolute, and caching results for efficiency. |
| output   | `writeOutWorkspaces(workspaces, outputPath, checkOnly, trace)` | Output the current workspaces to a file if they the file needs to be updated                                                                                                                               |
| settings | `getExternalWorkspacesSettings(rootPath, defaultToConsole)`    | Load the settings for the current repo from the root package.json                                                                                                                                          |

<!-- @rnx-kit/api end -->
