# @rnx-kit/tools-git

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-git)](https://www.npmjs.com/package/@rnx-kit/tools-git)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A collection of functions for common Git operations.

## Installation

```sh
yarn add @rnx-kit/tools-git --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-git
```

## Usage

```typescript
import { getBaseCommit, getChangedFiles } from "@rnx-kit/tools-git";

const baseCommit = getBaseCommit("origin/main");
if (baseCommit) {
  for (const file of getChangedFiles(baseCommit)) {
    // ...
  }
}
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Function                                | Description                                                 |
| -------- | --------------------------------------- | ----------------------------------------------------------- |
| branch   | `getBaseCommit(targetBranch, fallback)` | Returns the commit that the current branch forked off.      |
| branch   | `getDefaultBranch(fallback)`            | Returns the default branch for the current repository.      |
| diff     | `getChangedFiles(since)`                | Returns all files that changed since a given branch/commit. |
| git      | `git(...args)`                          | Executes `git` with specified arguments.                    |
| ref      | `verifyRef(ref)`                        | Returns whether the specified reference name is valid.      |

<!-- @rnx-kit/api end -->
