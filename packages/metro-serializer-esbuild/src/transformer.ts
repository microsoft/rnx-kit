import type { SerializerEsbuildConfig } from "@rnx-kit/types-metro-serializer-esbuild";
import type { TransformerConfigT } from "metro-config";

export function configureTransformer(
  config: SerializerEsbuildConfig = {},
  userOptions?: Partial<TransformerConfigT>,
): Partial<TransformerConfigT> {
  const { minifyStrategy = "serializer" } = config;
  const env = process.env.BABEL_ENV || process.env.NODE_ENV;
  const isProduction = env === "production";

  const { getTransformOptions: userGetTransformOptions, ...otherUserOptions } =
    userOptions || {};

  return {
    getTransformOptions: async (entryPoints, options, getDependenciesOf) => {
      // get upstream transform options from the user-provided function if it exists
      const upstreamOptions = userGetTransformOptions
        ? await userGetTransformOptions(entryPoints, options, getDependenciesOf)
        : {};

      return {
        ...upstreamOptions,
        transform: {
          /**
           * Disable `import-export-plugin` to preserve ES6 import/export syntax.
           *
           * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro-transform-worker/src/index.js#L315
           */
          experimentalImportSupport: !options.dev,

          /**
           * Disable `inline-requires` as it is only used to inline `require()`
           * calls.
           *
           * @see https://github.com/facebook/metro/blob/598de6f537f4d7286cee89094bcdb7101e8e4f17/packages/metro-transform-worker/src/index.js#L319
           */
          inlineRequires: false,

          // add back any user-provided transform options, allowing user options to take precedence
          ...upstreamOptions.transform,
        },
      };
    },

    /**
     * Delegate to esbuild unless the user has explicitly chosen to use Metro's default minifier
     */
    minifierPath:
      minifyStrategy === "serializer" ? require.resolve("./minify") : undefined,

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
    unstable_disableModuleWrapping: isProduction,

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

    // apply other transformer options on top, allowing user options to take precedence
    ...otherUserOptions,
  };
}

export const esbuildTransformerConfig = configureTransformer();
