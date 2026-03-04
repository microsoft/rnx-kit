/**
 * Type definitions for @rnx-kit/metro-transformer-esbuild.
 *
 * These types are published separately so consumers can reference them
 * without depending on the full implementation package.
 */

/**
 * Options controlling esbuild-based TypeScript/JSX transpilation.
 */
export type EsbuildTransformerOptions = {
  /**
   * The ECMAScript target version(s) for esbuild output.
   * Defaults to `"hermes0.12"`.
   *
   * Common values: `"hermes0.12"`, `"es2020"`, `"esnext"`.
   * Can be an array for multiple targets: `["es2020", "chrome90"]`.
   */
  target?: string | string[];

  /**
   * JSX transform mode. Defaults to `"automatic"`.
   * - `"automatic"` uses the React 17+ JSX transform
   * - `"transform"` uses classic createElement calls
   * - `"preserve"` leaves JSX as-is
   */
  jsx?: "transform" | "preserve" | "automatic";

  /**
   * When using the classic (`"transform"`) JSX mode, the factory function.
   * Defaults to `"React.createElement"`.
   */
  jsxFactory?: string;

  /**
   * When using the classic (`"transform"`) JSX mode, the fragment function.
   * Defaults to `"React.Fragment"`.
   */
  jsxFragment?: string;

  /**
   * When using automatic JSX runtime, the import source.
   * Defaults to `"react"`.
   */
  jsxImportSource?: string;

  /**
   * Whether to use the JSX dev runtime (`jsxDEV`) in development builds.
   * Defaults to matching the `dev` flag from Metro options.
   */
  jsxDev?: boolean;

  /**
   * Additional `define` replacements passed to esbuild.
   * Example: `{ "__DEV__": "true" }`
   */
  define?: Record<string, string>;

  /**
   * Functions to mark as pure for tree-shaking.
   */
  pure?: string[];
};

/**
 * Options controlling esbuild-based minification.
 */
export type EsbuildMinifierOptions = {
  /**
   * Enable minification. Defaults to `true`.
   * When `true`, enables all three: minifyWhitespace, minifyIdentifiers,
   * minifySyntax.
   */
  minify?: boolean;

  /**
   * Enable whitespace removal. Defaults to the value of `minify`.
   */
  minifyWhitespace?: boolean;

  /**
   * Enable identifier shortening. Defaults to the value of `minify`.
   */
  minifyIdentifiers?: boolean;

  /**
   * Enable syntax-level minification. Defaults to the value of `minify`.
   */
  minifySyntax?: boolean;

  /**
   * Generate a source map. Defaults to `true`.
   */
  sourceMap?: boolean;

  /**
   * The ECMAScript target for minification output.
   * Defaults to the transformer target or `"hermes0.12"`.
   */
  target?: string | string[];

  /**
   * Identifiers to keep as pure annotations.
   */
  pure?: string[];

  /**
   * Statements to drop. Example: `["console", "debugger"]`.
   */
  drop?: ("console" | "debugger")[];
};

/**
 * Top-level configuration for `makeEsbuildTransformerConfig`.
 */
export type EsbuildTransformerConfig = {
  /**
   * Enable esbuild for TypeScript/JSX transpilation (standalone, no Babel).
   * Pass `true` for defaults or an options object for fine-grained control.
   */
  esbuildTransformer?: boolean | EsbuildTransformerOptions;

  /**
   * Enable esbuild for minification instead of Metro's default minifier.
   * Pass `true` for defaults or an options object for fine-grained control.
   */
  esbuildMinifier?: boolean | EsbuildMinifierOptions;
};
