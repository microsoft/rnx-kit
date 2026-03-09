# @rnx-kit/esbuild-service

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A Metro-independent, esbuild-based bundler for React Native.

## Motivation: Metro vs. esbuild

[Metro](https://facebook.github.io/metro/) is the standard bundler for React
Native. It is reliable, battle-tested, and deeply integrated into the React
Native toolchain. However, Metro was designed around CommonJS semantics and
Babel transformations. This makes it slower at scale and harder to integrate
with modern tooling.

[esbuild](https://esbuild.github.io/) is an extremely fast JavaScript bundler
written in Go. It handles TypeScript and JSX natively, provides excellent tree-
shaking, and produces source maps with minimal overhead.

This package explores using esbuild as a **complete replacement for Metro**
rather than just its serialization step (which is what
[`@rnx-kit/metro-serializer-esbuild`](../packages/metro-serializer-esbuild)
does).

---

## Metro component analysis

The table below maps each Metro component to its esbuild equivalent and
explains how much code must be reimplemented.

| Metro component | Can esbuild replace it? | Notes |
|---|---|---|
| **Transformer** (Babel / Flow) | ✅ Yes — natively | esbuild supports TypeScript and JSX out of the box. Flow types can be stripped with a simple plugin. Babel is no longer needed for the common case. |
| **Dependency graph** | ✅ Yes — natively | esbuild builds its own dependency graph as part of bundling. |
| **Tree-shaking** | ✅ Yes — natively | esbuild performs dead code elimination (DCE) automatically for ESM code. |
| **Minifier** | ✅ Yes — natively | esbuild has a built-in, high-performance minifier. |
| **Source maps** | ✅ Yes — natively | esbuild generates linked or inline source maps. |
| **Serializer** | ✅ Yes — natively | esbuild produces the final bundle; this is the role of `metro-serializer-esbuild`. |
| **Resolver** (platform extensions, `react-native` field) | ⚠️ Plugin required | The `reactNativeResolver` plugin in this package reimplements Metro's platform-extension resolution (`.ios.js`, `.android.js`, `.native.js`) and the `react-native` → `module` → `browser` → `main` field priority from `package.json`. ~250 lines of code. |
| **Pre-modules / polyfills** | ⚠️ Plugin required | The `reactNativePolyfills` plugin reimplements Metro's `preModules` mechanism by injecting a virtual entry-point that sets up `global`, `__DEV__`, and any user-provided polyfills. ~110 lines of code. |
| **Asset handling** | ⚠️ Plugin required | Metro's asset system resolves image/font imports to an asset registry lookup. An esbuild plugin can replicate this, but it is not yet included in this package. |
| **Dev server + HMR** | ❌ Cannot replace | Metro's development server implements React Native's fast-refresh / HMR protocol. esbuild has a basic HTTP server mode but no HMR support. |
| **RAM bundles** | ❌ Cannot replace | Metro's indexed RAM bundle format has no esbuild equivalent. |
| **Lazy module loading** | ❌ Cannot replace | Metro's async require / lazy-loading mechanism requires a custom module loader runtime that esbuild does not provide. |

### Code reuse from `@rnx-kit/metro-serializer-esbuild`

| Component | Reuse? | Notes |
|---|---|---|
| `targets.ts` — Hermes target inference | ✅ Copied | Identical logic; infers the right `hermesX.Y` esbuild target from the installed `react-native` version. |
| `getSideEffects` from `module.ts` | ✅ Concept reused | The `sideEffects` package.json field logic applies equally to a standalone esbuild bundler; esbuild respects it natively through its own side-effects handling. |
| `esbuildTransformerConfig` | ❌ Not applicable | That export configures Metro's Babel transformer to be esbuild-friendly. It is not relevant when Metro is removed entirely. |
| `index.ts` — the custom serializer | ❌ Not applicable | The serializer depends on Metro's dependency graph API and cannot be reused. |
| `sourceMap.ts` — Metro source map helpers | ❌ Not applicable | These helpers wrap Metro's source-map utilities; not needed without Metro. |

---

## Installation

```sh
yarn add --dev @rnx-kit/esbuild-service
```

## Usage

```typescript
import { bundle } from "@rnx-kit/esbuild-service";

await bundle({
  entryFile: "index.js",
  platform: "ios",
  dev: false,
  bundleOutput: "dist/main.ios.jsbundle",
  sourcemapOutput: "dist/main.ios.jsbundle.map",
});
```

## API

### `bundle(options)`

Bundles a React Native application using esbuild, without Metro.

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `entryFile` | `string` | required | Path to the entry file. |
| `platform` | `AllPlatforms` | required | Target platform (`android`, `ios`, `macos`, `windows`, …). |
| `dev` | `boolean` | `false` | Bundle in development mode. |
| `minify` | `boolean` | `!dev` | Minify the output. |
| `bundleOutput` | `string` | required | Path to write the bundle to. |
| `sourcemapOutput` | `string` | — | Path to write the source map to. |
| `target` | `string \| string[]` | Auto-detected | esbuild target (e.g. `"hermes0.12"`). |
| `plugins` | `Plugin[]` | `[]` | Extra esbuild plugins. |
| `projectRoot` | `string` | `process.cwd()` | Project root directory. |
| `logLevel` | esbuild log level | `"warning"` | esbuild log level. |
| `drop` | esbuild drop | — | Drop `debugger` or `console` calls. |
| `pure` | `string[]` | — | Mark calls as side-effect free. |

### `reactNativeResolver(platform, mainFields?)`

An esbuild plugin that adds React Native–specific module resolution:

- Platform-specific file extensions (`.ios.ts`, `.android.ts`, `.native.ts`, …)
- `react-native` → `module` → `browser` → `main` field priority in `package.json`

```typescript
import { reactNativeResolver } from "@rnx-kit/esbuild-service";
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["index.ts"],
  bundle: true,
  plugins: [reactNativeResolver("ios")],
  outfile: "dist/bundle.js",
});
```

### `reactNativePolyfills(options)`

An esbuild plugin that injects React Native globals (`global`, `__DEV__`) and
optional polyfills as a virtual entry-point before your application code.

```typescript
import { reactNativePolyfills } from "@rnx-kit/esbuild-service";
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["index.ts"],
  bundle: true,
  plugins: [
    reactNativePolyfills({
      entryFile: "index.ts",
      dev: false,
      polyfills: ["./polyfills/myPolyfill.js"],
    }),
  ],
  outfile: "dist/bundle.js",
});
```

### `inferBuildTarget(projectRoot?)`

Infers the appropriate esbuild target string for the installed version of
`react-native` / Hermes.

```typescript
import { inferBuildTarget } from "@rnx-kit/esbuild-service";

const target = inferBuildTarget(); // e.g. "hermes0.12"
```

## Known Limitations

- **Dev server / HMR** — use Metro for development; this package targets
  production bundling only.
- **RAM bundles** — not supported. Use Metro if you need indexed RAM bundles.
- **Asset handling** — image and font imports are not yet handled. Contributions
  welcome.
- **Flow types** — esbuild cannot strip Flow types natively. You'll need a Flow-
  stripping Babel transform or a third-party esbuild plugin if your code uses
  Flow.
