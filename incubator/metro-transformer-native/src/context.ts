import { lazyInit } from "@rnx-kit/reporter";
import { filterConfigPlugins, makeTransformerArgs } from "@rnx-kit/tools-babel";
import type { BabelTransformerArgs } from "@rnx-kit/tools-babel";
import { getTrace } from "@rnx-kit/tools-performance";
import type { TransformerConfigT } from "metro-config";
import type { TransformerContext, TransformerOptions } from "./types.ts";

/**
 * Environment variable used to pass options to the transformers.
 */
const envVarName = "RNX_TRANSFORMER_NATIVE_OPTIONS";

/**
 * Environment variable set by `@rnx-kit/metro-serializer-esbuild` when its
 * `MetroSerializer` factory runs. Used to detect cooperation conflicts at
 * transformer configuration time.
 */
const ESBUILD_ENV = "RNX_METRO_SERIALIZER_ESBUILD";

/**
 * Cached options, obtained from the environment on demand
 */
export const getPluginOptions = lazyInit(() => {
  const optionsStr = process.env[envVarName];
  return optionsStr ? JSON.parse(optionsStr) : {};
});

/**
 * Pattern matching a real `codegenNativeComponent` call site. The previous
 * `src.includes("codegenNativeComponent")` check produced false positives on
 * comments, string literals, and unrelated substrings (e.g.
 * `myCodegenNativeComponentHelper`). The tightened regex requires a word
 * boundary on the left and a call (`(`) or generic-argument (`<`) on the
 * right — which matches `codegenNativeComponent("Foo", …)` and
 * `codegenNativeComponent<Props>(…)` and rejects most false positives.
 *
 * Precompiled at module scope so the per-file cost is a single regex test.
 */
const CODEGEN_PATTERN = /\bcodegenNativeComponent\s*[(<]/;

export function getTransformerArgs(args: BabelTransformerArgs) {
  const options = getPluginOptions();
  const transformerArgs = makeTransformerArgs<TransformerContext>(
    args,
    options,
    updateTransformerContext
  );
  if (!transformerArgs) return null;
  const trace = getTrace("transform");
  const filtered = trace(
    "transform filter plugins",
    filterConfigPlugins,
    transformerArgs.config,
    transformerArgs.context.configDisabledPlugins
  );
  if (filtered) {
    transformerArgs.config = filtered;
  }
  return transformerArgs;
}

export function updateTransformerContext(
  context: TransformerContext,
  args: BabelTransformerArgs
): void {
  // create a new copy of the native transform settings for this file
  const {
    srcSyntax,
    nativeTransform = true,
    handleTs = true,
    handleJs,
    handleJsx,
    handleModules,
  } = context;
  const nonLangTransforms = handleJsx || handleModules;
  // determine what work needs to be done based on native options
  if (nativeTransform) {
    if (srcSyntax === "ts" || srcSyntax === "tsx") {
      if (CODEGEN_PATTERN.test(args.src)) {
        // codegen native component calls need to go through babel
        context.nativeTransform = false;
      } else {
        context.nativeTransform = context.handleTs = handleTs;
        context.handleJsx = handleJsx && srcSyntax === "tsx";
      }
    } else {
      context.nativeTransform = handleJs && nonLangTransforms;
      context.handleJsx = handleJsx && srcSyntax === "jsx";
      context.handleTs = false;
    }
  }
  if (context.nativeTransform) {
    const disabled = (context.configDisabledPlugins ??= new Set<string>());
    if (context.handleTs) {
      disabled.add("transform-typescript");
    }
    if (context.handleJsx) {
      disabled.add("transform-react-jsx");
      disabled.add("transform-react-jsx-source");
      disabled.add("transform-react-jsx-self");
    }
    if (context.handleModules) {
      disabled.add("transform-modules-commonjs");
      disabled.add("transform-dynamic-import");
    }
  }
}

/**
 * Set the transformer options for the transformer. This will serialize the options and set them in an environment
 * variable to be read by the transformer when it runs. This is necessary as the transformer may run in one or more separate
 * processes and this is a way to pass options to it.
 * @param options transformer options to set
 * @param _config optional transformer config, this is not currently used but is included for future use if needed when setting options based on the config
 */
export function setTransformerPluginOptions(
  options: Partial<TransformerOptions> = {},
  _config?: Partial<TransformerConfigT>
) {
  // create a dynamic key if requested
  if (options.dynamicKey && typeof options.dynamicKey === "boolean") {
    options.dynamicKey = new Date().toISOString();
  }
  // setup svg mapping if required, do it here to serialize it across and have it in the cached options
  if (options.handleSvg) {
    options.parseExtAliases ??= {};
    options.parseExtAliases[".svg"] = "jsx";
  }
  // Warn when `handleModules: true` conflicts with the esbuild serializer:
  // having SWC emit CommonJS prevents esbuild from tree-shaking, defeating
  // the point of using `@rnx-kit/metro-serializer-esbuild`. The warning is
  // informational only — we do not override the user's setting.
  if (options.handleModules && process.env[ESBUILD_ENV] === "true") {
    console.warn(
      "@rnx-kit/metro-transformer-native: handleModules:true with @rnx-kit/metro-serializer-esbuild will disable tree-shaking. Set handleModules:false (the default) and rely on experimentalImportSupport instead."
    );
  }
  // now serialize the options and set them in the environment variable
  process.env[envVarName] = JSON.stringify(options);
}

// NOTE: a static list of preset plugin keys was previously kept here. It was
// removed because configDisabledPlugins is now populated dynamically by
// updateTransformerContext, and hardcoding the preset list creates drift
// against @react-native/babel-preset.
