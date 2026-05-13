# @rnx-kit/metro-transformer-native

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-transformer-native)](https://www.npmjs.com/package/@rnx-kit/metro-transformer-native)

A Metro `babelTransformerPath` that pre-processes TypeScript/JSX with a
native engine (currently `@swc/core`) before handing the result to Babel.
The native engine does the expensive type-stripping, JSX, and module-syntax
work; Babel handles plugins that need its visitor pipeline (React codegen,
React Refresh, etc.) on an already-lightweight AST.

## Goals of this package

The native transformer package leverages the fast oxc-based parsing in
`@rnx-kit/tools-babel`, transformations with `@swc/core`, and a thin Babel
finisher to:

1. speed up end-to-end transformation time;
2. allow better targeting of the runtime environment (modern JSC / V8 that
   already support ES2020 or ES2022);
3. expose configuration escape valves so any sub-step can be disabled
   independently if it misbehaves;
4. work in both dev and production mode;
5. avoid redundant Babel plugins when the native engine has already done
   the work;
6. optionally handle SVG transformations for `.svg` imports;
7. cooperate with `@rnx-kit/metro-serializer-esbuild` to produce
   tree-shaken bundles.

It's acceptable for this package to disable some other Babel-driven
functionality (for example, inline-requires) when those plugins overlap
with the native preprocessing.

## Installation

```sh
yarn add -D @rnx-kit/metro-transformer-native
```

The SVG path is opt-in and pulls its dependencies through optional peer
dependencies. Install them only if you set `handleSvg: true`:

```sh
yarn add -D @svgr/core @svgr/plugin-jsx @svgr/plugin-svgo
```

## Quickstart

Wire `MetroTransformerNative` into your `metro.config.js`:

```js
// metro.config.js
const { MetroTransformerNative } = require("@rnx-kit/metro-transformer-native");
const { mergeConfig } = require("metro-config");

const baseConfig = {
  // ... your existing Metro config ...
};

module.exports = mergeConfig(baseConfig, {
  transformer: MetroTransformerNative(
    {
      // options — see below
    },
    baseConfig.transformer
  ),
});
```

`MetroTransformerNative(options, config?)` returns a partial
`TransformerConfigT` with `babelTransformerPath` pointing at this package.
The options are serialized to an environment variable so the worker
processes can read them — call the factory exactly once, from the same
process that owns the Metro config.

## Options

All options live under `TransformerNativeOptions`. Defaults are picked so
the package is safe to drop in without further tuning; everything else is
an escape valve.

| Option              | Type                 | Default | Set this when…                                                                                                                |
| ------------------- | -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `nativeTransform`   | `boolean`            | `true`  | …you want to fully disable the native engine for an experiment.                                                               |
| `handleTs`          | `boolean`            | `true`  | …you need to send `.ts`/`.tsx` through Babel only (e.g. when a Babel plugin must see TypeScript syntax).                      |
| `handleJs`          | `boolean`            | `false` | …your `.js` sources also benefit from the native pass (no Flow, modern ES).                                                   |
| `handleJsx`         | `boolean`            | `false` | …you want SWC to do the JSX transform. Pairs with `handleJs` for `.jsx`; on by default for `.tsx` when `handleTs` is true.    |
| `handleModules`     | `boolean`            | `false` | …you are NOT using `metro-serializer-esbuild` and want SWC to emit CommonJS instead of Babel's `transform-modules-commonjs`.  |
| `handleSvg`         | `boolean`            | `false` | …you import `.svg` files as React components (requires the svgr peers).                                                       |
| `asyncTransform`    | `boolean`            | `false` | …you want to use SWC's async APIs and let Metro overlap worker IO.                                                            |
| `dynamicKey`        | `boolean \| string`  | —       | …you want to force cache invalidation (boolean → timestamp string; string → used verbatim). Boolean mode is for perf testing. |
| `upstreamDelegates` | `UpstreamDelegate[]` | —       | …you need to route certain extensions to a different upstream transformer (e.g. a JSON loader).                               |

`UpstreamDelegate` is `{ transformerPath: string; extensions: string \| string[] }`. Entries are evaluated head-to-tail; the first matching extension wins. Paths may be absolute, relative (resolved against `process.cwd()`), or bare specifiers (resolved through the consumer's `node_modules`).

## Cache key contract

`getCacheKey()` returns a SHA-256 hash folded from three inputs:

1. the JSON-serialized options you passed to `MetroTransformerNative`,
2. this package's `version` (so an npm bump invalidates caches),
3. the byte contents of every compiled `.js` file in the package.

Any of those changes will invalidate Metro's transformer cache the next
time it builds. If you need finer-grained invalidation — say, to bust the
cache when an external file changes — pass `dynamicKey`:

- `dynamicKey: "v3-foo"` adds the literal string to the hash.
- `dynamicKey: true` substitutes the current ISO timestamp. Cache is
  invalidated on every Metro startup; intended for perf benchmarking only.

## Escape valves

If a particular sub-step misbehaves, flip the matching option:

| Symptom                                                                                                  | Option to flip                                                     |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `codegenNativeComponent<…>` call is being mangled                                                        | (automatic — detected by a regex; if it slips through, file a bug) |
| A specific Babel plugin needs to see the original TypeScript syntax                                      | `handleTs: false`                                                  |
| `.tsx`/`.jsx` is emitting JSX that breaks a downstream Babel plugin                                      | `handleJsx: false`                                                 |
| You hit a parse error you can't reproduce with the stock Babel transformer                               | `nativeTransform: false`                                           |
| Module wrapping (`module.exports`) is conflicting with another tool                                      | `handleModules: false` (default) — let Babel do it                 |
| `.svg` imports throw because the optional peers aren't installed                                         | `handleSvg: false` (default), or install the svgr peers            |
| A specific extension needs to use a different transformer entirely (Flow-only files, JSON, image loader) | `upstreamDelegates: [{ transformerPath, extensions }]`             |

## Using with `metro-serializer-esbuild`

`@rnx-kit/metro-serializer-esbuild` performs the final bundling and
tree-shakes the graph. For that to work, modules must stay as ES modules
through the transformer:

```js
// metro.config.js
const { MetroSerializer } = require("@rnx-kit/metro-serializer-esbuild");
const { MetroTransformerNative } = require("@rnx-kit/metro-transformer-native");

module.exports = mergeConfig(baseConfig, {
  serializer: {
    customSerializer: MetroSerializer([], { esbuildLogLevel: "warning" }),
  },
  transformer: {
    // Tell Metro to leave imports/exports alone — the esbuild serializer
    // needs them for tree-shaking.
    experimentalImportSupport: true,
    // Use this package to do the heavy TS/JSX work; keep modules as ESM
    // (handleModules:false is already the default, but it's worth stating).
    ...MetroTransformerNative({ handleModules: false }, baseConfig.transformer),
  },
});
```

When `handleModules: true` is set with the esbuild serializer present, the
transformer emits a console warning at config time: emitting CommonJS
defeats the serializer's tree-shaking. The warning is informational; the
package will not override your setting.

## Limitations

- **Source maps reflect post-SWC output, not the original TypeScript.** Metro's
  `metro-transform-worker` ignores the `map` field that babel-transformer
  signatures return — source-map data is reconstructed downstream from AST
  `loc` properties. The locations therefore point at the SWC-emitted JS
  (type annotations stripped, JSX expanded). Adding true original-source
  mapping would require Metro-side wiring that is out of scope for this
  incubator package.
- **`engine: "esbuild"` is reserved but not implemented.** Only `@swc/core`
  is wired today. The internal `NativeEngine` type leaves room for esbuild,
  but the dispatch site does not yet honour it.
- **Flow files are best-effort.** SWC cannot parse Flow; when it fails the
  transformer falls through to Babel, which handles Flow natively. If you
  rely on Flow-typed code, leave `handleJs: false` (the default) so SWC
  never tries those files in the first place.
