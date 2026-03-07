import type { TransformOptions } from "esbuild";
import { transform } from "esbuild";

type BasicSourceMap = {
  version: number;
  sources: string[];
  mappings: string;
  names?: string[];
  sourceRoot?: string;
  sourcesContent?: (string | null)[];
};

type MinifierOptions = {
  code: string;
  map?: BasicSourceMap;
  filename: string;
  reserved: readonly string[];
  config: Readonly<Record<string, unknown>>;
};

type MinifierResult = {
  code: string;
  map?: BasicSourceMap;
};

/**
 * When targeting Hermes, esbuild is overly conservative about which features
 * are supported. These overrides prevent unnecessary downleveling errors.
 */
function hermesSupported(
  target: string | string[]
): TransformOptions["supported"] {
  const targets = Array.isArray(target) ? target : [target];
  if (!targets.some((t) => t.startsWith("hermes"))) {
    return undefined;
  }
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

export async function esbuildMinifier(
  options: MinifierOptions
): Promise<MinifierResult> {
  const { code, map, filename, reserved, config } = options;

  const minify = config.minify !== undefined ? Boolean(config.minify) : true;
  const minifyWhitespace =
    config.minifyWhitespace !== undefined
      ? Boolean(config.minifyWhitespace)
      : minify;
  const minifyIdentifiers =
    config.minifyIdentifiers !== undefined
      ? Boolean(config.minifyIdentifiers)
      : minify;
  const minifySyntax =
    config.minifySyntax !== undefined ? Boolean(config.minifySyntax) : minify;
  const sourceMap =
    config.sourceMap !== undefined ? Boolean(config.sourceMap) : !!map;
  const target = config.target as string | string[] | undefined;
  const pure = config.pure as string[] | undefined;
  const drop = config.drop as ("console" | "debugger")[] | undefined;

  // esbuild does not have a direct "reserved identifiers" option. When Metro
  // passes reserved names (for module-wrapping parameter names), we disable
  // identifier mangling as a safety measure.
  const safeMinifyIdentifiers = minifyIdentifiers && reserved.length === 0;

  const effectiveTarget = target ?? "hermes0.12";

  const result = await transform(code, {
    sourcefile: filename,
    loader: "js",
    target: effectiveTarget,
    supported: hermesSupported(effectiveTarget),
    minifyWhitespace,
    minifyIdentifiers: safeMinifyIdentifiers,
    minifySyntax,
    sourcemap: sourceMap ? "external" : false,
    pure,
    drop,
  });

  let outputMap: BasicSourceMap | undefined;
  if (result.map && sourceMap) {
    try {
      const parsedMap = JSON.parse(result.map) as BasicSourceMap;
      // Preserve original source map's sources and sourcesContent
      if (map) {
        parsedMap.sources = map.sources;
        parsedMap.sourcesContent = map.sourcesContent;
      }
      outputMap = parsedMap;
    } catch {
      outputMap = map;
    }
  } else {
    outputMap = map;
  }

  return {
    code: result.code,
    map: outputMap,
  };
}

// Metro calls require(minifierPath) and invokes the result directly as a
// function. This CJS assignment ensures compatibility with Metro's loader.
if (typeof module !== "undefined") {
  module.exports = esbuildMinifier;
}
