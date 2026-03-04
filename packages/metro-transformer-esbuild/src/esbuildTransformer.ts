import type { EsbuildTransformerOptions } from "@rnx-kit/types-transformer-esbuild";
import type { Loader, TransformOptions } from "esbuild";
import { transform as esbuildTransform } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";

const req: NodeRequire =
  typeof require === "function"
    ? require
    : // @ts-expect-error -- import.meta.url only evaluated in ESM at runtime
      createRequire(import.meta.url);

type BabelTransformerArgs = {
  readonly filename: string;
  readonly options: {
    readonly customTransformOptions?: Record<string, unknown>;
    readonly dev: boolean;
    readonly enableBabelRCLookup?: boolean;
    readonly enableBabelRuntime: boolean | string;
    readonly experimentalImportSupport?: boolean;
    readonly hermesParser?: boolean;
    readonly minify: boolean;
    readonly platform: string | null;
    readonly projectRoot: string;
    readonly publicPath: string;
    readonly globalPrefix: string;
    readonly unstable_transformProfile?:
      | "default"
      | "hermes-stable"
      | "hermes-canary";
  };
  readonly plugins?: unknown;
  readonly src: string;
};

/**
 * Determine the appropriate esbuild loader for a given filename.
 *
 * Uses `"jsx"` as the default for `.js` files because many React Native
 * ecosystem JS files contain JSX syntax. esbuild's `"jsx"` loader is a
 * superset of `"js"` so this is safe for plain JS files too.
 */
function getLoader(filename: string): Loader {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".mts":
    case ".cts":
      return "ts";
    case ".tsx":
    case ".mtsx":
    case ".ctsx":
      return "tsx";
    case ".jsx":
    case ".mjsx":
    case ".cjsx":
      return "jsx";
    case ".json":
      return "json";
    case ".css":
      return "css";
    case ".js":
    case ".mjs":
    case ".cjs":
    default:
      return "jsx";
  }
}

/**
 * When targeting Hermes, esbuild is overly conservative about which features
 * are supported. These overrides tell esbuild that Hermes supports these
 * features natively, avoiding unnecessary downleveling errors.
 *
 * @see https://github.com/evanw/esbuild/releases/tag/v0.14.49
 */
function hermesSupported(
  target: string | string[],
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

function parseEsbuildTransformerOptions(
  customTransformOptions?: Record<string, unknown>,
): EsbuildTransformerOptions {
  const raw = customTransformOptions?.["esbuildTransformer"];
  if (typeof raw === "object" && raw !== null) {
    return raw as EsbuildTransformerOptions;
  }
  return {};
}

/**
 * Metro transformer that uses esbuild for TypeScript/JSX transpilation and
 * hermes-parser for producing the Babel-compatible AST that Metro requires.
 *
 * This is a standalone transformer — it does NOT delegate to
 * `@react-native/metro-babel-transformer`. The pipeline is:
 *   1. esbuild.transform() — TS stripping, JSX transform, ES downleveling
 *   2. hermes-parser.parse() with { babel: true } — produces Babel AST
 *
 * Metro's `metro-transform-worker` will then run `collectDependencies` and
 * `generateFunctionMap` on the returned AST.
 */
export async function transform(args: BabelTransformerArgs) {
  const { filename, src, options } = args;

  const userOptions = parseEsbuildTransformerOptions(
    options.customTransformOptions,
  );

  const loader = getLoader(filename);
  const target = userOptions.target ?? "hermes0.12";
  const jsxMode = userOptions.jsx ?? "automatic";

  // Default jsxDev to Metro's dev flag when using automatic JSX runtime
  const jsxDev =
    userOptions.jsxDev ?? (jsxMode === "automatic" && options.dev);

  // Always inject __DEV__ based on Metro's dev flag
  const define: Record<string, string> = {
    __DEV__: String(options.dev),
    ...userOptions.define,
  };

  // Run esbuild transpilation
  const esbuildResult = await esbuildTransform(src, {
    sourcefile: filename,
    loader,
    target,
    supported: hermesSupported(target),
    jsx: jsxMode,
    jsxFactory: userOptions.jsxFactory,
    jsxFragment: userOptions.jsxFragment,
    jsxImportSource: userOptions.jsxImportSource ?? "react",
    jsxDev,
    define,
    pure: userOptions.pure,
    // Metro regenerates source maps from the AST, no need to generate here.
    sourcemap: false,
    // Do not minify during transform — minification is a separate step.
    minify: false,
  });

  // Parse the transpiled code with hermes-parser to produce a Babel-compatible
  // AST. Metro's collectDependencies and generateFunctionMap expect this format.
  const hermesParser = req("hermes-parser");
  const ast = hermesParser.parse(esbuildResult.code, {
    babel: true,
    sourceType: "module",
    sourceFilename: filename,
  });

  return { ast, metadata: {} };
}

export function getCacheKey(): string {
  try {
    const esbuildPkg = req("esbuild/package.json");
    const hermesPkg = req("hermes-parser/package.json");
    return `esbuild-transformer:${esbuildPkg.version}+hermes-parser:${hermesPkg.version}`;
  } catch {
    return "esbuild-transformer:unknown";
  }
}
