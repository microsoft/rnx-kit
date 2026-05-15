import type { TransformerOptions } from "../../src/types.ts";

export const ENV_OPTIONS = "RNX_NODEAPP_TEST_OPTIONS";

export type ResolvedBundleOptions = {
  dev: boolean;
  minify: boolean;
  treeShake: boolean;
  esbuild: boolean;
  bundleOut: string;
  transformer?: TransformerOptions;
};
export type BundleOptions = Partial<ResolvedBundleOptions>;

export type BundleResult = {
  success: boolean;
  error?: Error;
  times: {
    load: number;
    bundle: number;
    total: number;
  };
};

export function initResult(): BundleResult {
  return {
    success: false,
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
 * Set the options in the environment to pass to a child process and to the metro config
 * @param options bundle options to set
 */
export function getEnvSettings(
  options?: BundleOptions
): Record<string, string> | undefined {
  if (options) {
    return {
      [ENV_OPTIONS]: JSON.stringify(options),
    };
  }
  return undefined;
}

/**
 * Get the resolved options from the environment
 * @returns resolved bundle options
 */
export function getEnvOptions(): ResolvedBundleOptions {
  const fromEnv = process.env[ENV_OPTIONS] as string;
  const envOptions = fromEnv ? JSON.parse(fromEnv) : {};
  return {
    ...defaultOptions,
    ...envOptions,
  };
}
