# @rnx-kit/build

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/build)](https://www.npmjs.com/package/@rnx-kit/build)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

An experimental tool for building your apps in the cloud.

## Requirements

- [Node.js](https://nodejs.org/en/download/) LTS 18.12 or greater

| Feature                      | Android | iOS | macOS | Windows |
| :--------------------------- | :-----: | :-: | :---: | :-----: |
| Build with Azure DevOps      |   🚧    | 🚧  |  🚧   |   🚧    |
| Build with GitHub Actions    |    ✓    |  ✓  |   ✓   |    ✓    |
| Launch in device (local)     |   ✓¹    | ✓²  |   ✓   |    ✓    |
| Launch in emulator/simulator |   ✓¹    | ✓²  |   -   |    -    |
| Launch from QR code          |    ✓    | 🚧  |   -   |    -    |

1. Requires [Android Studio](https://developer.android.com/studio)
2. Requires [Xcode](https://developer.apple.com/xcode/)

## Usage

```sh
npm run rnx-build --platform <platform>
```

### `-p`, `--platform`

Target platform to build for.

Supported platforms are `android`, `ios`, `macos`, `windows`.

### `--deploy` (optional)

Where builds should be deployed from. For how to configure your app distribution
service, please see [Distribution](#distribution).

Supported deployment methods are `remote-first`, `local-only`.

Defaults to `remote-first`.

### `--device-type` (optional)

Target device type. This is currently only implemented for iOS.

Supported device types are `device`, `emulator`, `simulator`.

Specifying `emulator`/`simulator` implies `--deploy local-only`.

Defaults to `simulator`.

### `--package-manager` (optional)

Binary name of the package manager used in the current repo.

Defaults to `npm`, `pnpm`, or `yarn` if detected.

### `--project-root` (optional)

Path to the root of the project.

Defaults to current working directory.

### `--scheme` (optional)

The workspace scheme to build (iOS and macOS only).

Defaults to `ReactTestApp`.

## Distribution

### Android: Local Deployment

In order to launch the build artifact on device, you need to install Android
Studio. Once installed, go into **Preferences** ❭ **Appearance & Behavior** ❭
**System Settings** ❭ **Android SDK**, and install **Android SDK Build-Tools**
and **Android SDK Platform-Tools**.

If you want to run apps on the Android Emulator, follow the instructions here:
[Run apps on the Android Emulator](https://developer.android.com/studio/run/emulator).

### iOS: Install Signing Certificate and Provisioning Profile

In order to launch the build artifact on device, you need to install Apple
signing certificate and provisioning profile on your host of choice.

For GitHub, please follow the steps to create the four secrets here:
[Creating secrets for your certificate and provisioning profile](https://docs.github.com/en/actions/deployment/deploying-xcode-applications/installing-an-apple-certificate-on-macos-runners-for-xcode-development#creating-secrets-for-your-certificate-and-provisioning-profile)

### Plugins

`@rnx-kit/build`'s remote app distribution is enabled by plugins. A plugin is
configured by the `rnx-kit.build.distribution` key in `package.json`. It takes a
tuplet, the module name and an options object. For instance, the Firebase plugin
may be configured like below:

```json
{
  ...
  "rnx-kit": {
    "build": {
      "distribution": [
        "@rnx-kit/build-plugin-firebase",
        {
          "appId": {
            "android": "1:1234567890:android:0a1b2c3d4e5f67890",
            "ios": "1:1234567890:android:0a1b2c3d4e5f67890"
          }
        }
      ]
    },
  }
}
```

The options object is passed to the plugin on load:

```js
import type { DistributionPlugin, Platform } from "@rnx-kit/build";

type Config = {
  appId: string | Partial<Record<Platform, string>>;
};

module.exports = (config: Partial<Config>): DistributionPlugin => {
  ...
};
```

## GitHub Actions

### Personal Access Token

To use `@rnx-kit/build` with GitHub Actions, you need to make a fine-grained
access token with the `action:write` permission. When creating a new access
token, make sure **Repository permissions** ❭ **Actions** is set to **Read and
write**. Create a JSON config file and paste in the token like below:

```json
{
  "github": {
    "token": "github_pat_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  }
}
```

Save the file in one of the following locations depending on your platform:

| Platform | Location                                                 |
| :------- | :------------------------------------------------------- |
| macOS    | `$HOME/Library/Preferences/rnx-build-nodejs/config.json` |
| Windows  | `%AppData%\Roaming\rnx-build-nodejs\config.json`         |
| Linux    | `$XDG_CONFIG_HOME/rnx-build-nodejs/config.json`          |

For how to create a personal access token, see:
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

### Actions Permissions

If your Actions permissions is restricted, you need to allow the following
actions and reusable workflows:

```
actions/cache@*,
actions/checkout@*,
actions/download-artifact@*,
actions/setup-java@*,
actions/setup-node@*,
actions/upload-artifact@*,
gradle/actions/setup-gradle@*,
microsoft/react-native-test-app/.github/actions/*,
microsoft/setup-msbuild@*,
ruby/setup-ruby@*,
```

You can find this setting under **Settings** ❭ **Code and automation** ❭
**Actions** ❭ **General**. Make sure permissions is set to **Allow enterprise,
and select non-enterprise, actions and reusable workflows**.

## Assumptions

### Folder Structure

Workflows currently assume that your project has a folder structure similar to
the one generated by `react-native init`, e.g.:

    app
    ├── android
    │   ├── gradlew
    │   └── gradlew.bat
    ├── ios
    │   └── Podfile
    ├── macos
    │   └── Podfile
    ├── windows
    │   └── App.sln
    ├── package.json
    └── src

## Contributing

If you want to help making this tool more feature complete, check out
[the project board](https://github.com/orgs/microsoft/projects/283/views/1?query=is%3Aopen+sort%3Aupdated-desc&filterQuery=-status%3A%22%E2%9C%85+Done%22+epic%3A%22RN+Build%22).
