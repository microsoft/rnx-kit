# @rnx-kit/yarn-plugin-dynamic-extensions

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-dynamic-extensions)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-dynamic-extensions)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This is a Yarn plugin that lets you extend the package definitions of your
dependencies, similar to [`packageExtensions`][], but dynamically.

## Motivation

Making sure a large number of packages are using the same version of
dependencies, like `eslint` or `typescript`, can involve a lot of manual work.
It is easy to make mistakes, especially if these packages span across multiple
repositories.

This plugin allows you to manage all dependencies across multiple repositories
from a central location.

## Installation

```sh
yarn plugin import https://raw.githubusercontent.com/microsoft/rnx-kit/main/incubator/yarn-plugin-dynamic-extensions/index.js
```

## Usage

Create a module that will return package extensions. In the following example,
we create a module that adds `typescript` to all packages:

```js
/**
 * @param {Object} workspace           The package currently being processed
 * @param {string} workspace.cwd       Path of the current package
 * @param {Object} workspace.manifest  The content of `package.json`
 * @returns {{
 *   dependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 *   peerDependenciesMeta?: Record<string, { optional?: boolean }>;
 * }}
 */
export default function ({ cwd, manifest }) {
  return {
    dependencies: {
      typescript: "^5.0.0",
    },
  };
}
```

The function will receive context on the currently processed package, and is
expected to return a map similar to the one for [`packageExtensions`][].

For a more complete example, take a look at how we use it in
[`rnx-kit`](https://github.com/microsoft/rnx-kit/blob/main/scripts/dependencies.config.js).

Add the configuration in your `.yarnrc.yml`:

```yaml
dynamicPackageExtensions: ./my-dependencies.config.js
```

If you run `yarn install` now, Yarn will install `typescript` in all your
packages. To verify, try running `tsc`:

```
% yarn tsc --version
Version 5.7.3
```

Other Yarn commands will also work as if you had installed dependencies
explicitly as you normally would. For example, `yarn why`:

```
% yarn why typescript
└─ @rnx-kit/yarn-plugin-dynamic-extensions@workspace:incubator/yarn-plugin-dynamic-extensions
   └─ typescript@npm:5.7.3 (via npm:^5.0.0)
```

<!-- References -->

[`packageExtensions`]:
  https://yarnpkg.com/configuration/yarnrc#packageExtensions
