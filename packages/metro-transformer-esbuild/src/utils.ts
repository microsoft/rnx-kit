import type { TransformOptions, PluginTarget } from "@babel/core";
import type { TransformerConfigT } from "metro-config";
import { createRequire } from "node:module";
import type { TransformerPluginOptions } from "./types";

export type MakeHmrPreset = () => TransformOptions;

// create a require function that resolves from process.cwd()
const cwdRequire = createRequire(process.cwd());

/**
 * Require the module from process.cwd() if possible, falling back to this package
 * @param modulePath Module name/path to require
 */
export function requireFromCwd(
  modulePath: "@react-native/babel-preset"
): PluginTarget;
export function requireFromCwd(
  modulePath: "@react-native/babel-preset/src/configs/hmr"
): MakeHmrPreset;
export function requireFromCwd(modulePath: string): ReturnType<NodeJS.Require> {
  try {
    return cwdRequire(modulePath);
  } catch {
    return require(modulePath);
  }
}

export function toArray<T>(item: T | T[] | undefined | null): T[] {
  if (item == null) {
    return [];
  }
  return Array.isArray(item) ? item : [item];
}

export function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return (
    value != null &&
    typeof value === "object" &&
    typeof (value as Promise<T>).then === "function"
  );
}

/**
 * Lazily initializes a value using an IIFE (Immediately Invoked Function Expression)
 * @param factory Function that creates the value to be lazily initialized
 * @returns A function that returns the initialized value
 * @internal
 */
export function lazyInit<T>(factory: () => T): () => T {
  let value: T | undefined;
  return () => {
    if (value === undefined) {
      value = factory();
    }
    return value;
  };
}

/**
 * Environment variable used to pass options to the transformers.
 */
const envVarName = "RNX_TRANSFORMER_ESBUILD_OPTIONS";

/**
 * Set the transformer options for the transformer. This will serialize the options and set them in an environment
 * variable to be read by the transformer when it runs. This is necessary as the transformer may run in one or more separate
 * processes and this is a way to pass options to it.
 * @param options transformer options to set
 * @param _config optional transformer config, this is not currently used but is included for future use if needed when setting options based on the config
 */
export function setTransformerPluginOptions(
  options: TransformerPluginOptions = {},
  _config?: TransformerConfigT
) {
  // create a dynamic key if requested
  if (options.dynamicKey && typeof options.dynamicKey === "boolean") {
    options.dynamicKey = new Date().toISOString();
  }
  // now serialize the options and set them in the environment variable
  process.env[envVarName] = JSON.stringify(options);
}

/**
 * Get the transformer options for the transformer. This will read the options from the environment variable and deserialize
 * them. If no options have been set, this will return an empty object.
 * @returns transformer options
 */
export function getTransformerPluginOptions(): TransformerPluginOptions {
  const optionsStr = process.env[envVarName];
  return optionsStr ? JSON.parse(optionsStr) : {};
}
