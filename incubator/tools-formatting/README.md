# @rnx-kit/tools-formatting

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-formatting)](https://www.npmjs.com/package/@rnx-kit/tools-formatting)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

Light-weight, zero-dependency formatting utilities for console output, log
files, and CI build logs (GitHub Actions and Azure Pipelines).

## Motivation

Most React Native build tooling needs to surface the same diagnostic in three
places: a developer's terminal, a CI log, and inline annotations on a pull
request. This package centralizes that formatting behind a small **Reporter**
abstraction so callers write the message once and the right syntax is emitted
for the active environment. The package also ships standalone helpers for
tables, trees, and path shortening.

## Installation

```sh
yarn add @rnx-kit/tools-formatting --dev
```

or with npm:

```sh
npm add --save-dev @rnx-kit/tools-formatting
```

## Usage

### Reporters

A **Reporter** describes how to render three kinds of output:

| Method              | Renders                                                       |
| ------------------- | ------------------------------------------------------------- |
| `formatMessage`     | A plain severity-tagged message (no source location).         |
| `formatFileMessage` | A diagnostic tied to a `file:line:col` location.              |
| `formatGroup`       | A collapsible / tree-shaped group with a header and children. |

Four built-in reporters are available, keyed by name:

| Name        | Used for                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `"github"`  | GitHub Actions logs (`::error file=...,line=...::msg`, `::group::header`, etc.).                      |
| `"azure"`   | Azure Pipelines logs (`##vso[task.logissue type=error;sourcepath=...]msg`, `##[group]header`, etc.).  |
| `"console"` | A developer terminal — color-prefixed severity, GCC-style file locations, unicode trees, ANSI colors. |
| `"file"`    | A plain log file — same layout as `console`, but colors are stripped by default.                      |

The top-level helpers — `formatMessage`, `formatFileMessage`, `formatGroup` —
accept an optional reporter parameter. If omitted, a reporter is selected
automatically by inspecting the environment (see [Default reporter
resolution](#default-reporter-resolution)).

```typescript
import {
  formatMessage,
  formatFileMessage,
  formatGroup,
} from "@rnx-kit/tools-formatting";

// Auto-detected reporter (console locally, github on GHA, azure on Azure DevOps).
console.error(formatMessage("error", "Build failed"));

console.error(
  formatFileMessage("warn", {
    message: "x is declared but never used",
    file: "src/foo.ts",
    line: 12,
    col: 5,
    title: "TS6133",
    root: process.cwd(),
  })
);

console.log(
  formatGroup("Type errors (3)", [
    "src/foo.ts:12:5 - x is declared but never used",
    "src/bar.ts:3:1 - Cannot find module",
    "src/baz.ts:9:7 - Property does not exist",
  ])
);
```

Output on GitHub Actions:

```
::error::Build failed
::warning title=TS6133,file=src/foo.ts,line=12,col=5::x is declared but never used
::group::Type errors (3)
src/foo.ts:12:5 - x is declared but never used
src/bar.ts:3:1 - Cannot find module
src/baz.ts:9:7 - Property does not exist
::endgroup::
```

Output on Azure Pipelines:

```
##vso[task.logissue type=error]Build failed
##vso[task.logissue type=warning;sourcepath=src/foo.ts;linenumber=12;columnnumber=5]x is declared but never used
##[group]Type errors (3)
src/foo.ts:12:5 - x is declared but never used
src/bar.ts:3:1 - Cannot find module
src/baz.ts:9:7 - Property does not exist
##[endgroup]
```

Output in a local terminal (with colors):

```
error: Build failed
warn: src/foo.ts:12:5: [TS6133] x is declared but never used
Type errors (3)
├── src/foo.ts:12:5 - x is declared but never used
├── src/bar.ts:3:1 - Cannot find module
└── src/baz.ts:9:7 - Property does not exist
```

### Selecting a reporter explicitly

Each helper accepts an optional reporter argument. You can pass a built-in
name, a custom `Reporter` instance, or leave it off to use the auto-detected
default.

```typescript
import { formatMessage, getReporter } from "@rnx-kit/tools-formatting";

formatMessage("error", "boom", "github"); // built-in by name
formatMessage("error", "boom", "console"); // force plain output on CI
formatMessage("error", "boom", getReporter("file")); // resolve once and reuse
formatMessage("error", "boom", myCustomReporter); // your own implementation
```

### Default reporter resolution

When no reporter is passed, `getDefaultReporter` picks one in this order:

1. The value of `process.env.RNX_TARGET_REPORTER`, if set to a built-in name.
2. `"github"` if `process.env.GITHUB_ACTIONS === "true"`.
3. `"azure"` if `process.env.TF_BUILD === "True"`.
4. `"console"` otherwise.

The result is cached for the lifetime of the process. Two predicate helpers
are exported for callers that want to check the environment directly:

```typescript
import { isGitHubActions, isAzurePipelines } from "@rnx-kit/tools-formatting";
```

### Customizing a built-in reporter

`createReporter` (and the per-provider `createGitHubReporter` /
`createAzureReporter` factories) accepts a small overrides bag for tweaking
the reporter's `name`, `noColors`, and `asciiOnly` flags:

```typescript
import { createReporter } from "@rnx-kit/tools-formatting";

const asciiFile = createReporter("file", { asciiOnly: true });
// `formatGroup` will now use `+-- ` / `` `--  `` instead of unicode trees.
```

### Extending the registry

Reporter resolution is owned by a [`ReporterRegistry`](#reporterregistry)
instance. The package exports a process-wide singleton (accessed via
`getReporterRegistry()`); the top-level helpers (`getReporter`,
`getDefaultReporter`, `formatMessage`, …) all delegate to it.

To add a new reporter type or change the default-resolution chain, subclass
`ReporterRegistry` and install your instance with `setReporterRegistry()`
at the entry point of your tool:

```typescript
import {
  ReporterRegistry,
  setReporterRegistry,
  type Reporter,
  type ReporterPropOverrides,
} from "@rnx-kit/tools-formatting";

const teamcityReporter: Reporter = {
  name: "teamcity",
  noColors: true,
  asciiOnly: true,
  formatMessage: (sev, msg) =>
    `##teamcity[message text='${msg}' status='${sev.toUpperCase()}']`,
  formatFileMessage: (sev, m) =>
    `##teamcity[message text='${m.file}:${m.line ?? 0}: ${m.message}' status='${sev.toUpperCase()}']`,
  formatGroup: (header, children) =>
    [
      `##teamcity[blockOpened name='${header}']`,
      ...children,
      "##teamcity[blockClosed]",
    ].join("\n"),
};

class MyToolRegistry extends ReporterRegistry {
  // Use a tool-specific env var for the explicit override.
  protected override envKey = "MYTOOL_REPORTER";

  override createReporter(type: string, options?: ReporterPropOverrides): Reporter {
    if (type === "teamcity") return teamcityReporter;
    return super.createReporter(type, options);
  }

  override getDefaultReporterType(): string {
    if (process.env.TEAMCITY_VERSION) return "teamcity";
    return super.getDefaultReporterType();
  }
}

setReporterRegistry(new MyToolRegistry());
```

From this point on, every call to `getReporter("teamcity")` (or
`formatMessage(...)` running under TeamCity) goes through the custom
registry. Tests can construct their own `ReporterRegistry` instance without
touching the singleton, or call `setReporterRegistry(undefined)` to drop the
override and let the next access rebuild a fresh default.

`ReporterRegistry` is designed for subclassing. The methods worth overriding
are:

| Method                    | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `createReporter`          | Add new reporter types. Fall through with `super.createReporter`. |
| `getDefaultReporterType`  | Add CI-provider detection. Fall through with `super`.             |
| `envKey` (property)       | Change which environment variable provides the explicit override. |
| `reset`                   | Clear the cached default and the named-reporter cache.            |

### Writing a custom reporter

A reporter is just an object that implements the [`Reporter`
interface](#reporter):

```typescript
import type { Reporter } from "@rnx-kit/tools-formatting";

const teamCityReporter: Reporter = {
  name: "teamcity",
  noColors: true,
  asciiOnly: false,
  formatMessage: (sev, msg) =>
    `##teamcity[message text='${msg}' status='${sev.toUpperCase()}']`,
  formatFileMessage: (sev, m) =>
    `##teamcity[message text='${m.file}:${m.line ?? 0}: ${m.message}' status='${sev.toUpperCase()}']`,
  formatGroup: (header, children) =>
    [
      `##teamcity[blockOpened name='${header}']`,
      ...children,
      "##teamcity[blockClosed]",
    ].join("\n"),
};
```

### Table formatting

`formatAsTable` renders a 2D array of values as a bordered table. Columns can
be configured with labels, alignment, max width, fixed-digit numeric
formatting, locale-aware number formatting, ANSI styles, and a custom
`format` function.

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

> **Sort direction.** `sort` orders numeric columns descending (largest first)
> and string columns ascending (A–Z), which matches the common use case of
> "show the biggest metric on top" while still keeping name columns
> alphabetical.

Use `asciiOnly: true` (or supply a custom `tableParts`) for ASCII-only border
characters.

### Tree formatting

`formatAsTree` assembles a header and a list of pre-formatted rows into a
tree-shaped string. It is a pure formatter — no console output, no styling.
Reporters use it internally for `console` / `file` group rendering, but it is
also exported standalone:

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

Rows containing `\n` (or `\r\n`) expand into multiple output lines with the
trunk character preserved on continuation lines:

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

ASCII fallback (`asciiOnly: true`) and a fully-custom `treeParts` override are
supported, as is an `indent` (number of spaces or a literal prefix string)
that is applied to every row line. The result has no trailing newline.

### Console message helpers

When you want to render a single diagnostic without going through a reporter
(for example, you're already writing to a fixed stream), the underlying
formatters are exported directly:

```typescript
import {
  formatConsoleMessage,
  formatConsoleFileMessage,
  colorText,
  compareSeverity,
} from "@rnx-kit/tools-formatting";

formatConsoleMessage("error", "boom");
// "error: boom" — with the "error" prefix colored red if colors are enabled

formatConsoleFileMessage("warn", {
  message: "x is declared but never used",
  file: "src/foo.ts",
  line: 12,
  col: 5,
  title: "TS6133",
});
// "warn: src/foo.ts:12:5: [TS6133] x is declared but never used"

colorText("red", "danger", { noColors: false });

compareSeverity("warn", "error"); // negative — "warn" is less severe
```

### Path utilities

`shortenPath` truncates file paths for display, keeping the most significant
trailing segments and replacing the rest with an ellipsis:

```typescript
import { shortenPath } from "@rnx-kit/tools-formatting";

shortenPath(
  "/Users/me/dev/rnx-kit/packages/metro-resolver-symlinks/src/resolver.ts"
);
// => ".../metro-resolver-symlinks/src/resolver.ts"
```

By default it keeps three segments. If the segment at the cut boundary is a
known source directory (`src`, `lib`, `dist`, `bin`), it keeps one extra
segment so the parent package name stays visible:

```typescript
shortenPath("/Users/me/dev/rnx-kit/packages/my-package/src/utils/helpers.ts");
// => ".../my-package/src/utils/helpers.ts"  (4 segments)
```

Short paths are returned unchanged when shortening would not save space; the
segment count is configurable via the second argument.

`normalizePath` makes a path relative to a `root` (defaulting to
`process.cwd()`) and converts it to POSIX slashes so the resulting string
works as a clickable link in both GitHub Actions and Azure Pipelines logs on
any host platform:

```typescript
import { normalizePath } from "@rnx-kit/tools-formatting";

normalizePath(
  "D:\\repos\\rnx-kit\\packages\\foo\\src\\index.ts",
  "D:\\repos\\rnx-kit"
);
// => "packages/foo/src/index.ts"
```

## API Reference

### Functions

| Function                                              | Description                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `formatMessage(severity, message, reporter?)`         | Format a plain severity-tagged message using the chosen / default reporter.            |
| `formatFileMessage(severity, fileMessage, reporter?)` | Format a diagnostic tied to a file location using the chosen / default reporter.       |
| `formatGroup(header, children, reporter?)`            | Format a header + child lines as a collapsible group / tree.                           |
| `formatAsTable(data, opts?)`                          | Format a 2D data array into a bordered table.                                          |
| `formatAsTree(header, rows, opts?)`                   | Format a header and a list of rows into a tree-shaped string.                          |
| `formatConsoleMessage(severity, message, opts?)`      | Format a single severity-tagged message for console output.                            |
| `formatConsoleFileMessage(severity, fileMsg, opts?)`  | Format a single file-located diagnostic for console output.                            |
| `colorText(style, text, opts?)`                       | Apply an ANSI style to text, respecting `noColors`.                                    |
| `compareSeverity(a, b)`                               | Numeric comparator over severity levels (`info < warn < error`).                       |
| `shortenPath(path, segs?)`                            | Shorten a file path to the last _segs_ segments (default 3), with `...` prefix.        |
| `normalizePath(file, root?)`                          | Make a path relative to `root` (default `process.cwd()`) and convert to POSIX slashes. |
| `getReporter(reporter?)`                              | Resolve a reporter by name, custom instance, or environment default.                   |
| `getDefaultReporter()`                                | Get the cached default reporter for the current environment.                           |
| `getDefaultReporterType()`                            | Get the name of the default reporter that would be selected for the environment.       |
| `createReporter(type, opts?)`                         | Build a fresh built-in reporter, optionally overriding its defaults.                   |
| `createGitHubReporter(opts?)`                         | Build a GitHub Actions reporter with optional overrides.                               |
| `createAzureReporter(opts?)`                          | Build an Azure Pipelines reporter with optional overrides.                             |
| `createConsoleOrFileReporter(type, opts?)`            | Build a `console` or `file` reporter with optional overrides.                          |
| `getReporterRegistry()`                               | Get the process-wide singleton `ReporterRegistry` (lazily constructed).                |
| `setReporterRegistry(registry)`                       | Replace (or clear, with `undefined`) the singleton `ReporterRegistry`.                 |
| `isGitHubActions()`                                   | Returns `true` when `GITHUB_ACTIONS === "true"`.                                       |
| `isAzurePipelines()`                                  | Returns `true` when `TF_BUILD === "True"`.                                             |

### Types

`Severity`, `FileMessage`, `Reporter`, `BuiltinReporter`, `ReporterOption`,
`ReporterPropOverrides`, `ColorOptions`, `TextOptions`, `StyleValue`,
`TableOptions`, `ColumnOptions`, `TableViewParts`, `TreeFormattingOptions`,
`TreeViewParts`.

#### ReporterRegistry

Class that owns reporter resolution. Subclass to add new reporter types or
extend default detection; install your subclass with `setReporterRegistry()`.

| Method / property        | Description                                                                       |
| ------------------------ | --------------------------------------------------------------------------------- |
| `getReporter(opt?)`      | Resolve a `ReporterOption` to a `Reporter`. Built-in names are cached per name.   |
| `getDefaultReporter()`   | Cached lookup of the reporter for `getDefaultReporterType()`.                     |
| `createReporter(type, opts?)` | Construct a fresh reporter by name. **Override** to add new types.           |
| `getDefaultReporterType()` | Compute the default reporter name from the environment. **Override** to add CI providers. |
| `envKey` (protected)     | Environment variable consulted by the default `getDefaultReporterType`.           |
| `reset()`                | Drop the cached default and per-name reporter cache.                              |

#### Reporter

| Field               | Type                                | Description                                                     |
| ------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `name`              | `string`                            | Identifier for diagnostics / introspection.                     |
| `noColors`          | `boolean`                           | Whether the reporter strips ANSI styling (consumed by helpers). |
| `asciiOnly`         | `boolean`                           | Whether the reporter uses ASCII-only glyphs for trees/tables.   |
| `formatMessage`     | `(severity, message) => string`     | Render a plain severity-tagged message.                         |
| `formatFileMessage` | `(severity, fileMessage) => string` | Render a diagnostic tied to a `FileMessage`.                    |
| `formatGroup`       | `(header, children) => string`      | Render a collapsible group; result is newline-joined.           |

#### FileMessage

| Field     | Type     | Required | Description                                                                                             |
| --------- | -------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `message` | `string` | yes      | The diagnostic text.                                                                                    |
| `file`    | `string` | yes      | Path to the file. Combined with `root` and converted to POSIX slashes via `normalizePath`.              |
| `root`    | `string` | no       | Root directory for relative-path resolution. Defaults to `process.cwd()` inside `normalizePath`.        |
| `line`    | `number` | no       | 1-based line number.                                                                                    |
| `col`     | `number` | no       | 1-based column number.                                                                                  |
| `endLine` | `number` | no       | 1-based end line number. GitHub Actions only — ignored on Azure.                                        |
| `endCol`  | `number` | no       | 1-based end column number. GitHub Actions only — emitted as `endColumn` per spec. Ignored on Azure.     |
| `title`   | `string` | no       | Short title shown above the message in the GitHub Actions UI; shown as a bracketed tag in plain output. |

#### TableOptions

| Field        | Type                          | Default | Description                                                              |
| ------------ | ----------------------------- | ------- | ------------------------------------------------------------------------ |
| `columns`    | `(string \| ColumnOptions)[]` | auto    | Column labels or configuration objects.                                  |
| `sort`       | `number[]`                    | none    | Column indices to sort by, in precedence order.                          |
| `showIndex`  | `boolean`                     | `false` | Show a row index column.                                                 |
| `asciiOnly`  | `boolean`                     | `false` | Use ASCII-only border characters instead of unicode box drawing.         |
| `tableParts` | `TableViewParts`              | --      | Fully override the border characters. Takes precedence over `asciiOnly`. |
| `noColors`   | `boolean`                     | `false` | Strip ANSI styling from output.                                          |

#### ColumnOptions

| Field       | Type                        | Default  | Description                                             |
| ----------- | --------------------------- | -------- | ------------------------------------------------------- |
| `label`     | `string`                    | auto     | Column header label.                                    |
| `format`    | `(value) => string`         | --       | Convert a cell value to a string. Defaults to `String`. |
| `digits`    | `number`                    | --       | Fixed decimal places for numeric values.                |
| `localeFmt` | `boolean`                   | `false`  | Use locale number formatting.                           |
| `align`     | `"left"\|"right"\|"center"` | `"left"` | Cell text alignment.                                    |
| `maxWidth`  | `number`                    | --       | Maximum column width (truncates with `...`).            |
| `style`     | `StyleValue \| function`    | --       | ANSI style or custom formatter.                         |

#### TreeFormattingOptions

| Field       | Type               | Default | Description                                                                |
| ----------- | ------------------ | ------- | -------------------------------------------------------------------------- |
| `asciiOnly` | `boolean`          | `false` | Use ASCII-only branch characters (`+-- ` / `` `--  ``) instead of unicode. |
| `treeParts` | `TreeViewParts`    | --      | Fully override the branch characters. Takes precedence over `asciiOnly`.   |
| `indent`    | `number \| string` | none    | Prepend this many spaces (number) or this exact string to every row line.  |

#### TreeViewParts

Describes the branch glyphs used for each row as
`[first-line prefix, continuation prefix]`. The continuation prefix is used
when a row's text contains a newline. All four prefixes should have the same
width so columns line up.

| Field  | Type               | Description                                              |
| ------ | ------------------ | -------------------------------------------------------- |
| `row`  | `[string, string]` | Prefixes for any non-last row (e.g. `["├── ", "│   "]`). |
| `last` | `[string, string]` | Prefixes for the final row (e.g. `["└── ", "    "]`).    |

### Environment variables

| Variable              | Used by                                   | Description                                                                |
| --------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| `RNX_TARGET_REPORTER` | `getDefaultReporter`                      | Explicit override for the auto-detected reporter (a built-in name).        |
| `GITHUB_ACTIONS`      | `isGitHubActions` / `getDefaultReporter`  | Set to `"true"` by the GitHub Actions runner; triggers the GH reporter.    |
| `TF_BUILD`            | `isAzurePipelines` / `getDefaultReporter` | Set to `"True"` by the Azure Pipelines agent; triggers the Azure reporter. |
