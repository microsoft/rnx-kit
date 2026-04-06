import { lazyInit } from "@rnx-kit/reporter";
import { makeTransformerArgs } from "@rnx-kit/tools-babel";
import type { BabelTransformerArgs } from "@rnx-kit/tools-babel";
import type { TransformerConfigT } from "metro-config";
import type { TransformerContext, TransformerOptions } from "./types";

/**
 * Environment variable used to pass options to the transformers.
 */
const envVarName = "RNX_TRANSFORMER_ESBUILD_OPTIONS";

/**
 * Cached options, obtained from the environment on demand
 */
export const getPluginOptions = lazyInit(() => {
  const optionsStr = process.env[envVarName];
  return optionsStr ? JSON.parse(optionsStr) : {};
});

export function getTransformerArgs(args: BabelTransformerArgs) {
  const options = getPluginOptions();
  return makeTransformerArgs<TransformerContext>(
    args,
    options,
    updateTransformerContext
  );
}

export function updateTransformerContext(context: TransformerContext): void {
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
      context.nativeTransform = context.handleTs = handleTs;
      context.handleJsx = handleJsx && srcSyntax === "tsx";
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
  // now serialize the options and set them in the environment variable
  process.env[envVarName] = JSON.stringify(options);
}

export const presetKeys = [
  "transform-flow-strip-types",
  "syntax-hermes-parser",
  "transform-flow-enums",
  "transform-block-scoping",
  "transform-class-properties",
  "transform-private-methods",
  "transform-private-property-in-object",
  "syntax-dynamic-import",
  "syntax-export-default-from",
  "syntax-nullish-coalescing-operator",
  "syntax-optional-chaining",
  "transform-unicode-regex",
  "warn-on-deep-imports",
  "transform-react-jsx",
  "proposal-export-default-from",
  "transform-modules-commonjs",
  "transform-classes",
  "transform-arrow-functions",
  "transform-computed-properties",
  "transform-parameters",
  "transform-shorthand-properties",
  "transform-optional-catch-binding",
  "transform-function-name",
  "transform-literals",
  "transform-numeric-separator",
  "transform-sticky-regex",
  "transform-destructuring",
  "transform-spread",
  "transform-object-rest-spread",
  "transform-async-generator-functions",
  "transform-async-to-generator",
  "transform-react-display-name",
  "transform-optional-chaining",
  "transform-nullish-coalescing-operator",
  "transform-logical-assignment-operators",
  "transform-react-jsx-source",
  "transform-react-jsx-self",
  "transform-runtime",
];
