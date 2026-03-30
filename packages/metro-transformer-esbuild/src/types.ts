import type { BabelFileResult } from "@babel/core";
import type { Loader } from "esbuild";
import type { BabelTransformerArgs } from "metro-babel-transformer";

export type TransformerPluginOptions = {
  /**
   * Do selective preprocessing of JS files with esbuild before handing off to babel
   */
  handleJs?: boolean;

  /**
   * Do JSX transformations with esbuild, will handle TSX only unless handleJs is also specified.
   */
  handleJsx?: boolean;

  /**
   * Handle SVG transformations using svgr core, will require the optional peer dependencies to be fulfilled
   * to work correctly.
   */
  handleSvg?: boolean;

  /**
   * Add a dynamic element to the cache key for the transformer. If this is a string it will be appended to the
   * transformer key, if it is a boolean the current time will be added such that the cache entries won't match.
   */
  dynamicKey?: boolean | string;

  /**
   * Run the transformer in async mode
   */
  asyncTransform?: boolean;

  /**
   * Upstream delegates based on file extensions. This is a record of the format:
   * {
   *   [babelTransformerPath]: extension,   // match one extension
   *   [babelTransformerPath]: [extension1, extension2],  // match multiple extensions
   * }
   * Entries will be evaluated in order. Extensions should include the dot, to match what path.extname returns
   */
  upstreamDelegates?: Record<string, string | string[]>;
};

/**
 * Who should handle the transformation of a given set of options
 */
export type Responsibility = "esbuild" | "babel";

/**
 * Babel mode configuration, will vary the preset configuration and cache key based on these settings.
 */
export type BabelMode = {
  jsx: Responsibility;
  ts: Responsibility;
};

/**
 * File specific options that are appended to the plugin options when transforming a file based on file type and settings.
 * @internal
 */
export type FilePluginOptions = TransformerPluginOptions & {
  /** source type for the file, regardless of whether to use the esbuild transformer */
  srcType?: Extract<Loader, "ts" | "tsx" | "js" | "jsx">;

  /** esbuild loader value, only set if the transformer should run with esbuild for this file */
  loader?: Loader;

  /** lowercase extension name for convenience */
  ext: string;

  /** mode settings for running the babel transformer */
  mode: BabelMode;
};

/**
 * Arguments to pass through to various transformer packages. This is an extension of the standard args such that we
 * can use the same signature for both standard and option aware transformers without needing to change the way we call
 * them.
 */
export type TransformerArgs = BabelTransformerArgs & {
  pluginOptions: FilePluginOptions;
};

/**
 * Signature for a source transformer that runs before passing to an upstream transformer
 */
export type SourceTransformer = (
  args: TransformerArgs
) => string | Promise<string>;

/**
 * Signature for an upstream transformer, whose results will be returned to metro
 */
export type UpstreamTransformer = (
  args: TransformerArgs
) => BabelFileResult | Promise<BabelFileResult>;

export type TransformerModule = {
  transform: UpstreamTransformer;
};
