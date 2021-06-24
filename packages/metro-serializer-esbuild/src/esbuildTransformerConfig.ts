import type { ExtraTransformOptions, TransformerConfigT } from "metro-config";

export const esbuildTransformerConfig: Partial<TransformerConfigT> = {
  getTransformOptions: async (): Promise<ExtraTransformOptions> => ({
    transform: {
      /**
       * Disable `import-export-plugin` to preserve ES6 import/export syntax.
       *
       * @see https://github.com/facebook/metro/blob/4ccb059351313f78bc0b1f4419e6ff85dc911514/packages/metro-transform-worker/src/index.js#L303
       */
      experimentalImportSupport: false,

      /**
       * Disable `inline-requires` as it is only used to inline `require()`
       * calls.
       *
       * @see https://github.com/facebook/metro/blob/4ccb059351313f78bc0b1f4419e6ff85dc911514/packages/metro-transform-worker/src/index.js#L307
       */
      inlineRequires: false,
    },
  }),

  /**
   * Minifying is unnecessary as esbuild will take care of it.
   */
  minifierPath: "@rnx-kit/metro-serializer-esbuild/lib/minify.js",

  /**
   * `collectDependencies` creates a list of all dependencies. Metro's
   * implementation also rewrites import/export statements to use their
   * `require` polyfill. Our implementation preserves them so esbuild can
   * perform tree shaking.
   *
   * Note that this setting is still experimental and may be removed in a future
   * version.
   *
   * @see https://github.com/facebook/metro/blob/4ccb059351313f78bc0b1f4419e6ff85dc911514/packages/metro/src/ModuleGraph/worker/collectDependencies.js#L467
   * @see https://github.com/facebook/metro/commit/648224146e58bcc5e4a0a072daff34b0c42cafa6
   */
  unstable_collectDependenciesPath:
    "@rnx-kit/metro-serializer-esbuild/lib/collectDependencies.js",

  /**
   * Both of these disable the `normalizePseudoGlobals` plugin. This is needed
   * to prevent Metro from renaming globals.
   *
   * Note that this setting is still experimental and may be removed in a future
   * version.
   *
   * @see https://github.com/facebook/metro/blob/4fea2bd5a72c7c3e3030adc07a0dd97322e63c5a/packages/metro-transform-worker/src/index.js#L401
   * @see https://github.com/facebook/metro/commit/5b913fa0cd30ce5b90e2b1f6318454fbdd170708
   */
  unstable_disableNormalizePseudoGlobals: true,
  optimizationSizeLimit: 0,
};
