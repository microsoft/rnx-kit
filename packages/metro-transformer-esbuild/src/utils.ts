import type { TransformOptions, PluginTarget } from "@babel/core";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import type { TransformerConfigT } from "metro-config";
import { createRequire } from "node:module";
import path from "node:path";
import type { FilePluginOptions, TransformerPluginOptions } from "./types";

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

/** allocate this once to optimize the repeated calls */
const jsExtensions = new Set([".js", ".jsx", ".cjs", ".mjs", ".cjsx", ".mjsx"]);

/**
 * Updates the transformer plugin options with specifics for this file
 * @param envOptions The current transformer plugin options.
 * @param filename The name of the file being transformed.
 * @returns The updated transformer plugin options.
 */
export function resolveFileOptions(
  { src, filename }: BabelTransformerArgs,
  envOptions: TransformerPluginOptions
): FilePluginOptions {
  const ext = path.extname(filename).toLowerCase();
  const isTs = ext === ".ts" || ext === ".tsx";
  const isJs = jsExtensions.has(ext);
  let srcType: FilePluginOptions["srcType"] = undefined;
  let loader: FilePluginOptions["loader"] = undefined;

  if (isTs) {
    srcType = ext === ".tsx" ? "tsx" : "ts";
  } else if (isJs) {
    srcType = ext.endsWith("x") ? "jsx" : "js";
  }

  // check for codegen for applicable file types, this requires the slow path through babel
  const hasCodegen =
    srcType && srcType !== "tsx" && src.includes("codegenNativeComponent");

  // set up the loader if esbuild should run for this file
  if (srcType && !hasCodegen && (isTs || envOptions.handleJs)) {
    loader = srcType;
  }

  // if codegen, or we aren't handling jsx, or it's a js file and we're not handling js, delegate to babel
  const jsx =
    hasCodegen || !envOptions.handleJsx || (isJs && !envOptions.handleJs)
      ? "babel"
      : "esbuild";

  // return the new options object with the file specific settings
  return {
    ...envOptions,
    srcType,
    loader,
    ext,
    mode: {
      ts: hasCodegen ? "babel" : "esbuild",
      jsx,
    },
  };
}

/**
 * Helper to avoid creating new arrays unless necessary. This is the value setter with an update cache
 */
export type ArrayUpdates<T> = Record<number, T | null>;

export function setArrayValue<T>(
  index: number,
  oldValue: T,
  value: T | null,
  updates: ArrayUpdates<T>
): void {
  if (oldValue !== value) {
    updates[index] = value;
  }
}

export function getUpdatedArray<T>(base: T[], updates: ArrayUpdates<T>): T[] {
  if (Object.keys(updates).length === 0) {
    return base;
  }
  const result: T[] = [];
  for (let i = 0; i < base.length; i++) {
    const entry = i in updates ? updates[i] : base[i];
    if (entry !== null) {
      result.push(entry);
    }
  }
  return result;
}
