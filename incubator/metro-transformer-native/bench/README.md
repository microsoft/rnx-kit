# `@rnx-kit/metro-transformer-native` benchmarks

This directory holds the benchmark harness and the real-Metro-bundle smoke
tests for the native transformer. None of this code ships with the package
(`files` in `package.json` only includes `lib/`); it exists to validate
README goal #1 (transformation speed) and README goal #7 (esbuild-serializer
tree-shake interoperability).

## Prerequisites

- Node.js 22.6+ (for `--experimental-strip-types`).
- The package must be built first: `yarn build` in the package root. The
  harness imports compiled `lib/` so the measurements reflect the same
  module shape Metro would load in a real project.

## Quick start

```sh
# Build once, then run the warm-loop benchmark.
yarn build
node --experimental-strip-types bench/run.ts --scenario warm

# Cold-start probe (forks a worker per transformer).
node --experimental-strip-types bench/run.ts --scenario cold

# Both scenarios.
node --experimental-strip-types bench/run.ts --scenario all

# Real-Metro-bundle smoke tests (Task 5.3).
node --experimental-strip-types bench/run.ts --scenario bundle
# or directly:
node --experimental-strip-types bench/bundle.ts
node --experimental-strip-types bench/bundle-esbuild.ts

# Compatibility regression diff (Task 5.4).
node --experimental-strip-types bench/bundle-compare.ts
```

## CLI

| Flag               | Description                                                      | Default                  |
| ------------------ | ---------------------------------------------------------------- | ------------------------ |
| `--scenario <s>`   | `warm`, `cold`, `cold-start`, `all`, or `bundle`                 | `warm`                   |
| `--corpus <path>`  | Directory to walk recursively for `.ts/.tsx/.js/.jsx` files      | `test/__fixtures__` (×5) |
| `--iterations <n>` | Warm iterations including the discarded warm-up                  | `5`                      |
| `--check`          | Exit non-zero on any threshold breach in `bench/thresholds.json` | off                      |

Environment variables:

- `RNX_BENCH_PROJECT_ROOT=<path>` — corpus becomes `<path>/src/**/*.{ts,tsx,js,jsx}`. Useful for measuring against a real app source tree.

## Scenarios

### Warm (`--scenario warm`)

In-process loop. The harness loads each transformer once, then runs the
corpus `--iterations` times. Iteration 0 is discarded as warm-up
(defeats JIT tier-up and lazy-init effects). Iterations 1..N-1 are
aggregated into mean / p50 / p95 / p99 per category (`ts`, `tsx`, `js`,
`jsx`) and overall, plus heap-delta. A second table reports the
`native-swc / baseline-rn` ratios per category.

### Cold-start (`--scenario cold` / `cold-start`)

`child_process.fork`s a worker per transformer. Each worker requires the
transformer for the first time (capturing `@swc/core`, `hermes-parser`,
`@babel/core`, the preset, etc.), invokes `transform()` exactly once on a
small TS fixture, and reports wall time + heap delta back through IPC.
This is the metric that matters for `metro --reset-cache` runs and for
benchmarking the SWC engine warm-up tail.

### Bundle (`--scenario bundle`)

Runs `bench/bundle.ts` and `bench/bundle-esbuild.ts` (see Task 5.3 below).

## Reproducibility

Acceptance for Task 5.1 is that `p95/p50 < 1.5` across consecutive
invocations on the same machine. Drivers of variance:

- The warm-up iteration is critical. Removing it causes p95 to spike
  because the first call into either transformer pays for module init,
  parser warm-up, and HMR plugin registration.
- The corpus is loaded once and replicated 5× by default to avoid the
  measurement being dominated by 1–2 outlier files.
- Heap reports are best-effort; we do NOT force-GC between transformers
  because doing so would mask real allocator pressure.

## Threshold check (`--check`)

`bench/thresholds.json` defines pass/fail ratios. The defaults are
**placeholders** intended to be calibrated from the first stable
measurement run before turning `--check` on in CI.

| Scenario                    | Metric                    | Threshold |
| --------------------------- | ------------------------- | --------- |
| Warm per-file mean (TS/TSX) | `native_ms / rn_ms`       | ≤ 0.70    |
| Warm per-file mean (JS/JSX) | `native_ms / rn_ms`       | ≤ 0.90    |
| Cold-start                  | `native_ms / rn_ms`       | ≤ 1.30    |
| Peak heap                   | `native_bytes / rn_bytes` | ≤ 1.50    |

If any check fails, `run.ts` exits non-zero and prints the breached
metrics.

## Output

- **stdout**: markdown summary, safe to redirect.
- **stderr**: progress chatter (corpus size, results-file path, threshold messages).
- **`bench/results/<ISO-timestamp>.json`**: machine-readable blob with
  the full per-category aggregate, suitable for diffing across runs or
  feeding into a perf dashboard.

## Real-Metro-bundle smoke tests (Task 5.3)

`bench/bundle.ts` runs `Metro.runBuild` against
`bench/fixtures/test-app-shim/` using the native transformer.
Acceptance: the bundle is non-empty and contains the Metro runtime
markers `__r(` and `__d(`.

`bench/bundle-esbuild.ts` runs the same fixture with the
`@rnx-kit/metro-serializer-esbuild` serializer and asserts that the
unused export `TREE_SHAKE_ME_MARKER` is eliminated from the bundle.

The shim app keeps Metro happy without a full RN environment:

- `index.js` is the registered entry file.
- `App.tsx` exports both a used React component and an unused
  `treeShakeMe` constant.
- `metro.config.js` / `metro.config.esbuild.js` wire the appropriate
  transformer and (for esbuild) the custom serializer.

## Compatibility regression diff (Task 5.4)

`bench/bundle-compare.ts` builds the shim twice — once with the native
transformer, once with `@react-native/metro-babel-transformer` — and
diffs the two bundles modulo whitespace and module IDs. The allowlist in
`bench/diff-allowlist.json` enumerates expected differences (JSX runtime
call form, type-erased lines). Acceptance: diff score under 5% of total
lines.

## CI integration policy (Task 5.6)

These are the policies the bench harness is designed for. The
corresponding YAML lives in the repo's CI config and is owned by repo
maintainers — this README documents the contract.

| Job                            | When                                                                                                 | Gating?                                                                   | Source                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| Unit + integration tests       | every PR                                                                                             | yes                                                                       | `yarn test`                                  |
| Bundle smoke + esbuild interop | every PR                                                                                             | yes                                                                       | `bench/bundle.ts`, `bench/bundle-esbuild.ts` |
| Benchmark (`run.ts --check`)   | nightly + PRs touching `incubator/metro-transformer-native/src/**` or `incubator/tools-babel/src/**` | non-gating for 30 days, then flip `--check` on with calibrated thresholds | `bench/run.ts --scenario all --check`        |
| Compatibility regression       | weekly                                                                                               | non-gating, artifact-only                                                 | `bench/bundle-compare.ts`                    |

The benchmark job posts its markdown summary as a PR comment; the JSON
blob is uploaded as an artifact for trend analysis. When `--check` is
finally turned on, the thresholds in `bench/thresholds.json` MUST have
been calibrated from at least two weeks of stable nightly runs.
