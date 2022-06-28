# @rnx-kit/build

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/build)](https://www.npmjs.com/package/@rnx-kit/build)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

An experimental tool for building your apps in the cloud.

## Requirements

🚧 TODO: Reduce the number of requirements

- GitHub hosted repository
- [Node.js](https://nodejs.org/en/download/) LTS 14.15 or greater

| Feature                      | Android | iOS | macOS | Windows |
| :--------------------------- | :-----: | :-: | :---: | :-----: |
| Remote build                 |    ✓    |  ✓  |   ✓   |    ✓    |
| Launch in device             |   ✓¹    | 🚧² |   ✓   |    ✓    |
| Launch in emulator/simulator |   ✓¹    | ✓²  |   -   |    -    |
| Launch from QR code          |   🚧    | 🚧  |   -   |    -    |

1. Requires [Android Studio](https://developer.android.com/studio)
2. Requires [Xcode](https://developer.apple.com/xcode/)

## Usage

🚧 TODO: Not quite ready for general consumption

```sh
npm run rnx-build --platform <platform>
```

| Flag           | Description                                                             |
| :------------- | :---------------------------------------------------------------------- |
| -p, --platform | Supported platforms are `android`, `ios`, `macos`, `windows`            |
| --device-type  | [Optional] Supported device types are `device`, `emulator`, `simulator` |
| --project-root | [Optional] Path to the root of the project                              |

## Contributors' Notes

### TODO

- [x] Figure out how to push/restore local Git state
- [x] Figure out how to trigger workflow
- [x] Figure out how to fetch job state
- [x] Figure out how to push artifacts
  - [x] Android
  - [x] iOS
  - [x] macOS
  - [x] Windows
- [x] Figure out how to download artifacts
- [ ] Figure out how to install artifacts
  - [x] Android emulator
  - [x] Android device
  - [x] iOS simulator
  - [ ] iOS device (need to figure out how to sign on CI)
    - https://docs.github.com/en/actions/deployment/deploying-xcode-applications/installing-an-apple-certificate-on-macos-runners-for-xcode-development
  - [x] macOS
  - [x] Windows
- [x] Miscellaneous cleanup
  - [x] Implement proper CLI
  - [x] Download build artifacts to platform specific folders
  - [x] iOS: Detect workspace to build
- [x] Cancel build job when user ctrl+c in the terminal
- [x] Add `init` or `install` command to copy the correct workflow file to
      user's repo
- [x] Replace yauzl with something more native
- [x] Windows: Install currently only works on Windows 11, we need to support 10
- [ ] Build artifacts are currently hard-coded to look for ReactTestApp
- [ ] Verify downloaded build artifacts using checksum
- [ ] Figure out appropriate storage for auth tokens
- [ ] Figure out how to install artifacts with QR code
- [ ] Figure out caching
- [ ] Figure out how to skip native build when cached
