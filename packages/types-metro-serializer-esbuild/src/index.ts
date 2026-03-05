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
export type SerializerEsbuildConfig = SerializerEsbuildOptions & {
  /**
   * Minification strategy to use for the transformer when minification is enabled.
   * - `serializer`:    Minify in the serializer using esbuild. This is the default and recommended option, as it provides better
   *                    minification results and faster build times.
   * - `metro-default`: Minify in the transformer using Metro's default minifier (Terser). This is not recommended, as it can lead to worse
   *                    minification results and slower build times, but is provided as an option for compatibility and comparison purposes.
   */
  minifyStrategy?: "serializer" | "metro-default";

  /**
   * Use experimental import support when running in production mode.
   */
  enableExperimentalImportSupport?: boolean;
};
