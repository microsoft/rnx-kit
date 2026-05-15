import type { TransformerOptions } from "../../src/types.ts";

/**
 * Environment variable used to pass bundle options from the parent runner
 * to the bundle.mjs subprocess. Keep the name in sync with metro.config.cjs.
 */
export const ENV_OPTIONS = "RNX_NODEAPP_TEST_OPTIONS";

export type ResolvedBundleOptions = {
  /** Metro dev mode. @default false */
  dev: boolean;
  /** Run Metro's minifier on the resulting bundle. @default false */
  minify: boolean;
  /** Run the esbuild serializer's tree-shake. @default false */
  treeShake: boolean;
  /** Use the @rnx-kit/metro-serializer-esbuild serializer. @default false */
  esbuild: boolean;
  /**
   * Relative or absolute path the bundle worker writes the bundle to.
   * Relative paths are resolved against test_app/. @default "./dist/index.bundle.js"
   */
  bundleOut: string;
  /**
   * MetroTransformerNative options. When undefined the harness omits the
   * MetroTransformerNative wrapper entirely so Metro falls back to the stock
   * @react-native/metro-babel-transformer — that's our baseline.
   */
  transformer?: TransformerOptions;
};
export type BundleOptions = Partial<ResolvedBundleOptions>;

export type BundleErrorInfo = {
  message: string;
  stack?: string;
  name?: string;
};

export type BundleResult = {
  success: boolean;
  options?: ResolvedBundleOptions;
  bundlePath?: string;
  bytes?: number;
  heap: number;
  error?: BundleErrorInfo;
  times: {
    /** Time spent loading + resolving the Metro config. */
    load: number;
    /** Time spent in Metro.runBuild. */
    bundle: number;
    /** load + bundle (i.e. wall time, not including process startup). */
    total: number;
  };
};

export function initResult(): BundleResult {
  return {
    success: false,
    heap: 0,
    times: {
      load: 0,
      bundle: 0,
      total: 0,
    },
  };
}

const defaultOptions: ResolvedBundleOptions = {
  dev: false,
  minify: false,
  treeShake: false,
  esbuild: false,
  bundleOut: "./dist/index.bundle.js",
};

/**
 * Build the env mapping the bundle subprocess should be spawned with.
 */
export function getEnvSettings(
  options?: BundleOptions
): Record<string, string> {
  return {
    [ENV_OPTIONS]: JSON.stringify(options ?? {}),
  };
}

/**
 * Get the resolved options from the environment.
 */
export function getEnvOptions(): ResolvedBundleOptions {
  const fromEnv = process.env[ENV_OPTIONS] as string | undefined;
  const envOptions: BundleOptions = fromEnv ? JSON.parse(fromEnv) : {};
  return {
    ...defaultOptions,
    ...envOptions,
  };
}
