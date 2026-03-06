/**
 * Plugin options for @rnx-kit/metro-serializer-esbuild.
 *
 * These options are a combinations of a subset of esbuild's BuildOptions and additional options specific to the plugin.
 */

/**
 * Some esbuild types used in the options
 */
type Drop = "console" | "debugger";
type LogLevel = "verbose" | "debug" | "info" | "warning" | "error" | "silent";

/**
 * Options redefined from esbuild's BuildOptions, separated so type level compatibility
 * can be checked at build time
 */
export type BaseBuildOptions = {
  drop?: Drop[];
  logLevel?: LogLevel;
  minify?: boolean;
  minifyWhitespace?: boolean;
  minifyIdentifiers?: boolean;
  minifySyntax?: boolean;
  pure?: string[];
  target?: string | string[];
};

export type TransformerBuildOptions = Omit<
  BaseBuildOptions,
  "minify" | "minifyWhitespace" | "minifyIdentifiers" | "minifySyntax" | "pure"
> & {
  /**
   * JSX transform mode. Defaults to `"automatic"` (esbuild handles JSX).
   * - `"automatic"` uses the React 17+ JSX transform via esbuild
   * - `"transform"` uses classic createElement calls via esbuild
   * - `"preserve"` leaves JSX as-is, letting the upstream babel transformer handle it, may be necessary for some babel plugins
   */
  jsx?: "transform" | "preserve" | "automatic";
  jsxFactory?: string;
  jsxFragment?: string;
  jsxImportSource?: string;
  jsxDev?: boolean;
};

export type AllBuildOptions = BaseBuildOptions & TransformerBuildOptions;

/**
 * Options for @rnx-kit/metro-serializer-esbuild plugin.
 */
export type SerializerEsbuildOptions = BaseBuildOptions & {
  analyze?: boolean | "verbose";
  fabric?: boolean;
  metafile?: string;
  sourceMapPaths?: "absolute" | "relative";
  strictMode?: boolean;
};

/**
 * Options used to configure both the serializer and transformer options, so that the two can work in tandem.
 */
export type SerializerEsbuildConfig = SerializerEsbuildOptions &
  TransformerBuildOptions & {
    /**
     * Minification strategy to use for the transformer when minification is enabled.
     * - `serializer`:    Minify in the serializer using esbuild. This is the default and recommended option, as it provides better
     *                    minification results and faster build times.
     * - `metro-default`: Minify in the transformer using Metro's default minifier (Terser). This is not recommended, as it can lead to worse
     *                    minification results and slower build times, but is provided as an option for compatibility and comparison purposes.
     */
    minifyStrategy?: "serializer" | "metro-default";

    /**
     * Set to false to disable tree-shaking in production builds. Use if you still want to use esbuild for minification but want to
     * preserve all code paths.
     * @default true in production, false in development
     */
    treeShaking?: boolean;

    /**
     * Enable experimental support to use esbuild as a transformer in the bundle process. This will use esbuild for transforming typescript
     * and jsx files (unless jsx is set to "preserve") then will route the result through the upstream babel transformer.
     * @default false
     */
    transformWithEsbuild?: boolean;
  };
