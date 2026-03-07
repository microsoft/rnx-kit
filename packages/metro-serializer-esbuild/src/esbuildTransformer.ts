import type { Loader } from "esbuild";
import { transform as esbuildTransform } from "esbuild";
import type {
  BabelTransformerArgs,
  BabelTransformer,
} from "metro-babel-transformer";
import type { MinifierResult } from "metro-transform-worker";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { getDefine, getEsbuildTransformOptions, getSupported } from "./options";
import { patchSourceMapFilename } from "./sourceMap";
import { inferBuildTarget } from "./targets";

// marker of whether the cache key is valid. If we are using a non-standard transformer the key will change on the
// subsequent call to reflect the new upstream. To get this to happen this is used as a signal value
let cacheKeyValid = false;

const upstreamTransformer = (() => {
  let upstreamPath = "@react-native/metro-babel-transformer";
  let upstream: BabelTransformer = require(upstreamPath);

  return (babelPath?: string) => {
    if (babelPath && babelPath !== upstreamPath) {
      upstreamPath = babelPath;
      upstream = require(upstreamPath);
      cacheKeyValid = false;
    }
    return upstream;
  };
})();

export const getCacheKey = (() => {
  let cacheKey: string | null = null;
  return () => {
    if (!cacheKeyValid || !cacheKey) {
      const upstream = upstreamTransformer();
      cacheKey = createHash("sha1")
        .update(upstream.getCacheKey?.() ?? "upstream-unknown")
        .update(fs.readFileSync(__filename, { encoding: "utf-8" }))
        .update(require("esbuild/package.json").version)
        .digest("hex");
    }
    return cacheKey;
  };
})();

// Signal to @rnx-kit/babel-preset-metro-react-native that the esbuild
// transformer is active, so it can auto-select the "esbuild-transformer"
// profile and disable redundant babel plugins.
process.env["RNX_METRO_TRANSFORMER_ESBUILD"] = "1";

type WithMap<T> = T & { map?: MinifierResult["map"] };

/**
 * Determine the appropriate esbuild loader for a given filename.
 *
 * Uses `"jsx"` as the default for `.js` files because many React Native
 * ecosystem JS files contain JSX syntax. esbuild's `"jsx"` loader is a
 * superset of `"js"` so this is safe for plain JS files too.
 */
function getLoader(filename: string): Loader | null {
  if (/\.[mc]?tsx?$/.test(filename)) {
    return filename.endsWith("x") ? "tsx" : "ts";
  } else if (/\.[mc]?jsx?$/.test(filename)) {
    return filename.endsWith("x") ? "jsx" : "js";
  }
  return null;
}

/**
 * Metro transformer that uses esbuild as a first pass to strip TypeScript
 * and optionally transform JSX, then delegates to
 * `@react-native/metro-babel-transformer` for the full babel preset pipeline.
 *
 * Pipeline:
 *   1. esbuild.transform() — TS stripping, optional JSX, preserves ESM imports
 *   2. @react-native/metro-babel-transformer — babel preset, HMR, codegen, etc.
 *
 * TypeScript filenames are renamed to `.js` when passed to the upstream
 * transformer to prevent redundant TS parsing by babel.
 */
export async function transform({
  filename,
  src,
  options,
  plugins,
}: BabelTransformerArgs) {
  const esbuildOptions = getEsbuildTransformOptions(
    options.customTransformOptions
  );

  const {
    babelTransformerPath,
    jsx = "automatic",
    jsxFactory,
    jsxFragment,
    jsxImportSource = "react",
    target = inferBuildTarget(),
  } = esbuildOptions;

  // parse the file to get the loader, if non-null esbuild will be used
  const loader = getLoader(filename);

  // we will use a different filename for babel if we are mapping from TS to JS to avoid the @react-native/metro-babel-transformer
  // going down the slow codepath of trying to parse TS syntax and bypassing the hermes-parser.
  const transformedFilename =
    loader === "tsx" || loader === "ts"
      ? filename.replace(/\.[mc]?tsx?$/, ".js")
      : filename;

  if (loader) {
    const jsxDev =
      esbuildOptions.jsxDev ?? (jsx === "automatic" && options.dev);

    const esbuildResult = await esbuildTransform(src, {
      sourcefile: filename,
      loader,
      // don't downlevel here except for what is listed in the supported settings
      target: "esnext",
      supported: getSupported(target),
      jsx,
      jsxFactory,
      jsxFragment,
      jsxImportSource,
      jsxDev,
      define: getDefine(options),
      // inline sourcemaps, babel will decode and return it as a separate map object
      sourcemap: "inline",
      // turn off sources content to save memory, babel doesn't use it and metro doesn't support it
      sourcesContent: false,
      // don't minify at this stage
      minify: false,
    });

    // remember the transformed source to pass to babel
    src = esbuildResult.code;
  }

  // Delegate to upstream babel transformer with hermesParser forced on and
  const upstream = upstreamTransformer(babelTransformerPath);
  const result = await upstream.transform({
    src,
    filename: transformedFilename,
    options: {
      ...options,
      hermesParser: true,
      // experimentalImportSupport: true,
    },
    plugins,
  });

  // the exposed signatures for the babel transformer aren't correct, the map should be there but is not in the type definition
  const withMap = result as WithMap<typeof result>;
  if (withMap.map && transformedFilename !== filename) {
    // if the filename has been transformed, change source references back to the original filename
    withMap.map = patchSourceMapFilename(
      withMap.map,
      transformedFilename,
      filename
    );
  }
  return result;
}
