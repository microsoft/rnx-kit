# @rnx-kit/tools-babel

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-babel)](https://www.npmjs.com/package/@rnx-kit/tools-babel)

Utilities for working with Babel during Metro bundling's transform stage.
Handles loading Babel configs for React Native, parsing code to
Babel-compatible ASTs using fast native parsers, and introspecting and
manipulating Babel plugins.

## Motivation

Metro's transform stage runs Babel on every module in a React Native bundle.
This package provides the building blocks for a custom Metro transformer that
can:

- **Parse faster** by using OXC (a Rust-based parser) or Hermes instead of
  Babel's own parser, with automatic fallback
- **Load configs once** by caching the base Babel config across files and only
  adding per-file settings (HMR, caller info, platform)
- **Manage plugins** by inspecting, filtering, and wrapping plugins for
  performance tracing
- **Trace performance** by integrating with `@rnx-kit/tools-performance` to
  measure parse, conversion, and per-plugin visitor times

## Installation

```sh
yarn add @rnx-kit/tools-babel --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-babel
```

Peer dependencies:

```sh
yarn add @babel/core @react-native/babel-preset
```

## Quick Start

The simplest integration builds `TransformerArgs` from Metro's input and parses
with automatic backend selection:

```typescript
import { makeTransformerArgs, parseToAst } from "@rnx-kit/tools-babel";

function transform({ filename, src, options, plugins }) {
  const args = makeTransformerArgs(
    { filename, src, options, plugins },
    settings
  );
  if (!args) return null; // file should be skipped

  const ast = parseToAst(args);
  // ast is a Babel-compatible AST ready for transformFromAstSync
}
```

## Parsing

Three parser backends are available. `parseToAst` tries them in order and
returns the first successful result.

### OXC (primary)

OXC is a fast Rust-based JavaScript/TypeScript parser. Its output is an ESTree
AST which `toBabelAST` converts to Babel's format in a single in-place pass.

```typescript
import { oxcParseToAst } from "@rnx-kit/tools-babel";

const ast = oxcParseToAst(args);
```

OXC is skipped automatically for files that may contain Flow syntax. Disable it
explicitly via `TransformerSettings.parseDisableOxc`.

### Hermes (secondary)

Meta's Hermes parser, used as a fallback when OXC cannot parse a file.

```typescript
import { hermesParseToAst } from "@rnx-kit/tools-babel";

const ast = hermesParseToAst(args);
```

### Babel (fallback)

Babel's own `parseSync` is used as the final fallback. It is the slowest option
but handles all syntax Babel supports.

### Fallback chain

```typescript
import { parseToAst } from "@rnx-kit/tools-babel";

// Tries OXC -> Hermes -> Babel
const ast = parseToAst(args);
```

## Babel Config

### Loading configs

`getBabelConfig` creates a per-file Babel config by starting from a cached base
config and layering on file-specific settings:

```typescript
import { getBabelConfig } from "@rnx-kit/tools-babel";

const config = getBabelConfig(babelArgs, settings);
// config is ready for transformFromAstSync(ast, src, config)
```

The base config is resolved once and cached. It looks for `.babelrc`,
`.babelrc.js`, or `babel.config.js` in the project root, falling back to
`@react-native/babel-preset` if none is found.

Per-file additions include:

- HMR plugins (when `dev` + `hot` and not in `node_modules`)
- Plugin visitor tracing (when high-frequency performance tracking is enabled)
- Metro caller info with platform
- `code: false, ast: true, sourceType: "unambiguous"`

### Filtering plugins

`filterConfigPlugins` resolves presets and overrides into a flat plugin list,
then removes plugins by key:

```typescript
import { filterConfigPlugins } from "@rnx-kit/tools-babel";

const disabled = new Set(["transform-flow-strip-types"]);
const filtered = filterConfigPlugins(config, disabled);
```

Returns `null` if the file should be skipped entirely.

## Transformer Context

`TransformerArgs` bundles everything needed for a transform pass: source,
filename, Babel config, and a context object with file metadata and persistent
settings.

### Building args

```typescript
import { makeTransformerArgs } from "@rnx-kit/tools-babel";

const args = makeTransformerArgs(
  { filename, src, options, plugins },
  settings,
  (context, babelArgs) => {
    // Optional: customize context before config is built
    context.configCallerMixins = { engine: "hermes" };
  }
);
```

### Initializing context only

If you need the file context without building the full Babel config:

```typescript
import { initTransformerContext } from "@rnx-kit/tools-babel";

const context = initTransformerContext(filename, settings);
// context.srcSyntax, context.mayContainFlow, context.isNodeModule, etc.
```

## Plugin Utilities

Functions for inspecting and modifying Babel plugin configurations.

### Introspection

```typescript
import {
  isConfigItem,
  isPluginObj,
  getPluginTarget,
  getPluginKey,
} from "@rnx-kit/tools-babel";

// Identify plugin format
isConfigItem(plugin); // true if ConfigItem (has `value` property)
isPluginObj(plugin); // true if resolved PluginObj (has `visitor` property)

// Extract the plugin target (function/string) or key (string name)
const target = getPluginTarget(plugin);
const key = getPluginKey(plugin);
```

### Modifying plugin chains

`updateTransformOptions` walks plugins, presets, and overrides, calling a
visitor for each. Only creates new arrays/objects when changes are made.

```typescript
import { updateTransformOptions } from "@rnx-kit/tools-babel";

const newConfig = updateTransformOptions(config, (plugin, isPreset) => {
  const key = getPluginKey(plugin);
  if (key === "transform-flow-strip-types") return null; // remove
  return plugin; // keep unchanged
});
```

## ESTree to Babel AST Conversion

`toBabelAST` converts an OXC ESTree `Program` into a Babel-compatible
`ParseResult` in a single in-place pass. This is called automatically by
`oxcParseToAst` but is available directly for advanced use cases.

```typescript
import { toBabelAST } from "@rnx-kit/tools-babel";

const babelAst = toBabelAST(oxcProgram, source, isTypeScript, comments);
```

The conversion handles:

- Node type renames (e.g. `Property` to `ObjectProperty`/`ObjectMethod`)
- Literal splitting (`Literal` to `StringLiteral`, `NumericLiteral`, etc.)
- Optional chaining (`ChainExpression` to `OptionalMemberExpression`/`OptionalCallExpression`)
- Class member restructuring (`MethodDefinition` to `ClassMethod`/`ClassPrivateMethod`)
- TypeScript-specific nodes (`TSFunctionType`, `TSInterfaceHeritage`, etc.)
- Directive extraction from statement bodies
- Import expression conversion to `CallExpression(Import)`
- Comment attachment from OXC's flat array to Babel's per-node format
- Top-level await detection
- Source location calculation from byte offsets

## Performance Tracing

The package integrates with `@rnx-kit/tools-performance` on two domains:

| Domain         | Frequency | What is traced                                       |
| -------------- | --------- | ---------------------------------------------------- |
| `transform`    | medium    | Parse operations (OXC native, AST conversion, Babel) |
| `babel-plugin` | high      | Individual plugin visitor method calls               |

Plugin visitor tracing wraps every visitor method via Babel's
`wrapPluginVisitorMethod` hook. It is only enabled when high-frequency tracking
is active for the `babel-plugin` domain, as it adds overhead to every visitor
call.

```typescript
import { trackPerformance } from "@rnx-kit/tools-performance";

// Enable transform-level tracing
trackPerformance({ enable: "transform", strategy: "timing" });

// Enable per-plugin tracing (high overhead)
trackPerformance({
  enable: "babel-plugin",
  strategy: "timing",
  frequency: "high",
});
```

## TransformerSettings

Settings that persist across transformation passes:

| Field                   | Type                        | Default | Description                                               |
| ----------------------- | --------------------------- | ------- | --------------------------------------------------------- |
| `configCallerMixins`    | `Record<string, string>`    | --      | Extra fields added to Babel's `caller` config             |
| `configDisabledPlugins` | `Set<string>`               | --      | Plugin keys to remove from the resolved config            |
| `parseDisableOxc`       | `boolean`                   | --      | Disable OXC parser                                        |
| `parseDisableHermes`    | `boolean`                   | --      | Disable Hermes parser                                     |
| `parseFlowDefault`      | `boolean`                   | `true`  | Assume Flow in `.js`/`.jsx` files under `node_modules`    |
| `parseFlowWorkspace`    | `boolean`                   | `false` | Assume Flow in workspace `.js`/`.jsx` files               |
| `parseExtDefault`       | `SrcSyntax`                 | `"js"`  | Syntax for unknown file extensions (unset to skip)        |
| `parseExtAliases`       | `Record<string, SrcSyntax>` | --      | Map extensions to syntax types (e.g. `{ ".svg": "jsx" }`) |

## API Reference

### Config

| Function                                 | Description                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `getBabelConfig(args, settings?)`        | Build a per-file Babel config from cached base config + file-specific settings |
| `filterConfigPlugins(config, disabled?)` | Resolve presets/overrides and filter plugins by key                            |

### Parsing

| Function                                                | Description                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| `parseToAst(args)`                                      | Parse with fallback chain: OXC -> Hermes -> Babel |
| `oxcParseToAst(args, trace?)`                           | Parse with OXC and convert ESTree to Babel AST    |
| `hermesParseToAst(args)`                                | Parse with Hermes                                 |
| `toBabelAST(program, source, isTypeScript?, comments?)` | Convert OXC ESTree to Babel AST                   |

### Transformer

| Function                                                    | Description                                           |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `makeTransformerArgs(babelArgs, settings?, updateContext?)` | Build `TransformerArgs` with context and Babel config |
| `initTransformerContext(filename, settings)`                | Initialize file context without building Babel config |

### Plugins

| Function                                   | Description                                           |
| ------------------------------------------ | ----------------------------------------------------- |
| `isConfigItem(plugin)`                     | Check if plugin is a Babel `ConfigItem`               |
| `isPluginObj(plugin)`                      | Check if plugin is a resolved `PluginObj`             |
| `getPluginTarget(plugin)`                  | Extract the plugin target (function or string)        |
| `getPluginKey(plugin)`                     | Extract the key from a resolved plugin                |
| `updateTransformOptions(options, visitor)` | Walk and modify plugins/presets/overrides in a config |
