<!--remove-block start-->

# Contributing

<!--remove-block end-->

Thank you for your interest in this project! We welcome all contributions and
suggestions!

You can
[open a new issue](https://github.com/microsoft/rnx-kit/issues/new/choose) to
report a bug, share an idea, or request a feature. If you're more hands-on, you
can [submit a pull-request](https://github.com/microsoft/rnx-kit/pulls).

As a contributor, you're expected to follow the
[code of conduct](https://github.com/microsoft/rnx-kit/blob/main/CODE_OF_CONDUCT.md).

<!--remove-block start-->

- [Contributor License Agreement](#Contributor-License-Agreement)
- [Requirements](#Requirements)
- [Build](#Build)
- [Change Logs](#Change-Logs)
- [Releases](#Releases)
- [Style Guide](#Style-Guide)

<!--remove-block end-->

## Contributor License Agreement

Most contributions require you to agree to a Contributor License Agreement (CLA)
declaring that you have the right to, and actually do, grant us the rights to
use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., status check,
comment). Simply follow the instructions provided by the bot. You will only need
to do this once across all repos using our CLA.

## Requirements

- Node LTS (see [releases](https://nodejs.org/en/about/releases/) for specific
  versions)
- [Yarn Classic](https://classic.yarnpkg.com/)

### Optional

- **Android**:
  - [Android Studio](https://developer.android.com/studio) 4.2 or later
    - Android SDK Platform 29
    - Android SDK Build-Tools 30.0.3
    - To install the required SDKs, go into **Preferences** ❭ **Appearance &
      Behavior** ❭ **System Settings** ❭ **Android SDK**.
- **iOS/macOS**:
  - [Xcode](https://apps.apple.com/app/xcode/id497799835?mt=12) 12 or later
  - [CocoaPods](https://cocoapods.org/)
- **Windows**:
  - Ensure that
    [Developer Mode](https://docs.microsoft.com/en-us/windows/uwp/get-started/enable-your-device-for-development)
    is turned on in Windows Settings app
  - Install development dependencies as described in the
    [React Native for Windows documentation](https://microsoft.github.io/react-native-windows/docs/rnw-dependencies)

## Build

We use Yarn to install npm dependencies. From the repo root, run:

```sh
yarn
```

This will also take care of building any tools that you might need. Once it's
done, you can choose to build all packages or just the packages you're
interested in.

If you want to build all packages, you should run:

```
yarn build
```

Otherwise, you can specify which package to build, e.g. `@rnx-kit/cli`:

```sh
yarn build-scope @rnx-kit/cli
```

Alternatively, you can navigate to the package folder and run:

```sh
cd packages/cli
yarn build --dependencies
```

Both the repository level `build-scope` and the package local
`build --dependencies` ensure all dependencies are built before the target
package.

Below is a table of commonly used commands and what they do depending on your
current working directory.

| Command                     | Repository Level                                      | Package Level                                       |
| :-------------------------- | :---------------------------------------------------- | :-------------------------------------------------- |
| `yarn build`                | Builds **all** packages in the repository             | Builds the **current** package only                 |
| `yarn build --dependencies` | --                                                    | Builds the **current** package and its dependencies |
| `yarn build-scope`          | Builds the **specified** package and its dependencies | --                                                  |
| `yarn format`               | Formats **all** packages in the repository            | Formats the **current** package only                |
| `yarn lint`                 | Lints **all** packages in the repository              | Lints the **current** package only                  |
| `yarn test`                 | Tests **all** packages in the repository              | Tests the **current** package only                  |

## Adding a New Package

To ensure that there is consistency and shared practices across the monorepo, we
have introduced a small script to easily allow for new packages generation.

Simply run

```sh
yarn new-package <package-name>
```

To generate a sample project for you to use; this is based on
`packages/template`. You can pass the extra flag `--experimental` to send the
package in the `incubator` folder — files will be tweaked as necessary.

## Change Logs

Each package in this monorepo contains a change log. The log is built from
change descriptions submitted with each PR.

```
$ yarn change
```

This launches [Changesets](https://github.com/atlassian/changesets#readme),
which collects and records information about your change.

Follow the prompts and describe the changes you are making to each package. This
information is written in files under `/.changeset`. Our CI loop uses these
files to bump package versions and update package change logs.

> Note that you only need one change log entry per feature/fix. You don't need
> to create new entries if you're addressing PR feedback.

## Releases

Our release process is fully automated by
[Changesets](https://github.com/atlassian/changesets#readme).

When a PR is merged, our CI loop uses `Changesets` to version-bump each changed
package and publish it to `npm`.

## Style Guide

Most files are formatted with [Prettier](https://prettier.io/). We also use
[ESLint](https://eslint.org/) to lint all JavaScript code.

You can trigger formatting by running `yarn format`, and linting with
`yarn lint`.
