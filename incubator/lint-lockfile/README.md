# @rnx-kit/lint-lockfile

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/lint-lockfile)](https://www.npmjs.com/package/@rnx-kit/lint-lockfile)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

`@rnx-kit/lint-lockfile` is a standalone tool for scanning your lockfiles for
potential issues.

Supported lockfile formats:

- [Yarn v1](https://classic.yarnpkg.com/en/docs/yarn-lock)
- [Yarn v2+](https://yarnpkg.com/advanced/changelog#200)

## Installation

```sh
yarn add @rnx-kit/lint-lockfile --dev
```

## Usage

```sh
yarn lint-lockfile
```

## Configuration

`@rnx-kit/lint-lockfile` can be configured in your root `package.json` file. For
example:

```ts
{
  "rnx-kit": {
    "lint": {
      "lockfile": {
        "noDuplicates": {
          "enabled": true, // enabled by default
          "packages": [
            "react",
            "react-native"
          ]
        },
        "noWorkspacePackageFromNpm": {
          "enabled": true // enabled by default
        }
      }
    }
  }
}
```

## Rules

### `noDuplicates`

This rule checks for duplicate packages in the lockfile. It must be configured
to check for specific packages. For example, to check for duplicates of React
and React Native, configure it like this:

```ts
{
  "rnx-kit": {
    "lint": {
      "lockfile": {
        "noDuplicates": {
          "packages": [
            "react",
            "react-native"
          ]
        }
      }
    }
  }
}
```

You can allow multiple copies of a package by specifying a max count:

```ts
{
  "rnx-kit": {
    "lint": {
      "lockfile": {
        "noDuplicates": {
          "packages": [
            "react-native",
            ["react", 2], // allow up to 2 copies of `react`
            ["left-pad", 0] // disallow `left-pad` entirely
          ]
        }
      }
    }
  }
}
```

This rule also has a built-in preset for React Native. You can enable it with
`#react-native`:

```ts
{
  "rnx-kit": {
    "lint": {
      "lockfile": {
        "noDuplicates": {
          "packages": [
            "#react-native"
          ]
        }
      }
    }
  }
}
```

### `noWorkspacePackageFromNpm`

This rule checks for workspace packages that are unintentionally installed from
npm. It is enabled by default, but can be disabled like this:

```ts
{
  "rnx-kit": {
    "lint": {
      "lockfile": {
        "noWorkspacePackageFromNpm": {
          "enabled": false
        }
      }
    }
  }
}
```
