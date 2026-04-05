import type { BabelFileResult } from "@babel/core";
import type { Loader } from "esbuild";
import type { BabelTransformerArgs } from "metro-babel-transformer";

export type TransformerPluginOptions = {
  /**
   * Which native engine to use for source preprocessing. Defaults to "esbuild".
   */
  engine?: NativeEngine;

  /**
   * Parser settings, will try oxc if not specifed
   */
  parser?: "oxc" | "swc" | "hermes" | "babel";

  /**
   * Disable the native preprocessing pipeline entirely and run everything through babel.
   * When true, engine, handleJs, and handleJsx options are ignored.
   */
  babelOnly?: boolean;

  /**
   * Do selective preprocessing of JS files with the native engine before handing off to babel
   */
  handleJs?: boolean;

  /**
   * Do JSX transformations with the native engine, will handle TSX only unless handleJs is also specified.
   */
  handleJsx?: boolean;

  /**
   * Handle SVG transformations using svgr core, will require the optional peer dependencies to be fulfilled
   * to work correctly.
   */
  handleSvg?: boolean;

  testing?: {
    /**
     * Add a dynamic element to the cache key for the transformer. If this is a string it will be appended to the
     * transformer key, if it is a boolean the current time will be added such that the cache entries won't match.
     */
    dynamicKey?: boolean | string;

    /**
     * Turn on performance reporting for the transformer
     */
    perfTrace?: boolean;

    /**
     * Instrument babel plugins to see where time is being spent in the transformation process. Only valid when perfTrace is also true.
     */
    tracePlugins?: boolean;
  };

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
 * Who should handle the transformation of a given responsibility
 */
export type Responsibility = "native" | "babel";

/**
 * Which native engine to use for source preprocessing
 */
export type NativeEngine = "esbuild" | "swc";

/**
 * Babel mode configuration, will vary the preset configuration and cache key based on these settings.
 */
export type BabelMode = {
  jsx: Responsibility;
  ts: Responsibility;
  engine: NativeEngine;
};

export type SrcType = "js" | "jsx" | "ts" | "tsx";

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

  /** a trace function that will measure if in perf tracing mode or act as a passthrough if not */
  trace: MeasureFunction;

  /** set if we are in performance tracing mode */
  perfTracer?: PerfTracer;
};

/**
 * Arguments to pass through to various transformer packages. This is an extension of the standard args such that we
 * can use the same signature for both standard and option aware transformers without needing to change the way we call
 * them.
 */
export type TransformerArgs = Omit<BabelTransformerArgs, "src"> & {
  /**
   * The source code to be transformed, redeclared to remove readonly modifier as it may be updated
   * during the transformation process
   */
  src: string;

  /**
   * Resolved options for this transformation pass
   */
  pluginOptions: FilePluginOptions;

  /**
   * Optional source map, will be set set if the sourceTransformer returns a source map
   */
  map?: string;
};

export type SourceTransformResult = {
  /**
   * The transformed source code, returned as a string
   */
  code: string;

  /**
   * Source map in string form, babel doesn't handle inline source maps
   */
  map?: string;
};

/**
 * Signature for a source transformer that runs before passing to an upstream transformer
 */
export type SourceTransformer = (
  args: TransformerArgs
) => SourceTransformResult | Promise<SourceTransformResult>;

/**
 * Signature for an upstream transformer, whose results will be returned to metro
 */
export type UpstreamTransformer = (
  args: TransformerArgs
) => BabelFileResult | Promise<BabelFileResult>;

export type TransformerModule = {
  transform: UpstreamTransformer;
};

/**
 * Signature for a trace function that will record information about a call and its duration. This is overloaded to
 * support both sync and async functions and will forward the trailing args to the function being measured.
 * This allows use with and without closures, e.g. both of these work:
 *  measure("myFunction", () => myFunction(arg1, arg2));
 *  measure("myFunction", myFunction, arg1, arg2);
 */
export type MeasureFunction = {
  // oxlint-disable-next-line typescript/no-explicit-any
  <TFunc extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: TFunc,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc>;
  // oxlint-disable-next-line typescript/no-explicit-any
  <TFunc extends (...args: any[]) => any>(
    name: string,
    fn: TFunc,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc>;
};

export type PerfTracer = {
  record: (name: string, time: number) => void;
  trace: MeasureFunction;
  report: () => void;
};
