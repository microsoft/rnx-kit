import type { SerializerEsbuildConfig } from "@rnx-kit/types-metro-serializer-esbuild";
import type {
  TransformerConfigT,
  GetTransformOptions,
  ExtraTransformOptions,
} from "metro-config";
import {
  createEsbuildTransformOptions,
  type EsbuildTransformOptions,
  CUSTOM_OPTIONS_KEY,
} from "./options";

type ExtendedTransformOptions = ExtraTransformOptions & {
  transform?: ExtraTransformOptions["transform"] & {
    customTransformOptions?: Record<string, unknown>;
  };
};

export function createGetTransformOptions(
  upstream?: GetTransformOptions,
  customOptions?: EsbuildTransformOptions
): GetTransformOptions {
  return async (entryPoints, options, getDependenciesOf) => {
    const upstreamOptions: ExtendedTransformOptions = upstream
      ? await upstream(entryPoints, options, getDependenciesOf)
      : {};

    return {
      ...upstreamOptions,
      transform: {
        ...upstreamOptions.transform,

        /**
         * Disable `import-export-plugin` to preserve ES6 import/export syntax.
         *
         * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro-transform-worker/src/index.js#L315
         */
        experimentalImportSupport: false,

        /**
         * Disable `inline-requires` as it is only used to inline `require()`
         * calls.
         *
         * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro-transform-worker/src/index.js#L319
         */
        inlineRequires: false,

        /**
         * Add custom transformer options if any need to be stored and serialized to the transformers
         */
        ...(customOptions && {
          customTransformOptions: {
            ...upstreamOptions.transform?.customTransformOptions,
            [CUSTOM_OPTIONS_KEY]: customOptions,
          },
        }),
      },
    };
  };
}

export const esbuildTransformerConfig: Partial<TransformerConfigT> = {
  getTransformOptions: createGetTransformOptions(),

  /**
   * Minifying is unnecessary as esbuild will take care of it.
   */
  minifierPath: require.resolve("./minify"),

  /**
   * Metro transforms `require(...)` calls to
   * `$$_REQUIRE(dependencyMap[n], ...)` in two steps. In `collectDependencies`,
   * it adds the `dependencyMap[n]` parameter so the call becomes
   * `require(dependencyMap[n], ...)`. Then it renames the call in
   * `JsFileWrapping.wrapModule`. This flag will disable both transformations.
   *
   * Note that this setting is experimental and may be removed in a future
   * version.
   *
   * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro-transform-worker/src/index.js#L388
   * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro-transform-worker/src/index.js#L410
   * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro-transform-worker/src/index.js#L564
   * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro/src/ModuleGraph/worker/collectDependencies.js#L467
   * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro/src/ModuleGraph/worker/JsFileWrapping.js#L28
   * @see https://github.com/facebook/metro/commit/598de6f537f4d7286cee89094bcdb7101e8e4f17
   */
  unstable_disableModuleWrapping: true,

  /**
   * Both of these disable the `normalizePseudoGlobals` plugin. This is needed
   * to prevent Metro from renaming globals.
   *
   * Note that this setting is experimental and may be removed in a future
   * version.
   *
   * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro-transform-worker/src/index.js#L434
   * @see https://github.com/facebook/metro/commit/5b913fa0cd30ce5b90e2b1f6318454fbdd170708
   */
  unstable_disableNormalizePseudoGlobals: true,
  optimizationSizeLimit: 0,
};

export function configureTransformer(
  config: SerializerEsbuildConfig = {},
  userOptions?: Partial<TransformerConfigT>
): Partial<TransformerConfigT> {
  // this will only be defined if we are using esbuild as a front end transformer
  const customOptions = createEsbuildTransformOptions(config, userOptions);

  // configure the getTransformOptions to set the required values while passing through the user configured values.
  // if customOptions are needed they will also be returned via this function to be passed to transformer workers
  const getTransformOptions = createGetTransformOptions(
    userOptions?.getTransformOptions,
    customOptions
  );

  // now return the built up transformer configuration
  return {
    // start with the user options as the options we need to set need to take precedence
    ...userOptions,

    // set the standard esbuild transformer options
    ...esbuildTransformerConfig,

    // finish with the custom getTransformOptions that handles both upstream settings and custom transformer options
    getTransformOptions,

    // if esbuild transformation is enabled, use our custom transformer instead of upstream. The previous babelTransformerPath
    // (if set) will have been stored in customOptions to be used by the esbuild transformer
    ...(customOptions && {
      babelTransformerPath: require.resolve("./esbuildTransformer"),
    }),
  };
}
