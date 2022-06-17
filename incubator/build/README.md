# @rnx-kit/build

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/build)](https://www.npmjs.com/package/@rnx-kit/build)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

An experimental tool for building your native apps in the cloud.

## Requirements

🚧 TODO: Reduce the number of requirements

- GitHub hosted repository
- [Android Studio](https://developer.android.com/studio)
- [Node.js](https://nodejs.org/en/download/) LTS 14.15 or greater
- [Xcode](https://developer.apple.com/xcode/)

## Usage

🚧 TODO: Not quite ready for general consumption

At the moment, running these two commands should trigger an iOS build, install
it in a simulator, and launch the app.

```sh
yarn build
yarn rnx-build
```

## Contributors' Notes

### TODO

- [x] Figure out how to push/restore local Git state
- [x] Figure out how to trigger workflow
- [x] Figure out how to fetch job state
- [x] Figure out how to push artifacts
  - [x] Android
  - [x] iOS
- [x] Figure out how to download artifacts
  - [x] Android
  - [x] iOS
- [ ] Figure out how to install artifacts
  - [x] Android emulator
  - [ ] Android device
  - [x] iOS simulator
  - [ ] iOS device
- [ ] Miscellaneous cleanup
  - [ ] Implement proper CLI
  - [ ] Download build artifacts to a platform specific folder
  - [ ] iOS: Detect workspace to build
- [ ] Figure out caching
- [ ] Figure out how to skip native build when cached
- [ ] Implement support for macOS
- [ ] Implement support for Windows

### Open Questions

- Can we avoid depending on Android SDK?
- Can we avoid depending on Xcode?
