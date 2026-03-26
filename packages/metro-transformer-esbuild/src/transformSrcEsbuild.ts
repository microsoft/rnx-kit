import esbuild from "esbuild";
import type { Loader, TransformOptions } from "esbuild";
import type {
  FilePluginOptions,
  TransformerArgs,
  TransformerPluginOptions,
} from "./types";

function isTypescriptFile(filename: string): boolean {
  // is the file extension .ts, .mts, .cts, .tsx, .mtsx, or .ctsx?
  return /\.([cm]?ts)x?$/i.test(filename);
}

function isJavaScriptFile(filename: string): boolean {
  // is the file extension .js, .mjs, or .cjs?
  return /\.([cm]?js)x?$/i.test(filename);
}

/**
 * Get the esbuild loader to use for a given file based on the extension.
 * @param filename filename to get the loader for
 * @returns the esbuild loader to use for the file, or undefined if the file type is not supported
 */
export function getLoader(
  filename: string,
  pluginOptions: TransformerPluginOptions
): Loader | undefined {
  filename = filename.toLowerCase();
  if (isTypescriptFile(filename)) {
    return filename.endsWith("x") ? "tsx" : "ts";
  } else if (isJavaScriptFile(filename) && pluginOptions.handleJs) {
    return filename.endsWith("x") ? "jsx" : "js";
  }
  return undefined;
}

function getTarget(options: TransformerArgs["options"]): string {
  const profile = options.unstable_transformProfile;
  if (profile === "hermes-canary" || profile === "hermes-stable") {
    return "hermes";
  }
  return "es2022";
}

function getSupported(target: string): TransformOptions["supported"] {
  if (target === "hermes") {
    return {
      "const-and-let": true,
      arrow: true,
      "default-argument": true,
      destructuring: true,
      generator: true,
      "rest-argument": true,
      "template-literal": true,
    };
  }
  return undefined;
}

/**
 * Updates the transformer plugin options based on the file type and settings. In particular if handleJsx is enabled but
 * handleJs is not, disable this settings for jsx files to allow the babel transformer to handle them.
 * @param options The current transformer plugin options.
 * @param filename The name of the file being transformed.
 * @returns The updated transformer plugin options.
 */
export function updateOptions(
  options: TransformerPluginOptions,
  filename: string
): FilePluginOptions {
  filename = filename.toLowerCase();
  const result: FilePluginOptions = { ...options };
  if (isTypescriptFile(filename)) {
    result.isJsx = filename.endsWith("x");
    result.loader = result.isJsx ? "tsx" : "ts";
  } else if (isJavaScriptFile(filename)) {
    result.isJsx = filename.endsWith("x");
    if (options.handleJs) {
      result.loader = result.isJsx ? "jsx" : "js";
    } else if (options.handleJsx) {
      result.handleJsx = false;
    }
  }
  return result;
}

export function transformSrcEsbuild({
  src,
  filename,
  options,
  pluginOptions,
}: TransformerArgs): string | Promise<string> {
  // get the loader for the file, will be undefined if we should skip this file
  const { loader, handleJsx, asyncTransform } = pluginOptions;
  if (!loader) {
    return src;
  }
  const target = getTarget(options);
  const jsx = handleJsx ? "automatic" : "preserve";
  const jsxDev = Boolean(handleJsx && options.dev);

  // set up the options
  const esbuildOptions: TransformOptions = {
    sourcefile: filename,
    loader,
    target,
    supported: getSupported(target),
    jsx,
    jsxDev,
    define: { __DEV__: String(options.dev) },
    minify: false,
    sourcemap: "inline",
  };

  // do the actual transform
  if (asyncTransform) {
    return esbuild.transform(src, esbuildOptions).then((result) => result.code);
  } else {
    const result = esbuild.transformSync(src, esbuildOptions);
    return result.code;
  }
}
