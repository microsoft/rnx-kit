<!--remove-block start-->

# @rnx-kit/tools-workspaces

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-workspaces)](https://www.npmjs.com/package/@rnx-kit/tools-workspaces)

<!--remove-block end-->

`@rnx-kit/tools-workspaces` is a collection of tools for working with
workspaces.

It currently supports:

- [Lerna](https://lerna.js.org/docs/configuration)
- [npm](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [pnpm](https://pnpm.io/pnpm-workspace_yaml)
- [Rush](https://rushjs.io/pages/configs/rush_json/)
- [Yarn](https://yarnpkg.com/configuration/manifest#workspaces)

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Function                      | Description                                                                      |
| -------- | ----------------------------- | -------------------------------------------------------------------------------- |
| -        | `findWorkspacePackages()`     | Returns a list of all packages declared under workspaces.                        |
| -        | `findWorkspacePackagesSync()` | Returns a list of all packages declared under workspaces synchronously.          |
| -        | `findWorkspaceRoot()`         | Returns the root of the workspace; `undefined` if not a workspace.               |
| -        | `findWorkspaceRootSync()`     | Returns the root of the workspace synchronously; `undefined` if not a workspace. |

<!-- @rnx-kit/api end -->
