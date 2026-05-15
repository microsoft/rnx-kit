# test_app — end-to-end Metro bundling harness

This directory bundles the [`@rnx-kit/test-fixtures`](../../../test-fixtures)
`nodeapp` test fixture through Metro using `@rnx-kit/metro-transformer-native`,
across a matrix of configuration permutations. The same harness powers both
the correctness tests (`yarn test` with `RNX_TEST_BUNDLES=1`) and the
benchmarking CLI (`yarn bench`).

## Layout

| File | Purpose |
| --- | --- |
| `entry.js` | Bundle entry; imports nodeapp's TS source and exposes it on `globalThis.__nodeapp`. |
| `metro.config.cjs` | Metro config that reads bundle options from the environment and wires up the native transformer + optional esbuild serializer. |
| `bundle.mjs` | Worker that loads Metro, runs `Metro.runBuild`, writes the bundle to disk, and prints a JSON result. |
| `runBundle.mts` | Parent helper that spawns `bundle.mjs` in a fresh subprocess and returns the structured result. |
| `evaluateBundle.mts` | Loads a built bundle in a `vm` sandbox and exercises the nodeapp API on a small sample. |
| `permutations.mts` | Declares the matrix of `BundleOptions` permutations the harness exercises. |
| `bench.mts` | Benchmark CLI — runs each permutation N+1 times, aggregates timing/heap, emits Markdown + JSON. |
| `options.mts` | Bundle option types, env-var protocol, default values. |
| `node-shims/` | Per-built-in shim files (e.g., `fs.js`, `path.js`) that re-export Node built-ins so Metro can bundle them. |
| `dist/` | Generated bundles (one per permutation). Not committed. |
| `results/` | JSON results from `bench.mts`. Not committed. |

## Running the tests

The correctness suite (`test/test_app.test.ts`) iterates every permutation,
asserts that bundling succeeds (where expected), and verifies that the bundle
can be evaluated and `runApp` returns structurally correct output. Each
permutation spawns a fresh Metro bundle, so the suite is slow; it's gated
behind an env var:

```sh
# Default `yarn test` does NOT run these.
yarn test

# Enable the bundle suite.
RNX_TEST_BUNDLES=1 yarn test
```

The package must be built first (`yarn build`) so the harness picks up the
compiled `lib/`.

## Running the benchmark

```sh
yarn bench                 # all permutations, 3 iterations each + 1 warm-up
yarn bench --iterations 5
yarn bench --filter native-default --filter native-esbuild-treeshake
yarn bench --no-evaluate
```

The harness writes a JSON blob to `test/test_app/results/<ISO>.json` and a
bordered summary table from `@rnx-kit/tools-formatting` to stdout.

## Permutation matrix

Each entry in `permutations.mts` specifies bundle options and whether the
resulting bundle is expected to be evaluable in a vm sandbox. Permutations
currently include:

| `id` | Notes |
| --- | --- |
| `native-default` | SWC handles TS/JS, target `es2017`. The baseline native path. |
| `native-modules` | `handleModules: true` — SWC emits CommonJS. |
| `native-esbuild-treeshake` | Native + `@rnx-kit/metro-serializer-esbuild` with tree-shake on. |
| `native-minified` | Native + Metro's minifier on. |
| `native-dev` | Native + `dev: true` (HMR helpers, no minify). |
| `native-async` | Native in `asyncTransform` mode. |
| `native-disabled` | Wrapper present but `nativeTransform: false` — fallback to Babel; expected to fail on class-feature syntax. |

`target: "es2017"` is set on every native permutation because nodeapp uses
class private fields and static blocks, which the stock RN Babel preset can't
finalise on its own. Lowering to es2017 forces SWC to do the work.

## Why a subprocess?

`runBundle` spawns a fresh Node subprocess for every bundle so:

- Heap measurements are isolated from the parent's allocator pressure.
- Module-load costs (`require("metro")`, `require("@swc/core")`, etc.) appear
  in the measurement rather than being amortised by the test runner.
- The parent process can iterate permutations without leaking transformer
  state across runs (the transformer pushes options to `process.env`).

## Adding a permutation

1. Append a new entry to `PERMUTATIONS` in `permutations.mts`. The `id`
   becomes the bundle filename (`dist/<id>.bundle.js`).
2. Set `evaluate: false` if the configuration is expected to fail or produce
   a bundle that can't run under the vm-sandbox evaluator.
3. Re-run `yarn bench --filter <new-id>` to sanity-check.
