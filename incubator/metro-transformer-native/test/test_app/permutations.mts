import type { BundleOptions } from "./options.mts";

/**
 * A named permutation of {@link BundleOptions} used by the test_app harness.
 *
 * The first set of permutations exercises the native transformer. nodeapp's
 * source uses class private fields, static blocks and `.mts` files, so any
 * permutation that hands those files to Babel (e.g. `target: "es2022"`)
 * triggers Babel-side parser errors. The native transformer must therefore
 * downlevel with `target: "es2017"` for end-to-end bundling to succeed.
 */
export type Permutation = {
  /** Stable identifier (kebab-case). Used for filenames & report rows. */
  id: string;
  /** Human-readable description for logs and bench tables. */
  description: string;
  /** Bundle options to feed through `runBundle`. */
  options: BundleOptions;
  /** Whether the resulting bundle should be evaluable in a vm sandbox. */
  evaluate: boolean;
};

export const PERMUTATIONS: Permutation[] = [
  {
    id: "native-default",
    description:
      "Native transformer: SWC handles TS/JS, target es2017 to lower class features for Babel.",
    options: {
      transformer: {
        nativeTransform: true,
        handleTs: true,
        handleJs: true,
        target: "es2017",
      },
    },
    evaluate: true,
  },
  {
    id: "native-modules",
    description:
      "Native transformer + handleModules: SWC emits CommonJS; exercises Metro's standard module-wrapping path.",
    options: {
      transformer: {
        nativeTransform: true,
        handleTs: true,
        handleJs: true,
        handleModules: true,
        target: "es2017",
      },
    },
    // SWC's CommonJS module transform path. Bundle is evaluable; we just
    // exercise this so a regression that breaks the CJS emit is caught.
    evaluate: true,
  },
  {
    id: "native-esbuild-treeshake",
    description:
      "Native transformer + esbuild serializer with tree-shaking. ESM path.",
    options: {
      esbuild: true,
      treeShake: true,
      transformer: {
        nativeTransform: true,
        handleTs: true,
        handleJs: true,
        handleModules: false,
        target: "es2017",
      },
    },
    evaluate: true,
  },
  {
    id: "native-minified",
    description:
      "Native transformer with Metro's minifier on. Verifies minify pipeline.",
    options: {
      minify: true,
      transformer: {
        nativeTransform: true,
        handleTs: true,
        handleJs: true,
        target: "es2017",
      },
    },
    evaluate: true,
  },
  {
    id: "native-dev",
    description: "Native transformer, dev:true (HMR helpers, no minify).",
    options: {
      dev: true,
      transformer: {
        nativeTransform: true,
        handleTs: true,
        handleJs: true,
        target: "es2017",
      },
    },
    evaluate: true,
  },
  {
    id: "native-async",
    description:
      "Native transformer in asyncTransform mode to exercise the async source-transform path.",
    options: {
      transformer: {
        nativeTransform: true,
        handleTs: true,
        handleJs: true,
        target: "es2017",
        asyncTransform: true,
      },
    },
    evaluate: true,
  },
  {
    id: "native-disabled",
    description:
      "Wrapper present but nativeTransform:false — verifies the escape-valve falls back to Babel.",
    options: {
      transformer: {
        nativeTransform: false,
        handleTs: true,
        target: "es2017",
      },
    },
    // Babel-only path can't parse nodeapp's `.mts`/static-block sources.
    // Bundling here is expected to FAIL; we still include it in the matrix as
    // a regression check but skip the evaluate phase.
    evaluate: false,
  },
];

export function getPermutation(id: string): Permutation | undefined {
  return PERMUTATIONS.find((p) => p.id === id);
}
