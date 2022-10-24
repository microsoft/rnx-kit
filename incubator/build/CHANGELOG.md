# @rnx-kit/build

## 0.4.1

### Patch Changes

- d5a54c2f: GitHub Actions: `set-output` is deprecated

## 0.4.0

### Minor Changes

- 8f66b73b: Firebase: Authenticating with `--token` is deprecated. A service account is now required for authentication.

## 0.3.3

### Patch Changes

- 74306a4b: Move some build scripts to a separate file so they can be shared
- ddb143ff: Disable sanitizers via `xcodebuild` build settings

## 0.3.2

### Patch Changes

- 95f54070: Increased timeout waiting for Android emulator to boot

## 0.3.1

### Patch Changes

- f495c8af: Added support for Apple M1

## 0.3.0

### Minor Changes

- cca36af2: Implemented plugin system for app distribution

### Patch Changes

- a99b7969: Added support for distributing builds via [Firebase App Distribution](https://firebase.google.com/products/app-distribution)

## 0.2.0

### Minor Changes

- fb757de1: Moved config file into OS-specific path for config files

### Patch Changes

- 1caac7c1: Properly handle multiple GitHub jobs
- deb82d84: Added support for other package managers

## 0.1.3

### Patch Changes

- f9ba2aa5: Added `scheme` as build parameter

## 0.1.2

### Patch Changes

- 004cc058: Ensure clean-up only happens once
- d55fe9bd: Android: Fixed build-tools version selection

## 0.1.1

### Patch Changes

- 565b3082: iOS: Prompt user for device rather than failing
- bbd004e5: Use bsdtar to extract ZIP files. Note that if we're inside Git Bash shell on Windows, we should use UnZip instead as GNU Tar does not support ZIP.
- 76b6fb70: Windows: Replace Windows 11 only solution with proper code signing
- ddb7f40f: iOS: Added ability to launch on device
- 8e619211: Added elapsed time to remote build job, and reduced job polling frequency to avoid hitting the hourly rate limit.
- aa0a4fcd: Better handling of multiple attached Android devices
- 80614647: Error on unknown arguments
- b4af4f6b: Improved handling of iOS device selection. Builds for physical devices differ from simulator ones, meaning we should pick the right device when deploying the app. Note that this does not quite add the capability to deploy to physical devices just yet. We still need to figure out how to deal with developer certificates.

  This change also fixes an issue with corrupted artifacts.

## 0.1.0

### Minor Changes

- 9341c417: @rnx-kit/build builds your app in the cloud

### Patch Changes

- 01e91b07: Added macOS support
- 9d80be8c: Cancel remote job when user terminates
- 3fe939f7: Prompt the user to add the workflow file
- 01e91b07: Added Windows support
