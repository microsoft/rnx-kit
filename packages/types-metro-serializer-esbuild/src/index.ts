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
