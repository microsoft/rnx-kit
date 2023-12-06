# Contributing

Thank you for your interest in this project! We welcome all contributions and
suggestions!

You can [open a new issue][] to report a bug, share an idea, or request a
feature. If you're more hands-on, you can [submit a pull request][].

As a contributor, you're expected to follow the [code of conduct][].

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
  - [Android Studio](https://developer.android.com/studio)
    - Android SDK Platform 34
    - Android SDK Build-Tools 33.0.1
    - To install the required SDKs, go into **Preferences** ❭ **Appearance &
      Behavior** ❭ **System Settings** ❭ **Android SDK**.
- **iOS/macOS**:
  - [Xcode](https://apps.apple.com/app/xcode/id497799835)
  - [CocoaPods](https://cocoapods.org/)
- **Windows**:
  - Ensure that [Developer Mode][] is turned on in Windows Settings app
  - Install development dependencies as described in the [React Native for
    Windows documentation][]

## Build

We use Yarn to install npm dependencies. From the repo root, run:

```sh
yarn
```

Once it's done, you can choose to build all packages or just the packages you're
interested in.

If you want to build all packages, run the following command at the root:

```sh
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

## Style Guide

Most files are formatted with [Prettier][]. We also use [ESLint][] to lint all
JavaScript code.

You can trigger formatting by running `yarn format`, and linting with
`yarn lint`.

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

```sh
yarn change
```

This launches [Changesets][], which collects and records information about your
change.

Follow the prompts and describe the changes you are making to each package. This
information is written in files under `/.changeset`. Our CI loop uses these
files to bump package versions and update package change logs.

> [!NOTE]
>
> You only need one change log entry per feature/fix. You don't need to create
> new entries if you're addressing PR feedback.

## Releases

Our release process is fully automated by [Changesets][].

When a PR is merged, our CI loop uses Changesets to version-bump each changed
package and publish it to npm.

## General Maintenance

We use [Renovate][] to keep dependencies up to date. They are currently
scheduled to run [every Monday morning][]. You can also manually trigger updates
via the [Dependency Dashboard][].

### Direct Dependencies

- **Patch bumps:** As long as the CI is green, these should be good to merge
  without having to touch `package.json`. The only thing to watch out for is
  whether duplicates are introduced in `yarn.lock`:
  - Sometimes, running `yarn dedupe` is enough to get rid of duplicates.
  - Other times, we have to look at the dependency chain and dedupe by bumping
    one of the dependees.
  - As a last resort, and only if one of the dependees are using an
    unnecessarily strict version range, we can add a `resolutions` entry in
    `package.json`.
- **Minor bumps:** Semantically, minor bumps should only include additions and
  not break anything. Check the change log to be sure. Otherwise, see the notes
  on patch bumps.
- **Major bumps:** In general, we only do major bumps manually. This is to
  ensure that we aren't unnecessarily adding more dependencies on the consumer
  side or make things more complicated to maintain. An example of us holding
  back is [`chalk`][]; we are stuck on 4.x until `@react-native-community/cli`
  migrates to ESM.

### Development Dependencies

Consumers never see these so we can be less conservative, especially when it
comes to major bumps. Otherwise, everything mentioned above still applies.

### Android Dependencies:

Always check the change log for potentially breaking changes as they typically
do not follow semantic versioning. In particular, be on the lookout for changes
to:

- Minimum target version
- Android SDK version
- Kotlin version

If the bump contains potentially breaking changes, consider whether we need to
gate them behind a version check. For example, we only use
`androidx.activity:activity-ktx:1.17.2` when on Kotlin 1.8 or higher
([see `build.gradle`](https://github.com/microsoft/rnx-kit/blob/%40rnx-kit/react-native-test-app-msal%402.1.7/incubator/react-native-test-app-msal/android/build.gradle#L173)).

<!-- References -->

[Changesets]: https://github.com/atlassian/changesets#readme
[Dependency Dashboard]: https://github.com/microsoft/rnx-kit/issues/1680
[Developer Mode]:
  https://docs.microsoft.com/en-us/windows/uwp/get-started/enable-your-device-for-development
[ESLint]: https://eslint.org
[Prettier]: https://prettier.io
[React Native for Windows documentation]:
  https://microsoft.github.io/react-native-windows/docs/rnw-dependencies
[Renovate]: https://docs.renovatebot.com
[`chalk`]: https://github.com/chalk/chalk#readme
[code of conduct]:
  https://github.com/microsoft/rnx-kit/blob/main/CODE_OF_CONDUCT.md
[every Monday morning]:
  https://github.com/microsoft/rnx-kit/blob/main/.github/renovate.json
[open a new issue]: https://github.com/microsoft/rnx-kit/issues/new/choose
[submit a pull request]: https://github.com/microsoft/rnx-kit/pulls
