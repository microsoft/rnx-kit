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

### Tree formatting

`formatAsTree` assembles a header and a list of pre-formatted rows into a
tree-shaped string. It is a pure formatter — no buffering, no console output,
no styling — so callers stay in control of how rows are produced and styled.

```typescript
import { formatAsTree } from "@rnx-kit/tools-formatting";

const report = formatAsTree("Found problems in package.json", [
  'missing field "license"',
  "version is invalid",
  "homepage is empty",
]);
console.log(report);
// Found problems in package.json
// ├── missing field "license"
// ├── version is invalid
// └── homepage is empty
```

Rows that contain `\n` are expanded into multiple output lines, with the trunk
character preserved on continuation lines so the structure stays readable:

```typescript
formatAsTree("Type errors", [
  'src/foo.ts:12\n  Type "string" is not assignable to type "number"',
  'src/bar.ts:7\n  Cannot find name "baz"',
]);
// Type errors
// ├── src/foo.ts:12
// │     Type "string" is not assignable to type "number"
// └── src/bar.ts:7
//       Cannot find name "baz"
```

For terminals without unicode support, set `asciiOnly`:

```typescript
formatAsTree("Header", ["a", "b"], { asciiOnly: true });
// Header
// +-- a
// `-- b
```

Or supply a fully custom set of branch characters via `treeParts`:

```typescript
formatAsTree("Header", ["a", "b"], {
  treeParts: {
    row: ["* ", "  "], // [first-line prefix, multi-line continuation]
    last: ["> ", "  "],
  },
});
```

`indent` (number of spaces or a literal string) is prepended to every row line,
including continuations, while leaving the header column flush:

```typescript
formatAsTree("Header", ["a", "b"], { indent: 2 });
// Header
//   ├── a
//   └── b
```

The result never has a trailing newline, so it composes cleanly with whatever
emits it.

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

| Function                            | Description                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `formatAsTable(data, opts?)`        | Format a 2D data array into a bordered ASCII table.                             |
| `formatAsTree(header, rows, opts?)` | Format a header and a list of rows into a tree-shaped string.                   |
| `shortenPath(path, segs?)`          | Shorten a file path to the last _segs_ segments (default 3), with `...` prefix. |

### TableOptions

| Field        | Type                          | Default | Description                                                              |
| ------------ | ----------------------------- | ------- | ------------------------------------------------------------------------ |
| `columns`    | `(string \| ColumnOptions)[]` | auto    | Column labels or configuration objects.                                  |
| `sort`       | `number[]`                    | none    | Column indices to sort by, in precedence order.                          |
| `showIndex`  | `boolean`                     | `false` | Show a row index column.                                                 |
| `asciiOnly`  | `boolean`                     | `false` | Use ASCII-only border characters instead of unicode box drawing.         |
| `tableParts` | `TableViewParts`              | --      | Fully override the border characters. Takes precedence over `asciiOnly`. |
| `noColors`   | `boolean`                     | `false` | Strip ANSI styling from output.                                          |

### ColumnOptions

| Field       | Type                        | Default  | Description                                             |
| ----------- | --------------------------- | -------- | ------------------------------------------------------- |
| `label`     | `string`                    | auto     | Column header label.                                    |
| `format`    | `(value) => string`         | --       | Convert a cell value to a string. Defaults to `String`. |
| `digits`    | `number`                    | --       | Fixed decimal places for numeric values.                |
| `localeFmt` | `boolean`                   | `false`  | Use locale number formatting.                           |
| `align`     | `"left"\|"right"\|"center"` | `"left"` | Cell text alignment.                                    |
| `maxWidth`  | `number`                    | --       | Maximum column width (truncates with `...`).            |
| `style`     | `StyleValue \| function`    | --       | ANSI style or custom formatter.                         |

### TreeFormattingOptions

| Field       | Type               | Default | Description                                                                |
| ----------- | ------------------ | ------- | -------------------------------------------------------------------------- |
| `asciiOnly` | `boolean`          | `false` | Use ASCII-only branch characters (`+-- ` / `` `--  ``) instead of unicode. |
| `treeParts` | `TreeViewParts`    | --      | Fully override the branch characters. Takes precedence over `asciiOnly`.   |
| `indent`    | `number \| string` | none    | Prepend this many spaces (number) or this exact string to every row line.  |

### TreeViewParts

Describes the branch glyphs used for each row as
`[first-line prefix, continuation prefix]`. The continuation prefix is used
when a row's text contains `\n`. All four prefixes should have the same width.

| Field  | Type               | Description                                              |
| ------ | ------------------ | -------------------------------------------------------- |
| `row`  | `[string, string]` | Prefixes for any non-last row (e.g. `["├── ", "│   "]`). |
| `last` | `[string, string]` | Prefixes for the final row (e.g. `["└── ", "    "]`).    |
