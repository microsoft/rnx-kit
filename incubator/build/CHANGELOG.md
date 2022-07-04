# @rnx-kit/build

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
