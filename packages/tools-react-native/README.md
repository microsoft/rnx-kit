# @rnx-kit/tools-react-native

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-react-native)](https://www.npmjs.com/package/@rnx-kit/tools-react-native)

`@rnx-kit/tools-react-native` is a collection of supplemental react-native
functions and types.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * from "@rnx-kit/tools-react-native";

import * from "@rnx-kit/tools-react-native/platform";
```

| Category | Type Name      | Description                               |
| -------- | -------------- | ----------------------------------------- |
| Platform | `AllPlatforms` | List of supported react-native platforms. |

| Category | Function           | Description                                                        |
| -------- | ------------------ | ------------------------------------------------------------------ |
| Platform | `parsePlatform(p)` | Parse a string to ensure it maps to a valid react-native platform. |
