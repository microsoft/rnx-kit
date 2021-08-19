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
import * from "@rnx-kit/tools-language/props";
```

| Category | Function                                  | Description                                                                                                                                                 |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Function | `tryInvoke(fn)`                           | Invoke the given function, returning its result or a thrown error.                                                                                          |
| Math     | `isApproximatelyEqual(f1, f2, tolerance)` | Decide if two numbers, integer or decimal, are "approximately" equal. They're equal if they are close enough to be within the given tolerance.              |
| Props    | `pickValue(obj, key, name)`               | Pick the value for property `key` from `obj` and return it in a new object. If `name` is given, use it in the new object, instead of `key`.                 |
| Props    | `pickValues(obj, keys, names)`            | Pick the value for each `key` property from `obj` and return each one in a new object. If `names` are given, use them in the new object, instead of `keys`. |
