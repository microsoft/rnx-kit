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

| Category | Function                           | Description                                                                                                                                                                                                                                                   |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dirs     | `ensureDirForFileSync(p)`          | Ensures that the directory for a given file path exists, creating it if necessary.                                                                                                                                                                            |
| dirs     | `ensureDirSync(path)`              | Ensures that a directory exists, creating it if necessary.                                                                                                                                                                                                    |
| fileio   | `readFile(filePath)`               | Asynchronously reads the content of a file as a UTF-8 string, caching the result on the FSEntry. If the content has already been read and cached, it returns the cached content instead of reading from the filesystem again.                                 |
| fileio   | `readFileSync(filePath)`           | Synchronously reads the content of a file as a UTF-8 string, caching the result on the FSEntry. If the content has already been read and cached, it returns the cached content instead of reading from the filesystem again.                                  |
| fileio   | `readJson(filePath)`               | Asynchronously reads the content of a file as JSON, stripping a UTF-8 BOM if present. This is a convenience method that combines readFile with JSON.parse, and is useful for reading JSON files without having to worry about BOMs causing parse failures.    |
| fileio   | `readJsonSync(filePath)`           | Synchronously reads the content of a file as JSON, stripping a UTF-8 BOM if present. This is a convenience method that combines readFileSync with JSON.parse, and is useful for reading JSON files without having to worry about BOMs causing parse failures. |
| fileio   | `writeJSONFile(path, data, space)` | Writes specified data to a file, serialized as JSON format.                                                                                                                                                                                                   |
| fileio   | `writeTextFile(path, data)`        | Writes specified data to a file, assuming the data is UTF-8 encoded text.                                                                                                                                                                                     |
| json     | `parseJson(content)`               | Parse JSON via the internal JSON.parse, checking for and stripping a UTF-8 byte order mark if present to avoid parse failures.                                                                                                                                |
| json     | `serializeJson(data, space)`       | Serialize data to JSON format, optionally pretty-printing with a specified number of spaces.                                                                                                                                                                  |

<!-- @rnx-kit/api end -->
