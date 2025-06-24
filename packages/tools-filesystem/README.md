# @rnx-kit/tools-filesystem

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-filesystem)](https://www.npmjs.com/package/@rnx-kit/tools-filesystem)

`@rnx-kit/tools-filesystem` is a collection of commonly used functions for
manipulating the filesystem.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * as tools from "@rnx-kit/tools-filesystem";

// Alternatively...
import * as mocks from "@rnx-kit/tools-filesystem/mocks";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Function                    | Description                                                                        |
| -------- | --------------------------- | ---------------------------------------------------------------------------------- |
| -        | `ensureDir(path)`           | Ensures that a directory exists, creating it if necessary.                         |
| -        | `ensureDirForFile(p)`       | Ensures that the directory for a given file path exists, creating it if necessary. |
| -        | `writeJSONFile(path, data)` | Writes specified data to a file, serialized in prettified JSON format.             |
| -        | `writeTextFile(path, data)` | Writes specified data to a file, assuming the data is UTF-8 encoded text.          |

<!-- @rnx-kit/api end -->
