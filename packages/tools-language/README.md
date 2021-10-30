# @rnx-kit/tools-language

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-language)](https://www.npmjs.com/package/@rnx-kit/tools-language)

`@rnx-kit/tools-language` is a collection of supplemental JavaScript functions
and types.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * from "@rnx-kit/tools-language";

import * from "@rnx-kit/tools-language/function";
import * from "@rnx-kit/tools-language/math";
import * from "@rnx-kit/tools-language/properties";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category   | Function                                  | Description                                                                                                                                                 |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| array      | `addRange(to, from, start, end)`          | Add elements from one array to another, returning the resulting array.                                                                                      |
| array      | `toIndex(array, offset)`                  | Convert an array offset to an array index. An offset can be positive or negative, while an index is always positive.                                        |
| function   | `tryInvoke(fn)`                           | Invoke the given function, returning its result or a thrown error.                                                                                          |
| math       | `isApproximatelyEqual(f1, f2, tolerance)` | Decide if two numbers, integer or decimal, are "approximately" equal. They're equal if they are close enough to be within the given tolerance.              |
| properties | `extendObject(obj, extendedProps)`        | Add properties to an object, changing it from its current type to an extended type.                                                                         |
| properties | `extendObjectArray(arr, extendedProps)`   | Add properties to each object in an array, changing the object from its current type to an extended type.                                                   |
| properties | `hasProperty(obj, property)`              | Returns whether `property` exists in `obj`.                                                                                                                 |
| properties | `pickValue(obj, key, name)`               | Pick the value for property `key` from `obj` and return it in a new object. If `name` is given, use it in the new object, instead of `key`.                 |
| properties | `pickValues(obj, keys, names)`            | Pick the value for each `key` property from `obj` and return each one in a new object. If `names` are given, use them in the new object, instead of `keys`. |

<!-- @rnx-kit/api end -->
