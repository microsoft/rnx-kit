# @rnx-kit/tools-shell

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-shell)](https://www.npmjs.com/package/@rnx-kit/tools-shell)

`@rnx-kit/tools-shell` is a collection of functions for writing shell scripts.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * as tools from "@rnx-kit/tools-shell";

// Alternatively...
import * as asyncTools from "@rnx-kit/tools-shell/async";
import * as commandTools from "@rnx-kit/tools-shell/command";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Function                            | Description                                                                                             |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| async    | `idle(ms)`                          | Sleep for a specified numer of milliseconds.                                                            |
| async    | `once(func)`                        | Wraps the function, making sure it only gets called once.                                               |
| async    | `retry(func, retries, counter)`     | Calls the specified function, retrying up to specified number of times as long as the result is `null`. |
| async    | `withRetry(func, retries, counter)` | Calls the specified function, retrying up to specified number of times as long as the function throws.  |
| command  | `ensure(result, message)`           | Throws if the result of the process is non-zero.                                                        |
| command  | `ensureInstalled(check, message)`   | Throws if the provided command fails.                                                                   |
| command  | `makeCommand(command, userOptions)` | Creates an async function for calling the specified command.                                            |
| command  | `makeCommandSync(command)`          | Creates a synchronous function for calling the specified command.                                       |

<!-- @rnx-kit/api end -->
