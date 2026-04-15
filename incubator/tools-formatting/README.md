# @rnx-kit/tools-formatting

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-formatting)](https://www.npmjs.com/package/@rnx-kit/tools-formatting)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

Provides light-weight, zero-dependency, formatting utilities for console (or log-file) output.

## Motivation

Lightweight and centralized formatting utilities.

## Installation

```sh
yarn add @rnx-kit/tools-formatting --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-formatting
```

## Usage

### Table formatting

The `formatAsTable` utility can format any 2D data array into a bordered table:

```typescript
import { formatAsTable } from "@rnx-kit/tools-formatting";

const table = formatAsTable(
  [
    ["parse", 12, 1],
    ["bundle", 450, 1],
  ],
  {
    columns: [
      { label: "operation", align: "left" },
      { label: "total (ms)", align: "right", digits: 0, localeFmt: true },
      { label: "calls", align: "right" },
    ],
    sort: [1],
  }
);
console.log(table);
```

### Path shortening

`shortenPath` truncates file paths for display, keeping the most significant
trailing segments and replacing the rest with an ellipsis. This is useful for
tables or logs where long absolute paths waste space.

```typescript
import { shortenPath } from "@rnx-kit/tools-formatting";

shortenPath(
  "/Users/me/dev/rnx-kit/packages/metro-resolver-symlinks/src/resolver.ts"
);
// => ".../metro-resolver-symlinks/src/resolver.ts"
```

By default it keeps 3 path segments. If the segment at the cut boundary is a
known source directory (`src`, `lib`, `dist`, `bin`), it keeps one extra segment
so the parent package name stays visible:

```typescript
shortenPath("/Users/me/dev/rnx-kit/packages/my-package/src/utils/helpers.ts");
// => ".../my-package/src/utils/helpers.ts"  (4 segments)
```

Short paths are returned unchanged when shortening would not save space. The
segment count can be customized:

```typescript
shortenPath("/a/b/c/d/e.ts", 2);
// => ".../d/e.ts"
```

## API Reference

### Functions

| Function                     | Description                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `formatAsTable(data, opts?)` | Format a 2D data array into a bordered ASCII table.                             |
| `shortenPath(path, segs?)`   | Shorten a file path to the last _segs_ segments (default 3), with `...` prefix. |

### TableOptions

| Field       | Type                          | Default | Description                                     |
| ----------- | ----------------------------- | ------- | ----------------------------------------------- |
| `columns`   | `(string \| ColumnOptions)[]` | auto    | Column labels or configuration objects.         |
| `sort`      | `number[]`                    | none    | Column indices to sort by, in precedence order. |
| `showIndex` | `boolean`                     | `false` | Show a row index column.                        |
| `noColors`  | `boolean`                     | `false` | Strip ANSI styling from output.                 |

### ColumnOptions

| Field       | Type                        | Default  | Description                                  |
| ----------- | --------------------------- | -------- | -------------------------------------------- |
| `label`     | `string`                    | auto     | Column header label.                         |
| `digits`    | `number`                    | --       | Fixed decimal places for numeric values.     |
| `localeFmt` | `boolean`                   | `false`  | Use locale number formatting.                |
| `align`     | `"left"\|"right"\|"center"` | `"left"` | Cell text alignment.                         |
| `maxWidth`  | `number`                    | --       | Maximum column width (truncates with `...`). |
| `style`     | `StyleValue \| function`    | --       | ANSI style or custom formatter.              |
