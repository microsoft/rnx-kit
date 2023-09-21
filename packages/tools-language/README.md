# @rnx-kit/tools-language

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-language)](https://www.npmjs.com/package/@rnx-kit/tools-language)

`@rnx-kit/tools-language` is a collection of supplemental JavaScript functions
and types.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * as tools from "@rnx-kit/tools-language";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category   | Function                       | Description                                                                                                                                                 |
| ---------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| properties | `hasProperty(obj, property)`   | Returns whether `property` exists in `obj`.                                                                                                                 |
| properties | `keysOf(obj)`                  | Returns the names of the enumerable string properties of an object. Equivalent to calling `Object.keys()`, but type safe.                                   |
| properties | `pickValues(obj, keys, names)` | Pick the value for each `key` property from `obj` and return each one in a new object. If `names` are given, use them in the new object, instead of `keys`. |

<!-- @rnx-kit/api end -->
