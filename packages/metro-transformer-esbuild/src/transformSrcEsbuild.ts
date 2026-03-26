import esbuild from "esbuild";
import type { TransformOptions } from "esbuild";
import type {
  FilePluginOptions,
  TransformerArgs,
  TransformerPluginOptions,
} from "./types";

/**
 * @internal
 */
export function isTypescriptFile(filename: string): boolean {
  // is the file extension .ts, .mts, .cts, .tsx, .mtsx, or .ctsx?
  return /\.([cm]?ts)x?$/i.test(filename);
}

/**
 * @internal
 */
export function isJavaScriptFile(filename: string): boolean {
  // is the file extension .js, .mjs, or .cjs?
  return /\.([cm]?js)x?$/i.test(filename);
}

/**
 * @internal
 */
export function getTarget(options: TransformerArgs["options"]): string {
  const profile = options.unstable_transformProfile;
  if (profile === "hermes-canary" || profile === "hermes-stable") {
    // esbuild requires a versioned hermes target; use 0.12 as a conservative
    // baseline since the supported feature map (see getSupported) is what
    // actually controls which syntax is down-leveled.
    return "hermes0.12";
  }
  return "es2022";
}

/**
 * @internal
 */
export function getSupported(target: string): TransformOptions["supported"] {
  if (target.startsWith("hermes")) {
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
