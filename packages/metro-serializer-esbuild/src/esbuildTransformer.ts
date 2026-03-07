import type { EsbuildTransformerOptions } from "@rnx-kit/types-metro-serializer-esbuild";
import type { Loader, TransformOptions } from "esbuild";
import { transform as esbuildTransform } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";

const req: NodeRequire =
  typeof require === "function"
    ? require
    : // @ts-expect-error -- import.meta.url only evaluated in ESM at runtime
      createRequire(import.meta.url);

// Signal to @rnx-kit/babel-preset-metro-react-native that the esbuild
// transformer is active, so it can auto-select the "esbuild-transformer"
// profile and disable redundant babel plugins.
process.env["RNX_METRO_TRANSFORMER_ESBUILD"] = "1";

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

function isTypeScript(filename: string): boolean {
  return /\.[mc]?tsx?$/.test(filename);
}

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
export async function transform(args: BabelTransformerArgs) {
  const { filename, src, options } = args;

  const userOptions = parseEsbuildTransformerOptions(
    options.customTransformOptions,
  );

  const loader = getLoader(filename);
  const needsEsbuild = loader !== "json" && loader !== "css";

  let transformedSrc = src;
  let transformedFilename = filename;

  if (needsEsbuild) {
    const target = userOptions.target ?? "hermes0.12";
    const jsxMode = userOptions.jsx ?? "automatic";
    const jsxDev =
      userOptions.jsxDev ?? (jsxMode === "automatic" && options.dev);

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
      define: { __DEV__: String(options.dev), ...userOptions.define },
      pure: userOptions.pure,
      sourcemap: false,
      minify: false,
    });

    transformedSrc = esbuildResult.code;

    // Rename TS extensions to .js so upstream babel doesn't re-apply TS parsing
    if (isTypeScript(filename)) {
      transformedFilename = filename.replace(/\.[mc]?tsx?$/, ".js");
    }
  }

  // Delegate to upstream babel transformer with hermesParser forced on and
  // experimentalImportSupport enabled to preserve ESM imports (disables
  // @babel/plugin-transform-modules-commonjs in @react-native/babel-preset).
  const upstreamTransformer = req("@react-native/metro-babel-transformer");
  return upstreamTransformer.transform({
    ...args,
    src: transformedSrc,
    filename: transformedFilename,
    options: {
      ...args.options,
      hermesParser: true,
      experimentalImportSupport: true,
    },
  });
}

export function getCacheKey(): string {
  try {
    const esbuildPkg = req("esbuild/package.json");
    return `esbuild-transformer:${esbuildPkg.version}`;
  } catch {
    return "esbuild-transformer:unknown";
  }
}
