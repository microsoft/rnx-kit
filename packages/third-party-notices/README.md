<!--remove-block start-->

# @rnx-kit/third-party-notices

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/third-party-notices)](https://www.npmjs.com/package/@rnx-kit/third-party-notices)

<!--remove-block end-->

`@rnx-kit/third-party-notices` provides a helper library to create a
third-party-notices text file based on a output bundle. It also provides a cli
interface to the library for integration into build steps like just-scripts

This function will read the sourcemap file and tries to find all files that are
referenced in the sourcemap by assuming that all dependencies are represented as
`node_modules\moduleName` or `node_modules\@scope\moduleName` It will then look
in the package.json file to see if it finds a licence claration or it will look
for the file called `LICENCE` in the root. And aggregate all ese files in the
output file.

This package works for npm, yarn and pnpm package layouts formats.

At the moment this package only supports webpack based bundles, there is nothing
preventing adding metro support, the current customers of this module are
basedon webpack at the moment.

## Usage

### Commandline

`npx @rnx-kit/third-party-notices --rootPath <myPackage> --sourceMapFile <myPackage/dist/myPackage.js.map>`

```
Options:
  --help            Show help                                          [boolean]
  --version         Show version number                                [boolean]
  --rootPath        The root of the repo where to start resolving modules from.
                                                             [string] [required]
  --sourceMapFile   The sourceMap file to generate licence contents for.
                                                             [string] [required]
  --outputFile      The output file to write the licence file to.       [string]
  --json            Output license information as a JSON
                                                      [boolean] [default: false]
  --ignoreScopes    Npm scopes to ignore and not emit licence information for
                                                                         [array]
  --ignoreModules   Modules (js packages) to not emit licence information for
                                                                         [array]
  --preambleText    A list of lines to prepend at the start of the generated
                    licence file.                                        [array]
  --additionalText  A list of lines to append at the end of the generated
                    licence file.                                        [array]
```

### As a library

```ts
import { writeThirdPartyNotices } from "@rnx-kit/third-party-notices";

writeThirdPartyNotices({
  rootPath: ".",
  sourceMapFile: "./dist/myPackage.js.map",
});
```
