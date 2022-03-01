# patch-rnmacos

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/patch-rnmacos)](https://www.npmjs.com/package/@rnx-kit/patch-rnmacos)

🚧🚧🚧🚧🚧

_This tool is still incomplete - please refer
[to this issue](https://github.com/microsoft/rnx-kit/issues/1156) for the list
of wanted improvements._

🚧🚧🚧🚧🚧

### Context

This tool is an updated & cleaned up version of
https://github.com/mganandraj/office-android-patches. This tool was created a
few years ago, heavily inspired by
[`patch-package`](https://github.com/ds300/patch-package) but repurposed to be
used locally within the `react-native-macos`.

There are two core ideas in this tool:

1. you can do some local changes, even across multiple files, then you can save
   them up in a patch folder for future usage. (via `diff`)
2. you can reapply all the patch folders that you want via a separate command
   (via `patch`)

You can find more details about how it's used by `react-native-macos`
[here](https://github.com/microsoft/react-native-macos/tree/main/android-patches).

## Usage

This tool has mainly two commands, `diff` and `patch`. You can find the full
list of functionalities by invoking the command
`npx @rnx-kit/patch-rnmacos --help`.

### `diff`

This command will take a folder and a "clean-copy" of it _(that needs to be
separate)_ to generate a set of patch files that can be applied. The idea is to
be able to re-apply the changes programmatically via the other command, `patch`.

When using this command, you will need to pass a series of parameters to ensure
it's successful:

```sh
npx @rnx-kit/patch-rnmacos diff <path-of-folder> <path-of-clean-copy-folder> --patch-name <name-for-patch-folder>
```

Along with these core options, you might want to pass the following params:

- `--inclusionList-dirs`, relative path within the folder with the changes to
  focus on (instead of having the tool look everywhere inside it)
- `--log-folder`, absolute path in which to store logs of the execution of this
  command
- `--git-executable` and `--diff-executable`, these by default try to find the
  Git tool in Windows. So, if you are in a Unix-based solution like macos, you
  will want to pass something like
  `--git-executable /usr/local/bin/git --diff-executable /usr/local/Cellar/git/2.34.0/libexec/git-core/git-diff`

A complete example of this script on macos is the following:

```sh
npx @rnx-kit/patch-rnmacos diff ../../../react-native-macos-main/ ../../../react-native-macos-clean-copy --inclusionList-dirs ./ReactAndroid --patch-name TEST --log-folder ./logs --git-executable /usr/local/bin/git --diff-executable /usr/local/Cellar/git/2.34.0/libexec/git-core/git-diff
```

### **`patch`**

This command allows to apply to the codebase all the various folder patches (via
their names) - like so:

```sh
npx @rnx-kit/patch-rnmacos patch <path-of-codebase> <array-of-patches-folder-names> --patch-store <path-of-folder-containing-patches> --log-folder <path-to-folder-where-to-store-logs> --confirm true
```

The `--confirm true` param at the end is necessary to allow the tool write the
changes.

A complete example of this script on macos is the following:

```sh
npx @rnx-kit/patch-rnmacos patch ../../../react-native-macos-main Build OfficeRNHost V8 Focus MAC ImageColor --patch-store ../../../react-native-macos-main/android-patches/patches --log-folder ../../../react-native-macos-main/android-patches/logs --confirm true
```

### **`patchfile`**

This command is similar to `patch`, but targets a specific file:

```
patchfile [options] <targetFilePath> <patchFilePath>
```

More details can be found via `npx @rnx-kit/patch-rnmacos patchfile --help`.
It's not widely used.
