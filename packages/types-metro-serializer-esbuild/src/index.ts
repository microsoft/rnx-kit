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
  logLevel?: LogLevel;

  /**
   * Minification options. Defaults to true for production builds, false for dev builds.
   */
  minify?: boolean;
  minifyWhitespace?: boolean;
  minifyIdentifiers?: boolean;
  minifySyntax?: boolean;

  /**
   * JSX transform mode. Defaults to `"automatic"` (esbuild handles JSX).
   * - `"automatic"` uses the React 17+ JSX transform via esbuild
   * - `"transform"` uses classic createElement calls via esbuild
   * - `"preserve"` leaves JSX as-is, letting the upstream babel transformer
   *   handle it via `@react-native/babel-preset`
   */
  jsx?: "transform" | "preserve" | "automatic";
  jsxFactory?: string;
  jsxFragment?: string;
  jsxImportSource?: string;
  jsxDev?: boolean;

  /**
   * General build and tree-shaking related options that can be configured
   */
  drop?: Drop[];
  pure?: string[];
  target?: string | string[];
  define?: Record<string, string>;
};

/**
 * Serializer options for @rnx-kit/metro-serializer-esbuild plugin.
 */
export type SerializerEsbuildOptions = BaseBuildOptions & {
  analyze?: boolean | "verbose";
  fabric?: boolean;
  metafile?: string;
  sourceMapPaths?: "absolute" | "relative";
  strictMode?: boolean;
};

/**
 * All-up configuration for @rnx-kit/metro-serializer-esbuild that allows for the serializer and transformer
 * to be configured together.
 */
export type EsbuildSerializerConfig = SerializerEsbuildOptions & {
  /**
   * Enable using esbuild for TypeScript/JSX transpilation before handing off to babel.
   * @experimental This option is experimental and has not been fully vetted for production use.
   * @default false
   */
  useEsbuildTransformer?: boolean;

  /**
   * Delegate upstream babel transformation paths to use for certain file types. Only applicable if `useEsbuildTransformer` is true.
   * This is primarily used to do things like route .svg files to a custom transformer.
   */
  extensionTransformerMap?: Record<string, string>;

  /**
   * Where minification should happen in the pipeline.
   * - `"serialize"` (default) uses esbuild for minification in the serializer.
   * - `"transformer"` uses esbuild for minification in the transformer, which may be faster but results in less accurate source maps.
   * - `"minify-hook"` uses esbuild for minification called from the minify hook in the transform options.
   * - `"metro-default"` uses Metro's default Terser-based minifier.
   * @default "serialize"
   */
  targetMinifier?:
    | "serialize"
    | "transformer"
    | "minify-hook"
    | "metro-default";
};
