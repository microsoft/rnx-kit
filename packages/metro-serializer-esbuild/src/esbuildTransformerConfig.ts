import type { ExtraTransformOptions, TransformerConfigT } from "metro-config";

export const esbuildTransformerConfig: Partial<TransformerConfigT> = {
  getTransformOptions: async (): Promise<ExtraTransformOptions> => ({
    transform: {
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
    },
  }),

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
