import esbuild from "esbuild";
import type { TransformOptions } from "esbuild";
import type { TransformerArgs } from "./types";

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

export function transformSrcEsbuild({
  src,
  filename,
  options,
  pluginOptions,
}: TransformerArgs): string | Promise<string> {
  // get the loader for the file, will be undefined if we should skip this file
  const { loader, mode, asyncTransform } = pluginOptions;
  if (!loader) {
    return src;
  }
  const target = getTarget(options);
  const jsx = mode.jsx === "esbuild" ? "automatic" : "preserve";
  const jsxDev = Boolean(mode.jsx === "esbuild" && options.dev);

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
